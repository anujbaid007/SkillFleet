import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Compass, Bell } from 'lucide-react'
import { CatalogStatusFilter } from '@/components/catalog/status-filter'
import { PageHeader } from '@/components/ui/page-header'
import { Reveal } from '@/components/ui/reveal'
import { OFFERING_TYPE_META, OFFERING_STATUS_META } from '@/lib/offering-meta'
import { calculateAge, isAgeEligible } from '@/lib/utils/age'

interface RawOffering {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  price_paise: number
  min_age: number | null
  max_age: number | null
  scheduled_at: string | null
  image_url: string | null
  interest_count: number
  topics: { id: string; name: string; category_id: string; categories: { id: string; name: string } | null } | null
}

interface RawCategory {
  id: string
  name: string
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string; status?: string }>
}) {
  const { category: categoryFilter, type: typeFilter, status: statusFilter } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: offerings }, { data: categories }] = (await Promise.all([
    supabase
      .from('offerings')
      .select('id, title, description, type, status, price_paise, min_age, max_age, scheduled_at, image_url, interest_count, topics(id, name, category_id, categories(id, name))')
      .in('status', ['planned', 'live', 'completed'])
      .order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('display_order'),
  ])) as [{ data: RawOffering[] | null }, { data: RawCategory[] | null }]

  // Who are we filtering "age-appropriate" and "already booked" against?
  // Age is judged against the whole family — one suitable sibling keeps it visible.
  let learners: { id: string; dob: string | null }[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, date_of_birth')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'student') {
      // Everyone in the family — an activity stays visible if any sibling can book it.
      const { data: family } = await supabase.rpc('get_family_students')
      const rows = (family ?? []) as { student_id: string; date_of_birth: string | null }[]
      learners = rows.length
        ? rows.map((k) => ({ id: k.student_id, dob: k.date_of_birth }))
        : [{ id: user.id, dob: profile.date_of_birth }]
    }
  }

  // Offerings already paid for, per learner.
  const bookedByLearner = new Map<string, Set<string>>()
  if (learners.length > 0) {
    const { data: booked } = await supabase
      .from('bookings')
      .select('student_id, offering_id')
      .in('student_id', learners.map((l) => l.id))
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
    for (const b of booked ?? []) {
      const set = bookedByLearner.get(b.student_id) ?? new Set<string>()
      set.add(b.offering_id)
      bookedByLearner.set(b.student_id, set)
    }
  }

  /** Is there at least one learner who could still book this? */
  function bookableBySomeone(o: RawOffering): boolean {
    if (learners.length === 0) return true // signed out / admin preview — don't over-filter
    return learners.some((l) => {
      if (bookedByLearner.get(l.id)?.has(o.id)) return false
      if (!l.dob) return true
      const age = calculateAge(l.dob)
      return isAgeEligible(age, o.min_age, o.max_age)
    })
  }

  const nowMs = Date.now()
  const isUpcoming = (o: RawOffering) =>
    o.scheduled_at == null || new Date(o.scheduled_at).getTime() >= nowMs

  let rows = offerings ?? []
  if (typeFilter) rows = rows.filter((o) => o.type === typeFilter)
  if (categoryFilter) rows = rows.filter((o) => o.topics?.category_id === categoryFilter)

  if (statusFilter === 'planned' || statusFilter === 'completed') {
    rows = rows.filter((o) => o.status === statusFilter)
  } else if (statusFilter === 'all') {
    // Everything, unfiltered — the explicit "show me the lot" escape hatch.
  } else {
    // Default: only what this family can actually book right now.
    rows = rows.filter((o) => o.status === 'live' && isUpcoming(o) && bookableBySomeone(o))
  }

  const buildHref = (o: { type?: string | null; category?: string | null }) => {
    const params = new URLSearchParams()
    const t = 'type' in o ? o.type : typeFilter
    const c = 'category' in o ? o.category : categoryFilter
    if (t) params.set('type', t)
    if (c) params.set('category', c)
    if (statusFilter) params.set('status', statusFilter)
    const qs = params.toString()
    return `/catalog${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Discover"
        icon={Compass}
        title="Explore"
        subtitle="Workshops, trips, events, competitions, and internships that grow real skills."
      />

      <Reveal delay={0.05}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildHref({ type: null })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${!typeFilter ? 'bg-primary text-white' : 'bg-white text-muted border border-black/10 hover:text-foreground'}`}
            >
              All types
            </Link>
            {Object.entries(OFFERING_TYPE_META).map(([value, meta]) => (
              <Link
                key={value}
                href={buildHref({ type: value })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${typeFilter === value ? 'bg-primary text-white' : 'bg-white text-muted border border-black/10 hover:text-foreground'}`}
              >
                {meta.label}
              </Link>
            ))}
            <div className="ml-auto">
              <CatalogStatusFilter status={statusFilter} type={typeFilter} category={categoryFilter} />
            </div>
          </div>

          {(categories ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ category: null })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!categoryFilter ? 'border-primary text-primary bg-primary/5' : 'border-black/10 text-muted hover:text-foreground'}`}
              >
                All categories
              </Link>
              {(categories ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={buildHref({ category: c.id })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryFilter === c.id ? 'border-primary text-primary bg-primary/5' : 'border-black/10 text-muted hover:text-foreground'}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {rows.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="clay-card p-12 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-foreground">Nothing here yet</p>
            <p className="text-muted text-sm max-w-md mx-auto">
              {statusFilter
                ? 'No activities match these filters — try a different type or category.'
                : 'Nothing left to book here right now. Activities already booked, or outside your child’s age range, are hidden — switch to “Show everything” to see the full catalogue.'}
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((o, i) => {
            const meta = OFFERING_TYPE_META[o.type]
            const Icon = meta?.icon
            const status = OFFERING_STATUS_META[o.status]
            return (
              <Reveal key={o.id} delay={Math.min(i * 0.05, 0.4)}>
                <Link href={`/catalog/${o.id}`} className="clay-card p-0 flex flex-col h-full group overflow-hidden">
                  {/* Cover image (or a type-coded gradient fallback). Rendered as a
                      background so it always fills the box, matching the fallback exactly.
                      shrink-0 guarantees the 40-tall image never compresses in the flex column. */}
                  <div className="relative h-40 w-full shrink-0 overflow-hidden">
                    {o.image_url ? (
                      <div
                        role="img"
                        aria-label={o.title}
                        className="absolute inset-0 group-hover:scale-105 transition-transform duration-300"
                        style={{ backgroundImage: `url("${o.image_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    ) : (
                      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                        {Icon && <Icon className="w-10 h-10 text-white/90" />}
                      </div>
                    )}
                    {/* Consistent hairline frame so cover-image and gradient cards read with equal weight */}
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.07] pointer-events-none" />
                    {/* Type chip (top-left) + status (top-right) overlays */}
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-foreground backdrop-blur-sm">
                      {Icon && <Icon className="w-3 h-3" />} {meta?.label ?? o.type}
                    </span>
                    {status && (
                      <span className={`absolute top-2.5 right-2.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${status.badge}`}>
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Info below */}
                  <div className="flex flex-col flex-1 p-5">
                    {o.topics?.categories && (
                      <span className="text-xs text-muted truncate mb-1">{o.topics.categories.name}</span>
                    )}
                    <h2 className="font-display font-bold text-foreground leading-snug">{o.title}</h2>
                    {o.description && <p className="text-xs text-muted line-clamp-2 mt-1">{o.description}</p>}
                    <div className="flex items-center justify-between pt-3 mt-auto">
                      <span className="font-display text-lg font-bold text-foreground">{formatPrice(o.price_paise)}</span>
                      {o.status === 'planned' ? (
                        <span className="text-xs text-accent-yellow font-semibold inline-flex items-center gap-1">
                          <Bell className="w-3 h-3" /> {o.interest_count} interested
                        </span>
                      ) : (
                        (o.min_age || o.max_age) && (
                          <span className="text-xs text-muted font-medium">
                            Ages {o.min_age ?? '0'}–{o.max_age ?? '18+'}
                          </span>
                        )
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
