import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { payAction, failAction } from './actions'

interface RawBooking {
  id: string
  student_id: string
  status: string
  payment_status: string
  price_paise: number
  booked_by: string
  offerings: { title: string; type: string; scheduled_at: string | null } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Payments are parent-only.
  if (profile?.role !== 'parent') redirect('/bookings')

  const { data: booking } = (await supabase
    .from('bookings')
    .select('id, student_id, status, payment_status, price_paise, booked_by, offerings(title, type, scheduled_at)')
    .eq('id', id)
    .single()) as unknown as { data: RawBooking | null }

  // RLS already limits parents to their own bookings; this is a friendly guard.
  if (!booking || booking.booked_by !== user.id) notFound()

  // Resolve the child's name for the summary.
  const { data: kids } = await supabase.rpc('get_my_children')
  const childName =
    (kids as RawChild[] | null)?.find((k) => k.student_id === booking.student_id)?.full_name ?? 'your child'

  if (booking.payment_status === 'paid') {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="clay-card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Already paid</h1>
          <p className="text-muted text-sm">This booking is confirmed.</p>
          <Link href="/bookings" className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold">
            View My Bookings →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pt-4">
      {/* TEST MODE banner — this is a mock gateway, no real money moves. */}
      <div className="rounded-xl bg-accent-yellow/15 border border-accent-yellow/40 px-4 py-2.5 text-center">
        <p className="text-xs font-semibold text-foreground">⚠ TEST MODE — mock payment gateway</p>
        <p className="text-[11px] text-muted">No real money is charged. For testing the booking flow only.</p>
      </div>

      <div className="clay-card overflow-hidden">
        <div
          className="relative p-6 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7447E1 0%, #8B5CF6 50%, #14B8A6 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
          />
          <div className="relative z-10">
            <p className="text-white/75 text-xs uppercase tracking-wider font-bold">SkillFleet Pay</p>
            <p className="font-display text-3xl font-bold text-white mt-1">{formatPrice(booking.price_paise)}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
        <div className="rounded-xl bg-black/[0.02] p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Offering</span>
            <span className="font-medium text-foreground text-right">{booking.offerings?.title ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">For</span>
            <span className="font-medium text-foreground">{childName}</span>
          </div>
          {booking.offerings?.scheduled_at && (
            <div className="flex justify-between">
              <span className="text-muted">Date</span>
              <span className="font-medium text-foreground">
                {new Date(booking.offerings.scheduled_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-black/[0.06]">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-bold text-foreground">{formatPrice(booking.price_paise)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        {booking.payment_status === 'failed' && !error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            Your last attempt was declined. Try again below.
          </p>
        )}

        <form action={payAction} className="space-y-2">
          <input type="hidden" name="booking_id" value={booking.id} />
          <button
            type="submit"
            className="clay-button bg-cta text-white w-full h-12 font-semibold text-base"
          >
            Pay {formatPrice(booking.price_paise)}
          </button>
        </form>

        <form action={failAction}>
          <input type="hidden" name="booking_id" value={booking.id} />
          <button
            type="submit"
            className="w-full h-10 rounded-xl border border-black/10 text-sm font-medium text-muted hover:text-red-600 hover:border-red-200 transition-colors"
          >
            Simulate failed payment
          </button>
        </form>

        <p className="text-center text-xs text-muted">
          <Link href="/bookings" className="hover:underline">Cancel and pay later</Link>
        </p>
        </div>
      </div>
    </div>
  )
}
