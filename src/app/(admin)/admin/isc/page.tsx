import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { LANGUAGE_OPTIONS } from '@/lib/isc/tracks'
import { byState } from '@/lib/isc/analytics'
import { computeFunnel } from '@/lib/isc/funnel'
import { coldSchools, coordinatorCoverage } from '@/lib/isc/outreach'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { applyIscFilters, type IscFilterParams } from '@/lib/isc/admin-filters'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscOutreach } from '@/components/admin/isc-outreach'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscFilters } from '@/components/admin/isc-filters'
import { IscExport } from '@/components/admin/isc-export'

/**
 * The country holds far more schools than anyone will read in one list, so the
 * outreach panel shows the biggest opportunities and says it has done so.
 */
const COLD_SCHOOLS_LIMIT = 50

export default async function AdminIscPage({
  searchParams,
}: {
  searchParams: Promise<IscFilterParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, {})

  const { entries, funnelMembers } = applyIscFilters(
    data.entries,
    data.funnelMembers,
    data.submissionByEntry,
    params
  )

  const funnel = computeFunnel(data.eligible, entries, funnelMembers)
  const states = byState(entries)
  const cold = coldSchools(data.schools, entries, data.eligibleBySchool, COLD_SCHOOLS_LIMIT)
  const coverage = coordinatorCoverage(data.schools)

  // The export carries the leader's name, which the loader has already
  // resolved for the roster — no second lookup for one column.
  const leaderNameByEntry = new Map(
    data.rosterMembers.filter((m) => m.isLeader).map((m) => [m.entryId, m.displayName])
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title="All India"
        subtitle="Drill into a state, then a district, then a school. Read-only."
      />

      <Reveal delay={0.03}>
        <IscFunnelPanel funnel={funnel} schoolCount={data.schools.length} />
      </Reveal>

      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <IscFilters
            languages={LANGUAGE_OPTIONS}
            showing={entries.length}
            total={data.entries.length}
          />
        </div>
        <IscExport
          rows={entries.map((e) => ({
            schoolName: e.schoolName,
            schoolState: e.state,
            schoolDistrict: e.district,
            leaderName: leaderNameByEntry.get(e.entryId) ?? 'Unknown student',
            track: e.track,
            teamSize: e.studentIds.length,
            status: e.status,
            language: (data.submissionByEntry.get(e.entryId)?.language as string) ?? null,
            submittedAt: e.submittedAt,
            updatedAt: e.updatedAt,
          }))}
          filename={`isc-2026-all-india-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>

      <Reveal delay={0.04}>
        <IscComparisonChart
          title="States"
          sub="Ranked by submitted entries — open one to see its districts"
          empty="No entries anywhere yet."
          rows={states.map((s) => ({
            label: s.state,
            count: s.submitted,
            sub: `${s.schools} ${s.schools === 1 ? 'school' : 'schools'}`,
            href: `/admin/isc/state/${encodeURIComponent(s.state)}`,
          }))}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <IscInsights entries={entries} classByStudent={data.classByStudent} now={new Date()} />
      </Reveal>

      <Reveal delay={0.06}>
        <IscOutreach
          coldSchools={cold}
          coordinatorCoverage={coverage}
          coldSchoolsCapped={cold.length === COLD_SCHOOLS_LIMIT}
          filenamePrefix="isc-2026-all-india"
        />
      </Reveal>
    </div>
  )
}
