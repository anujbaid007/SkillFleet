'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { respondToMessage, type ChatTurnResult, type ChatMessageIn, type Learner } from '@/lib/chat/respond'

export interface ChatRequest {
  message: string
  history: ChatMessageIn[]
  /** Offering ids from the last list shown, so "add the second one" resolves. */
  lastOfferingIds: string[]
  activeChildId: string | null
}

/**
 * One turn of the assistant. Everything runs server-side against the caller's
 * own session, so the model can never see or do more than the user could.
 */
export async function sendChatMessageAction(req: ChatRequest): Promise<ChatTurnResult> {
  const message = (req.message ?? '').trim().slice(0, 500)

  const empty: ChatTurnResult = {
    reply: 'Ask me something and I will help.',
    offerings: [],
    childId: null,
    childName: null,
    model: 'fallback',
  }
  if (!message) return empty

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...empty, reply: 'Please sign in again to continue.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, date_of_birth')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') {
    return { ...empty, reply: 'The assistant is available for student accounts.' }
  }

  // Everyone in the family — so "what should Aarav do next?" works from any
  // sibling's account, exactly like the booking and cart flows.
  const { data: family } = await supabase.rpc('get_family_students')
  let learners: Learner[] = (
    (family ?? []) as { student_id: string; full_name: string | null; date_of_birth: string | null }[]
  ).map((k) => ({ id: k.student_id, name: k.full_name?.split(' ')[0] ?? 'Student', dob: k.date_of_birth }))

  if (learners.length === 0) {
    learners = [
      { id: user.id, name: profile?.full_name?.split(' ')[0] ?? 'you', dob: profile?.date_of_birth ?? null },
    ]
  }

  const result = await respondToMessage(supabase, {
    learners,
    activeChildId: req.activeChildId ?? null,
    message,
    history: (req.history ?? []).slice(-10),
    lastOfferingIds: (req.lastOfferingIds ?? []).slice(0, 50),
  })

  // Adding to the cart changes the sidebar badge and the cart page.
  revalidatePath('/cart')
  revalidatePath('/', 'layout')

  return result
}
