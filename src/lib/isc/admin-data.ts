import { isEligibleClass } from '@/lib/isc/validate'
import type { createClient } from '@/lib/supabase/server'
import type { IscTrackId } from '@/lib/isc/tracks'
import type { AnalyticsEntry } from '@/lib/isc/analytics'
import type { EligibleStudent, FunnelMember } from '@/lib/isc/funnel'
import type { RosterStudent, RosterMember } from '@/lib/isc/roster'
import type { SchoolWithCoordinator } from '@/lib/isc/outreach'

/** Which slice of the country a drill-down page is looking at. Empty is national. */
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
  /** Every eligible student in scope, named. The school-level roster is the
      only consumer — above that the list is far too long to render. */
  rosterStudents: RosterStudent[]
  schools: SchoolWithCoordinator[]
  classByStudent: Map<string, string | null>
}

/**
 * Everything a drill-down page at one scope needs, in five queries: the
 * schools in scope, the eligible students in scope, the entries at those
 * schools, the members of those entries, and the names behind those members.
 *
 * Every query is scoped by the same IscScope, so national is `{}` and each
 * level down adds one more `.eq(...)`. This is the only async, Supabase-aware
 * code in the feature — every aggregation it feeds is pure, so all of them
 * stay unit-testable without a database.
 *
 * No new RPCs: an admin can already read all of these tables directly under
 * existing RLS, which is how the admin ISC page has always read isc_entries
 * and isc_entry_members.
 */
export async function loadIscAdminData(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  const boardById = new Map((schoolRows ?? []).map((s) => [s.id, s.board]))
  const schoolById = new Map(schools.map((s) => [s.schoolId, s]))

  // Scoped on the profile's own denormalised school_state/school_district
  // rather than by joining schools: those columns exist precisely so ISC can
  // slice students by geography without a join (see 0045).
  let profileQuery = supabase
    .from('user_profiles')
    .select('id, full_name, school_class, school_id')
    .eq('role', 'student')
  if (scope.state) profileQuery = profileQuery.eq('school_state', scope.state)
  if (scope.district) profileQuery = profileQuery.eq('school_district', scope.district)
  if (scope.schoolId) profileQuery = profileQuery.eq('school_id', scope.schoolId)
  const { data: profileRows } = await profileQuery

  // ISC is Classes 5-12, so anyone younger is not a missed opportunity and
  // must not sit in the funnel's denominator.
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
  const rosterStudents: RosterStudent[] = eligibleProfiles
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? 'Unnamed student',
      schoolClass: p.school_class ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

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

  // Names are looked up separately rather than filtered from eligibleProfiles:
  // a teammate can sit outside the current scope (a school-scoped page still
  // has to name everyone on that school's entries), and an out-of-scope name
  // is still a name worth showing even though it never counts in the funnel.
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
      board: boardById.get(e.school_id) ?? '',
      submittedAt: e.submitted_at,
      updatedAt: e.updated_at,
      studentIds: studentIdsByEntry.get(e.id) ?? [],
      leaderClass: leaderId ? (classByStudent.get(leaderId) ?? null) : null,
    }
  })

  const submissionByEntry = new Map<string, Record<string, unknown>>(
    entryList.map((e) => [e.id, (e.submission as Record<string, unknown>) ?? {}])
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
