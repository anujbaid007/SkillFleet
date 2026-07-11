import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Store } from 'lucide-react'
import { BookOfferingForm } from '@/components/catalog/book-offering-form'
import { NotifyMeButton } from '@/components/requests/notify-me-button'
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
  image_url: string | null
  interest_count: number
  interest_threshold: number
  source: string
  vendor_id: string | null
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
    .select('id, title, description, type, status, mode, price_paise, min_age, max_age, scheduled_at, duration_minutes, location, image_url, interest_count, interest_threshold, source, vendor_id, topics(name, categories(name))')
    .eq('id', id)
    .single()) as unknown as { data: RawOfferingDetail | null }

  if (!offering) notFound()

  let vendorOrg: string | null = null
  if (offering.source === 'vendor' && offering.vendor_id) {
    const { data: v } = await supabase.from('vendors').select('org_name').eq('id', offering.vendor_id).maybeSingle()
    vendorOrg = v?.org_name ?? null
  }

  // For a planned offering, whether the viewer is already on the notify list.
  let interested = false
  if (offering.status === 'planned') {
    const { data: mine } = await supabase
      .from('offering_interest')
      .select('offering_id')
      .eq('offering_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    interested = mine != null
  }

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
    <div className="space-y-6">
      <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Explore
      </Link>

      {/* Hero — cover image when set, type-coded gradient otherwise.
          The background layer has a fixed height and the text is overlaid at the
          bottom, so a block image always fills the box edge-to-edge. */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl">
          {offering.image_url ? (
            <div
              role="img"
              aria-label={offering.title}
              className="w-full h-64 sm:h-80"
              style={{ backgroundImage: `url("${offering.image_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
          ) : (
            <div
              className="relative w-full h-64 sm:h-80"
              style={{ background: 'linear-gradient(135deg, #7447E1 0%, #8B5CF6 45%, #9333EA 70%, #14B8A6 100%)' }}
            >
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
              />
              <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-white/[0.06] blur-2xl" />
            </div>
          )}

          {/* Dark overlay for legible text over any background */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5 pointer-events-none" />

          {/* Text, anchored bottom-left */}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {TypeIcon && <TypeIcon className="w-3.5 h-3.5" />} {meta?.label ?? offering.type}
              </span>
              {status && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                  {status.label}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{offering.title}</h1>
            {offering.topics?.categories && (
              <p className="text-white/80 text-sm mt-1.5">
                {offering.topics.categories.name} · {offering.topics.name}
              </p>
            )}
            {vendorOrg && (
              <p className="text-white/75 text-xs mt-1.5 inline-flex items-center gap-1">
                <Store className="w-3.5 h-3.5" /> By {vendorOrg}
              </p>
            )}
            {offering.description && (
              <p className="text-white/85 text-sm mt-2 max-w-xl line-clamp-2">{offering.description}</p>
            )}
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

      {offering.status === 'planned' ? (
        <Reveal delay={0.1}>
          <div className="clay-card p-6 space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-yellow/[0.08] to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-accent-yellow/15 text-accent-yellow">Planned</span>
                <p className="font-display font-bold text-foreground mt-2">Not running yet — but it could be</p>
                <p className="text-sm text-muted mt-1">
                  We&apos;re gauging interest before we schedule this. Add yourself to the list and we&apos;ll let you know
                  the moment it goes live.
                </p>
              </div>

              <div className="max-w-sm">
                <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-yellow to-accent-pink"
                    style={{ width: `${offering.interest_threshold > 0 ? Math.min(100, Math.round((offering.interest_count / offering.interest_threshold) * 100)) : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1.5">
                  <span className="font-bold text-foreground">{offering.interest_count}</span> of {offering.interest_threshold} interested
                </p>
              </div>

              <NotifyMeButton offeringId={offering.id} interested={interested} />
            </div>
          </div>
        </Reveal>
      ) : offering.status !== 'live' ? (
        <div className="clay-card p-5 text-sm text-muted">
          This offering has ended and is no longer open for booking.
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
