import Link from 'next/link'
import { ArrowRight, Lock, type LucideIcon } from 'lucide-react'

export type TrackCardState = 'not_started' | 'draft' | 'submitted' | 'coming_soon' | 'closed'

const STATE_LABEL: Record<TrackCardState, string> = {
  not_started: 'Open to enter',
  draft: 'Draft saved',
  submitted: 'Submitted',
  coming_soon: 'Coming soon',
  closed: 'Entries closed',
}

const STATE_CLASS: Record<TrackCardState, string> = {
  not_started: 'bg-black/[0.05] text-muted',
  draft: 'bg-accent-yellow/15 text-accent-yellow',
  submitted: 'bg-green-50 text-green-700',
  coming_soon: 'bg-black/[0.05] text-muted',
  closed: 'bg-black/[0.05] text-muted',
}

export function TrackCard({
  name,
  tagline,
  state,
  href,
  teamNote,
  icon: Icon,
  gradient,
  tint,
  accent,
}: {
  name: string
  tagline: string
  state: TrackCardState
  href?: string
  teamNote: string
  icon: LucideIcon
  gradient: string
  tint: string
  accent: string
}) {
  const body = (
    <div className="clay-card p-0 h-full flex flex-col overflow-hidden">
      {/* Tinted head carrying the track's colour, so the four cards are told
          apart at a glance rather than by reading their titles. */}
      <div className={`relative bg-gradient-to-br ${tint} to-transparent p-5 pb-4`}>
        <div className="flex items-start justify-between gap-3">
          <span
            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Icon className="w-5 h-5 text-white" />
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATE_CLASS[state]}`}
          >
            {STATE_LABEL[state]}
          </span>
        </div>
        <h2 className="font-display text-lg font-bold text-foreground leading-snug mt-3">{name}</h2>
      </div>

      <div className="flex flex-col flex-1 px-5 pb-5">
        <p className="text-sm text-muted flex-1">{tagline}</p>
        <div className="flex items-center justify-between gap-3 pt-3 mt-auto">
          <span className="text-xs text-muted inline-flex items-center gap-1.5">
            {state === 'coming_soon' && <Lock className="w-3 h-3" />}
            {teamNote}
          </span>
          {href && (
            <span className={`text-xs font-semibold inline-flex items-center gap-1 ${accent}`}>
              View
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (!href) return <div className="opacity-75">{body}</div>
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  )
}
