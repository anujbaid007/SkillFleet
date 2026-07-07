'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AssessmentState = { error?: string; success?: string } | undefined

// ── Assessment ───────────────────────────────────────────────────────

export async function createAssessmentAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  if (!title) return { error: 'Title is required.' }

  const supabase = await createClient()
  const { data: assessment, error } = await supabase
    .from('assessments')
    .insert({ title, description })
    .select('id')
    .single()

  if (error || !assessment) return { error: 'Could not create assessment.' }

  revalidatePath('/admin/assessments')
  redirect(`/admin/assessments/${assessment.id}/edit`)
}

export async function updateAssessmentAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const id = formData.get('id') as string
  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const isActive = formData.get('is_active') === 'true'

  if (!id || !title) return { error: 'Title is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('assessments')
    .update({ title, description, is_active: isActive })
    .eq('id', id)

  if (error) return { error: 'Could not update assessment.' }
  revalidatePath('/admin/assessments')
  revalidatePath(`/admin/assessments/${id}/edit`)
  return { success: 'Assessment updated.' }
}

export async function toggleAssessmentActiveAction(formData: FormData) {
  const id = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'
  if (!id) return

  const supabase = await createClient()
  await supabase.from('assessments').update({ is_active: !isActive }).eq('id', id)
  revalidatePath('/admin/assessments')
}

// ── Questions ────────────────────────────────────────────────────────

export async function createAssessmentQuestionAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const assessmentId = formData.get('assessment_id') as string
  const text = (formData.get('text') as string)?.trim()

  if (!assessmentId) return { error: 'Missing assessment ID.' }
  if (!text) return { error: 'Question text is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('assessment_questions')
    .select('display_order')
    .eq('assessment_id', assessmentId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { error } = await supabase
    .from('assessment_questions')
    .insert({ assessment_id: assessmentId, text, display_order: nextOrder })

  if (error) return { error: 'Could not create question.' }
  revalidatePath(`/admin/assessments/${assessmentId}/edit`)
  return { success: 'Question added.' }
}

export async function updateAssessmentQuestionAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const id = formData.get('id') as string
  const assessmentId = formData.get('assessment_id') as string
  const text = (formData.get('text') as string)?.trim()
  const displayOrder = parseInt((formData.get('display_order') as string) ?? '0', 10)

  if (!id || !text) return { error: 'Question text is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('assessment_questions')
    .update({ text, display_order: displayOrder })
    .eq('id', id)

  if (error) return { error: 'Could not update question.' }
  if (assessmentId) revalidatePath(`/admin/assessments/${assessmentId}/edit`)
  return { success: 'Question updated.' }
}

export async function deleteAssessmentQuestionAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const id = formData.get('id') as string
  const assessmentId = formData.get('assessment_id') as string
  if (!id) return { error: 'Missing question ID.' }

  // assessment_options + option_scores cascade on delete; no student data
  // FKs the question, so this is always safe.
  const supabase = await createClient()
  const { error } = await supabase.from('assessment_questions').delete().eq('id', id)

  if (error) return { error: 'Could not delete question.' }
  if (assessmentId) revalidatePath(`/admin/assessments/${assessmentId}/edit`)
  return { success: 'Question deleted.' }
}

// ── Options ──────────────────────────────────────────────────────────

export async function createAssessmentOptionAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const questionId = formData.get('question_id') as string
  const assessmentId = formData.get('assessment_id') as string
  const text = (formData.get('text') as string)?.trim()
  const isCorrect = formData.get('is_correct') === 'true'

  if (!questionId) return { error: 'Missing question ID.' }
  if (!text) return { error: 'Option text is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('assessment_options')
    .select('display_order')
    .eq('question_id', questionId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { error } = await supabase
    .from('assessment_options')
    .insert({ question_id: questionId, text, is_correct: isCorrect, display_order: nextOrder })

  if (error) return { error: 'Could not create option.' }
  if (assessmentId) revalidatePath(`/admin/assessments/${assessmentId}/edit`)
  return { success: 'Option added.' }
}

export async function updateAssessmentOptionAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const optionId = formData.get('option_id') as string
  const questionId = formData.get('question_id') as string
  const assessmentId = formData.get('assessment_id') as string
  const text = (formData.get('text') as string)?.trim()
  const displayOrder = parseInt((formData.get('display_order') as string) ?? '0', 10)
  const isCorrect = formData.get('is_correct') === 'true'

  if (!optionId || !text) return { error: 'Option text is required.' }

  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('assessment_options')
    .update({ text, display_order: displayOrder, is_correct: isCorrect })
    .eq('id', optionId)
  if (updateError) return { error: 'Could not update option.' }

  // Replace this option's parameter point contributions (only correct
  // options actually earn points at scoring time, but we store whatever
  // the admin sets so toggling is_correct later Just Works).
  const { data: parameters } = await supabase
    .from('growth_parameters')
    .select('id')
    .eq('is_active', true)

  const scores: { option_id: string; parameter_id: string; points: number }[] = []
  for (const p of parameters ?? []) {
    const pts = parseInt((formData.get(`pts_${p.id}`) as string) ?? '0', 10)
    if (pts > 0) scores.push({ option_id: optionId, parameter_id: p.id, points: pts })
  }

  await supabase.from('assessment_option_scores').delete().eq('option_id', optionId)
  if (scores.length) {
    await supabase.from('assessment_option_scores').insert(scores)
  }

  if (assessmentId) revalidatePath(`/admin/assessments/${assessmentId}/edit`)
  return { success: 'Option updated.' }
}

export async function deleteAssessmentOptionAction(
  _prev: AssessmentState,
  formData: FormData
): Promise<AssessmentState> {
  const optionId = formData.get('option_id') as string
  const assessmentId = formData.get('assessment_id') as string
  if (!optionId) return { error: 'Missing option ID.' }

  const supabase = await createClient()
  const { error } = await supabase.from('assessment_options').delete().eq('id', optionId)

  if (error) return { error: 'Could not delete option.' }
  if (assessmentId) revalidatePath(`/admin/assessments/${assessmentId}/edit`)
  return { success: 'Option deleted.' }
}
