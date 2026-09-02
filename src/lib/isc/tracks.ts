import { Cpu, Rocket, Video, Puzzle, type LucideIcon } from 'lucide-react'

export type IscTrackId = 'ai_for_impact' | 'entrepreneurship' | 'content_creator'

/** The inaugural cycle. Consent, deadlines and rankings are all season-scoped. */
export const ISC_SEASON = '2026'

/** Entries are accepted in either language, on every track. */
export const LANGUAGE_OPTIONS = ['English', 'Hindi']

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
}

export const ISC_TRACKS: IscTrack[] = [
  {
    id: 'ai_for_impact',
    slug: 'ai-for-impact',
    name: 'AI for Impact',
    tagline: 'Build something that helps people.',
    brief:
      'Build a working app or digital tool that tackles a social problem you care about, then show us how it works.',
    maxTeamSize: 3,
    icon: Cpu,
    gradient: 'from-primary to-primary-light',
    tint: 'from-primary/[0.08]',
    accent: 'text-primary',
    wash: 'from-primary/[0.16] via-accent-purple/[0.06]',
    verb: 'Build',
    art: '/isc/2026/ai.webp',
    prize:
      'All three national winners get enterprise-grade deployment and scalability support for their app, plus social-media visibility.',
    prepare: [
      'A working app or prototype, live on a link anyone can open',
      'A demo video of one minute or less',
      'A short written explanation of the problem and how you solved it',
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
    prize: 'The national winner receives funding of up to ₹1 lakh to take the idea forward.',
    prepare: [
      'Your idea written out: problem, solution, who it is for, and why it works',
      'How it would make money',
      'A pitch video of one minute or less',
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
      'The top three national winners become brand ambassadors and feature in digital campaigns for participating brands.',
    prepare: [
      'An original video of one minute or less, on a link anyone can open',
      'A title for it',
      'A short note on how it answers the theme',
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
  divisions: 'Two divisions: Classes 5–8 and Classes 9–12',
  prize:
    'A shared ₹2 lakh pool across both divisions — ₹1 lakh in gifts or devices and ₹1 lakh in scholarships.',
  prepare: [
    'A device with a steady internet connection',
    'A quiet half hour — rounds are played live and cannot be paused',
    'Nothing to prepare or upload beforehand: you play on the day',
  ],
}

export function trackBySlug(slug: string): IscTrack | null {
  return ISC_TRACKS.find((t) => t.slug === slug) ?? null
}

export function trackById(id: string): IscTrack | null {
  return ISC_TRACKS.find((t) => t.id === id) ?? null
}

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
