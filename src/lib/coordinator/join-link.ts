/**
 * Prefilled school signup links.
 *
 * A coordinator shares /join/<school-name>-<code>. That page remembers the
 * school in a cookie, and /onboarding/details reads it back to preselect the
 * whole state -> district -> school cascade. The link only ever prefills a
 * form: it grants no access, joins no roster, and can be edited by the
 * student, so a link forwarded to the wrong person costs nothing.
 */

/** Short-lived on purpose: long enough to sign up, not to linger on a shared device. */
export const JOIN_COOKIE = 'sf_join_school'
export const JOIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/**
 * Words that say what kind of school it is rather than which school it is.
 *
 * Kept deliberately short. "Public", "International", "Convent", "Academy" and
 * "Vidyalaya" all stay, because they are load-bearing — dropping them turns
 * "Delhi Public School" into "delhi", which names nothing.
 */
const FILLER = new Set([
  'shree',
  'shri',
  'sri',
  'smt',
  'the',
  'english',
  'medium',
  'school',
  'schools',
  'sec',
  'secondary',
  'senior',
  'sr',
  'higher',
  'hr',
  'high',
  'co',
  'coed',
  'campus',
  'branch',
  'cbse',
  'icse',
  'and',
  'of',
])

/** How long the readable half of the link may run. */
const MAX_SLUG_LENGTH = 24

/**
 * A short, readable stand-in for a school's name.
 *
 * Truncated on a word boundary so the link never ends mid-word, and never
 * empty: a name made entirely of filler falls back to the raw name, and a
 * name with no usable letters at all falls back to "school".
 */
export function schoolSlug(name: string): string {
  const words = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)

  const significant = words.filter((w) => !FILLER.has(w))
  const usable = significant.length > 0 ? significant : words
  if (usable.length === 0) return 'school'

  const kept: string[] = []
  for (const word of usable) {
    const next = kept.length === 0 ? word : `${kept.join('-')}-${word}`
    if (kept.length > 0 && next.length > MAX_SLUG_LENGTH) break
    kept.push(word)
  }

  return kept.join('-').slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '')
}

/**
 * The id fragment that makes a link unambiguous.
 *
 * There are ~33,000 schools and plenty of shared names — several "St Johns
 * School" alone — so the readable half cannot identify one on its own. Eight
 * hex characters of the id narrow it to one (six gave roughly 32 colliding
 * pairs at this scale, by the birthday bound), and the page still confirms the
 * match against the slug before trusting it.
 */
export function joinCode(schoolId: string): string {
  return schoolId.replace(/-/g, '').slice(0, 8).toLowerCase()
}

export function joinPath(schoolId: string, schoolName: string): string {
  return `/join/${schoolSlug(schoolName)}-${joinCode(schoolId)}`
}

/** Absolute link, for copying and for WhatsApp. */
export function joinUrl(schoolId: string, schoolName: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}${joinPath(schoolId, schoolName)}`
}

export interface ParsedJoinSlug {
  /** Full id, when the link carries one — the original link format. */
  schoolId?: string
  /** Six-hex fragment, when the link is the readable kind. */
  code?: string
  /** The readable half, used to confirm the match. */
  slug?: string
}

const FULL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Six was the original length; links already shared carry it, so both parse.
const TRAILING_CODE = /^(.*)-([0-9a-f]{6,8})$/i

/**
 * Reads either link format.
 *
 * Bare-UUID links are still accepted because coordinators may already have
 * shared one, and a link that has gone out to a school WhatsApp group cannot
 * be recalled.
 */
export function parseJoinSlug(raw: string): ParsedJoinSlug {
  const value = decodeURIComponent((raw ?? '').trim()).toLowerCase()
  if (FULL_UUID.test(value)) return { schoolId: value }

  const match = value.match(TRAILING_CODE)
  if (match) return { slug: match[1], code: match[2] }

  return {}
}

/**
 * The id range covering every uuid starting with `code`.
 *
 * Expressed as a range rather than a prefix match because the column is a
 * uuid, which Postgres will not LIKE against — and a range still uses the
 * primary key index.
 */
export function idRangeForCode(code: string): { low: string; high: string } {
  const c = code.toLowerCase()
  // The first uuid block is eight hex characters; a shorter code covers a
  // wider range, padded out with the lowest and highest digits.
  const pad = Math.max(0, 8 - c.length)
  return {
    low: `${c}${'0'.repeat(pad)}-0000-0000-0000-000000000000`,
    high: `${c}${'f'.repeat(pad)}-ffff-ffff-ffff-ffffffffffff`,
  }
}

/**
 * The message a coordinator sends to a class group.
 *
 * Written to be forwarded as-is: it says who it is from, what it is for, and
 * that entering costs nothing, because a bare link in a school WhatsApp group
 * reads like spam.
 */
export function joinShareMessage(schoolName: string, url: string): string {
  return [
    `You're invited to enter the International Skill Championship 2026 with ${schoolName}.`,
    '',
    'Four championships — AI for Impact, Young Entrepreneurship, Content Creator and Puzzle Master. Open to Classes 5 to 12. The school level is free to enter.',
    '',
    `Sign up here (your school is already filled in): ${url}`,
  ].join('\n')
}

export function whatsappShareHref(schoolName: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(joinShareMessage(schoolName, url))}`
}
