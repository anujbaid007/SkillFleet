import { describe, it, expect, vi } from 'vitest'
import {
  getUsersPage,
  parseUsersQuery,
  searchAll,
  usersQueryToString,
  SEARCH_MIN_LENGTH,
  USERS_PAGE,
} from '@/lib/admin/users'
import { MAX_PAGE_SIZE } from '@/lib/admin/isc'
import { invalidateAdminCache } from '@/lib/admin/cache'

type Rpc = (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown }

function client(rpcImpl: Rpc) {
  return { rpc: vi.fn(async (name: string, args: Record<string, unknown>) => rpcImpl(name, args)) } as never
}

/** The mock client with its rpc spy still reachable, for call-count assertions. */
function spyClient(rpcImpl: Rpc) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => rpcImpl(name, args))
  return { db: { rpc } as never, rpc }
}

describe('parseUsersQuery', () => {
  it('reads every field out of a query string', () => {
    expect(parseUsersQuery({ role: 'student', onboarded: 'no', sort: 'name_asc', page: '2' })).toEqual({
      role: 'student',
      onboarded: false,
      sort: 'name_asc',
      page: 2,
    })
  })

  it('defaults to created_desc, page 1, with no q, role or onboarded', () => {
    expect(parseUsersQuery({})).toEqual({ sort: 'created_desc', page: 1 })
  })

  it('falls back to created_desc on an unrecognised sort, without erroring', () => {
    expect(parseUsersQuery({ sort: 'popularity' })).toEqual({ sort: 'created_desc', page: 1 })
  })

  it('reads onboarded=yes as true', () => {
    expect(parseUsersQuery({ onboarded: 'yes' })).toMatchObject({ onboarded: true })
  })

  it('ignores an onboarded value that is neither yes nor no', () => {
    expect(parseUsersQuery({ onboarded: 'maybe' })).toEqual({ sort: 'created_desc', page: 1 })
  })

  it('never yields a page below 1', () => {
    expect(parseUsersQuery({ page: '-5' })).toMatchObject({ page: 1 })
    expect(parseUsersQuery({ page: 'not a number' })).toMatchObject({ page: 1 })
  })

  it('trims a search term and drops one that is only whitespace', () => {
    expect(parseUsersQuery({ q: '  sharma  ' })).toMatchObject({ q: 'sharma' })
    expect(parseUsersQuery({ q: '   ' })).toEqual({ sort: 'created_desc', page: 1 })
  })

  it('reads the first value out of a repeated query param', () => {
    expect(parseUsersQuery({ role: ['student', 'admin'] })).toMatchObject({ role: 'student' })
  })
})

describe('usersQueryToString', () => {
  it('omits every field that is already the default', () => {
    expect(usersQueryToString({ sort: 'created_desc', page: 1 })).toBe('')
  })

  it('carries every non-default field', () => {
    const s = usersQueryToString({ q: 'sharma', role: 'student', onboarded: true, sort: 'name_asc', page: 3 })
    const parsed = new URLSearchParams(s.slice(1))
    expect(parsed.get('q')).toBe('sharma')
    expect(parsed.get('role')).toBe('student')
    expect(parsed.get('onboarded')).toBe('yes')
    expect(parsed.get('sort')).toBe('name_asc')
    expect(parsed.get('page')).toBe('3')
  })

  it('renders onboarded false as "no", not as an omitted field', () => {
    const s = usersQueryToString({ sort: 'created_desc', page: 1, onboarded: false })
    expect(new URLSearchParams(s.slice(1)).get('onboarded')).toBe('no')
  })

  it('applies an override without mutating the base query', () => {
    const base: Parameters<typeof usersQueryToString>[0] = { sort: 'created_desc', page: 2 }
    const s = usersQueryToString(base, { page: 5 })
    expect(new URLSearchParams(s.slice(1)).get('page')).toBe('5')
    expect(base.page).toBe(2)
  })

  it('round-trips through parseUsersQuery', () => {
    const q = parseUsersQuery({ q: 'ray', role: 'coordinator', onboarded: 'no', sort: 'created_asc', page: '4' })
    const again = parseUsersQuery(Object.fromEntries(new URLSearchParams(usersQueryToString(q).slice(1))))
    expect(again).toEqual(q)
  })
})

describe('getUsersPage', () => {
  const row = {
    id: 'u1',
    full_name: 'Priya Sharma',
    email: 'priya@example.com',
    role: 'student',
    school_name: 'Delhi Public School',
    school_state: 'Delhi',
    school_class: 'Class 8',
    onboarding_completed: true,
    created_at: '2026-01-01T00:00:00.000Z',
    total: 42,
  }

  it('sends every filter and the default page and size', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_users_page')
      expect(args).toEqual({
        p_q: 'sharma',
        p_role: 'student',
        p_onboarded: true,
        p_sort: 'created_desc',
        p_page: 1,
        p_size: USERS_PAGE,
      })
      return { data: [row], error: null }
    })
    const r = await getUsersPage(c, { q: 'sharma', role: 'student', onboarded: true, sort: 'created_desc', page: 1 })
    expect(r).toEqual({
      ok: true,
      data: {
        rows: [expect.not.objectContaining({ total: 42 })],
        total: 42,
        page: 1,
        size: USERS_PAGE,
      },
    })
  })

  it('sends null for an absent filter, not undefined', async () => {
    invalidateAdminCache()
    const c = client((_n, args) => {
      expect(args).toEqual({
        p_q: null,
        p_role: null,
        p_onboarded: null,
        p_sort: 'created_desc',
        p_page: 1,
        p_size: USERS_PAGE,
      })
      return { data: [], error: null }
    })
    expect(await getUsersPage(c, { sort: 'created_desc', page: 1 })).toMatchObject({ ok: true })
  })

  it('lifts a total that arrives as a string or a BigInt', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [{ ...row, total: '200000' }], error: null }))
    const r = await getUsersPage(c, { sort: 'created_desc', page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.total).toBe(200000)

    invalidateAdminCache()
    const big = client(() => ({ data: [{ ...row, total: BigInt('9007199254740993') }], error: null }))
    const r2 = await getUsersPage(big, { sort: 'created_desc', page: 1 })
    if (!r2.ok) throw new Error('expected ok')
    expect(typeof r2.data.total).toBe('number')
  })

  it('returns an empty page with total 0, never rows[0].total on an empty array', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [], error: null }))
    expect(await getUsersPage(c, { sort: 'created_desc', page: 1 })).toEqual({
      ok: true,
      data: { rows: [], total: 0, page: 1, size: USERS_PAGE },
    })
  })

  it('keeps a null email null rather than inventing a string', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [{ ...row, email: null }], error: null }))
    const r = await getUsersPage(c, { sort: 'created_desc', page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.rows[0].email).toBeNull()
  })

  it('never sends a page below 1', async () => {
    invalidateAdminCache()
    const c = client((_n, args) => {
      expect(args.p_page).toBe(1)
      return { data: [], error: null }
    })
    expect(await getUsersPage(c, { sort: 'created_desc', page: -5 })).toMatchObject({ ok: true })
  })

  it('clamps a size above the SQL cap so Page.size matches the rows actually returned', async () => {
    invalidateAdminCache()
    const clampedRows = Array.from({ length: MAX_PAGE_SIZE }, (_, i) => ({ ...row, id: `u${i}`, total: 5000 }))
    const c = client((_n, args) => {
      expect(args.p_size).toBe(MAX_PAGE_SIZE)
      return { data: clampedRows, error: null }
    })
    const r = await getUsersPage(c, { sort: 'created_desc', page: 1 }, 500)
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.size).toBe(MAX_PAGE_SIZE)
    expect(r.data.rows).toHaveLength(MAX_PAGE_SIZE)
    expect(r.data.total).toBe(5000)
  })

  it('maps a missing function to migration-missing', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: null, error: { code: 'PGRST202', message: 'nope' } }))
    expect(await getUsersPage(c, { sort: 'created_desc', page: 1 })).toMatchObject({
      ok: false,
      kind: 'migration-missing',
    })
  })

  it('does not cache a failure, so a timeout is not replayed to every admin', async () => {
    invalidateAdminCache()
    let n = 0
    const { db, rpc } = spyClient(() => {
      n++
      return n === 1
        ? { data: null, error: { code: '57014', message: 'statement timeout' } }
        : { data: [row], error: null }
    })
    expect(await getUsersPage(db, { sort: 'created_desc', page: 1 })).toMatchObject({ ok: false, kind: 'failed' })
    expect(await getUsersPage(db, { sort: 'created_desc', page: 1 })).toMatchObject({ ok: true })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('serves the second call from the cache, but not a different query', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: [row], error: null }))
    await getUsersPage(db, { sort: 'created_desc', page: 1 })
    await getUsersPage(db, { sort: 'created_desc', page: 1 })
    expect(rpc).toHaveBeenCalledTimes(1)
    await getUsersPage(db, { sort: 'created_desc', page: 2 })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})

describe('searchAll', () => {
  const HIT = { kind: 'student', id: 's1', title: 'Priya Sharma', subtitle: 'Delhi Public School, Class 8' }

  it('returns [] for a one-character query without calling rpc', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: [HIT], error: null }))
    expect(await searchAll(db, 'a')).toEqual({ ok: true, data: [] })
    expect(rpc).not.toHaveBeenCalled()
    expect(SEARCH_MIN_LENGTH).toBe(2)
  })

  it('returns [] for an empty or whitespace-only query without calling rpc', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: [HIT], error: null }))
    expect(await searchAll(db, '')).toEqual({ ok: true, data: [] })
    expect(await searchAll(db, '   ')).toEqual({ ok: true, data: [] })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('trims the query and groups hits by kind', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_search')
      expect(args.p_q).toBe('sharma')
      return {
        data: [
          HIT,
          { kind: 'school', id: 'sc1', title: 'DPS', subtitle: 'Hisar, Haryana' },
          { kind: 'coordinator', id: 'co1', title: 'Amit Rao', subtitle: 'DPS' },
        ],
        error: null,
      }
    })
    const r = await searchAll(c, '  sharma  ')
    expect(r).toEqual({
      ok: true,
      data: [
        { kind: 'student', id: 's1', title: 'Priya Sharma', subtitle: 'Delhi Public School, Class 8' },
        { kind: 'school', id: 'sc1', title: 'DPS', subtitle: 'Hisar, Haryana' },
        { kind: 'coordinator', id: 'co1', title: 'Amit Rao', subtitle: 'DPS' },
      ],
    })
  })

  it('maps a missing function to migration-missing', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: null, error: { code: 'PGRST202', message: 'nope' } }))
    expect(await searchAll(c, 'sharma')).toMatchObject({ ok: false, kind: 'migration-missing' })
  })

  it('caches for 15 seconds, not the default 60', async () => {
    invalidateAdminCache()
    vi.useFakeTimers()
    try {
      const { db, rpc } = spyClient(() => ({ data: [HIT], error: null }))
      await searchAll(db, 'sharma')
      await searchAll(db, 'sharma')
      expect(rpc).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(16_000)
      await searchAll(db, 'sharma')
      expect(rpc).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps two different queries apart in the cache', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: [HIT], error: null }))
    await searchAll(db, 'sharma')
    await searchAll(db, 'verma')
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
