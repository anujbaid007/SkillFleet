import { describe, it, expect } from 'vitest'
import { aggregateByParameter } from '@/lib/scoring/aggregation'

const P1 = 'aaaaaaaa-0000-0000-0000-000000000001'
const P2 = 'bbbbbbbb-0000-0000-0000-000000000002'
const P3 = 'cccccccc-0000-0000-0000-000000000003'

describe('aggregateByParameter', () => {
  it('returns empty object for empty input', () =>
    expect(aggregateByParameter([])).toEqual({}))

  it('single row accumulates correctly', () =>
    expect(aggregateByParameter([{ parameter_id: P1, points: 100 }]))
      .toEqual({ [P1]: 100 }))

  it('sums multiple rows for the same parameter', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P1, points: 200 },
    ])).toEqual({ [P1]: 300 }))

  it('accumulates two parameters independently', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P2, points: 200 },
      { parameter_id: P1, points: 50 },
    ])).toEqual({ [P1]: 150, [P2]: 200 }))

  it('handles three distinct parameters', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P2, points: 200 },
      { parameter_id: P3, points: 300 },
    ])).toEqual({ [P1]: 100, [P2]: 200, [P3]: 300 }))

  it('supports zero points', () =>
    expect(aggregateByParameter([{ parameter_id: P1, points: 0 }]))
      .toEqual({ [P1]: 0 }))

  it('supports negative points (score reversals)', () =>
    expect(aggregateByParameter([
      { parameter_id: P1, points: 100 },
      { parameter_id: P1, points: -40 },
    ])).toEqual({ [P1]: 60 }))

  it('does not include parameters absent from input', () => {
    const result = aggregateByParameter([{ parameter_id: P1, points: 100 }])
    expect(result[P2]).toBeUndefined()
  })
})
