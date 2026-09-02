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

export const MAX_DIFFICULTY = 20;
export const CORRECT_PER_STEP = 6;

export function difficultyIndex(level: number, correctThisRound: number): number {
  return clamp(level + Math.floor(correctThisRound / CORRECT_PER_STEP), 1, MAX_DIFFICULTY);
}

export function knobsFor(index: number): Knobs {
  const t = clamp01((index - 1) / (MAX_DIFFICULTY - 1));
  const fast = 1 - Math.pow(1 - t, 1.6);

  return {
    responseWindow: lerp(2.8, 0.8, fast),
    // Conflict from the very first trial: a bottom card whose word and ink
    // agree is not a Stroop trial at all, it is just a colour match.
    stroopChance: lerp(0.6, 0.95, t),
    lureChance: lerp(0.25, 0.7, t),
  };
}

export function shouldLevelUp(accuracy: number, correct: number): boolean {
  return accuracy >= 0.8 && correct >= 14;
}

export function shouldLevelDown(accuracy: number, answered: number): boolean {
  return answered >= 10 && accuracy < 0.5;
}
