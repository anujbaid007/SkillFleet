import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import {
  getColdSchools,
  getIscBreakdown,
  getIscRoster,
  getIscSummary,
  getIscTimeline,
} from '@/lib/admin/isc'
import { MAX_PAGE, parseRosterFilters, type IscScope, type SearchParams } from '@/lib/admin/scope'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscExport } from '@/components/admin/isc-export'
import { IscRosterTable } from '@/components/admin/isc-roster-table'
import { IscColdSchools } from '@/components/admin/isc-cold-schools'

/**
 * One state: its districts, its entries, and the schools in it yet to start.
 *
 * Scoped to a state, admin_isc_roster is a few milliseconds rather than the
 * second and a half a national list costs, so this page lists entries straight
 * away — no filter needed first.
 */
export default async function AdminIscStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>
  searchParams: Promise<SearchParams>
}) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const sp = await searchParams
  const filters = parseRosterFilters(sp)
  const coldPage = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(String(sp.cold ?? '1'), 10) || 1))
  const scope: IscScope = { state }
  const basePath = `/admin/isc/state/${encodeURIComponent(state)}`
  const supabase = await createClient()

  const [summary, breakdown, timeline, roster, cold] = await Promise.all([
    getIscSummary(supabase, scope),
    getIscBreakdown(supabase, scope),
    getIscTimeline(supabase, scope),
    getIscRoster(supabase, scope, filters),
    getColdSchools(supabase, scope, coldPage),
  ])

  const header = (
    <>
      <IscBreadcrumb segments={[{ label: 'All India', href: '/admin/isc' }]} current={state} />
      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title={state}
        subtitle="Open a district, then a school. Read-only."
      />
    </>
  )

  if (!summary.ok && summary.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        <MigrationMissing message={summary.message} />
      </div>
    )
  }

  const empty =
    summary.ok &&
    summary.data.eligible === 0 &&
    summary.data.started === 0 &&
    breakdown.ok &&
    breakdown.data.length === 0

  return (
    <div className="space-y-8">
      {header}

      {empty && (
        <p className="text-sm text-muted">
          Nothing has been recorded for this state. If you expected numbers here, check the spelling
          in the address.
        </p>
      )}

      <Reveal delay={0.03}>
        {summary.ok ? (
          <IscFunnelPanel summary={summary.data} />
        ) : (
          <SectionFailed title="The headline numbers" message={summary.message} />
        )}
      </Reveal>

      <div className="flex justify-end">
        <IscExport scope={scope} filters={filters} />
      </div>

      <Reveal delay={0.04}>
        {breakdown.ok ? (
          <IscComparisonChart rows={breakdown.data} level="district" basePath={basePath} />
        ) : (
          <SectionFailed title="Districts" message={breakdown.message} />
        )}
      </Reveal>

      {summary.ok && timeline.ok && (
        <Reveal delay={0.05}>
          <IscInsights summary={summary.data} timeline={timeline.data} />
        </Reveal>
      )}
      {summary.ok && !timeline.ok && (
        <SectionFailed title="The day-by-day chart" message={timeline.message} />
      )}

      <Reveal delay={0.06}>
        {roster.ok ? (
          <IscRosterTable
            page={roster.data}
            filters={filters}
            scope={scope}
            basePath={basePath}
          />
        ) : (
          <SectionFailed title="Entries" message={roster.message} />
        )}
      </Reveal>

      <Reveal delay={0.07}>
        {cold.ok ? (
          <IscColdSchools page={cold.data} filters={filters} basePath={basePath} />
        ) : (
          <SectionFailed title="Schools yet to start" message={cold.message} />
        )}
      </Reveal>
    </div>
  )
}
