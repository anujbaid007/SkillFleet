'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateOffering, type OfferingErrors } from '@/lib/validation/offering'
import { modeOptionsForType } from '@/lib/offering-meta'

export type OfferingFormState = { errors?: OfferingErrors; error?: string } | undefined

async function getActiveParamIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from('growth_parameters').select('id').eq('is_active', true)
  return (data ?? []).map((p) => p.id)
}

/** Parse the vendor offering form. Status is NOT vendor-controlled; meeting links are admin-only. */
function parseVendorForm(formData: FormData, parameterIds: string[]) {
  const priceRupees = formData.get('price_rupees') as string
  const scheduledRaw = formData.get('scheduled_at') as string
  const pricePaise = priceRupees ? Math.round(parseFloat(priceRupees) * 100) : 0
  const scheduledAt = scheduledRaw ? `${scheduledRaw}:00+05:30` : null

  const contributions: { parameter_id: string; points: number }[] = []
  for (const pid of parameterIds) {
    const pts = parseInt((formData.get(`pts_${pid}`) as string) ?? '0', 10)
    if (pts > 0) contributions.push({ parameter_id: pid, points: pts })
  }

  const type = formData.get('type') as string
  const rawMode = (formData.get('mode') as string) || null
  const validModes = modeOptionsForType(type).map((m) => m.value)
  const mode = rawMode && validModes.includes(rawMode) ? rawMode : null
  const duration = formData.get('duration_minutes') as string

  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: (formData.get('description') as string)?.trim() || null,
    type,
    topic_id: (formData.get('topic_id') as string) || null,
    price_paise: pricePaise,
    min_age: (formData.get('min_age') as string) || null,
    max_age: (formData.get('max_age') as string) || null,
    scheduled_at: scheduledAt,
    duration_minutes: duration ? parseInt(duration, 10) : null,
    location: (formData.get('location') as string)?.trim() || null,
    mode,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    contributions,
  }
}

async function requireVendor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'vendor' ? user.id : null
}

function validate(parsed: ReturnType<typeof parseVendorForm>): OfferingErrors {
  const errors = validateOffering({
    title: parsed.title,
    type: parsed.type,
    price_rupees: String(parsed.price_paise / 100),
    min_age: parsed.min_age ?? '',
    max_age: parsed.max_age ?? '',
  })
  return errors
}

export async function vendorCreateOfferingAction(
  _prev: OfferingFormState,
  formData: FormData
): Promise<OfferingFormState> {
  const supabase = await createClient()
  const vendorId = await requireVendor(supabase)
  if (!vendorId) return { error: 'Vendor account required.' }

  const paramIds = await getActiveParamIds(supabase)
  const parsed = parseVendorForm(formData, paramIds)

  const errors = validate(parsed)
  if (Object.keys(errors).length) return { errors }
  if (parsed.contributions.length === 0) {
    return { error: 'Tag at least one skill this activity develops — it’s required for vendor listings.' }
  }

  // source/vendor_id/review_status are forced; RLS also blocks writing an approved state.
  const { data: offering, error } = await supabase
    .from('offerings')
    .insert({
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      status: 'live',
      source: 'vendor',
      vendor_id: vendorId,
      review_status: 'pending',
      topic_id: parsed.topic_id,
      price_paise: parsed.price_paise,
      min_age: parsed.min_age ? parseInt(parsed.min_age, 10) : null,
      max_age: parsed.max_age ? parseInt(parsed.max_age, 10) : null,
      scheduled_at: parsed.scheduled_at,
      duration_minutes: parsed.duration_minutes,
      location: parsed.location,
      mode: parsed.mode,
      image_url: parsed.image_url,
    })
    .select('id')
    .single()

  if (error || !offering) return { error: 'Could not submit offering.' }

  if (parsed.contributions.length) {
    await supabase
      .from('offering_parameter_contributions')
      .insert(parsed.contributions.map((c) => ({ ...c, offering_id: offering.id })))
  }

  revalidatePath('/vendor/offerings')
  redirect('/vendor/offerings')
}

export async function vendorUpdateOfferingAction(
  _prev: OfferingFormState,
  formData: FormData
): Promise<OfferingFormState> {
  const offeringId = formData.get('offering_id') as string
  if (!offeringId) return { error: 'Missing offering.' }

  const supabase = await createClient()
  const vendorId = await requireVendor(supabase)
  if (!vendorId) return { error: 'Vendor account required.' }

  const paramIds = await getActiveParamIds(supabase)
  const parsed = parseVendorForm(formData, paramIds)

  const errors = validate(parsed)
  if (Object.keys(errors).length) return { errors }
  if (parsed.contributions.length === 0) {
    return { error: 'Tag at least one skill this activity develops — it’s required for vendor listings.' }
  }

  // Editing sends the offering back into review (RLS forbids review_status='approved').
  const { error } = await supabase
    .from('offerings')
    .update({
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      review_status: 'pending',
      topic_id: parsed.topic_id,
      price_paise: parsed.price_paise,
      min_age: parsed.min_age ? parseInt(parsed.min_age, 10) : null,
      max_age: parsed.max_age ? parseInt(parsed.max_age, 10) : null,
      scheduled_at: parsed.scheduled_at,
      duration_minutes: parsed.duration_minutes,
      location: parsed.location,
      mode: parsed.mode,
      image_url: parsed.image_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId)
    .eq('vendor_id', vendorId)

  if (error) return { error: 'Could not update offering.' }

  await supabase.from('offering_parameter_contributions').delete().eq('offering_id', offeringId)
  if (parsed.contributions.length) {
    await supabase
      .from('offering_parameter_contributions')
      .insert(parsed.contributions.map((c) => ({ ...c, offering_id: offeringId })))
  }

  revalidatePath('/vendor/offerings')
  redirect('/vendor/offerings')
}
