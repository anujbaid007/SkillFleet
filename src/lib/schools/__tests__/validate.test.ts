import { describe, it, expect } from 'vitest'
import {
  parseSchoolSelection,
  validateSchoolSelection,
  MANUAL_SENTINEL,
  MAX_SCHOOL_NAME,
} from '@/lib/schools/validate'

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

describe('parseSchoolSelection', () => {
  it('reads a picked school', () => {
    const sel = parseSchoolSelection(
      fd({ school_state: 'Maharashtra', school_district: 'Pune', school_id: 'abc-123' })
    )
    expect(sel).toEqual({
      state: 'Maharashtra',
      district: 'Pune',
      schoolId: 'abc-123',
      manualName: null,
    })
  })

  it('reads a manual entry and leaves schoolId null', () => {
    const sel = parseSchoolSelection(
      fd({
        school_state: 'Sikkim',
        school_district: 'Soreng',
        school_id: MANUAL_SENTINEL,
        school_manual_name: '  Greenwood High  ',
      })
    )
    expect(sel.schoolId).toBeNull()
    expect(sel.manualName).toBe('Greenwood High')
  })

  it('trims surrounding whitespace on state and district', () => {
    const sel = parseSchoolSelection(
      fd({ school_state: ' Kerala ', school_district: ' Ernakulam ', school_id: 'x' })
    )
    expect(sel.state).toBe('Kerala')
    expect(sel.district).toBe('Ernakulam')
  })
})

describe('validateSchoolSelection', () => {
  const picked = { state: 'Delhi', district: 'New Delhi', schoolId: 'abc', manualName: null }

  it('accepts a picked school', () =>
    expect(validateSchoolSelection(picked)).toBeNull())

  it('accepts a manual entry', () =>
    expect(
      validateSchoolSelection({ ...picked, schoolId: null, manualName: 'Some School' })
    ).toBeNull())

  it('rejects a missing state', () =>
    expect(validateSchoolSelection({ ...picked, state: '' })).toBe(
      'Please select your state.'
    ))

  it('rejects a missing district', () =>
    expect(validateSchoolSelection({ ...picked, district: '' })).toBe(
      'Please select your district.'
    ))

  it('rejects neither a school nor a manual name', () =>
    expect(
      validateSchoolSelection({ ...picked, schoolId: null, manualName: null })
    ).toBe('Please select your school.'))

  it('rejects a whitespace-only manual name', () =>
    expect(
      validateSchoolSelection({ ...picked, schoolId: null, manualName: '   ' })
    ).toBe('Please select your school.'))

  it('rejects a manual name longer than the limit', () =>
    expect(
      validateSchoolSelection({
        ...picked,
        schoolId: null,
        manualName: 'x'.repeat(MAX_SCHOOL_NAME + 1),
      })
    ).toBe('School name is too long.'))

  it('accepts a manual name exactly at the limit', () =>
    expect(
      validateSchoolSelection({
        ...picked,
        schoolId: null,
        manualName: 'x'.repeat(MAX_SCHOOL_NAME),
      })
    ).toBeNull())
})
