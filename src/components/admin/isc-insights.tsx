import type { ReactNode } from 'react'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { trackById } from '@/lib/isc/tracks'
import {
  topSchools,
  byState,
  byBoard,
  classDistribution,
  submissionTimeline,
  staleDrafts,
  type AnalyticsEntry,
  type CountRow,
} from '@/lib/isc/analytics'

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="clay-card p-5">
      <h2 className="font-display font-bold text-foreground text-sm">{title}</h2>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>
}

/** A labelled count with a proportional bar, used by the class and board panels. */
function BarList({ rows, accent }: { rows: CountRow[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium">{r.label}</span>
            <span className="text-muted tabular-nums">{r.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${accent}`}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The six panels that answer "how is the cycle going", as opposed to the row
 * list underneath, which answers "what did this one student send".
 *
 * Every panel describes the whole cycle, not the filtered view: the filters are
 * for finding one entry, and a denominator that moved every time a filter
 * changed would make the numbers impossible to compare.
 */
export function IscInsights({
  entries,
  classByStudent,
  now,
}: {
  entries: AnalyticsEntry[]
  classByStudent: Map<string, string | null>
  now: Date
}) {
  const schools = topSchools(entries, 10)
  const states = byState(entries)
  const boards = byBoard(entries)
  const classes = classDistribution(entries, classByStudent)
  const timeline = submissionTimeline(entries)
  const stale = staleDrafts(entries, now, 7)
  const peak = Math.max(1, ...timeline.map((p) => p.count))

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Top schools" sub="Ranked by submitted entries">
          {schools.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted uppercase tracking-wide">
                    <th className="text-left font-semibold pb-2">School</th>
                    <th className="text-right font-semibold pb-2">Entries</th>
                    <th className="text-right font-semibold pb-2">Submitted</th>
                    <th className="text-right font-semibold pb-2">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {schools.map((s) => (
                    <tr key={s.schoolId}>
                      <td className="py-2 pr-3">
                        <span className="block text-foreground font-medium">{s.schoolName}</span>
                        <span className="block text-muted">{s.state || 'State not recorded'}</span>
                      </td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.entries}</td>
                      <td className="py-2 text-right text-green-700 font-semibold tabular-nums">
                        {s.submitted}
                      </td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="By state" sub="Schools and entries in each state">
          {states.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted uppercase tracking-wide">
                    <th className="text-left font-semibold pb-2">State</th>
                    <th className="text-right font-semibold pb-2">Schools</th>
                    <th className="text-right font-semibold pb-2">Entries</th>
                    <th className="text-right font-semibold pb-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  {states.map((s) => (
                    <tr key={s.state}>
                      <td className="py-2 pr-3 text-foreground font-medium">{s.state}</td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.schools}</td>
                      <td className="py-2 text-right text-muted tabular-nums">{s.entries}</td>
                      <td className="py-2 text-right text-green-700 font-semibold tabular-nums">
                        {s.submitted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="By class" sub="Students taking part, not entries">
          {classes.length === 0 ? (
            <Empty>No students have entered yet.</Empty>
          ) : (
            <BarList rows={classes} accent="bg-primary" />
          )}
        </Panel>

        <Panel title="By board" sub="From each school's record">
          {boards.length === 0 ? (
            <Empty>No entries yet.</Empty>
          ) : (
            <BarList rows={boards} accent="bg-accent-teal" />
          )}
        </Panel>

        <Panel title="Submissions per day" sub="Indian Standard Time">
          {timeline.length === 0 ? (
            <Empty>Nothing has been submitted yet.</Empty>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {timeline.map((p) => (
                <li key={p.day} className="flex items-center gap-2 text-xs">
                  <span className="text-muted w-20 shrink-0">{formatIstDay(p.day)}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-accent-pink"
                      style={{ width: `${(p.count / peak) * 100}%` }}
                    />
                  </span>
                  <span className="text-foreground font-semibold tabular-nums w-6 text-right">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Drafts going cold"
        sub="Started, then untouched for a week or more — the entries most likely to be lost"
      >
        {stale.length === 0 ? (
          <Empty>No draft has been sitting untouched for a week.</Empty>
        ) : (
          <>
            <ul className="divide-y divide-black/[0.06]">
              {stale.slice(0, 15).map((e) => (
                <li key={e.entryId} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="block text-foreground font-medium truncate">
                      {e.schoolName}
                    </span>
                    <span className="block text-muted">{trackById(e.track)?.name ?? e.track}</span>
                  </span>
                  <span className="text-muted shrink-0">
                    Last edited {formatIstDay(istDay(e.updatedAt))}
                  </span>
                </li>
              ))}
            </ul>
            {stale.length > 15 && (
              <p className="text-xs text-muted mt-2">
                Showing the 15 oldest of {stale.length}. Filter the list below by Draft to see them
                all.
              </p>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}
