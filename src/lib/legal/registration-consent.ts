/**
 * The consent asked for immediately after signing up.
 *
 * Kept as data rather than inline in the form because two things read it: the
 * screen a parent agrees on, and the record of what was agreed. If the wording
 * lived only in JSX, editing it later would silently change the meaning of
 * every consent already stored — which is why TERMS_VERSION is written
 * alongside each row and must be bumped whenever anything below changes.
 */

export const TERMS_VERSION = '2026.1'

export interface RegistrationPurpose {
  id: string
  label: string
  detail: string
  /**
   * Required purposes are the ones without which there is no account to run.
   * Everything else must be refusable without losing the service, or the
   * consent is not freely given and so is not consent at all.
   */
  required: boolean
}

export const REGISTRATION_PURPOSES: RegistrationPurpose[] = [
  {
    id: 'account',
    label: 'Create and run this account',
    detail:
      'Skill Fleet stores the student’s name, date of birth, school, class and city, and a parent’s name, email and WhatsApp number, so the account works and we can reach a responsible adult.',
    required: true,
  },
  {
    id: 'marketing_skillfleet',
    label: 'Skill Fleet may send me news and offers',
    detail:
      'Programmes, workshops, trips and championship news, sent to the parent’s email and WhatsApp number. Never to the student. You can stop these at any time and it changes nothing about the account.',
    required: false,
  },
  {
    id: 'marketing_brainweave',
    label: 'Brainweave may contact me about Puzzle Master',
    detail:
      'Brainweave run the Puzzle Master championship live and are a separate company. This lets us share the parent’s name and contact details with them so they can send news about it, again to the parent and never to the student.',
    required: false,
  },
]

/** What is collected — the notice under DPDP s.5, given before the ask. */
export const REGISTRATION_DATA_ITEMS = [
  'The student’s name, date of birth, class, school and city',
  'A parent or guardian’s name, email address and WhatsApp number',
  'What the student books, and answers they give in skill assessments',
  'A session cookie that keeps them signed in',
]

/** Who it reaches. */
export const REGISTRATION_RECIPIENTS = [
  'Skill Fleet staff',
  'The student’s school coordinator, if their school has an approved one',
  'Providers running a workshop or trip the student has booked',
  'Brainweave, only if agreed to above',
]

/**
 * Why marketing is addressed to the parent and not the student.
 *
 * DPDP s.9(3) forbids advertising directed at a child outright — it is not
 * something consent can authorise. Sending to the parent is lawful with their
 * agreement, so that is what these two purposes ask for, and the wording says
 * so plainly rather than leaving it to be assumed.
 */
export const MARKETING_NOTE =
  'Marketing is only ever sent to the parent or guardian, never to the student. The law does not allow advertising to be directed at children, whoever agrees to it.'
