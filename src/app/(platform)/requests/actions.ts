'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Toggle "Notify me when live" on a planned offering. */
export async function toggleInterestAction(formData: FormData) {
  const offeringId = formData.get('offering_id') as string
  if (!offeringId) return
  const supabase = await createClient()
  await supabase.rpc('toggle_offering_interest', { p_offering_id: offeringId })
  revalidatePath(`/catalog/${offeringId}`)
  revalidatePath('/catalog')
  revalidatePath('/requests')
}

/** Toggle "+1" support on a community demand request. */
export async function toggleSupportAction(formData: FormData) {
  const requestId = formData.get('request_id') as string
  if (!requestId) return
  const supabase = await createClient()
  await supabase.rpc('toggle_request_support', { p_request_id: requestId })
  revalidatePath('/requests')
}

export type RequestFormState = { error?: string; ok?: boolean } | undefined

/** Submit a new demand request for an offering that doesn't exist yet. */
export async function submitRequestAction(
  _prev: RequestFormState,
  formData: FormData
): Promise<RequestFormState> {
  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const categoryId = (formData.get('category_id') as string) || null
  if (!title) return { error: 'Please describe what you’re looking for.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_offering_request', {
    p_title: title,
    p_description: description,
    p_category_id: categoryId,
  })
  if (error) return { error: 'Could not submit your request. Please try again.' }

  revalidatePath('/requests')
  return { ok: true }
}
