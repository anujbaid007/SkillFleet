import Link from 'next/link'
import { ArrowLeft, CalendarClock, Users, type LucideIcon } from 'lucide-react'

export function TrackHero({
  name,
  brief,
  icon: Icon,
  gradient,
  tint,
  maxTeamSize,
  deadlineLabel,
  daysLeft,
}: {
  name: string
  brief: string
  icon: LucideIcon
  gradient: string
  tint: string
  maxTeamSize: number
  deadlineLabel: string | null
  daysLeft: number | null
}) {
  return (
    <div className="space-y-4">
      <Link
        href="/isc"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        All tracks
      </Link>

      <div className="clay-card p-0 overflow-hidden">
        <div className={`bg-gradient-to-br ${tint} to-transparent p-6`}>
          <div className="flex items-start gap-4">
            <span
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon className="w-6 h-6 text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground leading-tight">
                {name}
              </h1>
              <p className="text-muted mt-1.5 max-w-2xl">{brief}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 text-foreground">
              <Users className="w-3.5 h-3.5" />
              On your own or a team of up to {maxTeamSize}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/70 text-foreground">
              English or Hindi
            </span>
            {deadlineLabel && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                  daysLeft !== null && daysLeft <= 7
                    ? 'bg-red-50 text-red-600'
                    : 'bg-white/70 text-foreground'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                {daysLeft !== null && daysLeft >= 0
                  ? `Closes ${deadlineLabel} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                  : `Closed ${deadlineLabel}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
