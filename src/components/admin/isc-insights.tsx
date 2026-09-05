import { CalendarDays, Languages, Layers, ListChecks } from 'lucide-react'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { formatIstDay } from '@/lib/isc/dates'
import { iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import type { CountRow, IscSummary, TimelinePoint } from '@/lib/admin/isc'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

const DIVISION_LABEL = (key: string) =>
  key === 'group1' || key === 'group2' ? iscGroupLabel(key as IscGroup) : 'Division not recorded'

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', submitted: 'Submitted' }

/**
 * A list of counts with its unit written into the panel, not left to be
 * inferred.
 *
 * This is the whole reason these three panels sit apart from the by-track
 * figures in the funnel strip above: by_track counts STUDENTS while these
 * three count ENTRIES, and four lists side by side with no units would read as
 * four cuts of one quantity when they are two different quantities.
 */
function CountList({ rows, label }: { rows: CountRow[]; label: (key: string) => string }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  if (rows.length === 0) return <PanelEmpty>Nothing entered here yet.</PanelEmpty>
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {label(r.key)}
          </span>
          <span className="shrink-0 text-xs text-muted">
            <span className="text-sm font-bold tabular-nums text-foreground">{n(r.count)}</span>{' '}
            {r.count === 1 ? 'entry' : 'entries'}
          </span>
        </li>
      ))}
      <li className="border-t border-black/[0.05] pt-2.5 text-[11px] text-muted">
        {n(total)} {total === 1 ? 'entry' : 'entries'} in total
      </li>
    </ul>
  )
}

/**
 * The panels that answer "how is the cycle going", as opposed to the roster,
 * which answers "what did this one team send".
 *
 * Every panel reads the scope it is given — a state page shows that state's
 * split and timeline, not the country's.
 *
 * Three panels that used to live here are gone rather than faked: top schools,
 * the class distribution and drafts going cold. All three needed every row in
 * scope loaded into memory, which is exactly what this rewrite removes. The
 * comparison chart ranks schools now, and a draft that has gone quiet is found
 * by filtering the entries below to Draft.
 */
export function IscInsights({
  summary,
  timeline,
}: {
  summary: IscSummary
  timeline: TimelinePoint[]
}) {
  const peak = Math.max(1, ...timeline.map((p) => Math.max(p.started, p.submitted)))
  const started = timeline.reduce((sum, p) => sum + p.started, 0)
  const submitted = timeline.reduce((sum, p) => sum + p.submitted, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <Panel
          title="Entries by division"
          subtitle="Counted in entries, one division per entry"
          icon={Layers}
          className="h-full"
        >
          <CountList rows={summary.by_division} label={DIVISION_LABEL} />
        </Panel>
      </div>

      <div className="lg:col-span-4">
        <Panel
          title="Entries by status"
          subtitle="Counted in entries, one status per entry"
          icon={ListChecks}
          className="h-full"
        >
          <CountList rows={summary.by_status} label={(k) => STATUS_LABEL[k] ?? k} />
        </Panel>
      </div>

      <div className="lg:col-span-4">
        <Panel
          title="Entries by language"
          subtitle="Counted in entries, taken from what was submitted"
          icon={Languages}
          className="h-full"
        >
          <CountList
            rows={summary.by_language}
            label={(k) => (k === 'unknown' ? 'Language not chosen yet' : k)}
          />
        </Panel>
      </div>

      <div className="lg:col-span-12">
        <Panel
          title="Each day"
          subtitle="Counted in entries, by Indian Standard Time — how many entries were started that day, and how many were submitted"
          icon={CalendarDays}
        >
          {timeline.length === 0 ? (
            <PanelEmpty>No days to show yet.</PanelEmpty>
          ) : (
            <>
              <ul className="flex h-28 items-end gap-[3px]" aria-hidden="true">
                {timeline.map((p) => (
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
                  {formatIstDay(timeline[0].day)} to {formatIstDay(timeline[timeline.length - 1].day)}
                </span>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
