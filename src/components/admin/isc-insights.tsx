import { AlarmClock, CalendarDays, GraduationCap, Landmark, Layers, Trophy } from 'lucide-react'
import { formatIstDay, istDay } from '@/lib/isc/dates'
import { trackById } from '@/lib/isc/tracks'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { RankedBars, ProgressRow } from '@/components/dashboard/charts'
import {
  topSchools,
  byState,
  byBoard,
  byGroup,
  classDistribution,
  submissionTimeline,
  staleDrafts,
  type AnalyticsEntry,
} from '@/lib/isc/analytics'

/** Right-aligned numeric column, kept in one place so the tables agree. */
const NUM = 'text-right tabular-nums whitespace-nowrap pl-4'

/**
 * The panels that answer "how is the cycle going", as opposed to the roster,
 * which answers "what did this one student send".
 *
 * Every panel reads the scope it is given — a state page shows that state's
 * board split and timeline, not the country's.
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
  const groups = byGroup(entries)
  const classes = classDistribution(entries, classByStudent)
  const timeline = submissionTimeline(entries)
  const stale = staleDrafts(entries, now, 7)
  const totalStudents = classes.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Panel
          title="Top schools"
          subtitle="Ranked by submitted entries"
          icon={Trophy}
          padded={false}
        >
          {schools.length === 0 ? (
            <div className="px-5 pb-5">
              <PanelEmpty>No entries yet.</PanelEmpty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted uppercase tracking-wider border-y border-black/[0.05] bg-slate-50/60">
                    <th className="text-left font-bold py-2.5 pl-5">School</th>
                    <th className={`font-bold py-2.5 ${NUM}`}>Entries</th>
                    <th className={`font-bold py-2.5 ${NUM}`}>Submitted</th>
                    <th className={`font-bold py-2.5 pr-5 ${NUM}`}>Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {schools.map((s) => (
                    <tr key={s.schoolId} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pl-5 pr-3">
                        <span className="block text-foreground font-semibold">{s.schoolName}</span>
                        <span className="block text-muted text-[11px]">
                          {s.state || 'State not recorded'}
                        </span>
                      </td>
                      <td className={`py-2.5 text-muted ${NUM}`}>{s.entries}</td>
                      <td className={`py-2.5 text-emerald-600 font-bold ${NUM}`}>{s.submitted}</td>
                      <td className={`py-2.5 pr-5 text-muted ${NUM}`}>{s.students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="lg:col-span-5">
        <Panel
          title="Submissions per day"
          subtitle="Indian Standard Time"
          icon={CalendarDays}
          className="h-full"
        >
          {timeline.length === 0 ? (
            <PanelEmpty>Nothing has been submitted yet.</PanelEmpty>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-1">
              <RankedBars
                rows={timeline.map((p) => ({
                  key: p.day,
                  label: formatIstDay(p.day),
                  value: p.count,
                }))}
                barClass="bg-gradient-to-r from-accent-pink to-accent-purple"
                valueClass="text-accent-pink"
              />
            </div>
          )}
        </Panel>
      </div>

      <div className="lg:col-span-4">
        <Panel
          title="By class"
          subtitle="Students taking part, not entries"
          icon={GraduationCap}
          className="h-full"
        >
          {classes.length === 0 ? (
            <PanelEmpty>No students have entered yet.</PanelEmpty>
          ) : (
            <ul className="space-y-3">
              {classes.map((c) => (
                <ProgressRow
                  key={c.label}
                  label={c.label}
                  value={c.count}
                  of={totalStudents}
                  barClass="bg-primary"
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="lg:col-span-4">
        <Panel
          title="By board"
          subtitle="From each school's record"
          icon={Landmark}
          className="h-full"
        >
          {boards.length === 0 ? (
            <PanelEmpty>No entries yet.</PanelEmpty>
          ) : (
            <RankedBars
              rows={boards.map((b) => ({ key: b.label, label: b.label, value: b.count }))}
              barClass="bg-gradient-to-r from-accent-teal to-emerald-400"
              valueClass="text-accent-teal"
            />
          )}
        </Panel>
      </div>

      <div className="lg:col-span-4">
        <Panel
          title="By group"
          subtitle="Group 1: Classes 5–8 · Group 2: Classes 9–12"
          icon={Layers}
          className="h-full"
        >
          {groups.length === 0 ? (
            <PanelEmpty>No entries yet.</PanelEmpty>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.group} className="rounded-xl bg-slate-50 border border-black/[0.04] p-3.5">
                  <p className="text-[13px] font-bold text-foreground">{g.label}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted">
                    <span>
                      <span className="font-bold text-foreground tabular-nums">{g.entries}</span>{' '}
                      {g.entries === 1 ? 'entry' : 'entries'}
                    </span>
                    <span>
                      <span className="font-bold text-emerald-600 tabular-nums">{g.submitted}</span>{' '}
                      submitted
                    </span>
                    <span>
                      <span className="font-bold text-foreground tabular-nums">{g.students}</span>{' '}
                      {g.students === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {states.length > 1 && (
        <div className="lg:col-span-12">
          <Panel title="By state" subtitle="Schools and entries in each state" icon={Landmark} padded={false}>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="text-muted uppercase tracking-wider border-y border-black/[0.05] bg-slate-50">
                    <th className="text-left font-bold py-2.5 pl-5">State</th>
                    <th className={`font-bold py-2.5 ${NUM}`}>Schools</th>
                    <th className={`font-bold py-2.5 ${NUM}`}>Entries</th>
                    <th className={`font-bold py-2.5 pr-5 ${NUM}`}>Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {states.map((s) => (
                    <tr key={s.state} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pl-5 pr-3 text-foreground font-semibold">{s.state}</td>
                      <td className={`py-2.5 text-muted ${NUM}`}>{s.schools}</td>
                      <td className={`py-2.5 text-muted ${NUM}`}>{s.entries}</td>
                      <td className={`py-2.5 pr-5 text-emerald-600 font-bold ${NUM}`}>
                        {s.submitted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      <div className="lg:col-span-12">
        <Panel
          title="Drafts going cold"
          subtitle="Started, then untouched for a week or more — the entries most likely to be lost"
          icon={AlarmClock}
        >
          {stale.length === 0 ? (
            <PanelEmpty>No draft has been sitting untouched for a week.</PanelEmpty>
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stale.slice(0, 15).map((e) => (
                  <li
                    key={e.entryId}
                    className="rounded-xl bg-amber-50/60 border border-amber-200/60 px-3.5 py-2.5"
                  >
                    <span className="block text-[13px] text-foreground font-semibold truncate">
                      {e.schoolName}
                    </span>
                    <span className="block text-[11px] text-muted mt-0.5">
                      {trackById(e.track)?.name ?? e.track} · last edited{' '}
                      {formatIstDay(istDay(e.updatedAt))}
                    </span>
                  </li>
                ))}
              </ul>
              {stale.length > 15 && (
                <p className="text-[11px] text-muted mt-3">
                  Showing the 15 oldest of {stale.length}. Filter by Draft to see them all.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
