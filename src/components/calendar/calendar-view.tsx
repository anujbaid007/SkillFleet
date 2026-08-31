'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { OFFERING_TYPE_META, MODE_LABEL } from '@/lib/offering-meta'
import { dayKeyLabel, type DayCell } from '@/lib/calendar/grid'

export interface CalEvent {
  bookingId: string
  title: string
  type: string
  mode: string | null
  location: string | null
  studentName: string
  timeLabel: string | null
  dayKey: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Dots shown on a phone cell, where there is no room for titles. */
const MAX_DOTS = 3
/** Named activities shown inside a cell from `sm` up, where there is. */
const MAX_CHIPS = 2

export function CalendarView({
  cells,
  events,
  todayKey,
}: {
  cells: DayCell[]
  events: CalEvent[]
  todayKey: string
}) {
  // Group once per render — the month's events are already loaded.
  const byDay = new Map<string, CalEvent[]>()
  for (const e of events) {
    const list = byDay.get(e.dayKey)
    if (list) list.push(e)
    else byDay.set(e.dayKey, [e])
  }

  // Open on today if it has activities, else the first day that does.
  const [selected, setSelected] = useState<string | null>(() => {
    if (byDay.has(todayKey)) return todayKey
    const firstWithEvents = cells.find((c) => c.inMonth && byDay.has(c.key))
    return firstWithEvents?.key ?? null
  })

  const selectedEvents = selected ? byDay.get(selected) ?? [] : []

  return (
    <div className="space-y-5">
      {/* Grid */}
      <div className="clay-card p-2.5 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-bold text-muted uppercase tracking-wide py-1">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((cell) => {
            const dayEvents = byDay.get(cell.key) ?? []
            const has = dayEvents.length > 0
            const isSelected = selected === cell.key

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => has && setSelected(cell.key)}
                aria-label={`${dayKeyLabel(cell.key)}${has ? `, ${dayEvents.length} activities` : ''}`}
                aria-pressed={isSelected}
                aria-current={cell.isToday ? 'date' : undefined}
                disabled={!has}
                /*
                  A fixed, modest height rather than aspect-square. Square cells
                  track the column width, and on a desktop column near 140px
                  that turned a six-week month into ~840px of empty boxes with
                  one numeral adrift in each.
                */
                className={[
                  'min-h-14 sm:min-h-24 rounded-xl p-1 sm:p-1.5 flex flex-col transition-colors text-left relative',
                  cell.inMonth ? 'bg-black/[0.02]' : 'bg-transparent',
                  has ? 'cursor-pointer hover:bg-primary/[0.07]' : 'cursor-default',
                  isSelected ? 'ring-2 ring-primary bg-primary/[0.07]' : '',
                ].join(' ')}
              >
                {/* Today is a filled marker, not a hairline ring — it should be
                    findable at a glance across a 42-cell grid. */}
                <span
                  className={[
                    'text-xs sm:text-sm font-semibold self-center sm:self-start shrink-0',
                    cell.isToday
                      ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold'
                      : cell.inMonth
                        ? 'text-foreground'
                        : 'text-muted/50',
                  ].join(' ')}
                >
                  {cell.day}
                </span>

                {/* Phones: dots. There is no width for a title at 7 columns. */}
                {has && (
                  <span className="sm:hidden flex items-center justify-center gap-0.5 mt-1">
                    {dayEvents.slice(0, MAX_DOTS).map((e, i) => {
                      const meta = OFFERING_TYPE_META[e.type]
                      return (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}
                        />
                      )
                    })}
                    {dayEvents.length > MAX_DOTS && (
                      <span className="text-[9px] font-bold text-muted ml-0.5">
                        +{dayEvents.length - MAX_DOTS}
                      </span>
                    )}
                  </span>
                )}

                {/* Wider screens: say what is actually on that day. A grid of
                    anonymous dots makes you click every one to find out. */}
                {has && (
                  <span className="hidden sm:flex flex-col gap-0.5 mt-1 w-full min-w-0">
                    {dayEvents.slice(0, MAX_CHIPS).map((e) => {
                      const meta = OFFERING_TYPE_META[e.type]
                      return (
                        <span
                          key={e.bookingId}
                          className="flex items-center gap-1 rounded-md bg-white px-1 py-0.5 min-w-0 shadow-sm"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}
                          />
                          <span className="text-[10px] font-semibold text-foreground truncate">
                            {e.timeLabel ? `${e.timeLabel} ` : ''}
                            {e.title}
                          </span>
                        </span>
                      )
                    })}
                    {dayEvents.length > MAX_CHIPS && (
                      <span className="text-[10px] font-bold text-muted pl-1">
                        +{dayEvents.length - MAX_CHIPS} more
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail */}
      {selected ? (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">
            {dayKeyLabel(selected)}
            <span className="text-muted font-sans text-sm font-normal ml-2">
              {selectedEvents.length} {selectedEvents.length === 1 ? 'activity' : 'activities'}
            </span>
          </h2>

          <div className="space-y-3">
            {selectedEvents.map((e) => {
              const meta = OFFERING_TYPE_META[e.type]
              const Icon = meta?.icon
              return (
                <Link
                  key={e.bookingId}
                  href={`/bookings/${e.bookingId}`}
                  className="clay-card p-4 flex items-center gap-4 group"
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'} group-hover:scale-105 transition-transform`}>
                    {Icon && <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground text-sm truncate">{e.title}</p>
                    <p className="text-xs text-muted">
                      {e.studentName}
                      {e.timeLabel ? ` · ${e.timeLabel}` : ''}
                      {e.mode && MODE_LABEL[e.mode] ? ` · ${MODE_LABEL[e.mode]}` : ''}
                      {e.location ? ` · ${e.location}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        /* An empty month should offer the next step, not just report the
           absence — booking something is the only thing that fills it. */
        <div className="clay-card p-6 sm:p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CalendarDays className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-display font-bold text-foreground">Nothing booked this month</p>
            <p className="text-muted text-sm">
              Activities show up here once they are booked and have a date.
            </p>
          </div>
          <Link
            href="/catalog"
            className="clay-button bg-cta text-white px-5 h-11 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            Browse activities
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
