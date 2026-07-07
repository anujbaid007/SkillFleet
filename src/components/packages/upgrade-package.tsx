'use client'

import { useActionState } from 'react'
import { requestUpgradeAction } from '@/app/(platform)/packages/actions'

interface Tier {
  id: string
  slot_count: number
  price_paise: number
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

// Lets a parent upgrade an active package to a higher tier (pays the difference).
export function UpgradePackage({
  packageId,
  currentSlots,
  currentPricePaise,
  tiers,
}: {
  packageId: string
  currentSlots: number
  currentPricePaise: number
  tiers: Tier[]
}) {
  const [state, action, pending] = useActionState(requestUpgradeAction, undefined)
  const higher = tiers.filter((t) => t.slot_count > currentSlots)
  if (higher.length === 0) return null

  return (
    <form action={action} className="flex items-center gap-2 flex-wrap">
      <input type="hidden" name="package_id" value={packageId} />
      <select
        name="new_tier_id"
        required
        className="h-9 px-3 rounded-xl border border-black/10 bg-white text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Upgrade to…</option>
        {higher.map((t) => {
          const delta = Math.max(0, t.price_paise - currentPricePaise)
          return (
            <option key={t.id} value={t.id}>
              {t.slot_count} slots · pay {formatPrice(delta)}
            </option>
          )
        })}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="h-9 px-4 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-colors disabled:opacity-60"
      >
        {pending ? '…' : 'Upgrade'}
      </button>
      {state?.error && <p className="w-full text-xs text-red-500">{state.error}</p>}
    </form>
  )
}
