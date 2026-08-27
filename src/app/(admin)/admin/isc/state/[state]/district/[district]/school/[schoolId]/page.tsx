import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { computeFunnel } from '@/lib/isc/funnel'
import { buildSchoolRoster } from '@/lib/isc/roster'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscRoster } from '@/components/admin/isc-roster'

/**
 * The bottom of the drill-down.
 *
 * No filter bar, no comparison chart and no outreach panel here: there is
 * nowhere further to drill, a cold-schools list of one school says nothing,
 * and the roster already shows every student's state at a glance — filtering
 * it would only hide the rows an admin came here to see.
 */
export default async function AdminIscSchoolPage({
  params,
}: {
  params: Promise<{ state: string; district: string; schoolId: string }>
}) {
  const { state: stateParam, district: districtParam, schoolId } = await params
  const state = decodeURIComponent(stateParam)
  const district = decodeURIComponent(districtParam)
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, { state, district, schoolId })

  const school = data.schools.find((s) => s.schoolId === schoolId)
  if (!school) notFound()

  const funnel = computeFunnel(data.eligible, data.entries, data.funnelMembers)
  const roster = buildSchoolRoster(data.rosterStudents, data.entries, data.rosterMembers)

  return (
    <div className="space-y-6">
      <IscBreadcrumb
        segments={[
          { label: 'All India', href: '/admin/isc' },
          { label: state, href: `/admin/isc/state/${encodeURIComponent(state)}` },
          {
            label: district,
            href: `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(district)}`,
          },
        ]}
        current={school.schoolName}
      />

      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title={school.schoolName}
        subtitle={`${district}, ${state} · ${data.eligible.length} eligible ${
          data.eligible.length === 1 ? 'student' : 'students'
        }`}
      />

      <Reveal delay={0.03}>
        <IscFunnelPanel funnel={funnel} />
      </Reveal>

      <Reveal delay={0.04}>
        <IscRoster
          rows={roster}
          students={data.rosterStudents}
          entries={data.entries}
          members={data.rosterMembers}
          submissionByEntry={data.submissionByEntry}
        />
      </Reveal>
    </div>
  )
}
