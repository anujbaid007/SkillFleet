import { describe, it, expect, vi } from 'vitest'
import {
  getCertificatesQueue,
  getCoordinatorsQueue,
  getSchoolsQueue,
  getSimilarSchools,
  parseQueueQuery,
  queueQueryToString,
  QUEUE_PAGE,
  SIMILAR_BATCH_MAX,
} from '@/lib/admin/queues'
import { MAX_PAGE_SIZE } from '@/lib/admin/isc'
import { invalidateAdminCache } from '@/lib/admin/cache'

// ---------------------------------------------------------------
// A PostgREST builder that records what was asked of it
// ---------------------------------------------------------------

interface Call {
  table: string
  ops: [string, unknown[]][]
}

type Response = { data: unknown; error: unknown; count?: number | null }

/**
 * The admin gate's own lookup: `user_profiles`, `select('role')`. It is
 * answered inside fakeDb and kept OUT of `calls`, so the call indices a test
 * asserts on are the reader's own queries and nothing else. The queues read
 * user_profiles for names too -- that one selects 'id, full_name, phone', so
 * the two never collide.
 */
function isGateLookup(call: Call): boolean {
  return (
    call.table === 'user_profiles' &&
    call.ops.some(([name, a]) => name === 'select' && a[0] === 'role')
  )
}

/**
 * Every method returns the same chain and the chain is thenable, so a reader
 * can build any filter it likes and the test sees the whole sequence. The
 * response is chosen when the query is awaited, by which point every filter
 * has been recorded.
 *
 * `role` is what the caller's own profile says. It defaults to 'admin' because
 * that is what every test about a queue's SQL is about; the tests that are
 * about the gate pass 'student' or null.
 */
function fakeDb(
  respond: (call: Call) => Response,
  opts: { role?: string | null; signedIn?: boolean } = {}
) {
  const calls: Call[] = []
  const role = opts.role === undefined ? 'admin' : opts.role
  const user = opts.signedIn === false ? null : { id: 'caller-1' }
  const from = vi.fn((table: string) => {
    const call: Call = { table, ops: [] }
    calls.push(call)
    const chain: Record<string | symbol, unknown> = {}
    const proxy: unknown = new Proxy(chain, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: Response) => void) => {
            if (isGateLookup(call)) {
              const at = calls.indexOf(call)
              if (at >= 0) calls.splice(at, 1)
              return resolve({ data: role === null ? null : { role }, error: null })
            }
            resolve(respond(call))
          }
        }
        return (...args: unknown[]) => {
          call.ops.push([String(prop), args])
          return proxy
        }
      },
    })
    return proxy
  })
  const auth = { getUser: vi.fn(async () => ({ data: { user } })) }
  return { db: { from, auth } as never, calls, from, auth }
}

function args(call: Call | undefined, name: string): unknown[] | undefined {
  return call?.ops.find(([n]) => n === name)?.[1]
}

function every(call: Call | undefined, name: string): unknown[][] {
  return (call?.ops ?? []).filter(([n]) => n === name).map(([, a]) => a)
}

function has(call: Call | undefined, name: string): boolean {
  return (call?.ops ?? []).some(([n]) => n === name)
}

type Rpc = (name: string, rpcArgs: Record<string, unknown>) => { data: unknown; error: unknown }

function rpcClient(impl: Rpc) {
  const rpc = vi.fn(async (name: string, a: Record<string, unknown>) => impl(name, a))
  return { db: { rpc } as never, rpc }
}

const SCHOOL = {
  id: 's1',
  name: 'Delhi Public School',
  state: 'Delhi',
  district: 'South Delhi',
  review_status: 'pending',
  created_at: '2026-09-01T12:00:00.000Z',
  created_by: 'u1',
}

// ---------------------------------------------------------------

describe('parseQueueQuery', () => {
  it('falls back to the queue default when no status is given', () => {
    expect(parseQueueQuery({}, 'pending')).toEqual({ status: 'pending', page: 1 })
  })

  it('reads a status, a search term and a page', () => {
    expect(parseQueueQuery({ status: 'approved', q: ' dps ', page: '3' }, 'pending')).toEqual({
      status: 'approved',
      q: 'dps',
      page: 3,
    })
  })

  it('ignores a status that is not one of the four', () => {
    expect(parseQueueQuery({ status: 'merged' }, 'pending')).toEqual({ status: 'pending', page: 1 })
  })

  it('never yields a page below one', () => {
    expect(parseQueueQuery({ page: '0' }, 'pending')).toMatchObject({ page: 1 })
    expect(parseQueueQuery({ page: '-4' }, 'pending')).toMatchObject({ page: 1 })
    expect(parseQueueQuery({ page: 'later' }, 'pending')).toMatchObject({ page: 1 })
  })

  it('drops a whitespace-only search term', () => {
    expect(parseQueueQuery({ q: '   ' }, 'pending')).toEqual({ status: 'pending', page: 1 })
  })

  it('reads the first value of a repeated param', () => {
    expect(parseQueueQuery({ status: ['approved', 'rejected'] }, 'pending')).toMatchObject({
      status: 'approved',
    })
  })
})

describe('queueQueryToString', () => {
  it('omits the default status and page one', () => {
    expect(queueQueryToString({ status: 'pending', page: 1 }, 'pending')).toBe('')
  })

  it('carries a non-default status, a term and a page', () => {
    const sp = new URLSearchParams(
      queueQueryToString({ status: 'all', q: 'dps', page: 4 }, 'pending').slice(1)
    )
    expect(sp.get('status')).toBe('all')
    expect(sp.get('q')).toBe('dps')
    expect(sp.get('page')).toBe('4')
  })

  it('applies an override without mutating the base query', () => {
    const base = { status: 'pending', page: 3 }
    const s = queueQueryToString(base, 'pending', { page: 1, status: 'rejected' })
    const sp = new URLSearchParams(s.slice(1))
    expect(sp.get('page')).toBeNull()
    expect(sp.get('status')).toBe('rejected')
    expect(base.page).toBe(3)
  })

  it('round-trips through parseQueueQuery', () => {
    const q = parseQueueQuery({ status: 'rejected', q: 'ray', page: '2' }, 'pending')
    const again = parseQueueQuery(
      Object.fromEntries(new URLSearchParams(queueQueryToString(q, 'pending').slice(1))),
      'pending'
    )
    expect(again).toEqual(q)
  })
})

describe('getSchoolsQueue', () => {
  it('filters by status, asks for an exact count and windows the page', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'schools'
        ? { data: [SCHOOL], error: null, count: 84 }
        : { data: [{ id: 'u1', full_name: 'Priya Sharma', phone: null }], error: null }
    )
    const r = await getSchoolsQueue(db, { status: 'pending', page: 2 })
    if (!r.ok) throw new Error('expected ok')

    const schools = calls.find((c) => c.table === 'schools')
    expect(args(schools, 'select')?.[1]).toEqual({ count: 'exact' })
    expect(args(schools, 'eq')).toEqual(['review_status', 'pending'])
    expect(args(schools, 'range')).toEqual([QUEUE_PAGE, QUEUE_PAGE * 2 - 1])
    expect(r.data).toMatchObject({ total: 84, page: 2, size: QUEUE_PAGE })
    expect(r.data.rows[0]).toMatchObject({ id: 's1', submitted_by: 'Priya Sharma' })
  })

  it('does not filter by status at all when the status is "all"', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({ data: [], error: null, count: 0 }))
    await getSchoolsQueue(db, { status: 'all', page: 1 })
    expect(has(calls.find((c) => c.table === 'schools'), 'eq')).toBe(false)
  })

  it('searches by name and neuters a wildcard typed into the box', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({ data: [], error: null, count: 0 }))
    await getSchoolsQueue(db, { status: 'pending', q: '100%_public*', page: 1 })
    expect(args(calls.find((c) => c.table === 'schools'), 'ilike')).toEqual([
      'name',
      '%100__public_%',
    ])
  })

  it('clamps a size above the SQL cap and reports the clamped size', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({ data: [], error: null, count: 5000 }))
    const r = await getSchoolsQueue(db, { status: 'pending', page: 1 }, 500)
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.size).toBe(MAX_PAGE_SIZE)
    expect(args(calls.find((c) => c.table === 'schools'), 'range')).toEqual([0, MAX_PAGE_SIZE - 1])
  })

  it('coerces a count that arrives as a string, and reads an empty page as zero', async () => {
    invalidateAdminCache()
    const asString = fakeDb((call) =>
      call.table === 'schools'
        ? { data: [SCHOOL], error: null, count: '2000' as unknown as number }
        : { data: [], error: null }
    )
    const r = await getSchoolsQueue(asString.db, { status: 'pending', page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.total).toBe(2000)

    invalidateAdminCache()
    const empty = fakeDb(() => ({ data: [], error: null, count: null }))
    const r2 = await getSchoolsQueue(empty.db, { status: 'pending', page: 1 })
    if (!r2.ok) throw new Error('expected ok')
    expect(r2.data).toEqual({ rows: [], total: 0, page: 1, size: QUEUE_PAGE })
  })

  it('does not look up submitters when no row has one', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({
      data: [{ ...SCHOOL, created_by: null }],
      error: null,
      count: 1,
    }))
    const r = await getSchoolsQueue(db, { status: 'pending', page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.rows[0].submitted_by).toBeNull()
    expect(calls.filter((c) => c.table === 'user_profiles')).toHaveLength(0)
  })

  it('reads a page past the last one as empty, carrying the real total', async () => {
    invalidateAdminCache()
    // PostgREST answers 416 PGRST103 for a window that starts past the end.
    // The reader asks again for the count alone rather than reporting a fault.
    const { db, calls } = fakeDb((call) =>
      has(call, 'range')
        ? { data: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable' } }
        : { data: [], error: null, count: 32891 }
    )
    const r = await getSchoolsQueue(db, { status: 'all', page: 9999 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data).toEqual({ rows: [], total: 32891, page: 9999, size: QUEUE_PAGE })
    // The second query asks for no rows at all, only the count.
    expect(args(calls[1], 'limit')).toEqual([0])
    expect(calls).toHaveLength(2)
  })

  it('does not ask twice for a failure that is not a range overrun', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    }))
    expect(await getSchoolsQueue(db, { status: 'all', page: 2 })).toMatchObject({
      ok: false,
      kind: 'failed',
    })
    // `calls` counts the reader's own queries; the admin gate's profile lookup
    // is answered inside fakeDb and kept out of it.
    expect(calls).toHaveLength(1)
  })

  it('reports a failure, and does not cache it', async () => {
    invalidateAdminCache()
    let n = 0
    const { db, calls } = fakeDb(() => {
      n++
      return n === 1
        ? { data: null, error: { code: '57014', message: 'statement timeout' }, count: null }
        : { data: [], error: null, count: 0 }
    })
    expect(await getSchoolsQueue(db, { status: 'pending', page: 1 })).toMatchObject({
      ok: false,
      kind: 'failed',
    })
    expect(await getSchoolsQueue(db, { status: 'pending', page: 1 })).toMatchObject({ ok: true })
    expect(calls).toHaveLength(2)
  })

  it('serves a repeat of the same query from the cache, but not a different page', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({ data: [], error: null, count: 0 }))
    await getSchoolsQueue(db, { status: 'pending', page: 1 })
    await getSchoolsQueue(db, { status: 'pending', page: 1 })
    expect(calls).toHaveLength(1)
    await getSchoolsQueue(db, { status: 'pending', page: 2 })
    expect(calls).toHaveLength(2)
  })
})

describe('getSimilarSchools', () => {
  const ROW = {
    school_id: 's1',
    similar_id: 'x1',
    similar_name: 'Delhi Public Schl',
    similar_address: 'Sector 12',
    similar_review_status: 'approved',
    score: 0.72,
  }

  it('returns an empty map for no ids, without a round trip', async () => {
    invalidateAdminCache()
    const { db, rpc } = rpcClient(() => ({ data: [ROW], error: null }))
    const r = await getSimilarSchools(db, [])
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.size).toBe(0)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('sends every id once and groups the answers by school', async () => {
    invalidateAdminCache()
    const { db, rpc } = rpcClient((name, a) => {
      expect(name).toBe('admin_similar_schools_batch')
      expect(a).toEqual({ p_school_ids: ['s1', 's2'] })
      return { data: [ROW, { ...ROW, similar_id: 'x2' }, { ...ROW, school_id: 's2' }], error: null }
    })
    const r = await getSimilarSchools(db, ['s1', 's2', 's1'])
    if (!r.ok) throw new Error('expected ok')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(r.data.get('s1')).toHaveLength(2)
    expect(r.data.get('s2')).toHaveLength(1)
    expect(r.data.get('s3')).toBeUndefined()
    expect(r.data.get('s1')?.[0]).toEqual({
      id: 'x1',
      name: 'Delhi Public Schl',
      address: 'Sector 12',
      review_status: 'approved',
      score: 0.72,
    })
  })

  it('coerces a score that arrives as a string', async () => {
    invalidateAdminCache()
    const { db } = rpcClient(() => ({ data: [{ ...ROW, score: '0.61' }], error: null }))
    const r = await getSimilarSchools(db, ['s1'])
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.get('s1')?.[0].score).toBeCloseTo(0.61)
  })

  it('never sends more ids than the SQL will accept', async () => {
    invalidateAdminCache()
    const many = Array.from({ length: SIMILAR_BATCH_MAX + 50 }, (_, i) => `s${i}`)
    const { db } = rpcClient((_n, a) => {
      expect((a.p_school_ids as string[]).length).toBe(SIMILAR_BATCH_MAX)
      return { data: [], error: null }
    })
    expect(await getSimilarSchools(db, many)).toMatchObject({ ok: true })
  })

  it('maps a missing function to migration-missing, so the page can say so calmly', async () => {
    invalidateAdminCache()
    const { db } = rpcClient(() => ({ data: null, error: { code: 'PGRST202', message: 'nope' } }))
    expect(await getSimilarSchools(db, ['s1'])).toMatchObject({
      ok: false,
      kind: 'migration-missing',
    })
  })
})

describe('getCoordinatorsQueue', () => {
  const CLAIM = {
    id: 'sc1',
    name: 'Kendriya Vidyalaya',
    state: 'Delhi',
    district: 'North Delhi',
    review_status: 'approved',
    coordinator_id: 'c1',
    coordinator_status: 'pending',
    coordinator_notes: null,
    board: 'CBSE',
    student_count_range: '500-1000',
  }

  it('excludes rows with no claim and no claimant, and joins the applicant', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'schools'
        ? { data: [CLAIM], error: null, count: 1 }
        : { data: [{ id: 'c1', full_name: 'Anita Rao', phone: '9876543210' }], error: null }
    )
    const r = await getCoordinatorsQueue(db, { status: 'pending', page: 1 })
    if (!r.ok) throw new Error('expected ok')

    const schools = calls.find((c) => c.table === 'schools')
    expect(args(schools, 'neq')).toEqual(['coordinator_status', 'none'])
    expect(args(schools, 'not')).toEqual(['coordinator_id', 'is', null])
    expect(args(schools, 'eq')).toEqual(['coordinator_status', 'pending'])
    expect(r.data.rows[0]).toMatchObject({
      school_id: 'sc1',
      coordinator_id: 'c1',
      applicant_name: 'Anita Rao',
      applicant_phone: '9876543210',
      school_review_status: 'approved',
      coordinator_status: 'pending',
    })
  })

  it('matches the applicant as well as the school when searching', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) => {
      if (call.table === 'schools') return { data: [], error: null, count: 0 }
      // The name lookup and the profile join both hit user_profiles.
      return { data: [{ id: 'c1', full_name: 'Anita Rao', phone: null }], error: null }
    })
    await getCoordinatorsQueue(db, { status: 'pending', q: 'anita', page: 1 })
    const lookup = calls.find((c) => c.table === 'user_profiles')
    expect(args(lookup, 'eq')).toEqual(['role', 'coordinator'])
    expect(args(lookup, 'or')?.[0]).toBe('full_name.ilike.%anita%,phone.ilike.%anita%')
    expect(args(calls.find((c) => c.table === 'schools'), 'or')?.[0]).toBe(
      'name.ilike.%anita%,coordinator_id.in.(c1)'
    )
  })

  it('still searches by school name when no applicant matches', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'schools' ? { data: [], error: null, count: 0 } : { data: [], error: null }
    )
    await getCoordinatorsQueue(db, { status: 'all', q: 'vidyalaya', page: 1 })
    expect(args(calls.find((c) => c.table === 'schools'), 'or')?.[0]).toBe(
      'name.ilike.%vidyalaya%'
    )
  })

  it('orders the applicant lookup by id, so two pages of one search agree', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'schools' ? { data: [], error: null, count: 0 } : { data: [], error: null }
    )
    await getCoordinatorsQueue(db, { status: 'all', q: 'sharma', page: 1 })
    const lookup = calls.find((c) => c.table === 'user_profiles')
    // Without an order, a limited match set is free to differ per request.
    expect(args(lookup, 'order')).toEqual(['id'])
    expect(args(lookup, 'limit')).toEqual([200])
  })

  it('strips the punctuation that would break an or() filter', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'schools' ? { data: [], error: null, count: 0 } : { data: [], error: null }
    )
    await getCoordinatorsQueue(db, { status: 'all', q: 'St. Mary (Main), Delhi', page: 1 })
    expect(args(calls.find((c) => c.table === 'schools'), 'or')?.[0]).toBe(
      'name.ilike.%St. Mary _Main__ Delhi%'
    )
  })
})

describe('getCertificatesQueue', () => {
  const CERT = {
    id: 'ce1',
    file_name: 'olympiad.pdf',
    description: 'Maths olympiad',
    status: 'pending',
    created_at: '2026-09-02T18:40:00.000Z',
    student_id: 'st1',
    points_approved: '0',
    growth_parameters: { name: 'Problem solving' },
  }

  it('reads the skill name off the embed and the student off the join', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'certificate_uploads'
        ? { data: [CERT], error: null, count: 12 }
        : { data: [{ id: 'st1', full_name: 'Rohit Verma', phone: null }], error: null }
    )
    const r = await getCertificatesQueue(db, { status: 'pending', page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(args(calls.find((c) => c.table === 'certificate_uploads'), 'eq')).toEqual([
      'status',
      'pending',
    ])
    expect(r.data.total).toBe(12)
    expect(r.data.rows[0]).toMatchObject({
      id: 'ce1',
      student_name: 'Rohit Verma',
      parameter_name: 'Problem solving',
      points_approved: 0,
    })
  })

  it('leaves the skill null when the certificate has none tagged', async () => {
    invalidateAdminCache()
    const { db } = fakeDb((call) =>
      call.table === 'certificate_uploads'
        ? { data: [{ ...CERT, growth_parameters: null }], error: null, count: 1 }
        : { data: [], error: null }
    )
    const r = await getCertificatesQueue(db, { status: 'pending', page: 1 })
    if (!r.ok) throw new Error('expected ok')
    expect(r.data.rows[0].parameter_name).toBeNull()
  })

  it('searches the file name, the description and the student', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb((call) =>
      call.table === 'certificate_uploads'
        ? { data: [], error: null, count: 0 }
        : { data: [{ id: 'st1', full_name: 'Rohit', phone: null }], error: null }
    )
    await getCertificatesQueue(db, { status: 'all', q: 'rohit', page: 1 })
    expect(args(calls.find((c) => c.table === 'certificate_uploads'), 'or')?.[0]).toBe(
      'file_name.ilike.%rohit%,description.ilike.%rohit%,student_id.in.(st1)'
    )
    // A certificate search looks at every student, not one role.
    expect(every(calls.find((c) => c.table === 'user_profiles'), 'eq')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------
// The admin gate inside the readers
// ---------------------------------------------------------------

/*
  THE BUG THIS EXISTS FOR. These three readers are plain table reads, so a
  signed-in student's client does not get an error from them -- it gets its own
  row-level-security view: no schools queue, no claims, its own certificates.
  The (admin) layout redirects that student, but in this version of Next a
  layout does not stop the page segment under it from rendering, so the reader
  still ran and stored that view under a cache key with no user in it. Every
  admin on the isolate then read empty queues for a minute, and the student
  could do it again every minute.

  So: the role is checked BEFORE the cache is touched, and the failure is not
  stored. Each test proves both halves -- the student never reaches the table,
  and the admin that follows still has to.
*/
describe('the admin gate inside the queue readers', () => {
  it('refuses a student on the schools queue and leaves the cache empty', async () => {
    invalidateAdminCache()
    const student = fakeDb(() => ({ data: [SCHOOL], error: null, count: 1 }), {
      role: 'student',
    })
    const denied = await getSchoolsQueue(student.db, { status: 'pending', page: 1 })
    expect(denied).toMatchObject({ ok: false, kind: 'failed' })
    expect(student.calls).toHaveLength(0)

    const admin = fakeDb(() => ({ data: [SCHOOL], error: null, count: 1 }))
    const allowed = await getSchoolsQueue(admin.db, { status: 'pending', page: 1 })
    expect(allowed.ok).toBe(true)
    // The point of the test: the admin's call still had to go to the database,
    // so nothing of the student's was waiting in the cache for them.
    expect(admin.calls.length).toBeGreaterThan(0)
    if (allowed.ok) expect(allowed.data.total).toBe(1)
  })

  it('refuses a student on the coordinators queue and leaves the cache empty', async () => {
    invalidateAdminCache()
    const student = fakeDb(() => ({ data: [], error: null, count: 0 }), { role: 'student' })
    expect(await getCoordinatorsQueue(student.db, { status: 'pending', page: 1 })).toMatchObject({
      ok: false,
      kind: 'failed',
    })
    expect(student.calls).toHaveLength(0)

    const admin = fakeDb(() => ({ data: [], error: null, count: 0 }))
    expect((await getCoordinatorsQueue(admin.db, { status: 'pending', page: 1 })).ok).toBe(true)
    expect(admin.calls.length).toBeGreaterThan(0)
  })

  it('refuses a student on the certificates queue and leaves the cache empty', async () => {
    invalidateAdminCache()
    const student = fakeDb(() => ({ data: [], error: null, count: 0 }), { role: 'student' })
    expect(await getCertificatesQueue(student.db, { status: 'pending', page: 1 })).toMatchObject({
      ok: false,
      kind: 'failed',
    })
    expect(student.calls).toHaveLength(0)

    const admin = fakeDb(() => ({ data: [], error: null, count: 0 }))
    const allowed = await getCertificatesQueue(admin.db, { status: 'pending', page: 1 })
    expect(allowed.ok).toBe(true)
    expect(admin.calls.length).toBeGreaterThan(0)
  })

  it('refuses a coordinator, and a caller with no profile row at all', async () => {
    invalidateAdminCache()
    for (const role of ['coordinator', null]) {
      const { db, calls } = fakeDb(() => ({ data: [], error: null, count: 0 }), { role })
      expect(await getSchoolsQueue(db, { status: 'pending', page: 1 })).toMatchObject({
        ok: false,
        kind: 'failed',
      })
      expect(calls).toHaveLength(0)
    }
  })

  it('refuses a caller with no session before it asks for a profile', async () => {
    invalidateAdminCache()
    const { db, calls } = fakeDb(() => ({ data: [], error: null, count: 0 }), { signedIn: false })
    expect(await getSchoolsQueue(db, { status: 'pending', page: 1 })).toMatchObject({
      ok: false,
      kind: 'failed',
    })
    expect(calls).toHaveLength(0)
  })
})
