export type IscTrackId = 'ai_for_impact' | 'entrepreneurship' | 'content_creator'

export interface IscTrack {
  id: IscTrackId
  slug: string
  name: string
  tagline: string
  brief: string
  /** The leader occupies one of these places. */
  maxTeamSize: number
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
  },
  {
    id: 'entrepreneurship',
    slug: 'entrepreneurship',
    name: 'Young Entrepreneurship Challenge',
    tagline: 'Turn an idea into a business.',
    brief:
      'Develop an original startup idea: the problem it solves, who it is for, and how you would actually bring it to market.',
    maxTeamSize: 3,
  },
  {
    id: 'content_creator',
    slug: 'content-creator',
    name: 'Content Creator Championship',
    tagline: 'Tell a story in sixty seconds.',
    brief:
      'Create an original one-minute video answering this year’s theme. Your work, your voice.',
    maxTeamSize: 3,
  },
]

/**
 * Shown on /isc as a fourth card, but not enterable here: Brainweave is
 * expected to design and host the game itself.
 */
export const PUZZLE_MASTER = {
  name: 'Puzzle Master',
  tagline: 'Logic, speed and nerve — played live.',
  note: 'Coming soon',
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
  kind: 'url' | 'text' | 'textarea'
  min?: number
  max?: number
  help?: string
}

/** One source of truth: the form renders from this and the validator reads it. */
export const TRACK_FIELDS: Record<IscTrackId, FieldSpec[]> = {
  ai_for_impact: [
    {
      key: 'app_url',
      label: 'Link to your app or prototype',
      kind: 'url',
      help: 'Must be publicly viewable — check it in a private window.',
    },
    {
      key: 'demo_video_url',
      label: 'Link to your demo video',
      kind: 'url',
      help: 'One minute maximum.',
    },
    {
      key: 'explanation',
      label: 'What problem does it solve, and how?',
      kind: 'textarea',
      min: 100,
      max: 1500,
    },
  ],
  entrepreneurship: [
    { key: 'problem', label: 'The problem', kind: 'textarea', min: 50, max: 1000 },
    { key: 'solution', label: 'Your solution', kind: 'textarea', min: 50, max: 1000 },
    { key: 'target_audience', label: 'Who is it for?', kind: 'textarea', min: 20, max: 500 },
    { key: 'impact', label: 'The impact it would have', kind: 'textarea', min: 50, max: 1000 },
    { key: 'feasibility', label: 'Why it can actually work', kind: 'textarea', min: 50, max: 1000 },
    {
      key: 'business_model',
      label: 'How it would make money',
      kind: 'textarea',
      min: 50,
      max: 1000,
    },
    {
      key: 'pitch_video_url',
      label: 'Link to your pitch video',
      kind: 'url',
      help: 'One minute maximum.',
    },
  ],
  content_creator: [
    {
      key: 'video_url',
      label: 'Link to your video',
      kind: 'url',
      help: 'One minute maximum, and it must be publicly viewable.',
    },
    { key: 'title', label: 'Title', kind: 'text', max: 120 },
    {
      key: 'theme_note',
      label: 'How does it answer the theme?',
      kind: 'textarea',
      min: 50,
      max: 800,
    },
  ],
}
