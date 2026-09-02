/**
 * Validates an Indian 10-digit mobile number. Spaces are ignored.
 * Returns an error message if invalid, or null if valid.
 * Mirrors validatePassword's contract (string | null).
 *
 * `label` names the field in the message, so a form asking for a WhatsApp
 * number does not report an error about a "mobile number".
 */
export function validateMobile(mobile: string, label = 'Mobile number'): string | null {
  const digits = (mobile ?? '').replace(/\s+/g, '')
  if (!digits) return `${label} is required.`
  if (!/^\d{10}$/.test(digits)) return `${label} must be exactly 10 digits.`
  if (!/^[6-9]/.test(digits)) return `Enter a valid ${label.toLowerCase()}.`
  return null
}
