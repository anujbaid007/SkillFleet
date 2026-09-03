'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { REGISTRATION_PURPOSES, TERMS_VERSION } from '@/lib/legal/registration-consent'

export type RegistrationConsentState = { error?: string; ok?: boolean } | undefined

/**
 * Records what was agreed to at registration.
 *
 * The required purpose is checked here as well as in the popup: the nudge on
 * screen is a convenience, not a control, and the form can be submitted
 * without it. Nothing navigates on success — the popup closes where it is.
 */
export async function saveRegistrationConsentAction(
  _prev: RegistrationConsentState,
  formData: FormData
): Promise<RegistrationConsentState> {
  const agreed = (id: string) => formData.get(id) === 'on'

  const required = REGISTRATION_PURPOSES.filter((p) => p.required)
  if (!required.every((p) => agreed(p.id))) {
    return { error: 'Tick the first box to continue.' }
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

  // Without the stamp there is no record of consent at all, and every gate
  // would keep showing the card.
  if (error) return { error: 'Could not save that. Please try again.' }

  // Every gate reads the stamp from the profile; drop the cached tree so the
  // card does not reappear on the next navigation.
  revalidatePath('/', 'layout')
  return { ok: true }
}
