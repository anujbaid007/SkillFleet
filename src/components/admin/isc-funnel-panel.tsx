import { GraduationCap, Rocket, School, Trophy } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { Panel } from '@/components/dashboard/panel'
import type { FunnelResult } from '@/lib/isc/funnel'

/**
 * The headline strip: who could enter, how far they got, and how many schools
 * are behind those numbers.
 *
 * Started and submitted are one card rather than two — they are a single story
 * read left to right, and separate cards invited each to be compared against
 * eligible on its own when the useful comparison is between them.
 */
export function IscFunnelPanel({
  funnel,
  schoolCount,
}: {
  funnel: FunnelResult
  /** Omitted on a school page, where the only honest answer would be 1. */
  schoolCount?: number
}) {
  const trackRows = funnel.byTrack.map((t) => ({
    key: t.label,
    label: t.label,
    value: t.count,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className={schoolCount === undefined ? 'lg:col-span-4' : 'lg:col-span-3'}>
        <StatCard
          label="Eligible"
          value={funnel.eligible}
          icon={GraduationCap}
          tone="neutral"
          sub="Students in Classes 5–12 with an account"
        />
      </div>

      <div className={schoolCount === undefined ? 'lg:col-span-4' : 'lg:col-span-3'}>
        <StatCard
          label="Started"
          value={funnel.started}
          icon={Rocket}
          tone="primary"
          progress={funnel.activationRate}
          sub={`${funnel.activationRate}% of everyone eligible`}
        />
      </div>

      <div className={schoolCount === undefined ? 'lg:col-span-4' : 'lg:col-span-3'}>
        <StatCard
          label="Submitted"
          value={funnel.submitted}
          icon={Trophy}
          tone="positive"
          progress={funnel.completionRate}
          sub={`${funnel.completionRate}% of those who started`}
        />
      </div>

      {schoolCount !== undefined && (
        <div className="lg:col-span-3">
          <StatCard
            label="Schools"
            value={schoolCount}
            icon={School}
            tone="teal"
            sub={`${schoolCount === 1 ? 'School' : 'Schools'} with students registered here`}
          />
        </div>
      )}

      <div className="lg:col-span-12">
        <Panel
          title="Students started, by track"
          subtitle="A student who started more than one track is counted once per track, so these do not add up to Started above."
        >
          {/*
            A compact figure per track rather than full-width bars: at these
            counts a bar spanning the whole panel implies a precision the
            numbers do not have, and three figures side by side compare just
            as well in a fraction of the space.
          */}
          <div className="grid gap-3 sm:grid-cols-3">
            {trackRows.map((t) => (
              <div
                key={t.key}
                className="rounded-xl bg-slate-50 border border-black/[0.04] px-4 py-3.5"
              >
                <p className="font-display text-2xl font-bold text-primary leading-none">
                  {t.value}
                </p>
                <p className="text-xs text-muted mt-2 leading-snug">{t.label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
