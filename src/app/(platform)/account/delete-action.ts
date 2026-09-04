'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteAccountCompletely } from '@/lib/legal/delete-account'
import { clearFamilySessions } from '@/lib/auth/family-sessions'

export type DeleteAccountState = { error?: string } | undefined

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

/**
 * Erases the signed-in person's account.
 *
 * The phrase is checked here as well as in the form. The disabled button is a
 * convenience; this is the control, and it is the only one that matters for
 * something that cannot be undone.
 *
 * Only ever acts on the caller's own id, taken from the session — never from
 * anything the form supplied. A user id in a form field would be an account
 * deletion endpoint that works on other people's accounts.
 */
export async function deleteMyAccountAction(
  _prev: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const phrase = ((formData.get('confirm_phrase') as string) ?? '').trim()
  if (phrase !== CONFIRM_PHRASE) {
    return { error: `Type ${CONFIRM_PHRASE} exactly to confirm.` }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /*
    Checked here, not left to the layout that hides the button. A server
    action can be invoked without the page that rendered it, and the platform
    layout redirecting other roles away from /account is not a control on
    this function. Students and coordinators are the roles the deletion
    routine is written and tested for; admin and vendor accounts are tied to
    offerings and reviews that need a person to handle them.
  */
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'student' && profile?.role !== 'coordinator') {
    return {
      error:
        'Staff and vendor accounts are removed by SkillFleet directly. Write to hello@skillfleet.org and we will do it for you.',
    }
  }

  const result = await deleteAccountCompletely(user.id)
  if (!result.ok) {
    return {
      error:
        result.error ??
        'Could not delete the account. Please contact hello@skillfleet.org and we will do it for you.',
    }
  }

  // The account is gone; the cookies on this device must go with it.
  await supabase.auth.signOut()
  await clearFamilySessions()
  redirect('/?deleted=1')
}
