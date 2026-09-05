import Link from 'next/link'
import { FileCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { Pagination } from '@/components/admin/pagination'
import { AdminQueue, type QueueRow } from '@/components/admin/admin-queue'
import { bulkReviewCertificates } from '@/app/(admin)/admin/queues/actions'
import { getCertificatesQueue, parseQueueQuery, queueQueryToString } from '@/lib/admin/queues'
import type { SearchParams } from '@/lib/admin/scope'
import { formatIstDay, istDay } from '@/lib/isc/dates'

const BASE_PATH = '/admin/certificates'
const DEFAULT_STATUS = 'pending'

/** The points the bulk bar offers by default, matching the single review form. */
const DEFAULT_POINTS = 50

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const TABS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const EMPTY: Record<string, string> = {
  pending: 'Nothing waiting — every certificate has been reviewed.',
  approved: 'No approved certificates match this search.',
  rejected: 'No rejected certificates match this search.',
  all: 'No certificates match this search.',
}

/**
 * Student achievement uploads awaiting review.
 *
 * A bulk approve awards the SAME points to every certificate selected, which
 * is why the points box sits in the bulk bar rather than being assumed. A
 * certificate with no skill tagged cannot be approved this way at all — the
 * database refuses it, and the action reports it as a row to open
 * individually. That is the reason the per-item review link stays.
 */
export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const query = parseQueueQuery(sp, DEFAULT_STATUS)
  const supabase = await createClient()
  const page = await getCertificatesQueue(supabase, query)

  const header = (
    <PageHeader
      eyebrow="Review queue"
      icon={FileCheck}
      title="Certificates"
      subtitle="Review student achievement uploads."
    />
  )

  if (!page.ok) {
    return (
      <div className="space-y-8">
        {header}
        {page.kind === 'migration-missing' ? (
          <MigrationMissing message={page.message} />
        ) : (
          <SectionFailed title="Certificates queue" message={page.message} />
        )}
      </div>
    )
  }

  const hrefFor = (p: number) => BASE_PATH + queueQueryToString(query, DEFAULT_STATUS, { page: p })

  const rows: QueueRow[] = page.data.rows.map((cert) => ({
    id: cert.id,
    selectable: cert.status === 'pending',
    node: (
      <div className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-black/[0.02]">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[cert.status] ?? 'bg-black/[0.06] text-muted'}`}
            >
              {cert.status}
            </span>
            {cert.parameter_name && <span className="text-xs text-muted">{cert.parameter_name}</span>}
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {cert.file_name ?? 'Untitled'}
            {cert.description ? ` — ${cert.description}` : ''}
          </p>
          {/* formatIstDay(istDay(...)): the server renders in UTC on Workers,
              so a late-evening upload would otherwise read as the day before. */}
          <p className="text-xs text-muted">
            {cert.student_name ?? 'Unknown student'} · {formatIstDay(istDay(cert.created_at))}
            {cert.status === 'approved' && cert.points_approved > 0 && ` · +${cert.points_approved} pts`}
          </p>
        </div>
        <Link
          href={`/admin/certificates/${cert.id}`}
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            cert.status === 'pending'
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'border border-black/10 text-muted hover:text-foreground'
          }`}
        >
          {cert.status === 'pending' ? 'Review' : 'Re-review'}
        </Link>
      </div>
    ),
  }))

  return (
    <div className="space-y-6">
      {header}

      <Reveal delay={0.05}>
        <AdminQueue
          basePath={BASE_PATH}
          status={query.status}
          q={query.q}
          searchLabel="Search certificates by student, file name or description"
          searchPlaceholder="Student name, file name or description"
          tabs={TABS.map((t) => ({
            label: t.label,
            href: BASE_PATH + queueQueryToString(query, DEFAULT_STATUS, { status: t.value, page: 1 }),
            active: query.status === t.value,
          }))}
          rows={rows}
          summary={`${page.data.total.toLocaleString('en-IN')} ${page.data.total === 1 ? 'certificate' : 'certificates'} in this view`}
          emptyMessage={EMPTY[query.status] ?? EMPTY.all}
          action={bulkReviewCertificates}
          approveLabel="Approve selected"
          approveFields={
            <label className="flex items-center gap-2 text-xs font-semibold text-muted">
              Points each
              <input
                type="number"
                name="points"
                min={0}
                max={1000}
                defaultValue={DEFAULT_POINTS}
                className="h-10 w-24 rounded-xl border-2 border-black/[0.06] px-3 text-sm text-foreground"
              />
            </label>
          }
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
