// Shared password policy for signup. The PASSWORD_RULES array is the single
// source of truth — the server validator (validatePassword) and the live
// checklist UI both derive from it, so they can never drift apart.

export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'uppercase', label: 'An uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'A lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'A number (0–9)', test: (pw) => /[0-9]/.test(pw) },
  { id: 'special', label: 'A special character (!@#$…)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

// Plain-text summary, e.g. for aria labels or non-interactive contexts.
export const PASSWORD_RULES_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.'

/**
 * Validates a password against the SkillFleet strength policy.
 * Returns an error message if invalid, or null if the password is strong enough.
 */
export function validatePassword(password: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password ?? ''))
  return failed ? `Password is missing: ${failed.label.toLowerCase()}.` : null
}
