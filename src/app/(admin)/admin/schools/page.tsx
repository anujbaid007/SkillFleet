import { School } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { Pagination } from '@/components/admin/pagination'
import { AdminQueue, type QueueRow } from '@/components/admin/admin-queue'
import { SchoolReviewRow } from '@/components/admin/school-review-row'
import { bulkReviewSchools } from '@/app/(admin)/admin/queues/actions'
import {
  getSchoolsQueue,
  getSimilarSchools,
  parseQueueQuery,
  queueQueryToString,
  type SimilarSchool,
} from '@/lib/admin/queues'
import type { SearchParams } from '@/lib/admin/scope'

const BASE_PATH = '/admin/schools'
const DEFAULT_STATUS = 'pending'

const TABS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const EMPTY: Record<string, string> = {
  pending: 'Nothing waiting — every school students have added has been reviewed.',
  approved: 'No approved schools yet.',
  rejected: 'No rejected schools yet.',
  all: 'No schools here yet.',
}

/** A search that found nothing is a different sentence from an empty tab. */
const NO_MATCH = 'No schools match this search.'

/**
 * Schools students added because they could not find theirs in the list.
 *
 * Two things changed here at scale. The queue used to load EVERY pending row
 * and then call find_similar_schools once per row, so a recruitment drive that
 * put a thousand schools in the queue was a thousand round trips on one
 * render; it now reads one page and asks admin_similar_schools_batch for that
 * page's duplicates in a single call. And it used to hard-filter to pending
 * and ignore any search term, which is why the admin header's search could not
 * link a school hit anywhere honest; it now takes `q` and a status, so
 * /admin/schools?status=all&q=<name> really does contain the school.
 */
export default async function AdminSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const query = parseQueueQuery(sp, DEFAULT_STATUS)
  const supabase = await createClient()
  const page = await getSchoolsQueue(supabase, query)

  const header = (
    <PageHeader
      eyebrow="Review queue"
      icon={School}
      title="Schools"
      subtitle="Schools students added because they could not find theirs in the list. Coordinator applications are reviewed separately, under Coordinators."
    />
  )

  if (!page.ok) {
    return (
      <div className="space-y-8">
        {header}
        {page.kind === 'migration-missing' ? (
          <MigrationMissing message={page.message} />
        ) : (
          <SectionFailed title="Schools queue" message={page.message} />
        )}
      </div>
    )
  }

  // One call for the whole page's likely duplicates. This is the only part of
  // this screen that needs docs/admin-scale-migration.sql, so if it is not
  // applied yet the queue still lists and still reviews — it just cannot
  // suggest merges, and says so.
  const similar = await getSimilarSchools(
    supabase,
    page.data.rows.map((r) => r.id)
  )
  const byId: Map<string, SimilarSchool[]> = similar.ok ? similar.data : new Map()

  const hrefFor = (p: number) => BASE_PATH + queueQueryToString(query, DEFAULT_STATUS, { page: p })

  const rows: QueueRow[] = page.data.rows.map((s) => ({
    id: s.id,
    selectable: s.review_status === 'pending',
    node: (
      <SchoolReviewRow
        school={{
          id: s.id,
          name: s.name,
          state: s.state,
          district: s.district,
          reviewStatus: s.review_status,
          created_at: s.created_at,
          submittedBy: s.submitted_by ?? 'Unknown student',
          similar: byId.get(s.id) ?? [],
        }}
      />
    ),
  }))

  return (
    <div className="space-y-6">
      {header}

      {!similar.ok &&
        (similar.kind === 'migration-missing' ? (
          <MigrationMissing message={similar.message} />
        ) : (
          <SectionFailed title="Duplicate suggestions" message={similar.message} />
        ))}

      <Reveal delay={0.05}>
        <AdminQueue
          basePath={BASE_PATH}
          status={query.status}
          q={query.q}
          searchLabel="Search schools by name"
          searchPlaceholder="School name"
          tabs={TABS.map((t) => ({
            label: t.label,
            href: BASE_PATH + queueQueryToString(query, DEFAULT_STATUS, { status: t.value, page: 1 }),
            active: query.status === t.value,
          }))}
          rows={rows}
          summary={`${page.data.total.toLocaleString('en-IN')} ${page.data.total === 1 ? 'school' : 'schools'} in this view`}
          emptyMessage={query.q ? NO_MATCH : (EMPTY[query.status] ?? EMPTY.all)}
          action={bulkReviewSchools}
          pagination={
            <Pagination
              page={page.data.page}
              total={page.data.total}
              size={page.data.size}
              hrefFor={hrefFor}
            />
          }
        />
      </Reveal>
    </div>
  )
}
