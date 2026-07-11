import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'

interface RawBooking {
  id: string
  status: string
  payment_status: string
  price_paise: number
  booked_by: string
  created_at: string
  offerings: { title: string; type: string; scheduled_at: string | null } | null
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

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; failed?: string; redeemed?: string }>
}) {
  const { paid, failed, redeemed } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  const isParent = profile?.role === 'parent'

  const { data: bookings } = (await supabase
    .from('bookings')
    .select('id, status, payment_status, price_paise, booked_by, created_at, offerings(title, type, scheduled_at)')
    .order('created_at', { ascending: false })) as unknown as { data: RawBooking[] | null }

  const rows = bookings ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your activity"
        icon={ShoppingBag}
        title="My Bookings"
        subtitle="Everything booked through SkillFleet."
      />

      {paid && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Payment successful — your booking is confirmed! 🎉
        </div>
      )}
      {redeemed && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Package slot redeemed — your booking is confirmed! 🎉
        </div>
      )}
      {failed && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Payment didn&apos;t go through. You can retry from the booking below.
        </div>
      )}

      {rows.length === 0 ? (
        <Reveal delay={0.05}>
          <div className="clay-card p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <p className="font-display font-bold text-foreground">No bookings yet</p>
            <p className="text-muted text-sm max-w-xs mx-auto">
              Browse workshops, trips, and events, then book one to see it here.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 mt-1 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
            >
              Explore offerings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      ) : (
        <div className="space-y-3">
          {rows.map((b, i) => {
            const needsPayment =
              isParent && b.booked_by === user.id && b.payment_status !== 'paid' && b.status !== 'cancelled'
            const meta = OFFERING_TYPE_META[b.offerings?.type ?? '']
            const Icon = meta?.icon
            return (
              <Reveal key={b.id} delay={Math.min(i * 0.05, 0.3)}>
                <Link href={`/bookings/${b.id}`} className="clay-card p-4 relative overflow-hidden block group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${meta?.tint ?? 'from-primary/[0.06]'} to-transparent pointer-events-none`} />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'} group-hover:scale-105 transition-transform`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-foreground text-sm truncate">{b.offerings?.title ?? '—'}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {meta?.label ?? b.offerings?.type} · {fmtDate(b.offerings?.scheduled_at ?? null)} · {formatPrice(b.price_paise)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[b.payment_status] ?? ''}`}>
                          {b.payment_status}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[b.status] ?? ''}`}>
                          {b.status}
                        </span>
                      </div>
                      {needsPayment && (
                        <span className="text-xs font-bold text-primary whitespace-nowrap">
                          {b.payment_status === 'failed' ? 'Payment failed · tap to retry' : 'Payment due · tap to pay'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}
