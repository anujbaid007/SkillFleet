import { describe, expect, it } from 'vitest'
import { istDay, istDaysBetween, formatIstDay } from '../dates'

describe('istDay', () => {
  it('returns the Indian calendar day, not the UTC one', () => {
    // 23:30 UTC on 31 Aug is 05:00 IST on 1 Sep.
    expect(istDay('2026-08-31T23:30:00Z')).toBe('2026-09-01')
  })

  it('keeps a mid-day UTC timestamp on the same day', () => {
    expect(istDay('2026-09-01T09:00:00Z')).toBe('2026-09-01')
  })

  it('accepts a Date as well as a string', () => {
    expect(istDay(new Date('2026-08-31T23:30:00Z'))).toBe('2026-09-01')
  })

  it('returns an empty string for junk rather than throwing', () => {
    expect(istDay('not a date')).toBe('')
    expect(istDay('')).toBe('')
  })
})

describe('istDaysBetween', () => {
  it('counts whole calendar days', () => {
    expect(istDaysBetween(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-08T00:00:00Z'))).toBe(
      7
    )
  })

  it('is zero within the same Indian day', () => {
    expect(istDaysBetween(new Date('2026-09-01T05:00:00Z'), new Date('2026-09-01T18:00:00Z'))).toBe(
      0
    )
  })

  it('crosses the Indian midnight, not the UTC one', () => {
    // 10:00 UTC on 1 Sep is 15:30 IST on 1 Sep; 23:00 UTC is 04:30 IST on 2 Sep.
    expect(istDaysBetween(new Date('2026-09-01T10:00:00Z'), new Date('2026-09-01T23:00:00Z'))).toBe(
      1
    )
  })

  it('is negative when the second date is earlier', () => {
    expect(istDaysBetween(new Date('2026-09-08T00:00:00Z'), new Date('2026-09-01T00:00:00Z'))).toBe(
      -7
    )
  })
})

describe('formatIstDay', () => {
  it('reads as a date a person would say out loud', () => {
    // 'Sept', not 'Sep': this Node build's ICU data uses the four-letter
    // abbreviation for September and the three-letter one for every other
    // month. Asserted as-is rather than hand-rolling a month table to force
    // consistency — the platform's own abbreviations are the right ones.
    expect(formatIstDay('2026-09-01')).toBe('1 Sept 2026')
    expect(formatIstDay('2026-10-15')).toBe('15 Oct 2026')
  })

  it('passes anything that is not a day string straight through', () => {
    expect(formatIstDay('')).toBe('')
    expect(formatIstDay('later')).toBe('later')
  })
})
