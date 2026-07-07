import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META, MODE_LABEL } from '@/lib/offering-meta'

interface RawBookingDetail {
  id: string
  student_id: string
  offering_id: string
  booked_by: string
  status: string
  payment_status: string
  price_paise: number
  created_at: string
  offerings: {
    title: string
    description: string | null
    type: string
    mode: string | null
    scheduled_at: string | null
    duration_minutes: number | null
    location: string | null
    min_age: number | null
    max_age: number | null
    topics: { name: string; categories: { name: string } | null } | null
  } | null
}

interface RawContribution {
  points: number
  growth_parameters: { name: string } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-purple-50 text-purple-700',
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()

  // RLS limits this to the student's own booking or the parent who booked it.
  const { data: booking } = (await supabase
    .from('bookings')
    .select('id, student_id, offering_id, booked_by, status, payment_status, price_paise, created_at, offerings(title, description, type, mode, scheduled_at, duration_minutes, location, min_age, max_age, topics(name, categories(name)))')
    .eq('id', id)
    .single()) as unknown as { data: RawBookingDetail | null }

  if (!booking || !booking.offerings) notFound()

  const o = booking.offerings
  const meta = OFFERING_TYPE_META[o.type]
  const TypeIcon = meta?.icon

  const { data: contributions } = (await supabase
    .from('offering_parameter_contributions')
    .select('points, growth_parameters(name)')
    .eq('offering_id', booking.offering_id)
    .gt('points', 0)) as unknown as { data: RawContribution[] | null }

  // Resolve the child's name (for a parent viewing their booking).
  let childName: string | null = null
  if (profile?.role === 'parent') {
    const { data: kids } = await supabase.rpc('get_my_children')
    childName = (kids as RawChild[] | null)?.find((k) => k.student_id === booking.student_id)?.full_name ?? null
  }

  const canPay =
    profile?.role === 'parent' &&
    booking.booked_by === user.id &&
    booking.payment_status !== 'paid' &&
    booking.status !== 'cancelled'

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to My Bookings
      </Link>

      {/* Gradient hero */}
      <Reveal>
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
          style={{ background: 'linear-gradient(135deg, #7447E1 0%, #8B5CF6 45%, #9333EA 70%, #14B8A6 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
          />
          <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-white/[0.06] blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                {TypeIcon && <TypeIcon className="w-7 h-7 text-white" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  {meta?.label ?? o.type}
                </span>
                {o.mode && MODE_LABEL[o.mode] && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                    {MODE_LABEL[o.mode]}
                  </span>
                )}
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{o.title}</h1>
            {o.topics?.categories && (
              <p className="text-white/70 text-sm mt-1.5">
                {o.topics.categories.name} · {o.topics.name}
              </p>
            )}
            {childName && <p className="text-white/85 text-sm mt-3">Booked for {childName}</p>}
          </div>
        </div>
      </Reveal>

      {/* Booking status */}
      <Reveal delay={0.05}>
        <div className="clay-card p-6 space-y-4">
          <h2 className="font-display font-bold text-foreground">Booking</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Payment</p>
              <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[booking.payment_status] ?? ''}`}>
                {booking.payment_status}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Status</p>
              <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[booking.status] ?? ''}`}>
                {booking.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Amount</p>
              <p className="font-display text-lg font-bold text-foreground">{formatPrice(booking.price_paise)}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Booked</p>
              <p className="font-semibold text-foreground mt-1">{fmtDate(booking.created_at)}</p>
            </div>
          </div>

          {canPay && (
            <Link
              href={`/checkout/${booking.id}`}
              className="inline-flex items-center gap-1.5 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
            >
              {booking.payment_status === 'failed' ? 'Retry payment' : 'Complete payment'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </Reveal>

      {/* Offering details */}
      <Reveal delay={0.1}>
        <div className="clay-card p-6 space-y-4">
          <h2 className="font-display font-bold text-foreground">Details</h2>
          {o.description && <p className="text-muted text-sm">{o.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {o.mode && MODE_LABEL[o.mode] && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Mode</p>
                <p className="font-semibold text-foreground mt-1">{MODE_LABEL[o.mode]}</p>
              </div>
            )}
            {o.scheduled_at && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Date</p>
                <p className="font-semibold text-foreground mt-1">{fmtDate(o.scheduled_at)}</p>
              </div>
            )}
            {o.location && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Location</p>
                <p className="font-semibold text-foreground mt-1">{o.location}</p>
              </div>
            )}
            {(o.min_age || o.max_age) && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Ages</p>
                <p className="font-semibold text-foreground mt-1">
                  {o.min_age ?? '0'}–{o.max_age ?? '18+'}
                </p>
              </div>
            )}
          </div>

          {(contributions ?? []).length > 0 && (
            <div className="pt-4 border-t border-black/[0.06]">
              <p className="text-xs text-muted uppercase tracking-wide mb-2 font-semibold">Grows these skills</p>
              <div className="flex flex-wrap gap-2">
                {(contributions ?? []).map((c, i) => (
                  <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-teal/10 text-accent-teal">
                    {c.growth_parameters?.name ?? 'Skill'} +{c.points}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  )
}
