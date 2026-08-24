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
    expect(validateCoordinatorApplication('CBSE', '5000+')).toBe(
      'Please select the number of students.'
    )
  })

  it('exposes the options the UI renders from', () => {
    expect(BOARD_OPTIONS).toContain('CBSE')
    expect(BOARD_OPTIONS).toContain('Other')
    expect(STUDENT_COUNT_OPTIONS).toEqual(['1-100', '101-300', '301-600', '601-1000', '1000+'])
  })
})
