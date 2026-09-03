'use server'

import { redirect } from 'next/navigation'
import { LANDING_AFTER_LOGIN } from '@/lib/launch'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type OnboardingFormState = { error?: string } | undefined

export async function submitOnboardingAction(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const rawQ = formData.get('questionnaire_answers') as string | null
  const assessmentId = formData.get('assessment_id') as string | null
  const rawA = formData.get('assessment_answers') as string | null

  if (!rawQ || !assessmentId || !rawA) {
    return { error: 'Incomplete submission. Please complete all steps.' }
  }

  let qAnswers: Record<string, string>
  let aAnswers: Record<string, string>
  try {
    qAnswers = JSON.parse(rawQ)
    aAnswers = JSON.parse(rawA)
  } catch {
    return { error: 'Invalid answer format. Please try again.' }
  }

  const supabase = await createClient()
  const { data: status, error } = await supabase.rpc('complete_onboarding', {
    p_questionnaire_answers: qAnswers,
    p_assessment_id: assessmentId,
    p_assessment_answers: aAnswers,
  })

  if (error) {
    return { error: 'Could not save your answers. Please try again.' }
  }

  if (status === 'already_completed') {
    redirect(LANDING_AFTER_LOGIN)
  }

  if (status !== 'ok') {
    return { error: `Unexpected error (${status}). Please try again.` }
  }

  revalidatePath(LANDING_AFTER_LOGIN)
  redirect(LANDING_AFTER_LOGIN)
}

export async function saveCertRecordAction(
  formData: FormData
): Promise<{ certId?: string; error?: string }> {
  const fileUrl = formData.get('file_url') as string | null
  const fileName = formData.get('file_name') as string | null
  const description = (formData.get('description') as string | null)?.trim() || null
  const parameterId = (formData.get('parameter_id') as string | null) || null

  if (!fileUrl || !fileName) {
    return { error: 'Missing file information.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('certificate_uploads')
    .insert({
      student_id: user.id,
      file_url: fileUrl,
      file_name: fileName,
      description,
      parameter_id: parameterId,
      status: 'pending',
      points_provisional: 0,
      points_approved: 0,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Could not save certificate record.' }
  }

  return { certId: data.id }
}
