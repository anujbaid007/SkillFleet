/**
 * The seven flock shapes, as data.
 *
 * Kept apart from `flock.ts` because that module builds its bird silhouette as
 * a `Path2D` the moment it is imported, which only exists in a browser. The
 * difficulty model needs the shape *names* and nothing else, so holding them
 * here lets the difficulty ladder — and the norms that read it — load anywhere.
 */
export type FlockShape = 'v-up' | 'v-down' | 'v-left' | 'v-right' | 'row' | 'column' | 'cross';

export const FLOCK_SHAPES: readonly FlockShape[] = [
  'v-up',
  'v-down',
  'v-left',
  'v-right',
  'row',
  'column',
  'cross',
] as const;
