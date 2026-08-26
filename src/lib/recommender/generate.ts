import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { internalToDisplay } from '@/lib/scoring/conversions'
import { ageBandFor } from '@/lib/scoring/age-band'
import type { AgeBand, ParameterTarget } from '@/lib/scoring/types'
import { detectGaps, belowTargetGaps, type ScoredParameter } from '@/lib/recommender/gaps'
import { rankCandidates } from '@/lib/recommender/candidates'
import { buildBalancedPlan } from '@/lib/recommender/plan'
import { generateNarrative, generatePlanNarrative, type NarrativeResult } from '@/lib/recommender/llm'
import type { CandidateOffering, ParameterGap } from '@/lib/recommender/types'

function ageInYears(dob: string, asOf = new Date()): number {
  const d = new Date(dob)
  let age = asOf.getFullYear() - d.getFullYear()
  const m = asOf.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) age--
  return age
}

export interface RecommenderContext {
  gaps: ParameterGap[]
  below: ParameterGap[]
  candidates: CandidateOffering[]
  age: number | null
  bookedIds: Set<string>
}

/**
 * Reads a student's scores, targets and the live catalog through the caller's
 * RLS client and returns the deterministic inputs both the single-shot
 * recommender and the year planner build on. No network / LLM here.
 */
export async function loadContext(
  supabase: SupabaseClient,
  studentId: string,
  dob: string | null
): Promise<RecommenderContext> {
  const [
    { data: parameters },
    { data: scores },
    { data: bands },
    { data: targets },
    { data: offerings },
    { data: contribs },
    { data: booked },
  ] = await Promise.all([
    supabase.from('growth_parameters').select('id, name, display_order').eq('is_active', true).order('display_order'),
    supabase.from('student_parameter_scores').select('parameter_id, baseline_score, accrued_score').eq('student_id', studentId),
    supabase.from('age_bands').select('id, label, min_age, max_age, display_order').order('display_order'),
    supabase.from('parameter_targets').select('parameter_id, age_band_id, target_min, target_max'),
    // Only activities that can actually still be booked: live, approved and
    // not already past their date.
    supabase
      .from('offerings')
      .select('id, title, type, min_age, max_age, price_paise, scheduled_at')
      .eq('status', 'live')
      .eq('review_status', 'approved')
      .or(`scheduled_at.is.null,scheduled_at.gte.${new Date().toISOString()}`),
    supabase.from('offering_parameter_contributions').select('offering_id, parameter_id, points'),
    supabase.from('bookings').select('offering_id').eq('student_id', studentId).eq('payment_status', 'paid').neq('status', 'cancelled'),
  ])

  const paramRows = (parameters ?? []) as { id: string; name: string }[]
  const scoreRows = (scores ?? []) as { parameter_id: string; baseline_score: number; accrued_score: number }[]

  const scored: ScoredParameter[] = paramRows.map((p) => {
    const row = scoreRows.find((s) => s.parameter_id === p.id)
    const internal = (row?.baseline_score ?? 0) + (row?.accrued_score ?? 0)
    return { parameterId: p.id, name: p.name, displayScore: internalToDisplay(internal) }
  })

  const band = dob ? ageBandFor(dob, (bands ?? []) as AgeBand[]) : null
  const bandTargets = ((targets ?? []) as ParameterTarget[]).filter((t) => !band || t.age_band_id === band.id)

  const gaps = detectGaps(scored, bandTargets)
  const below = belowTargetGaps(gaps)

  // Anything the child already holds a paid booking for is out of the running.
  const contribRows = (contribs ?? []) as { offering_id: string; parameter_id: string; points: number }[]
  const contribByOffering = new Map<string, Record<string, number>>()
  for (const c of contribRows) {
    const m = contribByOffering.get(c.offering_id) ?? {}
    m[c.parameter_id] = c.points
    contribByOffering.set(c.offering_id, m)
  }

  const candidates: CandidateOffering[] = ((offerings ?? []) as {
    id: string; title: string; type: string; min_age: number | null; max_age: number | null; price_paise: number
  }[]).map((o) => ({
    id: o.id,
    title: o.title,
    type: o.type,
    minAge: o.min_age,
    maxAge: o.max_age,
    pricePaise: o.price_paise,
    contributions: contribByOffering.get(o.id) ?? {},
  }))

  const bookedIds = new Set(((booked ?? []) as { offering_id: string }[]).map((b) => b.offering_id))
  const age = dob ? ageInYears(dob) : null

  return { gaps, below, candidates, age, bookedIds }
}

/** Single-shot gap-based recommendations, used by the assistant. */
export async function runRecommender(
  supabase: SupabaseClient,
  studentId: string,
  firstName: string,
  dob: string | null
): Promise<NarrativeResult> {
  const ctx = await loadContext(supabase, studentId, dob)
  const ranked = rankCandidates(ctx.gaps, ctx.candidates, { age: ctx.age, bookedOfferingIds: ctx.bookedIds, limit: 6 })
  return generateNarrative(firstName, ctx.below, ranked)
}

export interface PlanResult extends NarrativeResult {
  priceTotalPaise: number
}

/**
 * Balanced multi-activity year plan ("Plan my year"). `seed` varies which of
 * several equally-good activities get picked, so rebuilding gives a fresh plan.
 */
export async function runPlanner(
  supabase: SupabaseClient,
  studentId: string,
  firstName: string,
  dob: string | null,
  size: number,
  seed?: number
): Promise<PlanResult> {
  const ctx = await loadContext(supabase, studentId, dob)
  const plan = buildBalancedPlan(ctx.gaps, ctx.candidates, {
    age: ctx.age,
    bookedOfferingIds: ctx.bookedIds,
    size,
    seed,
  })
  const priceTotalPaise = plan.reduce((sum, c) => sum + c.pricePaise, 0)
  const narrative = await generatePlanNarrative(firstName, ctx.below, plan, size)
  return { ...narrative, priceTotalPaise }
}
