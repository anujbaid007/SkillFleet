import { redirect } from 'next/navigation'
import { BarChart3, Clock } from 'lucide-react'
import { getMyCoordinatorSchool, getSchoolRoster } from '@/app/actions/coordinator'
import { PageHeader } from '@/components/ui/page-header'
import { Panel, PanelEmpty } from '@/components/dashboard/panel'
import { ProgressRow } from '@/components/dashboard/charts'
import { StatCard } from '@/components/dashboard/stat-card'
import { createClient } from '@/lib/supabase/server'
import { loadCoordinatorSchoolData } from '@/lib/coordinator/school-data'
import { computeFunnel } from '@/lib/isc/funnel'
import { classParticipation, groupParticipation } from '@/lib/coordinator/analytics'
import { staleDrafts } from '@/lib/isc/analytics'
import { ISC_TRACKS } from '@/lib/isc/tracks'

/**
 * The school's numbers, one level deeper than the dashboard.
 *
 * The dashboard answers "who should I chase today". This answers "how is my
 * school doing" — where students fall out between being eligible, starting and
 * actually submitting, and which classes are carrying it.
 */
export default async function CoordinatorAnalyticsPage() {
  const application = await getMyCoordinatorSchool()
  if (!application) redirect('/onboarding/coordinator')

  // Everything below reads the roster, which only an approved claim grants.
  if (application.status !== 'approved') redirect('/coordinator')

  const students = await getSchoolRoster()
  const supabase = await createClient()
  const school = await loadCoordinatorSchoolData(supabase, application.schoolId, students)

  const funnel = computeFunnel(
    students.map((s) => ({ id: s.studentId, schoolId: application.schoolId })),
    school.entries,
    school.rosterMembers
  )
  const classes = classParticipation(students)
  const groups = groupParticipation(students)
  const stale = staleDrafts(school.entries, new Date())

  const trackName = (id: string) => ISC_TRACKS.find((t) => t.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={BarChart3}
        title="Analytics"
        subtitle={`How ${application.schoolName} is progressing through ISC 2026.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Eligible students" value={funnel.eligible} icon={BarChart3} />
        <StatCard
          label="Started at least one"
          value={funnel.started}
          sub={`${funnel.activationRate}% of eligible`}
          icon={BarChart3}
        />
        <StatCard
          label="Submitted"
          value={funnel.submitted}
          sub={`${funnel.completionRate}% of those who started`}
          icon={BarChart3}
        />
      </div>

      <Panel
        title="Where students fall out"
        subtitle="Counted in students, not entries — a student entering two tracks is one student here."
      >
        <div className="space-y-3">
          <ProgressRow label="Eligible" value={funnel.eligible} of={funnel.eligible} />
          <ProgressRow label="Started" value={funnel.started} of={funnel.eligible} />
          <ProgressRow label="Submitted" value={funnel.submitted} of={funnel.eligible} />
        </div>
      </Panel>

      <Panel title="By championship" subtitle="Students who have started each track.">
        {funnel.byTrack.length === 0 ? (
          <PanelEmpty>Nobody has started a championship yet.</PanelEmpty>
        ) : (
          <div className="space-y-3">
            {funnel.byTrack.map((row) => (
              <ProgressRow
                key={row.label}
                label={trackName(row.label)}
                value={row.count}
                of={funnel.eligible}
              />
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="By class" subtitle="Which classes are entering.">
          {classes.length === 0 ? (
            <PanelEmpty>No eligible students on the roster yet.</PanelEmpty>
          ) : (
            <div className="space-y-3">
              {classes.map((c) => (
                <ProgressRow
                  key={c.schoolClass}
                  label={c.schoolClass}
                  value={c.entered}
                  of={c.students}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="By group" subtitle="Classes 5–8 and 9–12.">
          {groups.length === 0 ? (
            <PanelEmpty>No eligible students on the roster yet.</PanelEmpty>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <ProgressRow key={g.group} label={g.label} value={g.entered} of={g.students} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Drafts going cold"
        subtitle="Started but untouched for a week — the students most worth a nudge."
      >
        {stale.length === 0 ? (
          <PanelEmpty>No stale drafts. Everyone who started is still working.</PanelEmpty>
        ) : (
          <ul className="space-y-2">
            {stale.map((entry) => (
              <li
                key={entry.entryId}
                className="flex items-center gap-3 rounded-xl bg-accent-yellow/[0.08] px-3 py-2"
              >
                <Clock className="h-4 w-4 shrink-0 text-accent-yellow" />
                <span className="text-sm text-foreground">{trackName(entry.track)}</span>
                <span className="ml-auto text-xs text-muted">draft</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
