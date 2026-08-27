import { describe, expect, it } from 'vitest'
import { isExistingEmailSignup } from '../signup'

describe('isExistingEmailSignup', () => {
  it('flags the already-registered case: no session and an empty identities array', () => {
    // Verified against the live project: an existing email returns HTTP 200
    // with no error, identities: [], no session, and a decoy
    // confirmation_sent_at.
    expect(isExistingEmailSignup({ user: { identities: [] }, session: null })).toBe(true)
  })

  it('does not flag a fresh signup that returned a session', () => {
    expect(
      isExistingEmailSignup({ user: { identities: [{ provider: 'email' }] }, session: { access_token: 'x' } })
    ).toBe(false)
  })

  it('does not flag a fresh signup awaiting email confirmation', () => {
    // Confirmation enabled: no session yet, but a real identity exists.
    expect(
      isExistingEmailSignup({ user: { identities: [{ provider: 'email' }] }, session: null })
    ).toBe(false)
  })

  it('does not flag when a session exists even if identities came back empty', () => {
    // A session proves the account is genuinely usable by this caller.
    expect(isExistingEmailSignup({ user: { identities: [] }, session: { access_token: 'x' } })).toBe(false)
  })

  it('does not guess when identities is missing or null', () => {
    expect(isExistingEmailSignup({ user: {}, session: null })).toBe(false)
    expect(isExistingEmailSignup({ user: { identities: null }, session: null })).toBe(false)
    expect(isExistingEmailSignup({ user: null, session: null })).toBe(false)
  })
})
