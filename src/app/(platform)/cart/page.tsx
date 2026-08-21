import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, ArrowRight, Trash2, Sparkles, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'
import { cartTotals, nextBand, MAX_CART_ITEMS } from '@/lib/commerce/discount'
import { removeFromCartAction, clearCartAction } from './actions'
import { CheckoutBar } from '@/components/cart/checkout-bar'

interface CartRow {
  id: string
  student_id: string
  offering_id: string
  offerings: { title: string; type: string; price_paise: number; scheduled_at: string | null } | null
}

interface Child {
  student_id: string
  full_name: string | null
}

function formatPrice(paise: number) {
  return paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') redirect('/dashboard')

  const [{ data: items }, { data: kids }, { data: wallet }] = await Promise.all([
    supabase
      .from('cart_items')
      .select('id, student_id, offering_id, offerings(title, type, price_paise, scheduled_at)')
      .order('created_at', { ascending: true }) as unknown as Promise<{ data: CartRow[] | null }>,
    supabase.rpc('get_family_students'),
    supabase.from('wallets').select('balance_paise').maybeSingle(),
  ])

  const rows = (items ?? []).filter((r) => r.offerings)
  const childName = new Map(((kids ?? []) as Child[]).map((k) => [k.student_id, k.full_name ?? 'Student']))
  const walletBalance = wallet?.balance_paise ?? 0

  const totals = cartTotals(rows.map((r) => r.offerings!.price_paise))
  const upgrade = nextBand(totals.count)

  if (rows.length === 0) {
    return (
      <div className="space-y-7">
        <PageHeader eyebrow="Your basket" icon={ShoppingCart} title="Cart" subtitle="Activities you're about to book." />
        <Reveal>
          <div className="clay-card p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <ShoppingCart className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">Your cart is empty</p>
            <p className="text-muted text-sm max-w-sm mx-auto">
              Add activities from Explore, or let the AI build a whole year for your child.
            </p>
            <div className="flex items-center gap-3 justify-center flex-wrap pt-1">
              <Link href="/catalog" className="clay-button bg-cta text-white px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5">
                Browse activities <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <Sparkles className="w-4 h-4 text-primary" /> Or ask the assistant to plan the year
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your basket"
        icon={ShoppingCart}
        title="Cart"
        subtitle={`${totals.count} of ${MAX_CART_ITEMS} activities · book them all in one payment.`}
      />

      {/* Discount nudge */}
      {upgrade && (
        <Reveal>
          <div className="clay-card p-4 flex items-center gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-yellow/[0.1] to-transparent pointer-events-none" />
            <Sparkles className="relative z-10 w-5 h-5 text-accent-yellow shrink-0" />
            <p className="relative z-10 text-sm text-foreground">
              Add <span className="font-bold">{upgrade.itemsAway}</span> more{' '}
              {upgrade.itemsAway === 1 ? 'activity' : 'activities'} to unlock{' '}
              <span className="font-bold text-accent-yellow">{upgrade.percent}% off</span> the whole cart.
            </p>
          </div>
        </Reveal>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {rows.map((r, i) => {
            const o = r.offerings!
            const meta = OFFERING_TYPE_META[o.type]
            const Icon = meta?.icon
            const date = fmtDate(o.scheduled_at)
            return (
              <Reveal key={r.id} delay={Math.min(i * 0.03, 0.3)}>
                <div className="clay-card p-4 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                    {Icon && <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/catalog/${r.offering_id}`} className="font-display font-bold text-foreground text-sm hover:text-primary transition-colors truncate block">
                      {o.title}
                    </Link>
                    <p className="text-xs text-muted">
                      For <span className="font-semibold text-foreground">{childName.get(r.student_id) ?? 'Student'}</span>
                      {' · '}{meta?.label ?? o.type}{date ? ` · ${date}` : ''}
                    </p>
                  </div>
                  <span className="font-display font-bold text-foreground shrink-0">{formatPrice(o.price_paise)}</span>
                  <form action={removeFromCartAction}>
                    <input type="hidden" name="cart_item_id" value={r.id} />
                    <button
                      type="submit"
                      aria-label="Remove from cart"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </Reveal>
            )
          })}

          <form action={clearCartAction}>
            <button type="submit" className="text-xs text-muted hover:text-red-600 transition-colors">
              Clear cart
            </button>
          </form>
        </div>

        {/* Summary */}
        <Reveal delay={0.05}>
          <div className="clay-card p-5 space-y-4 lg:sticky lg:top-4">
            <h2 className="font-display font-bold text-foreground">Order summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">{totals.count} activities</span>
                <span className={totals.discountPercent > 0 ? 'text-muted line-through' : 'font-semibold text-foreground'}>
                  {formatPrice(totals.subtotalPaise)}
                </span>
              </div>
              {totals.discountPercent > 0 && (
                <div className="flex items-center justify-between text-green-600 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50">
                      {totals.discountPercent}% OFF
                    </span>
                    Bulk discount
                  </span>
                  <span>− {formatPrice(totals.discountPaise)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
                <span className="font-display font-bold text-foreground">Total</span>
                <span className="font-display text-xl font-bold text-foreground">{formatPrice(totals.totalPaise)}</span>
              </div>
            </div>

            {walletBalance > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted bg-primary/[0.06] rounded-xl px-3 py-2">
                <Wallet className="w-4 h-4 text-primary shrink-0" />
                Wallet balance {formatPrice(walletBalance)} — you can use it at checkout.
              </div>
            )}

            <CheckoutBar walletBalancePaise={walletBalance} totalPaise={totals.totalPaise} />
          </div>
        </Reveal>
      </div>
    </div>
  )
}
