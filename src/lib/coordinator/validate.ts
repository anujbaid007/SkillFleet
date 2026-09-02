export const BOARD_OPTIONS = [
  'CBSE',
  'ICSE / ISC',
  'State Board',
  'IB (International Baccalaureate)',
  'IGCSE / Cambridge',
  'NIOS',
  'Other',
]

/**
 * What the dropdown offers. One open-ended ladder, no closed ranges: a
 * coordinator picks the floor their school clears.
 */
export const STUDENT_COUNT_OPTIONS = [
  '500+',
  '1000+',
  '1500+',
  '2000+',
  '3000+',
  '5000+',
  '7000+',
  '10000+',
  '20000+',
]

/**
 * Closed ranges the dropdown used to offer. They are no longer shown, but
 * schools are still stored against them, and rejecting a value a school
 * already holds would stop that coordinator re-submitting their own
 * application. Accepted on the way in, never offered.
 */
const LEGACY_STUDENT_COUNTS = ['1-100', '101-300', '301-600', '601-1000', '2000-3000']

const ACCEPTED_STUDENT_COUNTS = [...STUDENT_COUNT_OPTIONS, ...LEGACY_STUDENT_COUNTS]

/**
 * Board accepts any non-empty string — "Other" reveals a free-text field
 * client-side (same escape-hatch shape as district/school), so the server
 * only rejects a blank submission, not an unrecognised value. Student count
 * is a fixed list with no escape hatch, so it must match exactly.
 */
export function validateCoordinatorApplication(
  board: string,
  studentCountRange: string
): string | null {
  if (!board.trim()) return 'Please select your board.'
  if (!ACCEPTED_STUDENT_COUNTS.includes(studentCountRange)) {
    return 'Please select the number of students.'
  }
  return null
}
