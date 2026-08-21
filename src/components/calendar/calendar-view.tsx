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
const MAX_DOTS = 3

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
      <div className="clay-card p-3 sm:p-4">
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
                disabled={!has}
                className={[
                  'aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative',
                  cell.inMonth ? '' : 'opacity-35',
                  has ? 'cursor-pointer hover:bg-primary/[0.06]' : 'cursor-default',
                  isSelected ? 'ring-2 ring-primary bg-primary/[0.07]' : '',
                  cell.isToday && !isSelected ? 'ring-1 ring-primary/40' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-sm font-semibold',
                    cell.isToday ? 'text-primary font-bold' : 'text-foreground',
                  ].join(' ')}
                >
                  {cell.day}
                </span>

                {has && (
                  <span className="flex items-center gap-0.5">
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
                      <span className="text-[9px] font-bold text-muted ml-0.5">+{dayEvents.length - MAX_DOTS}</span>
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
        <div className="clay-card p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CalendarDays className="w-6 h-6 text-primary" />
          </div>
          <p className="font-display font-bold text-foreground">Nothing scheduled this month</p>
          <p className="text-muted text-sm">Booked activities with a date will appear here.</p>
        </div>
      )}
    </div>
  )
}
