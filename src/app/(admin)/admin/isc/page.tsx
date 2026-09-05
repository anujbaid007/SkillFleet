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
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscExport } from '@/components/admin/isc-export'
import { IscRosterTable } from '@/components/admin/isc-roster-table'
import { IscColdSchools } from '@/components/admin/isc-cold-schools'

const BASE_PATH = '/admin/isc'

/**
 * All of India.
 *
 * Every number on this page is worked out by Postgres and arrives already
 * counted. Nothing here loads a row per student, which is what the page used
 * to do — and what silently stopped being true past ten thousand profiles.
 *
 * The one thing this page will not do unasked is list entries. admin_isc_roster
 * works out its total with a count across every entry in the country: a second
 * and a half of database time for a list of eight hundred thousand that nobody
 * intends to page through. So the roster reads its filters, says so plainly,
 * and only queries once a filter or a search narrows it. Open a state and it
 * costs single-digit milliseconds instead.
 */
export default async function AdminIscPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const filters = parseRosterFilters(sp)
  const coldPage = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(String(sp.cold ?? '1'), 10) || 1))
  const scope: IscScope = {}
  const narrowed = Boolean(
    filters.track || filters.status || filters.division || filters.language || filters.q
  )
  const supabase = await createClient()

  const [summary, breakdown, timeline, cold, roster] = await Promise.all([
    getIscSummary(supabase, scope),
    getIscBreakdown(supabase, scope),
    getIscTimeline(supabase, scope),
    getColdSchools(supabase, scope, coldPage),
    narrowed ? getIscRoster(supabase, scope, filters) : Promise.resolve(null),
  ])

  const header = (
    <PageHeader
      eyebrow="ISC 2026"
      icon={Trophy}
      title="All India"
      subtitle="Drill into a state, then a district, then a school. Read-only."
    />
  )

  // The founder has not pasted the migration yet. That is a setup step, not a
  // fault, so the page keeps its heading and says what to do.
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
          No student has signed up anywhere yet, so there is nothing to count.
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
          <IscComparisonChart rows={breakdown.data} level="state" basePath={BASE_PATH} />
        ) : (
          <SectionFailed title="States" message={breakdown.message} />
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
        {roster === null || roster.ok ? (
          <IscRosterTable
            page={roster === null ? null : roster.data}
            filters={filters}
            scope={scope}
            basePath={BASE_PATH}
          />
        ) : (
          <SectionFailed title="Entries" message={roster.message} />
        )}
      </Reveal>

      <Reveal delay={0.07}>
        {cold.ok ? (
          <IscColdSchools page={cold.data} filters={filters} basePath={BASE_PATH} />
        ) : (
          <SectionFailed title="Schools yet to start" message={cold.message} />
        )}
      </Reveal>
    </div>
  )
}
