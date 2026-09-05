import { Download, FileText, HeartHandshake, Lock, Trophy, Users, type LucideIcon } from 'lucide-react'
import { ISC_DIVISIONS, ISC_TRACKS, PUZZLE_MASTER, SCHOOL_QUALIFIER_NOTE } from '@/lib/isc/tracks'
import { SCHOOL_RECOGNITION, SCHOOL_RECOGNITION_HEADLINE } from '@/lib/isc/recognition'
import { HowItWorks } from '@/components/isc/how-it-works'

/** The decks a coordinator hands out, and who each one is for. */
const DECKS = [
  {
    href: '/decks/ISC-School-Deck.pdf',
    title: 'School deck',
    blurb: 'The full programme, for your principal and management. PDF, 6.8 MB.',
    gradient: 'from-primary to-primary-light',
  },
  {
    href: '/decks/ISC-Teacher-Deck.pdf',
    title: 'Teacher deck',
    blurb: 'How to run it with a class, for the staff room. PDF, 6.4 MB.',
    gradient: 'from-accent-purple to-primary',
  },
  {
    href: '/decks/ISC-Student-Deck.pdf',
    title: 'Student deck',
    blurb: 'What ISC is and how to enter, written for students. PDF, 6.6 MB.',
    gradient: 'from-accent-teal to-primary',
  },
]

/** dd Mon yyyy, in IST, matching how deadlines read elsewhere. */
function deadlineLabel(iso: string | undefined): string {
  if (!iso) return 'Date to be announced'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date to be announced'
  return `Closes ${d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })}`
}

interface Championship {
  key: string
  name: string
  blurb: string
  icon: LucideIcon
  gradient: string
  wash: string
  badge: string
  /** Heading above the list, since Puzzle Master lists divisions not deliverables. */
  listTitle: string
  listItems: string[]
  prize: string
  teamNote: string
  locked?: boolean
}

/**
 * One card, four times.
 *
 * All four are rendered from the same shape on purpose. Puzzle Master
 * previously had its own markup and spanned the full width, which left the
 * grid as two cards, then one beside a gap, then a short wide slab. Every
 * championship now occupies an equal cell.
 */
function ChampionshipCard({ c }: { c: Championship }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-black/[0.05] bg-gradient-to-br p-5 ${c.wash} to-transparent`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient}`}
        >
          <c.icon className="h-4.5 w-4.5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display leading-snug font-bold text-foreground">{c.name}</h3>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              c.locked ? 'bg-white/70 text-muted' : 'bg-white/80 text-foreground'
            }`}
          >
            {c.locked && <Lock className="h-2.5 w-2.5" />}
            {c.badge}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">{c.blurb}</p>

      <p className="mt-4 text-[10px] font-bold tracking-wider text-foreground/50 uppercase">
        {c.listTitle}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {c.listItems.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted">
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* mt-auto pins the prize and team note to the bottom, so the two cards
          in a row line up however much text sits above them. */}
      <div className="mt-auto pt-4">
        <p className="flex gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-foreground">
          <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-yellow" />
          <span>{c.prize}</span>
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted">
          {c.locked ? <Lock className="h-3 w-3" /> : <Users className="h-3 w-3" />}
          {c.teamNote}
        </p>
      </div>
    </div>
  )
}

/**
 * Everything a coordinator needs to brief their school, available before an
 * admin has approved them. Waiting on a review is exactly when they want to
 * read the rules and talk to their students — not after.
 */
export function IscResources({ deadlines }: { deadlines: Record<string, string> }) {
  const championships: Championship[] = [
    ...ISC_TRACKS.map((t) => ({
      key: t.id,
      name: t.name,
      blurb: t.brief,
      icon: t.icon,
      gradient: t.gradient,
      wash: t.wash,
      badge: deadlineLabel(deadlines[t.id]),
      listTitle: 'What they need ready',
      listItems: t.prepare,
      prize: t.prize,
      teamNote: `On their own or a team of up to ${t.maxTeamSize}`,
    })),
    {
      key: 'puzzle_master',
      name: PUZZLE_MASTER.name,
      blurb: PUZZLE_MASTER.tagline,
      icon: PUZZLE_MASTER.icon,
      gradient: PUZZLE_MASTER.gradient,
      wash: PUZZLE_MASTER.wash,
      // Open, like the other three: it has its own page now. There is no
      // submission deadline to count down to because it is played live, so
      // the badge matches what the others show before a date is set.
      badge: PUZZLE_MASTER.window,
      listTitle: 'How it runs',
      listItems: [`Opens 1 October; played live until 31 December.`, 'One valid entry per participant — practice beforehand is free and unlimited.', ISC_DIVISIONS],
      prize: PUZZLE_MASTER.prize,
      teamNote: 'Individual only',
    },
  ]

  return (
    <div className="space-y-5">
      <HowItWorks />

      <div className="clay-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
            The four championships
          </h2>
          <span className="isc-rule h-1 w-16 shrink-0" />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {championships.map((c) => (
            <ChampionshipCard key={c.key} c={c} />
          ))}
        </div>
      </div>

      <div className="clay-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-teal to-primary">
            <HeartHandshake className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
              {SCHOOL_RECOGNITION_HEADLINE}
            </h2>
            <p className="text-xs text-muted">
              Recognition reaches the school, not only the students who win.
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-primary/[0.06] px-4 py-3 text-sm leading-relaxed text-foreground">
          {SCHOOL_QUALIFIER_NOTE}
        </p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {SCHOOL_RECOGNITION.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-teal" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DECKS.map((deck) => (
          <a
            key={deck.href}
            href={deck.href}
            target="_blank"
            rel="noopener noreferrer"
            className="clay-card dash-panel-link flex items-center gap-4 p-5"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${deck.gradient}`}
            >
              <FileText className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-foreground">{deck.title}</p>
              <p className="text-xs text-muted">{deck.blurb}</p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-muted" />
          </a>
        ))}
      </div>
    </div>
  )
}
