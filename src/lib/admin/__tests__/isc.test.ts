import { describe, it, expect, vi } from 'vitest'
import {
  getColdSchools,
  getIscBreakdown,
  getIscRoster,
  getIscSummary,
  getIscTimeline,
  iterateExport,
} from '@/lib/admin/isc'
import { invalidateAdminCache } from '@/lib/admin/cache'
import { AdminError } from '@/lib/admin/errors'

type Rpc = (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown }

function client(rpcImpl: Rpc) {
  return { rpc: vi.fn(async (name: string, args: Record<string, unknown>) => rpcImpl(name, args)) } as never
}

/** The mock client with its rpc spy still reachable, for call-count assertions. */
function spyClient(rpcImpl: Rpc) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => rpcImpl(name, args))
  return { db: { rpc } as never, rpc }
}

const SUMMARY = {
  eligible: 10,
  started: 4,
  submitted: 2,
  schools_with_entries: 1,
  by_track: [],
  by_division: [],
  by_status: [],
  by_language: [],
}

describe('getIscSummary', () => {
  it('passes scope args and coerces the JSON', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_isc_summary')
      expect(args).toEqual({ p_state: 'Haryana', p_district: null, p_school_id: null })
      return { data: SUMMARY, error: null }
    })
    const r = await getIscSummary(c, { state: 'Haryana' })
    expect(r).toEqual({ ok: true, data: expect.objectContaining({ eligible: 10 }) })
  })

  it('maps a missing function', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: null, error: { code: 'PGRST202', message: 'nope' } }))
    expect(await getIscSummary(c, {})).toMatchObject({ ok: false, kind: 'migration-missing' })
  })

  it('drops a district that arrives without a state, which the SQL would raise on', async () => {
    invalidateAdminCache()
    const c = client((_n, args) => {
      expect(args).toEqual({ p_state: null, p_district: null, p_school_id: null })
      return { data: SUMMARY, error: null }
    })
    expect(await getIscSummary(c, { district: 'Aurangabad' })).toMatchObject({ ok: true })
  })

  it('fills in every key and list even when the JSON is unreadable', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: null, error: null }))
    const r = await getIscSummary(c, { state: 'Nowhere' })
    expect(r).toEqual({
      ok: true,
      data: {
        eligible: 0,
        started: 0,
        submitted: 0,
        schools_with_entries: 0,
        by_track: [],
        by_division: [],
        by_status: [],
        by_language: [],
      },
    })
  })

  it('coerces counts that arrive as strings, and never yields NaN', async () => {
    invalidateAdminCache()
    const c = client(() => ({
      data: { ...SUMMARY, eligible: '200000', by_status: [{ key: 'draft', count: '8000' }] },
      error: null,
    }))
    const r = await getIscSummary(c, { state: 'Bihar' })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.eligible).toBe(200000)
    expect(r.data.by_status).toEqual([{ key: 'draft', count: 8000 }])
  })

  it('serves the second call from the cache, but not a different scope', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: SUMMARY, error: null }))
    await getIscSummary(db, { state: 'Haryana' })
    await getIscSummary(db, { state: 'Haryana' })
    expect(rpc).toHaveBeenCalledTimes(1)
    await getIscSummary(db, { state: 'Bihar' })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failure, so a timeout is not replayed to every admin', async () => {
    invalidateAdminCache()
    let n = 0
    const { db, rpc } = spyClient(() => {
      n++
      return n === 1
        ? { data: null, error: { code: '57014', message: 'statement timeout' } }
        : { data: SUMMARY, error: null }
    })
    expect(await getIscSummary(db, { state: 'Goa' })).toMatchObject({ ok: false, kind: 'failed' })
    expect(await getIscSummary(db, { state: 'Goa' })).toMatchObject({ ok: true })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})

describe('getIscBreakdown', () => {
  it('sends the geography only and coerces every bigint', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_isc_breakdown')
      expect(args).toEqual({ p_state: 'Bihar', p_district: 'Aurangabad' })
      return {
        data: [
          { key: 's1', label: 'Zed School', eligible: '120', started: BigInt(30), submitted: 4, schools: '1' },
        ],
        error: null,
      }
    })
    expect(await getIscBreakdown(c, { state: 'Bihar', district: 'Aurangabad' })).toEqual({
      ok: true,
      data: [{ key: 's1', label: 'Zed School', eligible: 120, started: 30, submitted: 4, schools: 1 }],
    })
  })

  it('cannot be given a district without a state', async () => {
    invalidateAdminCache()
    const c = client((_n, args) => {
      expect(args).toEqual({ p_state: null, p_district: null })
      return { data: [], error: null }
    })
    expect(await getIscBreakdown(c, { district: 'Aurangabad' })).toEqual({ ok: true, data: [] })
  })
})

describe('getIscTimeline', () => {
  it('defaults to 30 days and reads a date string', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_isc_timeline')
      expect(args).toEqual({ p_state: null, p_district: null, p_school_id: 's1', p_days: 30 })
      return { data: [{ day: '2026-09-01', started: '3', submitted: 0 }], error: null }
    })
    expect(await getIscTimeline(c, { schoolId: 's1' })).toEqual({
      ok: true,
      data: [{ day: '2026-09-01', started: 3, submitted: 0 }],
    })
  })

  it('reads a Date without shifting the day across a timezone', async () => {
    invalidateAdminCache()
    const c = client(() => ({
      data: [{ day: new Date(2026, 8, 1), started: 1, submitted: 1 }],
      error: null,
    }))
    const r = await getIscTimeline(c, {}, 7)
    if (!r.ok) throw new Error('expected ok')
    expect(r.data[0].day).toBe('2026-09-01')
  })

  it('clamps days, because the SQL builds one row per day', async () => {
    invalidateAdminCache()
    const seen: unknown[] = []
    const c = client((_n, args) => {
      seen.push(args.p_days)
      return { data: [], error: null }
    })
    await getIscTimeline(c, { state: 'A' }, 100_000)
    await getIscTimeline(c, { state: 'B' }, 0)
    await getIscTimeline(c, { state: 'C' }, Number.NaN)
    expect(seen).toEqual([365, 1, 1])
  })
})

describe('getIscRoster', () => {
  const row = {
    id: 'e1',
    track: 'ai_for_impact',
    status: 'draft',
    division: 'group1',
    language: 'English',
    school_id: 's',
    school_name: 'S',
    leader_id: 'u',
    leader_name: 'U',
    member_count: 1,
    created_at: 'now',
    submitted_at: null,
    total: 123,
  }

  it('lifts total out of the rows', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [row], error: null }))
    const r = await getIscRoster(c, {}, { page: 2 })
    expect(r).toEqual({
      ok: true,
      data: { rows: [expect.not.objectContaining({ total: 123 })], total: 123, page: 2, size: 50 },
    })
  })

  it('returns an empty page with total 0', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [], error: null }))
    expect(await getIscRoster(c, {}, { page: 1 })).toEqual({
      ok: true,
      data: { rows: [], total: 0, page: 1, size: 50 },
    })
  })

  it('lifts a total that arrives as a string or a BigInt', async () => {
    invalidateAdminCache()
    const c = client(() => ({ data: [{ ...row, total: '800000', member_count: '4' }], error: null }))
    const r = await getIscRoster(c, { state: 'Haryana' }, { page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.total).toBe(800000)
    expect(r.data.rows[0].member_count).toBe(4)

    invalidateAdminCache()
    const big = client(() => ({ data: [{ ...row, total: BigInt('9007199254740993') }], error: null }))
    const r2 = await getIscRoster(big, { state: 'Bihar' }, { page: 1 })
    if (!r2.ok) throw new Error('expected ok')
    expect(typeof r2.data.total).toBe('number')
  })

  it('keeps the nullable columns null and passes the filters through', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_isc_roster')
      expect(args).toEqual({
        p_state: 'Haryana',
        p_district: null,
        p_school_id: null,
        p_track: 'puzzle_master',
        p_status: null,
        p_division: null,
        p_language: null,
        p_q: 'sharma',
        p_page: 3,
        p_size: 50,
      })
      return {
        data: [{ ...row, division: null, language: null, leader_name: null, submitted_at: null }],
        error: null,
      }
    })
    const r = await getIscRoster(c, { state: 'Haryana' }, { track: 'puzzle_master', q: 'sharma', page: 3 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.rows[0]).toMatchObject({
      division: null,
      language: null,
      leader_name: null,
      submitted_at: null,
    })
  })

  it('separates two pages and two scopes in the cache', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: [row], error: null }))
    await getIscRoster(db, { state: 'Haryana' }, { page: 1 })
    await getIscRoster(db, { state: 'Haryana' }, { page: 1 })
    expect(rpc).toHaveBeenCalledTimes(1)
    await getIscRoster(db, { state: 'Haryana' }, { page: 2 })
    await getIscRoster(db, { state: 'Bihar' }, { page: 1 })
    await getIscRoster(db, { state: 'Haryana' }, { page: 1, q: 'a' })
    expect(rpc).toHaveBeenCalledTimes(4)
  })

  it('never sends a page below 1', async () => {
    invalidateAdminCache()
    const c = client((_n, args) => {
      expect(args.p_page).toBe(1)
      return { data: [], error: null }
    })
    expect(await getIscRoster(c, { state: 'A' }, { page: -5 })).toMatchObject({ ok: true })
  })
})

describe('getColdSchools', () => {
  it('pages the outreach list and coerces eligible', async () => {
    invalidateAdminCache()
    const c = client((name, args) => {
      expect(name).toBe('admin_isc_cold_schools')
      expect(args).toEqual({ p_state: 'Haryana', p_district: null, p_page: 2, p_size: 20 })
      return {
        data: [
          {
            id: 's1',
            name: 'Zed School',
            state: 'Haryana',
            district: 'Hisar',
            eligible: '41',
            coordinator_status: 'none',
            total: '90',
          },
        ],
        error: null,
      }
    })
    expect(await getColdSchools(c, { state: 'Haryana' }, 2)).toEqual({
      ok: true,
      data: {
        rows: [
          {
            id: 's1',
            name: 'Zed School',
            state: 'Haryana',
            district: 'Hisar',
            eligible: 41,
            coordinator_status: 'none',
          },
        ],
        total: 90,
        page: 2,
        size: 20,
      },
    })
  })
})

describe('iterateExport', () => {
  it('follows the keyset until a short chunk', async () => {
    const chunks = [
      [
        { id: 'a', created_at: '2026-09-01' },
        { id: 'b', created_at: '2026-08-31' },
      ],
      [{ id: 'c', created_at: '2026-08-30' }],
    ]
    let call = 0
    const c = client((_n, args) => {
      if (call === 1) expect(args).toMatchObject({ p_after_created: '2026-08-31', p_after_id: 'b' })
      return { data: chunks[call++], error: null }
    })
    const seen: string[] = []
    for await (const rows of iterateExport(c, { state: 'X' }, { page: 1 }, 2)) {
      seen.push(...rows.map((r) => r.id))
    }
    expect(seen).toEqual(['a', 'b', 'c'])
  })

  it('sends no cursor on the first call and stops on an empty chunk', async () => {
    let call = 0
    const c = client((_n, args) => {
      if (call === 0) expect(args).toMatchObject({ p_after_created: null, p_after_id: null })
      call++
      return { data: [], error: null }
    })
    const seen: string[] = []
    for await (const rows of iterateExport(c, { schoolId: 's1' }, { page: 1 })) {
      seen.push(...rows.map((r) => r.id))
    }
    expect(seen).toEqual([])
    expect(call).toBe(1)
  })

  it('refuses a national export before the round trip', async () => {
    const c = client(() => {
      throw new Error('should not be called')
    })
    await expect(async () => {
      for await (const _ of iterateExport(c, {}, { page: 1 })) void _
    }).rejects.toThrow(/needs a state or a school/)
  })

  it('will not send a district without a state', async () => {
    const c = client((_n, args) => {
      expect(args).toMatchObject({ p_state: 'Bihar', p_district: null })
      return { data: [], error: null }
    })
    for await (const _ of iterateExport(c, { state: 'Bihar', district: '' }, { page: 1 })) void _
  })

  it('throws an AdminError that still carries the kind', async () => {
    const c = client(() => ({ data: null, error: { code: 'PGRST202', message: 'nope' } }))
    try {
      for await (const _ of iterateExport(c, { state: 'X' }, { page: 1 })) void _
      throw new Error('expected a throw')
    } catch (e) {
      expect(e).toBeInstanceOf(AdminError)
      expect((e as AdminError).kind).toBe('migration-missing')
    }
  })

  it('is not cached: a second pass hits the database again', async () => {
    invalidateAdminCache()
    const { db, rpc } = spyClient(() => ({ data: [], error: null }))
    for await (const _ of iterateExport(db, { state: 'X' }, { page: 1 })) void _
    for await (const _ of iterateExport(db, { state: 'X' }, { page: 1 })) void _
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
