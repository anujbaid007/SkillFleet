import { calculateAge } from '@/lib/utils/age'

/** Minimum age (years) required to create a student account. */
export const MIN_SIGNUP_AGE = 5

/**
 * Validates a student's date of birth (YYYY-MM-DD) for signup.
 * Rejects missing/invalid/future dates and anyone under MIN_SIGNUP_AGE.
 * Returns an error message if invalid, or null if valid.
 * Mirrors validateMobile / validatePassword's contract (string | null).
 */
export function validateDob(dob: string, today: Date = new Date()): string | null {
  if (!dob) return 'Date of birth is required.'

  const parsed = new Date(dob)
  if (isNaN(parsed.getTime())) return 'Please enter a valid date of birth.'
  if (parsed > today) return 'Please enter a valid date of birth.'

  const age = calculateAge(dob, today)
  if (age < MIN_SIGNUP_AGE) {
    return `Students must be at least ${MIN_SIGNUP_AGE} years old to sign up.`
  }
  return null
}
