import { clamp, clamp01, lerp } from '../../core/engine/Tween';

/**
 * Difficulty knobs for one trial.
 *
 * The levers are the Stroop effect's own: how often the bottom card's word
 * fights its ink, and how often that conflict is aimed squarely at the answer.
 */
export interface Knobs {
  /** Seconds allowed before the trial counts as a miss. */
  responseWindow: number;
  /** Probability the bottom card's word and ink disagree. */
  stroopChance: number;
  /** Probability a NO trial is disguised by a matching bottom word. */
  lureChance: number;
}

/**
 * The rungs this ladder awards. Seven, not twenty.
 *
 * Rung count is not a free parameter: the step between two rungs is the knob
 * range divided by the rungs, so twenty rungs forced ~5% steps - 180 ms on a
 * 3-second response window, which nobody can feel. Seven rungs over the same
 * range makes the first step 19% of it. See _shared/ladder.ts.
 */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 7;
/**
 * Difficulty ceiling. The rungs above MAX_LEVEL are never awarded and never
 * recorded; they exist so the within-round ramp still has somewhere to climb
 * for a player sitting on the top rung.
 */
export const MAX_DIFFICULTY = 9;

/**
 * Correct answers worth one rung of extra difficulty inside a round.
 *
 * Applied without rounding, so the round closes in continuously instead of
 * lurching every Nth answer and sitting still in between. Sized so a strong
 * 45-second round climbs about three rungs and is still tightening when the
 * clock stops.
 */
export const CORRECT_PER_STEP = 14;

export function difficultyIndex(level: number, correctThisRound: number): number {
  return clamp(level + Math.max(0, correctThisRound) / CORRECT_PER_STEP, MIN_LEVEL, MAX_DIFFICULTY);
}

export function knobsFor(index: number): Knobs {
  const t = clamp01((index - 1) / (MAX_DIFFICULTY - 1));
  const fast = 1 - Math.pow(1 - t, 1.6);

  return {
    responseWindow: lerp(2.8, 0.8, fast),
    // Conflict from the very first trial: a bottom card whose word and ink
    // agree is not a Stroop trial at all, it is just a colour match.
    stroopChance: lerp(0.6, 0.95, fast),
    lureChance: lerp(0.25, 0.7, fast),
  };
}

/** The bar a round has to clear to earn the next level. */
export const LEVEL_UP_ACCURACY = 0.8;
export const REQUIRED_CORRECT = 14;

export function shouldLevelUp(accuracy: number, correct: number): boolean {
  return accuracy >= LEVEL_UP_ACCURACY && correct >= REQUIRED_CORRECT;
}

export function shouldLevelDown(accuracy: number, answered: number): boolean {
  return answered >= 10 && accuracy < 0.5;
}
