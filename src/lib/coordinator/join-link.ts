/**
 * Prefilled school signup links.
 *
 * A coordinator shares /join/<schoolId>. That page remembers the school in a
 * cookie, and /onboarding/details reads it back to preselect the whole
 * state -> district -> school cascade. The link only ever prefills a form: it
 * grants no access, joins no roster, and can be edited by the student, so a
 * link forwarded to the wrong person costs nothing.
 */

/** Short-lived on purpose: long enough to sign up, not to linger on a shared device. */
export const JOIN_COOKIE = 'sf_join_school'
export const JOIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function joinPath(schoolId: string): string {
  return `/join/${schoolId}`
}

/** Absolute link, for copying and for WhatsApp. */
export function joinUrl(schoolId: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}${joinPath(schoolId)}`
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
    'Four championships — AI for Impact, Young Entrepreneurship, Content Creator and Puzzle Master. Open to Classes 5 to 12. School screening is free to enter.',
    '',
    `Sign up here (your school is already filled in): ${url}`,
  ].join('\n')
}

export function whatsappShareHref(schoolName: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(joinShareMessage(schoolName, url))}`
}
