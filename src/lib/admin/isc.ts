/*
  Typed readers for the championship half of docs/admin-scale-migration.sql.

  Every function here returns an AdminResult and never throws -- except
  iterateExport, which is a generator feeding a streamed CSV and so has nowhere
  to put a result; it throws AdminError, which carries the same `kind`.

  Three things these readers do that the raw RPC does not:

  * They NORMALISE. Every count in these functions is a SQL `bigint`
    (count(*) over (), member_count, every aggregate) and a bigint reaches
    JavaScript as a number, a string or -- past 2^53 -- a BigInt, depending on
    the driver in front of Postgres. Nothing below trusts the wire type; see
    src/lib/admin/coerce.ts. Nullable columns stay null and non-null columns
    get a defined fallback, so a page can render a row without guarding every
    field.
  * They CACHE successes for sixty seconds, keyed on the arguments, and never
    cache a failure. See src/lib/admin/cache.ts for why that asymmetry matters.
  * They NORMALISE SCOPE first, so the SQL's district-without-a-state exception
    cannot be reached: scope.ts drops an orphan district. Nothing a person can
    type into the address bar makes these raise.

  ONE COST TO KNOW ABOUT, because nothing in SQL prevents it: an UNSCOPED
  getIscRoster (no state, no school) computes its `total` with count(*) over ()
  across every entry in the country -- 1.3 to 1.5 s at 800k rows, against 3-6 ms
  for the same page scoped to one school. It is not blocked. A national roster
  page should expect a second and a half, and a page that only needs the
  headline numbers should call getIscSummary instead.
*/

import { cachedOk, cacheKey } from '@/lib/admin/cache'
import { field, toNullableText, toNumber, toText } from '@/lib/admin/coerce'
import { AdminError, adminError, mapRpcError, ok, type AdminResult } from '@/lib/admin/errors'
import {
  filtersToRpcArgs,
  geoScopeToRpcArgs,
  normalizeScope,
  scopeToRpcArgs,
  type IscScope,
  type RosterFilters,
} from '@/lib/admin/scope'
import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Db = Awaited<ReturnType<typeof createClient>>
type AdminFunctionName = Extract<keyof Database['public']['Functions'], `admin_${string}`>

// ---------------------------------------------------------------
// The shapes a page receives
// ---------------------------------------------------------------

export interface CountRow {
  key: string
  count: number
}

/**
 * admin_isc_summary(). The four lists are in DIFFERENT UNITS and a UI that
 * labels them all the same way is lying about three of them.
 */
export interface IscSummary {
  /** STUDENTS: role student, Classes 5-12, scoped by their own profile. */
  eligible: number
  /** STUDENTS on a team in scope -- leader or accepted invitee. Each person once. */
  started: number
  /** STUDENTS in `started` with at least one submitted entry. Each person once. */
  submitted: number
  /** SCHOOLS in scope with at least one entry. */
  schools_with_entries: number
  /** STUDENTS per track. Sums to >= started: a student in two tracks appears twice. */
  by_track: CountRow[]
  /** ENTRIES per division. key is 'group1' | 'group2' | 'unknown' -- never null. */
  by_division: CountRow[]
  /** ENTRIES per status. key is the raw status. */
  by_status: CountRow[]
  /** ENTRIES per submission language. key is the raw language or 'unknown'. */
  by_language: CountRow[]
}

/**
 * admin_isc_breakdown(). One level per call: no scope gives states, a state
 * gives its districts, a state and a district give its schools -- and at school
 * level `key` is the school id as text while `label` is its name.
 *
 * `eligible` sums exactly up the hierarchy. `started` DOES NOT: an entry is
 * scoped by its school's state and a team-mate from a neighbouring state counts
 * toward the entry's state, not their own. Do not present a column of `started`
 * as a partition of the national figure.
 */
export interface BreakdownRow {
  key: string
  label: string
  eligible: number
  started: number
  submitted: number
  /** At school level this is 0 or 1: "does this school have any entry at all". */
  schools: number
}

/** admin_isc_timeline(). ENTRY counts, unlike IscSummary.started. `day` is 'YYYY-MM-DD'. */
export interface TimelinePoint {
  day: string
  started: number
  submitted: number
}

export interface RosterRow {
  id: string
  track: string
  status: string
  /** null when the leader sits outside Classes 5-12. */
  division: string | null
  /** submission->>'language'; null when the key is absent. */
  language: string | null
  school_id: string
  school_name: string
  leader_id: string
  /** null when the creator has no user_profiles row. */
  leader_name: string | null
  /** Seats filled: member rows that are the leader or an accepted invitee. */
  member_count: number
  created_at: string
  submitted_at: string | null
}

export interface Page<T> {
  rows: T[]
  /** How many rows the SAME filters match in total, not how many are on this page. */
  total: number
  /** 1-based. Not validated against `total`: page 40 of 3 is an empty page. */
  page: number
  size: number
}

export interface ColdSchoolRow {
  id: string
  name: string
  state: string
  district: string
  /** Always >= 1: the SQL inner-joins students, so a school with none is not listed. */
  eligible: number
  coordinator_status: string
}

/** The largest chunk admin_isc_export_chunk will return, and its SQL cap. */
export const EXPORT_CHUNK = 1000
export const ROSTER_PAGE = 50
export const COLD_PAGE = 20
/** admin_isc_roster and admin_isc_cold_schools both clamp p_size to this inside the SQL. */
export const MAX_PAGE_SIZE = 200
/** admin_isc_timeline builds one row per day, so an unclamped p_days is a way to hang the page. */
export const MAX_TIMELINE_DAYS = 365

// ---------------------------------------------------------------
// Calling the RPC
// ---------------------------------------------------------------

type RpcResponse = { data: unknown; error: { code?: string; message?: string } | null }

/**
 * Casts the CLIENT, not the method. supabase-js's rpc() reads `this`, so
 * pulling the function off the object and calling it bare would throw at
 * runtime; the receiver has to survive the cast.
 */
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

/**
 * A `date` arrives as 'YYYY-MM-DD' over PostgREST and as a local-midnight Date
 * over a node-postgres driver. Read the local parts, not toISOString(): in IST
 * a local midnight is 18:30 the previous day in UTC, which would silently shift
 * every point on the chart back a day.
 */
function toDay(value: unknown): string {
  if (value instanceof Date) {
    const m = `${value.getMonth() + 1}`.padStart(2, '0')
    const d = `${value.getDate()}`.padStart(2, '0')
    return `${value.getFullYear()}-${m}-${d}`
  }
  return toText(value)
}

/** A timestamptz is an instant, so ISO-8601 in UTC is the right rendering. */
function toTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : toText(value)
}

function toNullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return value instanceof Date ? value.toISOString() : toNullableText(value)
}

// ---------------------------------------------------------------
// Row readers
// ---------------------------------------------------------------

function toCountRows(value: unknown): CountRow[] {
  return rows(value).map((r) => ({
    key: toText(field(r, 'key')),
    count: toNumber(field(r, 'count')),
  }))
}

function toSummary(raw: unknown): IscSummary {
  return {
    eligible: toNumber(field(raw, 'eligible')),
    started: toNumber(field(raw, 'started')),
    submitted: toNumber(field(raw, 'submitted')),
    schools_with_entries: toNumber(field(raw, 'schools_with_entries')),
    by_track: toCountRows(field(raw, 'by_track')),
    by_division: toCountRows(field(raw, 'by_division')),
    by_status: toCountRows(field(raw, 'by_status')),
    by_language: toCountRows(field(raw, 'by_language')),
  }
}

function toBreakdownRow(raw: unknown): BreakdownRow {
  return {
    key: toText(field(raw, 'key')),
    label: toText(field(raw, 'label')),
    eligible: toNumber(field(raw, 'eligible')),
    started: toNumber(field(raw, 'started')),
    submitted: toNumber(field(raw, 'submitted')),
    schools: toNumber(field(raw, 'schools')),
  }
}

function toTimelinePoint(raw: unknown): TimelinePoint {
  return {
    day: toDay(field(raw, 'day')),
    started: toNumber(field(raw, 'started')),
    submitted: toNumber(field(raw, 'submitted')),
  }
}

/** `total` is dropped here on purpose: it belongs to the Page, not to a row. */
function toRosterRow(raw: unknown): RosterRow {
  return {
    id: toText(field(raw, 'id')),
    track: toText(field(raw, 'track')),
    status: toText(field(raw, 'status')),
    division: toNullableText(field(raw, 'division')),
    language: toNullableText(field(raw, 'language')),
    school_id: toText(field(raw, 'school_id')),
    school_name: toText(field(raw, 'school_name')),
    leader_id: toText(field(raw, 'leader_id')),
    leader_name: toNullableText(field(raw, 'leader_name')),
    member_count: toNumber(field(raw, 'member_count')),
    created_at: toTimestamp(field(raw, 'created_at')),
    submitted_at: toNullableTimestamp(field(raw, 'submitted_at')),
  }
}

function toColdSchoolRow(raw: unknown): ColdSchoolRow {
  return {
    id: toText(field(raw, 'id')),
    name: toText(field(raw, 'name')),
    state: toText(field(raw, 'state')),
    district: toText(field(raw, 'district')),
    eligible: toNumber(field(raw, 'eligible')),
    coordinator_status: toText(field(raw, 'coordinator_status')),
  }
}

/**
 * Every paged function carries `total` on every row, so an EMPTY page has no
 * total to read -- "no rows" means 0, and rows[0].total without a length guard
 * is the bug this exists to prevent. The total is coerced because it is a
 * bigint and may arrive as a string.
 */
function lift<T>(data: unknown, page: number, size: number, read: (raw: unknown) => T): Page<T> {
  const list = rows(data)
  const total = list.length > 0 ? toNumber(field(list[0], 'total')) : 0
  return { rows: list.map(read), total, page, size }
}

function atLeastOne(n: number): number {
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

// ---------------------------------------------------------------
// The readers
// ---------------------------------------------------------------

/** Headline championship numbers for a scope. Cached 60s on the scope. */
export function getIscSummary(db: Db, scope: IscScope): Promise<AdminResult<IscSummary>> {
  const args = scopeToRpcArgs(scope)
  return cachedOk(cacheKey('admin_isc_summary', args), () =>
    rpc(db, 'admin_isc_summary', args, toSummary)
  )
}

/** States, or one state's districts, or one district's schools. Cached 60s. */
export function getIscBreakdown(
  db: Db,
  scope: Pick<IscScope, 'state' | 'district'>
): Promise<AdminResult<BreakdownRow[]>> {
  const args = geoScopeToRpcArgs(scope)
  return cachedOk(cacheKey('admin_isc_breakdown', args), () =>
    rpc(db, 'admin_isc_breakdown', args, (d) => rows(d).map(toBreakdownRow))
  )
}

/**
 * Exactly `days` points, oldest first, zero-filled, ending today. `days` is
 * clamped to 1..365: the SQL builds one row per day from it, so an unbounded
 * value out of a query string would be a way to hang the page.
 */
export function getIscTimeline(
  db: Db,
  scope: IscScope,
  days = 30
): Promise<AdminResult<TimelinePoint[]>> {
  const args = {
    ...scopeToRpcArgs(scope),
    p_days: Math.min(atLeastOne(days), MAX_TIMELINE_DAYS),
  }
  return cachedOk(cacheKey('admin_isc_timeline', args), () =>
    rpc(db, 'admin_isc_timeline', args, (d) => rows(d).map(toTimelinePoint))
  )
}

/**
 * One page of entries, newest first. UNSCOPED THIS IS SLOW -- see the note at
 * the top of this file. `size` is clamped to MAX_PAGE_SIZE here too, so
 * `Page.size` always matches the row count the SQL actually applied.
 */
export function getIscRoster(
  db: Db,
  scope: IscScope,
  filters: RosterFilters,
  size = ROSTER_PAGE
): Promise<AdminResult<Page<RosterRow>>> {
  const page = atLeastOne(filters.page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const args = {
    ...scopeToRpcArgs(scope),
    ...filtersToRpcArgs(filters),
    p_page: page,
    p_size: clampedSize,
  }
  return cachedOk(cacheKey('admin_isc_roster', args), () =>
    rpc(db, 'admin_isc_roster', args, (d) => lift(d, page, clampedSize, toRosterRow))
  )
}

/**
 * Schools with eligible students and not one entry -- the outreach list. Only
 * schools with at least one eligible student appear; a school nobody has signed
 * up to is a different problem and is not listed here at all.
 */
export function getColdSchools(
  db: Db,
  scope: Pick<IscScope, 'state' | 'district'>,
  page: number,
  size = COLD_PAGE
): Promise<AdminResult<Page<ColdSchoolRow>>> {
  const p = atLeastOne(page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const args = { ...geoScopeToRpcArgs(scope), p_page: p, p_size: clampedSize }
  return cachedOk(cacheKey('admin_isc_cold_schools', args), () =>
    rpc(db, 'admin_isc_cold_schools', args, (d) => lift(d, p, clampedSize, toColdSchoolRow))
  )
}

/**
 * Keyset pages of the current scope and filters, for streaming to CSV. NOT
 * cached: an export is one pass over rows that will not be asked for again, and
 * holding forty chunks of a thousand rows in an isolate for a minute is exactly
 * what the cache should not do.
 *
 * Throws AdminError rather than returning a result -- a generator has nowhere
 * to put one -- so catch it in the route handler and read `.kind` to tell a
 * missing migration from a real failure.
 *
 * The SQL refuses a national export; this refuses it one round trip earlier,
 * with the same reasoning: without a state or a school this would pull every
 * entry in the country through PostgREST a thousand rows at a time.
 */
export async function* iterateExport(
  db: Db,
  scope: IscScope,
  filters: RosterFilters,
  chunkSize = EXPORT_CHUNK
): AsyncGenerator<RosterRow[]> {
  const scoped = normalizeScope(scope)
  if (!scoped.state && !scoped.schoolId) {
    throw new AdminError(
      'failed',
      'An export needs a state or a school. A national export would stream every entry in the country; pick a scope.'
    )
  }
  const size = Math.min(atLeastOne(chunkSize), EXPORT_CHUNK)
  let after: { created: string; id: string } | null = null
  for (;;) {
    const args = {
      ...scopeToRpcArgs(scoped),
      ...filtersToRpcArgs(filters),
      p_after_created: after?.created ?? null,
      p_after_id: after?.id ?? null,
      p_size: size,
    }
    const { data, error } = await callRpc(db, 'admin_isc_export_chunk', args)
    if (error) throw adminError(error)
    const chunk = rows(data)
    if (chunk.length === 0) return
    yield chunk.map(toRosterRow)
    // A chunk shorter than the size asked for is the last chunk.
    if (chunk.length < size) return
    // Both halves of the cursor, from the RAW last row. The SQL refuses half a
    // cursor: (created_at, id) < (ts, null) is NULL for every row, so a lost id
    // would end the export early and look like success.
    const last = chunk[chunk.length - 1]
    const created = toTimestamp(field(last, 'created_at'))
    const id = toText(field(last, 'id'))
    if (created === '' || id === '') {
      throw new AdminError(
        'failed',
        'admin_isc_export_chunk returned a row without a created_at or an id; the keyset cursor cannot continue.'
      )
    }
    // Defence, not a path the SQL's strict `<` comparison should reach: a full
    // chunk whose last row repeats the previous cursor would otherwise spin
    // forever, feeding a streamed CSV response that never completes.
    if (after && after.created === created && after.id === id) {
      throw new AdminError(
        'failed',
        'admin_isc_export_chunk returned the same cursor twice in a row; the keyset cursor is not advancing.'
      )
    }
    after = { created, id }
  }
}
