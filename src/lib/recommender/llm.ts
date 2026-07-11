import 'server-only'
import { openRouterChat, activeModelName } from '@/lib/recommender/openrouter'
import { templateItems, templateSummary, templatePlanSummary, templateReason } from '@/lib/recommender/narrative'
import type { ParameterGap, RankedCandidate, RecommendationItem } from '@/lib/recommender/types'

export interface NarrativeResult {
  model: string           // active model name, or 'fallback'
  summary: string
  items: RecommendationItem[]
}

function buildPrompt(firstName: string, belowGaps: ParameterGap[], ranked: RankedCandidate[]) {
  const gapLines = belowGaps
    .slice(0, 6)
    .map((g) => `- ${g.name}: score ${g.displayScore}/100, target ${g.targetMin}-${g.targetMax}, ${g.deficit} below target`)
    .join('\n')

  const offerLines = ranked
    .map(
      (c) =>
        `- id=${c.offeringId} | "${c.title}" (${c.type}) | develops ${c.parameters.map((p) => p.name).join(', ')}`
    )
    .join('\n')

  const system =
    'You are SkillFleet\'s curriculum advisor speaking to a parent about their school-age child. ' +
    'You explain, warmly and concisely, why each suggested activity fits the child\'s growth gaps. ' +
    'Never invent activities or parameters beyond those given. Never promise outcomes. ' +
    'Reply with ONLY a JSON object, no markdown.'

  const user = `Child: ${firstName}

Growth gaps (below age-band target), most important first:
${gapLines || '(none — child is on track everywhere)'}

Suggested offerings (already ranked by our engine — keep this order):
${offerLines || '(none)'}

Return JSON exactly like:
{
  "summary": "one or two sentences to the parent about ${firstName}'s focus areas",
  "reasons": { "<offering id>": "one friendly sentence on why this offering suits ${firstName}" }
}
Every offering id above must appear as a key in "reasons". Keep each reason under 30 words.`

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

/** Parses the model's JSON reply, tolerating stray markdown fences. Returns null if unusable. */
function parseReply(raw: string): { summary?: string; reasons?: Record<string, string> } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    const obj = JSON.parse(cleaned)
    if (obj && typeof obj === 'object') return obj as { summary?: string; reasons?: Record<string, string> }
    return null
  } catch {
    return null
  }
}

/**
 * Produces the narrative (summary + per-offering reasons) for a ranked set.
 * Tries Gemini via OpenRouter; on ANY failure falls back to deterministic
 * templates so the recommender always returns something usable.
 */
export async function generateNarrative(
  firstName: string,
  belowGaps: ParameterGap[],
  ranked: RankedCandidate[]
): Promise<NarrativeResult> {
  const fallback: NarrativeResult = {
    model: 'fallback',
    summary: templateSummary(firstName, belowGaps),
    items: templateItems(firstName, ranked),
  }

  if (ranked.length === 0) return fallback

  const raw = await openRouterChat(buildPrompt(firstName, belowGaps, ranked), { maxTokens: 900 })
  if (!raw) return fallback

  const parsed = parseReply(raw)
  if (!parsed) return fallback

  const reasons = parsed.reasons ?? {}
  const items: RecommendationItem[] = ranked.map((c, i) => {
    const llmReason = typeof reasons[c.offeringId] === 'string' ? reasons[c.offeringId].trim() : ''
    return {
      offering_id: c.offeringId,
      title: c.title,
      rank: i + 1,
      reason: llmReason.length > 0 ? llmReason : templateReason(firstName, c),
      match_score: c.matchScore,
      parameters: c.parameters,
    }
  })

  return {
    model: activeModelName(),
    summary: typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : templateSummary(firstName, belowGaps),
    items,
  }
}

function buildPlanPrompt(firstName: string, belowGaps: ParameterGap[], plan: RankedCandidate[], size: number) {
  const gapLines = belowGaps
    .slice(0, 6)
    .map((g) => `- ${g.name}: score ${g.displayScore}/100, target ${g.targetMin}-${g.targetMax}`)
    .join('\n')

  const planLines = plan
    .map((c, i) => `${i + 1}. id=${c.offeringId} | "${c.title}" (${c.type}) | develops ${c.parameters.map((p) => p.name).join(', ')}`)
    .join('\n')

  const system =
    'You are SkillFleet\'s curriculum advisor helping a parent plan their school-age child\'s year. ' +
    'The activities below were already selected by our engine to be BALANCED across the child\'s growth gaps — ' +
    'do not re-order or add any. Explain the plan warmly and concisely. Reply with ONLY a JSON object, no markdown.'

  const user = `Child: ${firstName}
Plan size: ${size} activities for the year.

Growth gaps (below age-band target):
${gapLines || '(none — child is broadly on track)'}

The balanced plan (keep this order):
${planLines || '(empty)'}

Return JSON exactly like:
{
  "summary": "two sentences on how this balanced year develops ${firstName}",
  "reasons": { "<offering id>": "one friendly sentence on this activity's place in the year" }
}
Every offering id above must appear as a key in "reasons". Keep each reason under 30 words.`

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

/**
 * Narrates a balanced year plan. Same resilience as generateNarrative — tries
 * Gemini, falls back to deterministic templates on any failure.
 */
export async function generatePlanNarrative(
  firstName: string,
  belowGaps: ParameterGap[],
  plan: RankedCandidate[],
  size: number
): Promise<NarrativeResult> {
  const fallback: NarrativeResult = {
    model: 'fallback',
    summary: templatePlanSummary(firstName, belowGaps, plan.length),
    items: templateItems(firstName, plan),
  }

  if (plan.length === 0) return fallback

  const raw = await openRouterChat(buildPlanPrompt(firstName, belowGaps, plan, size), { maxTokens: 1000 })
  if (!raw) return fallback

  const parsed = parseReply(raw)
  if (!parsed) return fallback

  const reasons = parsed.reasons ?? {}
  const items: RecommendationItem[] = plan.map((c, i) => {
    const llmReason = typeof reasons[c.offeringId] === 'string' ? reasons[c.offeringId].trim() : ''
    return {
      offering_id: c.offeringId,
      title: c.title,
      rank: i + 1,
      reason: llmReason.length > 0 ? llmReason : templateReason(firstName, c),
      match_score: c.matchScore,
      parameters: c.parameters,
    }
  })

  return {
    model: activeModelName(),
    summary: typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : templatePlanSummary(firstName, belowGaps, plan.length),
    items,
  }
}
