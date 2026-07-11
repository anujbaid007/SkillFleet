'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { runRecommender, runPlanner } from '@/lib/recommender/generate'
import type { Json } from '@/lib/types/database'

export type RecActionState = { error?: string; ok?: boolean } | undefined

const REDEEM_ERR: Record<string, string> = {
  not_parent: 'Only parent accounts can redeem package slots.',
  package_not_found: 'Package not found.',
  not_owner: 'Package not found.',
  package_not_active: 'This package is not active.',
  package_expired: 'This package has expired.',
  no_slots: 'No slots left in this package.',
}

/**
 * Regenerates recommendations for a student. A student may generate for
 * themselves; a parent only for a linked child. Reads and the write both go
 * through the caller's RLS client (an INSERT policy allows self/linked writes).
 */
export async function generateRecommendationsAction(
  _prev: RecActionState,
  formData: FormData
): Promise<RecActionState> {
  const studentId = formData.get('student_id') as string
  if (!studentId) return { error: 'No student selected.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, date_of_birth')
    .eq('id', user.id)
    .single()

  let firstName = 'your child'
  let dob: string | null = null

  if (profile?.role === 'student') {
    if (studentId !== user.id) return { error: 'You can only generate your own recommendations.' }
    firstName = profile.full_name?.split(' ')[0] ?? 'you'
    dob = profile.date_of_birth
  } else if (profile?.role === 'parent') {
    const { data: kids } = await supabase.rpc('get_my_children')
    const child = (kids ?? []).find((k) => k.student_id === studentId)
    if (!child) return { error: 'That child is not linked to your account.' }
    firstName = child.full_name?.split(' ')[0] ?? 'your child'
    dob = child.date_of_birth
  } else {
    return { error: 'Recommendations are for students and parents.' }
  }

  const narrative = await runRecommender(supabase, studentId, firstName, dob)

  const { error } = await supabase.from('recommendation_runs').insert({
    student_id: studentId,
    model: narrative.model,
    summary: narrative.summary,
    items: narrative.items as unknown as Json,
  })
  if (error) return { error: 'Could not save recommendations. Please try again.' }

  revalidatePath('/recommendations')
  return { ok: true }
}

/**
 * Builds a balanced multi-activity year plan for a linked child. Planning is a
 * parent action (it's about committing a package's worth of the year), so this
 * is parent-only; students view the result read-only.
 */
export async function generatePlanAction(_prev: RecActionState, formData: FormData): Promise<RecActionState> {
  const studentId = formData.get('student_id') as string
  const size = Math.max(1, Math.min(24, parseInt(formData.get('size') as string, 10) || 6))
  if (!studentId) return { error: 'No child selected.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'parent') return { error: 'Only parents can plan a year.' }

  const { data: kids } = await supabase.rpc('get_my_children')
  const child = (kids ?? []).find((k) => k.student_id === studentId)
  if (!child) return { error: 'That child is not linked to your account.' }
  const firstName = child.full_name?.split(' ')[0] ?? 'your child'

  const plan = await runPlanner(supabase, studentId, firstName, child.date_of_birth, size)

  const { error } = await supabase.from('curriculum_plans').insert({
    student_id: studentId,
    target_size: size,
    model: plan.model,
    summary: plan.summary,
    price_total_paise: plan.priceTotalPaise,
    items: plan.items as unknown as Json,
  })
  if (error) return { error: 'Could not save the plan. Please try again.' }

  revalidatePath('/recommendations/plan')
  return { ok: true }
}

/** Redeems the whole plan against a package in one go (reuses the bulk-book RPC). */
export async function bookPlanWithPackageAction(_prev: RecActionState, formData: FormData): Promise<RecActionState> {
  const packageId = formData.get('package_id') as string
  const offeringIds = formData.getAll('offering_ids').filter(Boolean) as string[]
  if (!packageId) return { error: 'No package selected.' }
  if (offeringIds.length === 0) return { error: 'Nothing to book.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('book_multiple_with_package', { p_package_id: packageId, p_offering_ids: offeringIds })
    .single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok') return { error: REDEEM_ERR[data?.status ?? ''] ?? 'Could not book. Please try again.' }

  redirect(`/bookings?redeemed=${data.booked}`)
}

/** Student adds an offering to their shortlist (parents book from it later). */
export async function shortlistAction(_prev: RecActionState, formData: FormData): Promise<RecActionState> {
  const offeringId = formData.get('offering_id') as string
  const on = formData.get('on') === '1'
  if (!offeringId) return { error: 'Missing offering.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  if (on) {
    const { error } = await supabase.from('student_shortlist').upsert({ student_id: user.id, offering_id: offeringId })
    if (error) return { error: 'Could not update shortlist.' }
  } else {
    const { error } = await supabase
      .from('student_shortlist')
      .delete()
      .eq('student_id', user.id)
      .eq('offering_id', offeringId)
    if (error) return { error: 'Could not update shortlist.' }
  }

  revalidatePath('/recommendations')
  return { ok: true }
}
