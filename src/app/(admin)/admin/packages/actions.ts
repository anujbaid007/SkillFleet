'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type PackageTierFormState = { error?: string } | undefined

function parseTier(formData: FormData) {
  const name = (formData.get('name') as string)?.trim() ?? ''
  const slotCount = parseInt(formData.get('slot_count') as string, 10)
  const priceRupees = formData.get('price_rupees') as string
  const validityDays = parseInt((formData.get('validity_days') as string) || '365', 10)
  const description = (formData.get('description') as string)?.trim() || null
  const pricePaise = priceRupees ? Math.round(parseFloat(priceRupees) * 100) : 0

  return { name, slotCount, pricePaise, validityDays, description }
}

function validateTier(t: ReturnType<typeof parseTier>): string | null {
  if (!t.name) return 'Name is required.'
  if (isNaN(t.slotCount) || t.slotCount < 1) return 'Slots must be a whole number of at least 1.'
  if (t.pricePaise < 0) return 'Price must be a non-negative number.'
  if (isNaN(t.validityDays) || t.validityDays < 1) return 'Validity must be at least 1 day.'
  return null
}

export async function createTierAction(
  _prev: PackageTierFormState,
  formData: FormData
): Promise<PackageTierFormState> {
  const t = parseTier(formData)
  const err = validateTier(t)
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: last } = await supabase
    .from('package_tiers')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.display_order ?? 0) + 1

  const { error } = await supabase.from('package_tiers').insert({
    name: t.name,
    slot_count: t.slotCount,
    price_paise: t.pricePaise,
    validity_days: t.validityDays,
    description: t.description,
    display_order: nextOrder,
  })
  if (error) return { error: 'Could not create tier.' }

  revalidatePath('/admin/packages')
  redirect('/admin/packages')
}

export async function updateTierAction(
  _prev: PackageTierFormState,
  formData: FormData
): Promise<PackageTierFormState> {
  const tierId = formData.get('tier_id') as string
  if (!tierId) return { error: 'Missing tier ID.' }
  const t = parseTier(formData)
  const err = validateTier(t)
  if (err) return { error: err }
  const isActive = formData.get('is_active') === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('package_tiers')
    .update({
      name: t.name,
      slot_count: t.slotCount,
      price_paise: t.pricePaise,
      validity_days: t.validityDays,
      description: t.description,
      is_active: isActive,
    })
    .eq('id', tierId)
  if (error) return { error: 'Could not update tier.' }

  revalidatePath('/admin/packages')
  redirect('/admin/packages')
}

export async function toggleTierAction(formData: FormData) {
  const id = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'
  if (!id) return

  const supabase = await createClient()
  await supabase.from('package_tiers').update({ is_active: !isActive }).eq('id', id)
  revalidatePath('/admin/packages')
}
