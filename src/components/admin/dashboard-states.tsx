import Link from 'next/link'
import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import type { BreakdownRow } from '@/lib/admin/isc'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

/**
 * WHY THERE IS NO PERCENTAGE AND NO BAR ON THIS COMPONENT, and why adding one
 * would be a bug rather than a polish.
 *
 * admin_dashboard ranks both lists by submitted / eligible, but that ratio is
 * not a share of anything. `submitted` counts students on a submitted entry at
 * a school in that state — including students outside Classes 5 to 12 and
 * students who live in another state. `eligible` counts Classes 5 to 12
 * students whose own profile says they live there. Different sets, so the
 * ratio reached 1.39 on the harness seed, and a bar at 139% is a bar that has
 * stopped meaning what a bar means.
 *
 * So the ranking is left to the ORDER of the rows, which is where the database
 * put it, and each row shows the two counts with their units. The coordinator
 * section's entered_pct IS a real percentage — numerator inside its own
 * denominator, same schools — and is drawn as one there. These are not that.
 */
function StateList({ rows, empty }: { rows: BreakdownRow[]; empty: string }) {
  if (rows.length === 0) return <PanelEmpty>{empty}</PanelEmpty>
  return (
    <ul className="divide-y divide-black/[0.05]">
      {rows.map((r) => (
        <li key={r.key}>
          <Link
            href={`/admin/isc/state/${encodeURIComponent(r.key)}`}
            className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary"
          >
            <span className="min-w-0 truncate text-[13px] font-semibold text-foreground group-hover:text-primary">
              {r.label}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted">
              <span>
                <span className="text-sm font-bold tabular-nums text-emerald-600">
                  {n(r.submitted)}
                </span>{' '}
                submitted
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-bold tabular-nums text-foreground">{n(r.eligible)}</span>{' '}
                eligible
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * The two ends of the country, side by side: where the championship is going
 * best and where it has stalled. Both lists come from one snapshot of
 * admin_isc_breakdown inside admin_dashboard, so a state cannot appear in
 * both, and a state can appear in neither.
 */
export function DashboardStates({
  top,
  stalled,
}: {
  top: BreakdownRow[]
  stalled: BreakdownRow[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Strongest states"
        subtitle="Most students submitted for the eligible students living there. Open one to see its districts."
        icon={TrendingUp}
        className="h-full"
      >
        <StateList rows={top} empty="No state has a submitted entry yet." />
      </Panel>

      <Panel
        title="Stalled states"
        subtitle="Fewest submitted for the eligible students living there, among states with at least 50 eligible students."
        icon={TrendingDown}
        className="h-full"
      >
        <StateList
          rows={stalled}
          empty="No state has 50 eligible students yet, so there is nothing to call stalled."
        />
      </Panel>

      <div className="lg:col-span-2">
        <p className="text-xs leading-relaxed text-muted">
          Ranked, not scored. Submitted students are counted by the state of the school their entry
          belongs to and eligible students by the state on their own profile, so one is not a share
          of the other and neither list carries a percentage.
        </p>
      </div>
    </div>
  )
}
