import { describe, it, expect } from 'vitest'
import {
  istDateKey,
  istTimeLabel,
  monthBoundsUtc,
  monthGrid,
  shiftMonth,
  monthLabel,
  dayKeyLabel,
} from '@/lib/calendar/grid'

describe('istDateKey', () => {
  it('converts a UTC instant to its IST calendar date', () => {
    expect(istDateKey('2026-08-14T04:30:00Z')).toBe('2026-08-14') // 10:00 IST
  })

  it('rolls to the next IST day for late-UTC times', () => {
    // 20:00 UTC = 01:30 IST the following day
    expect(istDateKey('2026-08-14T20:00:00Z')).toBe('2026-08-15')
  })

  it('keeps the earlier IST day just before the boundary', () => {
    // 18:29 UTC = 23:59 IST same day; 18:30 UTC = 00:00 IST next day
    expect(istDateKey('2026-08-14T18:29:00Z')).toBe('2026-08-14')
    expect(istDateKey('2026-08-14T18:30:00Z')).toBe('2026-08-15')
  })
})

describe('istTimeLabel', () => {
  it('formats morning and afternoon times in IST', () => {
    expect(istTimeLabel('2026-08-14T04:30:00Z')).toBe('10:00 AM')
    expect(istTimeLabel('2026-08-14T09:00:00Z')).toBe('2:30 PM')
  })

  it('uses 12 rather than 0 for midnight and noon', () => {
    expect(istTimeLabel('2026-08-14T18:30:00Z')).toBe('12:00 AM')
    expect(istTimeLabel('2026-08-14T06:30:00Z')).toBe('12:00 PM')
  })
})

describe('monthBoundsUtc', () => {
  it('spans IST midnight to IST midnight', () => {
    const { startIso, endIso } = monthBoundsUtc(2026, 8)
    expect(startIso).toBe('2026-07-31T18:30:00.000Z')
    expect(endIso).toBe('2026-08-31T18:30:00.000Z')
  })

  it('wraps a December range into the next year', () => {
    const { endIso } = monthBoundsUtc(2026, 12)
    expect(endIso).toBe('2026-12-31T18:30:00.000Z')
  })
})

describe('monthGrid', () => {
  it('starts on a Sunday and ends on a Saturday', () => {
    const cells = monthGrid(2026, 8, '2026-08-14')
    expect(cells.length % 7).toBe(0)
    // 1 Aug 2026 is a Saturday, so the grid opens on 26 Jul.
    expect(cells[0].key).toBe('2026-07-26')
    expect(cells[cells.length - 1].key).toBe('2026-09-05')
  })

  it('marks in-month vs padded days', () => {
    const cells = monthGrid(2026, 8, '2026-08-14')
    expect(cells[0].inMonth).toBe(false)
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31)
  })

  it('flags today only once', () => {
    const cells = monthGrid(2026, 8, '2026-08-14')
    const todays = cells.filter((c) => c.isToday)
    expect(todays).toHaveLength(1)
    expect(todays[0].day).toBe(14)
  })

  it('handles a leap February', () => {
    const cells = monthGrid(2028, 2, '2028-02-01')
    expect(cells.filter((c) => c.inMonth)).toHaveLength(29)
  })
})

describe('shiftMonth', () => {
  it('moves within a year', () => {
    expect(shiftMonth(2026, 8, 1)).toEqual({ year: 2026, month: 9 })
    expect(shiftMonth(2026, 8, -1)).toEqual({ year: 2026, month: 7 })
  })

  it('wraps across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})

describe('labels', () => {
  it('formats a month and a day key', () => {
    expect(monthLabel(2026, 8)).toBe('August 2026')
    expect(dayKeyLabel('2026-08-14')).toBe('14 Aug 2026')
  })
})
