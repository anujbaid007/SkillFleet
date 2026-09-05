'use server'

/*
  Bulk approve and bulk reject for the three review queues.

  SECURITY, first, because this is the part that is easy to get wrong: a server
  action is a POST endpoint. The (admin) layout that gated the page which
  rendered the form does not run for it, and src/lib/admin/cache.ts is not
  scoped to a user, so nothing upstream can be relied on. Every action here
  starts with adminClient(): getUser(), then the role out of user_profiles,
  and only then a single row is touched. Same order as
  src/app/(admin)/admin/search/route.ts and the ISC export route.

  The database functions are the same ones the single-row forms call --
  admin_review_school, admin_review_coordinator_claim, admin_approve_cert and
  admin_reject_cert -- and each of them re-checks is_admin() in SQL as well.
  Two gates, deliberately.

  PARTIAL FAILURE IS THE NORMAL CASE, not an edge case. A queue is a list an
  admin has been looking at for a minute or two; by the time they tick fifteen
  rows and press approve, one of them may have been reviewed in another tab, or
  a certificate may have no skill tagged and so cannot be approved unattended.
  So every loop counts successes and failures separately, collects the distinct
  reasons, and reports all three. Nothing here ever reports a row as done that
  the database refused.

  One round trip per row, in order. At QUEUE_PAGE (twenty-five) that is
  twenty-five statements, which is well inside a request; MAX_BULK caps a
  hand-crafted POST at two hundred.
*/

import { revalidatePath } from 'next/cache'
import { invalidateAdminCache } from '@/lib/admin/cache'
import { createClient } from '@/lib/supabase/server'
import type { BulkResult } from '@/components/admin/admin-queue'

/** The most rows one call will act on, whatever the form says. */
const MAX_BULK = 200

/** The database's own status codes, in words an admin can act on. */
const REASON: Record<string, string> = {
  forbidden: 'admins only',
  not_admin: 'admins only',
  not_pending: 'already reviewed',
  not_found: 'no longer there',
  notes_required: 'a reason is required',
  no_parameter: 'no skill tagged, so open it and pick one',
  bad_decision: 'unknown action',
}

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * The signed-in admin's client, or null. Null means "do nothing and say so" --
 * never "carry on and let the SQL decide".
 */
async function adminClient(): Promise<Supabase | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return null
  return supabase
}

/** The ticked ids, deduplicated, trimmed and capped. */
function idsFrom(formData: FormData): string[] {
  const raw = formData
    .getAll('ids')
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
  return [...new Set(raw)].slice(0, MAX_BULK)
}

function decisionFrom(formData: FormData): 'approve' | 'reject' | null {
  const d = formData.get('decision')
  return d === 'approve' || d === 'reject' ? d : null
}

function noteFrom(formData: FormData): string {
  const n = formData.get('note')
  return typeof n === 'string' ? n.trim() : ''
}

function plural(n: number, noun: string): string {
  return `${n} ${n === 1 ? noun : `${noun}s`}`
}

function refused(message: string, failed = 0): BulkResult {
  return { ok: 0, failed, message }
}

/**
 * One sentence covering every outcome. A partial failure names both numbers
 * and every distinct reason, so an admin never has to guess which of the rows
 * they ticked actually moved.
 */
function report(
  done: 'approved' | 'rejected',
  noun: string,
  ok: number,
  failed: number,
  reasons: Set<string>
): BulkResult {
  const Done = `${done[0].toUpperCase()}${done.slice(1)}`
  const why = reasons.size > 0 ? `: ${[...reasons].join('; ')}` : ''
  if (failed === 0) return { ok, failed, message: `${Done} ${plural(ok, noun)}.` }
  if (ok === 0) {
    return {
      ok,
      failed,
      message: `Nothing was ${done}. ${plural(failed, noun)} could not be ${done}${why}.`,
    }
  }
  return {
    ok,
    failed,
    message: `${Done} ${plural(ok, noun)}. ${failed} could not be ${done}${why}.`,
  }
}

/**
 * Every queue path an admin might be looking at, plus the dashboard whose
 * counts these rows feed. invalidateAdminCache() first: revalidatePath
 * re-renders the route inside this same response, and a re-render that reads a
 * minute-old cache would show the admin the row they just approved still
 * waiting.
 */
function refresh(queuePath: string): void {
  invalidateAdminCache()
  revalidatePath(queuePath)
  revalidatePath('/admin')
}

// ---------------------------------------------------------------
// Schools
// ---------------------------------------------------------------

export async function bulkReviewSchools(formData: FormData): Promise<BulkResult> {
  const ids = idsFrom(formData)
  const decision = decisionFrom(formData)
  const note = noteFrom(formData)

  if (ids.length === 0) return refused('Nothing was selected.')
  if (!decision) return refused('Unknown action. Nothing was changed.', ids.length)
  if (decision === 'reject' && note === '') {
    return refused('Give a reason when rejecting. Nothing was changed.', ids.length)
  }

  const supabase = await adminClient()
  if (!supabase) return refused('Admins only. Nothing was changed.', ids.length)

  let ok = 0
  let failed = 0
  const reasons = new Set<string>()

  for (const id of ids) {
    const { data, error } = await supabase.rpc('admin_review_school', {
      p_school_id: id,
      p_decision: decision,
      p_notes: decision === 'reject' ? note : null,
      p_merge_into: null,
    })
    if (error) {
      failed++
      reasons.add('the database did not answer')
      continue
    }
    const status = (data as string) ?? ''
    if (status === 'approved' || status === 'rejected' || status === 'merged') ok++
    else {
      failed++
      reasons.add(REASON[status] ?? 'could not be completed')
    }
  }

  refresh('/admin/schools')
  return decision === 'approve'
    ? report('approved', 'school', ok, failed, reasons)
    : report('rejected', 'school', ok, failed, reasons)
}

// ---------------------------------------------------------------
// Coordinator claims
// ---------------------------------------------------------------

export async function bulkReviewCoordinators(formData: FormData): Promise<BulkResult> {
  const ids = idsFrom(formData)
  const decision = decisionFrom(formData)
  const note = noteFrom(formData)

  if (ids.length === 0) return refused('Nothing was selected.')
  if (!decision) return refused('Unknown action. Nothing was changed.', ids.length)
  if (decision === 'reject' && note === '') {
    return refused('Give a reason when rejecting. Nothing was changed.', ids.length)
  }

  const supabase = await adminClient()
  if (!supabase) return refused('Admins only. Nothing was changed.', ids.length)

  let ok = 0
  let failed = 0
  const reasons = new Set<string>()

  // The id here is the SCHOOL the claim sits on -- a claim has no id of its
  // own, it is a pair of columns on schools.
  for (const id of ids) {
    const { data, error } = await supabase.rpc('admin_review_coordinator_claim', {
      p_school_id: id,
      p_decision: decision,
      p_notes: decision === 'reject' ? note : null,
    })
    if (error) {
      failed++
      reasons.add('the database did not answer')
      continue
    }
    const status = (data as string) ?? ''
    if (status === 'approved' || status === 'rejected') ok++
    else {
      failed++
      reasons.add(REASON[status] ?? 'could not be completed')
    }
  }

  refresh('/admin/coordinators')
  // An approved coordinator's own console opens on their next load.
  revalidatePath('/coordinator')
  return decision === 'approve'
    ? report('approved', 'application', ok, failed, reasons)
    : report('rejected', 'application', ok, failed, reasons)
}

// ---------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------

/** Same range the single-certificate form offers. */
const MAX_POINTS = 1000

export async function bulkReviewCertificates(formData: FormData): Promise<BulkResult> {
  const ids = idsFrom(formData)
  const decision = decisionFrom(formData)
  const note = noteFrom(formData)

  if (ids.length === 0) return refused('Nothing was selected.')
  if (!decision) return refused('Unknown action. Nothing was changed.', ids.length)
  if (decision === 'reject' && note === '') {
    return refused('Give a reason when rejecting. Nothing was changed.', ids.length)
  }

  let points = 0
  if (decision === 'approve') {
    points = Number.parseInt((formData.get('points') as string) ?? '', 10)
    if (!Number.isFinite(points) || points < 0 || points > MAX_POINTS) {
      return refused(
        `Points must be a whole number between zero and ${MAX_POINTS}. Nothing was changed.`,
        ids.length
      )
    }
  }

  const supabase = await adminClient()
  if (!supabase) return refused('Admins only. Nothing was changed.', ids.length)

  let ok = 0
  let failed = 0
  const reasons = new Set<string>()

  for (const id of ids) {
    // p_parameter_id stays null: a bulk decision cannot pick a skill per
    // certificate, so one that has none tagged comes back 'no_parameter' and
    // is reported as a row to open individually rather than quietly skipped.
    const { data, error } =
      decision === 'approve'
        ? await supabase.rpc('admin_approve_cert', {
            p_cert_id: id,
            p_points_approved: points,
            p_admin_notes: null,
            p_parameter_id: null,
          })
        : await supabase.rpc('admin_reject_cert', { p_cert_id: id, p_admin_notes: note })
    if (error) {
      failed++
      reasons.add('the database did not answer')
      continue
    }
    const status = (data as string) ?? ''
    if (status === 'ok') ok++
    else {
      failed++
      reasons.add(REASON[status] ?? 'could not be completed')
    }
  }

  refresh('/admin/certificates')
  return decision === 'approve'
    ? report('approved', 'certificate', ok, failed, reasons)
    : report('rejected', 'certificate', ok, failed, reasons)
}
