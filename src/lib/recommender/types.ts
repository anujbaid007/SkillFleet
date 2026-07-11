// Types for the AI Curriculum Recommender (Phase 3).
//
// The recommender is a two-stage pipeline:
//   1. Rules engine (pure, in this folder) — deterministic gap detection and
//      candidate ranking. Testable without any network.
//   2. LLM layer (llm.ts) — turns the structured output into a friendly,
//      explainable narrative. Degrades to a template when the API is absent.
//
// Scores here are DISPLAY scale (0–100) unless noted; offering contribution
// `points` are INTERNAL scale (0–1000), matching the DB.

import type { ProgressStatus } from '@/lib/scoring/types'

/** A student's current standing on one parameter, vs their age-band target. */
export interface ParameterGap {
  parameterId: string
  name: string
  displayScore: number   // 0–100
  targetMin: number      // 0–100
  targetMax: number      // 0–100
  status: ProgressStatus
  /** Display-scale points needed to reach target_min. 0 if already on/above target. */
  deficit: number
}

/** A live offering and the points it awards per parameter (internal 0–1000). */
export interface CandidateOffering {
  id: string
  title: string
  type: string
  minAge: number | null
  maxAge: number | null
  pricePaise: number
  /** parameterId -> points awarded on completion (internal 0–1000). */
  contributions: Record<string, number>
}

/** One parameter an offering meaningfully develops, surfaced to the UI. */
export interface RankedParameter {
  id: string
  name: string
  points: number   // internal 0–1000, as stored
}

/** A ranked recommendation the rules engine produces (pre-narrative). */
export interface RankedCandidate {
  offeringId: string
  title: string
  type: string
  pricePaise: number
  /** Sum of (gap deficit × contribution) across the gaps this offering addresses. */
  matchScore: number
  /** The gap parameters this offering develops, strongest first. */
  parameters: RankedParameter[]
}

/** Final recommendation item (rules output + narrative reason), stored as JSONB. */
export interface RecommendationItem {
  offering_id: string
  title: string
  rank: number
  reason: string
  match_score: number
  parameters: { id: string; name: string; points: number }[]
}
