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
 * Schools with eligible students but nothing entered.
 *
 * A school with no student accounts at all is excluded: that is an onboarding
 * gap, not an outreach opportunity, and nothing on this page can act on it.
 *
 * Capped at `limit` but ranked before slicing, so the biggest missed
 * opportunity is never cut off by an arbitrary earlier ordering. A result
 * exactly `limit` long is very likely truncated, and the caller is expected to
 * say so rather than present it as the whole list.
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

/**
 * Every school in scope, split by coordinator status.
 *
 * Fixed reading order rather than ranked by count: this table is read as a
 * pipeline — nobody applied, someone is waiting on us, covered — and
 * reshuffling it as counts change would break that.
 */
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
