import { describe, it, expect, vi } from 'vitest'
import { cached, cachedOk, cacheKey, invalidateAdminCache } from '@/lib/admin/cache'
import { ok, type AdminResult } from '@/lib/admin/errors'

describe('cached', () => {
  it('returns the stored value inside the ttl and recomputes after invalidation', async () => {
    invalidateAdminCache()
    const fn = vi.fn(async () => Math.random())
    const a = await cached('k', fn, 60_000)
    const b = await cached('k', fn, 60_000)
    expect(a).toBe(b)
    expect(fn).toHaveBeenCalledTimes(1)
    invalidateAdminCache('k')
    await cached('k', fn, 60_000)
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('does not cache a rejected promise', async () => {
    invalidateAdminCache()
    let n = 0
    const fn = async () => {
      n++
      if (n === 1) throw new Error('boom')
      return n
    }
    await expect(cached('e', fn)).rejects.toThrow('boom')
    expect(await cached('e', fn)).toBe(2)
  })
  it('expires after the ttl', async () => {
    invalidateAdminCache()
    vi.useFakeTimers()
    try {
      const fn = vi.fn(async () => Math.random())
      const a = await cached('t', fn, 60_000)
      vi.advanceTimersByTime(59_000)
      expect(await cached('t', fn, 60_000)).toBe(a)
      vi.advanceTimersByTime(2_000)
      await cached('t', fn, 60_000)
      expect(fn).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
  it('keeps different keys apart', async () => {
    invalidateAdminCache()
    const a = await cached('one', async () => 1)
    const b = await cached('two', async () => 2)
    expect([a, b]).toEqual([1, 2])
  })
})

describe('cachedOk', () => {
  it('stores a success', async () => {
    invalidateAdminCache()
    const fn = vi.fn(async () => ok(7))
    expect(await cachedOk('s', fn)).toEqual({ ok: true, data: 7 })
    expect(await cachedOk('s', fn)).toEqual({ ok: true, data: 7 })
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('never stores a failure, so a timeout is not replayed for a minute', async () => {
    invalidateAdminCache()
    let n = 0
    const fn = async (): Promise<AdminResult<number>> => {
      n++
      return n === 1 ? { ok: false, kind: 'failed', message: 'timeout' } : ok(n)
    }
    expect(await cachedOk('f', fn)).toMatchObject({ ok: false, kind: 'failed' })
    expect(await cachedOk('f', fn)).toEqual({ ok: true, data: 2 })
  })
})

describe('cacheKey', () => {
  it('separates two scopes that differ in one argument', () => {
    expect(cacheKey('admin_isc_summary', { p_state: 'Haryana', p_district: null })).not.toBe(
      cacheKey('admin_isc_summary', { p_state: 'Bihar', p_district: null })
    )
  })
  it('separates null from the empty string and from a missing key', () => {
    const a = cacheKey('f', { p_q: null })
    const b = cacheKey('f', { p_q: '' })
    const c = cacheKey('f', {})
    expect(new Set([a, b, c]).size).toBe(3)
  })
  it('does not depend on the order the arguments were built in', () => {
    expect(cacheKey('f', { b: 2, a: 1 })).toBe(cacheKey('f', { a: 1, b: 2 }))
  })
  it('prefixes with the function name, so invalidation by function works', () => {
    expect(cacheKey('admin_isc_roster', { p_page: 1 }).startsWith('admin_isc_roster:')).toBe(true)
  })
})
