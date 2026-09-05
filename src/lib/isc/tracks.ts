import { Cpu, Rocket, Video, Puzzle, type LucideIcon } from 'lucide-react'

export type IscTrackId = 'ai_for_impact' | 'entrepreneurship' | 'content_creator'

/** The inaugural cycle. Consent, deadlines and rankings are all season-scoped. */
export const ISC_SEASON = '2026'

/** Entries are accepted in either language, on every track. */
export const LANGUAGE_OPTIONS = ['English', 'Hindi']

/*
  Every championship runs two age divisions, and a student may enter as many
  championships as they like. Both were once true of Puzzle Master alone,
  which is why the wording lived on that track; they are season-wide rules and
  belong here.
*/
export const ISC_DIVISIONS = 'Two divisions in every competition: Classes 5–8 and Classes 9–12'

/** The same rule, short enough for a chip beside team size and language. */
export const ISC_DIVISIONS_SHORT = 'Two divisions: Classes 5–8 and 9–12'

/** Said wherever a student might assume one entry is all they get. */
export const ISC_MULTI_ENTRY = 'A student may enter more than one championship.'

/**
 * Three winners in each division of each championship, so this many entries
 * from one school go up to the state round. Derived rather than typed out:
 * four championships × two divisions × three winners.
 */
export const CHAMPIONSHIP_COUNT = 4
export const WINNERS_PER_DIVISION = 3
export const SCHOOL_QUALIFIERS = CHAMPIONSHIP_COUNT * 2 * WINNERS_PER_DIVISION

export const SCHOOL_QUALIFIER_NOTE =
  `The top three entries — on your own or as a team — are picked in every division of every championship, so up to ${SCHOOL_QUALIFIERS} from a single school go through to the state round.`

export interface IscTrack {
  id: IscTrackId
  slug: string
  name: string
  tagline: string
  brief: string
  /** The leader occupies one of these places. */
  maxTeamSize: number
  /** Visual identity, mirroring OFFERING_TYPE_META so ISC reads like the rest
      of the platform rather than a bolt-on. */
  icon: LucideIcon
  /** two-stop gradient for a solid icon badge */
  gradient: string
  /** soft card wash */
  tint: string
  /** solid text/accent colour class */
  accent: string
  /** Stronger card wash for the ISC dashboard, where the art needs a field
      to sit on. `tint` is too faint once a 3D render is laid over it. */
  wash: string
  /** The track's word in the championship's "Build. Solve. Create. Lead."
      line, so the dashboard cards and the key art say the same thing. */
  verb: string
  /** Glossy 3D prop from the ISC 2026 art, cut out on transparency. */
  art: string
  /** What a national winner receives, from the Skill Fleet deck. */
  prize: string
  /** What the student actually needs to have ready before entering. */
  prepare: string[]
  /** The full brief, a few short paragraphs, shown on the championship's own page. */
  description: string[]
  /** Where a student can build the thing without setting up anything. */
  tools?: { name: string; url: string; note: string }[]
}

export const ISC_TRACKS: IscTrack[] = [
  {
    id: 'ai_for_impact',
    slug: 'ai-for-impact',
    name: 'AI for Impact',
    tagline: 'Build AI that solves a real problem.',
    brief:
      'Build a working AI app or tool that solves a real-world problem, for anyone, anywhere, then show us how it works.',
    maxTeamSize: 3,
    icon: Cpu,
    gradient: 'from-primary to-primary-light',
    tint: 'from-primary/[0.08]',
    accent: 'text-primary',
    wash: 'from-primary/[0.16] via-accent-purple/[0.06]',
    verb: 'Build',
    art: '/isc/2026/ai.webp',
    prize:
      'Prizes up to ₹1 lakh, plus mentorship, deployment guidance and support to scale the strongest solutions.',
    prepare: [
      'A working app or prototype, live on a link anyone can open',
      'A demo video of one minute or less',
      'A short written explanation of the problem and how you solved it',
    ],
    description: [
      'Start with a real problem you have seen with your own eyes, then build an AI tool that solves it. It can come from anywhere: your home, your school, a shop, a farm, a hobby. It does not have to be a social cause. A stock tracker for a shopkeeper, a homework helper in your own language, an app that spots plant disease from a photo, a tool that turns a doctor’s note into plain words, all of these count. What matters is that a real person would use it, and that it works when we open the link.',
      'Judges look at four things: how real and clearly stated the problem is, whether the AI genuinely does the job rather than decorating it, whether it works for a stranger on first try, and how honestly you explain what it can and cannot do. A small tool that works beats a big idea that does not.',
      'You can build it however you like. The platforms below let you describe what you want in plain English and give you a working app with a shareable link in an afternoon, no installation needed. Use one of them, or code it yourself, then paste the public link in your entry. Make sure the link opens in a private window, because that is exactly how the judges will open it.',
    ],
    tools: [
      { name: 'Google AI Studio', url: 'https://aistudio.google.com', note: 'Build and publish an app on Gemini from a prompt, free with a Google account.' },
      { name: 'Emergent', url: 'https://emergent.sh', note: 'Describe the app, and it writes and hosts the whole thing for you.' },
      { name: 'Replit', url: 'https://replit.com', note: 'Chat your way to an app, edit the code if you want to, share a live link.' },
      { name: 'Lovable', url: 'https://lovable.dev', note: 'Good for websites and web apps with a polished look, from a description.' },
    ],
  },
  {
    id: 'entrepreneurship',
    slug: 'entrepreneurship',
    name: 'Young Entrepreneurship Challenge',
    tagline: 'Turn an idea into a business.',
    brief:
      'Develop an original startup idea: the problem it solves, who it is for, and how you would actually bring it to market.',
    maxTeamSize: 3,
    icon: Rocket,
    gradient: 'from-accent-teal to-primary',
    tint: 'from-accent-teal/[0.08]',
    accent: 'text-accent-teal',
    wash: 'from-accent-teal/[0.16] via-primary/[0.06]',
    verb: 'Lead',
    art: '/isc/2026/venture.webp',
    prize:
      'Prizes up to ₹1 lakh, plus mentorship and venture-building support to help winning ideas scale.',
    prepare: [
      'Your idea written out: problem, solution, who it is for, and why it works',
      'How it would make money',
      'A pitch video of one minute or less',
    ],
    description: [
      'Find something people around you pay for, wait for, or put up with, and design a business that does it better. It can be a product, a service, a subscription, a marketplace, or a school-gate stall that grew. You do not need to have started it, but the more you have tested with real people, the stronger your entry.',
      'Your write-up answers six questions in plain words: what the problem is, what you would sell, who exactly would buy it, why they would choose you, how the numbers work, and what would stop you. Then a one-minute pitch on video, as if you were in front of an investor with a bus to catch.',
      'Judges reward ideas that are specific, that show you spoke to a real customer, and that could actually start with the money and time a student has. Ambition is welcome, but a clear first step beats a grand plan every time.',
    ],
  },
  {
    id: 'content_creator',
    slug: 'content-creator',
    name: 'Content Creator Championship',
    tagline: 'Tell a story in sixty seconds.',
    brief:
      'Create an original one-minute video answering this year’s theme. Your work, your voice.',
    maxTeamSize: 3,
    icon: Video,
    gradient: 'from-accent-pink to-accent-purple',
    tint: 'from-accent-pink/[0.08]',
    accent: 'text-accent-pink',
    wash: 'from-accent-pink/[0.16] via-accent-purple/[0.06]',
    verb: 'Create',
    art: '/isc/2026/content.webp',
    prize:
      'Prizes up to ₹1 lakh, plus mentorship and creator or brand support to help standout talent scale.',
    prepare: [
      'An original video of one minute or less, on a link anyone can open',
      'A title for it',
      'A short note on how it answers the theme',
    ],
    description: [
      'One minute, one idea, your voice. This year’s theme is on your entry form. Make a video that answers it in a way only you could, a story, an explainer, a mini documentary, a song, a skit, animation, whatever you are good at. Phone footage is fine; a clear idea and a strong first five seconds matter far more than the camera.',
      'The work must be your own. You can use editing apps, music you have the right to use, and AI tools for captions or effects, but the idea, the script and the presence on screen are yours. Tell us in the note what you used.',
      'Judges look at whether the video actually answers the theme, whether it holds attention for the full minute, how well it is made with what you had, and how original it is. Upload it anywhere with a public link, YouTube unlisted or Google Drive both work, and check the link in a private window before you submit.',
    ],
  },
]

/**
 * The fourth championship. It has its own page at /isc/puzzle-master, but no
 * entry form: the rounds are played live and hosted by Brainweave rather than
 * submitted here, so the page briefs the student and offers the practice games
 * instead. Kept apart from ISC_TRACKS for exactly that reason — everything
 * that iterates ISC_TRACKS is entry machinery that does not apply.
 */
/** What isc_entries.track holds for a Puzzle Master entry. */
export const PUZZLE_MASTER_TRACK_ID = 'puzzle_master'

export const PUZZLE_MASTER = {
  slug: 'puzzle-master',
  name: 'Puzzle Master',
  tagline: 'Logic, speed and nerve — played live.',
  brief:
    'Take on timed logic and reflex puzzles against the clock, played live in rounds. No project to build and nothing to upload — just you, the puzzle and the timer.',
  icon: Puzzle,
  gradient: 'from-accent-yellow to-accent-pink',
  tint: 'from-accent-yellow/[0.08]',
  accent: 'text-accent-yellow',
  wash: 'from-accent-yellow/[0.18] via-accent-pink/[0.06]',
  verb: 'Solve',
  art: '/isc/2026/puzzle.webp',
  divisions: ISC_DIVISIONS,
  /** Played live across this window rather than submitted against a deadline. */
  window: '1 October to 30 December 2026',
  prize:
    'Prizes up to ₹50,000 across the two age divisions, alongside winner certificates and national recognition.',
  prepare: [
    'A device with a steady internet connection',
    'A quiet half hour — rounds are played live and cannot be paused',
    'Nothing to prepare or upload beforehand: you play on the day',
  ],
  description: [
    'Puzzle Master is the one championship with nothing to build. You play a set of timed logic, memory and reasoning games live, against the clock and against everyone else in your division, and your score is your entry. Rounds run between 1 October and 30 December 2026; the exact dates for your school come from your coordinator.',
    'The games test speed, pattern-spotting, working memory and nerve under a timer, not what you have memorised. Practice games are free below and are not scored, so play them until the formats feel familiar.',
    'On the day you need a device, a steady connection and a quiet half hour, because a live round cannot be paused or restarted. Two divisions, Classes 5 to 8 and Classes 9 to 12, are scored separately.',
  ],
}

export function trackBySlug(slug: string): IscTrack | null {
  return ISC_TRACKS.find((t) => t.slug === slug) ?? null
}

export function trackById(id: string): IscTrack | null {
  return ISC_TRACKS.find((t) => t.id === id) ?? null
}

/**
 * The display name for any value that can appear in isc_entries.track, Puzzle
 * Master included -- it is absent from ISC_TRACKS because it has no entry
 * form, but the column still carries it. An id nobody recognises is returned
 * as it stands rather than hidden behind "Unknown": on an admin screen the raw
 * value is the thing worth seeing.
 */
export function trackName(id: string): string {
  if (id === PUZZLE_MASTER_TRACK_ID) return PUZZLE_MASTER.name
  return trackById(id)?.name ?? id
}

/** Every track a filter can offer, in the order the championships are listed. */
export const TRACK_FILTER_OPTIONS: { value: string; label: string }[] = [
  ...ISC_TRACKS.map((t) => ({ value: t.id as string, label: t.name })),
  { value: PUZZLE_MASTER_TRACK_ID, label: PUZZLE_MASTER.name },
]

export interface FieldSpec {
  key: string
  label: string
  kind: 'url' | 'text' | 'textarea' | 'select'
  min?: number
  max?: number
  help?: string
  /** Only for kind: 'select'. */
  options?: string[]
  /** Shown in the empty field. Defaults to a bare https:// for URL fields. */
  placeholder?: string
}

/** One source of truth: the form renders from this and the validator reads it. */
const BASE_TRACK_FIELDS: Record<IscTrackId, FieldSpec[]> = {
  ai_for_impact: [
    {
      key: 'app_url',
      label: 'Link to your app or prototype',
      kind: 'url',
      help: 'Must be publicly viewable — check it in a private window.',
      placeholder: 'Paste the link to your app here',
    },
    {
      key: 'demo_video_url',
      label: 'Link to your demo video (YouTube or Google Drive link)',
      kind: 'url',
      help: 'One minute maximum. Make sure anyone with the link can view it.',
      placeholder: 'Paste your YouTube or Google Drive link here',
    },
    {
      key: 'explanation',
      label: 'What problem does it solve, and how?',
      kind: 'textarea',
      min: 100,
      max: 1000,
    },
  ],
  entrepreneurship: [
    { key: 'problem', label: 'The problem', kind: 'textarea', min: 100, max: 1000 },
    { key: 'solution', label: 'Your solution', kind: 'textarea', min: 100, max: 1000 },
    { key: 'target_audience', label: 'Who is it for?', kind: 'textarea', min: 20, max: 500 },
    { key: 'impact', label: 'The impact it would have', kind: 'textarea', min: 100, max: 1000 },
    { key: 'feasibility', label: 'Why it can actually work', kind: 'textarea', min: 100, max: 1000 },
    {
      key: 'business_model',
      label: 'How it would make money',
      kind: 'textarea',
      min: 100,
      max: 1000,
    },
    {
      key: 'pitch_video_url',
      label: 'Link to your pitch video (YouTube or Google Drive link)',
      kind: 'url',
      help: 'One minute maximum. Make sure anyone with the link can view it.',
      placeholder: 'Paste your YouTube or Google Drive link here',
    },
  ],
  content_creator: [
    {
      key: 'video_url',
      label: 'Link to your video (YouTube or Google Drive link)',
      kind: 'url',
      help: 'One minute maximum. Make sure anyone with the link can view it.',
      placeholder: 'Paste your YouTube or Google Drive link here',
    },
    { key: 'title', label: 'Title', kind: 'text', max: 120 },
    {
      key: 'theme_note',
      label: 'How does it answer the theme?',
      kind: 'textarea',
      min: 100,
      max: 1000,
    },
  ],
}

/**
 * Every track asks the same language question, so it is declared once rather
 * than repeated three times. The deck requires entries in English or Hindi
 * across all four tracks.
 */
const LANGUAGE_FIELD: FieldSpec = {
  key: 'language',
  label: 'Language of your entry',
  kind: 'select',
  options: LANGUAGE_OPTIONS,
  help: 'Entries are accepted in English or Hindi.',
}

/**
 * Composed rather than mutated: pushing into the base object at module load
 * would append a duplicate language field every time the module re-evaluates
 * under dev hot-reload.
 */
export const TRACK_FIELDS: Record<IscTrackId, FieldSpec[]> = Object.fromEntries(
  Object.entries(BASE_TRACK_FIELDS).map(([track, specs]) => [track, [...specs, LANGUAGE_FIELD]])
) as Record<IscTrackId, FieldSpec[]>
