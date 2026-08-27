import { describe, expect, it } from 'vitest'
import {
  buildSchoolRoster,
  buildStudentProfile,
  type RosterMember,
  type RosterStudent,
} from '../roster'
import type { AnalyticsEntry } from '../analytics'

function student(id: string, name = 'Student'): RosterStudent {
  return { id, name, schoolClass: 'Class 9' }
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

const ACCEPTED = '2026-08-01T00:00:00Z'

describe('buildSchoolRoster', () => {
  it('marks a student with no entry footprint as not started', () => {
    const rows = buildSchoolRoster([student('s1')], [], [])
    expect(rows[0].status).toEqual({ kind: 'not_started' })
  })

  it('marks a lone accepted leader with no pending invites as solo', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'draft')],
      [{ entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: ACCEPTED }]
    )
    expect(rows[0].status).toEqual({ kind: 'solo', entryStatus: 'draft' })
  })

  it('marks a 1-member entry with a pending invite as a forming team, not solo', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'draft')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: ACCEPTED },
        { entryId: 'e1', userId: 's2', displayName: 'Invitee', isLeader: false, acceptedAt: null },
      ]
    )
    expect(rows[0].status).toEqual({ kind: 'team', size: 1, maxSize: 3, entryStatus: 'draft' })
  })

  it('counts an accepted team, excluding the pending invite from the size', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'submitted')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: ACCEPTED },
        { entryId: 'e1', userId: 's2', displayName: 'Mate', isLeader: false, acceptedAt: ACCEPTED },
        { entryId: 'e1', userId: 's3', displayName: 'Pending', isLeader: false, acceptedAt: null },
      ]
    )
    expect(rows[0].status).toEqual({ kind: 'team', size: 2, maxSize: 3, entryStatus: 'submitted' })
  })

  it('marks a student who has only been invited, not yet responded, as invited', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'draft')],
      [{ entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: false, acceptedAt: null }]
    )
    expect(rows[0].status).toEqual({ kind: 'invited' })
  })

  it('prefers an accepted entry over a merely-pending invite on another track', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'submitted'), entry('e2', 'ai_for_impact', 'draft')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: ACCEPTED },
        { entryId: 'e2', userId: 's1', displayName: 'Student', isLeader: false, acceptedAt: null },
      ]
    )
    expect(rows[0].status).toMatchObject({ kind: 'solo', entryStatus: 'submitted' })
  })

  it('prefers a submitted entry over a draft when a student has accepted both', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'ai_for_impact', 'draft'), entry('e2', 'content_creator', 'submitted')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: ACCEPTED },
        { entryId: 'e2', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: ACCEPTED },
      ]
    )
    expect(rows[0].status).toMatchObject({ entryStatus: 'submitted' })
  })
})

describe('buildStudentProfile', () => {
  it('returns one block per track touched, in track order, each with its team', () => {
    const me = { id: 's1', name: 'Diya Shah', schoolClass: 'Class 7' }
    const entries = [
      entry('e1', 'content_creator', 'draft'),
      entry('e2', 'ai_for_impact', 'submitted'),
    ]
    const members: RosterMember[] = [
      { entryId: 'e1', userId: 's1', displayName: 'Diya Shah', isLeader: true, acceptedAt: ACCEPTED },
      {
        entryId: 'e1',
        userId: 's2',
        displayName: 'Aarav Mehta',
        isLeader: false,
        acceptedAt: ACCEPTED,
      },
      {
        entryId: 'e1',
        userId: null,
        displayName: 'priya.k@example.com',
        isLeader: false,
        acceptedAt: null,
      },
      { entryId: 'e2', userId: 's1', displayName: 'Diya Shah', isLeader: true, acceptedAt: ACCEPTED },
    ]
    const submissionByEntry = new Map<string, Record<string, unknown>>([
      ['e1', { title: 'My video' }],
      ['e2', { app_url: 'https://example.com' }],
    ])

    const profile = buildStudentProfile(me, entries, members, submissionByEntry)

    expect(profile.tracks.map((t) => t.track)).toEqual(['ai_for_impact', 'content_creator'])
    const cc = profile.tracks.find((t) => t.track === 'content_creator')
    expect(cc?.entryStatus).toBe('draft')
    expect(cc?.maxTeamSize).toBe(3)
    expect(cc?.submission).toEqual({ title: 'My video' })
    expect(cc?.team).toHaveLength(3)
    expect(cc?.team.find((m) => m.name === 'priya.k@example.com')?.acceptance).toBe(
      'unregistered_invite'
    )
    expect(cc?.team.find((m) => m.name === 'Aarav Mehta')?.acceptance).toBe('accepted')
  })

  it('returns an empty tracks array for a student with no ISC footprint', () => {
    const me = { id: 's1', name: 'Ishaan Kapoor', schoolClass: 'Class 8' }
    const profile = buildStudentProfile(me, [], [], new Map())
    expect(profile.tracks).toEqual([])
  })
})
