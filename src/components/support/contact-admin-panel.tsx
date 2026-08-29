'use client'

import { useState } from 'react'
import { Mail, MessageCircle, Phone, X } from 'lucide-react'
import { SupportThread, type SupportMessage } from '@/components/support/support-thread'
import { sendCoordinatorMessageAction } from '@/app/actions/support'

/**
 * Contact details first, chat second.
 *
 * Most questions are answered faster by an email or a phone call, so those are
 * what the page leads with. The thread is a deliberate choice rather than the
 * default: it opens only when a coordinator decides they would rather message
 * directly, and stays out of the way otherwise.
 */
export function ContactAdminPanel({
  email,
  phone,
  messages,
  conversationId,
  unread,
}: {
  email: string | null
  phone: string | null
  messages: SupportMessage[]
  conversationId: string | null
  /** Unread admin messages, so an open conversation is never hidden behind a
      button with no hint that something is waiting. */
  unread: number
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const hasContact = Boolean(email || phone)
  const hasHistory = messages.length > 0

  return (
    <div className="space-y-4">
      <div className="clay-card p-6">
        <h2 className="font-display font-bold text-foreground text-base">Reach the team</h2>

        {hasContact ? (
          <div className="mt-4 space-y-3">
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 text-sm text-foreground hover:text-primary group"
              >
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">Email</span>
                  <span className="block font-medium break-all group-hover:underline">{email}</span>
                </span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-3 text-sm text-foreground hover:text-primary group"
              >
                <span className="w-9 h-9 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">Phone</span>
                  <span className="block font-medium group-hover:underline">{phone}</span>
                </span>
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted mt-3">
            No email or phone has been published yet — messaging below reaches the team
            directly.
          </p>
        )}

        {!chatOpen && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="clay-button bg-cta text-white px-5 h-11 text-sm font-semibold inline-flex items-center gap-2 mt-6"
          >
            <MessageCircle className="w-4 h-4" />
            {hasHistory ? 'Open chat' : 'Chat with admin'}
            {unread > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">
                {unread} new
              </span>
            )}
          </button>
        )}
      </div>

      {chatOpen && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display font-bold text-foreground text-base">Chat with admin</h2>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Close chat
            </button>
          </div>
          <SupportThread
            messages={messages}
            conversationId={conversationId}
            viewerRole="coordinator"
            sendAction={sendCoordinatorMessageAction}
            emptyLabel="No messages yet. Ask us anything."
          />
        </div>
      )}
    </div>
  )
}
