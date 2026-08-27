import 'server-only'
import { cookies } from 'next/headers'

/**
 * Sessions for the OTHER accounts in a family, kept on this device.
 *
 * The active account lives in Supabase's own auth cookies. This holds the
 * refresh token of each linked account that has signed in here before, so
 * "Parents View" / "Student View" can swap the active session in one tap
 * without another sign-in.
 *
 * httpOnly so page scripts can never read these tokens.
 */
const COOKIE = 'sf_family_sessions'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export type FamilySessions = Record<string, string> // userId -> refresh token

export async function readFamilySessions(): Promise<FamilySessions> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as FamilySessions
  } catch {
    // Corrupt or tampered cookie — treat as "no stored sessions".
  }
  return {}
}

export async function writeFamilySessions(sessions: FamilySessions): Promise<void> {
  const store = await cookies()
  const entries = Object.entries(sessions).filter(([, token]) => typeof token === 'string' && token.length > 0)

  if (entries.length === 0) {
    store.delete(COOKIE)
    return
  }

  store.set(COOKIE, JSON.stringify(Object.fromEntries(entries)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearFamilySessions(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
