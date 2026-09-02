import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, AlertTriangle, Users, Phone } from 'lucide-react'
import { getMyCoordinatorSchool, getSchoolRoster } from '@/app/actions/coordinator'
import { CoordinatorRoster } from '@/components/coordinator/coordinator-roster'
import { PageHeader } from '@/components/ui/page-header'
import { createClient } from '@/lib/supabase/server'
import { getIscDeadlines } from '@/app/actions/isc'
import { CoordinatorStats } from '@/components/coordinator/coordinator-stats'
import { NeedsNudge } from '@/components/coordinator/needs-nudge'
import { loadCoordinatorSchoolData } from '@/lib/coordinator/school-data'
import { buildSchoolRoster } from '@/lib/isc/roster'
import { IscResources } from '@/components/coordinator/isc-resources'
import { ShareLinks } from '@/components/coordinator/share-links'
import { requestOrigin } from '@/lib/coordinator/origin'

/** Championship helpline, shown wherever a coordinator is stuck. */
const SUPPORT_PHONE = '+91 9601443663'

export default async function CoordinatorDashboardPage() {
  const application = await getMyCoordinatorSchool()

  // Signed up but never told us which school.
  if (!application) redirect('/onboarding/coordinator')

  const deadlines = await getIscDeadlines()
  const origin = await requestOrigin()

  /*
    Pending is not a dead end.

    An admin review takes as long as it takes, and that wait is exactly when a
    coordinator wants to read the rules, download the deck and start telling
    students to enter. None of that needs approval — the roster does, and that
    is the only thing held back until the claim clears.
  */
  if (application.status === 'pending') {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Coordinator"
          icon={Users}
          title={application.schoolName}
          subtitle="Your application is with us. Everything you need to brief your school is below — you can start inviting students right away."
        />

        <div className="clay-card flex items-start gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-yellow/15">
            <Clock className="h-5 w-5 text-accent-yellow" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground">
              We&apos;re confirming your application
            </p>
            <p className="mt-1 text-sm text-muted">
              Your student roster and entry tracking open as soon as an admin approves{' '}
              <span className="font-semibold text-foreground">{application.schoolName}</span>. This
              usually doesn&apos;t take long.
            </p>
          </div>
        </div>

        <ShareLinks
          schoolId={application.schoolId}
          schoolName={application.schoolName}
          origin={origin}
        />

        <IscResources deadlines={deadlines} />
      </div>
    )
  }

  /*
    Rejected is a stop, not a nudge. The resources and the share link are gone,
    because a school we could not confirm should not be recruiting students
    under our name. A phone number rather than a form: whatever went wrong is
    usually settled in one call.
  */
  if (application.status === 'rejected') {
    return (
      <div className="clay-card mx-auto mt-12 max-w-md space-y-3 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
        <p className="font-display font-bold text-foreground">
          We couldn&apos;t confirm your application for {application.schoolName}
        </p>
        {application.reviewNotes && <p className="text-sm text-muted">{application.reviewNotes}</p>}
        <p className="text-sm text-muted">
          Your console stays locked until this is sorted. Give us a call and we&apos;ll get it
          resolved.
        </p>
        <a
          href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
          className="clay-button inline-flex h-11 items-center justify-center gap-2 bg-cta px-6 text-sm font-semibold text-white"
        >
          <Phone className="h-4 w-4" />
          {SUPPORT_PHONE}
        </a>
        <p className="pt-1">
          <Link
            href="/onboarding/coordinator"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Or apply again with corrected details
          </Link>
        </p>
      </div>
    )
  }

  const students = await getSchoolRoster()

  // Straight through RLS: isc_entries_read and isc_members_read already grant
  // an approved coordinator their own school's entries and the members on
  // them, so none of this needs an RPC.
  const supabase = await createClient()
  const school = await loadCoordinatorSchoolData(supabase, application.schoolId, students)
  const roster = buildSchoolRoster(school.rosterStudents, school.entries, school.rosterMembers)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Users}
        title={application.schoolName}
        subtitle={`${students.length} student${students.length === 1 ? '' : 's'} from your school on SkillFleet.`}
      />
      <CoordinatorStats
        students={students}
        entries={school.entries.map((e) => ({ track: e.track, status: e.status }))}
        deadlines={deadlines}
        now={new Date()}
      />
      <NeedsNudge
        students={students}
        entries={school.entries}
        members={school.rosterMembers}
        submissionByEntry={school.submissionByEntry}
      />
      <ShareLinks
          schoolId={application.schoolId}
          schoolName={application.schoolName}
          origin={origin}
        />
      <CoordinatorRoster
        rows={roster}
        students={school.rosterStudents}
        entries={school.entries}
        members={school.rosterMembers}
        submissionByEntry={school.submissionByEntry}
      />
      <IscResources deadlines={deadlines} />
    </div>
  )
}
