/**
 * The consent notice, as data.
 *
 * Kept here rather than inline in the form because two things read it: the
 * screen a student agrees on, and the record of what they agreed to. If the
 * wording lives only in JSX, a later edit silently changes the meaning of
 * every consent already stored — which is why CONSENT_VERSION is written
 * alongside each row and must be bumped whenever anything below changes.
 */

export const CONSENT_VERSION = '2026.1'

export interface ConsentPurpose {
  id: string
  /** The checkbox label — what the student is agreeing to. */
  label: string
  /** Why it is needed, in plain words. */
  detail: string
  /**
   * Required purposes are the ones without which the championship cannot run.
   * Everything else is optional and must not gate entry: DPDP s.6 requires
   * consent to be free, so making a prize eligible on agreeing to marketing
   * would not be consent at all.
   */
  required: boolean
}

export const CONSENT_PURPOSES: ConsentPurpose[] = [
  {
    id: 'participation',
    label: 'Enter ISC 2026 and have my work judged',
    detail:
      'Skill Fleet stores your entry, shows it to the judges, and uses your name, class and school to rank you and your school through the school, state and national rounds.',
    required: true,
  },
  {
    id: 'brainweave_sharing',
    label: 'Share my name and class with Brainweave for Puzzle Master',
    detail:
      'Puzzle Master is run live by Brainweave, a separate company. To play it they need your name, class and school so they can register you and report your score back. Only needed if you enter Puzzle Master — the other three championships are unaffected.',
    required: false,
  },
  {
    id: 'promo_use',
    label: 'Let Skill Fleet show my entry publicly if I win',
    detail:
      'Your winning entry, first name and school may appear on our website and social media as part of announcing the results. You can say no and still compete for every prize.',
    required: false,
  },
]

/** What is collected, for the notice under DPDP s.5. */
export const CONSENT_DATA_ITEMS = [
  'Your name, class and school',
  'Your entry — what you write, and the links to work you host elsewhere',
  'Your teammates, if you enter as a team',
  'The date and time you submitted, and your edit history up to the deadline',
]

/** Who sees it, also part of the s.5 notice. */
export const CONSENT_RECIPIENTS = [
  'Skill Fleet staff and the championship judges',
  'Your school’s coordinator, if your school has an approved one',
  'Brainweave, only if you agree to it above and only for Puzzle Master',
]
