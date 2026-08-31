import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Lock, type LucideIcon } from 'lucide-react'

export type TrackCardState = 'not_started' | 'draft' | 'submitted' | 'coming_soon' | 'closed'

const STATE_LABEL: Record<TrackCardState, string> = {
  not_started: 'Open to enter',
  // "Draft saved" sounds like an accomplishment. It is not an entry, and the
  // card is where a student checks whether they are actually in.
  draft: 'Draft — not entered',
  submitted: 'Entered',
  coming_soon: 'Coming soon',
  closed: 'Entries closed',
}

const STATE_CLASS: Record<TrackCardState, string> = {
  not_started: 'bg-white/80 text-muted',
  draft: 'bg-accent-yellow/25 text-[#8a5a00]',
  submitted: 'bg-green-100 text-green-700',
  coming_soon: 'bg-white/80 text-muted',
  closed: 'bg-white/80 text-muted',
}

export function TrackCard({
  name,
  tagline,
  state,
  href,
  teamNote,
  icon: Icon,
  gradient,
  wash,
  accent,
  verb,
  art,
}: {
  name: string
  tagline: string
  state: TrackCardState
  href?: string
  teamNote: string
  icon: LucideIcon
  gradient: string
  wash: string
  accent: string
  verb: string
  art: string
}) {
  const locked = state === 'coming_soon' || state === 'closed'

  const body = (
    <div className="clay-card group relative flex h-full flex-col overflow-hidden p-0">
      {/* The track's own colour, read as a rule on the card's top edge — the
          same device the key art uses under the wordmark. */}
      <span className={`absolute inset-x-0 top-0 z-10 h-1.5 bg-gradient-to-r ${gradient}`} />
      <span className={`absolute inset-0 bg-gradient-to-br ${wash} to-transparent`} />

      <div className="relative flex flex-1 items-stretch gap-2 p-5 pt-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${gradient} px-2.5 py-1 text-[11px] font-bold text-white shadow-sm`}
            >
              <Icon className="h-3 w-3" />
              {verb}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATE_CLASS[state]}`}
            >
              {STATE_LABEL[state]}
            </span>
          </div>

          <h2 className="font-display mt-3 text-lg font-bold leading-snug text-foreground sm:text-xl">
            {name}
          </h2>
          <p className="mt-1.5 flex-1 text-sm text-foreground/65">{tagline}</p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              {locked && <Lock className="h-3 w-3" />}
              {teamNote}
            </span>
            {href && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${accent} transition-transform group-hover:translate-x-0.5`}
              >
                View
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* The championship's 3D prop, bled into the card's bottom-right
            corner. The render is a true cutout, so it sits straight on the
            card's wash. */}
        <div className="relative -mr-4 -mb-4 aspect-square w-28 shrink-0 self-end sm:w-36">
          <Image
            src={art}
            alt=""
            aria-hidden
            fill
            sizes="140px"
            className={`object-contain transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:scale-105 ${
              locked ? 'opacity-70 saturate-[0.6]' : ''
            }`}
          />
        </div>
      </div>
    </div>
  )

  if (!href) return body
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  )
}
