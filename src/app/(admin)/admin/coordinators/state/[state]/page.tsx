import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Reveal } from '@/components/ui/reveal'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { CoordinatorHeader } from '@/components/admin/coordinator-header'
import { CoordinatorFunnelPanel } from '@/components/admin/coordinator-funnel-panel'
import { CoordinatorTrendChart } from '@/components/admin/coordinator-trend-chart'
import { CoordinatorBreakdownTable } from '@/components/admin/coordinator-breakdown-table'
import {
  getCoordinatorBreakdown,
  getCoordinatorSummary,
  getCoordinatorTrend,
} from '@/lib/admin/coordinators'
import type { IscScope } from '@/lib/admin/scope'

/**
 * One state: the same overview, scoped, plus its districts.
 *
 * TWO THINGS READ DIFFERENTLY HERE and both are labelled where they appear.
 * `coordinators` counts only the people holding a claim in this state — a
 * coordinator has no geography until they claim, so the national page's
 * claim-less teachers are absent rather than zero. And the trend's first two
 * bars are identical for the same reason.
 *
 * The districts do not drill any further: a school has one coordinator, so the
 * level below a district is the directory filtered, which is the link under
 * the table.
 */
export default async function AdminCoordinatorsStatePage({
  params,
}: {
  params: Promise<{ state: string }>
}) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const scope: Pick<IscScope, 'state' | 'district'> = { state }
  const supabase = await createClient()

  const [summary, breakdown, trend] = await Promise.all([
    getCoordinatorSummary(supabase, scope),
    getCoordinatorBreakdown(supabase, scope),
    getCoordinatorTrend(supabase, scope),
  ])

  const header = (
    <CoordinatorHeader
      active="overview"
      title={state}
      subtitle="Coordinators holding a claim in this state, and the districts they cover."
      breadcrumb={
        <IscBreadcrumb
          segments={[{ label: 'All India', href: '/admin/coordinators' }]}
          current={state}
        />
      }
      action={
        <Link
          href={`/admin/coordinators/directory?state=${encodeURIComponent(state)}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-black/[0.06] bg-white px-4 text-sm font-semibold text-foreground hover:border-primary"
        >
          Everyone in {state}
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    />
  )

  if (!summary.ok && summary.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        <MigrationMissing message={summary.message} />
      </div>
    )
  }

  const empty = summary.ok && summary.data.schools_total === 0

  return (
    <div className="space-y-8">
      {header}

      {empty && (
        <p className="text-sm text-muted">
          No school is recorded in this state. If you expected numbers here, check the spelling in
          the address.
        </p>
      )}

      <Reveal delay={0.03}>
        {summary.ok ? (
          <CoordinatorFunnelPanel summary={summary.data} scoped />
        ) : (
          <SectionFailed title="The headline numbers" message={summary.message} />
        )}
      </Reveal>

      <Reveal delay={0.04}>
        {trend.ok ? (
          <CoordinatorTrendChart
            points={trend.data}
            approvedTotal={summary.ok ? summary.data.approved : 0}
            scoped
          />
        ) : (
          <SectionFailed title="The signup chart" message={trend.message} />
        )}
      </Reveal>

      <Reveal delay={0.05}>
        {breakdown.ok ? (
          <CoordinatorBreakdownTable rows={breakdown.data} level="district" />
        ) : (
          <SectionFailed title="Districts" message={breakdown.message} />
        )}
      </Reveal>
    </div>
  )
}
