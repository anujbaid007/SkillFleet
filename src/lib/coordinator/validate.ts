export const BOARD_OPTIONS = [
  'CBSE',
  'ICSE / ISC',
  'State Board',
  'IB (International Baccalaureate)',
  'IGCSE / Cambridge',
  'NIOS',
  'Other',
]

export const STUDENT_COUNT_OPTIONS = ['1-100', '101-300', '301-600', '601-1000', '1000+']

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
