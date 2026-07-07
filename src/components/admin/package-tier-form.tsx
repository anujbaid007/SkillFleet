'use client'

import { useActionState } from 'react'
import type { PackageTierFormState } from '@/app/(admin)/admin/packages/actions'

interface Props {
  action: (prev: PackageTierFormState, formData: FormData) => Promise<PackageTierFormState>
  tierId?: string
  initial?: {
    name?: string
    slot_count?: number
    price_paise?: number
    validity_days?: number
    description?: string
    is_active?: boolean
  }
}

const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function PackageTierForm({ action, tierId, initial = {} }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="clay-card p-6 space-y-4 max-w-lg">
      {tierId && <input type="hidden" name="tier_id" value={tierId} />}
      {state?.error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{state.error}</div>}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Name *</label>
        <input name="name" defaultValue={initial.name ?? ''} required placeholder="e.g. Explorer" className={INPUT} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Slots *</label>
          <input name="slot_count" type="number" min={1} defaultValue={initial.slot_count ?? 6} className={INPUT} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Price (₹)</label>
          <input
            name="price_rupees"
            type="number"
            min={0}
            step={1}
            defaultValue={initial.price_paise != null ? initial.price_paise / 100 : 0}
            className={INPUT}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Validity (days)</label>
        <input name="validity_days" type="number" min={1} defaultValue={initial.validity_days ?? 365} className={INPUT} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          name="description"
          defaultValue={initial.description ?? ''}
          rows={2}
          placeholder="What this package is best for."
          className={`${INPUT} resize-none`}
        />
      </div>

      {tierId && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" name="is_active" value="true" defaultChecked={initial.is_active ?? true} className="rounded" />
            Active
          </label>
          {/* checkbox sends nothing when unchecked; hidden fallback ensures is_active=false submits. */}
          <input type="hidden" name="is_active" value="false" />
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : tierId ? 'Save Changes' : 'Create Tier'}
      </button>
    </form>
  )
}
