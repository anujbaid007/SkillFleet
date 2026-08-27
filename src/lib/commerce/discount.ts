// Bulk-booking discount. Mirrors public.bulk_discount_percent() in SQL —
// the database is authoritative at checkout; this drives the UI preview so the
// parent sees the same number before they pay.

export const MAX_CART_ITEMS = 50

export interface DiscountBand {
  minItems: number
  percent: number
}

/** Bands, richest first. */
export const DISCOUNT_BANDS: DiscountBand[] = [
  { minItems: 18, percent: 25 },
  { minItems: 15, percent: 20 },
  { minItems: 12, percent: 15 },
  { minItems: 6, percent: 10 },
]

/** Discount percentage for a cart of `count` items (0 below the first band). */
export function discountPercentFor(count: number): number {
  for (const band of DISCOUNT_BANDS) {
    if (count >= band.minItems) return band.percent
  }
  return 0
}

/** How many more items to reach the next band, and what that band pays. Null at the top band. */
export function nextBand(count: number): { itemsAway: number; percent: number } | null {
  const current = discountPercentFor(count)
  // Bands ascend as you add items; find the cheapest band above the current one.
  const upgrades = DISCOUNT_BANDS.filter((b) => b.percent > current).sort((a, b) => a.minItems - b.minItems)
  const target = upgrades[0]
  if (!target) return null
  return { itemsAway: target.minItems - count, percent: target.percent }
}

export interface CartTotals {
  count: number
  subtotalPaise: number
  discountPercent: number
  discountPaise: number
  totalPaise: number
}

/**
 * Totals for a cart. Each item's discounted price is rounded individually and
 * then summed — matching checkout_cart() in SQL, so the preview and the charge
 * always reconcile to the rupee.
 */
export function cartTotals(pricesPaise: number[]): CartTotals {
  const count = pricesPaise.length
  const discountPercent = discountPercentFor(count)
  const subtotalPaise = pricesPaise.reduce((sum, p) => sum + p, 0)
  const totalPaise = pricesPaise.reduce(
    (sum, p) => sum + Math.round((p * (100 - discountPercent)) / 100),
    0
  )
  return {
    count,
    subtotalPaise,
    discountPercent,
    discountPaise: subtotalPaise - totalPaise,
    totalPaise,
  }
}

/** Split a total between the wallet balance and the gateway (wallet first). */
export function splitPayment(totalPaise: number, walletBalancePaise: number, useWallet: boolean) {
  const walletPaise = useWallet ? Math.min(Math.max(walletBalancePaise, 0), totalPaise) : 0
  return { walletPaise, gatewayPaise: totalPaise - walletPaise }
}
