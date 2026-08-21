'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type FamilyFormState = { error?: string; success?: string } | undefined

const DECISION_MESSAGE: Record<string, string> = {
  approved: 'Added to your family.',
  declined: 'Request declined — they keep their own account.',
  no_family: 'Your account is not part of a family yet.',
  not_in_family: 'That request is no longer waiting on you.',
  not_pending: 'That request has already been handled.',
}

/**
 * An active family member approves or declines a sibling who signed up with
 * the same parent email. Declining detaches them; nothing is deleted.
 */
export async function decideFamilyMemberAction(
  _prevState: FamilyFormState,
  formData: FormData
): Promise<FamilyFormState> {
  const studentId = formData.get('student_id') as string
  const approve = formData.get('approve') === 'true'

  if (!studentId) return { error: 'Missing account.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('decide_family_member', {
    p_student_id: studentId,
    p_approve: approve,
  })

  if (error) return { error: error.message }

  const outcome = (data as string) ?? ''
  if (outcome !== 'approved' && outcome !== 'declined') {
    return { error: DECISION_MESSAGE[outcome] ?? 'Could not complete that.' }
  }

  // Approving changes who this family can book, switch to, and pay for.
  revalidatePath('/family')
  revalidatePath('/', 'layout')

  return { success: DECISION_MESSAGE[outcome] }
}
