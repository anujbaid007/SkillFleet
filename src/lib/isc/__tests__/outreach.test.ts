import { describe, expect, it } from 'vitest'
import { coldSchools, coordinatorCoverage, type SchoolWithCoordinator } from '../outreach'
import type { AnalyticsEntry } from '../analytics'

function school(over: Partial<SchoolWithCoordinator> = {}): SchoolWithCoordinator {
  return {
    schoolId: 's1',
    schoolName: 'Test School',
    state: 'Maharashtra',
    district: 'Pune',
    coordinatorStatus: 'none',
    ...over,
  }
}

function entry(schoolId: string): AnalyticsEntry {
  return {
    entryId: 'e1',
    track: 'ai_for_impact',
    status: 'draft',
    schoolId,
    schoolName: 'Test School',
    state: 'Maharashtra',
    district: 'Pune',
    board: 'CBSE',
    submittedAt: null,
    updatedAt: '2026-08-01T00:00:00Z',
    studentIds: [],
    leaderClass: 'Class 9',
  }
}

describe('coldSchools', () => {
  it('includes a school with eligible students and zero entries', () => {
    const rows = coldSchools([school({ schoolId: 's1' })], [], new Map([['s1', 12]]))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ schoolId: 's1', eligibleCount: 12 })
  })

  it('excludes a school with no eligible student accounts at all', () => {
    const rows = coldSchools([school({ schoolId: 's1' })], [], new Map())
    expect(rows).toHaveLength(0)
  })

  it('excludes a school that already has at least one ISC start', () => {
    const rows = coldSchools([school({ schoolId: 's1' })], [entry('s1')], new Map([['s1', 12]]))
    expect(rows).toHaveLength(0)
  })

  it('sorts by eligible count descending, biggest opportunity first', () => {
    const rows = coldSchools(
      [
        school({ schoolId: 's1', schoolName: 'Small' }),
        school({ schoolId: 's2', schoolName: 'Big' }),
      ],
      [],
      new Map([
        ['s1', 5],
        ['s2', 40],
      ])
    )
    expect(rows.map((r) => r.schoolName)).toEqual(['Big', 'Small'])
  })

  it('caps the returned list at the given limit', () => {
    const schools = Array.from({ length: 5 }, (_, i) =>
      school({ schoolId: `s${i}`, schoolName: `S${i}` })
    )
    const eligible = new Map(schools.map((s) => [s.schoolId, 1]))
    expect(coldSchools(schools, [], eligible, 2)).toHaveLength(2)
  })
})

describe('coordinatorCoverage', () => {
  it('buckets schools by coordinator status, in a fixed order', () => {
    const rows = coordinatorCoverage([
      school({ coordinatorStatus: 'none' }),
      school({ coordinatorStatus: 'none' }),
      school({ coordinatorStatus: 'approved' }),
      school({ coordinatorStatus: 'pending' }),
    ])
    expect(rows).toEqual([
      { label: 'none', count: 2 },
      { label: 'pending', count: 1 },
      { label: 'approved', count: 1 },
    ])
  })
})
