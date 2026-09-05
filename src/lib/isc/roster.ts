import { ISC_TRACKS, PUZZLE_MASTER_ID, trackById, type IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry } from '@/lib/isc/analytics'

export interface RosterStudent {
  id: string
  name: string
  schoolClass: string | null
}

/**
 * Which of the three real states a member row is in.
 *
 * There is no fourth "declined" state: declining an invite deletes the row
 * outright, so a declined invite leaves no residue to render.
 */
export type MemberAcceptance = 'accepted' | 'awaiting_accept' | 'unregistered_invite'

/**
 * Enough of an isc_entry_members row to build both the roster chip and the
 * full student profile. `displayName` is the resolved account name, or the raw
 * invited email when there is no account behind the row yet.
 */
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

/**
 * One student's position on one track.
 *
 * The row's headline `status` collapses every track into a single chip, which
 * is right for a list but wrong for filtering: choosing a track has to narrow
 * the status question to that track, or "Content Creator + has an open draft"
 * matches a student whose Content Creator entry is submitted and whose drafts
 * are on entirely different tracks.
 */
export interface RosterTrackEntry {
  track: IscTrackId
  /** 'draft' | 'submitted' */
  entryStatus: string
  /** False while this is still an unanswered invite. */
  accepted: boolean
  /** Accepted members on this entry. */
  teamSize: number
  maxTeamSize: number
  hasPendingInvite: boolean
}

export interface RosterRow {
  studentId: string
  name: string
  schoolClass: string | null
  /**
   * Every track this student touches in any role, including ones they have
   * only been invited to. Filtering by track has to find an invitee too —
   * "who is involved with Content Creator here" means everyone attached to
   * it, not only the ones who have already said yes.
   */
  tracks: IscTrackId[]
  /**
   * Whether the student has at least one entry in each state, across every
   * track they have accepted.
   *
   * `status` below collapses them to a single best entry so the row can show
   * one chip, and that collapse loses real information: a student with two
   * drafts and one submission reads as "submitted", so filtering for drafts
   * skipped them and the list came back empty while drafts plainly existed.
   * These two flags keep the whole truth for filtering.
   */
  hasDraft: boolean
  hasSubmitted: boolean
  /** Every track this student is attached to, with their position on each. */
  trackEntries: RosterTrackEntry[]
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

// Fixed track order, so a profile's blocks read in the same order as every
// other track list in the app rather than in whatever order rows arrived.
const TRACK_ORDER = new Map<string, number>([...ISC_TRACKS.map((t, i) => [t.id, i] as [string, number]), [PUZZLE_MASTER_ID, ISC_TRACKS.length]])

function acceptance(m: RosterMember): MemberAcceptance {
  if (!m.userId) return 'unregistered_invite'
  // A leader never accepts their own entry — their row is created with it.
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
 * Every eligible student at one school, each with the single status chip their
 * roster row shows.
 *
 * A student with any accepted participation is described by their best entry —
 * submitted beats draft, ties broken by track order — even when they also hold
 * a pending invite elsewhere: real participation always outranks an invite
 * they have not answered. Only a student with nothing but pending invites
 * reads as "invited", and one with neither as "not started".
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

    const tracks = [
      ...new Set(
        own
          .map((m) => entryById.get(m.entryId)?.track)
          .filter((t): t is IscTrackId => Boolean(t))
      ),
    ].sort((a, b) => (TRACK_ORDER.get(a) ?? 0) - (TRACK_ORDER.get(b) ?? 0))

    // Across every entry they have actually accepted, not just the best one.
    const acceptedEntries = accepted
      .map((m) => entryById.get(m.entryId))
      .filter((e): e is AnalyticsEntry => Boolean(e))
    const hasSubmitted = acceptedEntries.some((e) => e.status === 'submitted')
    const hasDraft = acceptedEntries.some((e) => e.status !== 'submitted')

    const trackEntries: RosterTrackEntry[] = own
      .map((m) => {
        const e = entryById.get(m.entryId)
        if (!e) return null
        const entryMembers = membersByEntry.get(e.entryId) ?? []
        return {
          track: e.track,
          entryStatus: e.status,
          accepted: acceptance(m) === 'accepted',
          teamSize: entryMembers.filter((x) => acceptance(x) === 'accepted').length,
          maxTeamSize: trackById(e.track)?.maxTeamSize ?? 1,
          hasPendingInvite: entryMembers.some((x) => acceptance(x) === 'awaiting_accept'),
        }
      })
      .filter((t): t is RosterTrackEntry => t !== null)
      .sort((a, b) => (TRACK_ORDER.get(a.track) ?? 0) - (TRACK_ORDER.get(b.track) ?? 0))

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

        // Solo means solo for good: a track that caps at one, or a lone leader
        // with nobody left to hear back from. A lone leader with an invite
        // still out is a team mid-formation, and reads very differently to an
        // admin deciding whether to chase anyone.
        const status: RosterStatus =
          maxSize === 1 || (teamSize === 1 && !hasPendingInvite)
            ? { kind: 'solo', entryStatus: best.status }
            : { kind: 'team', size: teamSize, maxSize, entryStatus: best.status }

        return {
          studentId: s.id,
          name: s.name,
          schoolClass: s.schoolClass,
          tracks,
          hasDraft,
          hasSubmitted,
          trackEntries,
          status,
        }
      }
    }

    if (pending.length > 0) {
      return {
        studentId: s.id,
        name: s.name,
        schoolClass: s.schoolClass,
        tracks,
        hasDraft,
        hasSubmitted,
        trackEntries,
        status: { kind: 'invited' },
      }
    }

    return {
      studentId: s.id,
      name: s.name,
      schoolClass: s.schoolClass,
      tracks,
      hasDraft,
      hasSubmitted,
      trackEntries,
      status: { kind: 'not_started' },
    }
  })
}

/**
 * Every track a student touches in any role — leader, accepted teammate, or
 * pending invitee — each with its entry status, its submission, and the whole
 * team with every member's real acceptance state.
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
