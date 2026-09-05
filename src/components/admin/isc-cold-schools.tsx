import Link from 'next/link'
import { PhoneOff } from 'lucide-react'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { Pagination } from '@/components/admin/pagination'
import { rosterFiltersToQuery, type RosterFilters } from '@/lib/admin/scope'
import type { ColdSchoolRow, Page } from '@/lib/admin/isc'

/** Plain words for a database enum nobody outside the schema should have to read. */
const COORDINATOR_LABEL: Record<string, string> = {
  none: 'Nobody has applied',
  pending: 'Waiting on your review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const COORDINATOR_CHIP: Record<string, string> = {
  none: 'bg-slate-100 text-slate-600',
  pending: 'bg-accent-yellow/15 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

/**
 * The outreach list: schools with eligible students and not one entry, the
 * biggest opportunity first.
 *
 * A cold school is still a school worth opening — its page names the students
 * who have not started, which is what an outreach call needs. The comparison
 * chart cannot link there, because a school with no entries never appears in
 * it.
 *
 * Schools with no eligible student at all are absent by design: that is an
 * onboarding gap rather than an outreach one, and a thousand zero-student
 * schools would bury the ones worth phoning.
 */
export function IscColdSchools({
  page,
  filters,
  basePath,
}: {
  page: Page<ColdSchoolRow>
  /** Carried through the page links so paging this list does not clear the roster's filters. */
  filters: RosterFilters
  basePath: string
}) {
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams(rosterFiltersToQuery(filters).slice(1))
    if (p > 1) qs.set('cold', String(p))
    else qs.delete('cold')
    const s = qs.toString()
    return s ? `${basePath}?${s}` : basePath
  }

  return (
    <Panel
      title="Schools yet to start"
      subtitle="Students signed up, nothing entered — the most eligible students first"
      icon={PhoneOff}
      action={
        <span className="whitespace-nowrap text-[11px] text-muted">
          {page.total.toLocaleString('en-IN')} {page.total === 1 ? 'school' : 'schools'}
        </span>
      }
    >
      {page.rows.length === 0 ? (
        <PanelEmpty>Every school with eligible students here has at least one entry.</PanelEmpty>
      ) : (
        <>
          <ul className="divide-y divide-black/[0.05]">
            {page.rows.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/isc/state/${encodeURIComponent(s.state)}/district/${encodeURIComponent(
                    s.district
                  )}/school/${s.id}`}
                  className="group flex items-start justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground group-hover:text-primary">
                      {s.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span>
                        {s.district}, {s.state}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          COORDINATOR_CHIP[s.coordinator_status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {COORDINATOR_LABEL[s.coordinator_status] ?? s.coordinator_status}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-foreground">
                      {s.eligible.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[10px] text-muted">
                      eligible {s.eligible === 1 ? 'student' : 'students'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page.page} total={page.total} size={page.size} hrefFor={hrefFor} />
        </>
      )}
    </Panel>
  )
}
