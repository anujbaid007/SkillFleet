'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type TaxonomyState = { error?: string; success?: string } | undefined

export async function createCategoryAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Category name is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert({ name, description })

  if (error) return { error: 'Could not create category.' }
  revalidatePath('/admin/taxonomy')
  return { success: `Category "${name}" created.` }
}

export async function createTopicAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const name = (formData.get('name') as string)?.trim()
  const categoryId = formData.get('category_id') as string
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Topic name is required.' }
  if (!categoryId) return { error: 'Category is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('topics').insert({ name, description, category_id: categoryId })

  if (error) return { error: 'Could not create topic.' }
  revalidatePath('/admin/taxonomy')
  return { success: `Topic "${name}" created.` }
}

export async function toggleCategoryAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const id = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const supabase = await createClient()
  const { error } = await supabase.from('categories').update({ is_active: !isActive }).eq('id', id)

  if (error) return { error: 'Could not update category.' }
  revalidatePath('/admin/taxonomy')
  return { success: 'Updated.' }
}

export async function toggleTopicAction(
  _prev: TaxonomyState,
  formData: FormData
): Promise<TaxonomyState> {
  const id = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  const supabase = await createClient()
  const { error } = await supabase.from('topics').update({ is_active: !isActive }).eq('id', id)

  if (error) return { error: 'Could not update topic.' }
  revalidatePath('/admin/taxonomy')
  return { success: 'Updated.' }
}
