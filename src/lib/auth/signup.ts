/** Just the parts of supabase.auth.signUp()'s `data` this check needs. */
export interface SignUpResultLike {
  user: { identities?: unknown[] | null } | null
  session: unknown | null
}

/**
 * True when signUp() was handed an email that is already registered.
 *
 * Supabase deliberately does not return an error in that case — erroring would
 * let anyone enumerate which emails hold accounts. Instead it returns a
 * success-shaped response: HTTP 200, no error, an obfuscated user, no session,
 * and even a decoy `confirmation_sent_at`. The one field that gives it away is
 * `identities`, which comes back as an empty array; a genuine new signup always
 * carries exactly one identity.
 *
 * Checking this is what stops an existing-email attempt from being reported to
 * the person as "check your email", which would leave them waiting for a
 * message that is never coming.
 */
export function isExistingEmailSignup(data: SignUpResultLike): boolean {
  // A session means the caller really is signed in, so whatever else the
  // response says, this is not a blocked duplicate.
  if (data.session) return false

  const identities = data.user?.identities
  // Only an explicitly empty array is evidence. Missing or null means the
  // shape is not what we expect, and guessing would risk telling someone
  // their own fresh signup already exists.
  return Array.isArray(identities) && identities.length === 0
}
