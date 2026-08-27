import type { FunnelResult } from '@/lib/isc/funnel'

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
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
 * eligible -> started -> submitted for whatever scope is on screen.
 *
 * Counted in students rather than entries: a submitted team of four is four
 * students reached, and that is the number outreach is actually judged on.
 */
export function IscFunnelPanel({ funnel }: { funnel: FunnelResult }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Tile
          label="Eligible"
          value={funnel.eligible}
          sub="Students in Classes 5–12"
          accent="text-foreground"
        />
        <Tile
          label="Started"
          value={funnel.started}
          sub={`${funnel.activationRate}% of eligible`}
          accent="text-primary"
        />
        <Tile
          label="Submitted"
          value={funnel.submitted}
          sub={`${funnel.completionRate}% of those who started`}
          accent="text-green-700"
        />
      </div>

      <div className="clay-card p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">
          Students started, by track
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground mt-2">
          {funnel.byTrack.map((t) => (
            <span key={t.label}>
              {t.label}: <span className="font-semibold">{t.count}</span>
            </span>
          ))}
        </div>
        {/* Said plainly, because the arithmetic looks broken otherwise: a
            student on two tracks is one student above and two counts here. */}
        <p className="text-[11px] text-muted mt-2">
          A student who started more than one track is counted once per track here, so these do not
          add up to Started above.
        </p>
      </div>
    </div>
  )
}
