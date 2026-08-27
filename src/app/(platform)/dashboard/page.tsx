import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  Award,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Star,
  X,
  ShoppingCart,
  Wallet,
  CalendarDays,
  UserCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { OFFERING_TYPE_META } from '@/lib/offering-meta'
import { removeFromShortlistAction } from '@/app/actions/shortlist'
import { SchoolRejectedNotice } from '@/components/platform/school-rejected-notice'

const ACTION_GRADIENT: Record<string, string> = {
  primary: 'from-primary to-primary-light',
  teal: 'from-accent-teal to-primary',
  pink: 'from-accent-pink to-accent-purple',
  yellow: 'from-accent-yellow to-accent-pink',
  purple: 'from-accent-purple to-primary',
}

interface ShortlistRow {
  student_id: string
  offering_id: string
  offerings: {
    title: string
    type: string
    price_paise: number
    status: string
    review_status: string
  } | null
}

function formatPrice(pricePaise: number) {
  return pricePaise === 0 ? 'Free' : `₹${(pricePaise / 100).toLocaleString('en-IN')}`
}

/** Only things that are still live and approved are worth surfacing. */
function bookable(rows: ShortlistRow[]) {
  return rows.filter((r) => r.offerings?.status === 'live' && r.offerings?.review_status === 'approved')
}

function QuickAction({
  href,
  label,
  desc,
  icon: Icon,
  accent,
}: {
  href: string
  label: string
  desc: string
  icon: typeof BookOpen
  accent: keyof typeof ACTION_GRADIENT
}) {
  return (
    <Link href={href} className="clay-card p-4 flex items-center gap-3 group">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${ACTION_GRADIENT[accent]} group-hover:scale-105 transition-transform`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-foreground text-sm">{label}</p>
        <p className="text-xs text-muted truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  // Admins and vendors are redirected by the platform layout before reaching here.
  if (profile.role !== 'student') redirect('/login')

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  if (!profile.onboarding_completed) {
    return (
      <div className="space-y-6">
        <Reveal>
          <GradientCard className="p-6 sm:p-10">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl mb-4">
              🌱
            </div>
            <p className="text-white/70 text-sm font-medium">Welcome aboard, {firstName}!</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 max-w-lg">
              Take your starter assessment to unlock your Growth Profile
            </h1>
            <p className="text-white/75 text-sm mt-2 max-w-lg">
              A quick 3-step assessment sets your baseline scores across every skill. It only takes
              about 5 minutes.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 mt-5 bg-white text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Start now <ArrowRight className="w-4 h-4" />
            </Link>
          </GradientCard>
        </Reveal>

        <Reveal delay={0.08}>
          <QuickAction
            href="/catalog"
            label="Prefer to explore first?"
            desc="Browse workshops, trips, and events anytime"
            icon={BookOpen}
            accent="teal"
          />
        </Reveal>
      </div>
    )
  }

  const [
    { data: rawScores },
    { data: rawParameters },
    { data: rawLevels },
    { data: familyRows },
    { data: pendingRows },
    { data: schoolReview },
  ] = await Promise.all([
    supabase
      .from('student_parameter_scores')
      .select('parameter_id, baseline_score, accrued_score')
      .eq('student_id', user.id),
    supabase
      .from('growth_parameters')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('score_levels')
      .select('id, name, min_score, max_score, color_class, display_order')
      .order('display_order'),
    supabase.rpc('get_family_students'),
    supabase.rpc('get_pending_family_members'),
    supabase.rpc('get_my_school_review_status'),
  ])

  // An admin rejected the school this student typed in. Told, not redirected —
  // nothing they can do right now is actually blocked.
  const rejectedSchool =
    (
      (schoolReview ?? []) as {
        school_name: string
        review_status: string
        review_notes: string | null
      }[]
    ).find((s) => s.review_status === 'rejected') ?? null

  const levels = (rawLevels ?? []) as ScoreLevel[]

  const parameterScores = (rawParameters ?? []).map((gp) => {
    const row = (rawScores ?? []).find((s) => s.parameter_id === gp.id)
    const total = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
    const level = scoreLevelFor(internalToDisplay(total), levels)
    return {
      parameterId: gp.id,
      name: gp.name,
      total,
      levelName: level?.name ?? 'Seed',
      levelColorClass: level?.color_class ?? 'text-accent-yellow',
    }
  })

  const avgTotal =
    parameterScores.length > 0
      ? Math.round(parameterScores.reduce((s, p) => s + p.total, 0) / parameterScores.length)
      : 0
  const avgDisplay = internalToDisplay(avgTotal)
  const avgLevel = scoreLevelFor(avgDisplay, levels)
  const top3 = [...parameterScores].sort((a, b) => b.total - a.total).slice(0, 3)

  const family = familyRows ?? []
  const siblings = family.filter((m) => m.student_id !== user.id)
  const pending = pendingRows ?? []

  // Everything the family has saved. RLS already limits this to our own family.
  const { data: rawShortlist } = await supabase
    .from('student_shortlist')
    .select('student_id, offering_id, offerings(title, type, price_paise, status, review_status)')
    .order('created_at', { ascending: false })
    .limit(24)

  const shortlist = bookable((rawShortlist ?? []) as unknown as ShortlistRow[])
  const mine = shortlist.filter((r) => r.student_id === user.id).slice(0, 8)
  const theirs = shortlist.filter((r) => r.student_id !== user.id).slice(0, 6)
  const nameOf = new Map(family.map((m) => [m.student_id, m.full_name?.split(' ')[0] ?? 'Student']))

  return (
    <div className="space-y-7">
      {/* Big gradient hero with growth ring */}
      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium">Welcome back</p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                {firstName} 👋
              </h1>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5">
                <span className="text-base">🌱</span>
                <span className="text-white text-sm font-semibold">
                  {avgLevel?.name ?? 'Seed'} · {avgTotal} avg pts
                </span>
              </div>
              <p className="text-white/70 text-sm mt-2.5">
                Growing across {parameterScores.length} skills. Keep it up!
              </p>
            </div>
            <ProgressRing percent={avgDisplay} variant="light" size={132}>
              <span className="font-display text-3xl font-bold text-white">{avgDisplay}%</span>
              <span className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">growth</span>
            </ProgressRing>
          </div>
        </GradientCard>
      </Reveal>

      {/* A sibling is waiting to be let into the family */}
      {pending.length > 0 && (
        <Reveal delay={0.04}>
          <Link href="/family" className="clay-card p-4 flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-pink flex items-center justify-center text-white shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-foreground text-sm">
                {pending.length === 1
                  ? `${pending[0].full_name?.split(' ')[0] ?? 'Someone'} wants to join your family`
                  : `${pending.length} accounts want to join your family`}
              </p>
              <p className="text-xs text-muted truncate">
                They signed up with the same parent email. Review and approve.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </Reveal>
      )}

      {rejectedSchool && (
        <Reveal delay={0.045}>
          <SchoolRejectedNotice
            schoolName={rejectedSchool.school_name}
            reason={rejectedSchool.review_notes}
          />
        </Reveal>
      )}

      {/* Colourful strengths */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-teal" /> Your Strengths
          </h2>
          <Link href="/profile" className="text-sm text-primary hover:underline font-medium">
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {top3.map((p, i) => (
            <Reveal key={p.parameterId} delay={i * 0.08}>
              <ParameterCard
                name={p.name}
                total={p.total}
                levelName={p.levelName}
                levelColorClass={p.levelColorClass}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Brothers and sisters on this account */}
      {siblings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-foreground">Your family</h2>
            <Link href="/family" className="text-sm text-primary hover:underline font-medium">
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siblings.map((sibling, i) => (
              <Reveal key={sibling.student_id} delay={i * 0.08}>
                <Link href={`/family/${sibling.student_id}`} className="clay-card p-5 block relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-bold text-white">
                        {sibling.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {sibling.full_name ?? 'Student'}
                      </p>
                      <p className="text-xs text-muted truncate">{sibling.email}</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* Saved for later — mine */}
      {mine.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Your shortlist</h2>
          <p className="text-sm text-muted mb-3">
            Saved for later. Open one to add it to the cart, or remove what you no longer want.
          </p>
          <div className="space-y-2">
            {mine.map((r, i) => {
              const meta = OFFERING_TYPE_META[r.offerings!.type]
              const Icon = meta?.icon
              return (
                <Reveal key={r.offering_id} delay={Math.min(i * 0.04, 0.2)}>
                  <div className="clay-card p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <Link href={`/catalog/${r.offering_id}`} className="flex-1 min-w-0 group">
                      <p className="font-display font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {r.offerings!.title}
                      </p>
                      <p className="text-xs text-muted inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-accent-yellow fill-current" /> Shortlisted ·{' '}
                        {formatPrice(r.offerings!.price_paise)}
                      </p>
                    </Link>
                    <form action={removeFromShortlistAction}>
                      <input type="hidden" name="offering_id" value={r.offering_id} />
                      <button
                        type="submit"
                        aria-label={`Remove ${r.offerings!.title} from shortlist`}
                        title="Remove from shortlist"
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      )}

      {/* Saved for later — siblings */}
      {theirs.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Shortlisted in your family</h2>
          <p className="text-sm text-muted mb-3">Activities your brothers and sisters picked out.</p>
          <div className="space-y-2">
            {theirs.map((r, i) => {
              const meta = OFFERING_TYPE_META[r.offerings!.type]
              const Icon = meta?.icon
              return (
                <Reveal key={r.student_id + r.offering_id} delay={Math.min(i * 0.04, 0.2)}>
                  <Link href={`/catalog/${r.offering_id}`} className="clay-card p-4 flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${meta?.gradient ?? 'from-primary to-primary-light'}`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-foreground text-sm truncate">{r.offerings!.title}</p>
                      <p className="text-xs text-muted">
                        <span className="text-accent-yellow font-semibold">★ {nameOf.get(r.student_id) ?? 'Sibling'}</span>
                        {' · '}
                        {formatPrice(r.offerings!.price_paise)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">Book →</span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      )}

      {/* Vibrant quick actions */}
      <div>
        <h2 className="font-display text-lg font-bold text-foreground mb-3">Jump back in</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Reveal delay={0.05}>
            <QuickAction href="/catalog" label="Explore" desc="Workshops, trips & events" icon={BookOpen} accent="primary" />
          </Reveal>
          <Reveal delay={0.1}>
            <QuickAction href="/cart" label="Cart" desc="Book several, pay less" icon={ShoppingCart} accent="teal" />
          </Reveal>
          <Reveal delay={0.15}>
            <QuickAction href="/wallet" label="Wallet" desc="Balance & refunds" icon={Wallet} accent="purple" />
          </Reveal>
          <Reveal delay={0.2}>
            <QuickAction href="/calendar" label="Calendar" desc="What's coming up" icon={CalendarDays} accent="yellow" />
          </Reveal>
          <Reveal delay={0.25}>
            <QuickAction href="/bookings" label="My Bookings" desc="Track & complete payments" icon={ShoppingBag} accent="pink" />
          </Reveal>
          <Reveal delay={0.3}>
            <QuickAction href="/certificates" label="Certificates" desc="Upload achievements" icon={Award} accent="primary" />
          </Reveal>
        </div>
      </div>
    </div>
  )
}
