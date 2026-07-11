import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { RecommendationTeaser } from '@/components/recommendations/recommendation-teaser'

export default async function ProfilePage() {
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
  // Profile is student-only; parents and admins have their own views.
  if (profile.role !== 'student') redirect('/dashboard')

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  // The assessment is optional — an un-onboarded student sees an empty profile
  // with a prompt to complete it, rather than being force-redirected.
  if (!profile.onboarding_completed) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {firstName}&apos;s Growth Profile
          </h1>
          <p className="text-muted mt-1 text-sm">
            Your scores appear here once you complete the starter assessment.
          </p>
        </div>
        <div className="clay-card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl mx-auto">
            🌱
          </div>
          <p className="font-medium text-foreground">Your growth profile is empty</p>
          <p className="text-muted text-sm max-w-md mx-auto">
            Take the quick starter assessment to set your baseline scores across all skills.
          </p>
          <Link
            href="/onboarding"
            className="inline-block clay-button bg-cta text-white px-6 py-2.5 text-sm font-semibold"
          >
            Start the assessment →
          </Link>
        </div>
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
    const displayPct = internalToDisplay(total)
    const level = scoreLevelFor(displayPct, levels)
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

  return (
    <div className="space-y-6">
      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium">Growth Profile</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                {firstName}&apos;s skills
              </h1>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5">
                <span className="text-base">🌱</span>
                <span className="text-white text-sm font-semibold">
                  {avgLevel?.name ?? 'Seed'} · {avgTotal} avg pts
                </span>
              </div>
              <p className="text-white/70 text-sm mt-2.5 max-w-md">
                Across {parameterScores.length} growth parameters. Points grow as you complete
                activities on SkillFleet.
              </p>
            </div>
            <ProgressRing percent={avgDisplay} variant="light" size={128}>
              <span className="font-display text-3xl font-bold text-white">{avgDisplay}%</span>
              <span className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">growth</span>
            </ProgressRing>
          </div>
        </GradientCard>
      </Reveal>

      <Reveal>
        <RecommendationTeaser name={firstName} />
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parameterScores.map((p, i) => (
          <Reveal key={p.parameterId} delay={Math.min(i * 0.05, 0.4)}>
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
  )
}
