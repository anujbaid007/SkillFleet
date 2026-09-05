import { Clock, GraduationCap, Rocket, School, UserCheck, Users } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import type { CoordinatorSummary } from '@/lib/admin/coordinators'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

/** One decimal, but never a trailing '.0' — 95 reads better than 95.0. */
function pct(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

/**
 * The headline strip for the Coordinators section.
 *
 * WHAT THE HEADLINE IS, and why it is allowed a percentage. Reach — every
 * student registered at a school with an approved coordinator — is the founder's
 * measure of what a coordinator brings, and the students who have entered are a
 * SUBSET of exactly those people, counted at the same schools. So the share
 * between them is a real share and is drawn as one.
 *
 * That is not true of the state-level submitted/eligible on the ISC pages, and
 * nothing here should be read across to it: those two counts are scoped
 * differently (students by their own profile, entries by their school), the
 * ratio was measured at 1.39, and it is deliberately shown there as two counts
 * with no bar. Same-looking numbers, different footing.
 *
 * REACH IS NOT ELIGIBILITY EITHER. `students_covered` counts every student on
 * the school's register; the ISC pages' `eligible` counts Classes 5 to 12. The
 * cards say which they mean.
 */
export function CoordinatorFunnelPanel({
  summary,
  scoped = false,
}: {
  summary: CoordinatorSummary
  /** True on a state page, where `coordinators` counts only claim-holders. */
  scoped?: boolean
}) {
  const coverage =
    summary.schools_total > 0
      ? Math.round((summary.schools_approved / summary.schools_total) * 100)
      : 0

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <StatCard
          label="Students reached"
          value={n(summary.students_covered)}
          icon={Users}
          tone="primary"
          sub="Every student on the register of a school with an approved coordinator — the whole school, not only Classes 5 to 12"
        />
      </div>

      <div className="lg:col-span-4">
        <StatCard
          label="Of those, entered"
          value={n(summary.students_entered)}
          icon={Rocket}
          tone="positive"
          progress={summary.entered_pct}
          sub={`${pct(summary.entered_pct)} of the ${n(summary.students_covered)} students reached are on at least one entry`}
        />
      </div>

      <div className="lg:col-span-4">
        <StatCard
          label="Schools covered"
          value={n(summary.schools_approved)}
          icon={School}
          tone="teal"
          progress={coverage}
          sub={`of ${n(summary.schools_total)} ${summary.schools_total === 1 ? 'school' : 'schools'} here · ${n(summary.schools_claimed)} claimed in all, approved or not`}
        />
      </div>

      <div className="lg:col-span-3">
        <StatCard
          label="Coordinators"
          value={n(summary.coordinators)}
          icon={UserCheck}
          tone="neutral"
          sub={
            scoped
              ? 'Teachers holding a claim on a school here'
              : 'Teachers signed up, whether or not they have claimed a school'
          }
        />
      </div>

      <div className="lg:col-span-3">
        <StatCard
          label="Approved"
          value={n(summary.approved)}
          icon={GraduationCap}
          tone="positive"
          sub={`${n(summary.rejected)} turned down · counted by each person's strongest claim`}
        />
      </div>

      <div className="lg:col-span-3">
        <StatCard
          label="Waiting on review"
          value={n(summary.pending)}
          icon={Clock}
          tone="warning"
          sub="Claims with a teacher attached and no decision yet"
        />
      </div>

      <div className="lg:col-span-3">
        <StatCard
          label="Median students each"
          value={n(summary.median_students_per_coordinator)}
          icon={Users}
          tone="neutral"
          sub={`Half of the ${n(summary.coordinators)} coordinators bring more than this, half less. Coordinators with no school count as nought.`}
        />
      </div>

      {/*
        Two of the four places section G's totals do not add up, said here
        rather than left for a reader to find. The other two belong under the
        breakdown tables and are written there.
      */}
      <div className="lg:col-span-12">
        <p className="text-xs leading-relaxed text-muted">
          {n(summary.students_uncovered)} more students sit at a school here with no approved
          coordinator. Both figures are reached through a school row, so a student whose school is
          missing or unrecognised is in neither and the two add up to less than every student in
          the country. Waiting on review also counts only a claim that has a teacher attached to
          it, so it can differ from the pending figure on the admin overview, which counts the
          status column alone.
        </p>
      </div>
    </div>
  )
}
