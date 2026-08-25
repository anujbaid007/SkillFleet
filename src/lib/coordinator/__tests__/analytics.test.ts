import { describe, expect, it } from 'vitest'
import {
  rosterSummary,
  entryCounts,
  classParticipation,
  needsNudge,
  type RosterEntryStatus,
} from '../analytics'

function student(over: Partial<RosterEntryStatus> = {}): RosterEntryStatus {
  return {
    studentId: 'u1',
    fullName: 'Maya Sharma',
    schoolClass: 'Class 9',
    iscStatus: {},
    ...over,
  }
}

describe('rosterSummary', () => {
  it('separates everyone on SkillFleet from those old enough to enter', () => {
    const s = rosterSummary([
      student({ studentId: 'a', schoolClass: 'Class 9' }),
      student({ studentId: 'b', schoolClass: 'Class 2' }),
      student({ studentId: 'c', schoolClass: null }),
    ])
    expect(s.students).toBe(3)
    expect(s.eligible).toBe(1)
  })

  it('counts an eligible student on any entry as entered', () => {
    const s = rosterSummary([
      student({ studentId: 'a', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', iscStatus: { content_creator: 'submitted' } }),
      student({ studentId: 'c', iscStatus: {} }),
    ])
    expect(s.entered).toBe(2)
    expect(s.notEntered).toBe(1)
  })

  it('counts a student with at least one submitted entry as finished', () => {
    const s = rosterSummary([
      student({
        studentId: 'a',
        iscStatus: { ai_for_impact: 'draft', content_creator: 'submitted' },
      }),
      student({ studentId: 'b', iscStatus: { ai_for_impact: 'draft' } }),
    ])
    expect(s.submittedStudents).toBe(1)
  })

  it('never counts an ineligible student as entered', () => {
    const s = rosterSummary([
      student({ schoolClass: 'Class 3', iscStatus: { ai_for_impact: 'draft' } }),
    ])
    expect(s.entered).toBe(0)
    expect(s.eligible).toBe(0)
  })
})

describe('entryCounts', () => {
  it('totals entries and splits them by status', () => {
    const c = entryCounts([
      { track: 'ai_for_impact', status: 'submitted' },
      { track: 'ai_for_impact', status: 'draft' },
      { track: 'content_creator', status: 'submitted' },
    ])
    expect(c.total).toBe(3)
    expect(c.submitted).toBe(2)
    expect(c.draft).toBe(1)
  })

  it('reports every track, including ones with nothing in them', () => {
    const c = entryCounts([{ track: 'ai_for_impact', status: 'submitted' }])
    expect(c.byTrack.ai_for_impact).toEqual({ submitted: 1, draft: 0 })
    expect(c.byTrack.entrepreneurship).toEqual({ submitted: 0, draft: 0 })
    expect(c.byTrack.content_creator).toEqual({ submitted: 0, draft: 0 })
  })

  it('ignores a track it does not recognise rather than inventing a row', () => {
    const c = entryCounts([{ track: 'puzzle_master', status: 'submitted' }])
    expect(c.total).toBe(1)
    expect(Object.keys(c.byTrack)).toHaveLength(3)
  })
})

describe('classParticipation', () => {
  it('covers only the classes ISC is open to, in class order', () => {
    const rows = classParticipation([
      student({ studentId: 'a', schoolClass: 'Class 9', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', schoolClass: 'Class 9' }),
      student({ studentId: 'c', schoolClass: 'Class 6' }),
      student({ studentId: 'd', schoolClass: 'Class 2' }),
    ])
    expect(rows).toEqual([
      { schoolClass: 'Class 6', students: 1, entered: 0 },
      { schoolClass: 'Class 9', students: 2, entered: 1 },
    ])
  })

  it('is empty when nobody at the school is old enough', () => {
    expect(classParticipation([student({ schoolClass: 'Class 1' })])).toEqual([])
  })
})

describe('needsNudge', () => {
  it('lists eligible students sitting on a draft', () => {
    const { drafts } = needsNudge([
      student({ studentId: 'a', fullName: 'Aman', iscStatus: { ai_for_impact: 'draft' } }),
      student({ studentId: 'b', fullName: 'Bina', iscStatus: { ai_for_impact: 'submitted' } }),
    ])
    expect(drafts.map((s) => s.fullName)).toEqual(['Aman'])
  })

  it('still lists a student who has one submission and one unfinished draft', () => {
    const { drafts } = needsNudge([
      student({ iscStatus: { ai_for_impact: 'submitted', content_creator: 'draft' } }),
    ])
    expect(drafts).toHaveLength(1)
  })

  it('lists eligible students who have not started at all', () => {
    const { notEntered } = needsNudge([
      student({ studentId: 'a', fullName: 'Aman', iscStatus: {} }),
      student({ studentId: 'b', fullName: 'Bina', iscStatus: { ai_for_impact: 'draft' } }),
    ])
    expect(notEntered.map((s) => s.fullName)).toEqual(['Aman'])
  })

  it('never nudges a student too young to enter', () => {
    const { drafts, notEntered } = needsNudge([student({ schoolClass: 'Class 3', iscStatus: {} })])
    expect(drafts).toEqual([])
    expect(notEntered).toEqual([])
  })

  it('sorts each list by name so it reads like a class list', () => {
    const { notEntered } = needsNudge([
      student({ studentId: 'a', fullName: 'Zara' }),
      student({ studentId: 'b', fullName: 'Aman' }),
    ])
    expect(notEntered.map((s) => s.fullName)).toEqual(['Aman', 'Zara'])
  })
})
