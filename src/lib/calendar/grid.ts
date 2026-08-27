// Calendar date helpers.
//
// Everything user-facing is in IST (+05:30, no DST), matching how offerings are
// scheduled elsewhere in the app. Grid cells are built from plain Y/M/D integers
// via Date.UTC so the layout can never drift with the server's local timezone.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

export interface DayCell {
  /** 'YYYY-MM-DD' in IST — the key events are grouped by. */
  key: string
  /** Day of month, 1–31. */
  day: number
  /** False for the leading/trailing days borrowed from adjacent months. */
  inMonth: boolean
  isToday: boolean
}

/** The IST calendar date of an instant, as 'YYYY-MM-DD'. */
export function istDateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`
}

/** Clock time of an instant in IST, e.g. '10:00 AM'. */
export function istTimeLabel(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const h24 = ist.getUTCHours()
  const m = ist.getUTCMinutes()
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${pad(m)} ${suffix}`
}

/**
 * UTC instants bounding a month in IST — [start, end) — for querying
 * `scheduled_at`. `month` is 1-based.
 */
export function monthBoundsUtc(year: number, month: number): { startIso: string; endIso: string } {
  const startUtcMidnight = Date.UTC(year, month - 1, 1)
  const endUtcMidnight = Date.UTC(year, month, 1)
  return {
    startIso: new Date(startUtcMidnight - IST_OFFSET_MS).toISOString(),
    endIso: new Date(endUtcMidnight - IST_OFFSET_MS).toISOString(),
  }
}

/**
 * Weeks (Sunday-first) covering the whole month, including the adjacent-month
 * days that pad the first and last rows. `month` is 1-based.
 */
export function monthGrid(year: number, month: number, todayKey = istDateKey(new Date())): DayCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  // Back up to the Sunday on or before the 1st.
  const gridStart = new Date(firstOfMonth.getTime() - firstOfMonth.getUTCDay() * 86400000)

  const lastOfMonth = new Date(Date.UTC(year, month, 0))
  // Forward to the Saturday on or after the last day.
  const gridEnd = new Date(lastOfMonth.getTime() + (6 - lastOfMonth.getUTCDay()) * 86400000)

  const cells: DayCell[] = []
  for (let t = gridStart.getTime(); t <= gridEnd.getTime(); t += 86400000) {
    const d = new Date(t)
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    cells.push({
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1 && d.getUTCFullYear() === year,
      isToday: key === todayKey,
    })
  }
  return cells
}

/** Previous / next month, wrapping the year. `month` is 1-based. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zero = year * 12 + (month - 1) + delta
  return { year: Math.floor(zero / 12), month: (((zero % 12) + 12) % 12) + 1 }
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/** Human label for a 'YYYY-MM-DD' key, e.g. '14 Aug 2026'. */
export function dayKeyLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`
}
