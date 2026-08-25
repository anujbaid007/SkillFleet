import { ISC_TRACKS } from '@/lib/isc/tracks'
import { countdownLabel } from '@/lib/isc/validate'
import {
  rosterSummary,
  entryCounts,
  classParticipation,
  type RosterEntryStatus,
} from '@/lib/coordinator/analytics'

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub: string
  accent: string
}) {
  return (
    <div className="clay-card p-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  )
}

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
  const pct = summary.eligible ? Math.round((summary.entered / summary.eligible) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Students"
          value={summary.students}
          sub={`${summary.eligible} in Classes 5–12`}
          accent="text-foreground"
        />
        <Tile
          label="Have entered"
          value={summary.entered}
          sub={`${pct}% of eligible students`}
          accent="text-primary"
        />
        <Tile
          label="Entries"
          value={counts.total}
          sub={`${counts.submitted} entered · ${counts.draft} still draft`}
          accent="text-accent-teal"
        />
        <Tile
          label="Yet to start"
          value={summary.notEntered}
          sub="Eligible, nothing begun"
          accent="text-accent-yellow"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By championship</h2>
          <p className="text-xs text-muted mt-0.5">
            Your school&apos;s entries, and how long is left
          </p>
          <div className="mt-3 space-y-3">
            {ISC_TRACKS.map((t) => {
              const row = counts.byTrack[t.id]
              const total = row.submitted + row.draft
              const closing = countdownLabel(deadlines[t.id] ?? '', now)
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground font-medium">{t.name}</span>
                    <span className="text-muted shrink-0">{closing}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex-1 h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                      <span
                        className={`block h-full rounded-full bg-gradient-to-r ${t.gradient}`}
                        style={{ width: total ? `${(row.submitted / total) * 100}%` : '0%' }}
                      />
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      {row.submitted} entered · {row.draft} draft
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">Class by class</h2>
          <p className="text-xs text-muted mt-0.5">
            Classes 5–12 only — younger students cannot enter ISC 2026
          </p>
          {classes.length === 0 ? (
            <p className="text-xs text-muted mt-3">
              No students from Classes 5–12 have joined SkillFleet yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {classes.map((c) => (
                <li key={c.schoolClass}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{c.schoolClass}</span>
                    <span className="text-muted">
                      {c.entered} of {c.students} entered
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.entered / Math.max(1, c.students)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
