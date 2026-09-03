'use server'

import { redirect } from 'next/navigation'
import { LANDING_AFTER_LOGIN } from '@/lib/launch'
import { createClient } from '@/lib/supabase/server'
import { readFamilySessions, writeFamilySessions, clearFamilySessions } from '@/lib/auth/family-sessions'

export type SwitchState = { error?: string } | undefined

export interface SwitchTarget {
  user_id: string
  full_name: string | null
  email: string
  role: string
}

/** Siblings in the same family that the signed-in user may switch into. */
export async function getSwitchTargets(): Promise<SwitchTarget[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_switch_targets')
  return (data ?? []) as SwitchTarget[]
}

/**
 * Swap the active session to a linked family account.
 *
 * Both accounts are real and separate — this only changes which one is active,
 * so RLS still applies exactly as it would after a normal login. If this device
 * has never signed into the target account, we fall back to a one-time
 * password prompt.
 */
export async function switchAccountAction(formData: FormData) {
  const targetId = formData.get('target_id') as string
  if (!targetId) return

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Refuse anything that isn't a genuine same-family link, before touching the
  // session. Cheap, and means we never have to unwind a bad swap.
  const { data: linked } = await supabase.rpc('accounts_are_linked', { p_a: user.id, p_b: targetId })
  if (!linked) redirect(LANDING_AFTER_LOGIN)

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const currentRefresh = session?.refresh_token
  const currentId = user.id

  const stored = await readFamilySessions()
  const targetRefresh = stored[targetId]

  // Never signed in as this account on this device — bootstrap once.
  if (!targetRefresh) redirect(`/switch?to=${targetId}`)

  const { data: swapped, error } = await supabase.auth.refreshSession({ refresh_token: targetRefresh })

  if (error || !swapped.user) {
    // Token expired or was revoked — forget it and ask for the password again.
    delete stored[targetId]
    await writeFamilySessions(stored)
    redirect(`/switch?to=${targetId}&expired=1`)
  }

  // The target's token now lives in Supabase's cookies; stash the account we
  // just left so switching back is equally frictionless.
  delete stored[targetId]
  if (currentRefresh) stored[currentId] = currentRefresh
  await writeFamilySessions(stored)

  redirect(LANDING_AFTER_LOGIN)
}

/**
 * One-time-per-device sign-in that enables frictionless switching afterwards.
 * The email comes from the server (the linked account), never the form — so
 * this can only ever authenticate the intended family member.
 */
export async function bootstrapSwitchAction(_prev: SwitchState, formData: FormData): Promise<SwitchState> {
  const targetId = formData.get('target_id') as string
  const password = formData.get('password') as string
  if (!targetId || !password) return { error: 'Enter the password to continue.' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const targets = (await supabase.rpc('get_switch_targets')).data as SwitchTarget[] | null
  const target = (targets ?? []).find((t) => t.user_id === targetId)
  if (!target) return { error: 'That account is not linked to yours.' }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const currentRefresh = session?.refresh_token
  const currentId = user.id

  const { data: signedIn, error } = await supabase.auth.signInWithPassword({
    email: target.email,
    password,
  })

  if (error || !signedIn.user) {
    return { error: 'That password did not match. Please try again.' }
  }

  const stored = await readFamilySessions()
  delete stored[targetId]
  if (currentRefresh) stored[currentId] = currentRefresh
  await writeFamilySessions(stored)

  redirect(LANDING_AFTER_LOGIN)
}

/** Sign out everywhere on this device, including the stored family sessions. */
export async function logoutAllAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  await clearFamilySessions()
  redirect('/login')
}
