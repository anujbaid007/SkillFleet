'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { markThreadReadAction, type SupportSendState } from '@/app/actions/support'
import { createClient } from '@/lib/supabase/client'

export interface SupportMessage {
  id: string
  senderId: string
  senderRole: 'admin' | 'coordinator'
  body: string
  createdAt: string
}

interface RawMessageRow {
  id: string
  sender_id: string
  sender_role: 'admin' | 'coordinator'
  body: string
  created_at: string
}

const TIME_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The message history and composer, identical on the admin and coordinator
 * sides — only which server action it posts to (and which extra hidden field
 * that action needs) differs between the two callers.
 *
 * Delivery is real-time: while mounted, this subscribes to new rows on its own
 * conversation over Supabase Realtime (a websocket) and appends them the
 * instant they arrive. RLS governs that subscription exactly as it governs a
 * normal read — a caller only ever receives a row their own session could have
 * SELECTed, so a coordinator's browser is never sent another coordinator's
 * messages.
 */
export function SupportThread({
  messages,
  conversationId,
  viewerRole,
  sendAction,
  hiddenFields,
  emptyLabel,
}: {
  messages: SupportMessage[]
  conversationId: string | null
  viewerRole: 'admin' | 'coordinator'
  sendAction: (prev: SupportSendState, formData: FormData) => Promise<SupportSendState>
  /** Extra hidden inputs the send action needs — e.g. which coordinator, on
      the admin side. Omitted on the coordinator side, which always posts to
      its own conversation. */
  hiddenFields?: Record<string, string>
  emptyLabel: string
}) {
  const [state, action, pending] = useActionState<SupportSendState, FormData>(sendAction, undefined)
  /**
   * Only messages that arrived over the websocket live here. The server's own
   * `messages` prop stays the source of truth and is merged with these at
   * render time, rather than being copied into state and re-synced by an
   * effect: copying would mean a second render every time the server
   * revalidated, and would need care to avoid the copy going stale.
   */
  const [liveExtra, setLiveExtra] = useState<SupportMessage[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // A live message stops being "extra" the moment the server includes it, so
  // this naturally converges on the server's list with no cleanup needed.
  const liveMessages = useMemo(() => {
    if (liveExtra.length === 0) return messages
    const known = new Set(messages.map((m) => m.id))
    const extras = liveExtra.filter((m) => !known.has(m.id))
    return extras.length === 0 ? messages : [...messages, ...extras]
  }, [messages, liveExtra])

  // Live delivery. Re-runs when conversationId changes — in particular the
  // moment it flips from null to a real id, right after the first message
  // either side sends brings the conversation into existence.
  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    void (async () => {
      /*
        The realtime socket authenticates separately from ordinary queries, and
        it does NOT pick the session up on its own here: subscribing straight
        away registers the subscription as `anon`, so auth.uid() is NULL inside
        the RLS check and every row is — correctly — withheld. The symptom is a
        thread that silently never updates, which is easy to mistake for a
        broken policy rather than an unauthenticated socket.

        Waiting for the session and handing the token to realtime explicitly is
        what makes the subscription run as the signed-in user.
      */
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled || !session?.access_token) return
      await supabase.realtime.setAuth(session.access_token)
      if (cancelled) return

      channel = supabase
        .channel(`support-thread-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as RawMessageRow
            setLiveExtra((prev) =>
              // Realtime can redeliver on reconnect; the render-time merge
              // dedupes against the server's list, this dedupes against itself.
              prev.some((m) => m.id === row.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: row.id,
                      senderId: row.sender_id,
                      senderRole: row.sender_role,
                      body: row.body,
                      createdAt: row.created_at,
                    },
                  ]
            )
            // A message from the other party landing while this thread is open
            // is read the instant it arrives — there is nothing unread about a
            // message its recipient is looking at right now.
            if (row.sender_role !== viewerRole) void markThreadReadAction(conversationId)
          }
        )
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [conversationId, viewerRole])

  // Opening a thread is "read" too, independent of the live path above: this
  // covers everything that was already sitting there before it was opened.
  useEffect(() => {
    if (conversationId) void markThreadReadAction(conversationId)
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [liveMessages.length])

  useEffect(() => {
    if (!pending) formRef.current?.reset()
  }, [pending])

  return (
    <div className="clay-card flex flex-col h-[32rem]">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {liveMessages.length === 0 ? (
          <p className="text-sm text-muted text-center mt-8">{emptyLabel}</p>
        ) : (
          liveMessages.map((m) => {
            const mine = m.senderRole === viewerRole
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? 'bg-primary text-white' : 'bg-black/[0.04] text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                    {TIME_FORMAT.format(new Date(m.createdAt))}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        action={action}
        className="border-t border-black/[0.06] p-3 flex items-end gap-2"
      >
        {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <textarea
          name="body"
          required
          rows={1}
          maxLength={2000}
          placeholder="Write a message…"
          aria-label="Write a message"
          className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send message"
          className="clay-button bg-cta text-white w-10 h-10 flex items-center justify-center shrink-0 disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {state?.error && <p className="text-xs text-red-500 px-3 pb-2">{state.error}</p>}
    </div>
  )
}
