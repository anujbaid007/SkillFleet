import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wallet, ArrowDownLeft, ArrowUpRight, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'

interface TxRow {
  id: string
  student_id: string | null
  amount_paise: number
  type: string
  description: string | null
  created_at: string
}

interface Child {
  student_id: string
  full_name: string | null
}

function formatPrice(paise: number) {
  return `₹${(Math.abs(paise) / 100).toLocaleString('en-IN')}`
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function WalletPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') redirect('/dashboard')

  const [{ data: wallet }, { data: txs }, { data: kids }] = await Promise.all([
    supabase.from('wallets').select('balance_paise').maybeSingle(),
    supabase
      .from('wallet_transactions')
      .select('id, student_id, amount_paise, type, description, created_at')
      .order('created_at', { ascending: false })
      .limit(100) as unknown as Promise<{ data: TxRow[] | null }>,
    supabase.rpc('get_family_students'),
  ])

  const balance = wallet?.balance_paise ?? 0
  const rows = txs ?? []
  const childName = new Map(((kids ?? []) as Child[]).map((k) => [k.student_id, k.full_name ?? 'Student']))

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your balance"
        icon={Wallet}
        title="Wallet"
        subtitle="Refunds from cancelled bookings land here, and can be spent on any of your children's activities."
      />

      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-white/70 text-sm font-medium">Available balance</p>
              <p className="font-display text-4xl font-bold text-white mt-1">{formatPrice(balance)}</p>
              <p className="text-white/75 text-sm mt-2 max-w-sm">
                Use it at checkout — it covers as much of the total as it can, and you pay only the rest.
              </p>
            </div>
            <Link
              href="/cart"
              className="clay-button bg-white/15 text-white px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-white/25 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> Go to cart
            </Link>
          </div>
        </GradientCard>
      </Reveal>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Activity</h2>

        {rows.length === 0 ? (
          <div className="clay-card p-8 text-center space-y-2">
            <p className="font-display font-bold text-foreground">No wallet activity yet</p>
            <p className="text-muted text-sm max-w-sm mx-auto">
              If you cancel a booking at least 15 days before it runs, the amount you paid is refunded here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((t, i) => {
              const credit = t.amount_paise > 0
              return (
                <Reveal key={t.id} delay={Math.min(i * 0.03, 0.3)}>
                  <div className="clay-card p-4 flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        credit ? 'bg-green-50 text-green-600' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {credit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">
                        {t.description ?? (credit ? 'Refund' : 'Payment')}
                      </p>
                      <p className="text-xs text-muted">
                        {t.student_id && childName.get(t.student_id) ? `${childName.get(t.student_id)} · ` : ''}
                        {fmtDateTime(t.created_at)}
                      </p>
                    </div>
                    <span className={`font-display font-bold shrink-0 ${credit ? 'text-green-600' : 'text-foreground'}`}>
                      {credit ? '+' : '−'} {formatPrice(t.amount_paise)}
                    </span>
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
