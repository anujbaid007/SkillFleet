'use server'

import { revalidatePath } from 'next/cache'
import { invalidateAdminCache } from '@/lib/admin/cache'
import { createClient } from '@/lib/supabase/server'

/*
  A single-row decision has to clear the admin cache for the same reason a bulk
  one does: src/lib/admin/queues.ts caches a queue page for sixty seconds, so
  without this the admin would approve a school and then watch it sit in the
  list until the minute was up. revalidatePath alone re-renders the route --
  and the re-render reads the same stale entry.
*/

export type SchoolReviewState = { error?: string; ok?: string } | undefined

const ERR: Record<string, string> = {
  forbidden: 'Admins only.',
  not_pending: 'That school has already been reviewed.',
  notes_required: 'Give a reason when rejecting a school.',
  merge_target_required: 'Choose which school to merge into.',
  merge_target_missing: 'That school no longer exists.',
  merge_target_not_approved: 'You can only merge into an approved school — approve it first.',
  merge_into_self: 'A school cannot be merged into itself.',
  bad_decision: 'Unknown action.',
}

const DONE: Record<string, string> = {
  approved: 'School approved — students can now find it.',
  rejected: 'School rejected.',
  merged: 'Merged. Any students on the duplicate now point at the real school.',
}

export async function reviewSchoolAction(
  _prev: SchoolReviewState,
  formData: FormData
): Promise<SchoolReviewState> {
  const schoolId = (formData.get('school_id') as string)?.trim()
  const decision = (formData.get('decision') as string)?.trim()
  const notes = ((formData.get('notes') as string) ?? '').trim() || null
  const mergeInto = ((formData.get('merge_into') as string) ?? '').trim() || null

  if (!schoolId || !decision) return { error: 'Missing school or action.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_review_school', {
    p_school_id: schoolId,
    p_decision: decision,
    p_notes: notes,
    p_merge_into: mergeInto,
  })

  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (!DONE[status]) return { error: ERR[status] ?? 'Could not complete that.' }

  invalidateAdminCache()
  revalidatePath('/admin/schools')
  revalidatePath('/admin')
  return { ok: DONE[status] }
}

const CLAIM_ERR: Record<string, string> = {
  forbidden: 'Admins only.',
  not_pending: 'That application has already been reviewed.',
  notes_required: 'Give a reason when rejecting an application.',
  bad_decision: 'Unknown action.',
}

const CLAIM_DONE: Record<string, string> = {
  approved: 'Coordinator approved.',
  rejected: 'Coordinator application rejected.',
}

/**
 * Approve or reject a coordinator's claim on a school. Deliberately separate
 * from reviewSchoolAction: for a school that was itself pending, the two
 * decisions are independent — an admin can approve the school while rejecting
 * the person who claimed it.
 */
export async function reviewCoordinatorClaimAction(
  _prev: SchoolReviewState,
  formData: FormData
): Promise<SchoolReviewState> {
  const schoolId = (formData.get('school_id') as string)?.trim()
  const decision = (formData.get('decision') as string)?.trim()
  const notes = ((formData.get('notes') as string) ?? '').trim() || null

  if (!schoolId || !decision) return { error: 'Missing school or action.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_review_coordinator_claim', {
    p_school_id: schoolId,
    p_decision: decision,
    p_notes: notes,
  })

  if (error) return { error: 'Something went wrong. Please try again.' }

  const status = (data as string) ?? ''
  if (!CLAIM_DONE[status]) return { error: CLAIM_ERR[status] ?? 'Could not complete that.' }

  invalidateAdminCache()
  // The claims queue lives under /admin/coordinators/claims, not
  // /admin/schools -- revalidating the schools page left the list this row is
  // actually on stale.
  revalidatePath('/admin/coordinators/claims')
  revalidatePath('/admin/coordinators')
  revalidatePath('/admin')
  revalidatePath('/coordinator')
  return { ok: CLAIM_DONE[status] }
}
