'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ERR: Record<string, string> = {
  order_not_found: 'Order not found.',
  not_owner: 'Order not found.',
  insufficient_wallet: 'Your wallet balance changed. Please review and try again.',
}

async function settle(orderId: string, success: boolean) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('settle_order_payment', {
    p_order_id: orderId,
    p_success: success,
  })

  if (error) return `/checkout/order/${orderId}?error=${encodeURIComponent('Something went wrong.')}`
  if (data === 'ok') {
    revalidatePath('/bookings')
    revalidatePath('/wallet')
    return '/bookings?ordered=1'
  }
  if (data === 'failed') return `/checkout/order/${orderId}?error=${encodeURIComponent('Payment was declined.')}`
  return `/checkout/order/${orderId}?error=${encodeURIComponent(ERR[data as string] ?? 'Could not complete payment.')}`
}

export async function payOrderAction(formData: FormData) {
  const orderId = formData.get('order_id') as string
  if (!orderId) return
  redirect(await settle(orderId, true))
}

export async function failOrderAction(formData: FormData) {
  const orderId = formData.get('order_id') as string
  if (!orderId) return
  redirect(await settle(orderId, false))
}
