import { clamp } from '../../core/engine/Tween';

/**
 * Memory Matrix adapts **per trial**, not per level, and Lumosity states the
 * rule outright: no mistakes in a trial earns one more tile next time, one
 * miss holds steady, two or more drops one. A game opens three tiles below
 * where the last one ended.
 */
export const TRIALS = 12;
export const MIN_TILES = 3;
export const MAX_TILES = 22;
/** Tiles below your banked best that a fresh game starts at. */
export const OPENING_HANDICAP = 3;

export const POINTS_PER_TILE = 250;
/** Extra per tile when a trial is completed without a single wrong tap. */
export const PERFECT_BONUS_PER_TILE = 100;

export function openingTiles(bestTiles: number): number {
  return clamp(bestTiles - OPENING_HANDICAP, MIN_TILES, MAX_TILES);
}

export function nextTiles(current: number, mistakes: number): number {
  const delta = mistakes === 0 ? 1 : mistakes === 1 ? 0 : -1;
  return clamp(current + delta, MIN_TILES, MAX_TILES);
}

/**
 * Grid size for a tile count.
 *
 * Held near a constant ~28 % fill: a sparse grid makes the pattern trivially
 * separable and a dense one turns recall into elimination, so the density is
 * what stays fixed while the board grows.
 */
export function gridSizeFor(tiles: number): number {
  return clamp(Math.ceil(Math.sqrt(tiles / 0.28)), 4, 9);
}

/** How long the pattern is shown before it hides. */
export function studySeconds(tiles: number): number {
  return 1.5 + tiles * 0.11;
}
