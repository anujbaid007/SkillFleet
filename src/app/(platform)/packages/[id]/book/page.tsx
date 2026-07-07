import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { BulkBookForm } from '@/components/packages/bulk-book-form'

interface RawPackage {
  id: string
  parent_id: string
  student_id: string
  slot_count: number
  slots_used: number
  status: string
  payment_status: string
  valid_until: string | null
}

interface RawOffering {
  id: string
  title: string
  type: string
  price_paise: number
  scheduled_at: string | null
  min_age: number | null
  max_age: number | null
  topics: { categories: { name: string } | null } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
  date_of_birth: string | null
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

export default async function BulkBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'parent') redirect('/dashboard')

  const { data: pkg } = (await supabase
    .from('packages')
    .select('id, parent_id, student_id, slot_count, slots_used, status, payment_status, valid_until')
    .eq('id', id)
    .single()) as unknown as { data: RawPackage | null }

  if (!pkg || pkg.parent_id !== user.id) notFound()

  const [{ data: kids }, { data: offerings }, { data: booked }] = await Promise.all([
    supabase.rpc('get_my_children'),
    supabase
      .from('offerings')
      .select('id, title, type, price_paise, scheduled_at, min_age, max_age, topics(categories(name))')
      .eq('status', 'live')
      .order('scheduled_at', { ascending: true }) as unknown as Promise<{ data: RawOffering[] | null }>,
    supabase
      .from('bookings')
      .select('offering_id')
      .eq('student_id', pkg.student_id)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled') as unknown as Promise<{ data: { offering_id: string }[] | null }>,
  ])

  const child = (kids as RawChild[] | null)?.find((k) => k.student_id === pkg.student_id)
  const childName = child?.full_name ?? 'Your child'
  const age = ageFromDob(child?.date_of_birth ?? null)
  const remaining = Math.max(0, pkg.slot_count - pkg.slots_used)

  const bookedIds = new Set((booked ?? []).map((b) => b.offering_id))

  const eligible = (offerings ?? [])
    .filter((o) => !bookedIds.has(o.id))
    .filter((o) => {
      if (age == null) return true
      if (o.min_age != null && age < o.min_age) return false
      if (o.max_age != null && age > o.max_age) return false
      return true
    })
    .map((o) => ({
      id: o.id,
      title: o.title,
      type: o.type,
      price_paise: o.price_paise,
      scheduled_at: o.scheduled_at,
      category: o.topics?.categories?.name ?? null,
    }))

  const notActive = pkg.status !== 'active' || pkg.payment_status !== 'paid'
  const expired = pkg.valid_until != null && new Date(pkg.valid_until).getTime() < Date.now()

  return (
    <div className="max-w-3xl space-y-6">
      <Link href={`/packages/${id}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to package
      </Link>

      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium">Redeem slots</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                Book for {childName}
              </h1>
              <p className="text-white/75 text-sm mt-1.5">
                Pick up to {remaining} offering{remaining === 1 ? '' : 's'} to book at once — one slot each.
              </p>
            </div>
          </div>
        </GradientCard>
      </Reveal>

      {notActive ? (
        <div className="clay-card p-6 text-sm text-muted">
          This package isn&apos;t active yet. Complete payment from the{' '}
          <Link href={`/packages/${id}`} className="text-primary hover:underline font-medium">
            package page
          </Link>{' '}
          first.
        </div>
      ) : expired ? (
        <div className="clay-card p-6 text-sm text-muted">This package has expired, so its slots can no longer be redeemed.</div>
      ) : remaining === 0 ? (
        <div className="clay-card p-6 text-sm text-muted">All slots in this package have been used.</div>
      ) : eligible.length === 0 ? (
        <div className="clay-card p-8 text-center space-y-2">
          <p className="font-display font-bold text-foreground">Nothing new to book</p>
          <p className="text-muted text-sm max-w-xs mx-auto">
            Every live offering suitable for {childName} is already booked. Check back as new offerings go live.
          </p>
          <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
            Browse Explore →
          </Link>
        </div>
      ) : (
        <Reveal delay={0.05}>
          <BulkBookForm packageId={id} remaining={remaining} offerings={eligible} />
        </Reveal>
      )}
    </div>
  )
}
