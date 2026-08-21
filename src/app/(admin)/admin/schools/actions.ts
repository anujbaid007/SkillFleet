'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  revalidatePath('/admin/schools')
  return { ok: DONE[status] }
}
