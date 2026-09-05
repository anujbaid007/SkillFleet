/*
  The admin landing page's two readers.

  Same three rules as isc.ts, users.ts and coordinators.ts, and the plumbing is
  copied rather than imported for the same reason those files copy it: isc.ts
  does not export it. cachedOk (a failure is never cached), cacheKey on the
  arguments, and every count through src/lib/admin/coerce.ts.

  WHY THERE ARE TWO READERS FOR ONE PAGE, and not one.

  admin_dashboard() answers the whole landing page in a single round trip, and
  it is the only reader for the championship half of it. But it calls
  admin_isc_summary() and admin_isc_breakdown() inside itself, and the task-4-5
  harness measured it at ~4.9 s at 200k students / 800k entries -- essentially
  all of it those two. It also needs docs/admin-scale-migration.sql to have been
  pasted at all.

  The eight counts it opens with need neither. Every one of them is a single
  `count(*)` over a plain table with an index behind it, so getDeskCounts()
  reads them straight from those tables. That buys two things the founder
  actually feels:

    * the queues an admin came to the page to work -- schools, coordinator
      claims, certificates, support -- are on screen from the first response
      rather than five seconds later behind the championship;
    * they are still on screen, with real numbers, before the migration has
      been pasted, when every RPC on this page answers `migration-missing`.

  The two disagree by at most the sixty seconds they are each cached for, and
  they are the same SQL predicates -- kept deliberately identical to
  admin_dashboard's, which is the contract this file is tested against.
*/

import { cachedOk, cacheKey } from '@/lib/admin/cache'
import { field, toNumber, toText } from '@/lib/admin/coerce'
import { mapRpcError, ok, type AdminResult } from '@/lib/admin/errors'
import type { BreakdownRow, CountRow, IscSummary, TimelinePoint } from '@/lib/admin/isc'
import type { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Db = Awaited<ReturnType<typeof createClient>>
type AdminFunctionName = Extract<keyof Database['public']['Functions'], `admin_${string}`>

// ---------------------------------------------------------------
// The shapes a page receives
// ---------------------------------------------------------------

/**
 * The eight counts admin_dashboard() opens with, and the only part of this
 * page that survives a missing migration.
 *
 * `pending_coordinators` counts SCHOOL ROWS whose coordinator_status is
 * 'pending', which is what admin_dashboard counts. The Coordinators section
 * counts a claim only when the school also has a coordinator_id, so its
 * "waiting on review" figure can be smaller. Both are right about different
 * questions; a screen showing both has to say so.
 */
export interface DeskCounts {
  /** schools.review_status = 'pending' */
  pending_schools: number
  /** schools.coordinator_status = 'pending' -- school rows, not people. */
  pending_coordinators: number
  /** certificate_uploads.status = 'pending' */
  pending_certificates: number
  /** support_conversations with a message in the last ACTIVE_SUPPORT_DAYS days. */
  active_support: number
  /** user_profiles.role = 'student' */
  students: number
  /** ...and onboarding_completed. A true subset of `students`. */
  students_onboarded: number
  /** user_profiles.role = 'coordinator' */
  coordinators: number
  /** schools.review_status = 'approved' */
  schools_approved: number
}

/**
 * admin_dashboard(). All twelve keys are always present and the three arrays
 * are never null -- jsonb_build_object is unconditional.
 *
 * THE ONE THING A PAGE MUST NOT GET WRONG. `top_states` and `stalled_states`
 * are ranked by submitted/eligible, and that ratio IS NOT A PERCENTAGE. It was
 * measured at 1.39 on the harness seed: `submitted` counts students on a
 * submitted entry at a school in that state, including students outside
 * Classes 5-12 and students living elsewhere, while `eligible` counts Classes
 * 5-12 students whose own profile says they live there. Show the two counts
 * with their units. Never a percentage, never a bar.
 *
 * `timeline[].started` and `[].submitted` count ENTRIES; `isc.started` and
 * `isc.submitted` count PEOPLE. Same words, different units.
 */
export interface Dashboard extends DeskCounts {
  /** The national admin_isc_summary(), verbatim. */
  isc: IscSummary
  /** Up to 5 states with eligible > 0, best submitted/eligible first. */
  top_states: BreakdownRow[]
  /** Up to 5 states with eligible >= 50, worst submitted/eligible first. */
  stalled_states: BreakdownRow[]
  /** Exactly 7 points, oldest day first, zero-filled, ending today. */
  timeline: TimelinePoint[]
}

/** admin_dashboard's window for a "live" support conversation. */
export const ACTIVE_SUPPORT_DAYS = 7

const DAY_MS = 86_400_000

// ---------------------------------------------------------------
// Calling the RPC -- copied from isc.ts, which does not export this part
// ---------------------------------------------------------------

type RpcResponse = { data: unknown; error: { code?: string; message?: string } | null }

/**
 * Casts the CLIENT, not the method: supabase-js's rpc() reads `this`, so the
 * receiver has to survive the cast.
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
 * a local midnight is 18:30 the previous day in UTC, which would shift every
 * point on the chart back a day.
 */
function toDay(value: unknown): string {
  if (value instanceof Date) {
    const m = `${value.getMonth() + 1}`.padStart(2, '0')
    const d = `${value.getDate()}`.padStart(2, '0')
    return `${value.getFullYear()}-${m}-${d}`
  }
  return toText(value)
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

function toDashboard(raw: unknown): Dashboard {
  return {
    pending_schools: toNumber(field(raw, 'pending_schools')),
    pending_coordinators: toNumber(field(raw, 'pending_coordinators')),
    pending_certificates: toNumber(field(raw, 'pending_certificates')),
    active_support: toNumber(field(raw, 'active_support')),
    students: toNumber(field(raw, 'students')),
    students_onboarded: toNumber(field(raw, 'students_onboarded')),
    coordinators: toNumber(field(raw, 'coordinators')),
    schools_approved: toNumber(field(raw, 'schools_approved')),
    isc: toSummary(field(raw, 'isc')),
    top_states: rows(field(raw, 'top_states')).map(toBreakdownRow),
    stalled_states: rows(field(raw, 'stalled_states')).map(toBreakdownRow),
    timeline: rows(field(raw, 'timeline')).map(toTimelinePoint),
  }
}

// ---------------------------------------------------------------
// The readers
// ---------------------------------------------------------------

/**
 * The whole landing page in one round trip. Cached 60 seconds.
 *
 * EXPENSIVE: ~4.9 s in the pglite harness at 200k students and 800k entries,
 * almost all of it the two ISC functions inside it. Give it its own async
 * boundary on any page that also shows something cheap, or the cheap thing
 * waits for this. getDeskCounts() exists for exactly that reason.
 */
export function getDashboard(db: Db): Promise<AdminResult<Dashboard>> {
  return cachedOk(cacheKey('admin_dashboard', {}), () => rpc(db, 'admin_dashboard', {}, toDashboard))
}

/** `head: true` -- Postgres counts the rows and sends none of them back. */
const HEAD = { count: 'exact', head: true } as const

type CountResponse = { count: number | null; error: { code?: string; message?: string } | null }

function n(response: CountResponse): number {
  return toNumber(response.count)
}

/**
 * The eight counts, straight from the tables, without the migration and
 * without the championship's five seconds. Cached 60 seconds, like everything
 * else here, and invalidated by the same invalidateAdminCache() the review
 * actions already call.
 *
 * Eight `head: true` counts in parallel rather than one function, because a
 * function would be one more thing to paste before the landing page worked.
 * The predicates are copied from admin_dashboard() line for line; if one of
 * them changes there, change it here.
 */
export function getDeskCounts(db: Db): Promise<AdminResult<DeskCounts>> {
  return cachedOk(cacheKey('admin_desk_counts', {}), async () => {
    const since = new Date(Date.now() - ACTIVE_SUPPORT_DAYS * DAY_MS).toISOString()

    const [
      pendingSchools,
      pendingCoordinators,
      pendingCertificates,
      activeSupport,
      students,
      studentsOnboarded,
      coordinators,
      schoolsApproved,
    ] = (await Promise.all([
      db.from('schools').select('id', HEAD).eq('review_status', 'pending'),
      db.from('schools').select('id', HEAD).eq('coordinator_status', 'pending'),
      db.from('certificate_uploads').select('id', HEAD).eq('status', 'pending'),
      db.from('support_conversations').select('id', HEAD).gt('last_message_at', since),
      db.from('user_profiles').select('id', HEAD).eq('role', 'student'),
      db
        .from('user_profiles')
        .select('id', HEAD)
        .eq('role', 'student')
        .eq('onboarding_completed', true),
      db.from('user_profiles').select('id', HEAD).eq('role', 'coordinator'),
      db.from('schools').select('id', HEAD).eq('review_status', 'approved'),
    ])) as unknown as CountResponse[]

    // One failure fails the row rather than being rendered as a nought: a
    // queue that quietly reads zero is a queue an admin stops opening.
    const failed = [
      pendingSchools,
      pendingCoordinators,
      pendingCertificates,
      activeSupport,
      students,
      studentsOnboarded,
      coordinators,
      schoolsApproved,
    ].find((r) => r.error)
    if (failed?.error) return mapRpcError(failed.error)

    return ok({
      pending_schools: n(pendingSchools),
      pending_coordinators: n(pendingCoordinators),
      pending_certificates: n(pendingCertificates),
      active_support: n(activeSupport),
      students: n(students),
      students_onboarded: n(studentsOnboarded),
      coordinators: n(coordinators),
      schools_approved: n(schoolsApproved),
    })
  })
}
