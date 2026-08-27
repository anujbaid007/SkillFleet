import type { createClient } from '@/lib/supabase/server'
import { isEligibleClass } from '@/lib/isc/validate'
import type { IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import type { RosterStudent, RosterMember } from '@/lib/isc/roster'

/** The shape get_school_roster() returns, as the page already has it. */
export interface CoordinatorRosterInput {
  studentId: string
  fullName: string | null
  schoolClass: string | null
}

export interface CoordinatorSchoolData {
  entries: AnalyticsEntry[]
  submissionByEntry: Map<string, Record<string, unknown>>
  rosterMembers: RosterMember[]
  /** Eligible students only — the roster and every rate below are about who
      could actually enter ISC, not everyone with an account. */
  rosterStudents: RosterStudent[]
  classByStudent: Map<string, string | null>
}

/**
 * One school's ISC picture, for its own coordinator.
 *
 * Deliberately the same shapes the admin drill-down already uses, so
 * buildSchoolRoster and buildStudentProfile work here unchanged — a
 * coordinator's roster asks exactly the questions an admin's does, one school
 * at a time.
 *
 * Students arrive as a parameter rather than being queried here, and that is
 * load-bearing: there is no RLS policy granting a coordinator read access to
 * user_profiles for their school, only "own profile" and "admins read all".
 * Selecting from it directly returns zero rows with no error — which is
 * exactly what it did on the first attempt, silently emptying the roster while
 * every other panel looked fine. get_school_roster() is the SECURITY DEFINER
 * RPC that exists for this, and the page already calls it.
 *
 * Entries and members do not need that treatment: isc_entries_read and
 * isc_members_read (0048) both grant an approved coordinator their own
 * school's rows directly.
 */
export async function loadCoordinatorSchoolData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  roster: CoordinatorRosterInput[]
): Promise<CoordinatorSchoolData> {
  const rosterStudents: RosterStudent[] = roster
    .filter((s) => isEligibleClass(s.schoolClass))
    .map((s) => ({
      id: s.studentId,
      name: s.fullName ?? 'Unnamed student',
      schoolClass: s.schoolClass ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const classByStudent = new Map<string, string | null>(
    roster.map((s) => [s.studentId, s.schoolClass ?? null])
  )
  const nameById = new Map(roster.map((s) => [s.studentId, s.fullName]))

  const { data: entryRows } = await supabase
    .from('isc_entries')
    .select('id, track, status, submitted_at, updated_at, submission, school_id')
    .eq('school_id', schoolId)
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
    const leaderId = leaderUserIdByEntry.get(e.id)
    return {
      entryId: e.id,
      track: e.track as IscTrackId,
      status: e.status,
      schoolId: e.school_id,
      // A coordinator only ever sees their own school, so the geography these
      // fields carry for the admin views is not needed and not fetched.
      schoolName: '',
      state: '',
      district: '',
      board: '',
      submittedAt: e.submitted_at,
      updatedAt: e.updated_at,
      studentIds: studentIdsByEntry.get(e.id) ?? [],
      leaderClass: leaderId ? (classByStudent.get(leaderId) ?? null) : null,
    }
  })

  const submissionByEntry = new Map<string, Record<string, unknown>>(
    entryList.map((e) => [e.id, (e.submission as Record<string, unknown>) ?? {}])
  )

  const rosterMembers: RosterMember[] = members.map((m) => ({
    entryId: m.entry_id,
    userId: m.user_id,
    // Teams cannot span schools, so every linked member is on this school's
    // own roster — no wider profile lookup is needed to name them.
    displayName: m.user_id
      ? (nameById.get(m.user_id) ?? 'Unnamed student')
      : (m.invited_email ?? 'Pending invite'),
    isLeader: m.is_leader,
    acceptedAt: m.accepted_at,
  }))

  return { entries, submissionByEntry, rosterMembers, rosterStudents, classByStudent }
}
