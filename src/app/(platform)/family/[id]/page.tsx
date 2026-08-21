import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { scoreLevelFor, internalToDisplay } from '@/lib/scoring'
import type { ScoreLevel } from '@/lib/scoring/types'
import { ParameterCard } from '@/components/dashboard/parameter-card'
import { ProgressRing } from '@/components/dashboard/progress-ring'
import { Reveal } from '@/components/ui/reveal'
import { GradientCard } from '@/components/ui/gradient-card'
import { RankCard, type RankInfo } from '@/components/dashboard/rank-card'

interface RawChild {
  student_id: string
  full_name: string | null
  email: string
  date_of_birth: string | null
}

interface RawContribution {
  id: string
  source_type: string
  points: number
  description: string | null
  created_at: string
  growth_parameters: { name: string } | null
}

const SOURCE_LABEL: Record<string, string> = {
  baseline_test: 'Starter assessment',
  baseline_cert: 'Certificate approved',
  baseline_cert_approval: 'Certificate approved',
  baseline_questionnaire: 'Onboarding questionnaire',
  offering_completion: 'Offering completed',
  cert_rejection: 'Certificate rejected',
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ChildProgressPage({
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

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') redirect('/dashboard')

  // Your own profile lives at /profile; this page is for the rest of the family.
  if (id === user.id) redirect('/profile')

  // Only active members of your family are reachable. get_family_students is
  // the authorised view — if the id isn't in it, it isn't your family.
  const { data: kids } = await supabase.rpc('get_family_students')
  const child = (kids as RawChild[] | null)?.find((k) => k.student_id === id)
  if (!child) notFound()

  const firstName = child.full_name?.split(' ')[0] ?? 'Your sibling'

  // Where they stand within their age band (family members are authorised).
  const { data: rankRows } = await supabase.rpc('get_student_rank', { p_student_id: id })
  const rank = ((rankRows ?? []) as RankInfo[])[0] ?? null

  const [{ data: rawScores }, { data: rawParameters }, { data: rawLevels }, { data: rawContributions }] =
    await Promise.all([
      supabase
        .from('student_parameter_scores')
        .select('parameter_id, baseline_score, accrued_score')
        .eq('student_id', id),
      supabase.from('growth_parameters').select('id, name, display_order').eq('is_active', true).order('display_order'),
      supabase.from('score_levels').select('id, name, min_score, max_score, color_class, display_order').order('display_order'),
      supabase
        .from('score_contributions')
        .select('id, source_type, points, description, created_at, growth_parameters(name)')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(15),
    ])

  const levels = (rawLevels ?? []) as ScoreLevel[]
  const contributions = (rawContributions ?? []) as unknown as RawContribution[]

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

  // Points accrue from completed activities on top of a zero baseline, so the
  // breakdown is always shown — an un-onboarded sibling simply reads as zeros.
  const hasPoints = parameterScores.some((p) => p.total > 0)

  // Overall = average total across all parameters.
  const avgTotal =
    parameterScores.length > 0
      ? Math.round(parameterScores.reduce((s, p) => s + p.total, 0) / parameterScores.length)
      : 0
  const avgDisplay = internalToDisplay(avgTotal)
  const avgLevel = scoreLevelFor(avgDisplay, levels)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/family" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to My Family
      </Link>

      {/* Gradient hero */}
      <Reveal>
        <GradientCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-white/70 text-sm font-medium">Growth Profile</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{firstName}</h1>
              <p className="text-white/70 text-sm mt-1 truncate">{child.email}</p>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3.5 py-1.5">
                <span className="text-base">🌱</span>
                <span className="text-white text-sm font-semibold">
                  {avgLevel?.name ?? 'Seed'} · {avgTotal} avg pts
                </span>
              </div>
            </div>
            <ProgressRing percent={avgDisplay} variant="light" size={124}>
              <span className="font-display text-3xl font-bold text-white">{avgDisplay}%</span>
              <span className="text-[10px] uppercase tracking-widest text-white/70 mt-0.5">growth</span>
            </ProgressRing>
          </div>
        </GradientCard>
      </Reveal>

      {rank && (
        <Reveal delay={0.04}>
          <RankCard rank={rank} name={firstName} />
        </Reveal>
      )}

      {!hasPoints && (
        <Reveal delay={0.05}>
          <div className="clay-card p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">
              🌱
            </div>
            <div className="text-sm">
              <p className="font-display font-bold text-foreground">Nothing scored yet</p>
              <p className="text-muted mt-0.5">
                {firstName}{' '}hasn&apos;t taken the starter assessment. Their skills fill in below once
                they do — or as soon as they finish an activity booked from the catalogue.
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {/* Parameter breakdown */}
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

      {/* Recent activity */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground">Recent Activity</h2>
        {contributions.length === 0 ? (
          <div className="clay-card p-5 text-sm text-muted">No activity yet.</div>
        ) : (
          <div className="clay-card divide-y divide-black/[0.06]">
            {contributions.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {c.growth_parameters?.name ?? 'Unknown parameter'}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {SOURCE_LABEL[c.source_type] ?? c.source_type}
                    {c.description ? ` · ${c.description}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${c.points < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {c.points > 0 ? `+${c.points}` : c.points}
                </span>
                <span className="text-xs text-muted shrink-0 hidden sm:inline">{fmtDate(c.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
