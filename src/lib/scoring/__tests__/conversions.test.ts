import { describe, it, expect } from 'vitest'
import { internalToDisplay, displayToInternal } from '@/lib/scoring/conversions'

describe('internalToDisplay', () => {
  it('converts 0 → 0', () => expect(internalToDisplay(0)).toBe(0))
  it('converts 500 → 50', () => expect(internalToDisplay(500)).toBe(50))
  it('converts 1000 → 100', () => expect(internalToDisplay(1000)).toBe(100))
  it('rounds 994 → 99', () => expect(internalToDisplay(994)).toBe(99))
  it('rounds 995 → 100', () => expect(internalToDisplay(995)).toBe(100))
  it('clamps values above 1000 to 100', () => expect(internalToDisplay(1200)).toBe(100))
  it('clamps negative values to 0', () => expect(internalToDisplay(-50)).toBe(0))
})

describe('displayToInternal', () => {
  it('converts 0 → 0', () => expect(displayToInternal(0)).toBe(0))
  it('converts 50 → 500', () => expect(displayToInternal(50)).toBe(500))
  it('converts 100 → 1000', () => expect(displayToInternal(100)).toBe(1000))
  it('clamps values above 100 to 1000', () => expect(displayToInternal(150)).toBe(1000))
  it('clamps negative values to 0', () => expect(displayToInternal(-10)).toBe(0))
})
