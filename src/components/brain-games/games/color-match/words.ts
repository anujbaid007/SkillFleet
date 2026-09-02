import { Rng } from '../../core/engine/Rng';

/**
 * Colour Match is a **Stroop** task (Stroop, 1935) framed as a comparison.
 *
 * Two cards:
 *   top    — a word in neutral ink. Only its MEANING counts.
 *   bottom — a word in coloured ink. Only its INK counts.
 *
 * Answer YES when `meaning(top) === ink(bottom)`.
 *
 * The interference is on the bottom card: reading a word is automatic, so
 * "red" printed in blue pulls hard toward the wrong answer. Lumosity puts it
 * as suppressing "the impulse to respond to the word's meaning and focusing
 * only on the ink colour."
 */
export type ColorName = 'red' | 'blue' | 'yellow' | 'black';

export const COLORS: ColorName[] = ['red', 'blue', 'yellow', 'black'];

export const INK: Record<ColorName, string> = {
  red: '#E0362F',
  blue: '#2E86D6',
  yellow: '#EFC017',
  black: '#25292E',
};

/** Colourblind-safe inks: separated by lightness as well as hue. */
export const INK_CB: Record<ColorName, string> = {
  red: '#D6541E',
  blue: '#2A6FB8',
  yellow: '#F2D64B',
  black: '#25292E',
};

/** The neutral ink the top card is always printed in. */
export const NEUTRAL = '#2B3138';

export interface Trial {
  /** Word on the top card; its meaning is what counts. */
  topWord: ColorName;
  /** Word on the bottom card; ignored — only its ink counts. */
  bottomWord: ColorName;
  /** Ink the bottom word is printed in. */
  bottomInk: ColorName;
  answer: boolean;
  /** Bottom card's own word and ink agree — no Stroop conflict. */
  bottomCongruent: boolean;
  /**
   * The trap: the bottom *word* matches the top word, but its ink does not.
   * Reading rather than looking gives exactly the wrong answer.
   */
  lure: boolean;
}

/**
 * Build one trial.
 *
 * `stroopChance` controls how often the bottom card fights itself, and
 * `lureChance` how often a NO trial is disguised as a YES by the bottom word.
 */
export function makeTrial(rng: Rng, stroopChance: number, lureChance: number): Trial {
  const answer = rng.chance(0.5);
  const topWord = rng.pick(COLORS);

  // The ink is forced by the answer: match the top word, or deliberately not.
  const bottomInk = answer ? topWord : rng.pickExcept(COLORS, topWord);

  let bottomWord: ColorName;
  if (!answer && rng.chance(lureChance)) {
    // Trap: the word says the answer is yes, the ink says no.
    bottomWord = topWord;
  } else if (rng.chance(stroopChance)) {
    bottomWord = rng.pickExcept(COLORS, bottomInk);
  } else {
    bottomWord = bottomInk;
  }

  return {
    topWord,
    bottomWord,
    bottomInk,
    answer,
    bottomCongruent: bottomWord === bottomInk,
    lure: !answer && bottomWord === topWord,
  };
}
