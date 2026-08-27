import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSchoolStates } from '@/app/actions/schools'
import { getMyCoordinatorSchool } from '@/app/actions/coordinator'
import { CoordinatorDetailsForm } from '@/components/coordinator/coordinator-details-form'

export default async function CoordinatorOnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')
  if (profile.role !== 'coordinator') redirect('/dashboard')

  // A claim that is still pending or already approved is tracked on the
  // dashboard. A rejected one lands here again to be corrected.
  const existing = await getMyCoordinatorSchool()
  if (existing && existing.status !== 'rejected') redirect('/coordinator')

  const states = await getSchoolStates()
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {existing ? 'Try again' : `Which school, ${firstName}?`}
          </h1>
          <p className="text-muted mt-2">
            We&apos;ll review your application before you can see your school&apos;s roster.
          </p>
        </div>
        <CoordinatorDetailsForm states={states} />
      </div>
    </main>
  )
}
