'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type QuestionnaireState = { error?: string; success?: string } | undefined

export async function createQuestionAction(
  _prev: QuestionnaireState,
  formData: FormData
): Promise<QuestionnaireState> {
  const text = (formData.get('text') as string)?.trim()
  if (!text) return { error: 'Question text is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('questionnaire_questions')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { data: question, error } = await supabase
    .from('questionnaire_questions')
    .insert({ text, display_order: nextOrder })
    .select('id')
    .single()

  if (error || !question) return { error: 'Could not create question.' }

  revalidatePath('/admin/questionnaire')
  redirect(`/admin/questionnaire/${question.id}/edit`)
}

export async function updateQuestionAction(
  _prev: QuestionnaireState,
  formData: FormData
): Promise<QuestionnaireState> {
  const id = formData.get('id') as string
  const text = (formData.get('text') as string)?.trim()
  const displayOrder = parseInt((formData.get('display_order') as string) ?? '0', 10)
  const isActive = formData.get('is_active') === 'true'

  if (!id || !text) return { error: 'Question text is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('questionnaire_questions')
    .update({ text, display_order: displayOrder, is_active: isActive })
    .eq('id', id)

  if (error) return { error: 'Could not update question.' }
  revalidatePath('/admin/questionnaire')
  revalidatePath(`/admin/questionnaire/${id}/edit`)
  return { success: 'Question updated.' }
}

export async function toggleQuestionActiveAction(formData: FormData) {
  const id = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'
  if (!id) return

  const supabase = await createClient()
  await supabase.from('questionnaire_questions').update({ is_active: !isActive }).eq('id', id)
  revalidatePath('/admin/questionnaire')
}

export async function createOptionAction(
  _prev: QuestionnaireState,
  formData: FormData
): Promise<QuestionnaireState> {
  const questionId = formData.get('question_id') as string
  const text = (formData.get('text') as string)?.trim()

  if (!questionId) return { error: 'Missing question ID.' }
  if (!text) return { error: 'Option text is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('questionnaire_options')
    .select('display_order')
    .eq('question_id', questionId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { error } = await supabase
    .from('questionnaire_options')
    .insert({ question_id: questionId, text, display_order: nextOrder })

  if (error) return { error: 'Could not create option.' }
  revalidatePath(`/admin/questionnaire/${questionId}/edit`)
  return { success: 'Option added.' }
}

export async function updateOptionAction(
  _prev: QuestionnaireState,
  formData: FormData
): Promise<QuestionnaireState> {
  const optionId = formData.get('option_id') as string
  const questionId = formData.get('question_id') as string
  const text = (formData.get('text') as string)?.trim()
  const displayOrder = parseInt((formData.get('display_order') as string) ?? '0', 10)

  if (!optionId || !text) return { error: 'Option text is required.' }

  const supabase = await createClient()

  const { error: updateError } = await supabase
    .from('questionnaire_options')
    .update({ text, display_order: displayOrder })
    .eq('id', optionId)
  if (updateError) return { error: 'Could not update option.' }

  const { data: parameters } = await supabase
    .from('growth_parameters')
    .select('id')
    .eq('is_active', true)

  const scores: { option_id: string; parameter_id: string; points: number }[] = []
  for (const p of parameters ?? []) {
    const pts = parseInt((formData.get(`pts_${p.id}`) as string) ?? '0', 10)
    if (pts > 0) scores.push({ option_id: optionId, parameter_id: p.id, points: pts })
  }

  await supabase.from('questionnaire_option_scores').delete().eq('option_id', optionId)
  if (scores.length) {
    await supabase.from('questionnaire_option_scores').insert(scores)
  }

  if (questionId) revalidatePath(`/admin/questionnaire/${questionId}/edit`)
  return { success: 'Option updated.' }
}

export async function deleteOptionAction(
  _prev: QuestionnaireState,
  formData: FormData
): Promise<QuestionnaireState> {
  const optionId = formData.get('option_id') as string
  const questionId = formData.get('question_id') as string
  if (!optionId) return { error: 'Missing option ID.' }

  const supabase = await createClient()
  const { error } = await supabase.from('questionnaire_options').delete().eq('id', optionId)

  if (error) {
    if (error.code === '23503') {
      return { error: 'This option has already been answered by a student and cannot be deleted.' }
    }
    return { error: 'Could not delete option.' }
  }

  if (questionId) revalidatePath(`/admin/questionnaire/${questionId}/edit`)
  return { success: 'Option deleted.' }
}
