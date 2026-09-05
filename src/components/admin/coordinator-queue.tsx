import { AdminQueue, type QueueRow } from '@/components/admin/admin-queue'
import { CoordinatorClaimRow } from '@/components/admin/coordinator-claim-row'
import { Pagination } from '@/components/admin/pagination'
import { bulkReviewCoordinators } from '@/app/(admin)/admin/queues/actions'
import { queueQueryToString, type CoordinatorQueueRow, type QueueQuery } from '@/lib/admin/queues'
import type { Page } from '@/lib/admin/isc'

/*
  The coordinator claims queue, as a component that takes its page of data as a
  prop rather than fetching it.

  That is deliberate: the Coordinators menu entry is about to grow an overview,
  a directory and drill-down pages, with this queue becoming one tab among
  them. A queue wired to its own route would have to be taken apart again to
  get there; this one only needs a different `basePath` and whoever loads the
  data.
*/

/** The tab a coordinator queue opens on, and the status its links omit. */
export const CLAIMS_DEFAULT_STATUS = 'pending'

const TABS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const EMPTY: Record<string, string> = {
  pending: 'Nothing waiting — every coordinator application has been reviewed.',
  approved: 'No approved coordinators yet.',
  rejected: 'No rejected applications yet.',
  all: 'No coordinator applications yet.',
}

/** A search that found nothing is a different sentence from an empty tab. */
const NO_MATCH = 'No coordinator applications match this search.'

export function CoordinatorQueue({
  basePath,
  query,
  page,
}: {
  basePath: string
  query: QueueQuery
  page: Page<CoordinatorQueueRow>
}) {
  const hrefFor = (p: number) =>
    basePath + queueQueryToString(query, CLAIMS_DEFAULT_STATUS, { page: p })

  const rows: QueueRow[] = page.rows.map((c) => ({
    id: c.school_id,
    // A claim is a pair of columns on a school, so the id a bulk decision
    // carries is the school's — the same id the single-row form posts.
    selectable: c.coordinator_status === 'pending',
    node: (
      <CoordinatorClaimRow
        claim={{
          schoolId: c.school_id,
          coordinatorId: c.coordinator_id,
          schoolName: c.school_name,
          schoolLocation: `${c.district}, ${c.state}`,
          schoolReviewStatus: c.school_review_status,
          coordinatorStatus: c.coordinator_status,
          reviewNotes: c.coordinator_notes,
          applicantName: c.applicant_name ?? 'Unknown applicant',
          applicantPhone: c.applicant_phone,
          board: c.board,
          studentCountRange: c.student_count_range,
        }}
      />
    ),
  }))

  return (
    <AdminQueue
      basePath={basePath}
      status={query.status}
      q={query.q}
      searchLabel="Search coordinators by name, phone or school"
      searchPlaceholder="Applicant name, phone or school"
      tabs={TABS.map((t) => ({
        label: t.label,
        href:
          basePath +
          queueQueryToString(query, CLAIMS_DEFAULT_STATUS, { status: t.value, page: 1 }),
        active: query.status === t.value,
      }))}
      rows={rows}
      summary={`${page.total.toLocaleString('en-IN')} ${page.total === 1 ? 'application' : 'applications'} in this view`}
      emptyMessage={query.q ? NO_MATCH : (EMPTY[query.status] ?? EMPTY.all)}
      action={bulkReviewCoordinators}
      pagination={
        <Pagination page={page.page} total={page.total} size={page.size} hrefFor={hrefFor} />
      }
    />
  )
}
