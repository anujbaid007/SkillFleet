import { describe, expect, it } from 'vitest'
import { computeFunnel, type EligibleStudent, type FunnelMember } from '../funnel'
import type { AnalyticsEntry } from '../analytics'

function student(id: string): EligibleStudent {
  return { id, schoolId: 'school-1' }
}

function entry(entryId: string, track: AnalyticsEntry['track'], status: string): AnalyticsEntry {
  return {
    entryId,
    track,
    status,
    schoolId: 'school-1',
    schoolName: 'Test School',
    state: 'Maharashtra',
    district: 'Pune',
    board: 'CBSE',
    submittedAt: status === 'submitted' ? '2026-08-01T00:00:00Z' : null,
    updatedAt: '2026-08-01T00:00:00Z',
    studentIds: [],
    leaderClass: 'Class 9',
  }
}

describe('computeFunnel', () => {
  it('returns all zeros with no eligible students', () => {
    const result = computeFunnel([], [], [])
    expect(result.eligible).toBe(0)
    expect(result.started).toBe(0)
    expect(result.submitted).toBe(0)
    expect(result.activationRate).toBe(0)
    expect(result.completionRate).toBe(0)
  })

  it('counts a leader as started the moment their entry exists, even as a draft', () => {
    const eligible = [student('s1')]
    const entries = [entry('e1', 'ai_for_impact', 'draft')]
    const members: FunnelMember[] = [
      { entryId: 'e1', userId: 's1', isLeader: true, acceptedAt: null },
    ]
    const result = computeFunnel(eligible, entries, members)
    expect(result.started).toBe(1)
    expect(result.submitted).toBe(0)
    expect(result.activationRate).toBe(100)
    expect(result.completionRate).toBe(0)
  })

  it('does not count a pending, unaccepted invite as started', () => {
    const eligible = [student('s1'), student('s2')]
    const entries = [entry('e1', 'ai_for_impact', 'draft')]
    const members: FunnelMember[] = [
      { entryId: 'e1', userId: 's1', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
      { entryId: 'e1', userId: 's2', isLeader: false, acceptedAt: null },
    ]
    const result = computeFunnel(eligible, entries, members)
    expect(result.started).toBe(1)
  })

  it('counts submitted, and computes both rates, once real activation happened', () => {
    const eligible = [student('s1')]
    const entries = [entry('e1', 'ai_for_impact', 'submitted')]
    const members: FunnelMember[] = [
      { entryId: 'e1', userId: 's1', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
    ]
    const result = computeFunnel(eligible, entries, members)
    expect(result.eligible).toBe(1)
    expect(result.started).toBe(1)
    expect(result.submitted).toBe(1)
    expect(result.activationRate).toBe(100)
    expect(result.completionRate).toBe(100)
  })

  it('counts a student on two tracks once in the headline, once per track in byTrack', () => {
    const eligible = [student('s1')]
    const entries = [entry('e1', 'ai_for_impact', 'draft'), entry('e2', 'content_creator', 'draft')]
    const members: FunnelMember[] = [
      { entryId: 'e1', userId: 's1', isLeader: true, acceptedAt: null },
      { entryId: 'e2', userId: 's1', isLeader: true, acceptedAt: null },
    ]
    const result = computeFunnel(eligible, entries, members)
    expect(result.started).toBe(1)
    expect(result.byTrack.find((r) => r.label === 'AI for Impact')?.count).toBe(1)
    expect(result.byTrack.find((r) => r.label === 'Content Creator Championship')?.count).toBe(1)
  })

  it('ignores a member whose account is outside the eligible set for this scope', () => {
    const eligible = [student('s1')]
    const entries = [entry('e1', 'ai_for_impact', 'draft')]
    const members: FunnelMember[] = [
      { entryId: 'e1', userId: 's1', isLeader: true, acceptedAt: null },
      { entryId: 'e1', userId: 'outsider', isLeader: false, acceptedAt: '2026-08-01T00:00:00Z' },
    ]
    const result = computeFunnel(eligible, entries, members)
    expect(result.started).toBe(1)
  })
})
