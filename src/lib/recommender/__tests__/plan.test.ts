import { describe, it, expect } from 'vitest'
import { buildBalancedPlan } from '@/lib/recommender/plan'
import type { ParameterGap, CandidateOffering } from '@/lib/recommender/types'

const gaps: ParameterGap[] = [
  { parameterId: 'fit', name: 'Fitness', displayScore: 10, targetMin: 40, targetMax: 70, status: 'below_target', deficit: 30 },
  { parameterId: 'eq', name: 'EQ', displayScore: 20, targetMin: 50, targetMax: 80, status: 'below_target', deficit: 30 },
  { parameterId: 'iq', name: 'IQ', displayScore: 45, targetMin: 30, targetMax: 60, status: 'on_target', deficit: 0 },
]

// Two fitness-heavy and two eq-heavy offerings, all same price for determinism.
const offerings: CandidateOffering[] = [
  { id: 'fit1', title: 'Football', type: 'event', minAge: null, maxAge: null, pricePaise: 1000, contributions: { fit: 50 } },
  { id: 'fit2', title: 'Yoga', type: 'workshop', minAge: null, maxAge: null, pricePaise: 1000, contributions: { fit: 45 } },
  { id: 'eq1', title: 'EI Circle', type: 'workshop', minAge: null, maxAge: null, pricePaise: 1000, contributions: { eq: 50 } },
  { id: 'eq2', title: 'Drama', type: 'workshop', minAge: null, maxAge: null, pricePaise: 1000, contributions: { eq: 45 } },
]

describe('buildBalancedPlan', () => {
  it('spreads across gaps instead of stacking one (breadth)', () => {
    // Both gaps equal deficit; after picking a Fitness offering, Fitness decays,
    // so the 2nd pick should switch to an EQ offering.
    const plan = buildBalancedPlan(gaps, offerings, { age: 12, size: 2 })
    const covered = new Set(plan.flatMap((p) => p.parameters.map((x) => x.id)))
    expect(covered).toEqual(new Set(['fit', 'eq']))
  })

  it('respects the requested size', () => {
    expect(buildBalancedPlan(gaps, offerings, { age: 12, size: 3 })).toHaveLength(3)
  })

  it('never repeats an offering', () => {
    const plan = buildBalancedPlan(gaps, offerings, { age: 12, size: 4 })
    const ids = plan.map((p) => p.offeringId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('stops early when candidates run out rather than padding', () => {
    const plan = buildBalancedPlan(gaps, offerings, { age: 12, size: 10 })
    expect(plan).toHaveLength(4)
  })

  it('excludes age-ineligible and already-booked offerings', () => {
    const aged: CandidateOffering[] = [
      { id: 'teen', title: 'Teen', type: 'workshop', minAge: 13, maxAge: 18, pricePaise: 0, contributions: { fit: 50 } },
      { id: 'ok', title: 'Kid', type: 'workshop', minAge: 6, maxAge: 12, pricePaise: 0, contributions: { eq: 50 } },
    ]
    const plan = buildBalancedPlan(gaps, aged, { age: 10, size: 5, bookedOfferingIds: new Set(['ok']) })
    expect(plan).toEqual([])
  })

  it('returns empty when there are no below-target gaps', () => {
    const onTrack: ParameterGap[] = [{ ...gaps[2] }]
    expect(buildBalancedPlan(onTrack, offerings, { age: 12, size: 3 })).toEqual([])
  })

  it('is deterministic for the same inputs', () => {
    const a = buildBalancedPlan(gaps, offerings, { age: 12, size: 3 })
    const b = buildBalancedPlan(gaps, offerings, { age: 12, size: 3 })
    expect(a.map((x) => x.offeringId)).toEqual(b.map((x) => x.offeringId))
  })
})
