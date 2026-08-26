# ISC Admin Drill-Down Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/admin/isc`'s flat entry list and whole-cycle-only panels with a National → State → District → School breadcrumb drill-down, each level showing its own eligible→started→submitted funnel, and add a school-level student roster/profile plus cold-school/coordinator-coverage outreach lists.

**Architecture:** Four page files (national + three new nested dynamic routes) share one server-side data loader (`loadIscAdminData`) scoped by an optional `{state, district, schoolId}`, and one presentational shell. All aggregation is pure, synchronous TypeScript over already-fetched arrays — no new tables, no new RPCs, no new database round trips beyond scoping existing queries with an extra `.eq(...)`.

**Tech Stack:** Next.js 16 App Router (Server Components for pages, Client Components for interactive panels), Supabase (existing RLS, no schema changes), Vitest for unit tests, Tailwind v4 clay-card design system already used throughout `/admin`.

**Spec:** `docs/superpowers/specs/2026-08-26-isc-admin-drill-down-design.md`

## Global Constraints

- No new tables, columns, or RPCs — every read must already succeed today under existing RLS (`"Admins read all profiles"` on `user_profiles`, `"Admins manage schools"` on `schools`, admin's existing direct reads of `isc_entries`/`isc_entry_members`).
- "Started" means an **accepted** participant: the leader, or a teammate whose `accepted_at` is set. A member row with `user_id` set but `accepted_at` null is a pending invite (per `2026-08-26-isc-invite-acceptance-design.md`) and must never count as started, submitted, or as an accepted teammate anywhere in this feature.
- A declined invite has no residual row — `isc_respond_to_invite` deletes it. Never design for a `'declined'` state; only three member-row shapes exist: leader/accepted teammate (`accepted_at` set), awaiting-accept teammate (`user_id` set, `accepted_at` null), unregistered invite (`invited_email` set, `user_id` null).
- Filters (track/status/group/language/search) narrow **within** whatever scope (route) is current; scope changes only by navigating. The `district` query-string filter is removed — district is now a route segment.
- All aggregation functions are pure: plain arrays/maps in, plain data out, no `async`, no Supabase client passed in. This is the existing pattern in `src/lib/isc/analytics.ts` and every new function must match it exactly, so it stays independently unit-testable.
- Currency/日 formatting, IST day handling, track metadata, group metadata all already exist (`src/lib/isc/dates.ts`, `src/lib/isc/tracks.ts`, `src/lib/isc/groups.ts`) — reuse them, do not reimplement.

---

### Task 1: Funnel aggregation — `src/lib/isc/funnel.ts`

**Files:**
- Create: `src/lib/isc/funnel.ts`
- Test: `src/lib/isc/__tests__/funnel.test.ts`

**Interfaces:**
- Consumes: `AnalyticsEntry` from `src/lib/isc/analytics.ts` (`entryId`, `track`, `status` fields), `ISC_TRACKS`/`IscTrackId` from `src/lib/isc/tracks.ts`, `CountRow` from `src/lib/isc/analytics.ts`
- Produces: `EligibleStudent { id: string; schoolId: string | null }`, `FunnelMember { entryId: string; userId: string | null; isLeader: boolean; acceptedAt: string | null }`, `FunnelResult { eligible: number; started: number; submitted: number; activationRate: number; completionRate: number; byTrack: CountRow[] }`, `computeFunnel(eligible: EligibleStudent[], entries: AnalyticsEntry[], members: FunnelMember[]): FunnelResult` — consumed by Task 8/9's page files and Task 5's funnel panel.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/isc/__tests__/funnel.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- funnel.test.ts`
Expected: FAIL — `Cannot find module '../funnel'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/isc/funnel.ts
import { ISC_TRACKS, type IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry, CountRow } from '@/lib/isc/analytics'

/** One eligible student, already filtered to Classes 5-12 by the caller and
    already scoped (national/state/district/school) by whatever query built
    the array — this function does no further scoping of its own. */
export interface EligibleStudent {
  id: string
  schoolId: string | null
}

/** Enough of an isc_entry_members row to tell an accepted participant from a
    still-pending invite. */
export interface FunnelMember {
  entryId: string
  userId: string | null
  isLeader: boolean
  acceptedAt: string | null
}

export interface FunnelResult {
  eligible: number
  started: number
  submitted: number
  /** 0-100, rounded. 0 when there is nothing eligible to divide by. */
  activationRate: number
  /** 0-100, rounded. 0 when nobody has started. */
  completionRate: number
  /** Distinct started students per track. Does not sum to `started`: a
      student who started two tracks is counted once per track here, and
      once total in `started`. */
  byTrack: CountRow[]
}

/**
 * eligible -> started -> submitted, counted in students, not entries.
 *
 * "Started" means an accepted participant — the leader, or a teammate whose
 * invite has been accepted. A member row with `userId` set but `acceptedAt`
 * null is a pending invite, not a participant yet: counting it would say a
 * student "started" a track they have not actually agreed to join, and would
 * disagree with the roster, which shows that same student as "Invited,
 * awaiting response".
 */
export function computeFunnel(
  eligible: EligibleStudent[],
  entries: AnalyticsEntry[],
  members: FunnelMember[]
): FunnelResult {
  const eligibleIds = new Set(eligible.map((s) => s.id))
  const trackByEntry = new Map(entries.map((e) => [e.entryId, e.track]))
  const statusByEntry = new Map(entries.map((e) => [e.entryId, e.status]))

  const started = new Set<string>()
  const submitted = new Set<string>()
  const byTrackStarted = new Map<IscTrackId, Set<string>>()

  for (const m of members) {
    if (!m.userId || !eligibleIds.has(m.userId)) continue
    if (!m.isLeader && !m.acceptedAt) continue // pending invite, not a participant yet

    const track = trackByEntry.get(m.entryId)
    if (!track) continue

    started.add(m.userId)
    if (statusByEntry.get(m.entryId) === 'submitted') submitted.add(m.userId)

    let set = byTrackStarted.get(track)
    if (!set) {
      set = new Set()
      byTrackStarted.set(track, set)
    }
    set.add(m.userId)
  }

  const eligibleCount = eligible.length
  return {
    eligible: eligibleCount,
    started: started.size,
    submitted: submitted.size,
    activationRate: eligibleCount ? Math.round((started.size / eligibleCount) * 100) : 0,
    completionRate: started.size ? Math.round((submitted.size / started.size) * 100) : 0,
    byTrack: ISC_TRACKS.map((t) => ({
      label: t.name,
      count: byTrackStarted.get(t.id)?.size ?? 0,
    })),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- funnel.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/isc/funnel.ts src/lib/isc/__tests__/funnel.test.ts
git commit -m "feat: add ISC funnel aggregation (eligible/started/submitted)"
```

---

### Task 2: Roster + student profile aggregation — `src/lib/isc/roster.ts`

**Files:**
- Create: `src/lib/isc/roster.ts`
- Test: `src/lib/isc/__tests__/roster.test.ts`

**Interfaces:**
- Consumes: `AnalyticsEntry`, `ISC_TRACKS`, `trackById`, `IscTrackId` (same as Task 1)
- Produces: `RosterStudent { id: string; name: string; schoolClass: string | null }`, `MemberAcceptance = 'accepted' | 'awaiting_accept' | 'unregistered_invite'`, `RosterMember { entryId: string; userId: string | null; displayName: string; isLeader: boolean; acceptedAt: string | null }`, `RosterStatus` (discriminated union below), `RosterRow { studentId: string; name: string; schoolClass: string | null; status: RosterStatus }`, `ProfileTeamMember { name: string; isLeader: boolean; acceptance: MemberAcceptance }`, `ProfileTrackBlock { track: IscTrackId; trackName: string; entryStatus: string; submission: Record<string, unknown>; maxTeamSize: number; team: ProfileTeamMember[] }`, `StudentProfile { studentId: string; name: string; schoolClass: string | null; tracks: ProfileTrackBlock[] }`, `buildSchoolRoster(students, entries, members): RosterRow[]`, `buildStudentProfile(student, entries, members, submissionByEntry): StudentProfile` — consumed by Task 6's roster/profile components via Task 9's school page.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/isc/__tests__/roster.test.ts
import { describe, expect, it } from 'vitest'
import { buildSchoolRoster, buildStudentProfile, type RosterMember, type RosterStudent } from '../roster'
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

describe('buildSchoolRoster', () => {
  it('marks a student with no entry footprint as not started', () => {
    const rows = buildSchoolRoster([student('s1')], [], [])
    expect(rows[0].status).toEqual({ kind: 'not_started' })
  })

  it('marks a Puzzle-Master-style solo track (max team size 1) as solo, not team', () => {
    // Content Creator's maxTeamSize is 3 in this codebase, so use a 1-member
    // entry with no pending invites on a track that still allows more — this
    // is the "solo by choice" case, not "max size 1" (no enterable track here
    // actually caps at 1, so both branches of the solo condition are covered
    // by this and the next test).
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'draft')],
      [{ entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' }]
    )
    expect(rows[0].status).toEqual({ kind: 'solo', entryStatus: 'draft' })
  })

  it('marks a 1-member entry with a pending invite as a forming team, not solo', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'draft')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
        { entryId: 'e1', userId: 's2', displayName: 'Invitee', isLeader: false, acceptedAt: null },
      ]
    )
    expect(rows[0].status).toEqual({ kind: 'team', size: 1, maxSize: 3, entryStatus: 'draft' })
  })

  it('marks an accepted multi-member team correctly, excluding the pending invite from the count', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'content_creator', 'submitted')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
        { entryId: 'e1', userId: 's2', displayName: 'Mate', isLeader: false, acceptedAt: '2026-08-01T00:00:00Z' },
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
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
        { entryId: 'e2', userId: 's1', displayName: 'Student', isLeader: false, acceptedAt: null },
      ]
    )
    expect(rows[0].status).toMatchObject({ kind: 'solo', entryStatus: 'submitted' })
  })

  it('prefers a submitted entry over a draft entry when a student has accepted both', () => {
    const rows = buildSchoolRoster(
      [student('s1')],
      [entry('e1', 'ai_for_impact', 'draft'), entry('e2', 'content_creator', 'submitted')],
      [
        { entryId: 'e1', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
        { entryId: 'e2', userId: 's1', displayName: 'Student', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
      ]
    )
    expect(rows[0].status).toMatchObject({ entryStatus: 'submitted' })
  })
})

describe('buildStudentProfile', () => {
  it('returns one block per track the student touches, sorted by track order, each with its team', () => {
    const student = { id: 's1', name: 'Diya Shah', schoolClass: 'Class 7' }
    const entries = [entry('e1', 'content_creator', 'draft'), entry('e2', 'ai_for_impact', 'submitted')]
    const members: RosterMember[] = [
      { entryId: 'e1', userId: 's1', displayName: 'Diya Shah', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
      { entryId: 'e1', userId: 's2', displayName: 'Aarav Mehta', isLeader: false, acceptedAt: '2026-08-01T00:00:00Z' },
      { entryId: 'e1', userId: null, displayName: 'priya.k@example.com', isLeader: false, acceptedAt: null },
      { entryId: 'e2', userId: 's1', displayName: 'Diya Shah', isLeader: true, acceptedAt: '2026-08-01T00:00:00Z' },
    ]
    const submissionByEntry = new Map([
      ['e1', { title: 'My video' }],
      ['e2', { app_url: 'https://example.com' }],
    ])

    const profile = buildStudentProfile(student, entries, members, submissionByEntry)

    expect(profile.tracks.map((t) => t.track)).toEqual(['ai_for_impact', 'content_creator'])
    const cc = profile.tracks.find((t) => t.track === 'content_creator')
    expect(cc?.entryStatus).toBe('draft')
    expect(cc?.maxTeamSize).toBe(3)
    expect(cc?.submission).toEqual({ title: 'My video' })
    expect(cc?.team).toHaveLength(3)
    expect(cc?.team.find((m) => m.name === 'priya.k@example.com')?.acceptance).toBe('unregistered_invite')
    expect(cc?.team.find((m) => m.name === 'Aarav Mehta')?.acceptance).toBe('accepted')
  })

  it('returns an empty tracks array for a student with no ISC footprint', () => {
    const student = { id: 's1', name: 'Ishaan Kapoor', schoolClass: 'Class 8' }
    const profile = buildStudentProfile(student, [], [], new Map())
    expect(profile.tracks).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- roster.test.ts`
Expected: FAIL — `Cannot find module '../roster'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/isc/roster.ts
import { ISC_TRACKS, trackById, type IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry } from '@/lib/isc/analytics'

export interface RosterStudent {
  id: string
  name: string
  schoolClass: string | null
}

/**
 * Which of the three real states (per `2026-08-26-isc-invite-acceptance-design.md`)
 * a member row is in. There is no fourth "declined" state — declining an
 * invite deletes the row outright.
 */
export type MemberAcceptance = 'accepted' | 'awaiting_accept' | 'unregistered_invite'

/** Enough of an isc_entry_members row to build both the roster chip and the
    full student profile. `displayName` is the resolved account name, or the
    raw invited email when there is no account yet. */
export interface RosterMember {
  entryId: string
  userId: string | null
  displayName: string
  isLeader: boolean
  acceptedAt: string | null
}

export type RosterStatus =
  | { kind: 'not_started' }
  | { kind: 'invited' }
  | { kind: 'solo'; entryStatus: string }
  | { kind: 'team'; size: number; maxSize: number; entryStatus: string }

export interface RosterRow {
  studentId: string
  name: string
  schoolClass: string | null
  status: RosterStatus
}

export interface ProfileTeamMember {
  name: string
  isLeader: boolean
  acceptance: MemberAcceptance
}

export interface ProfileTrackBlock {
  track: IscTrackId
  trackName: string
  entryStatus: string
  submission: Record<string, unknown>
  maxTeamSize: number
  team: ProfileTeamMember[]
}

export interface StudentProfile {
  studentId: string
  name: string
  schoolClass: string | null
  tracks: ProfileTrackBlock[]
}

const TRACK_ORDER = new Map(ISC_TRACKS.map((t, i) => [t.id, i]))

function acceptance(m: RosterMember): MemberAcceptance {
  if (!m.userId) return 'unregistered_invite'
  if (m.isLeader || m.acceptedAt) return 'accepted'
  return 'awaiting_accept'
}

function groupByEntry(members: RosterMember[]): Map<string, RosterMember[]> {
  const map = new Map<string, RosterMember[]>()
  for (const m of members) {
    const list = map.get(m.entryId) ?? []
    list.push(m)
    map.set(m.entryId, list)
  }
  return map
}

/**
 * Every eligible student at one school, each with the single status chip the
 * roster row shows for them.
 *
 * A student with any accepted participation (leader or accepted teammate) is
 * shown by their single "best" entry — submitted beats draft, ties broken by
 * track order — even if they also hold a merely-pending invite elsewhere;
 * accepted participation always outranks a pending invite. Only a student
 * with nothing but pending invites shows as "invited", and a student with
 * neither shows as "not started".
 */
export function buildSchoolRoster(
  students: RosterStudent[],
  entries: AnalyticsEntry[],
  members: RosterMember[]
): RosterRow[] {
  const entryById = new Map(entries.map((e) => [e.entryId, e]))
  const membersByEntry = groupByEntry(members)

  return students.map((s) => {
    const own = members.filter((m) => m.userId === s.id)
    const accepted = own.filter((m) => acceptance(m) === 'accepted')
    const pending = own.filter((m) => acceptance(m) === 'awaiting_accept')

    if (accepted.length > 0) {
      const best = accepted
        .map((m) => entryById.get(m.entryId))
        .filter((e): e is AnalyticsEntry => Boolean(e))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'submitted' ? -1 : 1
          return (TRACK_ORDER.get(a.track) ?? 0) - (TRACK_ORDER.get(b.track) ?? 0)
        })[0]

      if (best) {
        const entryMembers = membersByEntry.get(best.entryId) ?? []
        const teamSize = entryMembers.filter((m) => acceptance(m) === 'accepted').length
        const maxSize = trackById(best.track)?.maxTeamSize ?? teamSize
        const hasPendingInvite = entryMembers.some((m) => acceptance(m) === 'awaiting_accept')

        const status: RosterStatus =
          maxSize === 1 || (teamSize === 1 && !hasPendingInvite)
            ? { kind: 'solo', entryStatus: best.status }
            : { kind: 'team', size: teamSize, maxSize, entryStatus: best.status }

        return { studentId: s.id, name: s.name, schoolClass: s.schoolClass, status }
      }
    }

    if (pending.length > 0) {
      return { studentId: s.id, name: s.name, schoolClass: s.schoolClass, status: { kind: 'invited' } }
    }

    return { studentId: s.id, name: s.name, schoolClass: s.schoolClass, status: { kind: 'not_started' } }
  })
}

/**
 * Every track a student touches in any role — leader, accepted teammate, or
 * pending invitee — each with entry status, submission, and the full team
 * roster with every teammate's real acceptance state.
 */
export function buildStudentProfile(
  student: RosterStudent,
  entries: AnalyticsEntry[],
  members: RosterMember[],
  submissionByEntry: Map<string, Record<string, unknown>>
): StudentProfile {
  const entryById = new Map(entries.map((e) => [e.entryId, e]))
  const membersByEntry = groupByEntry(members)
  const ownEntryIds = new Set(members.filter((m) => m.userId === student.id).map((m) => m.entryId))

  const tracks: ProfileTrackBlock[] = [...ownEntryIds]
    .map((entryId) => entryById.get(entryId))
    .filter((e): e is AnalyticsEntry => Boolean(e))
    .sort((a, b) => (TRACK_ORDER.get(a.track) ?? 0) - (TRACK_ORDER.get(b.track) ?? 0))
    .map((e) => ({
      track: e.track,
      trackName: trackById(e.track)?.name ?? e.track,
      entryStatus: e.status,
      submission: submissionByEntry.get(e.entryId) ?? {},
      maxTeamSize: trackById(e.track)?.maxTeamSize ?? 1,
      team: (membersByEntry.get(e.entryId) ?? []).map((m) => ({
        name: m.displayName,
        isLeader: m.isLeader,
        acceptance: acceptance(m),
      })),
    }))

  return { studentId: student.id, name: student.name, schoolClass: student.schoolClass, tracks }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- roster.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/isc/roster.ts src/lib/isc/__tests__/roster.test.ts
git commit -m "feat: add ISC school roster and student profile aggregation"
```

---

### Task 3: Outreach aggregation — `src/lib/isc/outreach.ts`

**Files:**
- Create: `src/lib/isc/outreach.ts`
- Test: `src/lib/isc/__tests__/outreach.test.ts`

**Interfaces:**
- Consumes: `AnalyticsEntry`, `CountRow` (from `analytics.ts`)
- Produces: `SchoolWithCoordinator { schoolId: string; schoolName: string; state: string; district: string; coordinatorStatus: string }`, `ColdSchoolRow { schoolId: string; schoolName: string; state: string; district: string; eligibleCount: number; coordinatorStatus: string }`, `coldSchools(schools, entries, eligibleBySchool, limit = 50): ColdSchoolRow[]`, `coordinatorCoverage(schools: SchoolWithCoordinator[]): CountRow[]` — consumed by Task 7's outreach panel via Task 8/9's page files.

Note the `limit` parameter: at national scope, "schools with zero ISC starts" can run into the thousands (the CBSE register alone is on the order of 32,000 schools, per `0045_schools.sql`'s own `get_school_districts` comment about not dragging all of them to a client). Capped at 50 by default, ranked by eligible-student count so the biggest missed opportunity is never cut off — this mirrors `topSchools`'s existing `limit = 10` in `analytics.ts`. The full, unbounded set is still computed for the sort; only the returned slice is capped, so `coldSchools(...).length === limit` is a legitimate outcome the caller must handle by saying so in the UI, not by treating it as the whole list.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/isc/__tests__/outreach.test.ts
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
      [school({ schoolId: 's1', schoolName: 'Small' }), school({ schoolId: 's2', schoolName: 'Big' })],
      [],
      new Map([['s1', 5], ['s2', 40]])
    )
    expect(rows.map((r) => r.schoolName)).toEqual(['Big', 'Small'])
  })

  it('caps the returned list at the given limit', () => {
    const schools = Array.from({ length: 5 }, (_, i) => school({ schoolId: `s${i}`, schoolName: `S${i}` }))
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- outreach.test.ts`
Expected: FAIL — `Cannot find module '../outreach'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/isc/outreach.ts
import type { AnalyticsEntry, CountRow } from '@/lib/isc/analytics'

export interface SchoolWithCoordinator {
  schoolId: string
  schoolName: string
  state: string
  district: string
  /** 'none' | 'pending' | 'approved' | 'rejected', per schools.coordinator_status. */
  coordinatorStatus: string
}

export interface ColdSchoolRow {
  schoolId: string
  schoolName: string
  state: string
  district: string
  eligibleCount: number
  coordinatorStatus: string
}

/**
 * Schools with at least one eligible student account but zero ISC starts.
 * Schools with no student accounts at all are excluded — that is an
 * onboarding gap this list cannot act on, not an outreach opportunity.
 *
 * Capped at `limit`, ranked by eligible count, so the biggest missed
 * opportunity is never cut off by an arbitrary earlier sort. The caller must
 * say so in the UI when the result is exactly `limit` long.
 */
export function coldSchools(
  schools: SchoolWithCoordinator[],
  entries: AnalyticsEntry[],
  eligibleBySchool: Map<string, number>,
  limit = 50
): ColdSchoolRow[] {
  const schoolsWithStarts = new Set(entries.map((e) => e.schoolId))
  return schools
    .filter((s) => (eligibleBySchool.get(s.schoolId) ?? 0) > 0)
    .filter((s) => !schoolsWithStarts.has(s.schoolId))
    .map((s) => ({
      schoolId: s.schoolId,
      schoolName: s.schoolName,
      state: s.state,
      district: s.district,
      eligibleCount: eligibleBySchool.get(s.schoolId) ?? 0,
      coordinatorStatus: s.coordinatorStatus,
    }))
    .sort((a, b) => b.eligibleCount - a.eligibleCount || a.schoolName.localeCompare(b.schoolName))
    .slice(0, limit)
}

/** Every school in scope, split by coordinator_status, in a fixed reading order. */
export function coordinatorCoverage(schools: SchoolWithCoordinator[]): CountRow[] {
  const acc = new Map<string, number>()
  for (const s of schools) {
    const label = s.coordinatorStatus || 'none'
    acc.set(label, (acc.get(label) ?? 0) + 1)
  }
  return (['none', 'pending', 'approved', 'rejected'] as const)
    .filter((label) => acc.has(label))
    .map((label) => ({ label, count: acc.get(label) ?? 0 }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- outreach.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/isc/outreach.ts src/lib/isc/__tests__/outreach.test.ts
git commit -m "feat: add ISC cold-schools and coordinator-coverage aggregation"
```

---

### Task 4: District comparison — `byDistrict` in `src/lib/isc/analytics.ts`

**Files:**
- Modify: `src/lib/isc/analytics.ts`
- Test: `src/lib/isc/__tests__/analytics.test.ts`

**Interfaces:**
- Produces: `DistrictRow { district: string; state: string; schools: number; entries: number; submitted: number }`, `byDistrict(entries: AnalyticsEntry[]): DistrictRow[]` — consumed by Task 5's comparison chart at state scope.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/isc/__tests__/analytics.test.ts`, after the existing `byState` describe block:

```typescript
import { byDistrict } from '../analytics'
// (add byDistrict to the existing import statement at the top of the file
// instead of a second import line — the existing import already lists
// topSchools, byState, byBoard, byGroup, classDistribution,
// submissionTimeline, staleDrafts)

describe('byDistrict', () => {
  it('counts distinct schools, entries and submissions per district', () => {
    const rows = byDistrict([
      entry({ entryId: 'a', schoolId: 's1', district: 'Pune' }),
      entry({ entryId: 'b', schoolId: 's2', district: 'Pune', status: 'draft' }),
      entry({ entryId: 'c', schoolId: 's3', district: 'Nashik' }),
    ])
    expect(rows[0]).toEqual({ district: 'Pune', state: 'Delhi', schools: 2, entries: 2, submitted: 1 })
    expect(rows[1]).toEqual({ district: 'Nashik', state: 'Delhi', schools: 1, entries: 1, submitted: 1 })
  })

  it('labels a missing district rather than dropping the entry', () => {
    const rows = byDistrict([entry({ district: '' })])
    expect(rows[0].district).toBe('Unknown')
  })
})
```

(The `entry()` helper's default `state: 'Delhi'` from the existing test file is intentionally left as-is here — `byDistrict` groups on `district`, and `state` on the returned row is just carried from whichever entry landed in that district group first, matching how `byState`'s own tests do not vary `state` either.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- analytics.test.ts`
Expected: FAIL — `byDistrict is not exported`

- [ ] **Step 3: Write the implementation**

Add to `src/lib/isc/analytics.ts`, directly after the existing `byState` function:

```typescript
export interface DistrictRow {
  district: string
  state: string
  schools: number
  entries: number
  submitted: number
}

/** District comparison chart within a state — the same shape as byState,
    one level down. */
export function byDistrict(entries: AnalyticsEntry[]): DistrictRow[] {
  const acc = new Map<string, DistrictRow & { schoolSet: Set<string> }>()

  for (const e of entries) {
    const district = e.district || 'Unknown'
    let row = acc.get(district)
    if (!row) {
      row = { district, state: e.state, schools: 0, entries: 0, submitted: 0, schoolSet: new Set<string>() }
      acc.set(district, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    row.schoolSet.add(e.schoolId)
  }

  return [...acc.values()]
    .map(({ schoolSet, ...row }) => ({ ...row, schools: schoolSet.size }))
    .sort((a, b) => b.entries - a.entries || a.district.localeCompare(b.district))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- analytics.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/isc/analytics.ts src/lib/isc/__tests__/analytics.test.ts
git commit -m "feat: add byDistrict aggregation for the state-level comparison chart"
```

---

### Task 5: Shared data loader — `src/lib/isc/admin-data.ts`

**Files:**
- Create: `src/lib/isc/admin-data.ts`

**Interfaces:**
- Consumes: `EligibleStudent`, `FunnelMember` (Task 1); `RosterStudent`, `RosterMember` (Task 2); `SchoolWithCoordinator` (Task 3); `AnalyticsEntry`, `IscTrackId`; `isEligibleClass` from `src/lib/isc/validate.ts`
- Produces: `IscScope { state?: string; district?: string; schoolId?: string }`, `IscAdminData { entries: AnalyticsEntry[]; submissionByEntry: Map<string, Record<string, unknown>>; funnelMembers: FunnelMember[]; rosterMembers: RosterMember[]; eligible: EligibleStudent[]; eligibleBySchool: Map<string, number>; rosterStudents: RosterStudent[]; schools: SchoolWithCoordinator[]; classByStudent: Map<string, string | null> }`, `loadIscAdminData(supabase, scope): Promise<IscAdminData>` — consumed by all four page files (Task 8, Task 9).

This is the one piece of async, Supabase-touching code in the whole feature — every aggregation function above and every component below stays pure. Centralising the fetch here means the four page files differ only in which `scope` they pass, matching the spec's "no route-specific aggregation logic, only route-specific fetch scoping."

No unit test for this task: it is a thin data-shaping layer over live Supabase queries with no branching logic of its own worth isolating — the aggregation functions it feeds already have full unit coverage, and its own correctness is verified by the manual browser pass in Task 9.

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/isc/admin-data.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { isEligibleClass } from '@/lib/isc/validate'
import type { IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import type { EligibleStudent, FunnelMember } from '@/lib/isc/funnel'
import type { RosterStudent, RosterMember } from '@/lib/isc/roster'
import type { SchoolWithCoordinator } from '@/lib/isc/outreach'

export interface IscScope {
  state?: string
  district?: string
  schoolId?: string
}

export interface IscAdminData {
  entries: AnalyticsEntry[]
  submissionByEntry: Map<string, Record<string, unknown>>
  funnelMembers: FunnelMember[]
  rosterMembers: RosterMember[]
  eligible: EligibleStudent[]
  eligibleBySchool: Map<string, number>
  /** Only meaningful (and only fetched with names worth showing) at school
      scope — the roster component is the only consumer. */
  rosterStudents: RosterStudent[]
  schools: SchoolWithCoordinator[]
  classByStudent: Map<string, string | null>
}

/**
 * Everything a drill-down page at one scope needs, in four queries: schools
 * in scope, eligible students in scope, entries at those schools, and the
 * members of those entries. Every query is scoped by the same `IscScope`, so
 * national is simply `{}` and each nested level adds one more `.eq(...)`.
 *
 * No new RPCs: every table read here already succeeds for an admin under
 * existing RLS ("Admins read all profiles" on user_profiles, "Admins manage
 * schools" on schools), the same as the admin ISC page already reads
 * isc_entries and isc_entry_members directly today.
 */
export async function loadIscAdminData(
  supabase: SupabaseClient,
  scope: IscScope
): Promise<IscAdminData> {
  let schoolQuery = supabase
    .from('schools')
    .select('id, name, state, district, board, coordinator_status')
  if (scope.state) schoolQuery = schoolQuery.eq('state', scope.state)
  if (scope.district) schoolQuery = schoolQuery.eq('district', scope.district)
  if (scope.schoolId) schoolQuery = schoolQuery.eq('id', scope.schoolId)
  const { data: schoolRows } = await schoolQuery

  const schools: SchoolWithCoordinator[] = (schoolRows ?? []).map((s) => ({
    schoolId: s.id,
    schoolName: s.name,
    state: s.state,
    district: s.district,
    coordinatorStatus: s.coordinator_status,
  }))
  const schoolIds = schools.map((s) => s.schoolId)
  const schoolById = new Map(schools.map((s) => [s.schoolId, s]))

  let profileQuery = supabase
    .from('user_profiles')
    .select('id, full_name, school_class, school_id, school_state, school_district')
    .eq('role', 'student')
  if (scope.state) profileQuery = profileQuery.eq('school_state', scope.state)
  if (scope.district) profileQuery = profileQuery.eq('school_district', scope.district)
  if (scope.schoolId) profileQuery = profileQuery.eq('school_id', scope.schoolId)
  const { data: profileRows } = await profileQuery

  const eligibleProfiles = (profileRows ?? []).filter((p) => isEligibleClass(p.school_class))

  const eligible: EligibleStudent[] = eligibleProfiles.map((p) => ({
    id: p.id,
    schoolId: p.school_id,
  }))
  const eligibleBySchool = new Map<string, number>()
  for (const p of eligibleProfiles) {
    if (!p.school_id) continue
    eligibleBySchool.set(p.school_id, (eligibleBySchool.get(p.school_id) ?? 0) + 1)
  }
  const classByStudent = new Map<string, string | null>(
    eligibleProfiles.map((p) => [p.id, p.school_class ?? null])
  )
  const rosterStudents: RosterStudent[] = eligibleProfiles.map((p) => ({
    id: p.id,
    name: p.full_name ?? 'Unnamed student',
    schoolClass: p.school_class ?? null,
  }))

  const { data: entryRows } = schoolIds.length
    ? await supabase
        .from('isc_entries')
        .select('id, track, status, submitted_at, updated_at, submission, school_id')
        .in('school_id', schoolIds)
    : { data: [] }
  const entryList = entryRows ?? []

  const { data: memberRows } = entryList.length
    ? await supabase
        .from('isc_entry_members')
        .select('entry_id, user_id, invited_email, is_leader, accepted_at')
        .in(
          'entry_id',
          entryList.map((e) => e.id)
        )
    : { data: [] }
  const members = memberRows ?? []

  const participantIds = [
    ...new Set(members.map((m) => m.user_id).filter((id): id is string => Boolean(id))),
  ]
  const { data: nameRows } = participantIds.length
    ? await supabase.from('user_profiles').select('id, full_name').in('id', participantIds)
    : { data: [] }
  const nameById = new Map((nameRows ?? []).map((r) => [r.id, r.full_name]))

  const studentIdsByEntry = new Map<string, string[]>()
  const leaderUserIdByEntry = new Map<string, string | null>()
  for (const m of members) {
    if (m.user_id) {
      const list = studentIdsByEntry.get(m.entry_id) ?? []
      list.push(m.user_id)
      studentIdsByEntry.set(m.entry_id, list)
    }
    if (m.is_leader) leaderUserIdByEntry.set(m.entry_id, m.user_id)
  }

  const entries: AnalyticsEntry[] = entryList.map((e) => {
    const school = schoolById.get(e.school_id)
    const leaderId = leaderUserIdByEntry.get(e.id)
    return {
      entryId: e.id,
      track: e.track as IscTrackId,
      status: e.status,
      schoolId: e.school_id,
      schoolName: school?.schoolName ?? 'Unknown school',
      state: school?.state ?? '',
      district: school?.district ?? '',
      board: school?.board ?? '',
      submittedAt: e.submitted_at,
      updatedAt: e.updated_at,
      studentIds: studentIdsByEntry.get(e.id) ?? [],
      leaderClass: leaderId ? (classByStudent.get(leaderId) ?? null) : null,
    }
  })

  const submissionByEntry = new Map<string, Record<string, unknown>>(
    entryList.map((e) => [e.id, e.submission ?? {}])
  )

  const funnelMembers: FunnelMember[] = members.map((m) => ({
    entryId: m.entry_id,
    userId: m.user_id,
    isLeader: m.is_leader,
    acceptedAt: m.accepted_at,
  }))

  const rosterMembers: RosterMember[] = members.map((m) => ({
    entryId: m.entry_id,
    userId: m.user_id,
    displayName: m.user_id
      ? (nameById.get(m.user_id) ?? 'Unnamed student')
      : (m.invited_email ?? 'Pending invite'),
    isLeader: m.is_leader,
    acceptedAt: m.accepted_at,
  }))

  return {
    entries,
    submissionByEntry,
    funnelMembers,
    rosterMembers,
    eligible,
    eligibleBySchool,
    rosterStudents,
    schools,
    classByStudent,
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors from `src/lib/isc/admin-data.ts` (Task 8 will exercise this against real data; this step only confirms the types line up with Tasks 1–3's exports)

- [ ] **Step 3: Commit**

```bash
git add src/lib/isc/admin-data.ts
git commit -m "feat: add shared scoped data loader for ISC admin drill-down pages"
```

---

### Task 6: Presentational shell — breadcrumb, funnel panel, comparison chart

**Files:**
- Create: `src/components/admin/isc-breadcrumb.tsx`
- Create: `src/components/admin/isc-funnel-panel.tsx`
- Create: `src/components/admin/isc-comparison-chart.tsx`

**Interfaces:**
- Consumes: `FunnelResult` (Task 1), `StateRow`/`DistrictRow`/`SchoolRow` (existing `analytics.ts` + Task 4)
- Produces: `<IscBreadcrumb segments={[{label, href}]} current={label} />`, `<IscFunnelPanel funnel={FunnelResult} />`, `<IscComparisonChart title sub rows={{label, count, href}[]} />` — consumed by Task 8/9's page files.

No unit tests: these are pure presentational components with no branching worth isolating from their render output; correctness is verified visually in the Task 9 manual browser pass, same as `isc-stats.tsx`/`isc-insights.tsx` have never had component tests.

- [ ] **Step 1: Write `isc-breadcrumb.tsx`**

```tsx
// src/components/admin/isc-breadcrumb.tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbSegment {
  label: string
  href: string
}

/** National / Maharashtra / Pune / DAV Public School — every segment but the
    last links back up one level. */
export function IscBreadcrumb({
  segments,
  current,
}: {
  segments: BreadcrumbSegment[]
  current: string
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm flex-wrap">
      {segments.map((s) => (
        <span key={s.href} className="flex items-center gap-1.5">
          <Link href={s.href} className="text-muted hover:text-foreground font-medium">
            {s.label}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted/50" />
        </span>
      ))}
      <span className="font-semibold text-foreground">{current}</span>
    </nav>
  )
}
```

- [ ] **Step 2: Write `isc-funnel-panel.tsx`**

```tsx
// src/components/admin/isc-funnel-panel.tsx
import type { FunnelResult } from '@/lib/isc/funnel'

function Tile({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent: string }) {
  return (
    <div className="clay-card p-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

/** eligible -> started -> submitted for whatever scope is current, plus a
    per-track breakdown that deliberately does not sum to the headline. */
export function IscFunnelPanel({ funnel }: { funnel: FunnelResult }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-3">
        <Tile label="Eligible" value={funnel.eligible} sub="Classes 5–12" accent="text-foreground" />
        <Tile
          label="Started"
          value={funnel.started}
          sub={`${funnel.activationRate}% activation`}
          accent="text-primary"
        />
        <Tile
          label="Submitted"
          value={funnel.submitted}
          sub={`${funnel.completionRate}% completion`}
          accent="text-green-700"
        />
      </div>
      <div className="clay-card p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">By track</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
          {funnel.byTrack.map((t) => (
            <span key={t.label}>
              {t.label}: <span className="font-semibold">{t.count}</span>
            </span>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-2">
          A student who started more than one track is counted once per track here, so these do not
          add up to Started above.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `isc-comparison-chart.tsx`**

```tsx
// src/components/admin/isc-comparison-chart.tsx
'use client'

import Link from 'next/link'

export interface ComparisonRow {
  label: string
  count: number
  href: string
}

/** State bars nationally, district bars within a state, school bars within a
    district — every bar links one level down. */
export function IscComparisonChart({
  title,
  sub,
  rows,
}: {
  title: string
  sub: string
  rows: ComparisonRow[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="clay-card p-5">
      <h2 className="font-display font-bold text-foreground text-sm">{title}</h2>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted mt-3">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex items-center justify-between text-xs gap-3 group"
              >
                <span className="text-foreground font-medium group-hover:underline">{r.label}</span>
                <span className="text-muted tabular-nums shrink-0">{r.count}</span>
              </Link>
              <div className="h-1.5 rounded-full bg-black/[0.05] mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/isc-breadcrumb.tsx src/components/admin/isc-funnel-panel.tsx src/components/admin/isc-comparison-chart.tsx
git commit -m "feat: add ISC drill-down shell components (breadcrumb, funnel panel, comparison chart)"
```

---

### Task 7: Roster and student profile components

**Files:**
- Create: `src/components/admin/isc-roster.tsx`
- Create: `src/components/admin/isc-student-profile.tsx`

**Interfaces:**
- Consumes: `RosterRow`, `RosterStatus`, `StudentProfile`, `ProfileTrackBlock` (Task 2)
- Produces: `<IscRoster rows={RosterRow[]} students={RosterStudent[]} entries={AnalyticsEntry[]} members={RosterMember[]} submissionByEntry={Map} />` (client component, builds the selected student's profile on click via `buildStudentProfile` — no extra fetch, everything needed is already on the page) — consumed by Task 9's school page.

No unit tests: `buildSchoolRoster`/`buildStudentProfile` already carry full unit coverage from Task 2; this task is purely how that data renders, verified in the Task 9 manual browser pass.

- [ ] **Step 1: Write `isc-student-profile.tsx`**

```tsx
// src/components/admin/isc-student-profile.tsx
'use client'

import { ExternalLink, X } from 'lucide-react'
import { TRACK_FIELDS } from '@/lib/isc/tracks'
import type { StudentProfile } from '@/lib/isc/roster'

function isUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

const ACCEPTANCE_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  awaiting_accept: 'Invited — waiting for them to accept',
  unregistered_invite: 'Not registered yet — invite sent',
}

export function IscStudentProfile({
  profile,
  onClose,
}: {
  profile: StudentProfile
  onClose: () => void
}) {
  return (
    <div className="clay-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-foreground text-lg">{profile.name}</h2>
          <p className="text-sm text-muted mt-0.5">{profile.schoolClass ?? 'Class not set'}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="w-8 h-8 rounded-lg hover:bg-black/[0.04] flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {profile.tracks.length === 0 ? (
        <p className="text-sm text-muted">Not started any ISC track.</p>
      ) : (
        profile.tracks.map((block) => (
          <div key={block.track} className="rounded-xl bg-black/[0.02] p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-bold text-foreground text-sm">{block.trackName}</h3>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  block.entryStatus === 'submitted'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-black/[0.05] text-muted'
                }`}
              >
                {block.entryStatus === 'submitted' ? 'Submitted' : 'Draft'}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Team ({block.team.filter((m) => m.acceptance === 'accepted').length} of{' '}
                {block.maxTeamSize})
              </p>
              <ul className="space-y-1">
                {block.team.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="text-xs text-foreground flex items-center gap-2">
                    <span className="font-medium">
                      {m.name}
                      {m.isLeader && ' (leader)'}
                    </span>
                    <span className="text-muted">— {ACCEPTANCE_LABEL[m.acceptance]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              {TRACK_FIELDS[block.track].map((spec) => {
                const raw = block.submission?.[spec.key]
                const value = typeof raw === 'string' ? raw : ''
                return (
                  <div key={spec.key}>
                    <dt className="text-xs font-semibold text-muted uppercase tracking-wide">
                      {spec.label}
                    </dt>
                    <dd className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                      {!value ? (
                        <span className="text-muted">Not filled in</span>
                      ) : isUrl(value) ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {value}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `isc-roster.tsx`**

```tsx
// src/components/admin/isc-roster.tsx
'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { buildStudentProfile, type RosterMember, type RosterRow, type RosterStudent } from '@/lib/isc/roster'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import { IscStudentProfile } from '@/components/admin/isc-student-profile'

function chipLabel(row: RosterRow): { text: string; tone: string } {
  switch (row.status.kind) {
    case 'not_started':
      return { text: 'Not started', tone: 'bg-black/[0.05] text-muted' }
    case 'invited':
      return { text: 'Invited · Awaiting response', tone: 'bg-accent-yellow/15 text-accent-yellow' }
    case 'solo':
      return {
        text: `Solo entry · ${row.status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'}`,
        tone: row.status.entryStatus === 'submitted' ? 'bg-primary/10 text-primary' : 'bg-black/[0.05] text-muted',
      }
    case 'team':
      return {
        text: `Team of ${row.status.size}/${row.status.maxSize} · ${
          row.status.entryStatus === 'submitted' ? 'Submitted' : 'Draft'
        }`,
        tone: row.status.entryStatus === 'submitted' ? 'bg-primary/10 text-primary' : 'bg-black/[0.05] text-muted',
      }
  }
}

/** Every eligible student at one school, with a status chip and a click-through
    profile — the direct fix for "admin can't tell if a student is solo or
    still waiting on a team". */
export function IscRoster({
  rows,
  students,
  entries,
  members,
  submissionByEntry,
}: {
  rows: RosterRow[]
  students: RosterStudent[]
  entries: AnalyticsEntry[]
  members: RosterMember[]
  submissionByEntry: Map<string, Record<string, unknown>>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const studentById = new Map(students.map((s) => [s.id, s]))

  if (selectedId) {
    const student = studentById.get(selectedId)
    if (student) {
      const profile = buildStudentProfile(student, entries, members, submissionByEntry)
      return <IscStudentProfile profile={profile} onClose={() => setSelectedId(null)} />
    }
  }

  return (
    <div className="clay-card divide-y divide-black/[0.06]">
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-muted text-center">No eligible students at this school yet.</p>
      ) : (
        rows.map((row) => {
          const chip = chipLabel(row)
          return (
            <button
              key={row.studentId}
              type="button"
              onClick={() => setSelectedId(row.studentId)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-black/[0.02]"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{row.name}</span>
                <span className="block text-xs text-muted">{row.schoolClass ?? 'Class not set'}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${chip.tone}`}>
                  {chip.text}
                </span>
                <ChevronRight className="w-4 h-4 text-muted" />
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/isc-roster.tsx src/components/admin/isc-student-profile.tsx
git commit -m "feat: add ISC school-level student roster and profile view"
```

---

### Task 8: Outreach panel component

**Files:**
- Create: `src/components/admin/isc-outreach.tsx`

**Interfaces:**
- Consumes: `ColdSchoolRow`, `CountRow` (Task 3), `toCsv` from `src/lib/isc/csv.ts`
- Produces: `<IscOutreach coldSchools={ColdSchoolRow[]} coordinatorCoverage={CountRow[]} coldSchoolsCapped={boolean} filenamePrefix={string} />` — consumed by Task 9's national/state/district pages.

No unit test: the CSV shape it downloads is exercised in the Task 9 manual browser pass (`toCsv` itself already has its own unit tests in `src/lib/isc/__tests__/csv.test.ts`, unaffected by this task).

- [ ] **Step 1: Write the implementation**

```tsx
// src/components/admin/isc-outreach.tsx
'use client'

import { Download } from 'lucide-react'
import { toCsv } from '@/lib/isc/csv'
import type { ColdSchoolRow } from '@/lib/isc/outreach'
import type { CountRow } from '@/lib/isc/analytics'

const COORDINATOR_LABEL: Record<string, string> = {
  none: 'No coordinator',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

function downloadColdSchools(rows: ColdSchoolRow[], filenamePrefix: string) {
  const csv = toCsv(
    ['School', 'State', 'District', 'Eligible students', 'Coordinator status'],
    rows.map((r) => [r.schoolName, r.state, r.district, r.eligibleCount, r.coordinatorStatus])
  )
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}-cold-schools.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Cold schools and coordinator coverage, side by side — the correlation
    between "nobody has entered" and "nobody is coordinating" is meant to be
    visible without a separate stat. */
export function IscOutreach({
  coldSchools,
  coordinatorCoverage,
  coldSchoolsCapped,
  filenamePrefix,
}: {
  coldSchools: ColdSchoolRow[]
  coordinatorCoverage: CountRow[]
  coldSchoolsCapped: boolean
  filenamePrefix: string
}) {
  const totalCoordinated = coordinatorCoverage.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="clay-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-foreground text-sm">Cold schools</h2>
            <p className="text-xs text-muted mt-0.5">Eligible students, zero ISC starts</p>
          </div>
          <button
            type="button"
            onClick={() => downloadColdSchools(coldSchools, filenamePrefix)}
            disabled={coldSchools.length === 0}
            className="h-8 px-2.5 rounded-xl border-2 border-black/[0.06] bg-white text-[11px] font-semibold text-foreground hover:bg-black/[0.03] disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>
        {coldSchools.length === 0 ? (
          <p className="text-xs text-muted mt-3">Every school with eligible students has started.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/[0.06] max-h-80 overflow-y-auto">
            {coldSchools.map((s) => (
              <li key={s.schoolId} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <span className="block text-foreground font-medium truncate">{s.schoolName}</span>
                  <span className="block text-muted">
                    {s.district}, {s.state} · {COORDINATOR_LABEL[s.coordinatorStatus] ?? s.coordinatorStatus}
                  </span>
                </span>
                <span className="text-foreground font-semibold tabular-nums shrink-0">
                  {s.eligibleCount}
                </span>
              </li>
            ))}
          </ul>
        )}
        {coldSchoolsCapped && (
          <p className="text-[11px] text-muted mt-2">
            Showing the top {coldSchools.length} by eligible count — narrow to a state or district to
            see the rest.
          </p>
        )}
      </div>

      <div className="clay-card p-5">
        <h2 className="font-display font-bold text-foreground text-sm">Coordinator coverage</h2>
        <p className="text-xs text-muted mt-0.5">{totalCoordinated} schools in scope</p>
        <ul className="mt-3 space-y-2">
          {coordinatorCoverage.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">{COORDINATOR_LABEL[r.label] ?? r.label}</span>
              <span className="text-muted tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/isc-outreach.tsx
git commit -m "feat: add ISC cold-schools and coordinator-coverage outreach panel"
```

---

### Task 9: Rebuild the national page on the new shell

**Files:**
- Modify: `src/app/(admin)/admin/isc/page.tsx` (full rewrite)
- Delete: `src/components/admin/isc-entry-row.tsx`
- Delete: `src/components/admin/isc-stats.tsx`
- Modify: `src/components/admin/isc-filters.tsx` (remove the `district` filter)

**Interfaces:**
- Consumes: `loadIscAdminData` (Task 5), `computeFunnel` (Task 1), `buildSchoolRoster` (Task 2, unused at this scope but the type is shared), `coldSchools`/`coordinatorCoverage` (Task 3), `byState`/`byDistrict` (existing + Task 4), all Task 6/7/8 components
- Produces: the rebuilt `/admin/isc` national page — the pattern Task 10's state/district/school pages copy.

- [ ] **Step 1: Remove the `district` filter from `isc-filters.tsx`**

In `src/components/admin/isc-filters.tsx`, remove the `districts` prop and the entire district `<select>` block (lines 137-149 as read), and remove `'district'` from the `active` filter list (line 53) and from `set`'s state-clearing comment/logic (line 39's `next.delete('district')` line and its comment can go too — state no longer needs to clear a district query param that no longer exists). Remove the now-unused `districts: string[]` from the props type.

- [ ] **Step 2: Rewrite the national page**

```tsx
// src/app/(admin)/admin/isc/page.tsx
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { ISC_TRACKS, LANGUAGE_OPTIONS } from '@/lib/isc/tracks'
import { byState } from '@/lib/isc/analytics'
import { computeFunnel } from '@/lib/isc/funnel'
import { coldSchools, coordinatorCoverage } from '@/lib/isc/outreach'
import { iscGroupForClass } from '@/lib/isc/groups'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscOutreach } from '@/components/admin/isc-outreach'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscFilters } from '@/components/admin/isc-filters'
import { IscExport } from '@/components/admin/isc-export'

const COLD_SCHOOLS_LIMIT = 50

export default async function AdminIscPage({
  searchParams,
}: {
  searchParams: Promise<{
    track?: string
    status?: string
    group?: string
    language?: string
    school?: string
    q?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, {})

  const q = (params.q ?? '').trim().toLowerCase()
  const filteredEntries = data.entries.filter((e) => {
    if (params.track && e.track !== params.track) return false
    if (params.status && e.status !== params.status) return false
    if (params.group && iscGroupForClass(e.leaderClass) !== params.group) return false
    if (params.school && e.schoolName !== params.school) return false
    if (params.language) {
      const lang = data.submissionByEntry.get(e.entryId)?.language as string | undefined
      if (lang !== params.language) return false
    }
    if (q && !`${e.schoolName}`.toLowerCase().includes(q)) return false
    return true
  })

  const filteredMemberEntryIds = new Set(filteredEntries.map((e) => e.entryId))
  const filteredFunnelMembers = data.funnelMembers.filter((m) => filteredMemberEntryIds.has(m.entryId))

  const funnel = computeFunnel(data.eligible, filteredEntries, filteredFunnelMembers)
  const states = byState(filteredEntries)
  const cold = coldSchools(data.schools, filteredEntries, data.eligibleBySchool, COLD_SCHOOLS_LIMIT)
  const coverage = coordinatorCoverage(data.schools)

  const schoolNames = [...new Set(data.entries.map((e) => e.schoolName))].sort()
  // rosterMembers already carries a resolved display name per member — reused
  // here rather than a fresh query, since the export needs exactly one thing
  // (the leader's name) that this map already has.
  const leaderNameByEntry = new Map(
    data.rosterMembers.filter((m) => m.isLeader).map((m) => [m.entryId, m.displayName])
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title="Entries"
        subtitle="National overview. Drill into a state, then a district, then a school for full detail."
      />

      <Reveal delay={0.03}>
        <IscFunnelPanel funnel={funnel} />
      </Reveal>

      <IscFilters
        schools={schoolNames}
        languages={LANGUAGE_OPTIONS}
        showing={filteredEntries.length}
        total={data.entries.length}
      />

      <div className="flex items-center justify-end">
        <IscExport
          rows={filteredEntries.map((e) => ({
            schoolName: e.schoolName,
            schoolState: e.state,
            schoolDistrict: e.district,
            leaderName: leaderNameByEntry.get(e.entryId) ?? '',
            track: e.track,
            teamSize: e.studentIds.length,
            status: e.status,
            language: (data.submissionByEntry.get(e.entryId)?.language as string) ?? null,
            submittedAt: e.submittedAt,
            updatedAt: e.updatedAt,
          }))}
          filename={`isc-2026-national-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>

      <Reveal delay={0.04}>
        <IscComparisonChart
          title="States, by submitted"
          sub="Click a state to drill in"
          rows={states.map((s) => ({
            label: s.state,
            count: s.submitted,
            href: `/admin/isc/state/${encodeURIComponent(s.state)}`,
          }))}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <IscInsights entries={filteredEntries} classByStudent={data.classByStudent} now={new Date()} />
      </Reveal>

      <Reveal delay={0.06}>
        <IscOutreach
          coldSchools={cold}
          coordinatorCoverage={coverage}
          coldSchoolsCapped={cold.length === COLD_SCHOOLS_LIMIT}
          filenamePrefix="isc-2026-national"
        />
      </Reveal>
    </div>
  )
}
```

Note on the `language` filter: unlike the other filters, language lives inside `submission` JSONB, not on `AnalyticsEntry` directly (`AnalyticsEntry` deliberately excludes it — see `analytics.ts`), so it is read from `data.submissionByEntry` rather than added as a new field to `AnalyticsEntry`, keeping that type unchanged as the spec requires. `ISC_TRACKS` import is retained only because `IscFilters` needs it internally already (via its own import) — this page does not use it directly beyond what's shown, so remove the unused `ISC_TRACKS` import here if `npx tsc --noEmit` or lint flags it as unused after the rewrite.

- [ ] **Step 3: Delete the retired components**

```bash
git rm src/components/admin/isc-entry-row.tsx src/components/admin/isc-stats.tsx
```

- [ ] **Step 4: Verify it builds and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. Fix any unused-import or prop-mismatch errors surfaced by the `IscFilters` signature change (Step 1) before proceeding.

- [ ] **Step 5: Manual browser verification**

Start the dev server (`npm run dev`), sign in as the seeded admin account, open `/admin/isc`:
- Confirm the funnel tiles show non-zero Eligible/Started/Submitted numbers matching the seeded data.
- Apply the track filter and confirm the funnel tiles, the state comparison chart, and the insights panel all change together (this is the exact bug the whole feature exists to fix — if any of the three stays frozen, stop and fix it before continuing).
- Click a state bar and confirm it 404s for now (the state route does not exist until Task 10) — this is expected at this point in the plan, not a regression.
- Confirm cold schools and coordinator coverage both render plausible data, and the CSV export downloads and opens.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(admin\)/admin/isc/page.tsx src/components/admin/isc-filters.tsx
git commit -m "feat: rebuild national ISC admin page on the drill-down shell"
```

---

### Task 10: State, district, and school pages

**Files:**
- Create: `src/app/(admin)/admin/isc/state/[state]/page.tsx`
- Create: `src/app/(admin)/admin/isc/state/[state]/district/[district]/page.tsx`
- Create: `src/app/(admin)/admin/isc/state/[state]/district/[district]/school/[schoolId]/page.tsx`

**Interfaces:**
- Consumes: everything Task 9's page consumes, plus `byDistrict` (Task 4), `topSchools` (existing), `IscBreadcrumb` (Task 6), `IscRoster` (Task 7)
- Produces: the three remaining drill levels — no new aggregation or component code, only route-specific fetch scoping and which comparison level to show, matching the spec's stated design.

These three page files are near-identical in structure by design (schools comparison at district level replaces the district comparison at state level, and the roster replaces both at school level) — reviewed and accepted together as one task, per the plan's task-sizing rule that a split is only worth it where a reviewer could reasonably accept one and reject its neighbor, which does not apply to three mechanically parallel wrappers around the same shell.

- [ ] **Step 1: Write the state page**

```tsx
// src/app/(admin)/admin/isc/state/[state]/page.tsx
import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { LANGUAGE_OPTIONS } from '@/lib/isc/tracks'
import { byDistrict } from '@/lib/isc/analytics'
import { computeFunnel } from '@/lib/isc/funnel'
import { coldSchools, coordinatorCoverage } from '@/lib/isc/outreach'
import { iscGroupForClass } from '@/lib/isc/groups'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscOutreach } from '@/components/admin/isc-outreach'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscFilters } from '@/components/admin/isc-filters'
import { IscExport } from '@/components/admin/isc-export'

const COLD_SCHOOLS_LIMIT = 50

export default async function AdminIscStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>
  searchParams: Promise<{ track?: string; status?: string; group?: string; language?: string; school?: string; q?: string }>
}) {
  const { state: stateParam } = await params
  const state = decodeURIComponent(stateParam)
  const search = await searchParams
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, { state })

  if (data.schools.length === 0) notFound()

  const q = (search.q ?? '').trim().toLowerCase()
  const filteredEntries = data.entries.filter((e) => {
    if (search.track && e.track !== search.track) return false
    if (search.status && e.status !== search.status) return false
    if (search.group && iscGroupForClass(e.leaderClass) !== search.group) return false
    if (search.school && e.schoolName !== search.school) return false
    if (search.language) {
      const lang = data.submissionByEntry.get(e.entryId)?.language as string | undefined
      if (lang !== search.language) return false
    }
    if (q && !`${e.schoolName}`.toLowerCase().includes(q)) return false
    return true
  })

  const filteredEntryIds = new Set(filteredEntries.map((e) => e.entryId))
  const filteredFunnelMembers = data.funnelMembers.filter((m) => filteredEntryIds.has(m.entryId))

  const funnel = computeFunnel(data.eligible, filteredEntries, filteredFunnelMembers)
  const districts = byDistrict(filteredEntries)
  const cold = coldSchools(data.schools, filteredEntries, data.eligibleBySchool, COLD_SCHOOLS_LIMIT)
  const coverage = coordinatorCoverage(data.schools)
  const schoolNames = [...new Set(data.entries.map((e) => e.schoolName))].sort()
  const leaderNameByEntry = new Map(
    data.rosterMembers.filter((m) => m.isLeader).map((m) => [m.entryId, m.displayName])
  )

  return (
    <div className="space-y-6">
      <IscBreadcrumb segments={[{ label: 'National', href: '/admin/isc' }]} current={state} />

      <PageHeader eyebrow="ISC 2026" icon={Trophy} title={state} subtitle={`${data.schools.length} schools`} />

      <Reveal delay={0.03}>
        <IscFunnelPanel funnel={funnel} />
      </Reveal>

      <IscFilters
        schools={schoolNames}
        languages={LANGUAGE_OPTIONS}
        showing={filteredEntries.length}
        total={data.entries.length}
      />

      <div className="flex items-center justify-end">
        <IscExport
          rows={filteredEntries.map((e) => ({
            schoolName: e.schoolName,
            schoolState: e.state,
            schoolDistrict: e.district,
            leaderName: leaderNameByEntry.get(e.entryId) ?? '',
            track: e.track,
            teamSize: e.studentIds.length,
            status: e.status,
            language: (data.submissionByEntry.get(e.entryId)?.language as string) ?? null,
            submittedAt: e.submittedAt,
            updatedAt: e.updatedAt,
          }))}
          filename={`isc-2026-${state.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>

      <Reveal delay={0.04}>
        <IscComparisonChart
          title="Districts, by submitted"
          sub="Click a district to drill in"
          rows={districts.map((d) => ({
            label: d.district,
            count: d.submitted,
            href: `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(d.district)}`,
          }))}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <IscInsights entries={filteredEntries} classByStudent={data.classByStudent} now={new Date()} />
      </Reveal>

      <Reveal delay={0.06}>
        <IscOutreach
          coldSchools={cold}
          coordinatorCoverage={coverage}
          coldSchoolsCapped={cold.length === COLD_SCHOOLS_LIMIT}
          filenamePrefix={`isc-2026-${state.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </Reveal>
    </div>
  )
}
```

- [ ] **Step 2: Write the district page**

```tsx
// src/app/(admin)/admin/isc/state/[state]/district/[district]/page.tsx
import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { LANGUAGE_OPTIONS } from '@/lib/isc/tracks'
import { topSchools } from '@/lib/isc/analytics'
import { computeFunnel } from '@/lib/isc/funnel'
import { coldSchools, coordinatorCoverage } from '@/lib/isc/outreach'
import { iscGroupForClass } from '@/lib/isc/groups'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscComparisonChart } from '@/components/admin/isc-comparison-chart'
import { IscOutreach } from '@/components/admin/isc-outreach'
import { IscInsights } from '@/components/admin/isc-insights'
import { IscFilters } from '@/components/admin/isc-filters'
import { IscExport } from '@/components/admin/isc-export'

const COLD_SCHOOLS_LIMIT = 50

export default async function AdminIscDistrictPage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; district: string }>
  searchParams: Promise<{ track?: string; status?: string; group?: string; language?: string; school?: string; q?: string }>
}) {
  const { state: stateParam, district: districtParam } = await params
  const state = decodeURIComponent(stateParam)
  const district = decodeURIComponent(districtParam)
  const search = await searchParams
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, { state, district })

  if (data.schools.length === 0) notFound()

  const q = (search.q ?? '').trim().toLowerCase()
  const filteredEntries = data.entries.filter((e) => {
    if (search.track && e.track !== search.track) return false
    if (search.status && e.status !== search.status) return false
    if (search.group && iscGroupForClass(e.leaderClass) !== search.group) return false
    if (search.school && e.schoolName !== search.school) return false
    if (search.language) {
      const lang = data.submissionByEntry.get(e.entryId)?.language as string | undefined
      if (lang !== search.language) return false
    }
    if (q && !`${e.schoolName}`.toLowerCase().includes(q)) return false
    return true
  })

  const filteredEntryIds = new Set(filteredEntries.map((e) => e.entryId))
  const filteredFunnelMembers = data.funnelMembers.filter((m) => filteredEntryIds.has(m.entryId))

  const funnel = computeFunnel(data.eligible, filteredEntries, filteredFunnelMembers)
  const schools = topSchools(filteredEntries, 50)
  const cold = coldSchools(data.schools, filteredEntries, data.eligibleBySchool, COLD_SCHOOLS_LIMIT)
  const coverage = coordinatorCoverage(data.schools)
  const schoolNames = [...new Set(data.entries.map((e) => e.schoolName))].sort()
  const leaderNameByEntry = new Map(
    data.rosterMembers.filter((m) => m.isLeader).map((m) => [m.entryId, m.displayName])
  )

  return (
    <div className="space-y-6">
      <IscBreadcrumb
        segments={[
          { label: 'National', href: '/admin/isc' },
          { label: state, href: `/admin/isc/state/${encodeURIComponent(state)}` },
        ]}
        current={district}
      />

      <PageHeader eyebrow="ISC 2026" icon={Trophy} title={district} subtitle={`${data.schools.length} schools`} />

      <Reveal delay={0.03}>
        <IscFunnelPanel funnel={funnel} />
      </Reveal>

      <IscFilters
        schools={schoolNames}
        languages={LANGUAGE_OPTIONS}
        showing={filteredEntries.length}
        total={data.entries.length}
      />

      <div className="flex items-center justify-end">
        <IscExport
          rows={filteredEntries.map((e) => ({
            schoolName: e.schoolName,
            schoolState: e.state,
            schoolDistrict: e.district,
            leaderName: leaderNameByEntry.get(e.entryId) ?? '',
            track: e.track,
            teamSize: e.studentIds.length,
            status: e.status,
            language: (data.submissionByEntry.get(e.entryId)?.language as string) ?? null,
            submittedAt: e.submittedAt,
            updatedAt: e.updatedAt,
          }))}
          filename={`isc-2026-${district.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>

      <Reveal delay={0.04}>
        <IscComparisonChart
          title="Schools, by submitted"
          sub="Click a school to drill in"
          rows={schools.map((s) => ({
            label: s.schoolName,
            count: s.submitted,
            href: `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(district)}/school/${s.schoolId}`,
          }))}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <IscInsights entries={filteredEntries} classByStudent={data.classByStudent} now={new Date()} />
      </Reveal>

      <Reveal delay={0.06}>
        <IscOutreach
          coldSchools={cold}
          coordinatorCoverage={coverage}
          coldSchoolsCapped={cold.length === COLD_SCHOOLS_LIMIT}
          filenamePrefix={`isc-2026-${district.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </Reveal>
    </div>
  )
}
```

- [ ] **Step 3: Write the school page**

```tsx
// src/app/(admin)/admin/isc/state/[state]/district/[district]/school/[schoolId]/page.tsx
import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { computeFunnel } from '@/lib/isc/funnel'
import { buildSchoolRoster } from '@/lib/isc/roster'
import { loadIscAdminData } from '@/lib/isc/admin-data'
import { IscBreadcrumb } from '@/components/admin/isc-breadcrumb'
import { IscFunnelPanel } from '@/components/admin/isc-funnel-panel'
import { IscRoster } from '@/components/admin/isc-roster'

export default async function AdminIscSchoolPage({
  params,
}: {
  params: Promise<{ state: string; district: string; schoolId: string }>
}) {
  const { state: stateParam, district: districtParam, schoolId } = await params
  const state = decodeURIComponent(stateParam)
  const district = decodeURIComponent(districtParam)
  const supabase = await createClient()
  const data = await loadIscAdminData(supabase, { state, district, schoolId })

  const school = data.schools.find((s) => s.schoolId === schoolId)
  if (!school) notFound()

  const funnel = computeFunnel(data.eligible, data.entries, data.funnelMembers)
  const roster = buildSchoolRoster(data.rosterStudents, data.entries, data.rosterMembers)

  return (
    <div className="space-y-6">
      <IscBreadcrumb
        segments={[
          { label: 'National', href: '/admin/isc' },
          { label: state, href: `/admin/isc/state/${encodeURIComponent(state)}` },
          {
            label: district,
            href: `/admin/isc/state/${encodeURIComponent(state)}/district/${encodeURIComponent(district)}`,
          },
        ]}
        current={school.schoolName}
      />

      <PageHeader
        eyebrow="ISC 2026"
        icon={Trophy}
        title={school.schoolName}
        subtitle={`${data.eligible.length} eligible students`}
      />

      <Reveal delay={0.03}>
        <IscFunnelPanel funnel={funnel} />
      </Reveal>

      <Reveal delay={0.04}>
        <IscRoster
          rows={roster}
          students={data.rosterStudents}
          entries={data.entries}
          members={data.rosterMembers}
          submissionByEntry={data.submissionByEntry}
        />
      </Reveal>
    </div>
  )
}
```

Note: the school page deliberately has no filter bar, no comparison chart, and no outreach panel — per the spec, there is nowhere further down to drill and no "cold schools of one" to list. Filters are also dropped here because the roster already shows every student's full status at a glance; a track/status filter on top of it would just be hiding rows the admin came here specifically to see all of.

- [ ] **Step 4: Verify it builds and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors

- [ ] **Step 5: Manual browser verification**

With the dev server running and signed in as the seeded admin:
- From `/admin/isc`, click a state bar and confirm it now lands on the state page with correctly scoped funnel numbers (smaller than national, and different from national when a filter is applied).
- Click a district bar and confirm the same scoping behavior one level deeper.
- Click a school bar and confirm the roster renders with plausible status chips for every eligible student, including ones with zero ISC activity.
- Click a student with an accepted solo entry, a student with a multi-member team, a student with only a pending invite, and a student who has never touched ISC — confirm each profile view (or empty state) matches its roster chip.
- Confirm every breadcrumb segment at every level navigates back up correctly, and that the URL for each level is copy-pasteable and reloads to the same view.
- Confirm a filter applied at the state level narrows the funnel, the district chart, and the insights panel together, then carries over correctly (or resets, per the filter bar's own existing behavior) when navigating deeper.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/admin/isc/state"
git commit -m "feat: add state, district, and school drill-down pages for ISC admin analytics"
```

---

## Self-Review

**Spec coverage:**
- Navigation (National → State → District → School, breadcrumb, current focus, comparison charts linking down) — Tasks 6, 9, 10.
- Funnel (eligible → started → submitted, per scope, rates, by-track) — Task 1, rendered by Task 6, wired in Tasks 9–10.
- Student roster + profile (status chips, per-track team detail, submission view) — Task 2, rendered by Task 7, wired in Task 10's school page.
- Outreach lists (cold schools + coordinator coverage, National/State/District only) — Task 3, rendered by Task 8, wired in Tasks 9–10 (deliberately absent from the school page).
- `isc-insights.tsx` kept and scoped, not retired — Tasks 9–10 pass it the already-scoped `filteredEntries`/`data.entries` at every level, same component, no changes needed to the component itself.
- District as a full drill level, not a filter — Task 4 (`byDistrict`), Task 9 Step 1 (filter removal), Task 10 (district route).
- No new tables/RPCs — confirmed throughout; Task 5 is the only Supabase-touching code and reads only tables/columns that already exist.

**Placeholder scan:** No TBD/TODO; every step has real, complete code; every test asserts a concrete expected value.

**Type consistency:** `AnalyticsEntry`, `FunnelMember`, `RosterMember`, `EligibleStudent`, `RosterStudent`, `SchoolWithCoordinator` are defined once each (Tasks 1–3) and consumed with identical shapes in Task 5's loader and every component/page after it — cross-checked field-by-field while writing Tasks 5–10.

**Note on task count vs. the spec's "roughly ten":** ended at 10 tasks (the spec's `byDistrict` was folded into the existing `analytics.ts` as its own task rather than merged into another, and the shared data loader — implied but not separately enumerated in the spec's file list — became its own task once its size became clear). This is the natural granularity, not scope creep: every task still maps to a spec requirement listed above.
