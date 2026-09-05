import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageCount } from '@/lib/admin/scope'

const LINK =
  'inline-flex h-9 items-center gap-1 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm font-semibold text-foreground hover:border-primary'
const SPENT = `${LINK} opacity-40`

/**
 * Page links for a database-paged list.
 *
 * The ends are rendered as plain text rather than dead links: page zero and
 * the page past the last one do not exist, and an anchor that goes nowhere is
 * something a keyboard reaches and a screen reader announces as a way forward.
 */
export function Pagination({
  page,
  total,
  size,
  hrefFor,
}: {
  page: number
  total: number
  size: number
  hrefFor: (page: number) => string
}) {
  const pages = pageCount(total, size)
  if (pages <= 1) return null
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4" aria-label="Pages">
      <p className="text-xs text-muted">
        Showing {from.toLocaleString('en-IN')} to {to.toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')}
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <span className={SPENT}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </span>
        ) : (
          <Link href={hrefFor(page - 1)} className={LINK}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </Link>
        )}
        <span className="text-xs text-muted">
          Page {page} of {pages}
        </span>
        {page >= pages ? (
          <span className={SPENT}>
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <Link href={hrefFor(page + 1)} className={LINK}>
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </nav>
  )
}
