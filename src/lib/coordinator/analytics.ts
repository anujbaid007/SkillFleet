import { CLASS_OPTIONS } from '@/lib/profile/details'
import { isEligibleClass } from '@/lib/isc/validate'
import { ISC_TRACKS, type IscTrackId } from '@/lib/isc/tracks'

/**
 * One student on the roster, as far as these counts are concerned.
 *
 * Declared here rather than imported from the coordinator server action:
 * RosterStudent satisfies this structurally, and a lib should not depend on a
 * 'use server' module.
 */
export interface RosterEntryStatus {
  studentId: string
  fullName: string | null
  schoolClass: string | null
  /** Track id -> 'draft' | 'submitted'. An absent track means not started. */
  iscStatus: Record<string, string>
}

export interface RosterSummary {
  /** Everyone from the school with a SkillFleet account. */
  students: number
  /** Of those, the ones in Classes 5-12. */
  eligible: number
  /** Eligible students on at least one entry, draft or submitted. */
  entered: number
  notEntered: number
  /** Eligible students with at least one entry actually submitted. */
  submittedStudents: number
}

export interface EntryCounts {
  total: number
  submitted: number
  draft: number
  byTrack: Record<IscTrackId, { submitted: number; draft: number }>
}

export interface ClassParticipation {
  schoolClass: string
  students: number
  entered: number
}

export interface NudgeLists {
  /** Eligible students with an unfinished draft on any track. */
  drafts: RosterEntryStatus[]
  /** Eligible students who have not started anything. */
  notEntered: RosterEntryStatus[]
}

const eligible = (s: RosterEntryStatus) => isEligibleClass(s.schoolClass)
const statuses = (s: RosterEntryStatus) => Object.values(s.iscStatus ?? {})
const hasEntered = (s: RosterEntryStatus) => statuses(s).length > 0
const byName = (a: RosterEntryStatus, b: RosterEntryStatus) =>
  (a.fullName ?? '').localeCompare(b.fullName ?? '')

/**
 * The headline numbers, all about students.
 *
 * A coordinator chases people, not rows: "eleven of forty have entered" is
 * actionable in a way "fourteen entries" is not.
 */
export function rosterSummary(students: RosterEntryStatus[]): RosterSummary {
  const able = students.filter(eligible)
  const entered = able.filter(hasEntered).length
  return {
    students: students.length,
    eligible: able.length,
    entered,
    notEntered: able.length - entered,
    submittedStudents: able.filter((s) => statuses(s).includes('submitted')).length,
  }
}

/** How much work the school has produced, by entry rather than by student. */
export function entryCounts(entries: { track: string; status: string }[]): EntryCounts {
  const byTrack = ISC_TRACKS.reduce(
    (acc, t) => {
      acc[t.id] = { submitted: 0, draft: 0 }
      return acc
    },
    {} as Record<IscTrackId, { submitted: number; draft: number }>
  )

  let submitted = 0
  let draft = 0

  for (const e of entries) {
    if (e.status === 'submitted') submitted += 1
    else draft += 1
    // A track this build does not know about still counts toward the total but
    // gets no row: inventing one would put a heading on the page for a
    // championship that cannot be entered here.
    const row = byTrack[e.track as IscTrackId]
    if (!row) continue
    if (e.status === 'submitted') row.submitted += 1
    else row.draft += 1
  }

  return { total: entries.length, submitted, draft, byTrack }
}

/**
 * Participation class by class, across Classes 5-12 only.
 *
 * Younger classes are left out on purpose: they cannot enter, and a row reading
 * "0 of 12 entered" would look like a failure rather than a rule.
 */
export function classParticipation(students: RosterEntryStatus[]): ClassParticipation[] {
  const acc = new Map<string, ClassParticipation>()

  for (const s of students) {
    if (!eligible(s)) continue
    const key = s.schoolClass as string
    const row = acc.get(key) ?? { schoolClass: key, students: 0, entered: 0 }
    row.students += 1
    if (hasEntered(s)) row.entered += 1
    acc.set(key, row)
  }

  // CLASS_OPTIONS order, so this reads the same way as every class dropdown.
  return CLASS_OPTIONS.filter((c) => acc.has(c)).map((c) => acc.get(c) as ClassParticipation)
}

/**
 * Who to talk to next.
 *
 * A student with one submission and one unfinished draft is still on the draft
 * list: the unfinished entry is the thing that needs a nudge, and their other
 * success does not make it finish itself.
 */
export function needsNudge(students: RosterEntryStatus[]): NudgeLists {
  const able = students.filter(eligible)
  return {
    drafts: able.filter((s) => statuses(s).includes('draft')).sort(byName),
    notEntered: able.filter((s) => !hasEntered(s)).sort(byName),
  }
}
