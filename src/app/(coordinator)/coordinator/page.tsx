import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, AlertTriangle, Users } from 'lucide-react'
import { getMyCoordinatorSchool, getSchoolRoster } from '@/app/actions/coordinator'
import { SchoolRoster } from '@/components/coordinator/school-roster'
import { PageHeader } from '@/components/ui/page-header'

export default async function CoordinatorDashboardPage() {
  const application = await getMyCoordinatorSchool()

  // Signed up but never told us which school.
  if (!application) redirect('/onboarding/coordinator')

  if (application.status === 'pending') {
    return (
      <div className="clay-card p-8 text-center space-y-3 max-w-md mx-auto mt-12">
        <div className="w-14 h-14 rounded-2xl bg-accent-yellow/15 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7 text-accent-yellow" />
        </div>
        <p className="font-display font-bold text-foreground">Your application is under review</p>
        <p className="text-muted text-sm">
          We&apos;re confirming your coordinator application for{' '}
          <span className="font-semibold text-foreground">{application.schoolName}</span>. This
          usually doesn&apos;t take long.
        </p>
      </div>
    )
  }

  if (application.status === 'rejected') {
    return (
      <div className="clay-card p-8 text-center space-y-3 max-w-md mx-auto mt-12">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <p className="font-display font-bold text-foreground">
          We couldn&apos;t confirm your application for {application.schoolName}
        </p>
        {application.reviewNotes && <p className="text-muted text-sm">{application.reviewNotes}</p>}
        <Link
          href="/onboarding/coordinator"
          className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
        >
          Apply again
        </Link>
      </div>
    )
  }

  const students = await getSchoolRoster()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator"
        icon={Users}
        title={application.schoolName}
        subtitle={`${students.length} student${students.length === 1 ? '' : 's'} from your school on SkillFleet.`}
      />
      <SchoolRoster students={students} />
    </div>
  )
}
