import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { getIscRoster, getIscSummary, getIscTimeline } from '@/lib/admin/isc'
import { parseRosterFilters, type IscScope, type SearchParams } from '@/lib/admin/scope'
// The "coordinator" in the name is about which RLS path the student list
// arrives through, not about who is looking: the loader's own comment says it
// returns the shapes the admin drill-down uses, and buildSchoolRoster works on
// its output unchanged. A coordinator cannot read user_profiles and so passes
// the roster in from an RPC; an admin can, and passes it in from the table.
import { loadCoordinatorSchoolData } from '@/lib/coordinator/school-data'
import { buildSchoolRoster } from '@/lib/isc/roster'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscExport } from '@/components/admin/isc-export'
import { IscRosterTable } from '@/components/admin/isc-roster-table'
import { SchoolRoster } from '@/components/isc/school-roster'

/**
 * How many student profiles this page will read before it stops.
 *
 * One school's eligible students is a bounded set — a few thousand at the very
 * outside — which is why this page can still count in JavaScript where the
 * national ones cannot. The ceiling is here so that a school with an
 * implausible roster is a visible limit rather than a silent one.
 */
const STUDENT_CEILING = 5_000

/**
 * The bottom of the drill-down.
 *
 * TWO LISTS, and they answer different questions. The entries table lists what
 * has been sent in. The student roster lists everyone eligible at this school
 * whether or not they have started — which is the only place in the admin area
 * that answers "who do I telephone", and the whole reason the cold-schools
 * list links here. A school on that list has zero entries by definition, so an
 * entries table alone would show it as empty and leave nothing to act on.
 *
 * The student roster reads plain tables, not the admin functions, so it
 * renders even before the migration has been run — as does the school's name
 * and the way back up the breadcrumb.
 *
 * No comparison chart and no cold-schools list: there is nowhere further to
 * drill, and a list of schools yet to start containing one school says nothing.
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

  const [school, profiles, summary, timeline, entries] = await Promise.all([
    supabase.from('schools').select('name').eq('id', schoolId).maybeSingle(),
    supabase
      .from('user_profiles')
      .select('id, full_name, school_class')
      .eq('role', 'student')
      .eq('school_id', schoolId)
      .range(0, STUDENT_CEILING - 1),
    getIscSummary(supabase, scope),
    getIscTimeline(supabase, scope),
    getIscRoster(supabase, scope, filters),
  ])

  // A missing row or an id that is not a uuid both land here, and both mean
  // the address is wrong rather than the data.
  if (!school.data) notFound()

  const enrolled = (profiles.data ?? []).map((p) => ({
    studentId: p.id,
    fullName: p.full_name,
    schoolClass: p.school_class,
  }))
  // loadCoordinatorSchoolData drops anyone outside Classes 5-12 itself, so
  // rosterStudents is already the eligible set.
  const schoolData = await loadCoordinatorSchoolData(supabase, schoolId, enrolled)
  const studentRows = buildSchoolRoster(
    schoolData.rosterStudents,
    schoolData.entries,
    schoolData.rosterMembers
  )

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

  const students = (
    <Reveal delay={0.04}>
      <SchoolRoster
        rows={studentRows}
        students={schoolData.rosterStudents}
        entries={schoolData.entries}
        members={schoolData.rosterMembers}
        submissionByEntry={schoolData.submissionByEntry}
        title="Students"
        subtitle="Everyone eligible at this school, including the ones who have not started — open a student to see their team and what they sent"
        emptyLabel="No eligible student from this school has joined SkillFleet yet."
      />
      {enrolled.length === STUDENT_CEILING && (
        <p className="mt-2 text-xs text-muted">
          Showing the first {STUDENT_CEILING.toLocaleString('en-IN')} students on this school&rsquo;s
          register. If a school really has more, this list needs to be paged.
        </p>
      )}
    </Reveal>
  )

  // The student roster does not come from the admin functions, so it is still
  // worth showing while the migration is pending — it is the list an outreach
  // call is made from.
  if (!summary.ok && summary.kind === 'migration-missing') {
    return (
      <div className="space-y-8">
        {header}
        <MigrationMissing message={summary.message} />
        {students}
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

      {students}

      {summary.ok && timeline.ok && (
        <Reveal delay={0.05}>
          <IscInsights summary={summary.data} timeline={timeline.data} />
        </Reveal>
      )}
      {summary.ok && !timeline.ok && (
        <SectionFailed title="The day-by-day chart" message={timeline.message} />
      )}

      <div className="flex justify-end">
        <IscExport scope={scope} filters={filters} />
      </div>

      <Reveal delay={0.06}>
        {entries.ok ? (
          <IscRosterTable page={entries.data} filters={filters} scope={scope} basePath={basePath} />
        ) : (
          <SectionFailed title="Entries" message={entries.message} />
        )}
      </Reveal>
    </div>
  )
}
