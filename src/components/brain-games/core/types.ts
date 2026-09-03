/** Shared vocabulary for every game in the platform. */

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'] as const;

/** Screen-space unit vector for a direction. Canvas y grows downward. */
export const DIR_VECTOR: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Rotation in radians for a sprite whose artwork points RIGHT at angle 0. */
export const DIR_ANGLE: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export function oppositeOf(d: Direction): Direction {
  return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
}

/** The category taxonomy games are grouped under. */
export type Category =
  | 'speed'
  | 'memory'
  | 'attention'
  | 'flexibility'
  | 'mind-challenge'
  | 'math'
  | 'language';

export interface GameMeta {
  id: string;
  title: string;
  category: Category;
  /** What the game trains, shown on the results card. */
  skill: string;
  tagline: string;
  /** Long-form copy for the post-game "what this trained" card. */
  debrief: string;
  /** Seconds in a round. */
  roundSeconds: number;
  accent: string;
  /** How the player answers, shown on the menu card. */
  controls: 'swipe' | 'tap';
  /** Lowest meaningful level — Train of Thought's levels start at 4 stations. */
  minLevel?: number;
  /** Highest level the game supports, enabling the level picker. */
  maxLevel?: number;
  /** How the level reads on the menu card, e.g. "5 STATIONS". */
  levelLabel?: (level: number) => string;
}

/** Everything the host UI needs to paint the HUD. Pushed only when it changes. */
export interface HudState {
  /** Whole seconds remaining. */
  timeLeft: number;
  score: number;
  multiplier: number;
  /** 0..streakTarget-1 dots lit toward the next multiplier. */
  streak: number;
  streakTarget: number;
  maxMultiplier: boolean;
  /** Game-specific extras, e.g. Ebb and Flow's active rule. */
  detail?: unknown;
}

export interface RoundResult {
  score: number;
  bonus: number;
  total: number;
  correct: number;
  mistakes: number;
  accuracy: number;
  maxMultiplier: number;
  /** Level the player finished the round on. */
  level: number;
  /**
   * What the next level asked of this round, so the results card can say how
   * close it came rather than only whether it cleared.
   *
   * Optional because not every game gates on performance: Tile Trace, Tide Pool
   * and River Watch measure a level rather than award one — the level *is* how
   * far you got — so there is no bar to fall short of.
   */
  needAccuracy?: number;
  needCorrect?: number;
  levelBefore: number;
  leveledUp: boolean;
  newBest: boolean;
  best: number;
}
