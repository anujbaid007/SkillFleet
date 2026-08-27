import { School } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import {
  SchoolReviewRow,
  type PendingSchool,
  type SimilarSchool,
} from '@/components/admin/school-review-row'

interface RawPending {
  id: string
  name: string
  state: string
  district: string
  created_at: string
  created_by: string | null
}

export default async function AdminSchoolsPage() {
  const supabase = await createClient()

  const { data: pending } = (await supabase
    .from('schools')
    .select('id, name, state, district, created_at, created_by')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false })) as unknown as { data: RawPending[] | null }

  const rows = pending ?? []

  // Who submitted each one.
  const submitterIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[]
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', submitterIds.length ? submitterIds : ['00000000-0000-0000-0000-000000000000'])
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  // Candidate duplicates, one lookup per pending row. The queue is short by
  // design — if it ever is not, that is the signal to paginate.
  const withSimilar: PendingSchool[] = await Promise.all(
    rows.map(async (r) => {
      const { data: similar } = await supabase.rpc('find_similar_schools', { p_school_id: r.id })
      return {
        id: r.id,
        name: r.name,
        state: r.state,
        district: r.district,
        created_at: r.created_at,
        submittedBy: (r.created_by && nameById.get(r.created_by)) || 'Unknown student',
        similar: (similar ?? []) as SimilarSchool[],
      }
    })
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review queue"
        icon={School}
        title="Schools"
        subtitle="Schools students added because they could not find theirs in the list. Coordinator applications are reviewed separately, under ISC."
      />

      {withSimilar.length === 0 ? (
        <div className="clay-card p-12 text-center text-muted">
          Nothing waiting — every school students have added has been reviewed.
        </div>
      ) : (
        <Reveal delay={0.05}>
          <div className="clay-card divide-y divide-black/[0.06]">
            {withSimilar.map((s) => (
              <SchoolReviewRow key={s.id} school={s} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
