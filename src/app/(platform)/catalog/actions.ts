'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mapBookingResult } from '@/lib/utils/booking'
import { mapRedeemResult } from '@/lib/utils/package'

export type BookingFormState = { error?: string } | undefined

export async function bookOfferingAction(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const offeringId = formData.get('offering_id') as string
  const studentId = formData.get('student_id') as string

  if (!offeringId || !studentId) return { error: 'Missing offering or student.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('create_booking', { p_student_id: studentId, p_offering_id: offeringId })
    .single()

  if (error) return { error: 'Database error. Please try again.' }

  const mapped = mapBookingResult(data?.status ?? '')
  if (mapped.error) return { error: mapped.error }

  // Booking created (pending/pending) — send the parent to checkout.
  redirect(`/checkout/${data!.booking_id}`)
}

// Redeem one package slot to book the offering — no payment step.
export async function redeemPackageSlotAction(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const packageId = formData.get('package_id') as string
  const offeringId = formData.get('offering_id') as string

  if (!packageId || !offeringId) return { error: 'Missing package or offering.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('book_with_package', { p_package_id: packageId, p_offering_id: offeringId })
    .single()

  if (error) return { error: 'Database error. Please try again.' }

  const mapped = mapRedeemResult(data?.status ?? '')
  if (mapped.error) return { error: mapped.error }

  redirect('/bookings?redeemed=1')
}
