import { describe, it, expect } from 'vitest'
import { mapPackageResult, mapRedeemResult } from '@/lib/utils/package'

describe('mapPackageResult', () => {
  it('ok returns success', () => {
    const r = mapPackageResult('ok')
    expect(r.success).toBeTruthy()
    expect(r.error).toBeUndefined()
  })

  it.each(['failed', 'not_parent', 'not_linked', 'tier_not_found', 'already_has_package', 'not_found', 'not_owner', 'already_paid', 'package_not_active', 'not_higher', 'no_upgrade'])(
    '%s returns an error',
    (code) => {
      expect(mapPackageResult(code).error).toBeTruthy()
    }
  )

  it('unknown status returns an error', () => {
    expect(mapPackageResult('mystery').error).toBeTruthy()
  })
})

describe('mapRedeemResult', () => {
  it('ok returns success', () => {
    const r = mapRedeemResult('ok')
    expect(r.success).toBeTruthy()
    expect(r.error).toBeUndefined()
  })

  it.each(['not_parent', 'package_not_found', 'not_owner', 'package_not_active', 'package_expired', 'no_slots', 'offering_not_found', 'offering_not_live', 'age_ineligible', 'already_booked'])(
    '%s returns an error',
    (code) => {
      expect(mapRedeemResult(code).error).toBeTruthy()
    }
  )

  it('unknown status returns an error', () => {
    expect(mapRedeemResult('mystery').error).toBeTruthy()
  })
})
