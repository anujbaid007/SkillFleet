import { describe, expect, it } from 'vitest'
import { validateCoordinatorApplication, BOARD_OPTIONS, STUDENT_COUNT_OPTIONS } from '../validate'

describe('validateCoordinatorApplication', () => {
  it('accepts a listed board and a listed student count', () => {
    expect(validateCoordinatorApplication('CBSE', '301-600')).toBeNull()
  })

  it('accepts "Other" with a non-empty custom board', () => {
    expect(validateCoordinatorApplication('Deccan Board (custom)', '1-100')).toBeNull()
  })

  it('rejects an empty board', () => {
    expect(validateCoordinatorApplication('', '1-100')).toBe('Please select your board.')
  })

  it('rejects a whitespace-only board', () => {
    expect(validateCoordinatorApplication('   ', '1-100')).toBe('Please select your board.')
  })

  it('rejects a missing student count', () => {
    expect(validateCoordinatorApplication('CBSE', '')).toBe('Please select the number of students.')
  })

  it('rejects a student count outside the fixed list', () => {
    expect(validateCoordinatorApplication('CBSE', '42 students')).toBe(
      'Please select the number of students.'
    )
  })

  it('accepts every band the dropdown offers', () => {
    for (const band of STUDENT_COUNT_OPTIONS) {
      expect(validateCoordinatorApplication('CBSE', band)).toBeNull()
    }
  })

  // A school in production still holds '301-600'. Rejecting a retired value
  // would stop that coordinator re-submitting their own application.
  it('still accepts retired closed ranges that schools are stored against', () => {
    for (const band of ['1-100', '101-300', '301-600', '601-1000', '2000-3000']) {
      expect(validateCoordinatorApplication('CBSE', band)).toBeNull()
    }
  })

  it('offers only open-ended bands', () => {
    for (const band of STUDENT_COUNT_OPTIONS) expect(band).toMatch(/^\d+\+$/)
  })

  it('exposes the options the UI renders from', () => {
    expect(BOARD_OPTIONS).toContain('CBSE')
    expect(BOARD_OPTIONS).toContain('Other')
    expect(STUDENT_COUNT_OPTIONS).toEqual([
      '500+',
      '1000+',
      '1500+',
      '2000+',
      '3000+',
      '5000+',
      '7000+',
      '10000+',
      '20000+',
    ])
  })
})
