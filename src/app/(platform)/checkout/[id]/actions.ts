'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mapPaymentResult } from '@/lib/utils/booking'
import { createMockOrderId, createMockPaymentId } from '@/lib/payments/mock-gateway'

// MOCK "pay now" — simulates a successful gateway payment, then routes the
// booking through settle_booking_payment (the same RPC a real webhook hits).
export async function payAction(formData: FormData) {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) redirect('/bookings')

  const supabase = await createClient()
  const orderId = createMockOrderId()
  const paymentId = createMockPaymentId()

  const { data: status, error } = await supabase.rpc('settle_booking_payment', {
    p_booking_id: bookingId,
    p_success: true,
    p_order_id: orderId,
    p_payment_id: paymentId,
  })

  if (error) redirect(`/checkout/${bookingId}?error=${encodeURIComponent('Payment error. Please try again.')}`)

  const mapped = mapPaymentResult(status ?? '')
  if (mapped.error) redirect(`/checkout/${bookingId}?error=${encodeURIComponent(mapped.error)}`)

  revalidatePath('/bookings')
  redirect('/bookings?paid=1')
}

// MOCK "simulate failure" — exercises the declined-payment path.
export async function failAction(formData: FormData) {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) redirect('/bookings')

  const supabase = await createClient()
  const orderId = createMockOrderId()

  await supabase.rpc('settle_booking_payment', {
    p_booking_id: bookingId,
    p_success: false,
    p_order_id: orderId,
    p_payment_id: '',
  })

  revalidatePath('/bookings')
  redirect('/bookings?failed=1')
}
