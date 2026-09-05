import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'
import {
  CoordinatorNumbers,
  CoordinatorProfileCard,
  type CoordinatorClaimRowData,
} from '@/components/admin/coordinator-profile'
import { SchoolRoster } from '@/components/isc/school-roster'
import { getCoordinatorDetail, strongestClaim } from '@/lib/admin/coordinators'
// The "coordinator" in the name is about which RLS path the student list
// arrives through, not about who is looking: an admin can read user_profiles
// and passes the roster in from the table, exactly as the ISC school page does.
import { loadCoordinatorSchoolData } from '@/lib/coordinator/school-data'
import { buildSchoolRoster } from '@/lib/isc/roster'
import { requireAdmin } from '@/lib/admin/guard'

/** The same ceiling the ISC school page uses: one school's register is bounded. */
const STUDENT_CEILING = 5_000

interface RawSchoolClaim {
  id: string
  name: string
  state: string
  district: string
  review_status: string
  coordinator_status: string
  coordinator_notes: string | null
  board: string | null
}

/**
 * One coordinator, claim or no claim.
 *
 * THIS PAGE EXISTS BECAUSE THE GLOBAL SEARCH NEEDED SOMEWHERE HONEST TO SEND A
 * HIT. A coordinator hit used to land on the claims queue, which lists claims:
 * a teacher who has signed up and claimed nothing was simply not on it, and
 * the search looked broken. Everything here is keyed on the person.
 *
 * THE PROFILE AND THE ROSTER READ PLAIN TABLES, on purpose. Only the four
 * numbers come from admin_coordinator_detail, so before the migration has been
 * pasted this page still shows who the person is, which school they hold, the
 * admin's review note, and every student at that school with what each is
 * doing — which is the list an outreach call is made from.
 */
export default async function AdminCoordinatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // The gate. First statement, before any reader: a layout does not stop this
  // page from rendering for a non-admin. See src/lib/admin/guard.ts.
  await requireAdmin()
  const { id } = await params
  const supabase = await createClient()

  const [profileRes, claimsRes, emailRes, detail] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, role, full_name, phone, onboarding_completed, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('schools')
      .select('id, name, state, district, review_status, coordinator_status, coordinator_notes, board')
      .eq('coordinator_id', id),
    // auth.users is not readable from here; this is the same security-definer
    // RPC the user detail page uses, and it predates the admin migration.
    supabase.rpc('admin_get_user_email', { p_user_id: id }),
    getCoordinatorDetail(supabase, id),
  ])

  const profile = profileRes.data
  // A missing row, an id that is not a uuid, and a student's id all mean the
  // address is wrong rather than the data.
  if (!profile || profile.role !== 'coordinator') notFound()

  const claims = ((claimsRes.data ?? []) as RawSchoolClaim[]).map(
    (s): CoordinatorClaimRowData => ({
      id: s.id,
      name: s.name,
      state: s.state,
      district: s.district,
      review_status: s.review_status,
      claim_status: s.coordinator_status,
      notes: s.coordinator_notes,
      board: s.board,
    })
  )
  // The same precedence admin_coordinator_detail applies, so the school named
  // here is the school its numbers are about.
  const claim = strongestClaim(claims)

  const person = {
    id: profile.id,
    full_name: profile.full_name,
    email: (emailRes.data as string | null) ?? null,
    phone: profile.phone,
    joined_at: profile.created_at,
    onboarding_completed: profile.onboarding_completed,
  }

  // Only for the claimed school, and only after we know which one it is.
  let roster: Awaited<ReturnType<typeof loadCoordinatorSchoolData>> | null = null
  let rosterRows: ReturnType<typeof buildSchoolRoster> = []
  let registerFull = false
  if (claim) {
    const { data: enrolledRows } = await supabase
      .from('user_profiles')
      .select('id, full_name, school_class')
      .eq('role', 'student')
      .eq('school_id', claim.id)
      .range(0, STUDENT_CEILING - 1)
    const enrolled = (enrolledRows ?? []).map((p) => ({
      studentId: p.id,
      fullName: p.full_name,
      schoolClass: p.school_class,
    }))
    registerFull = enrolled.length === STUDENT_CEILING
    roster = await loadCoordinatorSchoolData(supabase, claim.id, enrolled)
    rosterRows = buildSchoolRoster(roster.rosterStudents, roster.entries, roster.rosterMembers)
  }

  const name = profile.full_name ?? 'Unnamed coordinator'
  const header = (
    <CoordinatorHeader
      title={name}
      subtitle={
        claim
          ? `${claim.name} · ${claim.district}, ${claim.state}`
          : 'Signed up as a coordinator and has not claimed a school.'
      }
      breadcrumb={
        <IscBreadcrumb
          segments={[
            { label: 'Coordinators', href: '/admin/coordinators' },
            { label: 'Directory', href: '/admin/coordinators/directory' },
          ]}
          current={name}
        />
      }
    />
  )

  const profileCard = (
    <Reveal delay={0.03}>
      <CoordinatorProfileCard profile={person} claim={claim} claimsHeld={claims.length} />
    </Reveal>
  )

  const students = roster && claim && (
    <Reveal delay={0.05}>
      <SchoolRoster
        rows={rosterRows}
        students={roster.rosterStudents}
        entries={roster.entries}
        members={roster.rosterMembers}
        submissionByEntry={roster.submissionByEntry}
        title={`Students at ${claim.name}`}
        subtitle="Everyone eligible at this school, including the ones who have not started — open a student to see their team and what they sent"
        emptyLabel="No eligible student from this school has joined SkillFleet yet."
      />
      {registerFull && (
        <p className="mt-2 text-xs text-muted">
          Showing the first {STUDENT_CEILING.toLocaleString('en-IN')} students on this
          school&rsquo;s register. If a school really has more, this list needs to be paged.
        </p>
      )}
    </Reveal>
  )

  // The profile and the roster do not come from the admin functions, so they
  // are still worth showing while the migration is pending.
  if (!detail.ok && detail.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        {profileCard}
        <MigrationMissing message={detail.message} />
        {students}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {header}
      {profileCard}

      <Reveal delay={0.04}>
        {!detail.ok ? (
          <SectionFailed title="The numbers" message={detail.message} />
        ) : detail.data === null ? (
          <p className="text-sm text-muted">
            The database has no coordinator record for this account, so there are no numbers to
            show. The profile above is what is left of them.
          </p>
        ) : (
          <CoordinatorNumbers detail={detail.data} />
        )}
      </Reveal>

      {students}
    </div>
  )
}
