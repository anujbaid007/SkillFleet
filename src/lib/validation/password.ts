// Shared password policy for signup. The PASSWORD_RULES array is the single
// source of truth — the server validator (validatePassword) and the live
// checklist UI both derive from it, so they can never drift apart.

export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

/**
 * Deliberately short.
 *
 * This previously also demanded an uppercase letter, a lowercase letter and a
 * special character. Five simultaneous rules is more than most consumer sign-up
 * forms ask for, and the people it turned away here are schoolchildren and
 * teachers signing up on a phone. Length plus a mix of letters and digits still
 * rules out the passwords that actually get guessed — `password`, `12345678`,
 * a first name — without the friction.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'letter', label: 'A letter', test: (pw) => /[A-Za-z]/.test(pw) },
  { id: 'number', label: 'A number (0–9)', test: (pw) => /[0-9]/.test(pw) },
]

// Plain-text summary, e.g. for aria labels or non-interactive contexts.
export const PASSWORD_RULES_HINT = 'At least 8 characters, including a letter and a number.'

/**
 * Validates a password against the SkillFleet strength policy.
 * Returns an error message if invalid, or null if the password is strong enough.
 */
export function validatePassword(password: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password ?? ''))
  return failed ? `Password is missing: ${failed.label.toLowerCase()}.` : null
}
