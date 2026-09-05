/*
  Typed reader for admin_users_page and admin_search -- the two functions in
  section E of docs/admin-scale-migration.sql that isc.ts does not cover (see
  the task-6-7 report's "still unwritten, on purpose" note). Same three rules
  as isc.ts, copied rather than imported because isc.ts does not export its
  internal plumbing: cachedOk (never cache a failure), cacheKey on the
  arguments, and coerce every count -- see src/lib/admin/coerce.ts.

  ONE THING TO KNOW, stated once here rather than at every call site:
  admin_users_page LEFT joins auth.users, so `email` is NULLABLE. A profile
  with no auth row (a deleted user, a half-finished signup, a restore that
  missed auth) is still listed, with a null email, rather than vanishing from
  the page. Render null as something other than the literal word "null" and
  never assume it is a string.

  admin_search returns NOTHING for a query under two characters -- the SQL
  says so is not cheap ('a' matches most of the database) -- so searchAll
  short-circuits before the round trip rather than sending one the database
  would immediately discard.
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
// The shapes a page receives
// ---------------------------------------------------------------

export type UsersSort = 'created_desc' | 'created_asc' | 'name_asc'

const SORTS: readonly UsersSort[] = ['created_desc', 'created_asc', 'name_asc']

export interface UserRow {
  id: string
  full_name: string | null
  /** Null when the profile's auth.users row is gone -- see the file note. */
  email: string | null
  role: string
  school_name: string | null
  school_state: string | null
  school_class: string | null
  onboarding_completed: boolean
  created_at: string
}

export interface UsersQuery {
  q?: string
  role?: string
  onboarded?: boolean
  sort: UsersSort
  page: number
}

export interface SearchHit {
  kind: 'student' | 'school' | 'coordinator'
  id: string
  title: string
  subtitle: string
}

export const USERS_PAGE = 50
/** admin_search's own default; the SQL caps it at 25 regardless. */
const SEARCH_LIMIT = 8
/** Below this, admin_search returns nothing -- match it here, before a round trip. */
export const SEARCH_MIN_LENGTH = 2
/** Shorter than isc.ts's 60s: a global search box wants fresher answers than a dashboard tile. */
const SEARCH_CACHE_TTL_MS = 15_000

// ---------------------------------------------------------------
// Query string <-> UsersQuery
// ---------------------------------------------------------------

function first(v: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().slice(0, MAX_FILTER_LENGTH)
  return s === '' ? undefined : s
}

/**
 * Total by construction: any garbage in the query string yields a valid
 * query object, never a throw. An unrecognised sort falls back to
 * created_desc, exactly like the SQL does when p_sort is not one of the
 * three it knows -- so a typo in the address bar degrades quietly on both
 * ends rather than erroring on one and not the other.
 */
export function parseUsersQuery(sp: SearchParams): UsersQuery {
  const out: UsersQuery = { sort: 'created_desc', page: 1 }
  const q = first(sp.q)
  if (q) out.q = q
  const role = first(sp.role)
  if (role) out.role = role
  const onboarded = first(sp.onboarded)
  if (onboarded === 'yes') out.onboarded = true
  else if (onboarded === 'no') out.onboarded = false
  const sort = first(sp.sort)
  if (sort && (SORTS as readonly string[]).includes(sort)) out.sort = sort as UsersSort
  const p = Number.parseInt(first(sp.page) ?? '', 10)
  if (Number.isFinite(p) && p > 1) out.page = Math.min(Math.floor(p), MAX_PAGE)
  return out
}

/**
 * The inverse of parseUsersQuery, for building page and filter links.
 * usersQueryToString(parseUsersQuery(x)) is stable, and omits every field
 * that is already the default, so a plain "/admin/users" link stays plain.
 */
export function usersQueryToString(q: UsersQuery, overrides: Partial<UsersQuery> = {}): string {
  const merged = { ...q, ...overrides }
  const sp = new URLSearchParams()
  if (merged.q) sp.set('q', merged.q)
  if (merged.role) sp.set('role', merged.role)
  if (merged.onboarded !== undefined) sp.set('onboarded', merged.onboarded ? 'yes' : 'no')
  if (merged.sort !== 'created_desc') sp.set('sort', merged.sort)
  if (merged.page > 1) sp.set('page', String(merged.page))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// ---------------------------------------------------------------
// Calling the RPC -- copied from isc.ts, which does not export this part
// ---------------------------------------------------------------

type RpcResponse = { data: unknown; error: { code?: string; message?: string } | null }

function callRpc(db: Db, name: AdminFunctionName, args: Record<string, unknown>): Promise<RpcResponse> {
  const client = db as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResponse>
  }
  return client.rpc(name, args)
}

async function rpc<T>(
  db: Db,
  name: AdminFunctionName,
  args: Record<string, unknown>,
  read: (data: unknown) => T
): Promise<AdminResult<T>> {
  const { data, error } = await callRpc(db, name, args)
  if (error) return mapRpcError(error)
  return ok(read(data))
}

function rows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : []
}

function atLeastOne(n: number): number {
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

/** A timestamptz is an instant, so ISO-8601 in UTC is the right rendering. */
function toTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : toText(value)
}

/**
 * Every paged function carries `total` on every row, so an EMPTY page has no
 * total to read -- "no rows" means 0. Coerced because it is a bigint and may
 * arrive as a string or, past 2^53, a BigInt.
 */
function lift<T>(data: unknown, page: number, size: number, read: (raw: unknown) => T): Page<T> {
  const list = rows(data)
  const total = list.length > 0 ? toNumber(field(list[0], 'total')) : 0
  return { rows: list.map(read), total, page, size }
}

// ---------------------------------------------------------------
// Row readers
// ---------------------------------------------------------------

/** `total` is dropped here on purpose: it belongs to the Page, not to a row. */
function toUserRow(raw: unknown): UserRow {
  return {
    id: toText(field(raw, 'id')),
    full_name: toNullableText(field(raw, 'full_name')),
    email: toNullableText(field(raw, 'email')),
    role: toText(field(raw, 'role')),
    school_name: toNullableText(field(raw, 'school_name')),
    school_state: toNullableText(field(raw, 'school_state')),
    school_class: toNullableText(field(raw, 'school_class')),
    onboarding_completed: field(raw, 'onboarding_completed') === true,
    created_at: toTimestamp(field(raw, 'created_at')),
  }
}

const SEARCH_KINDS: readonly SearchHit['kind'][] = ['student', 'school', 'coordinator']

function toSearchHit(raw: unknown): SearchHit {
  const rawKind = toText(field(raw, 'kind'))
  const kind = (SEARCH_KINDS as readonly string[]).includes(rawKind)
    ? (rawKind as SearchHit['kind'])
    : 'student'
  return {
    kind,
    id: toText(field(raw, 'id')),
    title: toText(field(raw, 'title')),
    subtitle: toText(field(raw, 'subtitle')),
  }
}

// ---------------------------------------------------------------
// The readers
// ---------------------------------------------------------------

/**
 * One page of accounts, searched and sorted by the database. `size` is
 * clamped to MAX_PAGE_SIZE -- the same 200-row cap admin_users_page applies
 * internally -- so Page.size always matches the row count the SQL actually
 * returned and the page count this drives never lies.
 */
export function getUsersPage(
  db: Db,
  q: UsersQuery,
  size = USERS_PAGE
): Promise<AdminResult<Page<UserRow>>> {
  const page = atLeastOne(q.page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const args = {
    p_q: q.q ?? null,
    p_role: q.role ?? null,
    p_onboarded: q.onboarded ?? null,
    p_sort: q.sort,
    p_page: page,
    p_size: clampedSize,
  }
  return cachedOk(cacheKey('admin_users_page', args), () =>
    rpc(db, 'admin_users_page', args, (d) => lift(d, page, clampedSize, toUserRow))
  )
}

/**
 * The admin command-bar lookup: up to SEARCH_LIMIT students, schools and
 * coordinators, in one round trip. Cached 15 seconds, not isc.ts's 60 -- a
 * search box wants fresher answers than a dashboard tile costs.
 *
 * Returns `ok([])` without calling rpc at all for a query under two
 * characters, which is what admin_search itself would answer, at the price
 * of a round trip the SQL comment says is not cheap to run.
 */
export function searchAll(db: Db, q: string): Promise<AdminResult<SearchHit[]>> {
  const query = q.trim()
  if (query.length < SEARCH_MIN_LENGTH) return Promise.resolve(ok([]))
  const args = { p_q: query, p_limit: SEARCH_LIMIT }
  return cachedOk(
    cacheKey('admin_search', args),
    () => rpc(db, 'admin_search', args, (d) => rows(d).map(toSearchHit)),
    SEARCH_CACHE_TTL_MS
  )
}
