export type BookingResult = { error?: string; success?: string }

// Maps create_booking RPC status codes to user-facing messages.
export function mapBookingResult(status: string): BookingResult {
  switch (status) {
    case 'ok':
      return { success: 'Booking created. Complete payment to confirm the seat.' }
    case 'not_parent':
      return { error: 'Only parent accounts can book offerings for a student.' }
    case 'not_linked':
      return { error: 'This student is not linked to your account.' }
    case 'offering_not_found':
      return { error: 'Offering not found.' }
    case 'offering_not_live':
      return { error: 'This offering is not currently open for booking.' }
    case 'age_ineligible':
      return { error: "This offering isn't available for the selected child's age." }
    case 'already_booked':
      return { error: 'This offering is already booked for this child.' }
    default:
      return { error: `Unexpected status: ${status}` }
  }
}

// Maps settle_booking_payment RPC status codes to user-facing messages.
export function mapPaymentResult(status: string): BookingResult {
  switch (status) {
    case 'ok':
      return { success: 'Payment successful — booking confirmed!' }
    case 'failed':
      return { error: 'Payment failed. You can retry from My Bookings.' }
    case 'not_parent':
      return { error: 'Only parent accounts can pay for a booking.' }
    case 'not_found':
      return { error: 'Booking not found.' }
    case 'not_owner':
      return { error: 'This booking belongs to another account.' }
    case 'cancelled':
      return { error: 'This booking has been cancelled.' }
    case 'already_paid':
      return { error: 'This booking is already paid.' }
    default:
      return { error: `Unexpected status: ${status}` }
  }
}
