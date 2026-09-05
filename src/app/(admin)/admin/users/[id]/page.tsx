import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { SectionFailed } from '@/components/admin/section-failed'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import { trackName } from '@/lib/isc/tracks'

interface RawProfile {
  id: string
  role: string
  full_name: string | null
  date_of_birth: string | null
  phone: string | null
  onboarding_completed: boolean
  school_class: string | null
  school_name: string | null
  school_id: string | null
  city: string | null
  parent_mobile: string | null
  created_at: string
}

interface RawContribution {
  id: string
  source_type: string
  points: number
  description: string | null
  created_at: string
  growth_parameters: { name: string } | null
}

const SOURCE_LABEL: Record<string, string> = {
  baseline_test: 'Starter assessment',
  baseline_cert: 'Certificate approved',
  baseline_cert_approval: 'Certificate approved',
  baseline_questionnaire: 'Onboarding questionnaire',
  offering_completion: 'Offering completed',
  cert_rejection: 'Certificate rejected',
}

const CERT_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

/**
 * Date-ONLY columns, such as date_of_birth: a calendar day with no instant
 * behind it, so there is no timezone to get wrong. Never use this for a
 * timestamptz -- Joined and every score-activity date below go through
 * formatIstDay(istDay(...)) instead, because this renders in UTC on
 * Cloudflare Workers and toLocaleDateString would print the previous day for
 * anything before 5:30am IST.
 */
function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? '—'}</p>
    </div>
  )
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: email }] = (await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, role, full_name, date_of_birth, phone, onboarding_completed, school_class, school_name, school_id, city, parent_mobile, created_at')
      .eq('id', id)
      .single(),
    supabase.rpc('admin_get_user_email', { p_user_id: id }),
  ])) as [{ data: RawProfile | null }, { data: string | null }]

  if (!profile) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* Profile hero */}
      <Reveal>
        <GradientCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-white">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                  {profile.full_name ?? 'Unnamed user'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize bg-white/20 text-white">
                  {profile.role}
                </span>
              </div>
              <p className="text-sm text-white/75 truncate">{email ?? '—'}</p>
            </div>
          </div>
        </GradientCard>
      </Reveal>

      <div className="clay-card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <DetailRow label="Joined" value={formatIstDay(istDay(profile.created_at))} />
          <DetailRow label="Phone" value={profile.phone} />
          {profile.role === 'student' && (
            <>
              <DetailRow label="Date of birth" value={fmtDate(profile.date_of_birth)} />
              <DetailRow label="Class" value={profile.school_class} />
              <DetailRow label="School" value={profile.school_name} />
              <DetailRow label="City" value={profile.city} />
              <DetailRow label="Parent mobile" value={profile.parent_mobile} />
              <DetailRow label="Onboarding" value={profile.onboarding_completed ? 'Complete' : 'Pending'} />
            </>
          )}
        </div>
      </div>

      {profile.role === 'student' && <StudentSections studentId={id} schoolId={profile.school_id} />}
    </div>
  )
}

async function StudentSections({
  studentId,
  schoolId,
}: {
  studentId: string
  schoolId: string | null
}) {
  const supabase = await createClient()

  const [
    { data: rawScores },
    { data: rawParameters },
    { data: rawLevels },
    { data: rawContributions },
    { data: familyRow },
  ] = await Promise.all([
    supabase
      .from('student_parameter_scores')
      .select('parameter_id, baseline_score, accrued_score')
      .eq('student_id', studentId),
    supabase.from('growth_parameters').select('id, name, display_order').eq('is_active', true).order('display_order'),
    supabase.from('score_levels').select('id, name, min_score, max_score, color_class, display_order').order('display_order'),
    supabase
      .from('score_contributions')
      .select('id, source_type, points, description, created_at, growth_parameters(name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('user_profiles').select('family_id').eq('id', studentId).single(),
  ])

  const levels = (rawLevels ?? []) as ScoreLevel[]
  const contributions = (rawContributions ?? []) as unknown as RawContribution[]

  const parameterScores = (rawParameters ?? []).map((gp) => {
    const row = (rawScores ?? []).find((s) => s.parameter_id === gp.id)
    const total = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
    const level = scoreLevelFor(internalToDisplay(total), levels)
    return {
      parameterId: gp.id,
      name: gp.name,
      total,
      levelName: level?.name ?? 'Seed',
      levelColorClass: level?.color_class ?? 'text-accent-yellow',
    }
  })

  // The family this student belongs to: the parent on record, plus siblings.
  const familyId = familyRow?.family_id ?? null
  let parent: { parent_full_name: string | null; parent_email: string; parent_phone: string | null } | null = null
  const siblings: { id: string; full_name: string | null; family_status: string }[] = []
  if (familyId) {
    const [{ data: fam }, { data: members }] = await Promise.all([
      supabase
        .from('families')
        .select('parent_full_name, parent_email, parent_phone')
        .eq('id', familyId)
        .single(),
      supabase
        .from('user_profiles')
        .select('id, full_name, family_status')
        .eq('family_id', familyId)
        .neq('id', studentId),
    ])
    parent = fam ?? null
    siblings.push(...(members ?? []))
  }

  return (
    <>
      {/* Growth profile */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Growth Profile</h2>
        {parameterScores.length === 0 ? (
          <div className="clay-card p-6 text-center text-muted text-sm">
            No scores yet — this student hasn&apos;t completed onboarding.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parameterScores.map((p) => (
              <ParameterCard
                key={p.parameterId}
                name={p.name}
                total={p.total}
                levelName={p.levelName}
                levelColorClass={p.levelColorClass}
              />
            ))}
          </div>
        )}
      </div>

      {/* ISC championships: which they entered, and who is on the team */}
      <IscEntriesSection studentId={studentId} />

      {/* School and coordinator: who to call about this student */}
      <SchoolCoordinatorSection schoolId={schoolId} />

      {/* Family */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Family</h2>
        {!parent ? (
          <div className="clay-card p-5 text-sm text-muted">Not part of a family.</div>
        ) : (
          <div className="clay-card p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailRow label="Parent" value={parent.parent_full_name} />
              <DetailRow label="Parent email" value={parent.parent_email} />
              <DetailRow label="Parent phone" value={parent.parent_phone} />
            </div>
            {siblings.length > 0 && (
              <div className="pt-3 border-t border-black/[0.06] space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Siblings</p>
                {siblings.map((sib) => (
                  <Link
                    key={sib.id}
                    href={`/admin/users/${sib.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-black/[0.02] transition-colors rounded"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {sib.full_name ?? 'Student'}
                      {sib.family_status === 'pending' && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-yellow/15 text-accent-yellow">
                          Awaiting approval
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-primary">View →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score audit trail */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Recent Score Activity</h2>
        {contributions.length === 0 ? (
          <div className="clay-card p-5 text-sm text-muted">No score contributions yet.</div>
        ) : (
          <div className="clay-card divide-y divide-black/[0.06]">
            {contributions.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {c.growth_parameters?.name ?? 'Unknown parameter'}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {SOURCE_LABEL[c.source_type] ?? c.source_type}
                    {c.description ? ` · ${c.description}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${c.points < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {c.points > 0 ? `+${c.points}` : c.points}
                </span>
                <span className="text-xs text-muted shrink-0 hidden sm:inline">
                  {formatIstDay(istDay(c.created_at))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificates: pending, approved and rejected uploads */}
      <CertificatesSection studentId={studentId} />
    </>
  )
}

interface RawIscEntryMember {
  entry_id: string
  user_id: string | null
  is_leader: boolean
  accepted_at: string | null
}

/**
 * A member row counts as actually on the team when it is the leader or an
 * accepted invite -- the same gate admin_isc_summary (migration ~line 130)
 * and admin_isc_roster's member_count (migration ~line 318) apply in SQL,
 * and src/lib/coordinator/school-data.ts:122 applies for the coordinator's
 * own roster. isc_claim_invites sets user_id at signup while leaving
 * accepted_at null, so a claimed-but-unaccepted invite already has a
 * user_id and would otherwise read as a full member.
 */
function isAcceptedMember(m: { is_leader: boolean; accepted_at: string | null }): boolean {
  return m.is_leader || m.accepted_at !== null
}

interface RawIscEntry {
  id: string
  track: string
  status: string
  division: string | null
  submitted_at: string | null
  school_id: string
}

/**
 * Which championships this student has actually ENTERED -- leader or an
 * accepted invite, never a claimed-but-unanswered one, see isAcceptedMember
 * above -- and who else is on each team. Three separate queries, not a
 * nested select: isc_entries and isc_entry_members carry no foreign-key
 * relationship PostgREST can embed (see section F, item 1 of
 * docs/admin-scale-migration.sql), so this joins by hand in JavaScript the
 * same way the family lookup above already does.
 *
 * A failure here shows SectionFailed for this section only -- the rest of
 * the page, including Family and Certificates below it, still renders.
 */
async function IscEntriesSection({ studentId }: { studentId: string }) {
  const supabase = await createClient()

  const { data: memberRows, error: memberError } = (await supabase
    .from('isc_entry_members')
    .select('entry_id')
    .eq('user_id', studentId)
    // Only entries this student has actually joined -- see isAcceptedMember
    // above. Without this, a championship the child was only ever invited to
    // (and never accepted) would list here as entered, "Submitted" included.
    .or('is_leader.eq.true,accepted_at.not.is.null')) as {
    data: { entry_id: string }[] | null
    error: { message: string } | null
  }

  if (memberError) {
    return <SectionFailed title="Championships" message={memberError.message} />
  }

  const entryIds = [...new Set((memberRows ?? []).map((m) => m.entry_id))]

  if (entryIds.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Championships</h2>
        <div className="clay-card p-5 text-sm text-muted">Not entered in any championship.</div>
      </div>
    )
  }

  const { data: entryRows, error: entryError } = (await supabase
    .from('isc_entries')
    .select('id, track, status, division, submitted_at, school_id')
    .in('id', entryIds)) as { data: RawIscEntry[] | null; error: { message: string } | null }

  if (entryError) {
    return <SectionFailed title="Championships" message={entryError.message} />
  }

  const entries = entryRows ?? []
  const schoolIds = [...new Set(entries.map((e) => e.school_id))]

  const { data: schoolRows, error: schoolError } = schoolIds.length
    ? await supabase.from('schools').select('id, name').in('id', schoolIds)
    : { data: [] as { id: string; name: string }[], error: null }
  if (schoolError) return <SectionFailed title="Championships" message={schoolError.message} />
  const schoolNameById = new Map((schoolRows ?? []).map((s) => [s.id, s.name]))

  // Every member of every one of this student's entries -- the team, not just
  // this student's own row -- so teammates can be listed underneath. Fetched
  // unfiltered: a teammate who has not accepted yet is still worth showing,
  // just labelled as a pending invite rather than silently dropped or, worse,
  // silently counted as if they had joined.
  const { data: allMemberRows, error: allMembersError } = (await supabase
    .from('isc_entry_members')
    .select('entry_id, user_id, is_leader, accepted_at')
    .in(
      'entry_id',
      entries.map((e) => e.id)
    )) as { data: RawIscEntryMember[] | null; error: { message: string } | null }
  if (allMembersError) return <SectionFailed title="Championships" message={allMembersError.message} />

  const teammateIds = [
    ...new Set(
      (allMemberRows ?? [])
        .map((m) => m.user_id)
        .filter((uid): uid is string => Boolean(uid) && uid !== studentId)
    ),
  ]
  const { data: teammateProfiles, error: teammateError } = teammateIds.length
    ? await supabase.from('user_profiles').select('id, full_name').in('id', teammateIds)
    : { data: [] as { id: string; full_name: string | null }[], error: null }
  if (teammateError) return <SectionFailed title="Championships" message={teammateError.message} />
  const nameById = new Map((teammateProfiles ?? []).map((p) => [p.id, p.full_name]))

  const teammatesByEntry = new Map<string, string[]>()
  for (const m of allMemberRows ?? []) {
    if (!m.user_id || m.user_id === studentId) continue
    const name = nameById.get(m.user_id) ?? 'Unnamed teammate'
    const list = teammatesByEntry.get(m.entry_id) ?? []
    // "Invited -- waiting for them to accept": the same wording
    // src/components/admin/isc-student-profile.tsx uses for this exact state,
    // so an admin comparing the two screens is not reading two vocabularies.
    list.push(isAcceptedMember(m) ? name : `${name} (invited — waiting to accept)`)
    teammatesByEntry.set(m.entry_id, list)
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-foreground">Championships</h2>
      <div className="clay-card divide-y divide-black/[0.06]">
        {entries.map((e) => (
          <div key={e.id} className="px-5 py-4 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{trackName(e.track)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  e.status === 'submitted' ? 'bg-emerald-50 text-emerald-700' : 'bg-accent-yellow/15 text-amber-700'
                }`}
              >
                {e.status === 'submitted' ? 'Submitted' : 'Draft'}
              </span>
              {(e.division === 'group1' || e.division === 'group2') && (
                <span className="text-xs text-muted">{iscGroupLabel(e.division as IscGroup)}</span>
              )}
            </div>
            <p className="text-xs text-muted">
              {schoolNameById.get(e.school_id) ?? 'Unknown school'}
              {e.submitted_at ? ` · Submitted ${formatIstDay(istDay(e.submitted_at))}` : ' · Not submitted yet'}
            </p>
            {(teammatesByEntry.get(e.id) ?? []).length > 0 && (
              <p className="text-xs text-muted">Team: {(teammatesByEntry.get(e.id) ?? []).join(', ')}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The school this student belongs to, and who coordinates it -- who an admin
 * calls next if the school itself needs to be involved. A student with no
 * school on their profile gets a plain "no school" line rather than a
 * section that looks broken.
 */
async function SchoolCoordinatorSection({ schoolId }: { schoolId: string | null }) {
  if (!schoolId) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">School and coordinator</h2>
        <div className="clay-card p-5 text-sm text-muted">No school on this student&apos;s profile.</div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: school, error } = await supabase
    .from('schools')
    .select('id, name, state, district, coordinator_id')
    .eq('id', schoolId)
    .maybeSingle()

  if (error) return <SectionFailed title="School and coordinator" message={error.message} />

  if (!school) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">School and coordinator</h2>
        <div className="clay-card p-5 text-sm text-muted">This student&apos;s school record could not be found.</div>
      </div>
    )
  }

  let coordinator: { full_name: string | null; phone: string | null } | null = null
  if (school.coordinator_id) {
    const { data: coordRow, error: coordError } = await supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('id', school.coordinator_id)
      .maybeSingle()
    if (coordError) return <SectionFailed title="School and coordinator" message={coordError.message} />
    coordinator = coordRow ?? null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">School and coordinator</h2>
        <Link href="/admin/coordinators" className="text-xs font-medium text-primary hover:underline">
          All coordinators →
        </Link>
      </div>
      <div className="clay-card p-5 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <DetailRow label="School" value={school.name} />
          <DetailRow label="District" value={school.district} />
          <DetailRow label="State" value={school.state} />
        </div>
        <div className="pt-3 border-t border-black/[0.06] grid grid-cols-2 sm:grid-cols-3 gap-4">
          {coordinator ? (
            <>
              <DetailRow label="Coordinator" value={coordinator.full_name} />
              <DetailRow label="Coordinator phone" value={coordinator.phone} />
            </>
          ) : (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-sm text-muted">No coordinator has claimed this school yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Certificate uploads for this student -- what is pending an admin's review,
 * and what has already gone through. Links straight to the review screen.
 */
async function CertificatesSection({ studentId }: { studentId: string }) {
  const supabase = await createClient()
  const { data: certs, error } = await supabase
    .from('certificate_uploads')
    .select('id, status, points_approved, points_provisional, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) return <SectionFailed title="Certificates" message={error.message} />

  const rows = certs ?? []

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-foreground">Certificates</h2>
      {rows.length === 0 ? (
        <div className="clay-card p-5 text-sm text-muted">No certificates uploaded.</div>
      ) : (
        <div className="clay-card divide-y divide-black/[0.06]">
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/admin/certificates/${c.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-black/[0.02] transition-colors"
            >
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${CERT_STATUS_STYLE[c.status] ?? 'bg-black/[0.06] text-muted'}`}
              >
                {c.status}
              </span>
              <span className="flex-1 text-xs text-muted">{formatIstDay(istDay(c.created_at))}</span>
              <span className="text-sm font-semibold text-foreground shrink-0">
                {c.status === 'approved'
                  ? `+${c.points_approved} pts`
                  : c.status === 'pending'
                    ? `${c.points_provisional} pts pending`
                    : 'Not awarded'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
