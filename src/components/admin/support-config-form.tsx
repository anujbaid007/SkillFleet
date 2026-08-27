'use client'

import { useActionState, useState } from 'react'
import { Check, Mail, Pencil, Phone, X } from 'lucide-react'
import { updateSupportConfigAction, type SupportConfigState } from '@/app/actions/support-config'

/**
 * The email and phone coordinators see on their Contact Admin page.
 *
 * Inline edit rather than its own settings screen, matching ParameterRow —
 * two fields do not warrant a page, and they read best right above the inbox
 * they belong to.
 */
export function SupportConfigForm({
  id,
  email,
  phone,
}: {
  id: string
  email: string | null
  phone: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<SupportConfigState, FormData>(
    updateSupportConfigAction,
    undefined
  )

  if (!editing) {
    return (
      <div className="clay-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Shown to coordinators
          </p>
          {email || phone ? (
            <p className="text-sm text-foreground mt-1.5 flex items-center gap-4 flex-wrap">
              {email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  {email}
                </span>
              )}
              {phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted" />
                  {phone}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted mt-1.5">
              No contact details set — coordinators see only the message thread.
            </p>
          )}
          {state?.ok && <p className="text-xs text-green-700 mt-1.5">{state.ok}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted hover:text-primary transition-colors shrink-0"
          aria-label="Edit admin contact details"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="clay-card p-5 space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">
        Shown to coordinators
      </p>
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="admin_contact_email"
          type="email"
          defaultValue={email ?? ''}
          placeholder="support@skillfleet.in"
          aria-label="Admin contact email"
          className="px-3 py-2 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
        />
        <input
          name="admin_contact_phone"
          defaultValue={phone ?? ''}
          placeholder="+91 90000 00000"
          aria-label="Admin contact phone"
          className="px-3 py-2 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs text-muted hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </form>
  )
}
