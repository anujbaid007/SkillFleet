/*
  The two readers behind /admin, against mocked clients. Nothing here touches
  a network or a real Supabase client.

  The predicates getDeskCounts sends are asserted literally, because the whole
  point of that reader is that it agrees with admin_dashboard's own counts
  without needing the migration -- and the only thing keeping the two in step
  is that the WHERE clauses match.
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

function deskClient(answers: Record<string, Answer>, seen: string[] = []) {
  const build = (table: string, filters: Filter[]): Record<string, unknown> => {
    const key = keyOf(table, filters)
    const answer = answers[key] ?? { count: null, error: { message: `unexpected query: ${key}` } }
    return {
      count: answer.count,
      error: answer.error ?? null,
      eq: (col: string, val: unknown) => build(table, [...filters, `eq:${col}=${String(val)}`]),
      gt: (col: string) => build(table, [...filters, `gt:${col}`]),
    }
  }
  return {
    db: {
      from: (table: string) => ({
        select: (cols: string, opts: unknown) => {
          seen.push(`${table}:${cols}:${JSON.stringify(opts)}`)
          return build(table, [])
        },
      }),
    } as never,
    seen,
  }
}

/** Every predicate admin_dashboard() uses, answered with a distinct number. */
const HAPPY: Record<string, Answer> = {
  'schools|eq:review_status=pending': { count: 4 },
  'schools|eq:coordinator_status=pending': { count: 6 },
  'certificate_uploads|eq:status=pending': { count: 11 },
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
  it('reads all eight counts and coerces a string and a BigInt', async () => {
    const { db } = deskClient(HAPPY)
    const result = await getDeskCounts(db)
    expect(result).toEqual({
      ok: true,
      data: {
        pending_schools: 4,
        pending_coordinators: 6,
        pending_certificates: 11,
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
    expect(seen).toHaveLength(8)
    for (const s of seen) expect(s).toContain('{"count":"exact","head":true}')
  })

  it('counts the support window from ACTIVE_SUPPORT_DAYS ago, not from a fixed date', async () => {
    let sent = ''
    const db = {
      from: () => ({
        select: () => ({
          count: 0,
          error: null,
          eq: () => ({ count: 0, error: null, eq: () => ({ count: 0, error: null }) }),
          gt: (_col: string, val: string) => {
            sent = val
            return { count: 0, error: null }
          },
        }),
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

  it('serves a second call from the cache, and never caches a failure', async () => {
    const { db, seen } = deskClient(HAPPY)
    await getDeskCounts(db)
    await getDeskCounts(db)
    expect(seen).toHaveLength(8)

    invalidateAdminCache()
    const broken = deskClient({ ...HAPPY, 'user_profiles|eq:role=coordinator': { count: null, error: { message: 'nope' } } })
    await getDeskCounts(broken.db)
    await getDeskCounts(broken.db)
    expect(broken.seen).toHaveLength(16)
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
