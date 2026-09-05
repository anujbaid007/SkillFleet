import { Download } from 'lucide-react'
import { rosterFiltersToQuery, type IscScope, type RosterFilters } from '@/lib/admin/scope'

/**
 * A link to the streaming export, not a button that builds a file in the
 * browser.
 *
 * The old export serialised whatever rows the page had already loaded, which
 * only worked while the page loaded every row. The route streams the same
 * scope and the same filters straight out of the database in keyset chunks, so
 * a forty-thousand-row download costs the browser nothing and the export is
 * never a different set from the one on screen.
 *
 * A plain anchor rather than next/link: this URL is a file, and prefetching it
 * would start the download on hover.
 */
export function IscExport({ scope, filters }: { scope: IscScope; filters: RosterFilters }) {
  // The database refuses a national export outright: without a state or a
  // school it would stream every entry in the country.
  if (!scope.state && !scope.schoolId) {
    return (
      <p className="text-xs text-muted">
        Export is available from a state, a district or a school.
      </p>
    )
  }

  const q = new URLSearchParams(rosterFiltersToQuery(filters, { page: 1 }).slice(1))
  if (scope.state) q.set('state', scope.state)
  if (scope.district) q.set('district', scope.district)
  if (scope.schoolId) q.set('schoolId', scope.schoolId)

  return (
    <a
      href={`/admin/isc/export?${q.toString()}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-xs font-semibold text-foreground hover:bg-black/[0.03]"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      Download CSV
    </a>
  )
}
