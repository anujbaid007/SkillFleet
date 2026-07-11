import { describe, it, expect } from 'vitest'
import { rankCandidates } from '@/lib/recommender/candidates'
import type { ParameterGap, CandidateOffering } from '@/lib/recommender/types'

const gaps: ParameterGap[] = [
  { parameterId: 'fit', name: 'Fitness', displayScore: 10, targetMin: 40, targetMax: 70, status: 'below_target', deficit: 30 },
  { parameterId: 'eq', name: 'EQ', displayScore: 35, targetMin: 50, targetMax: 80, status: 'below_target', deficit: 15 },
  { parameterId: 'iq', name: 'IQ', displayScore: 45, targetMin: 30, targetMax: 60, status: 'on_target', deficit: 0 },
]

const offerings: CandidateOffering[] = [
  // addresses Fitness (30 * 50 = 1500) + EQ (15 * 20 = 300) = 1800
  { id: 'dance', title: 'Dance', type: 'workshop', minAge: null, maxAge: null, pricePaise: 50000, contributions: { fit: 50, eq: 20 } },
  // addresses only IQ (on target) -> matchScore 0, dropped
  { id: 'chess', title: 'Chess', type: 'workshop', minAge: null, maxAge: null, pricePaise: 40000, contributions: { iq: 80 } },
  // addresses Fitness only (30 * 40 = 1200)
  { id: 'yoga', title: 'Yoga', type: 'workshop', minAge: null, maxAge: null, pricePaise: 30000, contributions: { fit: 40 } },
]

describe('rankCandidates', () => {
  it('ranks by gap-weighted match score, dropping offerings that address no gap', () => {
    const ranked = rankCandidates(gaps, offerings, { age: 12 })
    expect(ranked.map((r) => r.offeringId)).toEqual(['dance', 'yoga'])
    expect(ranked[0].matchScore).toBe(1800)
    expect(ranked[1].matchScore).toBe(1200)
  })

  it('lists the addressed parameters strongest-contribution first', () => {
    const ranked = rankCandidates(gaps, offerings, { age: 12 })
    expect(ranked[0].parameters.map((p) => p.name)).toEqual(['Fitness', 'EQ'])
  })

  it('excludes age-ineligible offerings', () => {
    const aged: CandidateOffering[] = [
      { id: 'teen', title: 'Teen Fitness', type: 'workshop', minAge: 13, maxAge: 18, pricePaise: 0, contributions: { fit: 50 } },
    ]
    expect(rankCandidates(gaps, aged, { age: 10 })).toEqual([])
    expect(rankCandidates(gaps, aged, { age: 14 }).map((r) => r.offeringId)).toEqual(['teen'])
  })

  it('excludes already-booked offerings', () => {
    const ranked = rankCandidates(gaps, offerings, { age: 12, bookedOfferingIds: new Set(['dance']) })
    expect(ranked.map((r) => r.offeringId)).toEqual(['yoga'])
  })

  it('honours the limit', () => {
    expect(rankCandidates(gaps, offerings, { age: 12, limit: 1 })).toHaveLength(1)
  })

  it('returns nothing when there are no below-target gaps', () => {
    const onTrack: ParameterGap[] = [{ ...gaps[2] }]
    expect(rankCandidates(onTrack, offerings, { age: 12 })).toEqual([])
  })
})
