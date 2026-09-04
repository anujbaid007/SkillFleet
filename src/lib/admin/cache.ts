/*
  Sixty seconds, in memory, per isolate. The Cloudflare Worker this deploys to
  has no writable incremental cache, so this is the only cache there is; it
  means a room of admins refreshing costs one query a minute per isolate, which
  is the point.

  Two properties this file exists to guarantee:

  * A REJECTED promise is never stored. The value is awaited before it is put
    in the map, so a throw leaves nothing behind and the next call retries.
  * The key carries the ARGUMENTS. cacheKey() sorts the argument keys before
    serialising, so two different scopes can never share an entry and the same
    scope built in a different order still hits.

  A caveat for whoever writes the pages: these entries are NOT scoped to a
  user. Every admin sees the same numbers, so that is fine -- but it does mean
  the SQL's own `is_admin()` gate is not what protects a cached page. Gate the
  route. cachedOk() also refuses to store a failure, which keeps a non-admin's
  'admin only' error out of the next admin's cache and stops a five-second
  timeout from being replayed for a minute.
*/

import type { AdminResult } from './errors'

const store = new Map<string, { until: number; value: unknown }>()

export const ADMIN_CACHE_TTL_MS = 60_000

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs = ADMIN_CACHE_TTL_MS): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.until > Date.now()) return hit.value as T
  const value = await fn()
  store.set(key, { until: Date.now() + ttlMs, value })
  return value
}

/** cached(), but a failed AdminResult is returned and forgotten, not stored. */
export async function cachedOk<T>(
  key: string,
  fn: () => Promise<AdminResult<T>>,
  ttlMs = ADMIN_CACHE_TTL_MS
): Promise<AdminResult<T>> {
  const hit = store.get(key)
  if (hit && hit.until > Date.now()) return hit.value as AdminResult<T>
  const value = await fn()
  if (value.ok) store.set(key, { until: Date.now() + ttlMs, value })
  return value
}

/** `name:{args}` with the argument keys sorted, so the key is order-stable. */
export function cacheKey(name: string, args: Record<string, unknown>): string {
  const sorted = Object.keys(args)
    .sort()
    .map((k) => `${k}=${stringify(args[k])}`)
    .join('&')
  return `${name}:${sorted}`
}

// JSON, not String(): String(null) and String('') are both '', so
// { p_q: null } and { p_q: '' } would share a cache entry -- and those are two
// different queries ("no filter" and "an empty filter").
function stringify(v: unknown): string {
  if (v === undefined) return 'undefined'
  return JSON.stringify(v) ?? 'undefined'
}

/** No prefix clears everything. A prefix clears one function or one scope. */
export function invalidateAdminCache(prefix = ''): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
}
