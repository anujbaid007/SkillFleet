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

  it('accepts the large open-ended bands', () => {
    for (const band of ['500+', '1500+', '2000-3000', '3000+', '5000+', '20000+']) {
      expect(validateCoordinatorApplication('CBSE', band)).toBeNull()
    }
  })

  // Schools already carry these values, so dropping one would reject an
  // existing coordinator re-submitting their own application.
  it('still accepts every band that predates the large-school ladder', () => {
    for (const band of ['1-100', '101-300', '301-600', '601-1000', '1000+']) {
      expect(validateCoordinatorApplication('CBSE', band)).toBeNull()
    }
  })

  it('exposes the options the UI renders from', () => {
    expect(BOARD_OPTIONS).toContain('CBSE')
    expect(BOARD_OPTIONS).toContain('Other')
    expect(STUDENT_COUNT_OPTIONS).toEqual([
      '1-100',
      '101-300',
      '301-600',
      '500+',
      '601-1000',
      '1000+',
      '1500+',
      '2000-3000',
      '3000+',
      '5000+',
      '7000+',
      '10000+',
      '20000+',
    ])
  })
})
