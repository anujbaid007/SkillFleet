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
  /** Titled parts of the brief: a sentence, a list, or both. */
  sections?: TrackSection[]
  /** Where a student can build the thing without setting up anything. */
  tools?: { name: string; url: string; note: string }[]
}

export interface TrackSection {
  title: string
  body?: string
  items?: string[]
  /** Numbered rather than bulleted, for a sequence like the parts of a pitch. */
  ordered?: boolean
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
      'AI for Impact is a practical innovation challenge: use artificial intelligence to build a working application, website or digital tool that solves a real-world problem. It is not limited to social causes. Any genuine problem faced by individuals, schools, communities, businesses or society counts, as long as a real person would use what you build and it works when we open the link.',
      'Look at the world around you, pick one specific problem, and make a tool that is genuinely useful to the people who have it. A simple, focused tool that works well beats an ambitious idea that cannot be demonstrated.',
    ],
    sections: [
      {
        title: 'Where a problem can come from',
        body: 'Any of these, or somewhere we have not thought of:',
        items: [
          'Education and personalised learning',
          'Healthcare and wellness',
          'Agriculture, environment and sustainability',
          'Accessibility',
          'Personal productivity and everyday household problems',
          'School administration and local businesses',
          'Financial literacy and public services',
          'Safety and emergency response',
          'Career guidance and communication',
        ],
      },
      {
        title: 'What you can build',
        items: [
          'An AI-powered web app, assistant or chatbot',
          'An educational, recommendation or productivity tool',
          'A data-analysis, research, planning or decision-support tool',
          'An accessibility solution',
          'An AI-powered game or interactive experience',
          'A school or business management tool',
          'Any other working AI solution to a real problem',
        ],
      },
      {
        title: 'What your entry needs',
        body: 'A working public or unlisted link to the app, a demo video of a minute or less, and a written explanation that covers:',
        items: [
          'The real-world problem, and who experiences it',
          'Your solution, and how AI is used inside it',
          'The benefit or outcome you expect for the people who use it',
        ],
      },
      {
        title: 'Keep the link open',
        body: 'The link must stay live for the whole evaluation period, and judges must be able to open and test it without special access or a subscription. Check it in a private window, because that is how they will open it. Never put passwords, confidential information or sensitive personal data into the app.',
      },
      {
        title: 'What judges look for',
        items: [
          'A clear, relevant real-world problem',
          'A genuinely useful solution that works',
          'AI that does real work in the solution, not an AI label on an unrelated site',
          'Originality, ease of use, and room to improve',
          'A clear presentation and explanation',
        ],
      },
    ],
    tools: [
      { name: 'Google AI Studio', url: 'https://ai.google.dev/gemini-api/docs/aistudio-build-mode', note: 'Build and share a full-stack AI web app on Gemini.' },
      { name: 'Emergent', url: 'https://emergent.sh/ai-app-builder', note: 'Full-stack apps and websites from plain-language instructions.' },
      { name: 'Replit Agent', url: 'https://docs.replit.com/build/your-first-app', note: 'Describe, build, test and publish an app inside Replit.' },
      { name: 'Lovable', url: 'https://docs.lovable.dev/introduction/welcome', note: 'Create and deploy a web app from natural-language prompts.' },
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
      'Identify a real problem and develop an original startup or business idea to solve it. You do not need a registered company or a finished product. What counts is how well you understand the problem, how thoughtful your solution is, and how clearly you explain the difference it could make.',
      'Your entry is two things: a structured idea document and a one-minute video pitch, both in English or Hindi.',
    ],
    sections: [
      {
        title: 'The idea document',
        ordered: true,
        items: [
          'A clear, memorable name',
          'The problem: what it is, who has it, how often, why it matters, and what happens if nobody solves it',
          'Your solution: what you would make, how it works, how people use it, and what makes it different from what exists',
          'Who it is for: the people, schools, communities or businesses that would use it',
          'The impact: what changes for users, how many could benefit, and how you would measure it',
          'Feasibility: the resources, technology, people or partners you would need',
          'How it sustains itself: sales, subscriptions, commissions, sponsorship, partnerships, advertising or another model',
          'Where it could go beyond your first users',
        ],
      },
      {
        title: 'The one-minute pitch, in four parts',
        body: 'Present it yourselves, in this order, as if the investor has a bus to catch:',
        ordered: true,
        items: [
          'The problem: what it is, who faces it, why it matters and why it deserves solving. About fifteen seconds.',
          'Your solution: what it does, how it works, why it is practical and what makes it different. About twenty seconds.',
          'The impact: who benefits, what improves, how it could grow, and why the judges should believe in it. About fifteen seconds.',
          'How you will make money: what people pay for, and how the venture keeps going. About ten seconds.',
        ],
      },
      {
        title: 'Video rules',
        items: [
          'Sixty seconds at most, with clear audio',
          'You or your team present it; do not simply read the document aloud',
          'Slides, prototypes or demonstrations are welcome',
          'No expensive equipment needed: clarity of thought matters more than production',
        ],
      },
      {
        title: 'What judges look for',
        items: [
          'Understanding of the problem and the people who have it',
          'Originality and practicality of the idea',
          'Potential impact, feasibility, and a way to sustain it',
          'Confidence and clarity within one minute',
        ],
      },
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
      'A national platform for creativity, communication and digital storytelling. Make one original video, sixty seconds at most, that answers this year’s theme from Skill Fleet, in English or Hindi. The skills it builds, storytelling, video, presentation, editing, design and holding an audience, are the skills of India’s growing creative economy.',
      'The theme is announced by Skill Fleet and is on your entry form. It may touch education, innovation, technology, entrepreneurship, culture, community, sustainability, youth, future skills, social change or everyday student life.',
    ],
    sections: [
      {
        title: 'A structure that works',
        ordered: true,
        items: [
          'An opening hook: a question, a striking image, a surprising line, a situation everyone recognises',
          'The central idea or story, kept on the theme',
          'Creative execution: performance, interviews, demonstration, graphics, animation, humour, music, whatever you are good at',
          'A memorable ending: a message, an insight, a call to action, a moment that stays',
        ],
      },
      {
        title: 'The rules',
        items: [
          'Original work, no longer than sixty seconds, answering the official theme directly',
          'You must have permission for any music, images or footage you did not make',
          'AI tools are allowed, but say so if a significant part is AI-generated, and be able to explain your own contribution',
          'Do not imitate or reproduce another creator’s work',
          'Production quality counts, but expensive equipment is not required; phone footage with a clear idea is fine',
        ],
      },
      {
        title: 'What judges look for',
        items: [
          'Relevance to the theme, and the strength of the central idea',
          'Originality and storytelling',
          'Communication, engagement and creative use of one minute',
          'Visual and audio execution, memorability, overall impact',
        ],
      },
      {
        title: 'Handing it in',
        body: 'Upload it anywhere with a public or unlisted link, YouTube and Google Drive both work, give it a title, write a short note on how it answers the theme, and check the link in a private window before you submit.',
      },
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

export const PUZZLE_MASTER_ID = 'puzzle_master' as const

export const PUZZLE_MASTER = {
  id: PUZZLE_MASTER_ID,
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
    'Think faster, reason better. Puzzle Master is an individual online competition that tests how you think, not what you have memorised: logic, patterns, memory, attention, numbers, space, decisions and speed, under time pressure. It is built to recognise kinds of intelligence that exam marks miss.',
    'You play designated online games on the ISC platform within a fixed window, 1 October to 30 December 2026, and your scores are your entry. The exact games, durations and instructions come before each round; the dates for your school come from your coordinator.',
  ],
  sections: [
    {
      title: 'What the games test',
      items: [
        'Logical and analytical reasoning',
        'Pattern recognition and spatial thinking',
        'Memory, attention and concentration',
        'Numerical reasoning and problem-solving',
        'Emotional intelligence and decision-making',
        'Speed and accuracy',
      ],
    },
    {
      title: 'How it runs',
      items: [
        'Individual entry only; teams are not permitted',
        'Two divisions, Classes 5 to 8 and Classes 9 to 12, scored separately',
        'Each challenge may have a time limit, a maximum score, and scoring by accuracy, completion or time, with time as the tie-break',
        'Use a stable connection and a laptop, desktop or supported device; a live round cannot be paused or restarted',
      ],
    },
    {
      title: 'Preparation',
      body: 'The practice games below, from Brainweave, are free and optional. Play them until the formats feel familiar. Practice scores are never counted: only games played inside the official competition window are.',
    },
    {
      title: 'What the scoring considers',
      items: [
        'Accuracy and the number of challenges completed',
        'Logical approach, problem-solving and decision quality',
        'Consistency, and speed where a challenge measures it',
        'Performance within the time limit',
      ],
    },
  ],
}

/** Every championship a student can be entered in, including Puzzle Master. */
export function trackNameFor(id: string): string {
  if (id === PUZZLE_MASTER_ID) return PUZZLE_MASTER.name
  return ISC_TRACKS.find((t) => t.id === id)?.name ?? id
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
