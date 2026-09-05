/*
  The three review queues an admin works daily: schools students added,
  coordinators claiming a school, and certificate uploads.

  These do NOT go through admin_* SQL functions, because they do not need to:
  each is one table, filtered by one status column, and Postgres can count a
  filtered index scan cheaply. So they are plain PostgREST reads with
  `{ count: 'exact' }` and `.range()` -- but they follow every other rule the
  RPC readers follow, and for the same reasons:

  * A page SIZE is clamped to MAX_PAGE_SIZE and REPORTED as clamped, so the
    page count a Pagination draws can never promise a page the reader will not
    return.
  * A count is coerced (src/lib/admin/coerce.ts). PostgREST sends the exact
    count in a Content-Range header and supabase-js parses it, but nothing here
    trusts the wire type.
  * Successes are cached for sixty seconds and failures are not, keyed on the
    arguments -- src/lib/admin/cache.ts. THE CACHE IS NOT USER-SCOPED, so every
    caller must gate on the admin role itself before reading. The (admin)
    layout gates the pages; src/app/(admin)/admin/queues/actions.ts re-checks
    inside every action, because a server action is a POST endpoint that the
    layout never runs for.
  * Every action that changes a row calls invalidateAdminCache(), or an admin
    would watch the row they just approved sit in the queue for another minute.

  getSimilarSchools is the one RPC here, and the reason this file exists at all:
  the schools queue used to call find_similar_schools ONCE PER ROW, so a
  recruitment drive that put a thousand schools in the queue was a thousand
  round trips on one page render. admin_similar_schools_batch does the whole
  page in one call.
*/

import { cachedOk, cacheKey } from '@/lib/admin/cache'
import { field, toNullableText, toNumber, toText } from '@/lib/admin/coerce'
import { mapRpcError, ok, type AdminResult } from '@/lib/admin/errors'
import { MAX_PAGE_SIZE, type Page } from '@/lib/admin/isc'
import { MAX_FILTER_LENGTH, MAX_PAGE, type SearchParams } from '@/lib/admin/scope'
import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Db = Awaited<ReturnType<typeof createClient>>
type AdminFunctionName = Extract<keyof Database['public']['Functions'], `admin_${string}`>

// ---------------------------------------------------------------
// The query a queue page is looking at
// ---------------------------------------------------------------

/** 'all' is the escape hatch a search needs: a school that was approved last
 *  month is not in the pending tab, and a search that silently cannot find it
 *  is worse than no search. */
export const QUEUE_STATUSES = ['pending', 'approved', 'rejected', 'all'] as const

export interface QueueQuery {
  status: string
  q?: string
  page: number
}

/** Twenty-five rows: these are tall rows, and a bulk action over a full page
 *  is one round trip per row (see actions.ts), so a page is also the batch. */
export const QUEUE_PAGE = 25

/** admin_similar_schools_batch raises above this. A page can never reach it --
 *  MAX_PAGE_SIZE is the same number -- but the slice makes that unconditional. */
export const SIMILAR_BATCH_MAX = 200

/**
 * How many name matches a queue search will resolve to ids before filtering.
 * Coordinator and student names live in user_profiles, not on the queue's own
 * table, so searching them is a lookup first and a filter second. A name so
 * common that more than two hundred people share it will match only the first
 * two hundred; every other search is exact.
 */
const PROFILE_MATCH_LIMIT = 200

// ---------------------------------------------------------------
// The shapes a page receives
// ---------------------------------------------------------------

export interface SchoolQueueRow {
  id: string
  name: string
  state: string
  district: string
  review_status: string
  created_at: string
  /** The student who added it. Null when the row has no creator, or their
   *  profile is gone -- render a word, never the literal null. */
  submitted_by: string | null
}

export interface SimilarSchool {
  id: string
  name: string
  address: string | null
  review_status: string
  score: number
}

export interface CoordinatorQueueRow {
  school_id: string
  coordinator_id: string
  school_name: string
  state: string
  district: string
  /** The SCHOOL's own review state, which is independent of the claim: a
   *  teacher can claim a school that is itself still awaiting approval. */
  school_review_status: string
  coordinator_status: string
  coordinator_notes: string | null
  board: string | null
  student_count_range: string | null
  applicant_name: string | null
  applicant_phone: string | null
}

export interface CertificateQueueRow {
  id: string
  file_name: string | null
  description: string | null
  status: string
  created_at: string
  student_id: string
  student_name: string | null
  points_approved: number
  parameter_name: string | null
}

// ---------------------------------------------------------------
// Query string <-> QueueQuery
// ---------------------------------------------------------------

function first(v: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().slice(0, MAX_FILTER_LENGTH)
  return s === '' ? undefined : s
}

/**
 * Total by construction: any garbage in the query string yields a valid query,
 * never a throw. A status that is not one of the four falls back to the
 * queue's own default, so a typo in the address bar shows the pending tab
 * rather than an empty page filtered to nothing.
 */
export function parseQueueQuery(sp: SearchParams, defaultStatus: string): QueueQuery {
  const out: QueueQuery = { status: defaultStatus, page: 1 }
  const status = first(sp.status)
  if (status && (QUEUE_STATUSES as readonly string[]).includes(status)) out.status = status
  const q = first(sp.q)
  if (q) out.q = q
  const p = Number.parseInt(first(sp.page) ?? '', 10)
  if (Number.isFinite(p) && p > 1) out.page = Math.min(Math.floor(p), MAX_PAGE)
  return out
}

/**
 * The inverse, for tab and page links. Omits anything already at its default,
 * so the plain queue link stays plain, and round-trips through
 * parseQueueQuery unchanged.
 */
export function queueQueryToString(
  q: QueueQuery,
  defaultStatus: string,
  overrides: Partial<QueueQuery> = {}
): string {
  const merged = { ...q, ...overrides }
  const sp = new URLSearchParams()
  if (merged.status && merged.status !== defaultStatus) sp.set('status', merged.status)
  if (merged.q) sp.set('q', merged.q)
  if (merged.page > 1) sp.set('page', String(merged.page))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// ---------------------------------------------------------------
// Turning a typed search term into a filter that cannot misbehave
// ---------------------------------------------------------------

/**
 * % and _ are LIKE wildcards, and PostgREST reads * as another spelling of %.
 * Left alone, one of them typed into the search box turns "find this school"
 * into "read the whole table" -- so each becomes _, which matches exactly the
 * one character it stood for. The search still finds "50% attendance"; it just
 * also finds "50x attendance", which costs nothing.
 */
function likeTerm(q: string | undefined): string | undefined {
  const t = (q ?? '').trim().replace(/[%_*]/g, '_')
  return t === '' ? undefined : t
}

/**
 * The same, plus the punctuation that IS the or() grammar: a comma, a bracket
 * or a quote inside a value ends the clause early and PostgREST answers 400.
 * Only used where a filter has to sit inside .or().
 */
function orTerm(q: string | undefined): string | undefined {
  const t = (q ?? '').trim().replace(/[%_*,()"\\]/g, '_')
  return t === '' ? undefined : t
}

// ---------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------

type TableResponse = {
  data: unknown
  error: { code?: string; message?: string } | null
  count?: number | null
}

type RpcResponse = { data: unknown; error: { code?: string; message?: string } | null }

function callRpc(db: Db, name: AdminFunctionName, args: Record<string, unknown>): Promise<RpcResponse> {
  const client = db as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResponse>
  }
  return client.rpc(name, args)
}

function rows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : []
}

function atLeastOne(n: number): number {
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

/** The half-open row window PostgREST's Range header wants, both ends inclusive. */
function rowWindow(page: number, size: number): [number, number] {
  const from = (page - 1) * size
  return [from, from + size - 1]
}

/** The two ways a built query gets consumed: one window, or the count alone. */
interface Windowed {
  range: (from: number, to: number) => PromiseLike<TableResponse>
  limit: (n: number) => PromiseLike<TableResponse>
}

/**
 * PostgREST answers 416 PGRST103 -- "Requested range not satisfiable" -- when
 * the window starts past the last row. A page number typed into the address
 * bar or kept in a stale bookmark is not a fault, so it must not read as one.
 */
function isPastLastPage(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST103'
}

/**
 * One window of a table read, plus the total the same filters match.
 *
 * `build` is called again rather than reused because a PostgREST query builder
 * is consumed when it is awaited. The second call happens only past the last
 * page, where it asks for the count with no rows at all (limit 0 still carries
 * the exact count in Content-Range) -- so Pagination can say which page is the
 * last one and link back to it, instead of the queue reading as broken.
 *
 * mapRpcError is reused deliberately for everything else: a table read cannot
 * answer PGRST202 (that is "no such function"), so every real failure lands on
 * 'failed' and the page shows SectionFailed. Only getSimilarSchools below can
 * be migration-missing.
 */
async function readWindow(
  build: () => Windowed,
  page: number,
  size: number
): Promise<AdminResult<{ list: unknown[]; total: number }>> {
  const [from, to] = rowWindow(page, size)
  const res = await build().range(from, to)
  if (!res.error) return ok({ list: rows(res.data), total: toNumber(res.count) })
  if (!isPastLastPage(res.error)) return mapRpcError(res.error)
  const counted = await build().limit(0)
  if (counted.error) return mapRpcError(counted.error)
  return ok({ list: [], total: toNumber(counted.count) })
}

/**
 * Names and phone numbers for a page's worth of profile ids, in one round
 * trip. A failure here is deliberately NOT fatal: the queue is about the
 * schools and the certificates, and a row that says "Unknown" is far better
 * than a queue that will not load.
 */
async function profilesById(
  db: Db,
  ids: (string | null)[]
): Promise<Map<string, { name: string | null; phone: string | null }>> {
  const out = new Map<string, { name: string | null; phone: string | null }>()
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  if (unique.length === 0) return out
  const { data } = await db.from('user_profiles').select('id, full_name, phone').in('id', unique)
  for (const p of data ?? []) out.set(p.id, { name: p.full_name, phone: p.phone })
  return out
}

/**
 * The profile ids whose name or phone matches a search term. Capped at
 * PROFILE_MATCH_LIMIT -- see that constant for what the cap costs.
 *
 * ORDERED BY ID, and that is not cosmetic: an unordered limit lets Postgres
 * return a different two hundred rows each time it is asked. Two pages of the
 * same search would then be filtered by two different id sets, and a claim
 * could appear on both pages or on neither.
 */
async function matchingProfileIds(db: Db, term: string, role?: string): Promise<string[]> {
  let sel = db.from('user_profiles').select('id')
  if (role) sel = sel.eq('role', role)
  const { data } = await sel
    .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
    .order('id')
    .limit(PROFILE_MATCH_LIMIT)
  return (data ?? []).map((p) => p.id)
}

// ---------------------------------------------------------------
// The readers
// ---------------------------------------------------------------

/**
 * One page of schools by review state, newest first, optionally searched by
 * name.
 *
 * THE SEARCH IS WHY THIS TAKES `q` AT ALL: the admin header's global search
 * finds a school by name and needs somewhere honest to send that hit. Before
 * this, the page hard-filtered to pending and ignored the term, so an approved
 * school's hit would have landed on a page it was not on, with nothing to say
 * the search had been dropped. With `q` and `status=all` it lands on a page
 * that contains it.
 */
export function getSchoolsQueue(
  db: Db,
  q: QueueQuery,
  size = QUEUE_PAGE
): Promise<AdminResult<Page<SchoolQueueRow>>> {
  const page = atLeastOne(q.page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const term = likeTerm(q.q)
  const key = cacheKey('queue_schools', {
    status: q.status,
    q: term ?? null,
    page,
    size: clampedSize,
  })

  return cachedOk(key, async () => {
    const build = () => {
      let sel = db
        .from('schools')
        .select('id, name, state, district, review_status, created_at, created_by', {
          count: 'exact',
        })
      if (q.status !== 'all') sel = sel.eq('review_status', q.status)
      if (term) sel = sel.ilike('name', `%${term}%`)
      // id as a tiebreak: two schools added in the same millisecond would
      // otherwise be free to swap places between page one and page two.
      return sel.order('created_at', { ascending: false }).order('id') as unknown as Windowed
    }

    const read = await readWindow(build, page, clampedSize)
    if (!read.ok) return read

    const { list, total } = read.data
    const names = await profilesById(
      db,
      list.map((r) => toNullableText(field(r, 'created_by')))
    )
    return ok({
      rows: list.map((raw) => ({
        id: toText(field(raw, 'id')),
        name: toText(field(raw, 'name')),
        state: toText(field(raw, 'state')),
        district: toText(field(raw, 'district')),
        review_status: toText(field(raw, 'review_status')),
        created_at: toText(field(raw, 'created_at')),
        submitted_by: names.get(toText(field(raw, 'created_by')))?.name ?? null,
      })),
      total,
      page,
      size: clampedSize,
    })
  })
}

/**
 * Likely duplicates for a whole page of schools, in ONE call.
 *
 * The returned Map is cached and therefore shared between callers -- read it,
 * do not mutate it. A school with no near-duplicate is absent from the map
 * rather than present with an empty list, so read it with `?? []`.
 *
 * This is the only reader here that can answer 'migration-missing': it is the
 * only one that calls a function docs/admin-scale-migration.sql adds. A page
 * that shows it should still show its queue -- the rows come from a plain
 * table read that works either way.
 */
export function getSimilarSchools(
  db: Db,
  ids: string[]
): Promise<AdminResult<Map<string, SimilarSchool[]>>> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, SIMILAR_BATCH_MAX)
  if (unique.length === 0) return Promise.resolve(ok(new Map()))
  const args = { p_school_ids: unique }
  return cachedOk(cacheKey('admin_similar_schools_batch', args), async () => {
    const { data, error } = await callRpc(db, 'admin_similar_schools_batch', args)
    if (error) return mapRpcError(error)
    const map = new Map<string, SimilarSchool[]>()
    for (const raw of rows(data)) {
      const schoolId = toText(field(raw, 'school_id'))
      if (!schoolId) continue
      const list = map.get(schoolId)
      const entry: SimilarSchool = {
        id: toText(field(raw, 'similar_id')),
        name: toText(field(raw, 'similar_name')),
        address: toNullableText(field(raw, 'similar_address')),
        review_status: toText(field(raw, 'similar_review_status')),
        // `score` is a real, not a bigint -- but a numeric-ish column over
        // some drivers is still a string, so it is coerced like every other.
        score: toNumber(field(raw, 'score')),
      }
      if (list) list.push(entry)
      else map.set(schoolId, [entry])
    }
    return ok(map)
  })
}

/**
 * One page of coordinator claims by claim state, by school name.
 *
 * `q` matches the APPLICANT as well as the school, because that is what an
 * admin has in hand: a name from the global search, or a phone number from a
 * call. The applicant lives in user_profiles and schools has no foreign key to
 * it, so a search is two round trips -- names to ids, then ids into the queue
 * filter.
 */
export function getCoordinatorsQueue(
  db: Db,
  q: QueueQuery,
  size = QUEUE_PAGE
): Promise<AdminResult<Page<CoordinatorQueueRow>>> {
  const page = atLeastOne(q.page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const term = orTerm(q.q)
  const key = cacheKey('queue_coordinators', {
    status: q.status,
    q: term ?? null,
    page,
    size: clampedSize,
  })

  return cachedOk(key, async () => {
    // Resolved once, before the query is built: build() may run twice.
    const matched = term ? await matchingProfileIds(db, term, 'coordinator') : []
    const build = () => {
      let sel = db
        .from('schools')
        .select(
          'id, name, state, district, review_status, coordinator_id, coordinator_status, coordinator_notes, board, student_count_range',
          { count: 'exact' }
        )
        .neq('coordinator_status', 'none')
        // A claim with no claimant is not a claim; the old page filtered these
        // out in JavaScript, which made its counts disagree with its list.
        .not('coordinator_id', 'is', null)
      if (q.status !== 'all') sel = sel.eq('coordinator_status', q.status)
      if (term) {
        const clauses = [`name.ilike.%${term}%`]
        if (matched.length > 0) clauses.push(`coordinator_id.in.(${matched.join(',')})`)
        sel = sel.or(clauses.join(','))
      }
      return sel.order('name').order('id') as unknown as Windowed
    }

    const read = await readWindow(build, page, clampedSize)
    if (!read.ok) return read

    const { list, total } = read.data
    const people = await profilesById(
      db,
      list.map((r) => toNullableText(field(r, 'coordinator_id')))
    )
    const mapped = list.map((raw) => {
      const coordinatorId = toText(field(raw, 'coordinator_id'))
      const person = people.get(coordinatorId)
      return {
        school_id: toText(field(raw, 'id')),
        coordinator_id: coordinatorId,
        school_name: toText(field(raw, 'name')),
        state: toText(field(raw, 'state')),
        district: toText(field(raw, 'district')),
        school_review_status: toText(field(raw, 'review_status')),
        coordinator_status: toText(field(raw, 'coordinator_status')),
        coordinator_notes: toNullableText(field(raw, 'coordinator_notes')),
        board: toNullableText(field(raw, 'board')),
        student_count_range: toNullableText(field(raw, 'student_count_range')),
        applicant_name: person?.name ?? null,
        applicant_phone: person?.phone ?? null,
      }
    })
    return ok({ rows: mapped, total, page, size: clampedSize })
  })
}

/**
 * One page of certificate uploads by review state, newest first. `q` matches
 * the file name, the description and the student's name -- the last of those
 * the same two-step as the coordinators queue, and for the same reason.
 */
export function getCertificatesQueue(
  db: Db,
  q: QueueQuery,
  size = QUEUE_PAGE
): Promise<AdminResult<Page<CertificateQueueRow>>> {
  const page = atLeastOne(q.page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const term = orTerm(q.q)
  const key = cacheKey('queue_certificates', {
    status: q.status,
    q: term ?? null,
    page,
    size: clampedSize,
  })

  return cachedOk(key, async () => {
    const matched = term ? await matchingProfileIds(db, term) : []
    const build = () => {
      let sel = db
        .from('certificate_uploads')
        .select(
          'id, file_name, description, status, created_at, student_id, points_approved, growth_parameters(name)',
          { count: 'exact' }
        )
      if (q.status !== 'all') sel = sel.eq('status', q.status)
      if (term) {
        const clauses = [`file_name.ilike.%${term}%`, `description.ilike.%${term}%`]
        if (matched.length > 0) clauses.push(`student_id.in.(${matched.join(',')})`)
        sel = sel.or(clauses.join(','))
      }
      return sel.order('created_at', { ascending: false }).order('id') as unknown as Windowed
    }

    const read = await readWindow(build, page, clampedSize)
    if (!read.ok) return read

    const { list, total } = read.data
    const students = await profilesById(
      db,
      list.map((r) => toNullableText(field(r, 'student_id')))
    )
    const mapped = list.map((raw) => {
      const studentId = toText(field(raw, 'student_id'))
      return {
        id: toText(field(raw, 'id')),
        file_name: toNullableText(field(raw, 'file_name')),
        description: toNullableText(field(raw, 'description')),
        status: toText(field(raw, 'status')),
        created_at: toText(field(raw, 'created_at')),
        student_id: studentId,
        student_name: students.get(studentId)?.name ?? null,
        points_approved: toNumber(field(raw, 'points_approved')),
        parameter_name: toNullableText(field(field(raw, 'growth_parameters'), 'name')),
      }
    })
    return ok({ rows: mapped, total, page, size: clampedSize })
  })
}
