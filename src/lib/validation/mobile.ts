/**
 * Validates an Indian 10-digit mobile number. Spaces are ignored.
 * Returns an error message if invalid, or null if valid.
 * Mirrors validatePassword's contract (string | null).
 */
export function validateMobile(mobile: string): string | null {
  const digits = (mobile ?? '').replace(/\s+/g, '')
  if (!digits) return 'Mobile number is required.'
  if (!/^\d{10}$/.test(digits)) return 'Mobile number must be exactly 10 digits.'
  if (!/^[6-9]/.test(digits)) return 'Enter a valid mobile number.'
  return null
}
