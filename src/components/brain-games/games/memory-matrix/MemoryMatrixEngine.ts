import {
  GameEngine,
  type EngineHooks,
  type EngineOptions,
  type TutorialHint,
} from '../../core/engine/GameEngine';
import { Rng } from '../../core/engine/Rng';
import { Ease, clamp01 } from '../../core/engine/Tween';
import type { HudState, RoundResult } from '../../core/types';
import * as Sfx from '../../core/audio/Sfx';
import {
  gridSizeFor,
  MAX_TILES,
  MIN_TILES,
  nextTiles,
  openingTiles,
  PERFECT_BONUS_PER_TILE,
  POINTS_PER_TILE,
  studySeconds,
  TRIALS,
} from './difficulty';

// --- palette, sampled from the reference
const BG_TOP = '#8A6660';
const BG_BOTTOM = '#5E443F';
const FRAME = '#3A2A25';
const TILE = '#7A5551';
const TILE_FOUND = '#5FCFC0';
const WRONG = '#F26B1F';

const REVEAL_DUR = 1.0;
const RESULT_HOLD = 0.7;
const INTERSTITIAL = 1.1;

export type Stage = 'interstitial' | 'study' | 'recall' | 'reveal';

export interface MmHudDetail {
  trial: number;
  trials: number;
  tiles: number;
  /** Correct tiles still to be uncovered. */
  remaining: number;
  stage: Stage;
  /** Set for a moment after a perfect trial. */
  bonus: number;
}

interface Trial {
  tiles: number;
  grid: number;
  /** Cell indices holding the pattern. */
  pattern: Set<number>;
  found: Set<number>;
  wrong: Set<number>;
  stage: Stage;
  t: number;
}

export class MemoryMatrixEngine extends GameEngine {
  private rng: Rng;

  private trialIndex = 0;
  private trial: Trial | null = null;
  private tiles: number;
  private bestTiles: number;

  private score = 0;
  private bonusFlash = 0;
  private bonusFlashT = 0;
  private shake = 0;
  private marks: Array<{ cell: number; t: number }> = [];

  private tutStep = 0;
  private tutTimer = 0;
  private tutCaption: string | null = null;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks, options: EngineOptions) {
    super(canvas, hooks, options);
    this.rng = new Rng(this.opts.seed);
    this.tiles = openingTiles(this.opts.level);
    this.bestTiles = this.tiles;
    Sfx.setMuted(this.opts.muted);
  }

  get roundSeconds(): number {
    // Trial-based: the round ends when trial 12 resolves, via endRound().
    return 600;
  }

  protected setup(): void {
    // Nothing to cache; layout is derived per frame.
  }

  // ------------------------------------------------------------------ trials

  private makeTrial(tiles: number): Trial {
    const grid = gridSizeFor(tiles);
    const cells = grid * grid;
    const pattern = new Set<number>();
    while (pattern.size < Math.min(tiles, cells)) pattern.add(this.rng.int(0, cells - 1));
    return {
      tiles,
      grid,
      pattern,
      found: new Set(),
      wrong: new Set(),
      stage: 'interstitial',
      t: 0,
    };
  }

  private startTrial(): void {
    this.trialIndex++;
    this.trial = this.makeTrial(this.tiles);
    this.bestTiles = Math.max(this.bestTiles, this.tiles);
  }

  // ------------------------------------------------------------------- input

  protected onTap(x: number, y: number): void {
    const trial = this.trial;
    if (!trial || trial.stage !== 'recall') return;
    const cell = this.cellAt(x, y, trial.grid);
    if (cell < 0) return;
    if (trial.found.has(cell) || trial.wrong.has(cell)) return;

    if (trial.pattern.has(cell)) {
      trial.found.add(cell);
      Sfx.play('correct');
      if (trial.found.size >= trial.pattern.size) this.completeTrial(trial);
    } else {
      trial.wrong.add(cell);
      this.marks.push({ cell, t: 0 });
      this.shake = 1;
      Sfx.play('wrong');
    }
  }

  private completeTrial(trial: Trial): void {
    const perfect = trial.wrong.size === 0;
    this.score += trial.pattern.size * POINTS_PER_TILE;
    if (perfect) {
      const bonus = trial.pattern.size * PERFECT_BONUS_PER_TILE;
      this.score += bonus;
      this.bonusFlash = bonus;
      this.bonusFlashT = 0;
      Sfx.play('levelup');
    }
    trial.stage = 'reveal';
    trial.t = 0;
  }

  // ------------------------------------------------------------------ update

  protected update(dt: number): void {
    for (const m of this.marks) m.t += dt;
    this.marks = this.marks.filter((m) => m.t < 0.7);
    this.shake = Math.max(0, this.shake - dt * 4.5);
    if (this.bonusFlash > 0) {
      this.bonusFlashT += dt;
      if (this.bonusFlashT > 1.6) this.bonusFlash = 0;
    }

    if (this.phase !== 'playing') return;

    if (!this.trial) {
      this.startTrial();
      return;
    }
    this.advance(this.trial, dt);
  }

  private advance(trial: Trial, dt: number): void {
    trial.t += dt;

    if (trial.stage === 'interstitial' && trial.t >= INTERSTITIAL) {
      trial.stage = 'study';
      trial.t = 0;
    } else if (trial.stage === 'study' && trial.t >= studySeconds(trial.tiles)) {
      trial.stage = 'recall';
      trial.t = 0;
    } else if (trial.stage === 'reveal' && trial.t >= REVEAL_DUR + RESULT_HOLD) {
      // Adapt for the next trial, then either continue or finish the round.
      this.tiles = nextTiles(trial.tiles, trial.wrong.size);
      this.trial = null;
      if (this.trialIndex >= TRIALS) this.endRound();
    }
  }

  // ---------------------------------------------------------------- tutorial

  protected updateTutorial(dt: number): boolean {
    for (const m of this.marks) m.t += dt;
    this.marks = this.marks.filter((m) => m.t < 0.7);
    this.shake = Math.max(0, this.shake - dt * 4.5);

    if (this.tutStep === 0) {
      this.setCaption({ text: 'Memorise the highlighted tiles before they vanish.' });
      if (!this.trial) {
        this.trial = this.makeTrial(4);
        this.trial.stage = 'study';
      }
      this.trial.t += dt;
      if (this.trial.stage === 'study' && this.trial.t >= 2.4) {
        this.trial.stage = 'recall';
        this.trial.t = 0;
        this.tutStep = 1;
      }
      return false;
    }

    if (this.tutStep === 1) {
      this.setCaption({ text: 'Now tap where they were.' });
      if (this.trial && this.trial.stage === 'reveal') {
        this.trial.t += dt;
        if (this.trial.t >= REVEAL_DUR) {
          this.trial = null;
          this.tutStep = 2;
          this.tutTimer = 0;
        }
      }
      return false;
    }

    this.setCaption({
      text: 'Get a trial perfect and the next one adds a tile. Ready?',
      card: true,
    });
    this.trial = null;
    this.tutTimer += dt;
    return this.tutTimer >= 1.9;
  }

  private setCaption(hint: TutorialHint): void {
    if (this.tutCaption === hint.text) return;
    this.tutCaption = hint.text;
    this.hooks.onTutorialCaption?.(hint);
  }

  // ------------------------------------------------------------------ layout

  private boardRect(grid: number): DOMRect {
    const w = this.surface.width;
    const h = this.surface.height;
    const size = Math.min(w * 0.86, h * 0.5);
    void grid;
    return new DOMRect((w - size) / 2, h * 0.42 - size / 2, size, size);
  }

  private cellAt(x: number, y: number, grid: number): number {
    const r = this.boardRect(grid);
    const pad = r.width * 0.035;
    const inner = r.width - pad * 2;
    const cx = Math.floor(((x - r.x - pad) / inner) * grid);
    const cy = Math.floor(((y - r.y - pad) / inner) * grid);
    if (cx < 0 || cy < 0 || cx >= grid || cy >= grid) return -1;
    return cy * grid + cx;
  }

  // -------------------------------------------------------------------- draw

  protected draw(): void {
    const ctx = this.surface.ctx;
    const w = this.surface.width;
    const h = this.surface.height;
    const unit = this.surface.unit;

    ctx.save();
    if (this.shake > 0) {
      const amp = this.shake * this.shake * unit * 0.012;
      const now = performance.now();
      ctx.translate(Math.sin(now * 0.05) * amp, Math.cos(now * 0.043) * amp);
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, BG_TOP);
    grad.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const vig = ctx.createRadialGradient(w / 2, h * 0.42, unit * 0.2, w / 2, h * 0.42, Math.max(w, h) * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    const trial = this.trial;
    if (trial) {
      if (trial.stage === 'interstitial') this.drawInterstitial(ctx, w, h, unit, trial);
      else this.drawBoard(ctx, unit, trial);
    }

    ctx.restore();
  }

  /** The "TILES N" disc that opens each trial. */
  private drawInterstitial(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    unit: number,
    trial: Trial,
  ): void {
    const t = clamp01(trial.t / 0.3);
    const r = unit * 0.16 * Ease.outBack(t);
    ctx.save();
    ctx.globalAlpha = t * (1 - clamp01((trial.t - INTERSTITIAL * 0.7) / (INTERSTITIAL * 0.3)));
    ctx.translate(w / 2, h * 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(214, 200, 194, 0.92)';
    ctx.fill();
    ctx.fillStyle = '#4A342F';
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(r * 0.24)}px 'Nunito Sans', system-ui, sans-serif`;
    ctx.fillText('TILES', 0, -r * 0.16);
    ctx.font = `800 ${Math.round(r * 0.62)}px 'Nunito Sans', system-ui, sans-serif`;
    ctx.fillText(String(trial.tiles), 0, r * 0.44);
    ctx.restore();
  }

  private drawBoard(ctx: CanvasRenderingContext2D, unit: number, trial: Trial): void {
    const r = this.boardRect(trial.grid);
    const pad = r.width * 0.035;
    const inner = r.width - pad * 2;
    const step = inner / trial.grid;
    const gap = step * 0.09;

    ctx.save();
    ctx.fillStyle = FRAME;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.width, r.height, r.width * 0.015);
    ctx.fill();

    // During the reveal the answer wipes in on a diagonal, as the reference does.
    const revealT = trial.stage === 'reveal' ? clamp01(trial.t / REVEAL_DUR) : 0;

    for (let i = 0; i < trial.grid * trial.grid; i++) {
      const cx = i % trial.grid;
      const cy = Math.floor(i / trial.grid);
      const x = r.x + pad + cx * step + gap / 2;
      const y = r.y + pad + cy * step + gap / 2;
      const s = step - gap;

      const inPattern = trial.pattern.has(i);
      const found = trial.found.has(i);
      const wrong = trial.wrong.has(i);

      let fill = TILE;
      if (trial.stage === 'study' && inPattern) fill = TILE_FOUND;
      else if (found) fill = TILE_FOUND;

      // Diagonal wipe: cells nearer the top-left turn over first.
      const wave = (cx + cy) / (trial.grid * 2 - 2);
      const revealed = revealT > 0 && revealT > wave * 0.7;
      if (revealed && inPattern && !found) fill = '#EDE6E1';

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, s, s, s * 0.06);
      ctx.fill();

      if (wrong && !revealed) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(120, 60, 30, 0.35)';
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // Wrong-tap badges float above the grid so they read at any tile size.
    for (const m of this.marks) {
      const cx = m.cell % trial.grid;
      const cy = Math.floor(m.cell / trial.grid);
      const x = r.x + pad + cx * step + step / 2;
      const y = r.y + pad + cy * step + step / 2;
      const pop = Ease.outBack(clamp01(m.t / 0.14));
      const fade = 1 - clamp01((m.t - 0.4) / 0.3);
      const rad = Math.max(step * 0.46, unit * 0.045) * pop;
      if (fade <= 0) continue;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = WRONG;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = rad * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rad * 0.3 + x, -rad * 0.3 + y);
      ctx.lineTo(rad * 0.3 + x, rad * 0.3 + y);
      ctx.moveTo(rad * 0.3 + x, -rad * 0.3 + y);
      ctx.lineTo(-rad * 0.3 + x, rad * 0.3 + y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --------------------------------------------------------------- reporting

  protected hudState(): HudState {
    const trial = this.trial;
    const detail: MmHudDetail = {
      trial: Math.min(this.trialIndex, TRIALS),
      trials: TRIALS,
      tiles: trial?.tiles ?? this.tiles,
      remaining: trial ? trial.pattern.size - trial.found.size : 0,
      stage: trial?.stage ?? 'interstitial',
      bonus: this.bonusFlash,
    };
    return {
      timeLeft: 0,
      score: this.score,
      multiplier: 1,
      streak: 0,
      streakTarget: 1,
      maxMultiplier: false,
      detail,
    };
  }

  override debugSnapshot(): Record<string, unknown> {
    const t = this.trial;
    return {
      phase: this.phase,
      score: this.score,
      trialIndex: this.trialIndex,
      trials: TRIALS,
      tiles: this.tiles,
      bestTiles: this.bestTiles,
      trial: t
        ? {
            tiles: t.tiles,
            grid: t.grid,
            stage: t.stage,
            pattern: [...t.pattern],
            found: [...t.found],
            wrong: t.wrong.size,
            rect: (() => {
              const r = this.boardRect(t.grid);
              return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
            })(),
          }
        : null,
    };
  }

  protected buildResult(): RoundResult {
    const levelBefore = this.opts.level;
    const level = Math.max(MIN_TILES, Math.min(MAX_TILES, this.bestTiles));

    Sfx.play('finish');

    return {
      score: this.score,
      bonus: 0,
      total: this.score,
      correct: this.trialIndex,
      mistakes: 0,
      accuracy: 1,
      // Carries the headline stat — the largest pattern held — to the card.
      maxMultiplier: this.bestTiles,
      level,
      levelBefore,
      leveledUp: level > levelBefore,
      newBest: this.score > this.opts.best,
      best: Math.max(this.score, this.opts.best),
    };
  }
}
