import {
  GameEngine,
  type EngineHooks,
  type EngineOptions,
  type TutorialHint,
} from '../../core/engine/GameEngine';
import type { DirectionEvent } from '../../core/engine/Input';
import { prefersTouch } from '../../core/engine/Input';
import { Rng } from '../../core/engine/Rng';
import { Ease, clamp01, lerp } from '../../core/engine/Tween';
import { DIRECTIONS, DIR_VECTOR, oppositeOf, type Direction } from '../../core/types';
import type { HudState, RoundResult } from '../../core/types';
import * as Sfx from '../../core/audio/Sfx';
import { Sky } from './sky';
import { drawBird, extentOf, layoutOf, TARGET_INDEX, type FlockShape } from './flock';
import {
  difficultyIndex,
  knobsFor,
  MAX_DIFFICULTY,
  shouldLevelDown,
  shouldLevelUp,
  type Knobs,
} from './difficulty';

const ROUND_SECONDS = 45;
const POINTS_PER_CORRECT = 50;
const STREAK_TARGET = 4;
const MAX_MULTIPLIER = 10;
const BONUS_PER_MULTIPLIER = 250;

const ENTER_DUR = 0.16;
const EXIT_DUR = 0.2;
const GAP = 0.05;
const BADGE_DUR = 0.42;
/** Seconds a gust lasts. Short: it confirms the input, it is not scenery. */
const GUST_LIFE = 0.5;

export interface LimHudDetail {
  /** 0..1 of the response window left; drives the urgent timer styling. */
  urgency: number;
}

interface Flock {
  shape: FlockShape;
  /** Direction the centre bird faces — the answer. */
  target: Direction;
  /** Direction the flankers face. */
  flankers: Direction;
  /** Board-space centre, in pixels. */
  x: number;
  y: number;
  spacing: number;
  size: number;
  state: 'entering' | 'active' | 'exiting';
  t: number;
  answered: boolean;
  outcome: 'none' | 'correct' | 'wrong';
  deadline: number;
}

interface Badge {
  kind: 'correct' | 'wrong';
  x: number;
  y: number;
  t: number;
}

/** One streak of wind. Positions are fractions of the board, not pixels. */
interface Gust {
  /** How far along the blow direction, 0 at one edge and 1 at the other. */
  along: number;
  /** Offset across the blow, as a fraction of the perpendicular span. */
  across: number;
  length: number;
  speed: number;
  width: number;
  alpha: number;
  life: number;
}

export class LostInMigrationEngine extends GameEngine {
  private rng: Rng;
  private sky: Sky;

  private flock: Flock | null = null;
  private fading: Flock | null = null;
  private gap = 0;
  private badge: Badge | null = null;
  private shake = 0;
  /** Streaks of wind thrown out by the last answer, and the way they blow. */
  private gusts: Gust[] = [];
  private gustDir: Direction = 'right';

  private score = 0;
  private multiplier = 1;
  private streak = 0;
  private correct = 0;
  private mistakes = 0;

  /** Tutorial: a scripted flock, then free practice. */
  private tutStep = 0;
  private tutTimer = 0;
  private tutCaption: string | null = null;
  private tutDone = 0;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks, options: EngineOptions) {
    super(canvas, hooks, options);
    this.rng = new Rng(this.opts.seed);
    this.sky = new Sky(this.opts.seed, this.opts.reducedMotion);
    Sfx.setMuted(this.opts.muted);
  }

  get roundSeconds(): number {
    return ROUND_SECONDS;
  }

  protected setup(): void {
    this.sky.resize(this.surface.width, this.surface.height);
  }

  protected onResize(w: number, h: number): void {
    this.sky.resize(w, h);
    if (this.flock) this.place(this.flock, true);
  }

  private get knobs(): Knobs {
    return knobsFor(difficultyIndex(this.opts.level, this.correct));
  }

  // ------------------------------------------------------------------ trials

  /**
   * Choose where the flock sits.
   *
   * The next flock must land at least `relocation` away from the last, so the
   * player has to find it before they can read it — that visual search is part
   * of what the game trains, and it is why the flock is not simply centred.
   */
  private place(flock: Flock, keepPosition = false): void {
    const w = this.surface.width;
    const h = this.surface.height;
    const ext = extentOf(flock.shape);
    // Keep the whole flock on the board, clear of the HUD and the caption.
    const padX = ext.x * flock.spacing + flock.size * 0.6;
    const padY = ext.y * flock.spacing + flock.size * 0.6;
    const minX = padX + w * 0.04;
    const maxX = w - padX - w * 0.04;
    const minY = padY + h * 0.16;
    const maxY = h - padY - h * 0.16;

    if (keepPosition) {
      flock.x = Math.min(Math.max(flock.x, minX), maxX);
      flock.y = Math.min(Math.max(flock.y, minY), maxY);
      return;
    }

    const prevX = this.flock?.x ?? w / 2;
    const prevY = this.flock?.y ?? h / 2;
    const need = this.knobs.relocation * Math.min(w, h);

    let best = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, d: -1 };
    for (let i = 0; i < 12; i++) {
      const x = this.rng.range(minX, maxX);
      const y = this.rng.range(minY, maxY);
      const d = Math.hypot(x - prevX, y - prevY);
      if (d > best.d) best = { x, y, d };
      if (d >= need) break;
    }
    flock.x = best.x;
    flock.y = best.y;
  }

  private roll(k: Knobs, previous: Flock | null): Flock {
    const unit = this.surface.unit;

    let target = this.rng.pick(DIRECTIONS);
    // A repeated answer is a free point that measures nothing about attention.
    if (previous && target === previous.target && this.rng.chance(0.75)) {
      target = this.rng.pickExcept(DIRECTIONS, previous.target);
    }

    let flankers: Direction;
    if (this.rng.chance(k.incongruentChance)) {
      // The opposite direction is the strongest conflict; perpendiculars keep
      // the answer from being guessable by inverting the flankers.
      flankers = this.rng.chance(0.6) ? oppositeOf(target) : this.rng.pickExcept(DIRECTIONS, target);
      if (flankers === target) flankers = oppositeOf(target);
    } else {
      flankers = target;
    }

    const flock: Flock = {
      shape: this.rng.pick(k.shapes),
      target,
      flankers,
      x: 0,
      y: 0,
      spacing: unit * k.spacing,
      size: unit * k.birdSize,
      state: 'entering',
      t: 0,
      answered: false,
      outcome: 'none',
      deadline: k.responseWindow,
    };
    this.place(flock);
    return flock;
  }

  private spawn(): void {
    this.flock = this.roll(this.knobs, this.flock);
  }

  // ------------------------------------------------------------------- input

  protected onDirection(e: DirectionEvent): void {
    // Air moving past as the bird is sent on its way.
    Sfx.playNoise('swipe');
    const flock = this.flock;
    if (!flock || flock.answered || flock.state === 'exiting') return;

    this.blow(e.direction);

    if (this.phase === 'tutorial') {
      this.tutorialAnswer(e.direction === flock.target);
      return;
    }
    this.resolve(flock, e.direction === flock.target);
  }

  private retire(flock: Flock, isCorrect: boolean): void {
    flock.answered = true;
    flock.outcome = isCorrect ? 'correct' : 'wrong';
    flock.state = 'exiting';
    flock.t = 0;

    // Offset clear of the flock: centring the badge covers the middle bird,
    // which is the one the player most needs to see to check themselves.
    const ext = extentOf(flock.shape);
    const lift = ext.y * flock.spacing + flock.size * 0.55 + this.surface.unit * 0.06;
    const above = flock.y - lift;
    this.badge = {
      kind: isCorrect ? 'correct' : 'wrong',
      x: flock.x,
      // Flip below the flock when there is no room above it.
      y: above > this.surface.height * 0.12 ? above : flock.y + lift,
      t: 0,
    };
  }

  private resolve(flock: Flock, isCorrect: boolean): void {
    this.retire(flock, isCorrect);

    if (isCorrect) {
      this.correct++;
      this.score += POINTS_PER_CORRECT * this.multiplier;
      this.streak++;
      if (this.streak >= STREAK_TARGET) {
        this.streak = 0;
        if (this.multiplier < MAX_MULTIPLIER) {
          this.multiplier++;
          Sfx.play('levelup');
        } else {
          Sfx.play('correct');
        }
      } else {
        Sfx.play('correct');
      }
    } else {
      this.mistakes++;
      // The reference drops the multiplier by one rather than resetting it —
      // its HUD goes MAX ×10 to ×9 after a slip, not straight back to ×1.
      this.multiplier = Math.max(1, this.multiplier - 1);
      this.streak = 0;
      this.shake = 1;
      Sfx.play('wrong');
    }
  }

  // ------------------------------------------------------------------ update

  /**
   * A gust in the direction just swiped.
   *
   * The swipe is the whole answer in this game and it leaves no trace — the
   * flock reacts, but nothing confirms which way the player actually went. A
   * streak of wind blowing that way is feedback on the *input* rather than on
   * the outcome, which is a different and useful thing to show: it tells you
   * what the game heard, immediately, before the verdict lands.
   */
  private blow(dir: Direction): void {
    if (this.opts.reducedMotion) return;
    this.gustDir = dir;
    this.gusts = [];
    for (let i = 0; i < 15; i++) {
      this.gusts.push({
        // Spread across the span the wind will cross, so some streaks are
        // already in view at the moment of the swipe. Starting them all
        // upstream means most of a short life is spent off-screen.
        along: this.rng.range(-0.18, 0.5),
        across: this.rng.range(-0.5, 0.5),
        length: this.rng.range(0.1, 0.26),
        speed: this.rng.range(1.2, 2.2),
        width: this.rng.range(0.005, 0.013),
        alpha: this.rng.range(0.34, 0.72),
        life: 0,
      });
    }
  }

  protected update(dt: number): void {
    this.sky.update(dt);
    this.tick(dt);
    this.blowOn(dt);

    if (this.fading) {
      this.fading.t += dt;
      if (this.fading.t >= EXIT_DUR) this.fading = null;
    }

    if (this.phase !== 'playing') return;

    if (!this.flock) {
      this.gap -= dt;
      if (this.gap <= 0) this.spawn();
      return;
    }

    this.advance(this.flock, dt, true);

    if (this.flock.state === 'exiting' && this.flock.t >= EXIT_DUR) {
      this.flock = null;
      this.gap = GAP;
    }
  }

  private tick(dt: number): void {
    if (this.badge) {
      this.badge.t += dt;
      if (this.badge.t >= BADGE_DUR) this.badge = null;
    }
    this.shake = Math.max(0, this.shake - dt * 4.5);
  }

  private advance(flock: Flock, dt: number, enforce: boolean): void {
    flock.t += dt;
    if (flock.state === 'entering' && flock.t >= ENTER_DUR) {
      flock.state = 'active';
      flock.t = 0;
    }
    if (enforce && flock.state === 'active' && !flock.answered) {
      flock.deadline -= dt;
      if (flock.deadline <= 0) this.resolve(flock, false);
    }
  }

  // ---------------------------------------------------------------- tutorial

  private blowOn(dt: number): void {
    if (!this.gusts.length) return;
    for (const g of this.gusts) {
      g.life += dt;
      g.along += g.speed * dt;
    }
    this.gusts = this.gusts.filter((g) => g.life < GUST_LIFE);
  }

  protected updateTutorial(dt: number): boolean {
    this.sky.update(dt);
    this.tick(dt);
    if (this.fading) {
      this.fading.t += dt;
      if (this.fading.t >= EXIT_DUR) this.fading = null;
    }

    const verb = prefersTouch() ? 'Swipe' : 'Press the arrow key';

    if (this.tutStep === 0) {
      if (!this.flock) {
        // A deliberately clear first flock: a wide chevron, flankers opposed,
        // so the rule is visible rather than guessable.
        const k = knobsFor(1);
        const f = this.roll(k, null);
        f.shape = 'v-up';
        f.target = 'right';
        f.flankers = 'left';
        f.spacing = this.surface.unit * 0.14;
        f.deadline = Infinity;
        f.x = this.surface.width / 2;
        f.y = this.surface.height * 0.42;
        this.flock = f;
      }
      this.setCaption({ text: `${verb} in the direction the middle bird is facing.` });
      this.advance(this.flock, dt, false);
      if (this.flock.state === 'exiting' && this.flock.t >= EXIT_DUR) {
        this.flock = null;
        this.tutStep = 1;
        this.gap = GAP;
      }
      return false;
    }

    if (this.tutStep === 1) {
      this.setCaption({ text: 'Now you try — ignore the birds around it.', showModes: true });
      if (!this.flock) {
        this.gap -= dt;
        if (this.gap <= 0) {
          const f = this.roll(knobsFor(1), this.flock);
          f.deadline = Infinity;
          this.flock = f;
        }
        return false;
      }
      this.advance(this.flock, dt, false);
      if (this.flock.state === 'exiting' && this.flock.t >= EXIT_DUR) {
        this.flock = null;
        this.gap = GAP;
        if (this.tutDone >= 3) {
          this.tutStep = 2;
          this.tutTimer = 0;
        }
      }
      return false;
    }

    this.setCaption({ text: 'Respond quickly while avoiding mistakes', card: true });
    this.flock = null;
    this.tutTimer += dt;
    return this.tutTimer >= 1.8;
  }

  private tutorialAnswer(isCorrect: boolean): void {
    const flock = this.flock;
    if (!flock) return;
    if (!isCorrect) {
      // Onboarding costs nothing: the flock stays up so it can be re-read.
      this.badge = { kind: 'wrong', x: flock.x, y: flock.y, t: 0 };
      this.shake = 1;
      Sfx.play('wrong');
      return;
    }
    this.retire(flock, true);
    Sfx.play('correct');
    if (this.tutStep === 1) this.tutDone++;
  }

  private setCaption(hint: TutorialHint): void {
    if (this.tutCaption === hint.text) return;
    this.tutCaption = hint.text;
    this.hooks.onTutorialCaption?.(hint);
  }

  // -------------------------------------------------------------------- draw

  private drawGusts(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.gusts.length) return;
    const v = DIR_VECTOR[this.gustDir];
    // Perpendicular to the blow, for spreading the streaks out across it.
    const p = { x: -v.y, y: v.x };
    const horizontal = v.x !== 0;
    const alongSpan = horizontal ? w : h;
    const acrossSpan = horizontal ? h : w;

    // Where the wind comes from: the edge it blows away from. Measuring from
    // there rather than from the middle keeps a streak's `along` a plain
    // fraction of the crossing, which is what makes the timing predictable.
    const originX = v.x > 0 ? 0 : v.x < 0 ? w : w / 2;
    const originY = v.y > 0 ? 0 : v.y < 0 ? h : h / 2;

    ctx.save();
    ctx.lineCap = 'round';
    for (const g of this.gusts) {
      // Snaps in and eases out: wind that faded up as well as down would lag
      // the swipe it is meant to be confirming.
      const env = Math.min(1, g.life / 0.05) * (1 - clamp01(g.life / GUST_LIFE));
      const a = g.alpha * env;
      if (a <= 0.004) continue;

      const head = g.along * alongSpan;
      const cx = originX + v.x * head + p.x * g.across * acrossSpan;
      const cy = originY + v.y * head + p.y * g.across * acrossSpan;
      const len = g.length * alongSpan;
      const tailX = cx - v.x * len;
      const tailY = cy - v.y * len;

      // Faded at the tail and solid at the head, so each streak reads as
      // moving rather than as a line someone drew.
      const grad = ctx.createLinearGradient(tailX, tailY, cx, cy);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1, `rgba(255, 255, 255, ${a.toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.5, g.width * acrossSpan);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  protected draw(): void {
    const ctx = this.surface.ctx;
    const w = this.surface.width;
    const h = this.surface.height;

    const progress =
      this.phase === 'playing' || this.phase === 'finished'
        ? clamp01(this.elapsed / ROUND_SECONDS)
        : 0;

    ctx.save();
    if (this.shake > 0) {
      const amp = this.shake * this.shake * this.surface.unit * 0.016;
      const now = performance.now();
      ctx.translate(Math.sin(now * 0.05) * amp, Math.cos(now * 0.043) * amp);
    }

    this.sky.draw(ctx, progress);
    // Behind the birds on purpose. The middle bird is the one the player
    // checks themselves against once the answer lands, and streaks passing in
    // front of it would obscure exactly the thing they need to read.
    this.drawGusts(ctx, w, h);
    if (this.fading) this.drawFlock(ctx, this.fading);
    if (this.flock) this.drawFlock(ctx, this.flock);
    if (this.badge) this.drawBadge(ctx);

    ctx.restore();
    void w;
    void h;
  }

  private drawFlock(ctx: CanvasRenderingContext2D, flock: Flock): void {
    let alpha = 1;
    let scale = 1;
    if (flock.state === 'entering') {
      const t = clamp01(flock.t / ENTER_DUR);
      alpha = t;
      scale = lerp(0.86, 1, Ease.outCubic(t));
    } else if (flock.state === 'exiting') {
      const t = clamp01(flock.t / EXIT_DUR);
      alpha = 1 - t;
      // A correct flock lifts away; a wrong one just fades.
      scale = flock.outcome === 'correct' ? lerp(1, 1.14, Ease.outCubic(t)) : 1;
    }
    if (alpha <= 0.004) return;

    const pts = layoutOf(flock.shape);
    for (let i = 0; i < pts.length; i++) {
      const facing = i === TARGET_INDEX ? flock.target : flock.flankers;
      drawBird(
        ctx,
        flock.x + pts[i].x * flock.spacing * scale,
        flock.y + pts[i].y * flock.spacing * scale,
        flock.size * scale,
        facing,
        alpha,
      );
    }
  }

  private drawBadge(ctx: CanvasRenderingContext2D): void {
    const badge = this.badge;
    if (!badge) return;
    const t = clamp01(badge.t / BADGE_DUR);
    const pop = Ease.outBack(clamp01(badge.t / 0.16));
    const fade = 1 - clamp01((t - 0.55) / 0.45);
    const r = this.surface.unit * 0.055 * pop;
    if (r <= 0 || fade <= 0) return;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(badge.x, badge.y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = badge.kind === 'correct' ? '#3FBF4F' : '#E5484D';
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = r * 0.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (badge.kind === 'correct') {
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

  // --------------------------------------------------------------- reporting

  protected hudState(): HudState {
    const flock = this.flock;
    const detail: LimHudDetail | undefined = flock
      ? {
          urgency:
            flock.deadline === Infinity
              ? 1
              : clamp01(flock.deadline / Math.max(this.knobs.responseWindow, 0.001)),
        }
      : undefined;

    return {
      timeLeft: Math.ceil(this.timeLeft),
      score: this.score,
      multiplier: this.multiplier,
      streak: this.streak,
      streakTarget: STREAK_TARGET,
      maxMultiplier: this.multiplier >= MAX_MULTIPLIER,
      detail,
    };
  }

  override debugSnapshot(): Record<string, unknown> {
    const f = this.flock;
    return {
      phase: this.phase,
      score: this.score,
      multiplier: this.multiplier,
      correct: this.correct,
      mistakes: this.mistakes,
      difficulty: difficultyIndex(this.opts.level, this.correct),
      flock: f
        ? {
            shape: f.shape,
            target: f.target,
            flankers: f.flankers,
            congruent: f.target === f.flankers,
            state: f.state,
            answered: f.answered,
            x: Math.round(f.x),
            y: Math.round(f.y),
          }
        : null,
    };
  }

  protected buildResult(): RoundResult {
    const answered = this.correct + this.mistakes;
    const accuracy = answered === 0 ? 0 : this.correct / answered;
    // The reference's end bonus tracks the multiplier the round *finished* on:
    // its final ×9 paid 2250, not the ×10 it had touched earlier.
    const bonus = this.multiplier * BONUS_PER_MULTIPLIER;
    const total = this.score + bonus;

    const levelBefore = this.opts.level;
    let level = levelBefore;
    if (shouldLevelUp(accuracy, this.correct)) level = Math.min(MAX_DIFFICULTY, levelBefore + 1);
    else if (shouldLevelDown(accuracy, answered)) level = Math.max(1, levelBefore - 1);

    Sfx.play('finish');

    return {
      score: this.score,
      bonus,
      total,
      correct: this.correct,
      mistakes: this.mistakes,
      accuracy,
      maxMultiplier: this.multiplier,
      level,
      levelBefore,
      leveledUp: level > levelBefore,
      newBest: total > this.opts.best,
      best: Math.max(total, this.opts.best),
    };
  }
}
