/** Easing curves. `t` is normalised 0..1 and the return is 0..1. */
export const Ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const p = 0.35;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
} as const;

export type EaseFn = (t: number) => number;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * A value that advances on the game clock rather than its own timer, so it
 * freezes correctly when the round is paused.
 */
export class Timeline {
  elapsed = 0;
  constructor(readonly duration: number) {}

  advance(dt: number): void {
    this.elapsed += dt;
  }

  /** Raw 0..1 progress. */
  get t(): number {
    return this.duration <= 0 ? 1 : clamp01(this.elapsed / this.duration);
  }

  eased(fn: EaseFn): number {
    return fn(this.t);
  }

  get done(): boolean {
    return this.elapsed >= this.duration;
  }

  reset(): void {
    this.elapsed = 0;
  }
}
