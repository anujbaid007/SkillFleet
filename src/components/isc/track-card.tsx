import Link from 'next/link'
import { Lock } from 'lucide-react'

export type TrackCardState = 'not_started' | 'draft' | 'submitted' | 'coming_soon' | 'closed'

const STATE_LABEL: Record<TrackCardState, string> = {
  not_started: 'Not started',
  draft: 'Draft saved',
  submitted: 'Submitted',
  coming_soon: 'Coming soon',
  closed: 'Entries closed',
}

const STATE_CLASS: Record<TrackCardState, string> = {
  not_started: 'bg-black/[0.05] text-muted',
  draft: 'bg-accent-yellow/15 text-accent-yellow',
  submitted: 'bg-primary/10 text-primary',
  coming_soon: 'bg-black/[0.05] text-muted',
  closed: 'bg-black/[0.05] text-muted',
}

export function TrackCard({
  name,
  tagline,
  state,
  href,
  teamNote,
}: {
  name: string
  tagline: string
  state: TrackCardState
  href?: string
  teamNote: string
}) {
  const body = (
    <div className="clay-card p-6 h-full flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">{name}</h2>
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATE_CLASS[state]}`}
        >
          {STATE_LABEL[state]}
        </span>
      </div>
      <p className="text-sm text-muted flex-1">{tagline}</p>
      <p className="text-xs text-muted flex items-center gap-1.5">
        {state === 'coming_soon' && <Lock className="w-3 h-3" />}
        {teamNote}
      </p>
    </div>
  )

  if (!href) return <div className="opacity-70">{body}</div>
  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  )
}
