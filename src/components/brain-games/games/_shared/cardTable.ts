import { Rng } from '../../core/engine/Rng';
import { Ease, clamp01, lerp } from '../../core/engine/Tween';

/**
 * The two-card table shared by Brain Shift and Colour Match.
 *
 * Both games are the same piece of furniture in different wood: a grained
 * table, two stacked cards, small labels, and a split NO / YES bar. Keeping it
 * in one place means a fix to the bar or the card shadow lands in both, and
 * the two games cannot quietly drift apart.
 */
export interface TablePalette {
  woodTop: string;
  woodMid: string;
  /** Vertical grain reads as a plank end-on; horizontal as a table top. */
  grain: 'horizontal' | 'vertical';
  bar: string;
  barText: string;
  barPress: string;
  labelBg: string;
  labelText: string;
  promptText: string;
}

export const TEAL_TABLE: TablePalette = {
  woodTop: '#155A67',
  woodMid: '#1E7180',
  grain: 'horizontal',
  bar: '#123F49',
  barText: '#5FD3E8',
  barPress: '#3FC6DE',
  labelBg: 'rgba(20, 74, 85, 0.72)',
  labelText: 'rgba(226, 248, 252, 0.92)',
  promptText: 'rgba(226, 248, 252, 0.86)',
};

export const BROWN_TABLE: TablePalette = {
  woodTop: '#5E4C3F',
  woodMid: '#735D4F',
  grain: 'vertical',
  bar: '#342A21',
  barText: '#5FD3E8',
  barPress: '#3FC6DE',
  labelBg: 'rgba(58, 46, 36, 0.75)',
  labelText: 'rgba(245, 238, 230, 0.9)',
  promptText: 'rgba(245, 238, 230, 0.88)',
};

export function bakeGrain(seed: number, direction: 'horizontal' | 'vertical'): HTMLCanvasElement | null {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return null;
  const rng = new Rng(seed ^ 0x77aa33);
  for (let i = 0; i < size; i++) {
    const a = 0.02 + rng.next() * 0.05;
    g.fillStyle = rng.chance(0.5) ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    if (direction === 'horizontal') g.fillRect(0, i, size, 1);
    else g.fillRect(i, 0, 1, size);
  }
  return c;
}

export function drawTable(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pal: TablePalette,
  grain: HTMLCanvasElement | null,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, pal.woodTop);
  grad.addColorStop(0.45, pal.woodMid);
  grad.addColorStop(1, pal.woodTop);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (grain) {
    const pattern = ctx.createPattern(grain, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

/** Card slot geometry, derived per frame so a resize needs no bookkeeping. */
export function slotRects(w: number, h: number): { top: DOMRect; bottom: DOMRect } {
  const cw = Math.min(w * 0.62, h * 0.3);
  const ch = cw * 0.62;
  const cx = w / 2 - cw / 2;
  const midY = h * 0.46;
  const gapY = ch * 0.1;
  return {
    top: new DOMRect(cx, midY - ch - gapY / 2, cw, ch),
    bottom: new DOMRect(cx, midY + gapY / 2, cw, ch),
  };
}

export interface CardFace {
  text: string;
  color: string;
  /** Fraction of the card height used for the type. */
  scale?: number;
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  r: DOMRect,
  face: CardFace | null,
  enterT: number,
  alpha = 1,
): void {
  const scale = enterT < 1 ? lerp(0.92, 1, Ease.outBack(clamp01(enterT))) : 1;

  ctx.save();
  ctx.translate(r.x + r.width / 2, r.y + r.height / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = r.height * 0.14;
  ctx.shadowOffsetY = r.height * 0.05;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(-r.width / 2, -r.height / 2, r.width, r.height, r.height * 0.1);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (face) {
    ctx.fillStyle = face.color;
    ctx.font = `800 ${Math.round(r.height * (face.scale ?? 0.42))}px 'Nunito Sans', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face.text, 0, r.height * 0.02);
  }
  ctx.restore();
}

/** Small pill label, as used for "meaning" / "text color". */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  cy: number,
  unit: number,
  pal: TablePalette,
): void {
  ctx.save();
  ctx.font = `600 ${Math.round(unit * 0.032)}px 'Nunito Sans', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padX = unit * 0.028;
  const tw = ctx.measureText(label).width + padX * 2;
  const th = unit * 0.058;
  ctx.fillStyle = pal.labelBg;
  ctx.beginPath();
  ctx.roundRect(cx - tw / 2, cy - th / 2, tw, th, th * 0.28);
  ctx.fill();
  ctx.fillStyle = pal.labelText;
  ctx.fillText(label, cx, cy);
  ctx.restore();
}

/** The standing question above the cards. */
export function drawPrompt(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  unit: number,
  pal: TablePalette,
): void {
  ctx.save();
  ctx.font = `600 ${Math.round(unit * 0.038)}px 'Nunito Sans', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = pal.promptText;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

export function barHeight(h: number): number {
  return Math.max(72, h * 0.1);
}

/**
 * The NO / YES bar.
 *
 * `hint` lights the side that answers the card currently on the table. It is
 * for the tutorial: a caption can say what the question is, but a first-time
 * player still has to work out that the two words at the bottom are how you
 * answer it. Showing them which one applies, on a card whose answer they can
 * check for themselves, teaches the control and the rule in one go.
 */
export function drawAnswerBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  pal: TablePalette,
  press: { side: 'no' | 'yes'; t: number } | null,
  hint: 'no' | 'yes' | null = null,
): void {
  const bh = barHeight(h);
  const top = h - bh;

  ctx.save();
  ctx.fillStyle = pal.bar;
  ctx.fillRect(0, top, w, bh);

  if (press) {
    ctx.globalAlpha = 1 - clamp01(press.t / 0.2);
    ctx.fillStyle = pal.barPress;
    ctx.fillRect(press.side === 'no' ? 0 : w / 2, top, w / 2, bh);
    ctx.globalAlpha = 1;
  }

  if (hint) {
    // A slow breath rather than a blink: it has to read as "this one" without
    // competing with the card for attention.
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 420);
    const x = hint === 'no' ? 0 : w / 2;
    ctx.globalAlpha = 0.3 + pulse * 0.4;
    ctx.fillStyle = pal.barPress;
    ctx.fillRect(x, top, w / 2, bh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, top + 1, w / 2 - 2, bh - 2);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, top + bh * 0.18);
  ctx.lineTo(w / 2, top + bh * 0.82);
  ctx.stroke();

  ctx.font = `700 ${Math.round(unit * 0.055)}px 'Nunito Sans', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = press?.side === 'no' || hint === 'no' ? '#FFFFFF' : pal.barText;
  ctx.fillText('NO', w * 0.25, top + bh / 2);
  ctx.fillStyle = press?.side === 'yes' || hint === 'yes' ? '#FFFFFF' : pal.barText;
  ctx.fillText('YES', w * 0.75, top + bh / 2);
  ctx.restore();
}

export function drawVerdict(
  ctx: CanvasRenderingContext2D,
  kind: 'correct' | 'wrong',
  cx: number,
  cy: number,
  unit: number,
  t: number,
  duration: number,
): void {
  const p = clamp01(t / duration);
  const pop = Ease.outBack(clamp01(t / 0.16));
  const fade = 1 - clamp01((p - 0.55) / 0.45);
  const r = unit * 0.055 * pop;
  if (r <= 0 || fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = kind === 'correct' ? '#3FBF4F' : '#E5484D';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'correct') {
    ctx.moveTo(-r * 0.4, r * 0.02);
    ctx.lineTo(-r * 0.1, r * 0.34);
    ctx.lineTo(r * 0.44, -r * 0.32);
  } else {
    ctx.moveTo(-r * 0.32, -r * 0.32);
    ctx.lineTo(r * 0.32, r * 0.32);
    ctx.moveTo(r * 0.32, -r * 0.32);
    ctx.lineTo(-r * 0.32, r * 0.32);
  }
  ctx.stroke();
  ctx.restore();
}
