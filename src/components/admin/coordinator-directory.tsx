import Link from 'next/link'
import { Pagination } from '@/components/admin/pagination'
import { ClaimChip } from '@/components/admin/coordinator-claim-chip'
import {
  CLAIM_STATUSES,
  coordinatorsQueryToString,
  enteredPercent,
  type CoordinatorRow,
  type CoordinatorsQuery,
  type CoordinatorsSort,
} from '@/lib/admin/coordinators'
import type { Page } from '@/lib/admin/isc'
import { formatIstDay, istDay } from '@/lib/isc/dates'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

const SORT_OPTIONS: { value: CoordinatorsSort; label: string }[] = [
  { value: 'students_desc', label: 'Most students first' },
  { value: 'students_asc', label: 'Fewest students first' },
  { value: 'name_asc', label: 'Name, A to Z' },
  { value: 'joined_desc', label: 'Newest first' },
]

const STATUS_LABEL: Record<string, string> = {
  none: 'No school claimed',
  pending: 'Waiting on review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const FIELD =
  'h-10 rounded-xl border-2 border-black/[0.06] bg-white px-3 text-sm text-foreground'

const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted'
const TH_NUM = `${TH} text-right`

/**
 * Every coordinator, searched, filtered and sorted by the database.
 *
 * Sorted by reach by default, because that is the founder's question: who is
 * bringing the most students in. The claim status is on every row, and 'No
 * school claimed' is a real row rather than a gap — a teacher who signed up and
 * stopped is exactly who this list is meant to surface.
 *
 * `students` is every student at every school that person claims WHATEVER the
 * claim status, so this column deliberately does not sum to the overview's
 * "students reached", which counts approved schools only. The note under the
 * table says so.
 *
 * A state filter is a select rather than a text box because the SQL matches the
 * state exactly; a typo would return an empty page that looked like an answer.
 * The options come from the breakdown, so before the migration is run there is
 * no state filter to offer — the one in the address is kept and shown as a chip.
 */
export function CoordinatorDirectory({
  page,
  query,
  basePath,
  states,
}: {
  page: Page<CoordinatorRow>
  query: CoordinatorsQuery
  basePath: string
  /** Every state with a school. Empty when the breakdown could not be read. */
  states: string[]
}) {
  const hrefFor = (p: number) => basePath + coordinatorsQueryToString(query, { page: p })
  const filtered = Boolean(query.q || query.status || query.state)
  const canPickState = states.length > 0

  return (
    <div className="space-y-4">
      {/* A GET form: every filter lives in the URL, so a filtered view can be bookmarked. */}
      <div className="clay-card p-5 sm:p-6">
        <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={query.q ?? ''}
            placeholder="Name, email or school"
            aria-label="Search coordinators"
            className={`${FIELD} min-w-[14rem] flex-1 placeholder:text-muted/60`}
          />
          <select
            name="status"
            defaultValue={query.status ?? ''}
            aria-label="Claim status"
            className={FIELD}
          >
            <option value="">Any claim status</option>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {canPickState ? (
            <select name="state" defaultValue={query.state ?? ''} aria-label="State" className={FIELD}>
              <option value="">Any state</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            // Kept so a search does not silently widen a scoped view back out.
            query.state && <input type="hidden" name="state" value={query.state} />
          )}
          <select name="sort" defaultValue={query.sort} aria-label="Sort" className={FIELD}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="clay-button h-10 bg-cta px-4 text-sm font-semibold text-white"
          >
            Search
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

        {query.state && !canPickState && (
          <p className="mt-3 text-xs text-muted">
            Showing {query.state} only.{' '}
            <Link
              href={basePath + coordinatorsQueryToString(query, { state: undefined, page: 1 })}
              className="font-semibold text-primary hover:underline"
            >
              Show every state
            </Link>
          </p>
        )}
        {query.state && (
          <p className="mt-3 text-xs text-muted">
            A coordinator only has a state once they have claimed a school there, so a state filter
            never lists anyone who has claimed nothing.
          </p>
        )}
      </div>

      <div className="clay-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
            Coordinators
          </h2>
          <span className="text-xs text-muted">
            {n(page.total)} {page.total === 1 ? 'person' : 'people'}
            {filtered ? ' match these filters' : ' in all'}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left">
                <th className={TH}>Name</th>
                <th className={TH}>School</th>
                <th className={TH}>State</th>
                <th className={TH}>Claim</th>
                <th className={TH_NUM}>Students</th>
                <th className={TH_NUM}>Entered</th>
                <th className={TH}>Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {page.rows.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/coordinators/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.full_name ?? 'Unnamed coordinator'}
                    </Link>
                    {/* email is null when the auth row has gone — a word, never "null". */}
                    <span className="mt-0.5 block text-xs text-muted">{c.email ?? 'No account'}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.school_name ?? 'None yet'}
                    {c.schools_claimed > 1 && (
                      <span className="mt-0.5 block text-xs">
                        and {n(c.schools_claimed - 1)} more — the numbers cover all{' '}
                        {n(c.schools_claimed)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.state ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ClaimChip status={c.claim_status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {n(c.students)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {n(c.students_entered)}
                    {c.students > 0 && (
                      <span className="ml-1 text-[11px]">
                        ({enteredPercent(c.students_entered, c.students)}%)
                      </span>
                    )}
                  </td>
                  {/*
                    formatIstDay(istDay(...)), never toLocaleDateString: this
                    renders on the server, whose zone is UTC on Workers, so a
                    just-after-midnight Indian signup would read as the day before.
                  */}
                  <td className="px-4 py-3 text-muted">{formatIstDay(istDay(c.joined_at))}</td>
                </tr>
              ))}
              {page.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    {filtered
                      ? 'Nobody matches these filters.'
                      : 'No teacher has signed up as a coordinator yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 pb-5">
          <Pagination page={page.page} total={page.total} size={page.size} hrefFor={hrefFor} />
          <p className="pt-4 text-xs leading-relaxed text-muted">
            Students counts everyone on the register of every school this person claims, whatever
            the claim status — so this column adds up to more than the students reached on the
            overview, which counts approved schools only. Entered is the part of that same group on
            at least one entry.
          </p>
        </div>
      </div>
    </div>
  )
}
