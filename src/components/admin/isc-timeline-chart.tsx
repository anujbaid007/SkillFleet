import { CalendarDays } from 'lucide-react'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { formatIstDay } from '@/lib/isc/dates'
import type { TimelinePoint } from '@/lib/admin/isc'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

/**
 * Entries started and entries submitted, one pair of bars per Indian calendar
 * day, oldest first.
 *
 * It lives on its own so the admin overview's seven days and the ISC pages'
 * thirty are literally the same chart. Two charts of the same quantity that
 * scale, label or round differently is how one screen ends up contradicting
 * another; there is one here.
 *
 * COUNTED IN ENTRIES. IscSummary.started counts PEOPLE. Same word, different
 * unit, which is why the subtitle says which and the caller cannot leave it
 * out.
 */
export function IscTimelineChart({
  points,
  title = 'Each day',
  subtitle = 'Counted in entries, by Indian Standard Time — how many entries were started that day, and how many were submitted',
}: {
  points: TimelinePoint[]
  title?: string
  subtitle?: string
}) {
  // At least 1, so a window in which nothing happened divides by one rather
  // than by nought and every bar sits at its floor height.
  const peak = Math.max(1, ...points.map((p) => Math.max(p.started, p.submitted)))
  const started = points.reduce((sum, p) => sum + p.started, 0)
  const submitted = points.reduce((sum, p) => sum + p.submitted, 0)

  return (
    <Panel title={title} subtitle={subtitle} icon={CalendarDays}>
      {points.length === 0 ? (
        <PanelEmpty>No days to show yet.</PanelEmpty>
      ) : (
        <>
          <ul className="flex h-28 items-end gap-[3px]" aria-hidden="true">
            {points.map((p) => (
              <li key={p.day} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                <span
                  className="w-1/2 rounded-t-sm bg-primary/70"
                  style={{ height: `${Math.max(2, (p.started / peak) * 100)}%` }}
                  title={`${formatIstDay(p.day)}: ${n(p.started)} started`}
                />
                <span
                  className="w-1/2 rounded-t-sm bg-emerald-500"
                  style={{ height: `${Math.max(2, (p.submitted / peak) * 100)}%` }}
                  title={`${formatIstDay(p.day)}: ${n(p.submitted)} submitted`}
                />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-black/[0.05] pt-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              Started
              <span className="font-bold tabular-nums text-foreground">{n(started)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Submitted
              <span className="font-bold tabular-nums text-foreground">{n(submitted)}</span>
            </span>
            <span>
              {formatIstDay(points[0].day)} to {formatIstDay(points[points.length - 1].day)}
            </span>
          </div>
        </>
      )}
    </Panel>
  )
}
