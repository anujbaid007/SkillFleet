'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateOffering, type OfferingErrors } from '@/lib/validation/offering'
import { modeOptionsForType } from '@/lib/offering-meta'

export type OfferingFormState = { errors?: OfferingErrors; error?: string } | undefined

export async function archiveOfferingAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase.from('offerings').update({ status: 'retired' }).eq('id', id)
  revalidatePath('/admin/offerings')
}

/** Approve or reject a vendor-submitted offering. */
export async function reviewOfferingAction(formData: FormData) {
  const id = formData.get('id') as string
  const decision = formData.get('decision') as string
  const notes = (formData.get('notes') as string)?.trim() || null
  if (!id || (decision !== 'approve' && decision !== 'reject')) return

  const supabase = await createClient()
  await supabase.rpc('admin_review_offering', { p_offering_id: id, p_decision: decision, p_notes: notes })
  revalidatePath('/admin/offerings')
  revalidatePath('/catalog')
}

/** Convert a planned offering to live so waitlisted users can book it. */
export async function goLiveOfferingAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase.from('offerings').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/offerings')
  revalidatePath('/catalog')
}

function parseFormData(formData: FormData, parameterIds: string[]) {
  const priceRupees = formData.get('price_rupees') as string
  const scheduledRaw = formData.get('scheduled_at') as string // 'YYYY-MM-DDTHH:MM'
  const pricePaise = priceRupees ? Math.round(parseFloat(priceRupees) * 100) : 0

  // Treat datetime-local input as IST; append +05:30 offset
  const scheduledAt = scheduledRaw ? `${scheduledRaw}:00+05:30` : null

  const contributions: { parameter_id: string; points: number }[] = []
  for (const pid of parameterIds) {
    const pts = parseInt((formData.get(`pts_${pid}`) as string) ?? '0', 10)
    if (pts > 0) contributions.push({ parameter_id: pid, points: pts })
  }

  const minAge = (formData.get('min_age') as string) || null
  const maxAge = (formData.get('max_age') as string) || null
  const duration = formData.get('duration_minutes') as string

  // Mode only applies to certain types; only keep it if valid for the chosen type.
  const type = formData.get('type') as string
  const rawMode = (formData.get('mode') as string) || null
  const validModes = modeOptionsForType(type).map((m) => m.value)
  const mode = rawMode && validModes.includes(rawMode) ? rawMode : null

  // Meeting link only applies to an online workshop; ignored otherwise.
  const rawMeeting = (formData.get('meeting_url') as string)?.trim() || null
  const meeting_url = type === 'workshop' && mode === 'online' ? rawMeeting : null

  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: (formData.get('description') as string)?.trim() || null,
    type,
    status: formData.get('status') as string,
    topic_id: (formData.get('topic_id') as string) || null,
    price_paise: pricePaise,
    min_age: minAge,
    max_age: maxAge,
    scheduled_at: scheduledAt,
    duration_minutes: duration ? parseInt(duration, 10) : null,
    location: (formData.get('location') as string)?.trim() || null,
    mode,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    meeting_url,
    contributions,
  }
}

/** Upserts the online-workshop meeting link, or clears it when not applicable. */
async function syncMeetingLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  offeringId: string,
  meetingUrl: string | null
) {
  if (meetingUrl) {
    await supabase
      .from('offering_meeting_links')
      .upsert({ offering_id: offeringId, meeting_url: meetingUrl, updated_at: new Date().toISOString() })
  } else {
    await supabase.from('offering_meeting_links').delete().eq('offering_id', offeringId)
  }
}

async function getActiveParamIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from('growth_parameters').select('id').eq('is_active', true)
  return (data ?? []).map((p) => p.id)
}

export async function createOfferingAction(
  _prev: OfferingFormState,
  formData: FormData
): Promise<OfferingFormState> {
  const supabase = await createClient()
  const paramIds = await getActiveParamIds(supabase)
  const parsed = parseFormData(formData, paramIds)

  const errors = validateOffering({
    title: parsed.title,
    type: parsed.type,
    price_rupees: String(parsed.price_paise / 100),
    min_age: parsed.min_age ?? '',
    max_age: parsed.max_age ?? '',
  })
  if (Object.keys(errors).length) return { errors }

  const { data: offering, error } = await supabase
    .from('offerings')
    .insert({
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      status: parsed.status || 'live',
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

  if (error || !offering) return { error: 'Could not create offering.' }

  if (parsed.contributions.length) {
    await supabase
      .from('offering_parameter_contributions')
      .insert(parsed.contributions.map((c) => ({ ...c, offering_id: offering.id })))
  }

  await syncMeetingLink(supabase, offering.id, parsed.meeting_url)

  revalidatePath('/admin/offerings')
  redirect('/admin/offerings')
}

export async function updateOfferingAction(
  _prev: OfferingFormState,
  formData: FormData
): Promise<OfferingFormState> {
  const offeringId = formData.get('offering_id') as string
  if (!offeringId) return { error: 'Missing offering ID.' }

  const supabase = await createClient()
  const paramIds = await getActiveParamIds(supabase)
  const parsed = parseFormData(formData, paramIds)

  const errors = validateOffering({
    title: parsed.title,
    type: parsed.type,
    price_rupees: String(parsed.price_paise / 100),
    min_age: parsed.min_age ?? '',
    max_age: parsed.max_age ?? '',
  })
  if (Object.keys(errors).length) return { errors }

  const { error } = await supabase
    .from('offerings')
    .update({
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      status: parsed.status,
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

  if (error) return { error: 'Could not update offering.' }

  // Replace contributions: delete all, re-insert active ones
  await supabase.from('offering_parameter_contributions').delete().eq('offering_id', offeringId)
  if (parsed.contributions.length) {
    await supabase
      .from('offering_parameter_contributions')
      .insert(parsed.contributions.map((c) => ({ ...c, offering_id: offeringId })))
  }

  await syncMeetingLink(supabase, offeringId, parsed.meeting_url)

  revalidatePath('/admin/offerings')
  redirect('/admin/offerings')
}
