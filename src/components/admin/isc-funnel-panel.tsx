import { GraduationCap, Rocket, School, Trophy } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { trackName } from '@/lib/isc/tracks'
import type { IscSummary } from '@/lib/admin/isc'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

/**
 * The headline strip: who could enter, how far they got, and how many schools
 * are behind those numbers. Every figure here is one the database worked out.
 *
 * WHY THERE IS NO "PERCENTAGE OF ELIGIBLE" ANYWHERE ON THIS PANEL. Eligible
 * counts students by the state on their own profile; started and submitted
 * count students by the state of the school their entry belongs to. A student
 * outside Classes 5-12 can still be on a team-mate's entry, and a student can
 * sit in a different state from their school. So submitted divided by eligible
 * is not a share of anything -- it was measured at 1.39 on the seeded data,
 * and a progress bar at 139% is a bar that has stopped meaning what a bar
 * means. The two counts are shown as counts, with their units spelled out.
 *
 * Submitted over started IS a genuine share: both come from the same set of
 * people in the same scope, and everyone who submitted also started. That one
 * keeps its bar.
 */
export function IscFunnelPanel({
  summary,
  showSchools = true,
}: {
  summary: IscSummary
  /** Off on a school page, where the only honest answer would be nought or one. */
  showSchools?: boolean
}) {
  const completion =
    summary.started > 0 ? Math.round((summary.submitted / summary.started) * 100) : 0
  const span = showSchools ? 'lg:col-span-3' : 'lg:col-span-4'

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className={span}>
        <StatCard
          label="Eligible"
          value={n(summary.eligible)}
          icon={GraduationCap}
          tone="neutral"
          sub="Students in Classes 5–12 with an account here"
        />
      </div>

      <div className={span}>
        <StatCard
          label="Started"
          value={n(summary.started)}
          icon={Rocket}
          tone="primary"
          sub="Students on a team here, as leader or accepted team-mate"
        />
      </div>

      <div className={span}>
        <StatCard
          label="Submitted"
          value={n(summary.submitted)}
          icon={Trophy}
          tone="positive"
          progress={completion}
          sub={`${n(summary.submitted)} of the ${n(summary.started)} students who started`}
        />
      </div>

      {showSchools && (
        <div className="lg:col-span-3">
          <StatCard
            label="Schools"
            value={n(summary.schools_with_entries)}
            icon={School}
            tone="teal"
            sub={`${summary.schools_with_entries === 1 ? 'School' : 'Schools'} here with at least one entry`}
          />
        </div>
      )}

      <div className="lg:col-span-12">
        <p className="text-xs leading-relaxed text-muted">
          Eligible and started are counted two different ways: {n(summary.eligible)} eligible
          students are counted by the state on their own profile, and {n(summary.started)} students
          started are counted by the state of the school their entry belongs to. Some students who
          started are outside Classes 5 to 12, and some sit in a different state from their school,
          so one is not a share of the other.
        </p>
      </div>

      <div className="lg:col-span-12">
        <Panel
          title="Students who started, by championship"
          subtitle="Counted in students, not entries. A student who started two championships is counted in both, so these add up to more than Started above."
        >
          {/*
            A compact figure per championship rather than full-width bars: at
            these counts a bar spanning the whole panel implies a precision the
            numbers do not have, and the figures side by side compare just as
            well in a fraction of the space.
          */}
          {summary.by_track.length === 0 ? (
            <PanelEmpty>Nobody has started a championship here yet.</PanelEmpty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {summary.by_track.map((t) => (
                <div
                  key={t.key}
                  className="rounded-xl border border-black/[0.04] bg-slate-50 px-4 py-3.5"
                >
                  <p className="font-display text-2xl font-bold leading-none text-primary">
                    {n(t.count)}
                  </p>
                  <p className="mt-2 text-xs leading-snug text-muted">
                    {trackName(t.key)} · students
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
