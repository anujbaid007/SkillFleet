import { ISC_TRACKS } from '@/lib/isc/tracks'

export interface IscStats {
  total: number
  submitted: number
  draft: number
  schools: number
  students: number
  byTrack: Record<string, { submitted: number; draft: number }>
  byLanguage: Record<string, number>
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent: string
}) {
  return (
    <div className="clay-card p-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

/**
 * The numbers an admin actually needs before drilling into rows: how much has
 * come in, how much is finished, and how it splits by track — the split that
 * decides which panels get booked.
 */
export function IscStatsPanel({ stats }: { stats: IscStats }) {
  const completion = stats.total ? Math.round((stats.submitted / stats.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Tile label="Entries" value={stats.total} sub="Drafts and submissions" accent="text-foreground" />
        <Tile
          label="Submitted"
          value={stats.submitted}
          sub={`${completion}% of all entries`}
          accent="text-green-700"
        />
        <Tile label="Still draft" value={stats.draft} sub="Not yet submitted" accent="text-accent-yellow" />
        <Tile label="Schools" value={stats.schools} sub="With at least one entry" accent="text-primary" />
        <Tile label="Students" value={stats.students} sub="Leaders and teammates" accent="text-accent-teal" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By track</h2>
          <div className="mt-3 space-y-2">
            {ISC_TRACKS.map((t) => {
              const row = stats.byTrack[t.id] ?? { submitted: 0, draft: 0 }
              const trackTotal = row.submitted + row.draft
              const pct = stats.total ? (trackTotal / stats.total) * 100 : 0
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{t.name}</span>
                    <span className="text-muted">
                      {row.submitted} submitted · {row.draft} draft
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${t.gradient}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="clay-card p-5">
          <h2 className="font-display font-bold text-foreground text-sm">By language</h2>
          {Object.keys(stats.byLanguage).length === 0 ? (
            <p className="text-xs text-muted mt-3">No entries have chosen a language yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {Object.entries(stats.byLanguage)
                .sort((a, b) => b[1] - a[1])
                .map(([lang, n]) => (
                  <li key={lang} className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{lang}</span>
                    <span className="text-muted">
                      {n} {n === 1 ? 'entry' : 'entries'}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
