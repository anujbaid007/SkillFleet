import { describe, expect, it } from 'vitest'
import { iscGroupForClass, iscGroupLabel } from '../groups'

describe('iscGroupForClass', () => {
  it('places Classes 5-8 in group1', () => {
    for (const c of ['Class 5', 'Class 6', 'Class 7', 'Class 8']) {
      expect(iscGroupForClass(c)).toBe('group1')
    }
  })

  it('places Classes 9-12 in group2', () => {
    for (const c of ['Class 9', 'Class 10', 'Class 11', 'Class 12']) {
      expect(iscGroupForClass(c)).toBe('group2')
    }
  })

  it('returns null for classes ISC does not accept', () => {
    for (const c of ['Kindergarten', 'Class 1', 'Class 4']) {
      expect(iscGroupForClass(c)).toBeNull()
    }
  })

  it('returns null for a missing or unrecognised class', () => {
    expect(iscGroupForClass(null)).toBeNull()
    expect(iscGroupForClass(undefined)).toBeNull()
    expect(iscGroupForClass('Year 9')).toBeNull()
  })
})

describe('iscGroupLabel', () => {
  it('names the group and its class range', () => {
    expect(iscGroupLabel('group1')).toBe('Group 1 (Classes 5–8)')
    expect(iscGroupLabel('group2')).toBe('Group 2 (Classes 9–12)')
  })
})
