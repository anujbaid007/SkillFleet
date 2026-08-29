import { describe, expect, it } from 'vitest'
import { applyIscFilters } from '../admin-filters'
import type { AnalyticsEntry } from '../analytics'
import type { FunnelMember } from '../funnel'

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

const NO_SUBMISSIONS = new Map<string, Record<string, unknown>>()

describe('applyIscFilters', () => {
  it('returns everything when no filter is set', () => {
    const entries = [entry({ entryId: 'a' }), entry({ entryId: 'b' })]
    expect(applyIscFilters(entries, [], NO_SUBMISSIONS, {}).entries).toHaveLength(2)
  })

  it('filters by track, status and group', () => {
    const entries = [
      entry({ entryId: 'a', track: 'ai_for_impact', status: 'submitted', leaderClass: 'Class 9' }),
      entry({ entryId: 'b', track: 'content_creator', status: 'submitted', leaderClass: 'Class 9' }),
      entry({ entryId: 'c', track: 'ai_for_impact', status: 'draft', leaderClass: 'Class 9' }),
      entry({ entryId: 'd', track: 'ai_for_impact', status: 'submitted', leaderClass: 'Class 6' }),
    ]
    const result = applyIscFilters(entries, [], NO_SUBMISSIONS, {
      track: 'ai_for_impact',
      status: 'submitted',
      group: 'group2',
    })
    expect(result.entries.map((e) => e.entryId)).toEqual(['a'])
  })

  it('filters by language, read from the submission payload', () => {
    const entries = [entry({ entryId: 'a' }), entry({ entryId: 'b' })]
    const submissions = new Map<string, Record<string, unknown>>([
      ['a', { language: 'Hindi' }],
      ['b', { language: 'English' }],
    ])
    const result = applyIscFilters(entries, [], submissions, { language: 'Hindi' })
    expect(result.entries.map((e) => e.entryId)).toEqual(['a'])
  })

  it('searches on school name, case-insensitively', () => {
    const entries = [
      entry({ entryId: 'a', schoolName: 'Delhi Public School' }),
      entry({ entryId: 'b', schoolName: 'Kendriya Vidyalaya' }),
    ]
    const result = applyIscFilters(entries, [], NO_SUBMISSIONS, { q: '  kendriya ' })
    expect(result.entries.map((e) => e.entryId)).toEqual(['b'])
  })

  it('drops the members of filtered-out entries, so the funnel narrows too', () => {
    const entries = [
      entry({ entryId: 'a', status: 'submitted' }),
      entry({ entryId: 'b', status: 'draft' }),
    ]
    const members: FunnelMember[] = [
      { entryId: 'a', userId: 'u1', isLeader: true, acceptedAt: null },
      { entryId: 'b', userId: 'u2', isLeader: true, acceptedAt: null },
    ]
    const result = applyIscFilters(entries, members, NO_SUBMISSIONS, { status: 'submitted' })
    expect(result.funnelMembers.map((m) => m.userId)).toEqual(['u1'])
  })
})
