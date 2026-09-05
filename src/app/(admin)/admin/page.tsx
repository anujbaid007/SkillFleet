import { Suspense } from 'react'
import Link from 'next/link'
import {
  Clock,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Rocket,
  School,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { StatCard } from '@/components/dashboard/stat-card'
import { DashboardSection } from '@/components/dashboard/panel'
import { MigrationMissing } from '@/components/admin/migration-missing'
import { SectionFailed } from '@/components/admin/section-failed'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscTimelineChart } from '@/components/admin/isc-timeline-chart'
import { DashboardStates } from '@/components/admin/dashboard-states'
import { getDashboard, getDeskCounts } from '@/lib/admin/dashboard'
import { getCoordinatorSummary } from '@/lib/admin/coordinators'
import { formatIstDay, istDay } from '@/lib/isc/dates'

function n(value: number): string {
  return value.toLocaleString('en-IN')
}

/** One decimal, but never a trailing '.0' — 95 reads better than 95.0. */
function pct(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

/**
 * The three jobs an admin opens this page to do, in the order they do them:
 * work the queues, look after the people, watch the championship.
 *
 * WHY THE CHAMPIONSHIP IS BEHIND ITS OWN SUSPENSE BOUNDARY. admin_dashboard()
 * runs admin_isc_summary() and admin_isc_breakdown() inside itself and was
 * measured at ~4.9 s at 200k students and 800k entries. The queues are eight
 * indexed count(*)s. Streamed separately, an admin sees the four numbers they
 * came for immediately and the championship fills in behind them; awaited
 * together, the landing page of the whole admin area would be blank for five
 * seconds — and blank altogether if that one function timed out.
 *
 * The same split is what keeps this page useful before
 * docs/admin-scale-migration.sql has been pasted: the queue and people tiles
 * read plain tables, so they show real numbers while the coordinator and
 * championship blocks show the setup panel.
 *
 * The global search box is NOT mounted here. It lives in the admin layout, so
 * it is on every admin screen already; a second copy on this one would be two
 * search boxes on the same page.
 */
export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Both cheap, both awaited here so the top of the page is one paint: eight
  // indexed counts, and one section G call the Coordinators section has
  // usually already put in the sixty-second cache.
  const [desk, coordinators] = await Promise.all([
    getDeskCounts(supabase),
    getCoordinatorSummary(supabase, {}),
  ])

  const today = formatIstDay(istDay(new Date()))

  /*
    The base the reach bar is a share of. NOT the student total: a student
    whose school_id is null, or points at no school row, is in neither half,
    so covered + uncovered is smaller than the number of students on the
    People row above. Saying "at a school on the register" is what makes the
    two rows readable together instead of looking like a contradiction.
  */
  const studentsOnRegister = coordinators.ok
    ? coordinators.data.students_covered + coordinators.data.students_uncovered
    : 0

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Command centre"
        icon={LayoutDashboard}
        title="Overview"
        subtitle={today}
      />

      <DashboardSection title="Waiting on you" subtitle="Open one to review it">
        <Reveal delay={0.03}>
          {desk.ok ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Schools"
                value={n(desk.data.pending_schools)}
                icon={School}
                tone={desk.data.pending_schools > 0 ? 'warning' : 'neutral'}
                sub="Schools students added because they could not find theirs"
                href="/admin/schools?status=pending"
              />
              <StatCard
                label="Coordinator claims"
                value={n(desk.data.pending_coordinators)}
                icon={UserCheck}
                tone={desk.data.pending_coordinators > 0 ? 'warning' : 'neutral'}
                sub="Schools whose coordinator claim has had no decision yet"
                href="/admin/coordinators/claims?status=pending"
              />
              <StatCard
                label="Certificates"
                value={n(desk.data.pending_certificates)}
                icon={FileCheck}
                tone={desk.data.pending_certificates > 0 ? 'warning' : 'neutral'}
                sub="Student uploads awaiting points"
                href="/admin/certificates?status=pending"
              />
              <StatCard
                label="Live support"
                value={n(desk.data.active_support)}
                icon={MessageCircle}
                tone={desk.data.active_support > 0 ? 'primary' : 'neutral'}
                sub="Coordinator threads with a message in the last seven days"
                href="/admin/coordinators/support"
              />
            </div>
          ) : (
            <SectionFailed title="The queues" message={desk.message} />
          )}
        </Reveal>
      </DashboardSection>

      <DashboardSection title="People" subtitle="Everyone with an account">
        <Reveal delay={0.04}>
          {desk.ok ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Students"
                value={n(desk.data.students)}
                icon={Users}
                tone="primary"
                sub="Every student account, whatever class they are in"
                href="/admin/users?role=student"
              />
              <StatCard
                label="Onboarded"
                value={n(desk.data.students_onboarded)}
                icon={GraduationCap}
                tone="positive"
                progress={
                  desk.data.students > 0
                    ? (desk.data.students_onboarded / desk.data.students) * 100
                    : 0
                }
                sub={`of ${n(desk.data.students)} students — the ones who finished signing up`}
                href="/admin/users?role=student&onboarded=yes"
              />
              <StatCard
                label="Coordinators"
                value={n(desk.data.coordinators)}
                icon={UserCheck}
                tone="teal"
                sub="Teachers signed up, whether or not they have claimed a school"
                href="/admin/coordinators/directory"
              />
              <StatCard
                label="Approved schools"
                value={n(desk.data.schools_approved)}
                icon={School}
                tone="neutral"
                sub="Schools reviewed and let in"
                href="/admin/schools?status=approved"
              />
            </div>
          ) : (
            <SectionFailed title="The people numbers" message={desk.message} />
          )}
        </Reveal>
      </DashboardSection>

      <DashboardSection
        title="Coordinators"
        subtitle="The teachers who bring a school in, and what they reach"
      >
        <Reveal delay={0.05}>
          {coordinators.ok ? (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Registered"
                  value={n(coordinators.data.coordinators)}
                  icon={UserCheck}
                  tone="neutral"
                  sub={`${n(coordinators.data.approved)} approved · ${n(coordinators.data.rejected)} turned down`}
                  href="/admin/coordinators/directory"
                />
                <StatCard
                  label="Claims waiting"
                  value={n(coordinators.data.pending)}
                  icon={Clock}
                  tone={coordinators.data.pending > 0 ? 'warning' : 'neutral'}
                  sub="Claims with a teacher attached and no decision yet"
                  href="/admin/coordinators/claims?status=pending"
                />
                <StatCard
                  label="Schools covered"
                  value={n(coordinators.data.schools_approved)}
                  icon={School}
                  tone="teal"
                  progress={
                    coordinators.data.schools_total > 0
                      ? (coordinators.data.schools_approved / coordinators.data.schools_total) * 100
                      : 0
                  }
                  sub={`of ${n(coordinators.data.schools_total)} ${coordinators.data.schools_total === 1 ? 'school' : 'schools'} — a school with an approved coordinator`}
                  href="/admin/coordinators"
                />
                {/*
                  The bar is COVERAGE, the same quantity as the figure above
                  it: students at a covered school, out of the students at any
                  school on the register. A bar under a figure has to be that
                  figure's own share of its own base, or it is read as one
                  anyway. entered_pct is a true percentage too, but it is a
                  share of the reached rather than of the base, so it is stated
                  in words underneath instead of drawn.
                */}
                <StatCard
                  label="Students reached"
                  value={n(coordinators.data.students_covered)}
                  icon={Rocket}
                  tone="primary"
                  progress={
                    studentsOnRegister > 0
                      ? (coordinators.data.students_covered / studentsOnRegister) * 100
                      : 0
                  }
                  sub={`of ${n(studentsOnRegister)} students at a school on the register. ${pct(coordinators.data.entered_pct)} of the reached are on an entry.`}
                  href="/admin/coordinators"
                />
              </div>
              {/*
                Two figures on this page count pending coordinators and they do
                not have to agree, so the page says so rather than leaving the
                founder to spot it. Reach IS allowed its percentage: the
                students who entered are a subset of the students reached, at
                the same schools. The championship's submitted/eligible below
                is not, and never gets one.
              */}
              <p className="text-xs leading-relaxed text-muted">
                Claims waiting counts a claim that has a teacher attached to it. The coordinator
                claims tile at the top of this page counts the school&rsquo;s status column alone,
                so the two can differ.
              </p>
            </div>
          ) : coordinators.kind === 'migration-missing' ? (
            <MigrationMissing message={coordinators.message} />
          ) : (
            <SectionFailed title="The coordinator numbers" message={coordinators.message} />
          )}
        </Reveal>
      </DashboardSection>

      <DashboardSection title="The championship" subtitle="ISC 2026, all of India">
        {/*
          Its own boundary: everything above is already on screen while this
          one function runs, and a failure inside it stops here.
        */}
        <Suspense fallback={<ChampionshipPending />}>
          <Championship />
        </Suspense>
      </DashboardSection>
    </div>
  )
}

/** What the championship block looks like while its one function runs. */
function ChampionshipPending() {
  return (
    <div className="dash-panel flex items-center gap-3 p-5" aria-live="polite">
      <Trophy className="h-4 w-4 shrink-0 animate-pulse text-primary" aria-hidden="true" />
      <p className="text-sm text-muted">
        Counting the championship — every entry in the country goes into these numbers, so this one
        takes a moment.
      </p>
    </div>
  )
}

/**
 * The expensive half, on its own so the rest of the page does not wait for it.
 *
 * It creates its own client rather than taking one as a prop: a Suspense
 * boundary's child is rendered after the parent has already flushed, and
 * passing a live Supabase client across that boundary would tie the two
 * together again for no gain.
 */
async function Championship() {
  const supabase = await createClient()
  const result = await getDashboard(supabase)

  if (!result.ok) {
    return result.kind === 'migration-missing' ? (
      <MigrationMissing message={result.message} />
    ) : (
      <SectionFailed title="The championship" message={result.message} />
    )
  }

  const { isc, top_states, stalled_states, timeline } = result.data

  return (
    <div className="space-y-4">
      {/*
        The same funnel strip the ISC page opens with, so the two screens
        cannot report the championship differently. It carries its own note on
        why eligible and started are not a share of one another.
      */}
      <IscFunnelPanel summary={isc} />

      <DashboardStates top={top_states} stalled={stalled_states} />

      <IscTimelineChart
        points={timeline}
        title="The last seven days"
        subtitle="Counted in entries, by Indian Standard Time — how many entries were started that day, and how many were submitted"
      />

      <p className="text-xs text-muted">
        <Link href="/admin/isc" className="font-semibold text-primary hover:underline">
          Open ISC 2026
        </Link>{' '}
        for states, districts, schools and the full list of entries.
      </p>
    </div>
  )
}
