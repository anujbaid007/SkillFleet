import { describe, it, expect } from 'vitest'
import { applyOfferingPoints, totalDisplayScore } from '@/lib/scoring/offering'

describe('applyOfferingPoints', () => {
  it('adds points normally', () =>
    expect(applyOfferingPoints(500, 100)).toBe(600))

  it('clamps to 1000 when sum exceeds internal max', () =>
    expect(applyOfferingPoints(950, 100)).toBe(1000))

  it('stays at 1000 when already at max', () =>
    expect(applyOfferingPoints(1000, 50)).toBe(1000))

  it('returns 0 when both are 0', () =>
    expect(applyOfferingPoints(0, 0)).toBe(0))

  it('supports negative points for reversals (e.g. cert rejection)', () =>
    expect(applyOfferingPoints(500, -100)).toBe(400))

  it('clamps to 0 on large negative reversal', () =>
    expect(applyOfferingPoints(50, -200)).toBe(0))

  it('exact max boundary: 999 + 1 = 1000', () =>
    expect(applyOfferingPoints(999, 1)).toBe(1000))

  it('exact min boundary: 1 - 1 = 0', () =>
    expect(applyOfferingPoints(1, -1)).toBe(0))
})

describe('totalDisplayScore', () => {
  it('converts baseline + accrued to display scale', () =>
    // 300 + 200 = 500 internal → 50 display
    expect(totalDisplayScore(300, 200)).toBe(50))

  it('returns 0 when both are 0', () =>
    expect(totalDisplayScore(0, 0)).toBe(0))

  it('returns 100 when baseline alone is at max', () =>
    expect(totalDisplayScore(1000, 0)).toBe(100))

  it('clamps combined score to 1000 before conversion', () =>
    // 600 + 500 = 1100 → clamped to 1000 → display 100
    expect(totalDisplayScore(600, 500)).toBe(100))

  it('returns correct mid-range value', () =>
    // 450 + 200 = 650 internal → 65 display
    expect(totalDisplayScore(450, 200)).toBe(65))

  it('rounds correctly: 645 internal → 65 display (round(64.5) = 65)', () =>
    // 400 + 245 = 645 → round(64.5) = 65
    expect(totalDisplayScore(400, 245)).toBe(65))
})
