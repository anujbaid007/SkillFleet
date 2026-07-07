import { describe, it, expect } from 'vitest'
import { parameterStatus, pointsToTarget } from '@/lib/scoring/progress'
import type { ParameterTarget } from '@/lib/scoring/types'

// Explorer band default target from seed data (target_min=25, target_max=50)
const EXPLORER_TARGET: ParameterTarget = {
  parameter_id: 'p1',
  age_band_id:  'b2',
  target_min: 25,
  target_max: 50,
}

describe('parameterStatus', () => {
  it('below_target when score < target_min', () =>
    expect(parameterStatus(20, EXPLORER_TARGET)).toBe('below_target'))

  it('below_target at target_min - 1', () =>
    expect(parameterStatus(24, EXPLORER_TARGET)).toBe('below_target'))

  it('on_target at exactly target_min', () =>
    expect(parameterStatus(25, EXPLORER_TARGET)).toBe('on_target'))

  it('on_target in the middle', () =>
    expect(parameterStatus(37, EXPLORER_TARGET)).toBe('on_target'))

  it('on_target at exactly target_max', () =>
    expect(parameterStatus(50, EXPLORER_TARGET)).toBe('on_target'))

  it('above_target at target_max + 1', () =>
    expect(parameterStatus(51, EXPLORER_TARGET)).toBe('above_target'))

  it('above_target well above range', () =>
    expect(parameterStatus(100, EXPLORER_TARGET)).toBe('above_target'))

  // Verify with Achiever band (target_min=55, target_max=80 from seed data)
  const ACHIEVER_TARGET: ParameterTarget = { parameter_id: 'p1', age_band_id: 'b4', target_min: 55, target_max: 80 }

  it('below_target for Achiever with score 54', () =>
    expect(parameterStatus(54, ACHIEVER_TARGET)).toBe('below_target'))

  it('on_target for Achiever with score 55', () =>
    expect(parameterStatus(55, ACHIEVER_TARGET)).toBe('on_target'))

  it('on_target for Achiever with score 80', () =>
    expect(parameterStatus(80, ACHIEVER_TARGET)).toBe('on_target'))

  it('above_target for Achiever with score 81', () =>
    expect(parameterStatus(81, ACHIEVER_TARGET)).toBe('above_target'))
})

describe('pointsToTarget', () => {
  it('returns gap when below target_min', () =>
    // Score 20, target_min 25 → needs 5 more display points
    expect(pointsToTarget(20, EXPLORER_TARGET)).toBe(5))

  it('returns 0 when at target_min', () =>
    expect(pointsToTarget(25, EXPLORER_TARGET)).toBe(0))

  it('returns 0 when on target', () =>
    expect(pointsToTarget(40, EXPLORER_TARGET)).toBe(0))

  it('returns 0 when above target_max', () =>
    expect(pointsToTarget(55, EXPLORER_TARGET)).toBe(0))

  it('returns 0 when score is exactly target_max', () =>
    expect(pointsToTarget(50, EXPLORER_TARGET)).toBe(0))

  it('returns correct gap near zero', () => {
    const low: ParameterTarget = { parameter_id: 'p1', age_band_id: 'b1', target_min: 10, target_max: 35 }
    expect(pointsToTarget(3, low)).toBe(7)
  })
})
