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
 * Ordered by lower bound, so the list still reads as a ladder in the dropdown.
 *
 * The open-ended bands from '500+' up overlap each other by design — a 6,000
 * student school matches both '5000+' and '3000+'. That is how the bands were
 * specified, so a coordinator picks the one that best describes their school
 * rather than the one that is arithmetically unique. Every value already saved
 * against a school is still in this list, so an existing application can be
 * re-submitted without being rejected.
 */
export const STUDENT_COUNT_OPTIONS = [
  '1-100',
  '101-300',
  '301-600',
  '500+',
  '601-1000',
  '1000+',
  '1500+',
  '2000-3000',
  '3000+',
  '5000+',
  '7000+',
  '10000+',
  '20000+',
]

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
  if (!STUDENT_COUNT_OPTIONS.includes(studentCountRange)) {
    return 'Please select the number of students.'
  }
  return null
}
