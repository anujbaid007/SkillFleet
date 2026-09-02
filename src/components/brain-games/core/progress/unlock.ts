/**
 * Which levels a player has opened up.
 *
 * Levels unlock one at a time: a game starts on its lowest rung and the next
 * opens only once a round actually reaches it.
 *
 * The gate reads `unlocked`, never `level` and never `earned`:
 *
 * - `level` is what the picker wrote — a choice, not an achievement — so
 *   unlocking from it would mean choosing a level unlocked it.
 * - `earned` is the index's staircase position, and it is *meant* to fall when
 *   a round goes badly. `earnedAfter` caps it at the level actually reached, so
 *   a player who has climbed to level 8 and then replays level 1 comes out with
 *   `earned` of 2. Gating on that would take levels 3-8 back off them for
 *   playing an easy round, which is the opposite of progression.
 * - `unlocked` is the high-water mark maintained by `recordRound`, which only
 *   ever rises. Content stays open; the index stays honest.
 *
 * The rules are pure functions of stored values, with thin storage-reading
 * wrappers over them, so the gating can be tested without a browser.
 */

import { getProgress, type GameProgress } from './Storage';

/** The highest open level, given a game's stored progress. */
export function unlockedFrom(
  progress: Pick<GameProgress, 'earned' | 'unlocked'>,
  minLevel: number,
): number {
  // Stores written before `unlocked` existed fall back to `earned`, which was
  // the gate then — so an existing player keeps what they had opened.
  const mark = progress.unlocked ?? progress.earned;
  return Math.max(minLevel, mark || minLevel);
}

/** The level a round begins at: the choice, capped by what is unlocked. */
export function startFrom(
  progress: Pick<GameProgress, 'level' | 'earned' | 'unlocked'>,
  minLevel: number,
): number {
  const chosen = Math.max(minLevel, progress.level || minLevel);
  return Math.min(chosen, unlockedFrom(progress, minLevel));
}

/** The highest level currently open for a game. */
export function unlockedLevel(gameId: string, minLevel: number): number {
  return unlockedFrom(getProgress(gameId), minLevel);
}

/**
 * The level a round should actually begin at.
 *
 * Applied at launch as well as in the picker, so a level chosen before these
 * gates existed — or written to storage by hand — cannot start a round above
 * the ladder position the player has opened.
 */
export function startLevel(gameId: string, minLevel: number): number {
  return startFrom(getProgress(gameId), minLevel);
}
