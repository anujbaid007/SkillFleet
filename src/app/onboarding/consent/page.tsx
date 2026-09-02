import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegistrationConsentForm } from '@/components/onboarding/registration-consent-form'

/**
 * The first thing after signing up, for every path — email or Google.
 *
 * Placed before /onboarding/details on purpose: that form is where a date of
 * birth, a school and a parent's contact details are actually collected, and
 * DPDP s.6 wants consent before that happens rather than after.
 */
export default async function OnboardingConsentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, terms_agreed_at')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  // Already agreed — nothing to ask twice.
  if (profile.terms_agreed_at) {
    redirect(profile.role === 'coordinator' ? '/onboarding/coordinator' : '/onboarding/details')
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <RegistrationConsentForm isCoordinator={profile.role === 'coordinator'} />
      </div>
    </main>
  )
}
