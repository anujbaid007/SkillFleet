import type { createClient } from '@/lib/supabase/server'
import type { SupportMessage } from '@/components/support/support-thread'

interface RawMessage {
  id: string
  sender_id: string
  sender_role: string
  body: string
  created_at: string
}

/**
 * The conversation id and its full message history for one coordinator, or a
 * null conversation id when nobody has written to them yet.
 *
 * No role check here: RLS already scopes support_messages to the caller's own
 * conversation, or lets an admin read any — the same division of labour as
 * every other read in this project.
 */
export async function loadConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coordinatorId: string
): Promise<{ conversationId: string | null; messages: SupportMessage[] }> {
  const { data: conv } = await supabase
    .from('support_conversations')
    .select('id')
    .eq('coordinator_id', coordinatorId)
    .maybeSingle()

  if (!conv) return { conversationId: null, messages: [] }

  const { data: rows } = await supabase
    .from('support_messages')
    .select('id, sender_id, sender_role, body, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })

  const messages: SupportMessage[] = ((rows ?? []) as RawMessage[]).map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    senderRole: r.sender_role as 'admin' | 'coordinator',
    body: r.body,
    createdAt: r.created_at,
  }))

  return { conversationId: conv.id, messages }
}
