import { clamp, clamp01, lerp } from '../../core/engine/Tween';
import { FLOCK_SHAPES, type FlockShape } from './shapes';

/**
 * Difficulty knobs for one flock.
 *
 * Lost in Migration is an Eriksen flanker task, so the levers are the ones the
 * paradigm itself supplies rather than invented ones:
 *
 * - **Congruency.** Incongruent trials are reliably slower and less accurate
 *   (the congruency effect), so raising their share is the primary lever.
 * - **Flanker spacing.** Eriksen & Eriksen (1974) found interference falls off
 *   sharply as target–flanker separation grows. Tightening the flock therefore
 *   makes the same trial genuinely harder, not merely smaller.
 * - **Response deadline.** Straight time pressure.
 * - **Shape pool.** Chevrons have a reading order that leads the eye to the
 *   apex; a cross does not, so its centre is hardest to isolate. Harder shapes
 *   are unlocked as the level climbs.
 * - **Relocation.** Spawning the next flock further from the last forces a
 *   visual search before the discrimination can even begin.
 */
export interface Knobs {
  /** Seconds allowed to answer before the flock counts as a miss. */
  responseWindow: number;
  /** Probability the flankers face a different way from the target. */
  incongruentChance: number;
  /** Bird spacing as a fraction of the short screen edge. */
  spacing: number;
  /** Bird size as a fraction of the short screen edge. */
  birdSize: number;
  /** Shapes available at this difficulty. */
  shapes: readonly FlockShape[];
  /** Minimum jump between consecutive flock positions, 0..1 of the board. */
  relocation: number;
}

export const MAX_DIFFICULTY = 20;
/** Correct answers inside a round that push difficulty up one step. */
export const CORRECT_PER_STEP = 7;

/** Shapes unlock in order of how hard their centre is to pick out. */
const EASY: readonly FlockShape[] = ['v-up', 'v-down', 'row'];
const MID: readonly FlockShape[] = ['v-up', 'v-down', 'v-left', 'v-right', 'row', 'column'];

export function difficultyIndex(level: number, correctThisRound: number): number {
  return clamp(level + Math.floor(correctThisRound / CORRECT_PER_STEP), 1, MAX_DIFFICULTY);
}

export function knobsFor(index: number): Knobs {
  const t = clamp01((index - 1) / (MAX_DIFFICULTY - 1));
  // Front-loaded: the opening levels loosen quickly, the top end tightens
  // gently so the last few remain distinguishable from each other.
  const fast = 1 - Math.pow(1 - t, 1.6);

  return {
    responseWindow: lerp(2.8, 0.72, fast),
    // Conflict is common from the first level — resisting the flankers is the
    // whole skill, not a late-game twist.
    incongruentChance: lerp(0.55, 0.92, t),
    // Tighter flocks crowd the target and interfere more.
    spacing: lerp(0.115, 0.062, t),
    birdSize: lerp(0.088, 0.058, t),
    shapes: t < 0.2 ? EASY : t < 0.5 ? MID : FLOCK_SHAPES,
    relocation: lerp(0.12, 0.42, t),
  };
}

/** A level-up needs the round to be both accurate and productive. */
export function shouldLevelUp(accuracy: number, correct: number): boolean {
  return accuracy >= 0.8 && correct >= 14;
}

/** A poor round steps back one level, never below 1. */
export function shouldLevelDown(accuracy: number, answered: number): boolean {
  return answered >= 10 && accuracy < 0.5;
}
