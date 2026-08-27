import { describe, it, expect } from 'vitest'
import { discountPercentFor, nextBand, cartTotals, splitPayment } from '@/lib/commerce/discount'

describe('discountPercentFor', () => {
  it('gives no discount below 6 items', () => {
    for (const n of [0, 1, 3, 5]) expect(discountPercentFor(n)).toBe(0)
  })

  it('applies each band at its boundary', () => {
    expect(discountPercentFor(6)).toBe(10)
    expect(discountPercentFor(12)).toBe(15)
    expect(discountPercentFor(15)).toBe(20)
    expect(discountPercentFor(18)).toBe(25)
  })

  it('holds a band until the next one starts', () => {
    expect(discountPercentFor(11)).toBe(10)
    expect(discountPercentFor(14)).toBe(15)
    expect(discountPercentFor(17)).toBe(20)
    expect(discountPercentFor(50)).toBe(25)
  })
})

describe('nextBand', () => {
  it('reports how many more items unlock the next tier', () => {
    expect(nextBand(4)).toEqual({ itemsAway: 2, percent: 10 })
    expect(nextBand(10)).toEqual({ itemsAway: 2, percent: 15 })
    expect(nextBand(14)).toEqual({ itemsAway: 1, percent: 20 })
  })

  it('returns null once at the top band', () => {
    expect(nextBand(18)).toBeNull()
    expect(nextBand(30)).toBeNull()
  })
})

describe('cartTotals', () => {
  it('charges full price under the discount threshold', () => {
    const t = cartTotals([50000, 30000])
    expect(t.discountPercent).toBe(0)
    expect(t.subtotalPaise).toBe(80000)
    expect(t.totalPaise).toBe(80000)
    expect(t.discountPaise).toBe(0)
  })

  it('applies 10% at 6 items', () => {
    const t = cartTotals(Array(6).fill(10000))
    expect(t.discountPercent).toBe(10)
    expect(t.subtotalPaise).toBe(60000)
    expect(t.totalPaise).toBe(54000)
    expect(t.discountPaise).toBe(6000)
  })

  it('applies 25% at 18 items', () => {
    const t = cartTotals(Array(18).fill(20000))
    expect(t.discountPercent).toBe(25)
    expect(t.totalPaise).toBe(18 * 15000)
  })

  it('keeps subtotal = total + discount even with rounding', () => {
    // Prices that do not divide evenly by the discount.
    const prices = [33333, 12345, 77777, 10101, 55555, 9999]
    const t = cartTotals(prices)
    expect(t.discountPercent).toBe(10)
    expect(t.totalPaise + t.discountPaise).toBe(t.subtotalPaise)
  })

  it('handles an empty cart', () => {
    const t = cartTotals([])
    expect(t).toMatchObject({ count: 0, subtotalPaise: 0, totalPaise: 0, discountPercent: 0 })
  })

  it('handles free activities', () => {
    const t = cartTotals(Array(6).fill(0))
    expect(t.totalPaise).toBe(0)
    expect(t.discountPaise).toBe(0)
  })
})

describe('splitPayment', () => {
  it('splits wallet + gateway when the wallet is short', () => {
    expect(splitPayment(70000, 50000, true)).toEqual({ walletPaise: 50000, gatewayPaise: 20000 })
  })

  it('uses only the wallet when it covers the total', () => {
    expect(splitPayment(40000, 90000, true)).toEqual({ walletPaise: 40000, gatewayPaise: 0 })
  })

  it('charges everything to the gateway when the wallet is off', () => {
    expect(splitPayment(70000, 50000, false)).toEqual({ walletPaise: 0, gatewayPaise: 70000 })
  })

  it('treats an empty wallet as gateway-only', () => {
    expect(splitPayment(70000, 0, true)).toEqual({ walletPaise: 0, gatewayPaise: 70000 })
  })
})
