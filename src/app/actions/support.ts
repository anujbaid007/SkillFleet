'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SupportSendState = { error?: string } | undefined

const ERR: Record<string, string> = {
  empty_message: 'Write something before sending.',
  message_too_long: 'Keep it under 2000 characters.',
  not_coordinator: 'Only coordinator accounts can use this.',
  not_approved: 'Your school needs to be approved before you can message admin.',
  forbidden: 'Admins only.',
  not_found: 'That conversation no longer exists.',
}

export async function sendCoordinatorMessageAction(
  _prev: SupportSendState,
  formData: FormData
): Promise<SupportSendState> {
  const body = (formData.get('body') as string) ?? ''

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('support_coordinator_send_message', { p_body: body })
  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (status !== 'sent') return { error: ERR[status] ?? 'Could not send that.' }

  revalidatePath('/coordinator/support')
  return undefined
}

export async function sendAdminMessageAction(
  _prev: SupportSendState,
  formData: FormData
): Promise<SupportSendState> {
  const coordinatorId = (formData.get('coordinator_id') as string)?.trim()
  const body = (formData.get('body') as string) ?? ''
  if (!coordinatorId) return { error: 'Missing coordinator.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('support_admin_send_message', {
    p_coordinator_id: coordinatorId,
    p_body: body,
  })
  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (status !== 'sent') return { error: ERR[status] ?? 'Could not send that.' }

  revalidatePath(`/admin/coordinators/support/${coordinatorId}`)
  revalidatePath('/admin/coordinators/support')
  revalidatePath('/admin/coordinators')
  return undefined
}

/**
 * Called when a thread mounts and when a message arrives while it is open —
 * not from a form, so it takes a plain argument rather than FormData.
 *
 * Deliberately returns nothing and swallows failure: marking read is a
 * convenience, and a failed mark must never interrupt reading the thread.
 * The RPC itself refuses anyone who is not a party to the conversation.
 */
export async function markThreadReadAction(conversationId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('support_mark_thread_read', { p_conversation_id: conversationId })
}
