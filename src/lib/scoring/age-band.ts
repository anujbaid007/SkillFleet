import type { AgeBand } from '@/lib/scoring/types'

/**
 * Returns the age band that matches the student's age as of `asOf` (defaults to today).
 * Returns null if the student's age falls outside all bands.
 */
export function ageBandFor(
  dateOfBirth: Date | string,
  bands: AgeBand[],
  asOf: Date = new Date()
): AgeBand | null {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth

  let age = asOf.getFullYear() - dob.getFullYear()
  const monthDiff = asOf.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age--
  }

  return bands.find((b) => age >= b.min_age && age <= b.max_age) ?? null
}
