'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ParamState = { error?: string; success?: string } | undefined

export async function updateParameterAction(
  _prev: ParamState,
  formData: FormData
): Promise<ParamState> {
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const weightStr = formData.get('weight') as string
  const displayOrder = parseInt((formData.get('display_order') as string) ?? '0', 10)
  const isActive = formData.get('is_active') === 'true'

  if (!id || !name) return { error: 'ID and name are required.' }
  const weight = parseFloat(weightStr)
  if (isNaN(weight) || weight < 0 || weight > 1) return { error: 'Weight must be between 0 and 1.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('growth_parameters')
    .update({
      name,
      description,
      weight,
      display_order: displayOrder,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: 'Could not update parameter.' }
  revalidatePath('/admin/parameters')
  return { success: `"${name}" updated.` }
}

export async function createParameterAction(
  _prev: ParamState,
  formData: FormData
): Promise<ParamState> {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Name is required.' }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('growth_parameters')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { error } = await supabase
    .from('growth_parameters')
    .insert({ name, description, display_order: nextOrder })
  if (error) return { error: 'Could not create parameter.' }
  revalidatePath('/admin/parameters')
  return { success: `"${name}" created.` }
}

export async function updateScoreLevelAction(
  _prev: ParamState,
  formData: FormData
): Promise<ParamState> {
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const minScore = parseInt(formData.get('min_score') as string, 10)
  const maxScore = parseInt(formData.get('max_score') as string, 10)

  if (!id || !name) return { error: 'ID and name required.' }
  if (isNaN(minScore) || isNaN(maxScore) || minScore < 0 || maxScore > 100 || minScore >= maxScore) {
    return { error: 'Min must be < max, both in 0–100.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('score_levels')
    .update({ name, min_score: minScore, max_score: maxScore })
    .eq('id', id)

  if (error) return { error: 'Could not update score level.' }
  revalidatePath('/admin/parameters')
  return { success: 'Score level updated.' }
}
