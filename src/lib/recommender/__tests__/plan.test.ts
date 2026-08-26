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

  describe('seeded variety (so "Rebuild" gives a fresh plan)', () => {
    // Four interchangeable Fitness activities — identical points, so every
    // choice is equally good and only tie-breaking decides the winner.
    const ties: CandidateOffering[] = ['a', 'b', 'c', 'd'].map((id) => ({
      id,
      title: `Fitness ${id}`,
      type: 'workshop',
      minAge: null,
      maxAge: null,
      pricePaise: 1000,
      contributions: { fit: 50 },
    }))

    it('gives the same plan for the same seed', () => {
      const a = buildBalancedPlan(gaps, ties, { age: 12, size: 1, seed: 42 })
      const b = buildBalancedPlan(gaps, ties, { age: 12, size: 1, seed: 42 })
      expect(a.map((x) => x.offeringId)).toEqual(b.map((x) => x.offeringId))
    })

    it('picks different equally-good activities across seeds', () => {
      const picks = new Set(
        [1, 2, 3, 4, 5, 6, 7, 8].map(
          (seed) => buildBalancedPlan(gaps, ties, { age: 12, size: 1, seed })[0]?.offeringId
        )
      )
      expect(picks.size).toBeGreaterThan(1)
    })

    it('never sacrifices quality — a clear winner still wins under any seed', () => {
      const withWinner: CandidateOffering[] = [
        ...ties,
        { id: 'best', title: 'Best', type: 'workshop', minAge: null, maxAge: null, pricePaise: 1000, contributions: { fit: 90 } },
      ]
      for (const seed of [1, 7, 99, 12345]) {
        expect(buildBalancedPlan(gaps, withWinner, { age: 12, size: 1, seed })[0].offeringId).toBe('best')
      }
    })

    it('still respects size and no-repeat rules when seeded', () => {
      const plan = buildBalancedPlan(gaps, ties, { age: 12, size: 3, seed: 7 })
      expect(plan).toHaveLength(3)
      expect(new Set(plan.map((p) => p.offeringId)).size).toBe(3)
    })
  })
})
