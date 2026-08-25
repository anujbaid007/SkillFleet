/**
 * IST calendar days.
 *
 * Every date either analytics page shows is an Indian calendar day. Slicing an
 * ISO string would put an 05:00 IST submission on the previous day, so a
 * per-day timeline built that way is wrong for the first five and a half hours
 * of every single day.
 *
 * Kept in its own module so both analytics.ts and validate.ts can use it
 * without importing each other.
 */

// en-CA formats as YYYY-MM-DD, which sorts lexicographically. Constructed once:
// Intl.DateTimeFormat is expensive and this is called per row.
const IST_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Already-collapsed day strings are parsed back as UTC midnight, so this
// formatter reads them in UTC. Re-applying the IST offset here would shift
// them a day.
const IST_LABEL = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** The Indian calendar day a moment falls on, as YYYY-MM-DD. '' if unparseable. */
export function istDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return IST_DAY.format(date)
}

/**
 * Whole Indian calendar days from `from` to `to`. Negative when `to` is
 * earlier. Both ends are collapsed to their day first, so 23:55 to 00:05 the
 * next morning is one day, not zero.
 */
export function istDaysBetween(from: Date, to: Date): number {
  const a = istDay(from)
  const b = istDay(to)
  if (!a || !b) return 0
  // Parsed back as UTC midnights: the arithmetic is then plain day counting
  // with no offset left in it, and independent of the runtime's own zone.
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** '2026-09-01' -> '1 Sep 2026'. Anything else is returned unchanged. */
export function formatIstDay(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
  const parsed = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return day
  return IST_LABEL.format(parsed)
}
