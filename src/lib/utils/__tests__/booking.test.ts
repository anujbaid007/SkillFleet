import { describe, it, expect } from 'vitest'
import { mapBookingResult, mapPaymentResult } from '@/lib/utils/booking'

describe('mapBookingResult', () => {
  it('ok returns success and no error', () => {
    const r = mapBookingResult('ok')
    expect(r.success).toBeTruthy()
    expect(r.error).toBeUndefined()
  })

  it.each(['not_parent', 'not_linked', 'offering_not_found', 'offering_not_live', 'age_ineligible', 'already_booked'])(
    '%s returns an error',
    (code) => {
      expect(mapBookingResult(code).error).toBeTruthy()
    }
  )

  it('unknown status returns an error', () => {
    expect(mapBookingResult('mystery').error).toBeTruthy()
  })
})

describe('mapPaymentResult', () => {
  it('ok returns success and no error', () => {
    const r = mapPaymentResult('ok')
    expect(r.success).toBeTruthy()
    expect(r.error).toBeUndefined()
  })

  it.each(['failed', 'not_parent', 'not_found', 'not_owner', 'cancelled', 'already_paid'])(
    '%s returns an error',
    (code) => {
      expect(mapPaymentResult(code).error).toBeTruthy()
    }
  )

  it('unknown status returns an error', () => {
    expect(mapPaymentResult('mystery').error).toBeTruthy()
  })
})
