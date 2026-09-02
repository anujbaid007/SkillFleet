import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isStudentDetailsComplete } from '@/lib/profile/details'
import { DetailsForm } from '@/components/onboarding/details-form'
import { getSchoolStates } from '@/app/actions/schools'
import { MIN_SIGNUP_AGE } from '@/lib/validation/dob'

export default async function OnboardingDetailsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'full_name, role, onboarding_completed, school_class, school_name, school_state, school_district, city, parent_mobile, date_of_birth, family_id'
    )
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect('/dashboard')

  // Already complete? Skip the gate.
  if (isStudentDetailsComplete(profile)) {
    redirect(profile.onboarding_completed ? '/dashboard' : '/onboarding')
  }

  const states = await getSchoolStates()

  // Latest date of birth that still satisfies the minimum signup age. Computed
  // on the server so the input's `max` is identical on both renders.
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - MIN_SIGNUP_AGE)
  const maxDob = cutoff.toISOString().split('T')[0]
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
        <DetailsForm
          states={states}
          previousFreeText={profile.school_name ?? ''}
          defaultName={profile.full_name ?? ''}
          needsDob={!profile.date_of_birth}
          needsParent={!profile.family_id}
          maxDob={maxDob}
        />
      </div>
    </main>
  )
}
