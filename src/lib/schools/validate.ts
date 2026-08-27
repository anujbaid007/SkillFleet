// Shared shape and validation for the State / District / School cascade, used
// by both the onboarding details form and the account form so the rules can
// never drift between them.

/** Dropdown value meaning "my school isn't listed" — never a real school id. */
export const MANUAL_SENTINEL = '__manual__'

/** Longest real school name in the CBSE register is exactly 100 characters. */
export const MAX_SCHOOL_NAME = 100

export interface SchoolSelection {
  state: string
  district: string
  /** A real schools.id, or null when the student typed their school in. */
  schoolId: string | null
  /** The typed name, or null when a listed school was picked. */
  manualName: string | null
}

export function parseSchoolSelection(formData: FormData): SchoolSelection {
  const state = ((formData.get('school_state') as string) ?? '').trim()
  const district = ((formData.get('school_district') as string) ?? '').trim()
  const rawId = ((formData.get('school_id') as string) ?? '').trim()
  const manual = ((formData.get('school_manual_name') as string) ?? '').trim()

  const isManual = rawId === MANUAL_SENTINEL || rawId === ''
  return {
    state,
    district,
    schoolId: isManual ? null : rawId,
    manualName: isManual ? manual || null : null,
  }
}

/** Returns an error message, or null when the selection is usable. */
export function validateSchoolSelection(sel: SchoolSelection): string | null {
  if (!sel.state) return 'Please select your state.'
  if (!sel.district) return 'Please select your district.'
  if (!sel.schoolId && !sel.manualName?.trim()) return 'Please select your school.'
  if (sel.manualName && sel.manualName.length > MAX_SCHOOL_NAME) {
    return 'School name is too long.'
  }
  return null
}
