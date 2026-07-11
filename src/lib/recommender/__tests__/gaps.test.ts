import { describe, it, expect } from 'vitest'
import { detectGaps, belowTargetGaps } from '@/lib/recommender/gaps'
import type { ParameterTarget } from '@/lib/scoring/types'

const targets: ParameterTarget[] = [
  { parameter_id: 'fit', age_band_id: 'b', target_min: 40, target_max: 70 },
  { parameter_id: 'iq', age_band_id: 'b', target_min: 30, target_max: 60 },
  { parameter_id: 'eq', age_band_id: 'b', target_min: 50, target_max: 80 },
]

const scored = [
  { parameterId: 'fit', name: 'Fitness', displayScore: 10 },   // deficit 30
  { parameterId: 'iq', name: 'IQ', displayScore: 45 },         // on target
  { parameterId: 'eq', name: 'EQ', displayScore: 35 },         // deficit 15
]

describe('detectGaps', () => {
  it('orders by largest deficit first', () => {
    const gaps = detectGaps(scored, targets)
    expect(gaps.map((g) => g.parameterId)).toEqual(['fit', 'eq', 'iq'])
  })

  it('computes status and deficit per parameter', () => {
    const gaps = detectGaps(scored, targets)
    const fit = gaps.find((g) => g.parameterId === 'fit')!
    expect(fit.status).toBe('below_target')
    expect(fit.deficit).toBe(30)
    const iq = gaps.find((g) => g.parameterId === 'iq')!
    expect(iq.status).toBe('on_target')
    expect(iq.deficit).toBe(0)
  })

  it('treats a parameter with no target row as target 0-0 (never a gap)', () => {
    const gaps = detectGaps([{ parameterId: 'x', name: 'Unmapped', displayScore: 5 }], [])
    expect(gaps[0].status).toBe('above_target')
    expect(gaps[0].deficit).toBe(0)
  })
})

describe('belowTargetGaps', () => {
  it('keeps only genuine below-target gaps, severity-ordered', () => {
    const below = belowTargetGaps(detectGaps(scored, targets))
    expect(below.map((g) => g.parameterId)).toEqual(['fit', 'eq'])
  })

  it('returns empty when the student is on track everywhere', () => {
    const onTrack = [{ parameterId: 'fit', name: 'Fitness', displayScore: 55 }]
    expect(belowTargetGaps(detectGaps(onTrack, targets))).toEqual([])
  })
})
