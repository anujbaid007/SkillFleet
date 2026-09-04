/*
  Postgres counts do not arrive as JavaScript numbers by default.

  Every count these admin functions return is a `bigint` -- count(*) over ()
  totals, member_count, and every aggregate in the breakdown -- and a ratio
  would be `numeric`. Depending on the driver in front of them, a bigint can
  arrive as a JSON number (PostgREST), as a string, or, past 2^53, as a BigInt;
  numeric arrives as a string. The pages downstream want numbers, and want
  arithmetic on them to be arithmetic rather than string concatenation.

  So nothing here trusts the wire type. toNumber() is total: anything it cannot
  read becomes the fallback rather than NaN leaking into a page.
*/

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return fallback
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

/** Text columns that the SQL guarantees non-null. Anything odd becomes ''. */
export function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return fallback
}

/** Text columns the SQL marks nullable. Keeps null null; does not invent ''. */
export function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return null
}

/** Reads one property off a row of unknown shape without an `any`. */
export function field(row: unknown, key: string): unknown {
  return row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined
}
