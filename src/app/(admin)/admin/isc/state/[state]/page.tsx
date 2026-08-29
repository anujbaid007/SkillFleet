import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { LANGUAGE_OPTIONS } from '@/lib/isc/tracks'
import { byDistrict } from '@/lib/isc/analytics'
import { computeFunnel } from '@/lib/isc/funnel'
import { coldSchools, coordinatorCoverage } from '@/lib/isc/outreach'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { applyIscFilters, type IscFilterParams } from '@/lib/isc/admin-filters'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscOutreach } from '@/components/admin/isc-outreach'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscFilters } from '@/components/admin/isc-filters'
import { IscExport } from '@/components/admin/isc-export'

const COLD_SCHOOLS_LIMIT = 50

export default async function AdminIscStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>
  searchParams: Promise<IscFilterParams>
}) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const search = await searchParams
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, { state })

  // No schools means no students here, which means the state segment is a
  // typo or a state nobody has signed up from — either way there is nothing
  // to show, and an empty dashboard would look like a data problem.
  if (data.schools.length === 0) notFound()

  const { entries, funnelMembers } = applyIscFilters(
    data.entries,
    data.funnelMembers,
    data.submissionByEntry,
    search
  )

  const funnel = computeFunnel(data.eligible, entries, funnelMembers)
  const districts = byDistrict(entries)
  const cold = coldSchools(data.schools, entries, data.eligibleBySchool, COLD_SCHOOLS_LIMIT)
  const coverage = coordinatorCoverage(data.coordinatorSchools)
  const slug = state.toLowerCase().replace(/\s+/g, '-')

  const leaderNameByEntry = new Map(
    data.rosterMembers.filter((m) => m.isLeader).map((m) => [m.entryId, m.displayName])
  )

  return (
    <div className="space-y-8">
      <IscBreadcrumb segments={[{ label: 'All India', href: '/admin/isc' }]} current={state} />

      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title={state}
        subtitle={`${data.schools.length} ${data.schools.length === 1 ? 'school' : 'schools'} with students on SkillFleet`}
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
          filename={`isc-2026-${slug}-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>

      <Reveal delay={0.04}>
        <IscComparisonChart
          title="Districts"
          sub="Ranked by submitted entries — open one to see its schools"
          empty="No entries in this state yet."
          rows={districts.map((d) => ({
            label: d.district,
            count: d.submitted,
            sub: `${d.schools} ${d.schools === 1 ? 'school' : 'schools'}`,
            href: `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(d.district)}`,
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
          filenamePrefix={`isc-2026-${slug}`}
        />
      </Reveal>
    </div>
  )
}
