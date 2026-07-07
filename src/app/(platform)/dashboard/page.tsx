import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Award, ShoppingBag, Baby, TrendingUp, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'

const ACTION_GRADIENT: Record<string, string> = {
  primary: 'from-primary to-primary-light',
  teal: 'from-accent-teal to-primary',
  pink: 'from-accent-pink to-accent-purple',
  yellow: 'from-accent-yellow to-accent-pink',
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

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  // ── Student view ─────────────────────────────────────────────────────
  if (profile.role === 'student') {
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

    const [{ data: rawScores }, { data: rawParameters }, { data: rawLevels }] =
      await Promise.all([
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
      ])

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

        {/* Vibrant quick actions */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Jump back in</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Reveal delay={0.05}>
              <QuickAction href="/catalog" label="Explore" desc="Workshops, trips & events" icon={BookOpen} accent="primary" />
            </Reveal>
            <Reveal delay={0.1}>
              <QuickAction href="/certificates" label="Certificates" desc="Upload achievements" icon={Award} accent="pink" />
            </Reveal>
            <Reveal delay={0.15}>
              <QuickAction href="/bookings" label="My Bookings" desc="What you've booked" icon={ShoppingBag} accent="yellow" />
            </Reveal>
          </div>
        </div>
      </div>
    )
  }

  // ── Parent view ──────────────────────────────────────────────────────
  if (profile.role === 'parent') {
    const { data: children } = await supabase.rpc('get_my_children')
    const kids = children ?? []

    return (
      <div className="space-y-7">
        <Reveal>
          <GradientCard className="p-6 sm:p-8">
            <p className="text-white/70 text-sm font-medium">Welcome back</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-0.5">
              {firstName} 👋
            </h1>
            <p className="text-white/75 text-sm mt-2 max-w-md">
              Track and support your children&apos;s growth journey — all in one place.
            </p>
          </GradientCard>
        </Reveal>

        {kids.length === 0 ? (
          <Reveal delay={0.05}>
            <div className="clay-card p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Baby className="w-7 h-7 text-primary" />
              </div>
              <p className="font-display font-bold text-foreground">No children linked yet</p>
              <p className="text-muted text-sm max-w-sm mx-auto">
                Link your child&apos;s SkillFleet account to start tracking their growth.
              </p>
              <Link
                href="/children"
                className="inline-flex items-center gap-1.5 mt-1 clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
              >
                Link a child <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        ) : (
          <div>
            <h2 className="font-display text-lg font-bold text-foreground mb-3">Your Children</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kids.map((child, i) => (
                <Reveal key={child.student_id} delay={i * 0.08}>
                  <div className="clay-card p-5 space-y-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center flex-shrink-0">
                          <span className="text-base font-bold text-white">
                            {child.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-foreground truncate">{child.full_name ?? 'Student'}</p>
                          <p className="text-xs text-muted truncate">{child.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/children/${child.student_id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-white text-sm font-semibold py-2.5 hover:bg-primary/90 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" /> Progress
                        </Link>
                        <Link
                          href="/children"
                          className="rounded-xl border border-black/10 text-muted text-sm font-medium px-4 py-2.5 hover:text-foreground hover:border-black/20 transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Reveal delay={0.05}>
              <QuickAction href="/catalog" label="Explore" desc="Find offerings for your child" icon={BookOpen} accent="primary" />
            </Reveal>
            <Reveal delay={0.1}>
              <QuickAction href="/bookings" label="My Bookings" desc="Track & complete payments" icon={ShoppingBag} accent="teal" />
            </Reveal>
          </div>
        </div>
      </div>
    )
  }

  // Admins are redirected by the platform layout before reaching here.
  redirect('/login')
}
