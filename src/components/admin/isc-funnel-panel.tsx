import { GraduationCap, School, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FunnelResult } from '@/lib/isc/funnel'

function Card({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: LucideIcon
  label: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="clay-card p-6 sm:p-7">
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  )
}

/** One number and its caption, sized so the figure carries the card. */
function Figure({ value, caption, tone }: { value: number; caption: string; tone: string }) {
  return (
    <div>
      <p className={`font-display text-4xl font-bold leading-none ${tone}`}>{value}</p>
      <p className="text-xs text-muted mt-2">{caption}</p>
    </div>
  )
}

/**
 * Three cards: who could enter, how far they got, and how many schools are
 * behind those numbers.
 *
 * Started and submitted share a card rather than sitting in two: they are one
 * story read left to right, and separating them invited the two figures to be
 * compared against eligible individually when the useful comparison is
 * between them.
 */
export function IscFunnelPanel({
  funnel,
  schoolCount,
}: {
  funnel: FunnelResult
  /** Omitted on a school page, where the only honest answer would be 1. */
  schoolCount?: number
}) {
  return (
    <div className="space-y-4">
      <div
        className={`grid gap-4 grid-cols-1 ${
          schoolCount === undefined ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
        }`}
      >
        <Card icon={GraduationCap} label="Eligible" accent="bg-primary/10 text-primary">
          <Figure
            value={funnel.eligible}
            caption="Students in Classes 5–12 with an account"
            tone="text-foreground"
          />
        </Card>

        <Card icon={Trophy} label="Participation" accent="bg-accent-teal/10 text-accent-teal">
          <div className="flex items-start gap-8">
            <Figure
              value={funnel.started}
              caption={`Started · ${funnel.activationRate}% of eligible`}
              tone="text-accent-teal"
            />
            <span className="w-px self-stretch bg-black/[0.07]" aria-hidden="true" />
            <Figure
              value={funnel.submitted}
              caption={`Submitted · ${funnel.completionRate}% of those started`}
              tone="text-green-700"
            />
          </div>
        </Card>

        {schoolCount !== undefined && (
          <Card icon={School} label="Schools" accent="bg-accent-pink/10 text-accent-pink">
            <Figure
              value={schoolCount}
              caption={`${schoolCount === 1 ? 'School' : 'Schools'} with students registered here`}
              tone="text-foreground"
            />
          </Card>
        )}
      </div>

      <div className="clay-card px-6 py-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">
          Students started, by track
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-4">
          {funnel.byTrack.map((t) => (
            <div key={t.label}>
              <p className="font-display text-xl font-bold text-foreground leading-none">
                {t.count}
              </p>
              <p className="text-xs text-muted mt-1.5">{t.label}</p>
            </div>
          ))}
        </div>
        {/* Said plainly, because the arithmetic looks broken otherwise: a
            student on two tracks is one student above and two counts here. */}
        <p className="text-[11px] text-muted mt-4 pt-3 border-t border-black/[0.05]">
          A student who started more than one track is counted once per track here, so these do not
          add up to Started above.
        </p>
      </div>
    </div>
  )
}
