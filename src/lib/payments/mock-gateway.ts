// =============================================
// MOCK payment gateway — TEST MODE only.
//
// Stands in for a real provider (Razorpay/Stripe/etc.) until one is
// chosen, so the full browse → book → checkout → pay → confirm flow can
// be exercised end-to-end today. It generates realistic-looking order /
// payment ids and nothing more — no money moves.
//
// When a real gateway is wired in, replace this module and the checkout
// UI. The settle_booking_payment RPC (the seam a real webhook/callback
// hits to flip a booking to confirmed/paid) does NOT change — that's the
// whole point of routing the mock through the same transition.
//
// MOCK_GATEWAY should become an env-driven flag at that point so mock
// mode can never be enabled in production.
// =============================================

export const MOCK_GATEWAY = true

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/** A gateway "order" id — created when checkout is initiated. */
export function createMockOrderId(): string {
  return randomId('mock_order')
}

/** A gateway "payment" id — returned when a payment succeeds. */
export function createMockPaymentId(): string {
  return randomId('mock_pay')
}
