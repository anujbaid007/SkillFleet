import { CalendarDays } from 'lucide-react'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { formatIstDay } from '@/lib/isc/dates'
import type { CoordinatorTrendPoint } from '@/lib/admin/coordinators'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

/**
 * Recruitment, as a SIGNUP COHORT — and the title says so, because the same
 * bars read as an event chart would be a lie.
 *
 * `schools` carries no claim date and no approval date, so "how many claims
 * were made on Tuesday" is not a question the database can answer. What it can
 * answer is: of the people who signed up on Tuesday, how many have since
 * claimed a school and how many of those claims are approved. Every bar in a
 * day's group therefore belongs to that day's INTAKE, not to that day's
 * events, and the totals under the chart are the totals for the people who
 * signed up inside the window — never for the whole country.
 *
 * The consequence a founder would otherwise discover by alarm: a 30-day window
 * shows only the approvals of people who signed up in those 30 days, which on
 * the seeded data is 4 against 19 approved schools. The note under the chart
 * says it in one line, with the real numbers.
 */
export function CoordinatorTrendChart({
  points,
  approvedTotal,
  scoped = false,
}: {
  points: CoordinatorTrendPoint[]
  /** Approved coordinators in this scope overall, for the note under the chart. */
  approvedTotal: number
  /** True on a state page, where the first two series are identical by construction. */
  scoped?: boolean
}) {
  const peak = Math.max(1, ...points.map((p) => p.coordinators))
  const signups = points.reduce((sum, p) => sum + p.coordinators, 0)
  const claimed = points.reduce((sum, p) => sum + p.cohort_claimed, 0)
  const approved = points.reduce((sum, p) => sum + p.cohort_approved, 0)

  return (
    <Panel
      title="Coordinators by the day they signed up"
      subtitle="Each day is that day's intake of teachers, and how many of that same group have since claimed a school and been approved"
      icon={CalendarDays}
    >
      {points.length === 0 ? (
        <PanelEmpty>No days to show yet.</PanelEmpty>
      ) : (
        <>
          <ul className="flex h-28 items-end gap-[3px]" aria-hidden="true">
            {points.map((p) => (
              <li key={p.day} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                <span
                  className="w-1/3 rounded-t-sm bg-primary/70"
                  style={{ height: `${Math.max(2, (p.coordinators / peak) * 100)}%` }}
                  title={`${formatIstDay(p.day)}: ${n(p.coordinators)} signed up`}
                />
                <span
                  className="w-1/3 rounded-t-sm bg-accent-teal"
                  style={{ height: `${Math.max(2, (p.cohort_claimed / peak) * 100)}%` }}
                  title={`${formatIstDay(p.day)}: ${n(p.cohort_claimed)} of them have claimed a school`}
                />
                <span
                  className="w-1/3 rounded-t-sm bg-emerald-500"
                  style={{ height: `${Math.max(2, (p.cohort_approved / peak) * 100)}%` }}
                  title={`${formatIstDay(p.day)}: ${n(p.cohort_approved)} of them are approved`}
                />
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-black/[0.05] pt-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              Signed up
              <span className="font-bold tabular-nums text-foreground">{n(signups)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-teal" />
              Have claimed a school
              <span className="font-bold tabular-nums text-foreground">{n(claimed)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved
              <span className="font-bold tabular-nums text-foreground">{n(approved)}</span>
            </span>
            <span>
              {formatIstDay(points[0].day)} to {formatIstDay(points[points.length - 1].day)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            A claim and an approval are plotted on the day that teacher signed up, because a school
            row carries no claim date — so these {points.length} days show {n(approved)} approved
            against {n(approvedTotal)} approved in all, and the rest signed up before this window
            starts.
            {scoped &&
              ' Inside one state the first two bars are always identical: a coordinator has no state until they claim a school.'}
          </p>
        </>
      )}
    </Panel>
  )
}
