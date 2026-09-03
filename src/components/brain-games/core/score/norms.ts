/**
 * The normative model behind the BrainWeave Index.
 *
 * Every game reports a score on its own arbitrary scale — Memory Matrix deals
 * in thousands over fifteen minutes, Speed Match in hundreds over forty-five
 * seconds. Raw scores are not comparable, so the index never uses them for
 * comparison. It uses the one quantity every game already measures on a
 * calibrated scale: **the level the player sustained**.
 *
 * That is not a convenience. Each game's ladder moves up on success and down
 * on failure, which is an *adaptive staircase* — the standard psychophysical
 * method for finding a threshold. The level a player converges on is their
 * ability estimate, and because every ladder was designed so that each rung is
 * "the hardest setting this player can hold", the rungs mean the same kind of
 * thing across games even though the games share no scoring rule.
 *
 * ## Where the norms come from, and what that means
 *
 * A percentile needs a population. This platform does not have one yet, so the
 * seed norms below are **derived from each game's designed ladder** rather than
 * measured from players: the ladder's full span is treated as the range of
 * human performance the game was built to cover, with the median placed below
 * its midpoint because these ladders are front-loaded — the early rungs are
 * crossed quickly and the top ones are meant to be rare.
 *
 * This is stated plainly rather than buried, because it is the one part of the
 * system that is a modelling assumption instead of a measurement. Everything
 * downstream — the standard score, the recency blend, the area and overall
 * aggregation, the age bands — is real and unchanged by it. When there is a
 * player base, `ladderOf` is the single function that has to be replaced with
 * measured score distributions; nothing else in the system needs to move.
 */

import type { Category } from '../types';

import { MIN_LEVEL as COLOR_MATCH_MIN, MAX_LEVEL as COLOR_MATCH_MAX } from '../../games/color-match/difficulty';
import { MIN_LEVEL as MIGRATION_MIN, MAX_LEVEL as MIGRATION_MAX } from '../../games/lost-in-migration/difficulty';
import { MIN_TILES, MAX_TILES } from '../../games/memory-matrix/difficulty';

/** The index scale, chosen to match the metric this system is modelled on. */
export const INDEX_MEAN = 1000;
export const INDEX_SD = 333;
export const INDEX_MIN = 0;
export const INDEX_MAX = 2000;

/**
 * Where the median player sits on a ladder, as a fraction of its span.
 *
 * Below the midpoint on purpose. Every ladder here is front-loaded: the
 * opening rungs exist to teach and are crossed in the first minute, while the
 * top ones are deliberately close to the limit of what a person can do. A
 * median at the midpoint would call an average player's level a poor one.
 */
export const LADDER_MEDIAN_AT = 0.45;

/**
 * How many standard deviations the ladder's span covers.
 *
 * At 5.5, the bottom rung lands near index 175 and the top saturates the
 * scale — which is the intent: topping out a ladder should read as
 * exceptional, not as merely above average.
 */
export const LADDER_SD_SPAN = 5.5;

/**
 * A round's accuracy separates two players who sustained the same rung, and
 * never by enough to outrank someone a whole level higher.
 *
 * It is applied as a **signed adjustment around a typical accuracy**, not
 * added on top of the level. Adding it would shift every performance up by up
 * to 0.9 of a level, which is a fifth of Train of Thought's five-rung ladder
 * and a sixtieth of Star Search's — so the same player, equally far up two
 * ladders, would score differently on each purely because one ladder is short.
 * The audit measures exactly that, and it is what the pivot removes.
 */
export const ACCURACY_WEIGHT = 0.9;

/** The accuracy at which a round is worth its level exactly. */
export const ACCURACY_PIVOT = 0.8;

/**
 * Words for the number.
 *
 * An index on its own tells a player nothing — 286 could be anything until you
 * know that 1000 is the middle. The bands exist so the screen can say what the
 * number means without making everyone read a scale.
 *
 * The boundaries are **standard deviations, not round numbers picked by eye**:
 * the middle band is the half-deviation either side of average, which is where
 * roughly the middle 38 % of people sit, and each band out from there is one
 * further deviation. That keeps the words honest — "typical" genuinely means
 * typical, and "exceptional" is the top few per cent rather than a flattering
 * label handed out at 1200.
 */
export interface Band {
  /** Lowest index in this band. */
  from: number;
  label: string;
}

export const INDEX_BANDS: readonly Band[] = [
  { from: 0, label: 'Starting out' },
  { from: INDEX_MEAN - 1.5 * INDEX_SD, label: 'Developing' },
  { from: INDEX_MEAN - 0.5 * INDEX_SD, label: 'Typical' },
  { from: INDEX_MEAN + 0.5 * INDEX_SD, label: 'Strong' },
  { from: INDEX_MEAN + 1.5 * INDEX_SD, label: 'Exceptional' },
];

/** The band an index falls in. */
export function bandOf(index: number): Band {
  let found = INDEX_BANDS[0];
  for (const b of INDEX_BANDS) if (index >= b.from) found = b;
  return found;
}

/** The rungs a game's ladder actually offers. */
export interface Ladder {
  min: number;
  max: number;
}

/**
 * Each game's ladder, taken from the game's own exported constants rather than
 * copied. A ladder that is re-tuned moves its norm with it; a norm table typed
 * out by hand would quietly describe a game that no longer exists.
 */
const LADDERS: Record<string, Ladder> = {
  'color-match': { min: COLOR_MATCH_MIN, max: COLOR_MATCH_MAX },
  'lost-in-migration': { min: MIGRATION_MIN, max: MIGRATION_MAX },
  'memory-matrix': { min: MIN_TILES, max: MAX_TILES },
};

export function ladderOf(gameId: string): Ladder | undefined {
  return LADDERS[gameId];
}

export function everyLadder(): ReadonlyArray<readonly [string, Ladder]> {
  return Object.entries(LADDERS);
}

// ------------------------------------------------------------- age norming

/**
 * Age bands, and why the same index is a different percentile in each.
 *
 * Cognitive abilities do not peak together. Processing speed peaks in the late
 * teens and declines from there; short-term and working memory peak nearer the
 * late twenties; reasoning is flatter and holds far longer (Hartshorne &
 * Germine, 2015; Salthouse on speed). So a 25-year-old and a 65-year-old with
 * the *same* index are not at the same standing among their peers, and showing
 * both the same percentile would be the wrong answer to the question a player
 * is actually asking.
 *
 * The offsets shift the reference mean for the band. Their **shape** is taken
 * from that literature — which abilities peak when, and how steeply each
 * falls; their exact magnitudes are seeds, like the ladders above, to be
 * replaced by measured norms.
 */
export type AgeBand = 'under-20' | '20s' | '30s' | '40s' | '50s' | '60-plus';

export const AGE_BANDS: readonly AgeBand[] = ['under-20', '20s', '30s', '40s', '50s', '60-plus'];

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  'under-20': 'Under 20',
  '20s': '20 to 29',
  '30s': '30 to 39',
  '40s': '40 to 49',
  '50s': '50 to 59',
  '60-plus': '60 and over',
};

/** Index points added to the population mean for this band and category. */
const AGE_OFFSET: Record<Category, Record<AgeBand, number>> = {
  // Steepest curve of the five: peaks earliest, falls furthest.
  speed: { 'under-20': 160, '20s': 120, '30s': 40, '40s': -40, '50s': -120, '60-plus': -200 },
  // Peaks a little later than speed, falls nearly as far.
  memory: { 'under-20': 80, '20s': 110, '30s': 60, '40s': 0, '50s': -80, '60-plus': -160 },
  attention: { 'under-20': 90, '20s': 90, '30s': 40, '40s': -10, '50s': -70, '60-plus': -140 },
  flexibility: { 'under-20': 80, '20s': 90, '30s': 50, '40s': 0, '50s': -70, '60-plus': -150 },
  // Flattest: reasoning holds up far longer than speed does.
  'mind-challenge': { 'under-20': 20, '20s': 50, '30s': 50, '40s': 20, '50s': -30, '60-plus': -90 },
  math: { 'under-20': 20, '20s': 50, '30s': 50, '40s': 20, '50s': -30, '60-plus': -90 },
  language: { 'under-20': 0, '20s': 30, '30s': 50, '40s': 50, '50s': 20, '60-plus': -30 },
};

/** The mean index for a band within one category. */
export function bandMean(category: Category, band: AgeBand): number {
  return INDEX_MEAN + AGE_OFFSET[category][band];
}

/** The mean index for a band overall, averaged across the categories in play. */
export function bandMeanOverall(categories: readonly Category[], band: AgeBand): number {
  if (!categories.length) return INDEX_MEAN;
  const total = categories.reduce((sum, c) => sum + AGE_OFFSET[c][band], 0);
  return INDEX_MEAN + total / categories.length;
}
