import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { payPackageAction, failPackageAction } from './actions'

interface RawPackage {
  id: string
  parent_id: string
  student_id: string
  tier_id: string | null
  slot_count: number
  price_paise: number
  payment_status: string
  status: string
  pending_upgrade_tier_id: string | null
}

interface RawChild {
  student_id: string
  full_name: string | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function PackageCheckoutPage({
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
  if (profile?.role !== 'parent') redirect('/packages')

  const { data: pkg } = (await supabase
    .from('packages')
    .select('id, parent_id, student_id, tier_id, slot_count, price_paise, payment_status, status, pending_upgrade_tier_id')
    .eq('id', id)
    .single()) as unknown as { data: RawPackage | null }

  if (!pkg || pkg.parent_id !== user.id) notFound()

  // Determine what we're charging for.
  const isUpgrade = pkg.payment_status === 'paid' && pkg.pending_upgrade_tier_id != null
  const isPurchase = pkg.payment_status !== 'paid'

  // Nothing to pay → already active, no pending upgrade.
  if (!isUpgrade && !isPurchase) {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="clay-card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto text-2xl">✓</div>
          <h1 className="font-display text-xl font-bold text-foreground">Package active</h1>
          <p className="text-muted text-sm">This package is ready to use.</p>
          <Link href="/packages" className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold">
            View My Packages →
          </Link>
        </div>
      </div>
    )
  }

  // Resolve amount + label.
  let amount = pkg.price_paise
  let heading = `${pkg.slot_count}-slot package`
  const mode = isUpgrade ? 'upgrade' : 'purchase'

  if (isUpgrade) {
    const { data: newTier } = await supabase
      .from('package_tiers')
      .select('name, slot_count, price_paise')
      .eq('id', pkg.pending_upgrade_tier_id!)
      .single()
    amount = Math.max(0, (newTier?.price_paise ?? 0) - pkg.price_paise)
    heading = `Upgrade to ${newTier?.slot_count ?? '?'} slots`
  } else if (pkg.tier_id) {
    const { data: tier } = await supabase.from('package_tiers').select('name').eq('id', pkg.tier_id).single()
    if (tier?.name) heading = `${tier.name} · ${pkg.slot_count} slots`
  }

  const { data: kids } = await supabase.rpc('get_my_children')
  const childName = (kids as RawChild[] | null)?.find((k) => k.student_id === pkg.student_id)?.full_name ?? 'your child'

  return (
    <div className="max-w-md mx-auto space-y-4 pt-4">
      <div className="rounded-xl bg-accent-yellow/15 border border-accent-yellow/40 px-4 py-2.5 text-center">
        <p className="text-xs font-semibold text-foreground">⚠ TEST MODE — mock payment gateway</p>
        <p className="text-[11px] text-muted">No real money is charged. For testing the packages flow only.</p>
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
            <p className="font-display text-3xl font-bold text-white mt-1">{formatPrice(amount)}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl bg-black/[0.02] p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{isUpgrade ? 'Upgrade' : 'Package'}</span>
              <span className="font-medium text-foreground text-right">{heading}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">For</span>
              <span className="font-medium text-foreground">{childName}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-black/[0.06]">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-bold text-foreground">{formatPrice(amount)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <form action={payPackageAction} className="space-y-2">
            <input type="hidden" name="package_id" value={pkg.id} />
            <input type="hidden" name="mode" value={mode} />
            <button type="submit" className="clay-button bg-cta text-white w-full h-12 font-semibold text-base">
              Pay {formatPrice(amount)}
            </button>
          </form>

          <form action={failPackageAction}>
            <input type="hidden" name="package_id" value={pkg.id} />
            <input type="hidden" name="mode" value={mode} />
            <button
              type="submit"
              className="w-full h-10 rounded-xl border border-black/10 text-sm font-medium text-muted hover:text-red-600 hover:border-red-200 transition-colors"
            >
              Simulate failed payment
            </button>
          </form>

          <p className="text-center text-xs text-muted">
            <Link href="/packages" className="hover:underline">Cancel</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
