/*
  The two readers behind /admin, against mocked clients. Nothing here touches
  a network or a real Supabase client.

  The predicates getDeskCounts sends are asserted literally, because the whole
  point of that reader is that it agrees WITH THE PAGE EACH TILE OPENS without
  needing the migration -- and the only thing keeping a tile and its queue in
  step is that the WHERE clauses match. Two of them deliberately do not match
  admin_dashboard(): the coordinator claims count carries the queue's
  coordinator_id filter, and the completions count has no equivalent in the SQL
  at all. Both are asserted here, so neither can be "tidied" back later.
*/

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACTIVE_SUPPORT_DAYS, getDashboard, getDeskCounts } from '@/lib/admin/dashboard'
import { invalidateAdminCache } from '@/lib/admin/cache'

type Rpc = (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown }

function client(rpcImpl: Rpc) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => rpcImpl(name, args))
  return { db: { rpc } as never, rpc }
}

// ---------------------------------------------------------------
// A mock of the query builder, enough for `select(head).eq().gt()`
// ---------------------------------------------------------------

type Filter = string
type Answer = { count: number | string | bigint | null; error?: { code?: string; message?: string } }

/** 'schools|eq:review_status=pending' -- the key the tests answer against. */
function keyOf(table: string, filters: Filter[]): string {
  return [table, ...filters].join('|')
}

/**
 * The admin gate that now opens getDeskCounts (src/lib/admin/guard.ts):
 * auth.getUser(), then `user_profiles.select('role')`. It is answered here and
 * kept out of `seen`, so `seen` stays the nine counts the reader itself sends.
 * `role` defaults to 'admin'; the tests about the gate pass something else.
 */
function gateFor(role: string | null) {
  return {
    eq: () => ({ maybeSingle: async () => ({ data: role === null ? null : { role }, error: null }) }),
  }
}

function deskClient(
  answers: Record<string, Answer>,
  seen: string[] = [],
  opts: { role?: string | null; signedIn?: boolean } = {}
) {
  const role = opts.role === undefined ? 'admin' : opts.role
  const build = (table: string, filters: Filter[]): Record<string, unknown> => {
    const key = keyOf(table, filters)
    const answer = answers[key] ?? { count: null, error: { message: `unexpected query: ${key}` } }
    return {
      count: answer.count,
      error: answer.error ?? null,
      eq: (col: string, val: unknown) => build(table, [...filters, `eq:${col}=${String(val)}`]),
      gt: (col: string) => build(table, [...filters, `gt:${col}`]),
      not: (col: string, op: string, val: unknown) =>
        build(table, [...filters, `not:${col}.${op}.${val === null ? 'null' : String(val)}`]),
    }
  }
  const getUser = vi.fn(async () => ({
    data: { user: opts.signedIn === false ? null : { id: 'caller-1' } },
  }))
  return {
    db: {
      auth: { getUser },
      from: (table: string) => ({
        select: (cols: string, selectOpts: unknown) => {
          if (table === 'user_profiles' && cols === 'role') return gateFor(role)
          seen.push(`${table}:${cols}:${JSON.stringify(selectOpts)}`)
          return build(table, [])
        },
      }),
    } as never,
    seen,
    getUser,
  }
}

/** Every predicate getDeskCounts sends, answered with a distinct number. */
const HAPPY: Record<string, Answer> = {
  'schools|eq:review_status=pending': { count: 4 },
  'schools|eq:coordinator_status=pending|not:coordinator_id.is.null': { count: 6 },
  'certificate_uploads|eq:status=pending': { count: 11 },
  'bookings|not:status.in.(cancelled,completed)|eq:score_applied=false': { count: 7 },
  'support_conversations|gt:last_message_at': { count: 3 },
  'user_profiles|eq:role=student': { count: '200000' },
  'user_profiles|eq:role=student|eq:onboarding_completed=true': { count: BigInt(180000) },
  'user_profiles|eq:role=coordinator': { count: 33 },
  'schools|eq:review_status=approved': { count: 900 },
}

beforeEach(() => {
  invalidateAdminCache()
})

// ---------------------------------------------------------------
// getDeskCounts
// ---------------------------------------------------------------

describe('getDeskCounts', () => {
  it('reads all nine counts and coerces a string and a BigInt', async () => {
    const { db } = deskClient(HAPPY)
    const result = await getDeskCounts(db)
    expect(result).toEqual({
      ok: true,
      data: {
        pending_schools: 4,
        pending_coordinators: 6,
        pending_certificates: 11,
        pending_completions: 7,
        active_support: 3,
        students: 200000,
        students_onboarded: 180000,
        coordinators: 33,
        schools_approved: 900,
      },
    })
  })

  it('asks for a head count, so no row comes back over the wire', async () => {
    const { db, seen } = deskClient(HAPPY)
    await getDeskCounts(db)
    expect(seen).toHaveLength(9)
    for (const s of seen) expect(s).toContain('{"count":"exact","head":true}')
  })

  /*
    A claim with no claimant is not a claim. Without this filter the tile counts
    schools the claims queue will never list, so an admin clears the queue and
    the tile stays lit with nothing behind it. The mock answers ONLY the
    filtered key, so dropping the .not() makes this fail rather than quietly
    reading a different number.
  */
  it('counts a coordinator claim only when a coordinator is attached, as the claims queue does', async () => {
    const { db } = deskClient(HAPPY)
    const result = await getDeskCounts(db)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.pending_coordinators).toBe(6)
  })

  /*
    The completions tile is the length of the completions queue: the page lists
    everything not cancelled and offers its button on the rows that are neither
    completed nor already scored.
  */
  it('counts exactly the bookings the completions page can act on', async () => {
    const { db } = deskClient(HAPPY)
    const result = await getDeskCounts(db)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.pending_completions).toBe(7)
  })

  it('counts the support window from ACTIVE_SUPPORT_DAYS ago, not from a fixed date', async () => {
    let sent = ''
    // Answers every count with 0 and every chained filter with itself, so the
    // shape of the calls does not matter -- only the timestamp the support
    // query is given.
    const anything: Record<string, unknown> = { count: 0, error: null }
    anything.eq = () => anything
    anything.not = () => anything
    anything.gt = (_col: string, val: string) => {
      sent = val
      return anything
    }
    const db = {
      auth: { getUser: async () => ({ data: { user: { id: 'caller-1' } } }) },
      from: (table: string) => ({
        select: (cols: string) =>
          table === 'user_profiles' && cols === 'role' ? gateFor('admin') : anything,
      }),
    } as never
    await getDeskCounts(db)
    const days = (Date.now() - Date.parse(sent)) / 86_400_000
    expect(days).toBeGreaterThan(ACTIVE_SUPPORT_DAYS - 0.01)
    expect(days).toBeLessThan(ACTIVE_SUPPORT_DAYS + 0.01)
  })

  it('fails the whole row when one count errors, rather than reporting a nought', async () => {
    const { db } = deskClient({ ...HAPPY, 'certificate_uploads|eq:status=pending': { count: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } } })
    const result = await getDeskCounts(db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('failed')
  })

  /*
    THE BUG THIS EXISTS FOR. These nine are plain table reads, so a signed-in
    student's client does not get an error from them -- it gets its own
    row-level-security view, which is one profile (their own) and no queues.
    The (admin) layout redirects that student, but in this version of Next a
    layout does not stop the page segment under it from rendering, so the
    reader still ran and stored "Students 1" under a cache key with no user in
    it, for every admin on the isolate to read for the next minute.

    So the role is checked BEFORE the cache is touched, and the refusal is not
    stored: the student never reaches a table, and the admin that follows still
    has to.
  */
  it('refuses a student, reads nothing, and leaves the cache empty for the next admin', async () => {
    invalidateAdminCache()
    const student = deskClient(HAPPY, [], { role: 'student' })
    const denied = await getDeskCounts(student.db)
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.kind).toBe('failed')
    expect(student.seen).toHaveLength(0)

    const admin = deskClient(HAPPY)
    const allowed = await getDeskCounts(admin.db)
    expect(allowed.ok).toBe(true)
    // The point of the test: the admin's call still had to go to the database,
    // so nothing of the student's was waiting in the cache for them.
    expect(admin.seen).toHaveLength(9)
    if (allowed.ok) expect(allowed.data.students).toBe(200000)
  })

  it('refuses a coordinator, a caller with no profile row, and a caller with no session', async () => {
    for (const opts of [{ role: 'coordinator' }, { role: null }, { signedIn: false }]) {
      invalidateAdminCache()
      const { db, seen } = deskClient(HAPPY, [], opts)
      const result = await getDeskCounts(db)
      expect(result.ok).toBe(false)
      expect(seen).toHaveLength(0)
    }
  })

  it('serves a second call from the cache, and never caches a failure', async () => {
    const { db, seen } = deskClient(HAPPY)
    await getDeskCounts(db)
    await getDeskCounts(db)
    expect(seen).toHaveLength(9)

    invalidateAdminCache()
    const broken = deskClient({ ...HAPPY, 'user_profiles|eq:role=coordinator': { count: null, error: { message: 'nope' } } })
    await getDeskCounts(broken.db)
    await getDeskCounts(broken.db)
    expect(broken.seen).toHaveLength(18)
  })
})

// ---------------------------------------------------------------
// getDashboard
// ---------------------------------------------------------------

const DASHBOARD = {
  pending_schools: 4,
  pending_coordinators: 6,
  pending_certificates: 11,
  active_support: 3,
  students: 200000,
  students_onboarded: 180000,
  coordinators: 33,
  schools_approved: 900,
  isc: {
    eligible: '168',
    started: 120,
    submitted: 90,
    schools_with_entries: 40,
    by_track: [{ key: 'quiz', count: '60' }],
    by_division: [{ key: 'group1', count: 30 }],
    by_status: [{ key: 'draft', count: 20 }],
    by_language: [{ key: 'en', count: 10 }],
  },
  top_states: [
    { key: 'Tamil Nadu', label: 'Tamil Nadu', eligible: 168, started: 240, submitted: 233, schools: 12 },
  ],
  stalled_states: [
    { key: 'Bihar', label: 'Bihar', eligible: '500', started: 10, submitted: BigInt(2), schools: 30 },
  ],
  timeline: [{ day: '2026-09-01', started: 5, submitted: 2 }],
}

describe('getDashboard', () => {
  it('reads all twelve keys and coerces every count', async () => {
    const { db } = client(() => ({ data: DASHBOARD, error: null }))
    const result = await getDashboard(db)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.students).toBe(200000)
    expect(result.data.isc.eligible).toBe(168)
    expect(result.data.isc.by_track).toEqual([{ key: 'quiz', count: 60 }])
    expect(result.data.top_states[0]).toEqual({
      key: 'Tamil Nadu', label: 'Tamil Nadu', eligible: 168, started: 240, submitted: 233, schools: 12,
    })
    // 233/168 = 1.39. Kept as two counts on purpose; nothing here divides them.
    expect(result.data.stalled_states[0].eligible).toBe(500)
    expect(result.data.stalled_states[0].submitted).toBe(2)
    expect(result.data.timeline).toEqual([{ day: '2026-09-01', started: 5, submitted: 2 }])
  })

  it('sends no arguments -- admin_dashboard takes none', async () => {
    const { db, rpc } = client(() => ({ data: DASHBOARD, error: null }))
    await getDashboard(db)
    expect(rpc).toHaveBeenCalledWith('admin_dashboard', {})
  })

  it('reads a timeline day that arrived as a local-midnight Date, without shifting it', async () => {
    const { db } = client(() => ({
      data: { ...DASHBOARD, timeline: [{ day: new Date(2026, 8, 1), started: 1, submitted: 0 }] },
      error: null,
    }))
    const result = await getDashboard(db)
    expect(result.ok && result.data.timeline[0].day).toBe('2026-09-01')
  })

  it('yields zeros and empty arrays rather than throwing on a null answer', async () => {
    const { db } = client(() => ({ data: null, error: null }))
    const result = await getDashboard(db)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.students).toBe(0)
    expect(result.data.isc.by_track).toEqual([])
    expect(result.data.top_states).toEqual([])
    expect(result.data.stalled_states).toEqual([])
    expect(result.data.timeline).toEqual([])
  })

  it('reports a missing function as a setup step, not a fault', async () => {
    const { db } = client(() => ({ data: null, error: { code: 'PGRST202', message: 'not found' } }))
    const result = await getDashboard(db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('migration-missing')
  })

  it('caches a success and forgets a failure, so a five-second timeout is not replayed for a minute', async () => {
    const okClient = client(() => ({ data: DASHBOARD, error: null }))
    await getDashboard(okClient.db)
    await getDashboard(okClient.db)
    expect(okClient.rpc).toHaveBeenCalledTimes(1)

    invalidateAdminCache()
    const slow = client(() => ({ data: null, error: { code: '57014', message: 'timeout' } }))
    await getDashboard(slow.db)
    await getDashboard(slow.db)
    expect(slow.rpc).toHaveBeenCalledTimes(2)
  })
})
