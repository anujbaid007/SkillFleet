'use client'

import { useActionState, useRef, useEffect } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { addVendorAction } from '@/app/(admin)/admin/vendors/actions'

export function AddVendorForm() {
  const [state, action, pending] = useActionState(addVendorAction, undefined)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) ref.current?.reset()
  }, [state?.ok])

  return (
    <form ref={ref} action={action} className="clay-card p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-foreground">Add a vendor</h2>
        <p className="text-xs text-muted mt-0.5">
          The partner signs up with a normal account first; enter their email here to make them a vendor.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Account email *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="partner@example.com"
            className="w-full h-11 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Organisation name *</label>
          <input
            name="org_name"
            required
            placeholder="Bright Sparks Academy"
            className="w-full h-11 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Contact phone</label>
          <input
            name="phone"
            placeholder="+91 …"
            className="w-full h-11 px-4 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">About (optional)</label>
        <textarea
          name="about"
          rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white px-5 h-11 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {pending ? 'Adding…' : 'Add vendor'}
      </button>
    </form>
  )
}
