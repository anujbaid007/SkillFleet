import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { enteredPercent, type CoordinatorBreakdownRow } from '@/lib/admin/coordinators'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted'
const TH_NUM = `${TH} text-right`

/**
 * Where the coordinators are: states nationally, districts inside a state.
 *
 * A table rather than ranked bars, because six columns is what makes this
 * readable — coverage is a relationship between schools claimed, schools
 * present and students reached, and one bar can only carry one of them.
 *
 * Rows with no coordinator at all are kept, and they are the point: a state
 * with schools and nobody running them is the row worth opening.
 *
 * The entered share IS a share: both counts are students at the covered
 * schools of that row, so the numerator is inside its own denominator. Nothing
 * on this table divides two differently-scoped counts.
 */
export function CoordinatorBreakdownTable({
  rows,
  level,
  hrefFor,
}: {
  rows: CoordinatorBreakdownRow[]
  level: 'state' | 'district'
  /** Absent at district level: there is no district page to open. */
  hrefFor?: (key: string) => string
}) {
  const isState = level === 'state'

  return (
    <Panel
      title={isState ? 'States' : 'Districts'}
      subtitle={
        isState
          ? 'Students reached, most first — open a state to see its districts'
          : 'Students reached, most first'
      }
      icon={BarChart3}
      padded={false}
      action={
        <span className="whitespace-nowrap text-[11px] text-muted">
          {n(rows.length)} {rows.length === 1 ? 'row' : 'rows'}
        </span>
      }
    >
      {rows.length === 0 ? (
        <div className="px-5 pb-5">
          <PanelEmpty>
            {isState ? 'No school anywhere yet.' : 'No school in this state yet.'}
          </PanelEmpty>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-left">
                <th className={TH}>{isState ? 'State' : 'District'}</th>
                <th className={TH_NUM}>Coordinators</th>
                <th className={TH_NUM}>Approved</th>
                <th className={TH_NUM}>Schools claimed</th>
                <th className={TH_NUM}>Students reached</th>
                <th className={TH_NUM}>Entered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {rows.map((r) => (
                <tr key={r.key} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    {hrefFor ? (
                      <Link
                        href={hrefFor(r.key)}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{r.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {n(r.coordinators)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{n(r.approved)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {n(r.schools_claimed)} of {n(r.schools_total)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {n(r.students_covered)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {n(r.students_entered)}
                    {r.students_covered > 0 && (
                      <span className="ml-1 text-[11px]">
                        ({enteredPercent(r.students_entered, r.students_covered)}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
        The two remaining places section G's totals do not add up. Each is
        under the table it applies to rather than in a footnote nobody reads.
      */}
      <p className="px-5 pb-5 pt-4 text-xs leading-relaxed text-muted">
        {isState ? (
          <>
            A coordinator has no state until they claim a school, so anyone who has signed up and
            claimed nothing is counted in the total above and in none of these rows — the state
            column adds up to fewer coordinators than the headline.
          </>
        ) : (
          <>
            A coordinator holding claims in two districts is counted in both rows, so the
            coordinator and approved columns can add up to more than the state total above. Every
            school and student column still adds up exactly.
          </>
        )}
      </p>
    </Panel>
  )
}
