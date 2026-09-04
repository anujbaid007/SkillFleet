/*
  Scope and filters for the admin pages, parsed out of a URL a person can edit
  by hand and turned into arguments the admin SQL functions accept.

  THE ONE RULE THAT IS NOT NEGOTIABLE: every scope-taking function in
  docs/admin-scale-migration.sql RAISES when given a district without a state,
  because Indian district names repeat across states -- Aurangabad is in both
  Maharashtra and Bihar -- and a district on its own would silently merge them.
  So normalizeScope() DROPS an orphan district, and scopeToRpcArgs() normalises
  before it maps. A page cannot trigger that exception by accident, however
  badly the query string is typed; use scopeHasOrphanDistrict() if you want to
  tell the founder the district in the URL was ignored.
*/

export interface IscScope {
  state?: string
  district?: string
  schoolId?: string
}

export interface RosterFilters {
  track?: string
  status?: string
  division?: string
  language?: string
  q?: string
  page: number
}

export type SearchParams = Record<string, string | string[] | undefined>

const FILTER_KEYS = ['track', 'status', 'division', 'language', 'q'] as const

/**
 * Longest filter value we will carry. A query string is user-typed and the
 * cache keys these values, so an unbounded value is unbounded memory held for
 * a minute in a Worker isolate. Truncation is stable under a round trip.
 */
export const MAX_FILTER_LENGTH = 200

/** Page numbers past this are a typo or an attack, never a real page. */
export const MAX_PAGE = 100_000

function first(v: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().slice(0, MAX_FILTER_LENGTH)
  return s === '' ? undefined : s
}

/**
 * Total by construction: any garbage in the query string yields a valid filter
 * object, never a throw. An unreadable page falls back to 1.
 */
export function parseRosterFilters(sp: SearchParams): RosterFilters {
  const out: RosterFilters = { page: 1 }
  for (const k of FILTER_KEYS) {
    const v = first(sp[k])
    if (v) out[k] = v
  }
  const p = Number.parseInt(first(sp.page) ?? '', 10)
  if (Number.isFinite(p) && p > 1) out.page = Math.min(Math.floor(p), MAX_PAGE)
  return out
}

/**
 * The inverse of parseRosterFilters, for building page links.
 * rosterFiltersToQuery(parseRosterFilters(x)) is stable: feed the result back
 * through parseRosterFilters and you get the same object, so a link does not
 * drift every time it is clicked.
 */
export function rosterFiltersToQuery(
  f: RosterFilters,
  overrides: Partial<RosterFilters> = {}
): string {
  const merged = { ...f, ...overrides }
  const q = new URLSearchParams()
  for (const k of FILTER_KEYS) {
    const v = merged[k]
    if (v) q.set(k, v)
  }
  if (merged.page > 1) q.set('page', String(merged.page))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Scope out of the same query string, with the same totality guarantee. */
export function parseScope(sp: SearchParams): IscScope {
  return normalizeScope({
    state: first(sp.state),
    district: first(sp.district),
    schoolId: first(sp.school) ?? first(sp.schoolId),
  })
}

/** True when the district in this scope will be ignored for want of a state. */
export function scopeHasOrphanDistrict(scope: IscScope): boolean {
  return !!scope.district && !scope.state
}

/**
 * Drops a district that has no state, and drops empty strings. Everything that
 * builds RPC arguments goes through here, so the SQL's district-without-state
 * exception is unreachable from the app.
 */
export function normalizeScope(scope: IscScope): IscScope {
  const state = scope.state?.trim() || undefined
  const district = state ? scope.district?.trim() || undefined : undefined
  const schoolId = scope.schoolId?.trim() || undefined
  const out: IscScope = {}
  if (state) out.state = state
  if (district) out.district = district
  if (schoolId) out.schoolId = schoolId
  return out
}

export function scopeToRpcArgs(scope: IscScope): {
  p_state: string | null
  p_district: string | null
  p_school_id: string | null
} {
  const s = normalizeScope(scope)
  return {
    p_state: s.state ?? null,
    p_district: s.district ?? null,
    p_school_id: s.schoolId ?? null,
  }
}

/** admin_isc_breakdown and admin_isc_cold_schools take the geography only. */
export function geoScopeToRpcArgs(scope: Pick<IscScope, 'state' | 'district'>): {
  p_state: string | null
  p_district: string | null
} {
  const s = normalizeScope(scope)
  return { p_state: s.state ?? null, p_district: s.district ?? null }
}

export function filtersToRpcArgs(f: RosterFilters): {
  p_track: string | null
  p_status: string | null
  p_division: string | null
  p_language: string | null
  p_q: string | null
} {
  return {
    p_track: f.track ?? null,
    p_status: f.status ?? null,
    p_division: f.division ?? null,
    p_language: f.language ?? null,
    p_q: f.q ?? null,
  }
}

export function pageCount(total: number, size: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(size) || size <= 0) return 1
  return Math.max(1, Math.ceil(total / size))
}
