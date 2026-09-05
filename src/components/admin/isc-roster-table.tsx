import Link from 'next/link'
import { LANGUAGE_OPTIONS, TRACK_FILTER_OPTIONS, trackName } from '@/lib/isc/tracks'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { ISC_GROUPS, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import { rosterFiltersToQuery, type IscScope, type RosterFilters } from '@/lib/admin/scope'
import type { Page, RosterRow } from '@/lib/admin/isc'
import { Pagination } from '@/components/admin/pagination'

function Select({
  name,
  label,
  value,
  options,
  all,
}: {
  name: string
  label: string
  value?: string
  options: { value: string; label: string }[]
  all: string
}) {
  return (
    <select
      name={name}
      aria-label={label}
      defaultValue={value ?? ''}
      className="h-10 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground"
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/**
 * One page of entries, counted and sorted by the database.
 *
 * `page` is null when the page above decided not to ask. Nationally that is
 * the normal state: admin_isc_roster works out its total with a count over
 * every entry in the country, which is a second and a half of database time
 * for a list nobody meant to page through. Pick a state, or narrow it with a
 * filter, and the same query costs single-digit milliseconds.
 */
export function IscRosterTable({
  page,
  filters,
  scope,
  basePath,
}: {
  page: Page<RosterRow> | null
  filters: RosterFilters
  scope: IscScope
  basePath: string
}) {
  const hrefFor = (p: number) => `${basePath}${rosterFiltersToQuery(filters, { page: p })}`
  const national = !scope.state && !scope.schoolId
  const filtered = Boolean(
    filters.track || filters.status || filters.division || filters.language || filters.q
  )

  return (
    <section className="clay-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-foreground sm:text-lg">Entries</h2>
        {page && (
          <span className="text-xs text-muted">
            {page.total.toLocaleString('en-IN')} {page.total === 1 ? 'entry' : 'entries'} in this
            view
          </span>
        )}
      </div>

      {/* A GET form: the filters live in the URL, so a filtered view can be shared. */}
      <form method="get" action={basePath} className="mt-4 flex flex-wrap gap-2">
        <Select
          name="track"
          label="Championship"
          value={filters.track}
          all="All championships"
          options={TRACK_FILTER_OPTIONS}
        />
        <Select
          name="status"
          label="Status"
          value={filters.status}
          all="Any status"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'submitted', label: 'Submitted' },
          ]}
        />
        <Select
          name="division"
          label="Division"
          value={filters.division}
          all="Both divisions"
          options={(Object.keys(ISC_GROUPS) as IscGroup[]).map((g) => ({
            value: g,
            label: iscGroupLabel(g),
          }))}
        />
        <Select
          name="language"
          label="Language"
          value={filters.language}
          all="Any language"
          options={LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))}
        />
        <input
          name="q"
          defaultValue={filters.q ?? ''}
          placeholder="Student or school"
          aria-label="Search by student or school"
          className="h-10 min-w-[12rem] flex-1 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground placeholder:text-muted/60"
        />
        <button
          type="submit"
          className="clay-button h-10 bg-cta px-4 text-sm font-semibold text-white"
        >
          Apply
        </button>
        {filtered && (
          <Link
            href={basePath}
            className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {page === null ? (
        <p className="mt-6 text-sm text-muted">
          {national
            ? 'Open a state below, or add a filter or a search here, to list entries. Every entry in India is far too many to page through.'
            : 'Add a filter or a search to list entries.'}
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-bold uppercase tracking-wider text-foreground/50">
                <tr>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">School</th>
                  <th className="py-2 pr-3">Championship</th>
                  <th className="py-2 pr-3">Division</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Team</th>
                  <th className="py-2">Started</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((r) => (
                  <tr key={r.id} className="border-t border-black/[0.05]">
                    <td className="py-2 pr-3">
                      {r.leader_id ? (
                        <Link
                          href={`/admin/users/${r.leader_id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {r.leader_name ?? 'Unnamed'}
                        </Link>
                      ) : (
                        'Unnamed'
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted">{r.school_name}</td>
                    <td className="py-2 pr-3">{trackName(r.track)}</td>
                    <td className="py-2 pr-3 text-muted">
                      {r.division ? iscGroupLabel(r.division as IscGroup) : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-accent-yellow/15 text-amber-700'
                        }`}
                      >
                        {r.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted tabular-nums">{r.member_count}</td>
                    {/*
                      formatIstDay(istDay(...)), never toLocaleDateString: this
                      renders on the server, whose zone is UTC on Workers, so a
                      1 a.m. Indian entry would read as the previous day here
                      while the CSV -- which has always gone through these two
                      -- called it today.
                    */}
                    <td className="py-2 text-muted">{formatIstDay(istDay(r.created_at))}</td>
                  </tr>
                ))}
                {page.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted">
                      Nothing matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page.page} total={page.total} size={page.size} hrefFor={hrefFor} />
        </>
      )}
    </section>
  )
}
