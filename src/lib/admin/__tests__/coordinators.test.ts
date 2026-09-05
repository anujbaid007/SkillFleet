import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  COORDINATORS_PAGE,
  MAX_TREND_DAYS,
  coordinatorsQueryToString,
  enteredPercent,
  getCoordinatorBreakdown,
  getCoordinatorDetail,
  getCoordinatorSummary,
  getCoordinatorTrend,
  getCoordinatorsPage,
  parseCoordinatorsQuery,
  strongestClaim,
} from '@/lib/admin/coordinators'
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

beforeEach(() => {
  invalidateAdminCache()
})

// ---------------------------------------------------------------
// The pure parts
// ---------------------------------------------------------------

describe('parseCoordinatorsQuery', () => {
  it('reads every field out of a query string', () => {
    expect(
      parseCoordinatorsQuery({ q: 'ray', status: 'approved', state: 'Haryana', sort: 'name_asc', page: '3' })
    ).toEqual({ q: 'ray', status: 'approved', state: 'Haryana', sort: 'name_asc', page: 3 })
  })

  it('defaults to most students first, page 1, no filters', () => {
    expect(parseCoordinatorsQuery({})).toEqual({ sort: 'students_desc', page: 1 })
  })

  it('falls back to students_desc on an unrecognised sort, as the SQL does', () => {
    expect(parseCoordinatorsQuery({ sort: 'reach_desc' })).toEqual({ sort: 'students_desc', page: 1 })
  })

  it('DROPS an unrecognised status rather than passing it on', () => {
    // The SQL matches p_status exactly, so a typo would come back as an empty
    // page that looked like an answer.
    expect(parseCoordinatorsQuery({ status: 'approvedd' })).toEqual({ sort: 'students_desc', page: 1 })
  })

  it('keeps "none", which is a real status and not a missing one', () => {
    expect(parseCoordinatorsQuery({ status: 'none' })).toMatchObject({ status: 'none' })
  })

  it('never yields a page below 1', () => {
    expect(parseCoordinatorsQuery({ page: '-4' })).toMatchObject({ page: 1 })
    expect(parseCoordinatorsQuery({ page: 'later' })).toMatchObject({ page: 1 })
  })

  it('trims a search term and drops one that is only whitespace', () => {
    expect(parseCoordinatorsQuery({ q: '  sharma ' })).toMatchObject({ q: 'sharma' })
    expect(parseCoordinatorsQuery({ q: '   ' })).toEqual({ sort: 'students_desc', page: 1 })
  })

  it('reads the first value out of a repeated query param', () => {
    expect(parseCoordinatorsQuery({ state: ['Bihar', 'Delhi'] })).toMatchObject({ state: 'Bihar' })
  })
})

describe('coordinatorsQueryToString', () => {
  it('omits every field that is already the default', () => {
    expect(coordinatorsQueryToString({ sort: 'students_desc', page: 1 })).toBe('')
  })

  it('carries every non-default field', () => {
    const sp = new URLSearchParams(
      coordinatorsQueryToString({
        q: 'ray',
        status: 'pending',
        state: 'Bihar',
        sort: 'joined_desc',
        page: 4,
      }).slice(1)
    )
    expect(sp.get('q')).toBe('ray')
    expect(sp.get('status')).toBe('pending')
    expect(sp.get('state')).toBe('Bihar')
    expect(sp.get('sort')).toBe('joined_desc')
    expect(sp.get('page')).toBe('4')
  })

  it('applies an override without mutating the base query', () => {
    const base: Parameters<typeof coordinatorsQueryToString>[0] = { sort: 'students_desc', page: 2 }
    expect(new URLSearchParams(coordinatorsQueryToString(base, { page: 7 }).slice(1)).get('page')).toBe('7')
    expect(base.page).toBe(2)
  })

  it('clears a filter when the override sets it undefined', () => {
    const q = parseCoordinatorsQuery({ state: 'Bihar', q: 'ray' })
    expect(coordinatorsQueryToString(q, { state: undefined })).toBe('?q=ray')
  })

  it('round-trips through parseCoordinatorsQuery', () => {
    const q = parseCoordinatorsQuery({ q: 'ray', status: 'none', state: 'Delhi', sort: 'name_asc', page: '5' })
    const again = parseCoordinatorsQuery(
      Object.fromEntries(new URLSearchParams(coordinatorsQueryToString(q).slice(1)))
    )
    expect(again).toEqual(q)
  })
})

describe('enteredPercent', () => {
  it('is a real percentage of its own superset', () => {
    expect(enteredPercent(5, 10)).toBe(50)
    expect(enteredPercent(1003, 1056)).toBe(95)
  })

  it('keeps one decimal', () => {
    expect(enteredPercent(2, 3)).toBe(66.7)
  })

  it('is 0 rather than NaN or Infinity when there is nothing to divide', () => {
    expect(enteredPercent(0, 0)).toBe(0)
    expect(enteredPercent(4, 0)).toBe(0)
    expect(enteredPercent(Number.NaN, 10)).toBe(0)
    expect(enteredPercent(1, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('cannot exceed 100 even if a caller passes an impossible pair', () => {
    expect(enteredPercent(11, 10)).toBe(100)
  })
})

describe('strongestClaim', () => {
  const c = (id: string, claim_status: string, name: string) => ({ id, claim_status, name })

  it('is null when nothing is claimed', () => {
    expect(strongestClaim([])).toBeNull()
  })

  it('prefers approved, then pending, then rejected', () => {
    const rows = [c('c', 'rejected', 'A'), c('b', 'pending', 'A'), c('a', 'approved', 'Z')]
    expect(strongestClaim(rows)?.id).toBe('a')
    expect(strongestClaim([rows[0], rows[1]])?.id).toBe('b')
  })

  it('breaks a tie on name, then on id, like the SQL', () => {
    expect(strongestClaim([c('z', 'approved', 'Beta'), c('a', 'approved', 'Alpha')])?.id).toBe('a')
    expect(strongestClaim([c('z', 'approved', 'Same'), c('a', 'approved', 'Same')])?.id).toBe('a')
  })

  it('sorts an unknown status last rather than dropping it', () => {
    expect(strongestClaim([c('x', 'withdrawn', 'A'), c('y', 'rejected', 'Z')])?.id).toBe('y')
    expect(strongestClaim([c('x', 'withdrawn', 'A')])?.id).toBe('x')
  })

  it('does not reorder the array it is given', () => {
    const rows = [c('z', 'rejected', 'B'), c('a', 'approved', 'A')]
    strongestClaim(rows)
    expect(rows[0].id).toBe('z')
  })
})

// ---------------------------------------------------------------
// The readers
// ---------------------------------------------------------------

const SUMMARY = {
  coordinators: 33,
  approved: 19,
  pending: 6,
  rejected: 3,
  schools_total: 40,
  schools_claimed: 28,
  schools_approved: 19,
  schools_uncovered: 21,
  students_covered: 1056,
  students_uncovered: 420,
  students_entered: 1003,
  median_students_per_coordinator: 2.5,
  entered_pct: 95,
}

describe('getCoordinatorSummary', () => {
  it('sends the state and the district', async () => {
    const c = client((name, args) => {
      expect(name).toBe('admin_coordinator_summary')
      expect(args).toEqual({ p_state: 'Haryana', p_district: 'Gurugram' })
      return { data: SUMMARY, error: null }
    })
    const res = await getCoordinatorSummary(c, { state: 'Haryana', district: 'Gurugram' })
    expect(res).toEqual({ ok: true, data: SUMMARY })
  })

  it('drops a district that has no state, so the SQL exception is unreachable', async () => {
    const c = client((_name, args) => {
      expect(args).toEqual({ p_state: null, p_district: null })
      return { data: SUMMARY, error: null }
    })
    expect((await getCoordinatorSummary(c, { district: 'Gurugram' })).ok).toBe(true)
  })

  it('coerces counts that arrive as strings or BigInts', async () => {
    const c = client(() => ({
      data: { ...SUMMARY, coordinators: '33', students_covered: BigInt(1056), entered_pct: '95.0' },
      error: null,
    }))
    const res = await getCoordinatorSummary(c, {})
    expect(res.ok && res.data.coordinators).toBe(33)
    expect(res.ok && res.data.students_covered).toBe(1056)
    expect(res.ok && res.data.entered_pct).toBe(95)
  })

  it('produces all thirteen keys from a null answer rather than throwing', async () => {
    const c = client(() => ({ data: null, error: null }))
    const res = await getCoordinatorSummary(c, {})
    expect(res.ok && Object.keys(res.data).length).toBe(13)
    expect(res.ok && res.data.entered_pct).toBe(0)
  })

  it('serves a second identical call from the cache', async () => {
    const { db, rpc } = spyClient(() => ({ data: SUMMARY, error: null }))
    await getCoordinatorSummary(db, { state: 'Bihar' })
    await getCoordinatorSummary(db, { state: 'Bihar' })
    expect(rpc).toHaveBeenCalledTimes(1)
    await getCoordinatorSummary(db, { state: 'Delhi' })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('never caches a failure', async () => {
    const { db, rpc } = spyClient(() => ({ data: null, error: { code: '57014', message: 'timeout' } }))
    const first = await getCoordinatorSummary(db, {})
    expect(first).toEqual({ ok: false, kind: 'failed', message: 'timeout' })
    await getCoordinatorSummary(db, {})
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('reports a missing function as a pending setup step', async () => {
    const c = client(() => ({ data: null, error: { code: 'PGRST202', message: 'not found' } }))
    const res = await getCoordinatorSummary(c, {})
    expect(res.ok).toBe(false)
    expect(!res.ok && res.kind).toBe('migration-missing')
  })
})

describe('getCoordinatorBreakdown', () => {
  const row = {
    key: 'Haryana',
    label: 'Haryana',
    coordinators: '4',
    approved: 2,
    schools_claimed: 3,
    schools_total: 5,
    students_covered: BigInt(120),
    students_entered: 110,
  }

  it('sends ONLY p_state -- this function has no district parameter', async () => {
    const c = client((name, args) => {
      expect(name).toBe('admin_coordinator_breakdown')
      // A p_district here would be an argument PostgREST cannot match, which
      // arrives as PGRST202 and would read as a missing migration.
      expect(args).toEqual({ p_state: 'Haryana' })
      return { data: [row], error: null }
    })
    const res = await getCoordinatorBreakdown(c, { state: 'Haryana', district: 'Gurugram' })
    expect(res.ok && res.data[0]).toEqual({
      key: 'Haryana',
      label: 'Haryana',
      coordinators: 4,
      approved: 2,
      schools_claimed: 3,
      schools_total: 5,
      students_covered: 120,
      students_entered: 110,
    })
  })

  it('drops an orphan district instead of widening to it', async () => {
    const c = client((_name, args) => {
      expect(args).toEqual({ p_state: null })
      return { data: [], error: null }
    })
    expect((await getCoordinatorBreakdown(c, { district: 'Gurugram' })).ok).toBe(true)
  })

  it('answers an empty list rather than throwing on a non-array', async () => {
    const c = client(() => ({ data: null, error: null }))
    expect(await getCoordinatorBreakdown(c, {})).toEqual({ ok: true, data: [] })
  })
})

describe('getCoordinatorTrend', () => {
  const point = { day: '2026-09-01', coordinators: 5, cohort_claimed: 4, cohort_approved: 2 }

  it('sends the state and the default window', async () => {
    const c = client((name, args) => {
      expect(name).toBe('admin_coordinator_trend')
      expect(args).toEqual({ p_state: null, p_days: 30 })
      return { data: [point], error: null }
    })
    expect((await getCoordinatorTrend(c, {})).ok).toBe(true)
  })

  it('reads the cohort columns, not claims and approvals', async () => {
    const c = client(() => ({ data: [{ ...point, claims: 99, approvals: 99 }], error: null }))
    const res = await getCoordinatorTrend(c, {})
    expect(res.ok && res.data[0]).toEqual(point)
  })

  it('clamps the window to 1..365, so a hand-typed value cannot hang the page', async () => {
    const seen: unknown[] = []
    const c = client((_n, args) => {
      seen.push(args.p_days)
      return { data: [], error: null }
    })
    await getCoordinatorTrend(c, {}, 100_000)
    await getCoordinatorTrend(c, {}, 0)
    // -7 clamps to the same 1, so it is the SAME cache entry rather than a
    // third round trip -- which is the point of clamping before keying.
    await getCoordinatorTrend(c, {}, -7)
    expect(seen).toEqual([MAX_TREND_DAYS, 1])
  })

  it('reads a Date day by its local parts, not through UTC', async () => {
    // 1 Sep 2026 local midnight is 31 Aug in UTC for anything east of Greenwich.
    const c = client(() => ({ data: [{ ...point, day: new Date(2026, 8, 1) }], error: null }))
    const res = await getCoordinatorTrend(c, {})
    expect(res.ok && res.data[0].day).toBe('2026-09-01')
  })
})

describe('getCoordinatorsPage', () => {
  const row = {
    id: 'c1',
    full_name: 'Anita Rao',
    email: 'anita@example.test',
    phone: '9000000001',
    school_id: 's1',
    school_name: 'Gv Approved One',
    state: 'Haryana',
    district: 'Gurugram',
    claim_status: 'approved',
    schools_claimed: 2,
    students: 10,
    students_entered: 5,
    joined_at: '2026-01-01T00:00:00.000Z',
    total: 33,
  }

  it('sends every filter, the sort, and the default page size', async () => {
    const c = client((name, args) => {
      expect(name).toBe('admin_coordinators_page')
      expect(args).toEqual({
        p_q: 'rao',
        p_status: 'approved',
        p_state: 'Haryana',
        p_sort: 'name_asc',
        p_page: 2,
        p_size: COORDINATORS_PAGE,
      })
      return { data: [row], error: null }
    })
    const res = await getCoordinatorsPage(c, {
      q: 'rao',
      status: 'approved',
      state: 'Haryana',
      sort: 'name_asc',
      page: 2,
    })
    expect(res.ok && res.data.total).toBe(33)
    expect(res.ok && res.data.page).toBe(2)
  })

  it('clamps the size to the SQL cap AND reports the clamped value', async () => {
    // Reporting the caller's number would make pageCount() promise pages the
    // reader will never return.
    const c = client((_n, args) => {
      expect(args.p_size).toBe(MAX_PAGE_SIZE)
      return { data: [row], error: null }
    })
    const res = await getCoordinatorsPage(c, { sort: 'students_desc', page: 1 }, 5000)
    expect(res.ok && res.data.size).toBe(MAX_PAGE_SIZE)
  })

  it('keeps a claim-less row nullable and coerces its zeros', async () => {
    const claimless = {
      id: 'c4',
      full_name: 'No Claim',
      email: null,
      phone: null,
      school_id: null,
      school_name: null,
      state: null,
      district: null,
      claim_status: 'none',
      schools_claimed: '0',
      students: '0',
      students_entered: '0',
      joined_at: '2026-01-01T00:00:00.000Z',
      total: 1,
    }
    const c = client(() => ({ data: [claimless], error: null }))
    const res = await getCoordinatorsPage(c, { sort: 'students_desc', page: 1 })
    expect(res.ok && res.data.rows[0]).toEqual({
      id: 'c4',
      full_name: 'No Claim',
      email: null,
      phone: null,
      school_id: null,
      school_name: null,
      state: null,
      district: null,
      claim_status: 'none',
      schools_claimed: 0,
      students: 0,
      students_entered: 0,
      joined_at: '2026-01-01T00:00:00.000Z',
    })
  })

  it('reads an empty page as a total of 0, never rows[0].total', async () => {
    const c = client(() => ({ data: [], error: null }))
    const res = await getCoordinatorsPage(c, { sort: 'students_desc', page: 40 })
    expect(res.ok && res.data).toEqual({ rows: [], total: 0, page: 40, size: COORDINATORS_PAGE })
  })

  it('caches on the whole query, not on the page alone', async () => {
    const { db, rpc } = spyClient(() => ({ data: [row], error: null }))
    await getCoordinatorsPage(db, { sort: 'students_desc', page: 1 })
    await getCoordinatorsPage(db, { sort: 'students_desc', page: 1 })
    expect(rpc).toHaveBeenCalledTimes(1)
    await getCoordinatorsPage(db, { sort: 'students_desc', page: 1, q: 'rao' })
    await getCoordinatorsPage(db, { sort: 'name_asc', page: 1 })
    expect(rpc).toHaveBeenCalledTimes(3)
  })
})

describe('getCoordinatorDetail', () => {
  const detail = {
    id: 'c1',
    full_name: 'Anita Rao',
    email: null,
    phone: '9000000001',
    joined_at: '2026-01-01T00:00:00.000Z',
    onboarding_completed: true,
    schools_claimed: 2,
    school: {
      id: 's1',
      name: 'Gv Approved One',
      state: 'Haryana',
      district: 'Gurugram',
      review_status: 'approved',
      claim_status: 'approved',
      notes: null,
      board: 'CBSE',
    },
    students: 10,
    students_entered: 5,
    entered_pct: 50,
    entries: 3,
    submitted: 1,
    by_track: [{ key: 'quiz', count: 2 }],
  }

  it('sends the id and reads every key', async () => {
    const c = client((name, args) => {
      expect(name).toBe('admin_coordinator_detail')
      expect(args).toEqual({ p_coordinator_id: 'c1' })
      return { data: detail, error: null }
    })
    expect(await getCoordinatorDetail(c, 'c1')).toEqual({ ok: true, data: detail })
  })

  it('answers ok(null) for an id that is not a coordinator', async () => {
    // The SQL returns SQL NULL for a student's id and for an unknown uuid, and
    // a page must be able to say "not found" rather than 500.
    const c = client(() => ({ data: null, error: null }))
    expect(await getCoordinatorDetail(c, 'someone-else')).toEqual({ ok: true, data: null })
  })

  it('keeps a claim-less coordinator, with a null school and no tracks', async () => {
    const c = client(() => ({
      data: { ...detail, school: null, schools_claimed: 0, students: 0, entered_pct: 0, by_track: null },
      error: null,
    }))
    const res = await getCoordinatorDetail(c, 'c4')
    expect(res.ok && res.data?.school).toBeNull()
    expect(res.ok && res.data?.by_track).toEqual([])
  })

  it('coerces the numbers and keeps a nullable email null', async () => {
    const c = client(() => ({
      data: { ...detail, students: '10', entries: BigInt(3), email: null },
      error: null,
    }))
    const res = await getCoordinatorDetail(c, 'c1')
    expect(res.ok && res.data?.students).toBe(10)
    expect(res.ok && res.data?.entries).toBe(3)
    expect(res.ok && res.data?.email).toBeNull()
  })
})
