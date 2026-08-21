import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, ArrowRight, HelpCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'
import { CalendarView, type CalEvent } from '@/components/calendar/calendar-view'
import { ChildSelector } from '@/components/recommendations/child-selector'
import {
  monthGrid,
  monthBoundsUtc,
  shiftMonth,
  monthLabel,
  istDateKey,
  istTimeLabel,
} from '@/lib/calendar/grid'

interface BookingRow {
  id: string
  student_id: string
  offerings: {
    title: string
    type: string
    mode: string | null
    location: string | null
    scheduled_at: string | null
  } | null
}

interface Child {
  student_id: string
  full_name: string | null
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; child?: string }>
}) {
  const { y, m, child } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'student') redirect('/dashboard')

  // The whole family shares one calendar; the filter narrows it to one person.
  const { data: kids } = await supabase.rpc('get_family_students')
  const family = ((kids ?? []) as Child[]).map((k) => ({ student_id: k.student_id, full_name: k.full_name }))
  const children = family.length > 0 ? family : [{ student_id: user.id, full_name: profile.full_name }]

  // Which month are we showing? Defaults to the current IST month.
  const todayKey = istDateKey(new Date())
  const [todayYear, todayMonth] = todayKey.split('-').map(Number)
  const year = Number(y) || todayYear
  const month = Math.min(12, Math.max(1, Number(m) || todayMonth))

  const { startIso, endIso } = monthBoundsUtc(year, month)
  const childFilter = child && children.some((c) => c.student_id === child) ? child : null

  // Only real, still-valid bookings belong on a calendar.
  let scheduledQuery = supabase
    .from('bookings')
    .select('id, student_id, offerings!inner(title, type, mode, location, scheduled_at)')
    .eq('payment_status', 'paid')
    .in('status', ['confirmed', 'completed'])
    .gte('offerings.scheduled_at', startIso)
    .lt('offerings.scheduled_at', endIso)

  let undatedQuery = supabase
    .from('bookings')
    .select('id, student_id, offerings!inner(title, type, mode, location, scheduled_at)')
    .eq('payment_status', 'paid')
    .in('status', ['confirmed', 'completed'])
    .is('offerings.scheduled_at', null)

  if (childFilter) {
    scheduledQuery = scheduledQuery.eq('student_id', childFilter)
    undatedQuery = undatedQuery.eq('student_id', childFilter)
  }

  const [{ data: scheduled }, { data: undated }] = (await Promise.all([
    scheduledQuery,
    undatedQuery,
  ])) as [{ data: BookingRow[] | null }, { data: BookingRow[] | null }]

  const nameOf = new Map(children.map((c) => [c.student_id, c.full_name?.split(' ')[0] ?? 'Student']))

  const events: CalEvent[] = (scheduled ?? [])
    .filter((b) => b.offerings?.scheduled_at)
    .map((b) => ({
      bookingId: b.id,
      title: b.offerings!.title,
      type: b.offerings!.type,
      mode: b.offerings!.mode,
      location: b.offerings!.location,
      studentName: nameOf.get(b.student_id) ?? 'Student',
      timeLabel: istTimeLabel(b.offerings!.scheduled_at!),
      dayKey: istDateKey(b.offerings!.scheduled_at!),
    }))
    .sort((a, b) => (a.dayKey + a.timeLabel).localeCompare(b.dayKey + b.timeLabel))

  const undatedRows = undated ?? []
  const cells = monthGrid(year, month, todayKey)

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)
  const qs = (yy: number, mm: number) =>
    `/calendar?y=${yy}&m=${mm}${childFilter ? `&child=${childFilter}` : ''}`

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="What's coming up"
        icon={CalendarDays}
        title="Calendar"
        subtitle="Every booked activity, laid out by date. Tap a highlighted day to see what's on."
      />

      {/* Month nav + child filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            href={qs(prev.year, prev.month)}
            aria-label="Previous month"
            className="w-10 h-10 rounded-xl clay-card flex items-center justify-center text-muted hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h2 className="font-display text-xl font-bold text-foreground min-w-[10rem] text-center">
            {monthLabel(year, month)}
          </h2>
          <Link
            href={qs(next.year, next.month)}
            aria-label="Next month"
            className="w-10 h-10 rounded-xl clay-card flex items-center justify-center text-muted hover:text-primary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
          {(year !== todayYear || month !== todayMonth) && (
            <Link
              href={qs(todayYear, todayMonth)}
              className="ml-1 text-sm font-semibold text-primary hover:underline"
            >
              Today
            </Link>
          )}
        </div>

        {children.length > 1 && (
          <ChildSelector
            children={children}
            selectedId={childFilter ?? ''}
            basePath="/calendar"
            allowAll
            preserveParams={{ y: year, m: month }}
          />
        )}
      </div>

      <Reveal>
        <CalendarView cells={cells} events={events} todayKey={todayKey} />
      </Reveal>

      {/* Activities with no fixed date still need to be visible somewhere. */}
      {undatedRows.length > 0 && (
        <Reveal delay={0.05}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted" />
              <h2 className="font-display text-lg font-bold text-foreground">No fixed date</h2>
            </div>
            <p className="text-sm text-muted -mt-1">
              These are booked but not scheduled yet, so they don&apos;t appear on the grid.
            </p>
            <div className="space-y-2">
              {undatedRows.map((b) => {
                const meta = OFFERING_TYPE_META[b.offerings!.type]
                const Icon = meta?.icon
                return (
                  <Link key={b.id} href={`/bookings/${b.id}`} className="clay-card p-4 flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-foreground text-sm truncate">{b.offerings!.title}</p>
                      <p className="text-xs text-muted">
                        {nameOf.get(b.student_id) ?? 'Student'} · {meta?.label ?? b.offerings!.type}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
