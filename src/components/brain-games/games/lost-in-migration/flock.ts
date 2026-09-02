import { DIR_ANGLE, type Direction } from '../../core/types';
import type { FlockShape } from './shapes';

/**
 * Bird silhouette, drawn once in a unit space pointing +X and reused via
 * transforms. The shape is traced from the reference: a pointed head, wings
 * swept back and outboard, and a notched swallow tail.
 */
const BIRD = (() => {
  const p = new Path2D();
  p.moveTo(0.5, 0);
  // Each wing is a broad triangle: a long leading edge sweeping from the nose
  // out to the tip, then a trailing edge cutting back to a point behind the
  // body. Bringing that trailing edge forward instead leaves a thin crescent
  // that reads as a dart rather than a bird.
  p.quadraticCurveTo(0.3, 0.16, 0.04, 0.5);
  p.quadraticCurveTo(0.02, 0.26, -0.06, 0.09);
  // Tail stalk, swallow fork, and back up the other side.
  p.lineTo(-0.3, 0.055);
  p.lineTo(-0.5, 0.18);
  p.lineTo(-0.36, 0);
  p.lineTo(-0.5, -0.18);
  p.lineTo(-0.3, -0.055);
  p.lineTo(-0.06, -0.09);
  p.quadraticCurveTo(0.02, -0.26, 0.04, -0.5);
  p.quadraticCurveTo(0.3, -0.16, 0.5, 0);
  p.closePath();
  return p;
})();

export const BIRD_COLOR = '#04292E';

export function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  facing: Direction,
  alpha: number,
  color = BIRD_COLOR,
): void {
  if (alpha <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(DIR_ANGLE[facing]);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.fill(BIRD);
  ctx.restore();
}

/**
 * Offsets are in units of the flock's spacing; index 2 of every list is the
 * centre bird — the target — so the target is always the middle of the
 * sequence a reader's eye follows. The shape names themselves live in
 * `shapes.ts`, which stays loadable outside a browser.
 */
export type { FlockShape } from './shapes';
export { FLOCK_SHAPES } from './shapes';

export interface Offset {
  x: number;
  y: number;
}

const LAYOUTS: Record<FlockShape, Offset[]> = {
  // Chevrons: the target sits at the apex, which is the third bird along.
  'v-up': [
    { x: -2, y: 2 },
    { x: -1, y: 1 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ],
  'v-down': [
    { x: -2, y: -2 },
    { x: -1, y: -1 },
    { x: 0, y: 0 },
    { x: 1, y: -1 },
    { x: 2, y: -2 },
  ],
  'v-left': [
    { x: 2, y: -2 },
    { x: 1, y: -1 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ],
  'v-right': [
    { x: -2, y: -2 },
    { x: -1, y: -1 },
    { x: 0, y: 0 },
    { x: -1, y: 1 },
    { x: -2, y: 2 },
  ],
  row: [
    { x: -2, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  column: [
    { x: 0, y: -2 },
    { x: 0, y: -1 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
  ],
  // The cross has no reading order, so its centre is the hardest to isolate.
  cross: [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
};

/** Index into a layout that is the target bird. */
export const TARGET_INDEX = 2;

export function layoutOf(shape: FlockShape): Offset[] {
  return LAYOUTS[shape];
}

/**
 * Half-extent of a shape in spacing units, used to keep a flock fully on the
 * board when its position is chosen.
 */
export function extentOf(shape: FlockShape): Offset {
  const pts = LAYOUTS[shape];
  return {
    x: Math.max(...pts.map((p) => Math.abs(p.x))),
    y: Math.max(...pts.map((p) => Math.abs(p.y))),
  };
}
