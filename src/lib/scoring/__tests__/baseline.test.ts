import { describe, it, expect } from 'vitest'
import { calcBaselineForParameter } from '@/lib/scoring/baseline'
import type { BaselineConfig } from '@/lib/scoring/types'

// Mirrors supabase/migrations/0002_seed_data.sql baseline_config
const CFG: BaselineConfig = {
  testWeight: 0.45,
  certWeight: 0.30,
  questionnaireWeight: 0.25,
}

describe('calcBaselineForParameter', () => {
  it('returns 0 when all inputs are 0', () =>
    expect(calcBaselineForParameter({ testPoints: 0, certPoints: 0, questionnairePoints: 0 }, CFG)).toBe(0))

  it('applies testWeight only: test=1000 → 450', () =>
    expect(calcBaselineForParameter({ testPoints: 1000, certPoints: 0, questionnairePoints: 0 }, CFG)).toBe(450))

  it('applies certWeight only: cert=1000 → 300', () =>
    expect(calcBaselineForParameter({ testPoints: 0, certPoints: 1000, questionnairePoints: 0 }, CFG)).toBe(300))

  it('applies questionnaireWeight only: quest=1000 → 250', () =>
    expect(calcBaselineForParameter({ testPoints: 0, certPoints: 0, questionnairePoints: 1000 }, CFG)).toBe(250))

  it('sums all three: test=500 cert=400 quest=300 → 420', () => {
    // 500×0.45 + 400×0.30 + 300×0.25 = 225 + 120 + 75 = 420
    expect(calcBaselineForParameter({ testPoints: 500, certPoints: 400, questionnairePoints: 300 }, CFG)).toBe(420)
  })

  it('sums all three: test=800 cert=600 quest=400 → 640', () => {
    // 800×0.45 + 600×0.30 + 400×0.25 = 360 + 180 + 100 = 640
    expect(calcBaselineForParameter({ testPoints: 800, certPoints: 600, questionnairePoints: 400 }, CFG)).toBe(640)
  })

  it('clamps to 1000 when sum would exceed it', () => {
    // 1000×0.45 + 1000×0.30 + 1000×0.25 = 450+300+250 = 1000 → exactly at cap
    expect(calcBaselineForParameter({ testPoints: 1000, certPoints: 1000, questionnairePoints: 1000 }, CFG)).toBe(1000)
  })

  it('clamps output to 0 when all inputs are negative', () => {
    // Should not happen in practice, but the function must not return negative
    expect(calcBaselineForParameter({ testPoints: -500, certPoints: -500, questionnairePoints: -500 }, CFG)).toBe(0)
  })

  it('rounds fractional results: test=100 cert=100 quest=100 → 100', () => {
    // 100×0.45 + 100×0.30 + 100×0.25 = 45+30+25 = 100 (no rounding needed)
    expect(calcBaselineForParameter({ testPoints: 100, certPoints: 100, questionnairePoints: 100 }, CFG)).toBe(100)
  })

  it('rounds correctly when result has a fraction: test=333 cert=0 quest=0 → 150', () => {
    // 333×0.45 = 149.85 → rounds to 150
    expect(calcBaselineForParameter({ testPoints: 333, certPoints: 0, questionnairePoints: 0 }, CFG)).toBe(150)
  })

  it('works with weights that do not sum to 1 (custom config)', () => {
    const custom: BaselineConfig = { testWeight: 1.0, certWeight: 0, questionnaireWeight: 0 }
    expect(calcBaselineForParameter({ testPoints: 700, certPoints: 500, questionnairePoints: 300 }, custom)).toBe(700)
  })
})
