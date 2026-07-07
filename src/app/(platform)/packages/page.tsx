import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Layers, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { BuyPackageSection } from '@/components/packages/buy-package-section'
import { UpgradePackage } from '@/components/packages/upgrade-package'
import { StudentPackages } from '@/components/packages/student-packages'

interface RawPackage {
  id: string
  student_id: string
  tier_id: string | null
  slot_count: number
  slots_used: number
  price_paise: number
  status: string
  payment_status: string
  pending_upgrade_tier_id: string | null
  valid_until: string | null
}

interface RawTier {
  id: string
  name: string
  slot_count: number
  price_paise: number
  validity_days: number
  description: string | null
}

interface RawChild {
  student_id: string
  full_name: string | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; failed?: string }>
}) {
  const { paid, failed } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()

  // Students get a read-only view of the packages a parent bought for them.
  if (profile?.role === 'student') {
    const { data: studentPkgs } = (await supabase
      .from('packages')
      .select('id, slot_count, slots_used, status, payment_status, valid_until')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })) as unknown as {
      data: { id: string; slot_count: number; slots_used: number; status: string; payment_status: string; valid_until: string | null }[] | null
    }
    return <StudentPackages packages={studentPkgs ?? []} />
  }

  if (profile?.role !== 'parent') redirect('/dashboard')

  const [{ data: packages }, { data: tiers }, { data: kids }] = await Promise.all([
    supabase
      .from('packages')
      .select('id, student_id, tier_id, slot_count, slots_used, price_paise, status, payment_status, pending_upgrade_tier_id, valid_until')
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: RawPackage[] | null }>,
    supabase
      .from('package_tiers')
      .select('id, name, slot_count, price_paise, validity_days, description')
      .eq('is_active', true)
      .order('display_order') as unknown as Promise<{ data: RawTier[] | null }>,
    supabase.rpc('get_my_children'),
  ])

  const childName = new Map((kids as RawChild[] | null)?.map((k) => [k.student_id, k.full_name ?? 'Student']) ?? [])
  const tierList = tiers ?? []
  const owned = (packages ?? []).filter((p) => p.status !== 'cancelled')
  const childrenList = (kids as RawChild[] | null) ?? []

  // Children who already hold a live package can't buy another (they upgrade instead).
  const nowMs = Date.now()
  const packagedStudentIds = [
    ...new Set(
      owned
        .filter(
          (p) =>
            ['active', 'pending'].includes(p.status) &&
            p.payment_status !== 'failed' &&
            (p.valid_until == null || new Date(p.valid_until).getTime() > nowMs) &&
            p.slots_used < p.slot_count
        )
        .map((p) => p.student_id)
    ),
  ]

  return (
    <div className="space-y-7 max-w-4xl">
      <PageHeader
        eyebrow="Plan ahead"
        icon={Layers}
        title="Packages"
        subtitle="Buy a bundle of slots for a child and redeem one per booking through the year."
      />

      {paid && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Payment successful — your package is ready! 🎉
        </div>
      )}
      {failed && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Payment didn&apos;t go through. You can retry from the package below.
        </div>
      )}

      {/* Owned packages */}
      {owned.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Your packages</h2>
          {owned.map((p, i) => {
            const remaining = Math.max(0, p.slot_count - p.slots_used)
            const usedPct = p.slot_count > 0 ? Math.round((p.slots_used / p.slot_count) * 100) : 0
            const needsPay = p.payment_status !== 'paid'
            const upgradePending = p.payment_status === 'paid' && p.pending_upgrade_tier_id != null
            return (
              <Reveal key={p.id} delay={Math.min(i * 0.05, 0.3)}>
                <div className="clay-card p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Link href={`/packages/${p.id}`} className="flex items-center gap-3 min-w-0 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
                          {p.slot_count}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-1">
                            {childName.get(p.student_id) ?? 'Student'}&apos;s package
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-xs text-muted">
                            {needsPay
                              ? `${p.payment_status === 'failed' ? 'Payment failed' : 'Awaiting payment'} · ${formatPrice(p.price_paise)}`
                              : `${remaining} of ${p.slot_count} slots left · expires ${fmtDate(p.valid_until)}`}
                          </p>
                        </div>
                      </Link>
                      {!needsPay && !upgradePending && (
                        <UpgradePackage
                          packageId={p.id}
                          currentSlots={p.slot_count}
                          currentPricePaise={p.price_paise}
                          tiers={tierList.map((t) => ({ id: t.id, slot_count: t.slot_count, price_paise: t.price_paise }))}
                        />
                      )}
                    </div>

                    {!needsPay && (
                      <div>
                        <div className="h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent-teal" style={{ width: `${usedPct}%` }} />
                        </div>
                        <p className="text-xs text-muted mt-1">{p.slots_used} used · {remaining} remaining</p>
                      </div>
                    )}

                    {needsPay && (
                      <Link
                        href={`/checkout/package/${p.id}`}
                        className="inline-flex items-center gap-1.5 clay-button bg-cta text-white px-5 py-2.5 text-sm font-semibold"
                      >
                        {p.payment_status === 'failed' ? 'Retry payment' : 'Complete payment'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}

                    {upgradePending && (
                      <Link
                        href={`/checkout/package/${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-accent-yellow/15 text-accent-yellow px-4 py-2 text-sm font-bold"
                      >
                        Upgrade pending — complete payment <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      )}

      {/* Buy */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          {owned.length > 0 ? 'Buy another package' : 'Buy a package'}
        </h2>
        {childrenList.length === 0 ? (
          <div className="clay-card p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-2xl">👶</div>
            <p className="font-display font-bold text-foreground">Link a child first</p>
            <p className="text-muted text-sm max-w-xs mx-auto">
              Packages are bought for a specific child. Link one to get started.
            </p>
            <Link
              href="/children"
              className="inline-flex items-center gap-1.5 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
            >
              Link a child <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : tierList.length === 0 ? (
          <div className="clay-card p-8 text-center text-muted text-sm">No packages are available right now.</div>
        ) : (
          <Reveal delay={0.05}>
            <BuyPackageSection childrenList={childrenList} tiers={tierList} packagedStudentIds={packagedStudentIds} />
          </Reveal>
        )}
      </div>
    </div>
  )
}
