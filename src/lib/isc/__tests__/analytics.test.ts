import { describe, expect, it } from 'vitest'
import {
  topSchools,
  byState,
  byBoard,
  byGroup,
  classDistribution,
  submissionTimeline,
  staleDrafts,
  type AnalyticsEntry,
} from '../analytics'

function entry(over: Partial<AnalyticsEntry> = {}): AnalyticsEntry {
  return {
    entryId: 'e1',
    track: 'ai_for_impact',
    status: 'submitted',
    schoolId: 's1',
    schoolName: 'Delhi Public School',
    state: 'Delhi',
    district: 'New Delhi',
    board: 'CBSE',
    submittedAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    studentIds: ['u1'],
    leaderClass: 'Class 9',
    ...over,
  }
}

describe('topSchools', () => {
  it('counts entries, submissions and distinct students per school', () => {
    const rows = topSchools([
      entry({ entryId: 'a', studentIds: ['u1', 'u2'] }),
      entry({ entryId: 'b', track: 'content_creator', status: 'draft', studentIds: ['u2'] }),
      entry({ entryId: 'c', schoolId: 's2', schoolName: 'Kendriya Vidyalaya', studentIds: ['u9'] }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      schoolName: 'Delhi Public School',
      entries: 2,
      submitted: 1,
      students: 2,
    })
  })

  it('ranks by submissions first, then by entries', () => {
    const rows = topSchools([
      entry({ entryId: 'a', schoolId: 's1', schoolName: 'One', status: 'draft' }),
      entry({ entryId: 'b', schoolId: 's1', schoolName: 'One', status: 'draft' }),
      entry({ entryId: 'c', schoolId: 's2', schoolName: 'Two', status: 'submitted' }),
    ])
    expect(rows.map((r) => r.schoolName)).toEqual(['Two', 'One'])
  })

  it('honours the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      entry({ entryId: `e${i}`, schoolId: `s${i}`, schoolName: `School ${i}` })
    )
    expect(topSchools(many, 5)).toHaveLength(5)
  })
})

describe('byState', () => {
  it('counts distinct schools, entries and submissions per state', () => {
    const rows = byState([
      entry({ entryId: 'a', schoolId: 's1', state: 'Delhi' }),
      entry({ entryId: 'b', schoolId: 's2', state: 'Delhi', status: 'draft' }),
      entry({ entryId: 'c', schoolId: 's3', state: 'Kerala' }),
    ])
    expect(rows[0]).toEqual({ state: 'Delhi', schools: 2, entries: 2, submitted: 1 })
    expect(rows[1]).toEqual({ state: 'Kerala', schools: 1, entries: 1, submitted: 1 })
  })

  it('labels a missing state rather than dropping the entry', () => {
    const rows = byState([entry({ state: '' })])
    expect(rows[0].state).toBe('Unknown')
  })
})

describe('byBoard', () => {
  it('counts entries per board, largest first', () => {
    const rows = byBoard([
      entry({ entryId: 'a', board: 'CBSE' }),
      entry({ entryId: 'b', board: 'ICSE' }),
      entry({ entryId: 'c', board: 'CBSE' }),
    ])
    expect(rows).toEqual([
      { label: 'CBSE', count: 2 },
      { label: 'ICSE', count: 1 },
    ])
  })

  it('says so plainly when a school has no board on file', () => {
    expect(byBoard([entry({ board: '' })])).toEqual([{ label: 'Not recorded', count: 1 }])
  })
})

describe('classDistribution', () => {
  it('counts distinct participating students per class, in class order', () => {
    const classes = new Map<string, string | null>([
      ['u1', 'Class 9'],
      ['u2', 'Class 6'],
      ['u3', 'Class 9'],
    ])
    const rows = classDistribution(
      [
        entry({ entryId: 'a', studentIds: ['u1', 'u2'] }),
        entry({ entryId: 'b', studentIds: ['u1', 'u3'] }),
      ],
      classes
    )
    expect(rows).toEqual([
      { label: 'Class 6', count: 1 },
      { label: 'Class 9', count: 2 },
    ])
  })

  it('groups students with no class on file at the end', () => {
    const classes = new Map<string, string | null>([
      ['u1', 'Class 7'],
      ['u2', null],
    ])
    const rows = classDistribution([entry({ studentIds: ['u1', 'u2'] })], classes)
    expect(rows).toEqual([
      { label: 'Class 7', count: 1 },
      { label: 'Class not set', count: 1 },
    ])
  })

  it('omits classes nobody is in', () => {
    const classes = new Map<string, string | null>([['u1', 'Class 12']])
    const rows = classDistribution([entry({ studentIds: ['u1'] })], classes)
    expect(rows).toEqual([{ label: 'Class 12', count: 1 }])
  })
})

describe('submissionTimeline', () => {
  it('counts submissions per Indian day, oldest first', () => {
    const rows = submissionTimeline([
      entry({ entryId: 'a', submittedAt: '2026-09-01T09:00:00Z' }),
      entry({ entryId: 'b', submittedAt: '2026-08-31T23:30:00Z' }), // 05:00 IST on 1 Sep
      entry({ entryId: 'c', submittedAt: '2026-09-03T09:00:00Z' }),
    ])
    expect(rows).toEqual([
      { day: '2026-09-01', count: 2 },
      { day: '2026-09-03', count: 1 },
    ])
  })

  it('ignores drafts and entries with no submission time', () => {
    const rows = submissionTimeline([
      entry({ entryId: 'a', status: 'draft', submittedAt: null }),
      entry({ entryId: 'b', status: 'submitted', submittedAt: null }),
    ])
    expect(rows).toEqual([])
  })
})

describe('staleDrafts', () => {
  const now = new Date('2026-09-20T09:00:00Z')

  it('returns drafts untouched for at least the cutoff, oldest first', () => {
    const rows = staleDrafts(
      [
        entry({
          entryId: 'old',
          status: 'draft',
          submittedAt: null,
          updatedAt: '2026-09-01T09:00:00Z',
        }),
        entry({
          entryId: 'recent',
          status: 'draft',
          submittedAt: null,
          updatedAt: '2026-09-19T09:00:00Z',
        }),
        entry({
          entryId: 'older',
          status: 'draft',
          submittedAt: null,
          updatedAt: '2026-08-20T09:00:00Z',
        }),
      ],
      now,
      7
    )
    expect(rows.map((r) => r.entryId)).toEqual(['older', 'old'])
  })

  it('never lists a submitted entry, however old', () => {
    const rows = staleDrafts(
      [entry({ status: 'submitted', updatedAt: '2026-01-01T09:00:00Z' })],
      now,
      7
    )
    expect(rows).toEqual([])
  })

  it('includes a draft sitting exactly on the cutoff', () => {
    const rows = staleDrafts(
      [entry({ status: 'draft', submittedAt: null, updatedAt: '2026-09-13T09:00:00Z' })],
      now,
      7
    )
    expect(rows).toHaveLength(1)
  })
})

describe('byGroup', () => {
  it("counts entries, submissions and students per group, from the leader's class", () => {
    const rows = byGroup([
      entry({ entryId: 'a', leaderClass: 'Class 9', studentIds: ['u1', 'u2'] }),
      entry({ entryId: 'b', leaderClass: 'Class 7', status: 'draft', studentIds: ['u3'] }),
    ])
    expect(rows).toEqual([
      { group: 'group1', label: 'Group 1 (Classes 5–8)', entries: 1, submitted: 0, students: 1 },
      { group: 'group2', label: 'Group 2 (Classes 9–12)', entries: 1, submitted: 1, students: 2 },
    ])
  })

  it('omits an entry whose leader has no derivable group rather than guessing', () => {
    expect(byGroup([entry({ leaderClass: null })])).toEqual([])
  })

  it('counts a student once per group even if they appear on two entries in it', () => {
    const rows = byGroup([
      entry({ entryId: 'a', leaderClass: 'Class 9', studentIds: ['u1'] }),
      entry({ entryId: 'b', leaderClass: 'Class 10', studentIds: ['u1'] }),
    ])
    expect(rows[0].students).toBe(1)
  })
})
