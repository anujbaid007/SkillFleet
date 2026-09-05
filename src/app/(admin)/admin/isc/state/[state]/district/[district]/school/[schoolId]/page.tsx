import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { getIscRoster, getIscSummary, getIscTimeline } from '@/lib/admin/isc'
import { parseRosterFilters, type IscScope, type SearchParams } from '@/lib/admin/scope'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscExport } from '@/components/admin/isc-export'
import { IscRosterTable } from '@/components/admin/isc-roster-table'

/**
 * The bottom of the drill-down.
 *
 * No comparison chart and no cold-schools list here: there is nowhere further
 * to drill, and a list of schools yet to start that contains one school says
 * nothing. The entries table stays, filters and all — at one school it is the
 * cheapest query on any of these pages.
 *
 * The school's own name comes straight from the schools table rather than from
 * any of the admin functions, so the heading and the way back up the
 * breadcrumb are there even before the migration has been run.
 */
export default async function AdminIscSchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; district: string; schoolId: string }>
  searchParams: Promise<SearchParams>
}) {
  const { state: stateParam, district: districtParam, schoolId } = await params
  const state = decodeURIComponent(stateParam)
  const district = decodeURIComponent(districtParam)
  const sp = await searchParams
  const filters = parseRosterFilters(sp)
  const scope: IscScope = { schoolId }
  const basePath = `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(
    district
  )}/school/${schoolId}`
  const supabase = await createClient()

  const [school, summary, timeline, roster] = await Promise.all([
    supabase.from('schools').select('name').eq('id', schoolId).maybeSingle(),
    getIscSummary(supabase, scope),
    getIscTimeline(supabase, scope),
    getIscRoster(supabase, scope, filters),
  ])

  // A missing row or an id that is not a uuid both land here, and both mean
  // the address is wrong rather than the data.
  if (!school.data) notFound()

  const header = (
    <>
      <IscBreadcrumb
        segments={[
          { label: 'All India', href: '/admin/isc' },
          { label: state, href: `/admin/isc/state/${encodeURIComponent(state)}` },
          {
            label: district,
            href: `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(district)}`,
          },
        ]}
        current={school.data.name}
      />
      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title={school.data.name}
        subtitle={`${district}, ${state}. Read-only.`}
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

  return (
    <div className="space-y-8">
      {header}

      <Reveal delay={0.03}>
        {summary.ok ? (
          <IscFunnelPanel summary={summary.data} showSchools={false} />
        ) : (
          <SectionFailed title="The headline numbers" message={summary.message} />
        )}
      </Reveal>

      <div className="flex justify-end">
        <IscExport scope={scope} filters={filters} />
      </div>

      {summary.ok && timeline.ok && (
        <Reveal delay={0.04}>
          <IscInsights summary={summary.data} timeline={timeline.data} />
        </Reveal>
      )}
      {summary.ok && !timeline.ok && (
        <SectionFailed title="The day-by-day chart" message={timeline.message} />
      )}

      <Reveal delay={0.05}>
        {roster.ok ? (
          <IscRosterTable page={roster.data} filters={filters} scope={scope} basePath={basePath} />
        ) : (
          <SectionFailed title="Entries" message={roster.message} />
        )}
      </Reveal>
    </div>
  )
}
