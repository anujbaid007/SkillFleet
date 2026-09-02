import { Rng } from '../../core/engine/Rng';
import { clamp01, lerp } from '../../core/engine/Tween';

/**
 * The sky runs from day to dusk to night across the round, exactly as the
 * reference does. It doubles as an ambient clock — the player can feel the
 * round ending without reading the timer.
 *
 * Stops were sampled from the footage: bright cyan at the start, indigo by
 * the final seconds, through a warm magenta dusk in between.
 */
interface Stop {
  at: number;
  top: [number, number, number];
  bottom: [number, number, number];
  haze: [number, number, number];
}

const STOPS: Stop[] = [
  { at: 0.0, top: [0x6a, 0xd2, 0xdd], bottom: [0xa2, 0xe6, 0xe5], haze: [0xbe, 0xee, 0xea] },
  { at: 0.5, top: [0x74, 0xc4, 0xd8], bottom: [0xd8, 0xe4, 0xd4], haze: [0xe6, 0xe6, 0xd6] },
  { at: 0.76, top: [0x9c, 0x74, 0xbe], bottom: [0xf0, 0xa8, 0x92], haze: [0xf6, 0xc0, 0xa4] },
  { at: 1.0, top: [0x41, 0x65, 0xb3], bottom: [0x71, 0x7c, 0xbe], haze: [0x8a, 0x92, 0xc8] },
];

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return `rgb(${r}, ${g}, ${bl})`;
}

interface Palette {
  top: string;
  bottom: string;
  haze: string;
}

function paletteAt(t: number): Palette {
  const p = clamp01(t);
  let i = 0;
  while (i < STOPS.length - 2 && p > STOPS[i + 1].at) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const k = clamp01((p - a.at) / (b.at - a.at));
  return { top: mix(a.top, b.top, k), bottom: mix(a.bottom, b.bottom, k), haze: mix(a.haze, b.haze, k) };
}

interface Cloud {
  x: number;
  y: number;
  s: number;
  speed: number;
}

interface Ridge {
  y: number;
  pts: number[];
}

export class Sky {
  private clouds: Cloud[] = [];
  private ridges: Ridge[] = [];
  private sun = { x: 0.62, y: 0.36 };
  private w = 0;
  private h = 0;

  constructor(seed: number, private reducedMotion = false) {
    const rng = new Rng(seed ^ 0x5bf03635);
    this.sun = { x: rng.range(0.35, 0.72), y: rng.range(0.3, 0.46) };
    const count = reducedMotion ? 4 : 8;
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: rng.next(),
        y: rng.range(0.06, 0.62),
        s: rng.range(0.45, 1.05),
        speed: rng.range(0.004, 0.016),
      });
    }
    // Two hazy ridges along the horizon, each a low jagged silhouette.
    for (let r = 0; r < 2; r++) {
      const pts: number[] = [];
      for (let i = 0; i <= 12; i++) pts.push(rng.range(0, 1));
      this.ridges.push({ y: 0.9 + r * 0.045, pts });
    }
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  update(dt: number): void {
    if (this.reducedMotion) return;
    for (const c of this.clouds) {
      c.x += c.speed * dt * 0.1;
      if (c.x > 1.25) c.x = -0.25;
    }
  }

  /** `progress` is 0 at the start of the round and 1 at the end. */
  draw(ctx: CanvasRenderingContext2D, progress: number): void {
    const { w, h } = this;
    const pal = paletteAt(progress);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, pal.top);
    grad.addColorStop(0.82, pal.bottom);
    grad.addColorStop(1, pal.haze);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Sun, fading as the sky darkens.
    const sunAlpha = lerp(0.22, 0.06, clamp01(progress * 1.2));
    ctx.save();
    ctx.globalAlpha = sunAlpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.sun.x * w, this.sun.y * h, Math.min(w, h) * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#FFFFFF';
    for (const c of this.clouds) this.cloud(ctx, c.x * w, c.y * h, Math.min(w, h) * 0.09 * c.s);
    ctx.restore();

    // Distant ridges, tinted toward the haze so they sit far away.
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = pal.top;
    for (const ridge of this.ridges) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      const n = ridge.pts.length - 1;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * w;
        const y = ridge.y * h - ridge.pts[i] * h * 0.02;
        i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x + r * 0.55, y + r * 0.12, r * 0.44, 0, Math.PI * 2);
    ctx.arc(x - r * 0.55, y + r * 0.14, r * 0.38, 0, Math.PI * 2);
    ctx.arc(x + r * 0.1, y - r * 0.28, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
