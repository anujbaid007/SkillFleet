import { GraduationCap, Layers, Rocket, Trophy, Users } from 'lucide-react'
import { ISC_TRACKS } from '@/lib/isc/tracks'
import { countdownLabel } from '@/lib/isc/validate'
import { StatCard } from '@/components/dashboard/stat-card'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { ProgressRow, SplitBar } from '@/components/dashboard/charts'
import {
  rosterSummary,
  entryCounts,
  classParticipation,
  groupParticipation,
  type RosterEntryStatus,
} from '@/lib/coordinator/analytics'

/**
 * A coordinator's console, above the roster.
 *
 * Deliberately student-first: "11 of 40 have entered" is something a
 * coordinator can act on this afternoon, where "14 entries" is not. Entry
 * counts still appear, but as the school's output rather than its headline.
 */
export function CoordinatorStats({
  students,
  entries,
  deadlines,
  now,
}: {
  students: RosterEntryStatus[]
  entries: { track: string; status: string }[]
  deadlines: Record<string, string>
  now: Date
}) {
  const summary = rosterSummary(students)
  const counts = entryCounts(entries)
  const classes = classParticipation(students)
  const groups = groupParticipation(students)
  const pct = summary.eligible ? Math.round((summary.entered / summary.eligible) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={summary.students}
          icon={Users}
          tone="neutral"
          sub={`${summary.eligible} eligible, in Classes 5–12`}
        />
        <StatCard
          label="Have entered"
          value={summary.entered}
          icon={Rocket}
          tone="primary"
          progress={pct}
          sub={`${pct}% of your eligible students`}
        />
        <StatCard
          label="Entries"
          value={counts.total}
          icon={Trophy}
          tone="teal"
          sub={`${counts.submitted} submitted · ${counts.draft} still draft`}
        />
        <StatCard
          label="Yet to start"
          value={summary.notEntered}
          icon={GraduationCap}
          tone="warning"
          sub="Eligible, nothing begun on any track"
        />
      </div>

      {/*
        The school in one bar: a coordinator's whole job is moving students
        from grey to amber to green, and three separate figures never showed
        the shape of that.

        Counted in students, never entries — the two do not sum to the same
        thing (one student can hold three entries), and a bar that says
        "every eligible student" while measuring entries is simply wrong.
      */}
      <Panel
        title="Where your school stands"
        subtitle="Every eligible student, by how far they have got"
        icon={Layers}
      >
        <SplitBar
          total={summary.eligible}
          segments={[
            { status: 'submitted', value: summary.submittedStudents },
            {
              status: 'draft',
              // Started something, submitted nothing.
              value: Math.max(0, summary.entered - summary.submittedStudents),
            },
            { status: 'not_started', value: summary.notEntered },
          ]}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="By championship"
          subtitle="Your school's entries, and how long is left"
          icon={Trophy}
          className="h-full"
        >
          <div className="space-y-4">
            {ISC_TRACKS.map((t) => {
              const row = counts.byTrack[t.id]
              const total = row.submitted + row.draft
              const closing = countdownLabel(deadlines[t.id] ?? '', now)
              return (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[13px] font-semibold text-foreground">{t.name}</span>
                    <span className="text-[11px] text-muted shrink-0">{closing}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${t.gradient}`}
                      style={{ width: total ? `${(row.submitted / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    <span className="font-bold text-emerald-600 tabular-nums">{row.submitted}</span>{' '}
                    submitted ·{' '}
                    <span className="font-bold text-amber-600 tabular-nums">{row.draft}</span> draft
                  </p>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel
          title="Class by class"
          subtitle="Classes 5–12 only — younger students cannot enter ISC 2026"
          icon={GraduationCap}
          className="h-full"
        >
          {classes.length === 0 ? (
            <PanelEmpty>No students from Classes 5–12 have joined SkillFleet yet.</PanelEmpty>
          ) : (
            <ul className="space-y-3">
              {classes.map((c) => (
                <ProgressRow
                  key={c.schoolClass}
                  label={c.schoolClass}
                  value={c.entered}
                  of={c.students}
                  barClass="bg-primary"
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="By group"
          subtitle="Group 1: Classes 5–8 · Group 2: Classes 9–12"
          icon={Layers}
          className="h-full"
        >
          {groups.length === 0 ? (
            <PanelEmpty>No eligible students yet.</PanelEmpty>
          ) : (
            <ul className="space-y-3">
              {groups.map((g) => (
                <ProgressRow
                  key={g.group}
                  label={g.label}
                  value={g.entered}
                  of={g.students}
                  barClass="bg-accent-teal"
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
