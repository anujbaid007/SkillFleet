'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CartActionState = { error?: string; ok?: string } | undefined

const ADD_ERR: Record<string, string> = {
  no_family: 'Your account is not set up for booking yet.',
  not_linked: 'That child is not linked to your account.',
  offering_not_found: 'Activity not found.',
  offering_not_live: 'This activity is not open for booking.',
  age_ineligible: 'This activity is outside your child’s age range.',
  already_booked: 'Your child has already booked this activity.',
  already_in_cart: 'This is already in your cart.',
  cart_full: 'Your cart is full — you can book up to 50 activities at a time.',
}

/** Add one activity for one child to the cart. */
export async function addToCartAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const studentId = formData.get('student_id') as string
  const offeringId = formData.get('offering_id') as string
  if (!studentId || !offeringId) return { error: 'Missing activity or child.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('add_to_cart', {
    p_student_id: studentId,
    p_offering_id: offeringId,
  })

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data !== 'ok') return { error: ADD_ERR[data as string] ?? 'Could not add to cart.' }

  revalidatePath('/cart')
  revalidatePath(`/catalog/${offeringId}`)
  return { ok: 'Added to cart' }
}

/** Add several activities (e.g. a whole AI year plan) for one child. */
export async function addManyToCartAction(
  _prev: CartActionState,
  formData: FormData
): Promise<CartActionState> {
  const studentId = formData.get('student_id') as string
  const offeringIds = formData.getAll('offering_ids').filter(Boolean) as string[]
  if (!studentId || offeringIds.length === 0) return { error: 'Nothing selected.' }

  const supabase = await createClient()
  let added = 0
  const problems: string[] = []

  for (const offeringId of offeringIds) {
    const { data, error } = await supabase.rpc('add_to_cart', {
      p_student_id: studentId,
      p_offering_id: offeringId,
    })
    if (error) continue
    if (data === 'ok') added += 1
    else if (data === 'cart_full') {
      problems.push('cart limit of 50 reached')
      break
    } else if (data !== 'already_in_cart') {
      problems.push(ADD_ERR[data as string] ?? 'some items could not be added')
    }
  }

  if (added === 0) {
    return { error: problems[0] ?? 'Those activities are already in your cart.' }
  }

  revalidatePath('/cart')
  redirect('/cart')
}

export async function removeFromCartAction(formData: FormData) {
  const id = formData.get('cart_item_id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase.rpc('remove_from_cart', { p_cart_item_id: id })
  revalidatePath('/cart')
}

export async function clearCartAction() {
  const supabase = await createClient()
  await supabase.rpc('clear_cart')
  revalidatePath('/cart')
}

const CHECKOUT_ERR: Record<string, string> = {
  no_family: 'Your account is not set up for checkout yet.',
  cart_empty: 'Your cart is empty.',
  cart_full: 'You can book up to 50 activities at a time.',
}

/** Turn the cart into an order, then hand off to the (mock) payment page. */
export async function checkoutCartAction(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const useWallet = formData.get('use_wallet') === '1'

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('checkout_cart', { p_use_wallet: useWallet }).single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok' || !data.order_id) {
    return { error: CHECKOUT_ERR[data?.status ?? ''] ?? 'Could not start checkout.' }
  }

  redirect(`/checkout/order/${data.order_id}`)
}
