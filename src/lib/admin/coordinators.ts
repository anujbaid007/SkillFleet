/*
  Typed readers for section G of docs/admin-scale-migration.sql -- the five
  functions that report on COORDINATORS, the teachers who bring a school in.

  Same three rules as isc.ts and users.ts, copied rather than imported because
  neither exports its internal plumbing: cachedOk (never cache a failure),
  cacheKey on the arguments, and coerce every count through
  src/lib/admin/coerce.ts.

  FOUR THINGS A PAGE MUST NOT GET WRONG, all inherited from the SQL and all
  repeated on the types below.

  * `students` IS REACH: every student registered at a school this coordinator
    has claimed, not the Classes 5-12 "eligible" that section C counts. The
    two are different units and a screen showing both has to say so.
    `students_entered` is a SUBSET of that same set, so the percentage between
    them is a real percentage and cannot exceed 100 -- unlike the dashboard's
    submitted/eligible, which was measured at 1.39 and must never be drawn as
    one. Use enteredPercent() for it.
  * THE TREND IS A SIGNUP COHORT, not an event chart. `schools` carries no
    claim date and no approval date, so every claim and approval is plotted on
    the day its coordinator SIGNED UP. A 30-day window therefore shows far
    fewer approvals than there are approved schools (4 against 19 on the
    harness seed). Label the chart accordingly; the `cohort_` prefixes are the
    contract, not decoration.
  * `email` IS NULLABLE. auth.users is LEFT joined, so a coordinator whose
    auth row has gone is still listed, with a null email. Render a word, never
    the literal null.
  * TOTALS DO NOT ALWAYS ADD UP, in four documented places. A coordinator with
    no claim has no state and so appears in no breakdown row; a coordinator
    holding claims in two districts is counted in both; students reached
    through no school row are in neither students_covered nor
    students_uncovered; and admin_dashboard's pending_coordinators counts a
    claim differently from section G's "covered". Say so under the table
    rather than leaving a reader to discover it.
*/

import { cachedOk, cacheKey } from '@/lib/admin/cache'
import { field, toNullableText, toNumber, toText } from '@/lib/admin/coerce'
import { mapRpcError, ok, type AdminResult } from '@/lib/admin/errors'
import { MAX_PAGE_SIZE, type CountRow, type Page } from '@/lib/admin/isc'
import {
  MAX_FILTER_LENGTH,
  MAX_PAGE,
  normalizeScope,
  type IscScope,
  type SearchParams,
} from '@/lib/admin/scope'
import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Db = Awaited<ReturnType<typeof createClient>>
type AdminFunctionName = Extract<keyof Database['public']['Functions'], `admin_${string}`>

// ---------------------------------------------------------------
// The shapes a page receives
// ---------------------------------------------------------------

/** 'none' is a real value: a coordinator who has signed up and claimed nothing. */
export type CoordinatorClaimStatus = 'none' | 'pending' | 'approved' | 'rejected'

export const CLAIM_STATUSES: readonly CoordinatorClaimStatus[] = [
  'none',
  'pending',
  'approved',
  'rejected',
]

export type CoordinatorsSort = 'students_desc' | 'students_asc' | 'name_asc' | 'joined_desc'

const SORTS: readonly CoordinatorsSort[] = [
  'students_desc',
  'students_asc',
  'name_asc',
  'joined_desc',
]

/**
 * admin_coordinator_summary(). Thirteen keys, always present, never null.
 *
 * The three unit families are labelled below because mixing them is the way
 * this screen goes wrong: PEOPLE, SCHOOLS and STUDENTS are counted here and
 * only students_entered / students_covered form a genuine ratio.
 */
export interface CoordinatorSummary {
  /** PEOPLE. Nationally every coordinator profile, claim or no claim; scoped,
   *  only the people holding a claim in that scope. */
  coordinators: number
  /** PEOPLE by their strongest claim. Nationally these three add up to LESS
   *  than `coordinators` -- the difference is the people who claimed nothing. */
  approved: number
  pending: number
  rejected: number
  /** SCHOOLS in scope. */
  schools_total: number
  /** SCHOOLS with a coordinator attached, whatever the claim status. */
  schools_claimed: number
  /** SCHOOLS covered: a coordinator AND an approved claim. */
  schools_approved: number
  /** schools_total - schools_approved; includes pending, rejected and unclaimed. */
  schools_uncovered: number
  /** STUDENTS at a covered school. This is REACH, not Classes 5-12 eligibility. */
  students_covered: number
  /** STUDENTS at a school in scope that is not covered. Together with
   *  students_covered this can be LESS than the student total: a student whose
   *  school_id is null or matches no school is in neither. */
  students_uncovered: number
  /** Of students_covered, the ones on at least one entry. A true subset. */
  students_entered: number
  /** Fractional, over exactly the people in `coordinators`, zeros included. */
  median_students_per_coordinator: number
  /** 100 * students_entered / students_covered, one decimal. CANNOT exceed 100
   *  and is safe to render as a percentage. */
  entered_pct: number
}

/**
 * admin_coordinator_breakdown(). States nationally, districts inside a state.
 * One row per state or district that has at least one school -- including the
 * ones with no coordinator at all, which is the row that answers "where is
 * there no coverage".
 */
export interface CoordinatorBreakdownRow {
  key: string
  label: string
  /** PEOPLE holding a claim here. Does not include anyone who has claimed
   *  nothing, so the column adds up to less than the national total. */
  coordinators: number
  approved: number
  schools_claimed: number
  schools_total: number
  students_covered: number
  students_entered: number
}

/**
 * admin_coordinator_trend(). A SIGNUP COHORT: of the coordinators who signed
 * up on `day`, how many have since claimed a school and how many of those
 * claims are approved. Never "claims made that day" -- see the file note.
 *
 * `coordinators >= cohort_claimed >= cohort_approved` on every day, and inside
 * one state the first two series are identical, because a coordinator has no
 * state until they claim.
 */
export interface CoordinatorTrendPoint {
  day: string
  coordinators: number
  cohort_claimed: number
  cohort_approved: number
}

/** One row of admin_coordinators_page(). `total` is dropped: it belongs to the Page. */
export interface CoordinatorRow {
  id: string
  full_name: string | null
  /** Null when the profile has no auth.users row -- render "No account". */
  email: string | null
  phone: string | null
  /** Null when they have claimed nothing. */
  school_id: string | null
  school_name: string | null
  /** The SCHOOL's state, never the profile's. Null with no claim. */
  state: string | null
  district: string | null
  claim_status: string
  /** How many schools this person holds. `students` sums over all of them
   *  while school_name shows one, so say "across N schools" above 1. */
  schools_claimed: number
  /** REACH: every student at every school they claim. 0 with no claim. */
  students: number
  /** Of those, the ones on an entry. Always <= students. */
  students_entered: number
  joined_at: string
}

/** The strongest claim on admin_coordinator_detail. */
export interface CoordinatorClaim {
  id: string
  name: string
  state: string
  district: string
  /** The SCHOOL's own review state, which is not the claim's. */
  review_status: string
  claim_status: string
  /** schools.coordinator_notes -- the admin's own review note. */
  notes: string | null
  board: string | null
}

/**
 * admin_coordinator_detail(). The whole value is null when the id is not a
 * coordinator profile, so a page opened on a deleted user renders "not found".
 */
export interface CoordinatorDetail {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  joined_at: string
  onboarding_completed: boolean
  schools_claimed: number
  school: CoordinatorClaim | null
  students: number
  students_entered: number
  entered_pct: number
  /** ENTRIES at those schools, not students. */
  entries: number
  submitted: number
  /** ENTRIES per track, so it sums to `entries` exactly. admin_isc_summary's
   *  by_track counts distinct STUDENTS and does not -- never label them alike. */
  by_track: CountRow[]
}

export interface CoordinatorsQuery {
  q?: string
  status?: CoordinatorClaimStatus
  /** A claim is the only thing that gives a coordinator a state, so a state
   *  filter always excludes everyone who has claimed nothing. */
  state?: string
  sort: CoordinatorsSort
  page: number
}

/** Rows per page of the directory. Under MAX_PAGE_SIZE, which the SQL enforces. */
export const COORDINATORS_PAGE = 50
/** Days of signup cohorts the overview charts by default. */
export const TREND_DAYS = 30
/** admin_coordinator_trend builds one row per day, so an unclamped p_days out
 *  of a query string is a way to hang the page. */
export const MAX_TREND_DAYS = 365

// ---------------------------------------------------------------
// Pure helpers a page needs, kept here so they are tested once
// ---------------------------------------------------------------

/**
 * The share of a coordinator's reach that has entered, to one decimal.
 *
 * Safe as a percentage because the numerator is a subset of the denominator --
 * both are students at the same schools. This is NOT the treatment the
 * state-level submitted/eligible gets elsewhere, and the difference is the
 * scoping basis, not caution: that one mixes two populations and reaches 1.39.
 *
 * Total by construction: 0 when there is nothing to divide, never NaN, never
 * above 100 even if a caller passes a numerator larger than its denominator.
 */
export function enteredPercent(entered: number, total: number): number {
  if (!Number.isFinite(entered) || !Number.isFinite(total) || total <= 0) return 0
  return Math.min(100, Math.round((entered / total) * 1000) / 10)
}

const CLAIM_RANK: Record<string, number> = { approved: 0, pending: 1, rejected: 2 }

/**
 * The claim a page shows when somebody holds more than one, in exactly the
 * order the SQL picks it: approved beats pending beats rejected, then name,
 * then id. A total order, so the pick never changes between renders.
 *
 * The detail page reads claims from the `schools` table directly -- it has to,
 * because it must still show the coordinator before the migration is run --
 * and this keeps that reading identical to admin_coordinator_detail's.
 */
export function strongestClaim<T extends { claim_status: string; name: string; id: string }>(
  claims: readonly T[]
): T | null {
  if (claims.length === 0) return null
  return [...claims].sort(
    (a, b) =>
      (CLAIM_RANK[a.claim_status] ?? 3) - (CLAIM_RANK[b.claim_status] ?? 3) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
  )[0]
}

// ---------------------------------------------------------------
// Query string <-> CoordinatorsQuery
// ---------------------------------------------------------------

function first(v: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().slice(0, MAX_FILTER_LENGTH)
  return s === '' ? undefined : s
}

/**
 * Total by construction: any garbage in the query string yields a valid query,
 * never a throw.
 *
 * An unrecognised sort falls back to students_desc, matching what the SQL does
 * with a p_sort it does not know. An unrecognised STATUS is dropped rather
 * than passed on, which is the opposite treatment for a good reason: the SQL
 * matches p_status exactly, so a typo would return an empty page that looked
 * like an answer.
 */
export function parseCoordinatorsQuery(sp: SearchParams): CoordinatorsQuery {
  const out: CoordinatorsQuery = { sort: 'students_desc', page: 1 }
  const q = first(sp.q)
  if (q) out.q = q
  const status = first(sp.status)
  if (status && (CLAIM_STATUSES as readonly string[]).includes(status)) {
    out.status = status as CoordinatorClaimStatus
  }
  const state = first(sp.state)
  if (state) out.state = state
  const sort = first(sp.sort)
  if (sort && (SORTS as readonly string[]).includes(sort)) out.sort = sort as CoordinatorsSort
  const p = Number.parseInt(first(sp.page) ?? '', 10)
  if (Number.isFinite(p) && p > 1) out.page = Math.min(Math.floor(p), MAX_PAGE)
  return out
}

/**
 * The inverse, for filter and page links. Omits everything already at its
 * default, so a plain /admin/coordinators/directory link stays plain, and
 * round-trips through parseCoordinatorsQuery unchanged.
 */
export function coordinatorsQueryToString(
  q: CoordinatorsQuery,
  overrides: Partial<CoordinatorsQuery> = {}
): string {
  const merged = { ...q, ...overrides }
  const sp = new URLSearchParams()
  if (merged.q) sp.set('q', merged.q)
  if (merged.status) sp.set('status', merged.status)
  if (merged.state) sp.set('state', merged.state)
  if (merged.sort !== 'students_desc') sp.set('sort', merged.sort)
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

/**
 * A `date` arrives as 'YYYY-MM-DD' over PostgREST and as a local-midnight Date
 * over a node-postgres driver. Read the local parts, not toISOString(): in IST
 * a local midnight is 18:30 the previous day in UTC, which would shift every
 * bar on the chart back a day.
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

/**
 * Every paged function carries `total` on every row, so an EMPTY page has no
 * total to read -- "no rows" means 0, and rows[0].total without a length guard
 * is the bug this exists to prevent.
 */
function lift<T>(data: unknown, page: number, size: number, read: (raw: unknown) => T): Page<T> {
  const list = rows(data)
  const total = list.length > 0 ? toNumber(field(list[0], 'total')) : 0
  return { rows: list.map(read), total, page, size }
}

/**
 * admin_coordinator_breakdown and admin_coordinator_trend take a STATE ONLY --
 * there is no p_district on either, and sending one would be an argument
 * PostgREST cannot match, which arrives as PGRST202 and would be read as a
 * missing migration. normalizeScope still runs so an orphan district is
 * dropped rather than silently widening the scope.
 */
function stateArg(scope: Pick<IscScope, 'state' | 'district'>): { p_state: string | null } {
  return { p_state: normalizeScope(scope).state ?? null }
}

/** admin_coordinator_summary is the one section G function that takes a district. */
function geoArgs(scope: Pick<IscScope, 'state' | 'district'>): {
  p_state: string | null
  p_district: string | null
} {
  const s = normalizeScope(scope)
  return { p_state: s.state ?? null, p_district: s.district ?? null }
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

function toSummary(raw: unknown): CoordinatorSummary {
  return {
    coordinators: toNumber(field(raw, 'coordinators')),
    approved: toNumber(field(raw, 'approved')),
    pending: toNumber(field(raw, 'pending')),
    rejected: toNumber(field(raw, 'rejected')),
    schools_total: toNumber(field(raw, 'schools_total')),
    schools_claimed: toNumber(field(raw, 'schools_claimed')),
    schools_approved: toNumber(field(raw, 'schools_approved')),
    schools_uncovered: toNumber(field(raw, 'schools_uncovered')),
    students_covered: toNumber(field(raw, 'students_covered')),
    students_uncovered: toNumber(field(raw, 'students_uncovered')),
    students_entered: toNumber(field(raw, 'students_entered')),
    median_students_per_coordinator: toNumber(field(raw, 'median_students_per_coordinator')),
    entered_pct: toNumber(field(raw, 'entered_pct')),
  }
}

function toBreakdownRow(raw: unknown): CoordinatorBreakdownRow {
  return {
    key: toText(field(raw, 'key')),
    label: toText(field(raw, 'label')),
    coordinators: toNumber(field(raw, 'coordinators')),
    approved: toNumber(field(raw, 'approved')),
    schools_claimed: toNumber(field(raw, 'schools_claimed')),
    schools_total: toNumber(field(raw, 'schools_total')),
    students_covered: toNumber(field(raw, 'students_covered')),
    students_entered: toNumber(field(raw, 'students_entered')),
  }
}

function toTrendPoint(raw: unknown): CoordinatorTrendPoint {
  return {
    day: toDay(field(raw, 'day')),
    coordinators: toNumber(field(raw, 'coordinators')),
    cohort_claimed: toNumber(field(raw, 'cohort_claimed')),
    cohort_approved: toNumber(field(raw, 'cohort_approved')),
  }
}

function toCoordinatorRow(raw: unknown): CoordinatorRow {
  return {
    id: toText(field(raw, 'id')),
    full_name: toNullableText(field(raw, 'full_name')),
    email: toNullableText(field(raw, 'email')),
    phone: toNullableText(field(raw, 'phone')),
    school_id: toNullableText(field(raw, 'school_id')),
    school_name: toNullableText(field(raw, 'school_name')),
    state: toNullableText(field(raw, 'state')),
    district: toNullableText(field(raw, 'district')),
    claim_status: toText(field(raw, 'claim_status'), 'none'),
    schools_claimed: toNumber(field(raw, 'schools_claimed')),
    students: toNumber(field(raw, 'students')),
    students_entered: toNumber(field(raw, 'students_entered')),
    joined_at: toTimestamp(field(raw, 'joined_at')),
  }
}

function toClaim(raw: unknown): CoordinatorClaim | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: toText(field(raw, 'id')),
    name: toText(field(raw, 'name')),
    state: toText(field(raw, 'state')),
    district: toText(field(raw, 'district')),
    review_status: toText(field(raw, 'review_status')),
    claim_status: toText(field(raw, 'claim_status')),
    notes: toNullableText(field(raw, 'notes')),
    board: toNullableText(field(raw, 'board')),
  }
}

/** Null for anything that is not a coordinator profile -- the SQL returns SQL NULL. */
function toDetail(raw: unknown): CoordinatorDetail | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: toText(field(raw, 'id')),
    full_name: toNullableText(field(raw, 'full_name')),
    email: toNullableText(field(raw, 'email')),
    phone: toNullableText(field(raw, 'phone')),
    joined_at: toTimestamp(field(raw, 'joined_at')),
    onboarding_completed: field(raw, 'onboarding_completed') === true,
    schools_claimed: toNumber(field(raw, 'schools_claimed')),
    school: toClaim(field(raw, 'school')),
    students: toNumber(field(raw, 'students')),
    students_entered: toNumber(field(raw, 'students_entered')),
    entered_pct: toNumber(field(raw, 'entered_pct')),
    entries: toNumber(field(raw, 'entries')),
    submitted: toNumber(field(raw, 'submitted')),
    by_track: toCountRows(field(raw, 'by_track')),
  }
}

// ---------------------------------------------------------------
// The readers
// ---------------------------------------------------------------

/** The whole coordinator funnel for a scope, in one round trip. Cached 60s. */
export function getCoordinatorSummary(
  db: Db,
  scope: Pick<IscScope, 'state' | 'district'>
): Promise<AdminResult<CoordinatorSummary>> {
  const args = geoArgs(scope)
  return cachedOk(cacheKey('admin_coordinator_summary', args), () =>
    rpc(db, 'admin_coordinator_summary', args, toSummary)
  )
}

/**
 * States nationally, or one state's districts. Ordered by students covered,
 * most first, and every state with a school is present even when nobody has
 * claimed anything in it -- that row IS the answer to "where is there no
 * coverage", so never filter it out.
 */
export function getCoordinatorBreakdown(
  db: Db,
  scope: Pick<IscScope, 'state' | 'district'>
): Promise<AdminResult<CoordinatorBreakdownRow[]>> {
  const args = stateArg(scope)
  return cachedOk(cacheKey('admin_coordinator_breakdown', args), () =>
    rpc(db, 'admin_coordinator_breakdown', args, (d) => rows(d).map(toBreakdownRow))
  )
}

/**
 * Exactly `days` signup cohorts, oldest first, zero-filled, ending today.
 * `days` is clamped to 1..365: the SQL builds one row per day from it, so an
 * unbounded value out of a query string would be a way to hang the page.
 */
export function getCoordinatorTrend(
  db: Db,
  scope: Pick<IscScope, 'state' | 'district'>,
  days = TREND_DAYS
): Promise<AdminResult<CoordinatorTrendPoint[]>> {
  const args = { ...stateArg(scope), p_days: Math.min(atLeastOne(days), MAX_TREND_DAYS) }
  return cachedOk(cacheKey('admin_coordinator_trend', args), () =>
    rpc(db, 'admin_coordinator_trend', args, (d) => rows(d).map(toTrendPoint))
  )
}

/**
 * One page of the directory, searched and sorted by the database. `size` is
 * clamped to MAX_PAGE_SIZE -- the same 200-row cap the SQL applies internally
 * -- and the CLAMPED value is what comes back in Page.size, so the page count
 * a Pagination draws can never promise a page this will not return.
 */
export function getCoordinatorsPage(
  db: Db,
  q: CoordinatorsQuery,
  size = COORDINATORS_PAGE
): Promise<AdminResult<Page<CoordinatorRow>>> {
  const page = atLeastOne(q.page)
  const clampedSize = Math.min(atLeastOne(size), MAX_PAGE_SIZE)
  const args = {
    p_q: q.q ?? null,
    p_status: q.status ?? null,
    p_state: q.state ?? null,
    p_sort: q.sort,
    p_page: page,
    p_size: clampedSize,
  }
  return cachedOk(cacheKey('admin_coordinators_page', args), () =>
    rpc(db, 'admin_coordinators_page', args, (d) => lift(d, page, clampedSize, toCoordinatorRow))
  )
}

/**
 * One coordinator's numbers, or `ok(null)` when the id is not a coordinator
 * profile -- an unknown uuid and a student's id both answer null rather than
 * raising, so a page opened on a deleted user says "not found" instead of 500.
 *
 * A page must NOT depend on this for the person's name: it is the only source
 * of the four numbers, but the profile and the claim come from plain tables so
 * they still render before the migration has been pasted.
 */
export function getCoordinatorDetail(
  db: Db,
  id: string
): Promise<AdminResult<CoordinatorDetail | null>> {
  const args = { p_coordinator_id: id }
  return cachedOk(cacheKey('admin_coordinator_detail', args), () =>
    rpc(db, 'admin_coordinator_detail', args, toDetail)
  )
}
