import { describe, expect, it } from 'vitest'
import { classOptions, filterRoster } from '../roster-filters'
import type { RosterRow } from '../roster'

function row(over: Partial<RosterRow> = {}): RosterRow {
  return {
    studentId: 's1',
    name: 'Student One',
    schoolClass: 'Class 9',
    tracks: ['ai_for_impact'],
    status: { kind: 'solo', entryStatus: 'submitted' },
    ...over,
  }
}

describe('filterRoster', () => {
  it('returns everything when nothing is set', () => {
    expect(filterRoster([row(), row({ studentId: 's2' })], {})).toHaveLength(2)
  })

  it('filters by track, including a track the student was only invited to', () => {
    const rows = [
      row({ studentId: 'a', tracks: ['ai_for_impact'] }),
      row({ studentId: 'b', tracks: ['content_creator'], status: { kind: 'invited' } }),
    ]
    expect(filterRoster(rows, { track: 'content_creator' }).map((r) => r.studentId)).toEqual(['b'])
  })

  it('filters by group, derived from the class', () => {
    const rows = [
      row({ studentId: 'a', schoolClass: 'Class 7' }),
      row({ studentId: 'b', schoolClass: 'Class 11' }),
    ]
    expect(filterRoster(rows, { group: 'group1' }).map((r) => r.studentId)).toEqual(['a'])
    expect(filterRoster(rows, { group: 'group2' }).map((r) => r.studentId)).toEqual(['b'])
  })

  it('filters by an exact class', () => {
    const rows = [
      row({ studentId: 'a', schoolClass: 'Class 7' }),
      row({ studentId: 'b', schoolClass: 'Class 8' }),
    ]
    expect(filterRoster(rows, { schoolClass: 'Class 8' }).map((r) => r.studentId)).toEqual(['b'])
  })

  it('filters by each competing status', () => {
    const rows = [
      row({ studentId: 'notstarted', status: { kind: 'not_started' } }),
      row({ studentId: 'invited', status: { kind: 'invited' } }),
      row({ studentId: 'solo', status: { kind: 'solo', entryStatus: 'draft' } }),
      row({
        studentId: 'team',
        status: { kind: 'team', size: 2, maxSize: 3, entryStatus: 'submitted' },
      }),
    ]
    const ids = (status: string) => filterRoster(rows, { status }).map((r) => r.studentId)
    expect(ids('not_started')).toEqual(['notstarted'])
    expect(ids('invited')).toEqual(['invited'])
    expect(ids('solo')).toEqual(['solo'])
    expect(ids('team')).toEqual(['team'])
    expect(ids('submitted')).toEqual(['team'])
    expect(ids('draft')).toEqual(['solo'])
  })

  it('never counts a not-started or invited student as a draft', () => {
    const rows = [
      row({ studentId: 'notstarted', status: { kind: 'not_started' } }),
      row({ studentId: 'invited', status: { kind: 'invited' } }),
    ]
    expect(filterRoster(rows, { status: 'draft' })).toEqual([])
  })

  it('combines filters, and searches by name', () => {
    const rows = [
      row({ studentId: 'a', name: 'Aarav Mehta', schoolClass: 'Class 9', tracks: ['ai_for_impact'] }),
      row({ studentId: 'b', name: 'Diya Shah', schoolClass: 'Class 9', tracks: ['ai_for_impact'] }),
    ]
    const result = filterRoster(rows, { track: 'ai_for_impact', group: 'group2', q: ' diya ' })
    expect(result.map((r) => r.studentId)).toEqual(['b'])
  })
})

describe('classOptions', () => {
  it('lists only the classes present, in numeric order', () => {
    const rows = [
      row({ schoolClass: 'Class 12' }),
      row({ schoolClass: 'Class 7' }),
      row({ schoolClass: 'Class 10' }),
      row({ schoolClass: 'Class 7' }),
    ]
    expect(classOptions(rows)).toEqual(['Class 7', 'Class 10', 'Class 12'])
  })

  it('skips students with no class on file', () => {
    expect(classOptions([row({ schoolClass: null })])).toEqual([])
  })
})
