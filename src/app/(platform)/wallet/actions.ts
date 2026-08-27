'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CancelState = { error?: string; ok?: string } | undefined

const ERR: Record<string, string> = {
  not_found: 'Booking not found.',
  not_owner: 'Booking not found.',
  already_cancelled: 'This booking is already cancelled.',
  already_completed: 'This activity is already completed and cannot be cancelled.',
  too_late:
    'Cancellations must be at least 15 days before the activity date, so this one can no longer be cancelled.',
}

/** Cancel a booking; any amount paid is refunded to the family wallet. */
export async function cancelBookingAction(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const bookingId = formData.get('booking_id') as string
  if (!bookingId) return { error: 'Missing booking.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cancel_booking_refund', { p_booking_id: bookingId }).single()

  if (error) return { error: 'Something went wrong. Please try again.' }
  if (data?.status !== 'ok') return { error: ERR[data?.status ?? ''] ?? 'Could not cancel this booking.' }

  revalidatePath('/bookings')
  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath('/wallet')

  const refunded = data.refunded_paise ?? 0
  return {
    ok:
      refunded > 0
        ? `Booking cancelled. ₹${(refunded / 100).toLocaleString('en-IN')} added to your wallet.`
        : 'Booking cancelled.',
  }
}
