import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'

interface RawPackage {
  id: string
  parent_id: string
  student_id: string
  slot_count: number
  slots_used: number
  price_paise: number
  status: string
  payment_status: string
  valid_until: string | null
}

interface RawRedemption {
  id: string
  status: string
  created_at: string
  offerings: { title: string; type: string; scheduled_at: string | null } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PackageDetailPage({
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

  const { data: profile } = await supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single()
  const isParent = profile?.role === 'parent'
  const isStudent = profile?.role === 'student'
  if (!isParent && !isStudent) redirect('/dashboard')

  const { data: pkg } = (await supabase
    .from('packages')
    .select('id, parent_id, student_id, slot_count, slots_used, price_paise, status, payment_status, valid_until')
    .eq('id', id)
    .single()) as unknown as { data: RawPackage | null }

  // Parents see packages they bought; students see packages bought for them.
  if (!pkg || (isParent ? pkg.parent_id !== user.id : pkg.student_id !== user.id)) notFound()

  const { data: redemptions } = (await supabase
    .from('bookings')
    .select('id, status, created_at, offerings(title, type, scheduled_at)')
    .eq('package_id', id)
    .order('created_at', { ascending: false })) as unknown as { data: RawRedemption[] | null }

  let childName: string
  if (isParent) {
    const { data: kids } = await supabase.rpc('get_my_children')
    childName = (kids as RawChild[] | null)?.find((k) => k.student_id === pkg.student_id)?.full_name ?? 'Your child'
  } else {
    childName = profile?.full_name ?? 'Student'
  }

  const remaining = Math.max(0, pkg.slot_count - pkg.slots_used)
  const usedPct = pkg.slot_count > 0 ? Math.round((pkg.slots_used / pkg.slot_count) * 100) : 0
  const rows = redemptions ?? []
  const isLive = pkg.status === 'active' && pkg.payment_status === 'paid'
  const isExpired = pkg.valid_until != null && new Date(pkg.valid_until).getTime() < Date.now()
  const canBook = isParent && isLive && !isExpired && remaining > 0

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/packages" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Packages
      </Link>

      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium">Package</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                {childName}&apos;s package
              </h1>
              <p className="text-white/75 text-sm mt-2">
                {remaining} of {pkg.slot_count} slots left · expires {fmtDate(pkg.valid_until)}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white font-display font-bold text-2xl shrink-0">
              {pkg.slot_count}
            </div>
          </div>
          <div className="mt-5">
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${usedPct}%` }} />
            </div>
            <p className="text-xs text-white/70 mt-1.5">{pkg.slots_used} used · {remaining} remaining</p>
          </div>
        </GradientCard>
      </Reveal>

      {canBook && (
        <Reveal delay={0.05}>
          <Link
            href={`/packages/${pkg.id}/book`}
            className="clay-card p-5 flex items-center gap-4 group hover:-translate-y-0.5 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-foreground">Book offerings with this package</p>
              <p className="text-sm text-muted">
                Pick one or several offerings and redeem {remaining} remaining slot{remaining === 1 ? '' : 's'} at once.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </Reveal>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Booked with this package</h2>
        {rows.length === 0 ? (
          <Reveal delay={0.05}>
            <div className="clay-card p-8 text-center space-y-2">
              <p className="font-display font-bold text-foreground">No slots redeemed yet</p>
              <p className="text-muted text-sm max-w-xs mx-auto">
                {isParent
                  ? 'Book an offering and choose “Use a package slot” to redeem from this package.'
                  : 'When a parent books an offering with this package, it will show up here.'}
              </p>
              {isParent && (
                <Link href={`/packages/${pkg.id}/book`} className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
                  Book offerings <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </Reveal>
        ) : (
          <div className="space-y-3">
            {rows.map((b, i) => {
              const meta = OFFERING_TYPE_META[b.offerings?.type ?? '']
              const Icon = meta?.icon
              return (
                <Reveal key={b.id} delay={Math.min(i * 0.05, 0.3)}>
                  <Link href={`/bookings/${b.id}`} className="clay-card p-4 flex items-center gap-4 group">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'} group-hover:scale-105 transition-transform`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-foreground text-sm truncate">{b.offerings?.title ?? '—'}</p>
                      <p className="text-xs text-muted">
                        {meta?.label ?? b.offerings?.type} · {fmtDate(b.offerings?.scheduled_at ?? null)}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize bg-green-50 text-green-700 shrink-0">
                      {b.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
