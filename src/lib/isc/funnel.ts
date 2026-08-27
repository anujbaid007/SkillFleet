import { ISC_TRACKS, type IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry, CountRow } from '@/lib/isc/analytics'

/**
 * One eligible student, already filtered to Classes 5-12 by the caller and
 * already scoped (national/state/district/school) by whatever query built the
 * array — this function does no further scoping of its own.
 */
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
  /** Distinct started students per track. Does not sum to `started`: a student
      who started two tracks is counted once per track here, and once in
      total in `started`. */
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
    // A pending invite is not participation yet. The leader is exempt: their
    // own row is created with the entry and never needs accepting.
    if (!m.isLeader && !m.acceptedAt) continue

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
    // Fixed track order, so the panel does not reshuffle as counts change.
    byTrack: ISC_TRACKS.map((t) => ({
      label: t.name,
      count: byTrackStarted.get(t.id)?.size ?? 0,
    })),
  }
}
