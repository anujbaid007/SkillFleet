'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { REGISTRATION_PURPOSES, TERMS_VERSION } from '@/lib/legal/registration-consent'

export type RegistrationConsentState = { error?: string } | undefined

/**
 * Records what was agreed to at registration.
 *
 * The required purpose is checked here as well as in the form: a disabled
 * button is a convenience, not a control, and the form can be submitted
 * without it.
 */
export async function saveRegistrationConsentAction(
  _prev: RegistrationConsentState,
  formData: FormData
): Promise<RegistrationConsentState> {
  const agreed = (id: string) => formData.get(id) === 'on'

  const required = REGISTRATION_PURPOSES.filter((p) => p.required)
  if (!required.every((p) => agreed(p.id))) {
    return { error: 'Please agree to the first item before continuing.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('user_profiles')
    .update({
      terms_agreed_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
      marketing_skillfleet: agreed('marketing_skillfleet'),
      marketing_brainweave: agreed('marketing_brainweave'),
    })
    .eq('id', user.id)

  // Unlike the ISC detail write, this one does matter: without the stamp there
  // is no record of consent at all, and the gate would send them straight back
  // here anyway.
  if (error) return { error: 'Could not save that. Please try again.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(profile?.role === 'coordinator' ? '/onboarding/coordinator' : '/onboarding/details')
}
