import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isStudentDetailsComplete } from '@/lib/profile/details'
import { DetailsForm } from '@/components/onboarding/details-form'
import { getSchoolStates } from '@/app/actions/schools'

export default async function OnboardingDetailsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, onboarding_completed, school_class, school_name, city, parent_mobile')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect('/dashboard')

  // Already complete? Skip the gate.
  if (isStudentDetailsComplete(profile)) {
    redirect(profile.onboarding_completed ? '/dashboard' : '/onboarding')
  }

  const states = await getSchoolStates()
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            A few details, {firstName} 👋
          </h1>
          <p className="text-muted mt-2">
            Tell us a little about you so we can personalise your SkillFleet experience.
          </p>
        </div>
        <DetailsForm states={states} previousFreeText={profile.school_name ?? ''} />
      </div>
    </main>
  )
}
