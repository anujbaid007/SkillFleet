/**
 * The consent asked for immediately after signing up.
 *
 * Kept as data rather than inline in the popup because two things read it:
 * the card a parent agrees on, and the record of what was agreed. If the
 * wording lived only in JSX, editing it later would silently change the
 * meaning of every consent already stored — which is why TERMS_VERSION is
 * written alongside each row and must be bumped whenever anything below
 * changes.
 */

export const TERMS_VERSION = '2026.2'

export interface RegistrationPurpose {
  id: string
  /** Wording for a parent ticking on a student's behalf. */
  label: string
  /** Wording for a coordinator agreeing for themselves. */
  labelForCoordinator: string
  /**
   * The required purpose is the one without which there is no account to run.
   * Everything else must be refusable without losing the service, or the
   * consent is not freely given and so is not consent at all. It is never
   * labelled as such on screen; declining it simply keeps the card open.
   */
  required: boolean
}

export const REGISTRATION_PURPOSES: RegistrationPurpose[] = [
  {
    id: 'account',
    label: 'Create and run this account',
    labelForCoordinator: 'Create and run this account',
    required: true,
  },
  {
    id: 'marketing_skillfleet',
    label: 'Send news and offers to the parent',
    labelForCoordinator: 'Send me news and offers',
    required: false,
  },
  {
    id: 'marketing_brainweave',
    label: 'Let Brainweave contact the parent about Puzzle Master',
    labelForCoordinator: 'Let Brainweave contact me about Puzzle Master',
    required: false,
  },
]

/**
 * The notice under DPDP s.5, kept to what the section needs: what is held and
 * why, how to withdraw or correct it, and where to complain. The Privacy
 * Policy carries the rest.
 */
export const REGISTRATION_NOTICE = {
  student:
    'To run this account Skill Fleet keeps the student’s name, date of birth, class, school and city, and a parent’s name, email and WhatsApp number.',
  coordinator: 'To run this account Skill Fleet keeps your name, email, phone number and school.',
  rights:
    'You can see, change or delete it any time from Account or by writing to contact@skillfleet.org, and complain to our Grievance Officer, then the Data Protection Board of India.',
}
