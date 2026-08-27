'use client'

import { useActionState } from 'react'
import { Check } from 'lucide-react'
import { updateSupportConfigAction, type SupportConfigState } from '@/app/actions/support-config'

/**
 * The email and phone coordinators see on their Contact Admin page.
 *
 * Always editable, with no read/edit toggle: it is two fields, and a toggle
 * bought nothing but a way to get the save wrong — closing the editor from the
 * submit button's own onClick unmounted the form mid-submit and silently threw
 * the save away.
 *
 * Keyed on the server's current values so a successful save re-syncs the
 * inputs to what was actually stored, rather than leaving whatever was typed
 * sitting there unverified.
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
  const [state, action, pending] = useActionState<SupportConfigState, FormData>(
    updateSupportConfigAction,
    undefined
  )

  return (
    <form
      key={`${email ?? ''}|${phone ?? ''}`}
      action={action}
      className="clay-card p-5 space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">
          Shown to coordinators
        </p>
        <p className="text-xs text-muted mt-1">
          Your email and phone appear on every coordinator&apos;s Contact Admin page.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="sr-only">Admin contact email</span>
          <input
            name="admin_contact_email"
            type="email"
            defaultValue={email ?? ''}
            placeholder="support@skillfleet.in"
            aria-label="Admin contact email"
            className="w-full px-3 py-2 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="sr-only">Admin contact phone</span>
          <input
            name="admin_contact_phone"
            defaultValue={phone ?? ''}
            placeholder="+91 90000 00000"
            aria-label="Admin contact phone"
            className="w-full px-3 py-2 rounded-xl border-2 border-black/[0.06] text-sm focus:outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          {pending ? 'Saving…' : 'Save'}
        </button>
        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
        {state?.ok && <p className="text-xs text-green-700">{state.ok}</p>}
      </div>
    </form>
  )
}
