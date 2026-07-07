import { describe, it, expect } from 'vitest'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'

describe('calculateAge', () => {
  it('calculates age when birthday has passed this year', () => {
    expect(calculateAge('2015-01-01', new Date('2026-07-01'))).toBe(11)
  })

  it('calculates age when birthday has not yet occurred this year', () => {
    expect(calculateAge('2015-12-31', new Date('2026-07-01'))).toBe(10)
  })

  it('calculates age on exact birthday', () => {
    expect(calculateAge('2015-07-01', new Date('2026-07-01'))).toBe(11)
  })
})

describe('isAgeEligible', () => {
  it('returns true when no bounds are set', () => {
    expect(isAgeEligible(10, null, null)).toBe(true)
  })

  it('returns false when below min_age', () => {
    expect(isAgeEligible(5, 8, 14)).toBe(false)
  })

  it('returns false when above max_age', () => {
    expect(isAgeEligible(16, 8, 14)).toBe(false)
  })

  it('returns true when within range', () => {
    expect(isAgeEligible(10, 8, 14)).toBe(true)
  })

  it('is inclusive of the min and max bounds', () => {
    expect(isAgeEligible(8, 8, 14)).toBe(true)
    expect(isAgeEligible(14, 8, 14)).toBe(true)
  })
})
