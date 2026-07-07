import { describe, it, expect } from 'vitest'
import { ageBandFor } from '@/lib/scoring/age-band'
import type { AgeBand } from '@/lib/scoring/types'

// Mirrors the seed data from supabase/migrations/0002_seed_data.sql
const BANDS: AgeBand[] = [
  { id: 'b1', label: 'Junior',   min_age: 6,  max_age: 9,  display_order: 1 },
  { id: 'b2', label: 'Explorer', min_age: 10, max_age: 12, display_order: 2 },
  { id: 'b3', label: 'Builder',  min_age: 13, max_age: 15, display_order: 3 },
  { id: 'b4', label: 'Achiever', min_age: 16, max_age: 18, display_order: 4 },
]

// Fixed reference date so tests are never time-dependent
const AS_OF = new Date('2024-06-01')

describe('ageBandFor', () => {
  it('returns Junior for age 6 (min boundary)', () => {
    // DOB 2018-01-01 → age 6 on 2024-06-01
    expect(ageBandFor('2018-01-01', BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('returns Junior for age 9 (max boundary)', () => {
    // DOB 2015-01-01 → age 9 on 2024-06-01
    expect(ageBandFor('2015-01-01', BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('returns Explorer for age 10', () => {
    expect(ageBandFor('2014-01-01', BANDS, AS_OF)?.label).toBe('Explorer')
  })

  it('returns Builder for age 14', () => {
    expect(ageBandFor('2010-01-01', BANDS, AS_OF)?.label).toBe('Builder')
  })

  it('returns Achiever for age 17', () => {
    expect(ageBandFor('2007-01-01', BANDS, AS_OF)?.label).toBe('Achiever')
  })

  it('returns null when age is below all bands (age 4)', () => {
    expect(ageBandFor('2020-01-01', BANDS, AS_OF)).toBeNull()
  })

  it('returns null when age is above all bands (age 20)', () => {
    expect(ageBandFor('2004-01-01', BANDS, AS_OF)).toBeNull()
  })

  it('treats birthday on asOf date as already turned (inclusive)', () => {
    // DOB 2014-06-01, asOf 2024-06-01 → birthday is today → age 10 → Explorer
    expect(ageBandFor('2014-06-01', BANDS, AS_OF)?.label).toBe('Explorer')
  })

  it('does not increment age when birthday is tomorrow', () => {
    // DOB 2014-06-02, asOf 2024-06-01 → birthday not yet → age 9 → Junior
    expect(ageBandFor('2014-06-02', BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('accepts a Date object as well as a string', () => {
    expect(ageBandFor(new Date('2018-01-01'), BANDS, AS_OF)?.label).toBe('Junior')
  })

  it('uses real current date when asOf is omitted (smoke test — just checks no throw)', () => {
    expect(() => ageBandFor('2010-01-01', BANDS)).not.toThrow()
  })
})
