// Single source of truth for "has this student given their required details?"
// Used by the platform layout, the onboarding wizard page, and loginAction
// so the gate condition can never drift between call sites.

export interface StudentDetailsFields {
  school_class: string | null
  school_name: string | null
  school_state: string | null
  school_district: string | null
  city: string | null
  parent_mobile: string | null
}

export function isStudentDetailsComplete(p: StudentDetailsFields): boolean {
  return Boolean(
    p.school_class?.trim() &&
      p.school_name?.trim() &&
      p.school_state?.trim() &&
      p.school_district?.trim() &&
      p.city?.trim() &&
      p.parent_mobile?.trim()
  )
}

// ── Class / branch options ───────────────────────────────────────────
// Fixed dropdowns for the student details form. Class is Kindergarten →
// Class 12; students in Class 11/12 additionally pick a stream/branch.

export const CLASS_OPTIONS: readonly string[] = [
  'Kindergarten',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
]

export const BRANCH_OPTIONS: readonly string[] = ['Science', 'Commerce', 'Arts']

/** Only Class 11 and 12 have a stream/branch. */
export function classRequiresBranch(schoolClass: string): boolean {
  return schoolClass === 'Class 11' || schoolClass === 'Class 12'
}

/**
 * Validates the class + branch pair for the student details forms.
 * Returns an error message, or null when valid.
 */
export function validateClassBranch(schoolClass: string, schoolBranch: string | null): string | null {
  if (!CLASS_OPTIONS.includes(schoolClass)) return 'Please select a valid class.'
  if (classRequiresBranch(schoolClass)) {
    if (!schoolBranch) return 'Please select your stream / branch.'
    if (!BRANCH_OPTIONS.includes(schoolBranch)) return 'Please select a valid stream / branch.'
  }
  return null
}

/** The branch value to persist — null unless the class actually has one. */
export function branchToStore(schoolClass: string, schoolBranch: string | null): string | null {
  return classRequiresBranch(schoolClass) ? (schoolBranch?.trim() || null) : null
}
