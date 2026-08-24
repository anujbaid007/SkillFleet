import { School } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import {
  SchoolReviewRow,
  type PendingSchool,
  type SimilarSchool,
} from '@/components/admin/school-review-row'
import {
  CoordinatorClaimRow,
  type CoordinatorClaim,
} from '@/components/admin/coordinator-claim-row'

interface RawPending {
  id: string
  name: string
  state: string
  district: string
  created_at: string
  created_by: string | null
}

interface RawClaim {
  id: string
  name: string
  review_status: string
  coordinator_id: string
  board: string | null
  student_count_range: string | null
}

export default async function AdminSchoolsPage() {
  const supabase = await createClient()

  const { data: pending } = (await supabase
    .from('schools')
    .select('id, name, state, district, created_at, created_by')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false })) as unknown as { data: RawPending[] | null }

  const rows = pending ?? []

  // Every coordinator claim still awaiting a decision, whatever state its
  // school is in — the two cases are split apart below.
  const { data: rawClaims } = (await supabase
    .from('schools')
    .select('id, name, review_status, coordinator_id, board, student_count_range')
    .eq('coordinator_status', 'pending')) as unknown as { data: RawClaim[] | null }

  const claims = (rawClaims ?? []).filter((c) => c.coordinator_id)

  // One lookup covers both the students who submitted schools and the
  // coordinators who applied for them.
  const lookupIds = [
    ...new Set([
      ...rows.map((r) => r.created_by).filter(Boolean) as string[],
      ...claims.map((c) => c.coordinator_id),
    ]),
  ]
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, phone')
    .in('id', lookupIds.length ? lookupIds : ['00000000-0000-0000-0000-000000000000'])
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const phoneById = new Map((profiles ?? []).map((p) => [p.id, p.phone]))

  const claimBySchoolId = new Map(claims.map((c) => [c.id, c]))

  // Case B: a claim on a school that needs no review of its own, so there is
  // no pending-school row to attach it to.
  const standaloneClaims: CoordinatorClaim[] = claims
    .filter((c) => c.review_status === 'approved')
    .map((c) => ({
      schoolId: c.id,
      schoolName: c.name,
      applicantName: nameById.get(c.coordinator_id) || 'Unknown applicant',
      applicantPhone: phoneById.get(c.coordinator_id) ?? null,
      board: c.board,
      studentCountRange: c.student_count_range,
    }))

  // Candidate duplicates, one lookup per pending row. The queue is short by
  // design — if it ever is not, that is the signal to paginate.
  const withSimilar: PendingSchool[] = await Promise.all(
    rows.map(async (r) => {
      const { data: similar } = await supabase.rpc('find_similar_schools', { p_school_id: r.id })
      const claim = claimBySchoolId.get(r.id)
      return {
        id: r.id,
        name: r.name,
        state: r.state,
        district: r.district,
        created_at: r.created_at,
        submittedBy: (r.created_by && nameById.get(r.created_by)) || 'Unknown student',
        similar: (similar ?? []) as SimilarSchool[],
        // Case A: this pending school also has someone claiming it.
        coordinatorClaim: claim
          ? {
              applicantName: nameById.get(claim.coordinator_id) || 'Unknown applicant',
              applicantPhone: phoneById.get(claim.coordinator_id) ?? null,
              board: claim.board,
              studentCountRange: claim.student_count_range,
            }
          : null,
      }
    })
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review queue"
        icon={School}
        title="Schools"
        subtitle="Schools students added because they could not find theirs in the list."
      />

      {withSimilar.length === 0 && standaloneClaims.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">
          Nothing waiting — every school students have added has been reviewed.
        </div>
      ) : (
        <>
          {withSimilar.length > 0 && (
            <Reveal delay={0.05}>
              <div className="clay-card divide-y divide-black/[0.06]">
                {withSimilar.map((s) => (
                  <SchoolReviewRow key={s.id} school={s} />
                ))}
              </div>
            </Reveal>
          )}

          {standaloneClaims.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">
                Coordinator applications
              </h2>
              <Reveal delay={0.08}>
                <div className="clay-card divide-y divide-black/[0.06]">
                  {standaloneClaims.map((c) => (
                    <CoordinatorClaimRow key={c.schoolId} claim={c} />
                  ))}
                </div>
              </Reveal>
            </div>
          )}
        </>
      )}
    </div>
  )
}
