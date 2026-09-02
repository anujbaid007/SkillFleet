import { headers } from 'next/headers'

/**
 * The origin this request actually arrived on.
 *
 * Used to build share links. Read from the request rather than from a constant
 * so a link copied on a preview deployment points at that deployment, and a
 * link copied on skillfleet.org points at skillfleet.org.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skillfleet.org').replace(/\/$/, '')
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
