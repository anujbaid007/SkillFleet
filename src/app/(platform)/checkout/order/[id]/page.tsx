import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { payOrderAction, failOrderAction } from './actions'

interface RawOrder {
  id: string
  family_id: string
  item_count: number
  subtotal_paise: number
  discount_percent: number
  discount_paise: number
  total_paise: number
  wallet_paise: number
  gateway_paise: number
  status: string
}

interface RawBooking {
  id: string
  student_id: string
  paid_paise: number | null
  price_paise: number
  offerings: { title: string } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
}

function formatPrice(paise: number) {
  return paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default async function OrderCheckoutPage({
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

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') redirect('/bookings')

  const { data: order } = (await supabase
    .from('orders')
    .select('id, family_id, item_count, subtotal_paise, discount_percent, discount_paise, total_paise, wallet_paise, gateway_paise, status')
    .eq('id', id)
    .single()) as unknown as { data: RawOrder | null }

  // RLS already limits orders to this family.
  if (!order) notFound()

  if (order.status === 'paid') {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="clay-card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Already paid</h1>
          <p className="text-muted text-sm">
            {order.item_count} {order.item_count === 1 ? 'activity is' : 'activities are'} confirmed.
          </p>
          <Link href="/bookings" className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold">
            View My Bookings →
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: bookings }, { data: kids }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, student_id, paid_paise, price_paise, offerings(title)')
      .eq('order_id', id) as unknown as Promise<{ data: RawBooking[] | null }>,
    supabase.rpc('get_family_students'),
  ])

  const childName = new Map(((kids ?? []) as RawChild[]).map((k) => [k.student_id, k.full_name ?? 'Student']))
  const rows = bookings ?? []

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
            <p className="font-display text-3xl font-bold text-white mt-1">{formatPrice(order.gateway_paise)}</p>
            {order.wallet_paise > 0 && (
              <p className="text-white/80 text-xs mt-1">
                + {formatPrice(order.wallet_paise)} from your wallet
              </p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Items */}
          <div className="rounded-xl bg-black/[0.02] p-4 space-y-2 text-sm max-h-56 overflow-y-auto">
            {rows.map((b) => (
              <div key={b.id} className="flex justify-between gap-3">
                <span className="text-muted min-w-0">
                  <span className="text-foreground">{b.offerings?.title ?? '—'}</span>
                  <span className="block text-xs">for {childName.get(b.student_id) ?? 'Student'}</span>
                </span>
                <span className="font-medium text-foreground shrink-0">
                  {formatPrice(b.paid_paise ?? b.price_paise)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{order.item_count} activities</span>
              <span className={order.discount_percent > 0 ? 'text-muted line-through' : 'text-foreground'}>
                {formatPrice(order.subtotal_paise)}
              </span>
            </div>
            {order.discount_percent > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Bulk discount ({order.discount_percent}% off)</span>
                <span>− {formatPrice(order.discount_paise)}</span>
              </div>
            )}
            {order.wallet_paise > 0 && (
              <div className="flex justify-between text-primary font-semibold">
                <span>Paid from wallet</span>
                <span>− {formatPrice(order.wallet_paise)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-black/[0.06]">
              <span className="font-medium text-foreground">Due now</span>
              <span className="font-bold text-foreground">{formatPrice(order.gateway_paise)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <form action={payOrderAction} className="space-y-2">
            <input type="hidden" name="order_id" value={order.id} />
            <button type="submit" className="clay-button bg-cta text-white w-full h-12 font-semibold text-base">
              {order.gateway_paise === 0 ? 'Confirm with wallet' : `Pay ${formatPrice(order.gateway_paise)}`}
            </button>
          </form>

          <form action={failOrderAction}>
            <input type="hidden" name="order_id" value={order.id} />
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
