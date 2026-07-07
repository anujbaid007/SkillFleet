import { describe, it, expect } from 'vitest'
import {
  isStudentDetailsComplete,
  classRequiresBranch,
  validateClassBranch,
  branchToStore,
  CLASS_OPTIONS,
  BRANCH_OPTIONS,
} from '@/lib/profile/details'

const full = {
  school_class: 'Class 8',
  school_name: 'Delhi Public School',
  city: 'Pune',
  parent_mobile: '9876543210',
}

describe('isStudentDetailsComplete', () => {
  it('true when all four fields present', () =>
    expect(isStudentDetailsComplete(full)).toBe(true))

  it('false when school_class is null', () =>
    expect(isStudentDetailsComplete({ ...full, school_class: null })).toBe(false))

  it('false when school_name is null', () =>
    expect(isStudentDetailsComplete({ ...full, school_name: null })).toBe(false))

  it('false when city is null', () =>
    expect(isStudentDetailsComplete({ ...full, city: null })).toBe(false))

  it('false when parent_mobile is null', () =>
    expect(isStudentDetailsComplete({ ...full, parent_mobile: null })).toBe(false))

  it('false when a field is whitespace-only', () =>
    expect(isStudentDetailsComplete({ ...full, city: '   ' })).toBe(false))

  it('false when a field is empty string', () =>
    expect(isStudentDetailsComplete({ ...full, school_name: '' })).toBe(false))
})

describe('classRequiresBranch', () => {
  it('is true for Class 11 and 12', () => {
    expect(classRequiresBranch('Class 11')).toBe(true)
    expect(classRequiresBranch('Class 12')).toBe(true)
  })

  it('is false for lower classes and kindergarten', () => {
    expect(classRequiresBranch('Class 10')).toBe(false)
    expect(classRequiresBranch('Class 1')).toBe(false)
    expect(classRequiresBranch('Kindergarten')).toBe(false)
  })
})

describe('validateClassBranch', () => {
  it('accepts a valid non-branch class with no branch', () => {
    expect(validateClassBranch('Class 8', null)).toBeNull()
  })

  it('rejects an unknown class', () => {
    expect(validateClassBranch('Class 15', null)).toBeTruthy()
  })

  it('requires a branch for Class 11', () => {
    expect(validateClassBranch('Class 11', null)).toBeTruthy()
  })

  it('accepts Class 12 with a valid branch', () => {
    expect(validateClassBranch('Class 12', 'Science')).toBeNull()
  })

  it('rejects an invalid branch value', () => {
    expect(validateClassBranch('Class 11', 'Astrophysics')).toBeTruthy()
  })
})

describe('branchToStore', () => {
  it('keeps the branch for Class 11/12', () => {
    expect(branchToStore('Class 11', 'Commerce')).toBe('Commerce')
  })

  it('nulls the branch for classes that have none', () => {
    expect(branchToStore('Class 9', 'Science')).toBeNull()
  })
})

describe('option lists', () => {
  it('runs Kindergarten through Class 12', () => {
    expect(CLASS_OPTIONS).toContain('Kindergarten')
    expect(CLASS_OPTIONS).toContain('Class 12')
    expect(CLASS_OPTIONS).toHaveLength(13)
  })

  it('offers the three streams', () => {
    expect(BRANCH_OPTIONS).toEqual(['Science', 'Commerce', 'Arts'])
  })
})
