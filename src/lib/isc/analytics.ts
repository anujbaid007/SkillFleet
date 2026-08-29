import { CLASS_OPTIONS } from '@/lib/profile/details'
import { istDay, istDaysBetween } from '@/lib/isc/dates'
import { iscGroupForClass, iscGroupLabel, type IscGroup } from '@/lib/isc/groups'
import type { IscTrackId } from '@/lib/isc/tracks'

/**
 * One ISC entry, flattened to exactly what the admin panels aggregate over.
 *
 * Deliberately not the database row: the page joins schools and members before
 * building these, so every aggregation below is a pure count with no lookups
 * and no async in it.
 */
export interface AnalyticsEntry {
  entryId: string
  track: IscTrackId
  status: string
  schoolId: string
  schoolName: string
  state: string
  district: string
  board: string
  submittedAt: string | null
  updatedAt: string
  /** Everyone on the entry with an account — the leader plus linked teammates. */
  studentIds: string[]
  /** The team leader's class, for deriving which ISC group the entry is in. */
  leaderClass: string | null
}

/** A labelled count. Used by every single-dimension panel. */
export interface CountRow {
  label: string
  count: number
}

export interface SchoolRow {
  schoolId: string
  schoolName: string
  state: string
  entries: number
  submitted: number
  students: number
}

export interface StateRow {
  state: string
  schools: number
  entries: number
  submitted: number
}

export interface TimelinePoint {
  day: string
  count: number
}

export interface GroupRow {
  group: IscGroup
  label: string
  entries: number
  submitted: number
  students: number
}

const isSubmitted = (e: AnalyticsEntry) => e.status === 'submitted'

/**
 * The schools carrying the cycle, ranked by finished work.
 *
 * Ranked on submissions before entries: a school with ten untouched drafts has
 * not done more than a school with one real submission, and ranking on the raw
 * count would say it had.
 */
export function topSchools(entries: AnalyticsEntry[], limit = 10): SchoolRow[] {
  const acc = new Map<string, SchoolRow & { studentSet: Set<string> }>()

  for (const e of entries) {
    let row = acc.get(e.schoolId)
    if (!row) {
      row = {
        schoolId: e.schoolId,
        schoolName: e.schoolName,
        state: e.state,
        entries: 0,
        submitted: 0,
        students: 0,
        studentSet: new Set<string>(),
      }
      acc.set(e.schoolId, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    for (const id of e.studentIds) row.studentSet.add(id)
  }

  return [...acc.values()]
    .map(({ studentSet, ...row }) => ({ ...row, students: studentSet.size }))
    .sort(
      (a, b) =>
        b.submitted - a.submitted ||
        b.entries - a.entries ||
        a.schoolName.localeCompare(b.schoolName)
    )
    .slice(0, limit)
}

/** Where the cycle is happening. A state-level round is planned from this. */
export function byState(entries: AnalyticsEntry[]): StateRow[] {
  const acc = new Map<string, StateRow & { schoolSet: Set<string> }>()

  for (const e of entries) {
    // An entry with no state is still an entry. Dropping it would make this
    // table's total quietly disagree with the headline count.
    const state = e.state || 'Unknown'
    let row = acc.get(state)
    if (!row) {
      row = { state, schools: 0, entries: 0, submitted: 0, schoolSet: new Set<string>() }
      acc.set(state, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    row.schoolSet.add(e.schoolId)
  }

  return [...acc.values()]
    .map(({ schoolSet, ...row }) => ({ ...row, schools: schoolSet.size }))
    .sort((a, b) => b.entries - a.entries || a.state.localeCompare(b.state))
}

export interface DistrictRow {
  district: string
  state: string
  schools: number
  entries: number
  submitted: number
}

/**
 * The same shape as byState, one level down: the comparison chart a state page
 * shows so a state with hundreds of schools can be read district by district
 * rather than as one unusable bar list.
 */
export function byDistrict(entries: AnalyticsEntry[]): DistrictRow[] {
  const acc = new Map<string, DistrictRow & { schoolSet: Set<string> }>()

  for (const e of entries) {
    // Same reasoning as byState: an entry with no district is still an entry,
    // and dropping it would make this table disagree with the headline count.
    const district = e.district || 'Unknown'
    let row = acc.get(district)
    if (!row) {
      row = {
        district,
        state: e.state,
        schools: 0,
        entries: 0,
        submitted: 0,
        schoolSet: new Set<string>(),
      }
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

/** CBSE / ICSE / State board split, from the school each entry belongs to. */
export function byBoard(entries: AnalyticsEntry[]): CountRow[] {
  const acc = new Map<string, number>()
  for (const e of entries) {
    const label = e.board?.trim() || 'Not recorded'
    acc.set(label, (acc.get(label) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/**
 * Participating students by class.
 *
 * Counts students, not entries: a three-person team is three students, and a
 * student on two tracks is still one student.
 */
export function classDistribution(
  entries: AnalyticsEntry[],
  classByStudent: Map<string, string | null>
): CountRow[] {
  const seen = new Set<string>()
  const acc = new Map<string, number>()

  for (const e of entries) {
    for (const id of e.studentIds) {
      if (seen.has(id)) continue
      seen.add(id)
      const label = classByStudent.get(id)?.trim() || 'Class not set'
      acc.set(label, (acc.get(label) ?? 0) + 1)
    }
  }

  // Class order comes from CLASS_OPTIONS so this table reads in the same order
  // as every class dropdown in the app. Anything unrecognised sorts last.
  const known = CLASS_OPTIONS.filter((c) => acc.has(c))
  const unknown = [...acc.keys()].filter((c) => !CLASS_OPTIONS.includes(c)).sort()
  return [...known, ...unknown].map((label) => ({ label, count: acc.get(label) ?? 0 }))
}

/** Submissions per Indian day, oldest first. Drafts are not submissions. */
export function submissionTimeline(entries: AnalyticsEntry[]): TimelinePoint[] {
  const acc = new Map<string, number>()
  for (const e of entries) {
    if (!isSubmitted(e) || !e.submittedAt) continue
    const day = istDay(e.submittedAt)
    if (!day) continue
    acc.set(day, (acc.get(day) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

/**
 * Drafts nobody has touched in a while — the entries most likely to be lost.
 *
 * Oldest first: the top of this list is where a nudge is worth the most.
 */
export function staleDrafts(entries: AnalyticsEntry[], now: Date, days = 7): AnalyticsEntry[] {
  return entries
    .filter((e) => e.status === 'draft' && istDaysBetween(new Date(e.updatedAt), now) >= days)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
}

/**
 * Entries, submissions and participating students per group, derived from each
 * entry's leader. An entry whose leader has no derivable group (should not
 * happen — entering ISC already requires an eligible class) is skipped rather
 * than guessed at.
 */
export function byGroup(entries: AnalyticsEntry[]): GroupRow[] {
  const acc = new Map<IscGroup, GroupRow & { studentSet: Set<string> }>()

  for (const e of entries) {
    const group = iscGroupForClass(e.leaderClass)
    if (!group) continue
    let row = acc.get(group)
    if (!row) {
      row = {
        group,
        label: iscGroupLabel(group),
        entries: 0,
        submitted: 0,
        students: 0,
        studentSet: new Set<string>(),
      }
      acc.set(group, row)
    }
    row.entries += 1
    if (isSubmitted(e)) row.submitted += 1
    for (const id of e.studentIds) row.studentSet.add(id)
  }

  // Fixed group order, so the panel does not reshuffle as counts change.
  return (['group1', 'group2'] as IscGroup[])
    .filter((g) => acc.has(g))
    .map((g) => {
      const { studentSet, ...row } = acc.get(g) as GroupRow & { studentSet: Set<string> }
      return { ...row, students: studentSet.size }
    })
}
