import { describe, it, expect } from 'vitest'
import { validateDob, MIN_SIGNUP_AGE } from '@/lib/validation/dob'

const today = new Date('2026-07-02')

describe('validateDob', () => {
  it('accepts a student well over the minimum age', () => {
    expect(validateDob('2015-04-30', today)).toBeNull()
  })

  it('accepts exactly the minimum age (5th birthday today)', () => {
    expect(validateDob('2021-07-02', today)).toBeNull()
  })

  it('rejects one day short of the 5th birthday', () => {
    expect(validateDob('2021-07-03', today)).toBeTruthy()
  })

  it('rejects a 4-year-old', () => {
    expect(validateDob('2022-01-01', today)).toBeTruthy()
  })

  it('rejects an empty value', () => {
    expect(validateDob('', today)).toBeTruthy()
  })

  it('rejects a future date of birth', () => {
    expect(validateDob('2030-01-01', today)).toBeTruthy()
  })

  it('exposes the minimum age as 5', () => {
    expect(MIN_SIGNUP_AGE).toBe(5)
  })
})
