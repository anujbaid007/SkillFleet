import { UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import {
  CoordinatorClaimRow,
  type CoordinatorClaim,
} from '@/components/admin/coordinator-claim-row'

interface RawClaim {
  id: string
  name: string
  state: string
  district: string
  review_status: string
  coordinator_id: string
  coordinator_status: string
  coordinator_notes: string | null
  board: string | null
  student_count_range: string | null
}

const STATUSES = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

export default async function AdminCoordinatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  // Default to the only view that needs action.
  const active = status && ['pending', 'approved', 'rejected', 'all'].includes(status)
    ? status
    : 'pending'

  const supabase = await createClient()

  let query = supabase
    .from('schools')
    .select(
      'id, name, state, district, review_status, coordinator_id, coordinator_status, coordinator_notes, board, student_count_range'
    )
    .neq('coordinator_status', 'none')
    .order('name')

  if (active !== 'all') query = query.eq('coordinator_status', active)

  const { data: raw } = (await query) as unknown as { data: RawClaim[] | null }
  const claims = (raw ?? []).filter((c) => c.coordinator_id)

  const applicantIds = [...new Set(claims.map((c) => c.coordinator_id))]
  const { data: profiles } = applicantIds.length
    ? await supabase.from('user_profiles').select('id, full_name, phone').in('id', applicantIds)
    : { data: [] }
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  const phoneById = new Map((profiles ?? []).map((p) => [p.id, p.phone]))

  // Counts for the filter chips, so an admin can see at a glance whether
  // anything is waiting without clicking through each tab.
  const { data: allRows } = (await supabase
    .from('schools')
    .select('coordinator_status')
    .neq('coordinator_status', 'none')) as unknown as {
    data: { coordinator_status: string }[] | null
  }
  const counts = (allRows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.coordinator_status] = (acc[r.coordinator_status] ?? 0) + 1
    return acc
  }, {})
  const total = (allRows ?? []).length

  const rows: CoordinatorClaim[] = claims.map((c) => ({
    schoolId: c.id,
    schoolName: c.name,
    schoolLocation: `${c.district}, ${c.state}`,
    schoolReviewStatus: c.review_status,
    coordinatorStatus: c.coordinator_status,
    reviewNotes: c.coordinator_notes,
    applicantName: nameById.get(c.coordinator_id) || 'Unknown applicant',
    applicantPhone: phoneById.get(c.coordinator_id) ?? null,
    board: c.board,
    studentCountRange: c.student_count_range,
  }))

  const chip = (isActive: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
      isActive ? 'bg-primary text-white' : 'border border-black/10 text-muted hover:text-foreground'
    }`

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ISC"
        icon={UserCheck}
        title="Coordinators"
        subtitle="Teachers applying to coordinate their school. A coordinator's console stays closed until you approve them."
      />

      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <a key={s.value} href={`/admin/coordinators?status=${s.value}`} className={chip(active === s.value)}>
            {s.label}
            {counts[s.value] ? ` · ${counts[s.value]}` : ''}
          </a>
        ))}
        <a href="/admin/coordinators?status=all" className={chip(active === 'all')}>
          All{total ? ` · ${total}` : ''}
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">
          {active === 'pending'
            ? 'Nothing waiting — every coordinator application has been reviewed.'
            : 'No coordinator applications with this status.'}
        </div>
      ) : (
        <Reveal delay={0.05}>
          <div className="clay-card divide-y divide-black/[0.06]">
            {rows.map((c) => (
              <CoordinatorClaimRow key={c.schoolId} claim={c} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
