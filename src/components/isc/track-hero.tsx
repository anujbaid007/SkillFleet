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
      {/* -my-2 py-2 keeps the row's tap target a comfortable size on a phone
          without pushing the link off its baseline. */}
      <Link
        href="/isc"
        className="-my-3 py-3 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        All tracks
      </Link>

      <div className="clay-card p-0 overflow-hidden">
        <div className={`bg-gradient-to-br ${tint} to-transparent p-5 sm:p-6`}>
          {/*
            On a phone the icon sits on the title's row and the brief runs the
            full width beneath. Keeping the brief beside a 56px icon left it in
            a ~230px column, wrapping a two-line sentence onto four lines.
          */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight min-w-0">
              {name}
            </h1>
          </div>

          <p className="text-sm sm:text-base text-muted mt-3 sm:mt-4 max-w-2xl">{brief}</p>

          <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full bg-white/70 text-foreground">
              <Users className="w-3.5 h-3.5" />
              On your own or a team of up to {maxTeamSize}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full bg-white/70 text-foreground">
              English or Hindi
            </span>
            {deadlineLabel && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full ${
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
