import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BookOfferingForm } from '@/components/catalog/book-offering-form'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META, OFFERING_STATUS_META, MODE_LABEL } from '@/lib/offering-meta'

interface RawOfferingDetail {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  mode: string | null
  price_paise: number
  min_age: number | null
  max_age: number | null
  scheduled_at: string | null
  duration_minutes: number | null
  location: string | null
  topics: { name: string; categories: { name: string } | null } | null
}

interface RawContribution {
  points: number
  growth_parameters: { name: string } | null
}

interface RawChild {
  student_id: string
  full_name: string | null
  date_of_birth: string | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function OfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: offering } = (await supabase
    .from('offerings')
    .select('id, title, description, type, status, mode, price_paise, min_age, max_age, scheduled_at, duration_minutes, location, topics(name, categories(name))')
    .eq('id', id)
    .single()) as unknown as { data: RawOfferingDetail | null }

  if (!offering) notFound()

  const { data: contributions } = (await supabase
    .from('offering_parameter_contributions')
    .select('points, growth_parameters(name)')
    .eq('offering_id', id)
    .gt('points', 0)) as unknown as { data: RawContribution[] | null }

  let childrenList: RawChild[] = []
  let packageOptions: { id: string; student_id: string; slots_remaining: number }[] = []
  if (profile?.role === 'parent') {
    const [{ data: kids }, { data: pkgs }] = await Promise.all([
      supabase.rpc('get_my_children'),
      supabase
        .from('packages')
        .select('id, student_id, slot_count, slots_used, valid_until')
        .eq('status', 'active')
        .eq('payment_status', 'paid'),
    ])
    childrenList = (kids ?? []) as RawChild[]
    const now = Date.now()
    packageOptions = (pkgs ?? [])
      .filter(
        (p) =>
          p.slots_used < p.slot_count &&
          (p.valid_until == null || new Date(p.valid_until).getTime() > now)
      )
      .map((p) => ({ id: p.id, student_id: p.student_id, slots_remaining: p.slot_count - p.slots_used }))
  }

  const meta = OFFERING_TYPE_META[offering.type]
  const TypeIcon = meta?.icon
  const status = OFFERING_STATUS_META[offering.status]

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Explore
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
                  {meta?.label ?? offering.type}
                </span>
                {status && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                    {status.label}
                  </span>
                )}
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{offering.title}</h1>
            {offering.topics?.categories && (
              <p className="text-white/70 text-sm mt-1.5">
                {offering.topics.categories.name} · {offering.topics.name}
              </p>
            )}
            {offering.description && <p className="text-white/85 text-sm mt-3 max-w-xl">{offering.description}</p>}
          </div>
        </div>
      </Reveal>

      {/* Details + skills */}
      <Reveal delay={0.05}>
        <div className="clay-card p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Price</p>
              <p className="font-display text-lg font-bold text-foreground">{formatPrice(offering.price_paise)}</p>
            </div>
            {offering.mode && MODE_LABEL[offering.mode] && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Mode</p>
                <p className="font-semibold text-foreground mt-1">{MODE_LABEL[offering.mode]}</p>
              </div>
            )}
            {(offering.min_age || offering.max_age) && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Ages</p>
                <p className="font-semibold text-foreground mt-1">
                  {offering.min_age ?? '0'}–{offering.max_age ?? '18+'}
                </p>
              </div>
            )}
            {offering.scheduled_at && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Date</p>
                <p className="font-semibold text-foreground mt-1">
                  {new Date(offering.scheduled_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {offering.location && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Location</p>
                <p className="font-semibold text-foreground mt-1">{offering.location}</p>
              </div>
            )}
          </div>

          {(contributions ?? []).length > 0 && (
            <div className="pt-4 border-t border-black/[0.06]">
              <p className="text-xs text-muted uppercase tracking-wide mb-2 font-semibold">Grows these skills</p>
              <div className="flex flex-wrap gap-2">
                {(contributions ?? []).map((c, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-teal/10 text-accent-teal"
                  >
                    {c.growth_parameters?.name ?? 'Skill'} +{c.points}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {offering.status !== 'live' ? (
        <div className="clay-card p-5 text-sm text-muted">
          {offering.status === 'planned'
            ? 'This offering is planned — booking opens once it goes live.'
            : 'This offering has ended and is no longer open for booking.'}
        </div>
      ) : profile?.role === 'parent' ? (
        childrenList.length > 0 ? (
          <BookOfferingForm
            offeringId={offering.id}
            offeringMinAge={offering.min_age}
            offeringMaxAge={offering.max_age}
            childrenList={childrenList}
            packages={packageOptions}
          />
        ) : (
          <div className="clay-card p-5 text-sm text-muted">
            Link a child&apos;s account before booking.{' '}
            <Link href="/children" className="text-primary hover:underline font-medium">
              Link a child →
            </Link>
          </div>
        )
      ) : (
        <div className="clay-card p-5 text-sm text-muted">
          Ask a parent or guardian to book this offering for you.
        </div>
      )}
    </div>
  )
}
