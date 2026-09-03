import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sprout, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { SkillLadder, SkillHighlights, type SkillRow } from '@/components/profile/skill-ladder'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { ASSESSMENT_COMING_SOON } from '@/lib/launch'
import { ComingSoonPill } from '@/components/ui/coming-soon-pill'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { RankCard, type RankInfo } from '@/components/dashboard/rank-card'

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
  // Admins and vendors have their own consoles.
  if (profile.role !== 'student') redirect('/dashboard')

  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

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

  const { data: rankRows } = await supabase.rpc('get_student_rank', { p_student_id: user.id })
  const rank = ((rankRows ?? []) as RankInfo[])[0] ?? null

  const levels = (rawLevels ?? []) as ScoreLevel[]

  // Every active parameter gets a card, whether or not it has been scored yet —
  // the assessment is optional, and completing an activity awards points on top
  // of a zero baseline, so the breakdown must exist for it to land in.
  const parameterScores = (rawParameters ?? []).map((gp) => {
    const row = (rawScores ?? []).find((s) => s.parameter_id === gp.id)
    const total = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
    const displayPct = internalToDisplay(total)
    const level = scoreLevelFor(displayPct, levels)
    return {
      parameterId: gp.id,
      name: gp.name,
      total,
      percent: displayPct,
      levelName: level?.name ?? 'Seed',
      levelColorClass: level?.color_class ?? 'text-accent-yellow',
    }
  }) satisfies SkillRow[]

  const avgTotal =
    parameterScores.length > 0
      ? Math.round(parameterScores.reduce((s, p) => s + p.total, 0) / parameterScores.length)
      : 0
  const avgDisplay = internalToDisplay(avgTotal)
  const avgLevel = scoreLevelFor(avgDisplay, levels)
  const hasPoints = parameterScores.some((p) => p.total > 0)

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

      {/* The assessment is optional, so this is a prompt rather than a gate. */}
      {!profile.onboarding_completed && (
        <Reveal delay={0.04}>
          <div className="clay-card p-5 flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-pink flex items-center justify-center text-white shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-foreground text-sm">
                {hasPoints ? 'Set your baseline scores' : 'Your scores start at zero'}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {hasPoints
                  ? 'These points came from activities you finished. The starter assessment fills in where you already stand across every skill.'
                  : 'Take the starter assessment to set a baseline, or just book an activity — finishing one adds points here either way.'}
              </p>
            </div>
            {ASSESSMENT_COMING_SOON ? (
              <ComingSoonPill onLight className="shrink-0" />
            ) : (
              <Link
                href="/onboarding"
                className="clay-button bg-cta text-white px-5 h-10 text-sm font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                Start the assessment <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </Reveal>
      )}

      {rank && (
        <Reveal delay={0.05}>
          <RankCard rank={rank} />
        </Reveal>
      )}

      <Reveal delay={0.06}>
        <SkillHighlights skills={parameterScores} />
      </Reveal>

      <Reveal delay={0.08}>
        <SkillLadder skills={parameterScores} />
      </Reveal>
    </div>
  )
}
