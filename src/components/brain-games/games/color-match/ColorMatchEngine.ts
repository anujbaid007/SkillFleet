import {
  GameEngine,
  type EngineHooks,
  type EngineOptions,
  type TutorialHint,
} from '../../core/engine/GameEngine';
import type { DirectionEvent } from '../../core/engine/Input';
import { Rng } from '../../core/engine/Rng';
import { clamp01 } from '../../core/engine/Tween';
import type { HudState, RoundResult } from '../../core/types';
import * as Sfx from '../../core/audio/Sfx';
import {
  BROWN_TABLE,
  bakeGrain,
  barHeight,
  drawAnswerBar,
  drawCard,
  drawLabel,
  drawPrompt,
  drawTable,
  drawVerdict,
  slotRects,
} from '../_shared/cardTable';
import { INK, INK_CB, makeTrial, NEUTRAL, type Trial } from './words';
import {
  difficultyIndex,
  knobsFor,
  MAX_DIFFICULTY,
  shouldLevelDown,
  shouldLevelUp,
  type Knobs,
} from './difficulty';

const ROUND_SECONDS = 45;
const POINTS_PER_CORRECT = 100;
const STREAK_TARGET = 4;
const MAX_MULTIPLIER = 10;
const BONUS_PER_MULTIPLIER = 250;

const ENTER_DUR = 0.14;
const EXIT_DUR = 0.18;
const GAP = 0.06;
const BADGE_DUR = 0.44;

export interface CmHudDetail {
  urgency: number;
}

interface Round {
  trial: Trial;
  t: number;
  state: 'entering' | 'active' | 'exiting';
  answered: boolean;
  outcome: 'none' | 'correct' | 'wrong';
  deadline: number;
}

export class ColorMatchEngine extends GameEngine {
  private rng: Rng;
  private grain: HTMLCanvasElement | null = null;

  private round: Round | null = null;
  private gap = 0;
  private badge: { kind: 'correct' | 'wrong'; t: number } | null = null;
  private press: { side: 'no' | 'yes'; t: number } | null = null;
  private shake = 0;

  private score = 0;
  private multiplier = 1;
  private streak = 0;
  private correct = 0;
  private mistakes = 0;
  private lureSeen = 0;
  private lureMissed = 0;

  private tutStep = 0;
  private tutTimer = 0;
  private tutCaption: string | null = null;
  private tutDone = 0;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks, options: EngineOptions) {
    super(canvas, hooks, options);
    this.rng = new Rng(this.opts.seed);
    Sfx.setMuted(this.opts.muted);
  }

  get roundSeconds(): number {
    return ROUND_SECONDS;
  }

  protected setup(): void {
    this.grain = bakeGrain(this.opts.seed, BROWN_TABLE.grain);
  }

  private get knobs(): Knobs {
    return knobsFor(difficultyIndex(this.opts.level, this.correct));
  }

  private get inks(): Record<string, string> {
    return this.opts.colorblind ? INK_CB : INK;
  }

  // ------------------------------------------------------------------ trials

  private spawn(): void {
    const k = this.knobs;
    const trial = makeTrial(this.rng, k.stroopChance, k.lureChance);
    if (trial.lure) this.lureSeen++;
    this.round = {
      trial,
      t: 0,
      state: 'entering',
      answered: false,
      outcome: 'none',
      deadline: k.responseWindow,
    };
  }

  // ------------------------------------------------------------------- input

  protected onDirection(e: DirectionEvent): void {
    if (e.direction === 'left') this.answer(false);
    else if (e.direction === 'right') this.answer(true);
  }

  protected onTap(x: number, y: number): void {
    if (y < this.surface.height - barHeight(this.surface.height)) return;
    this.answer(x >= this.surface.width / 2);
  }

  private answer(said: boolean): void {
    this.press = { side: said ? 'yes' : 'no', t: 0 };
    const round = this.round;
    if (!round || round.answered || round.state === 'exiting') return;

    const isCorrect = said === round.trial.answer;
    if (this.phase === 'tutorial') {
      this.tutorialAnswer(isCorrect, round);
      return;
    }
    this.resolve(round, isCorrect);
  }

  private resolve(round: Round, isCorrect: boolean): void {
    round.answered = true;
    round.outcome = isCorrect ? 'correct' : 'wrong';
    round.state = 'exiting';
    round.t = 0;
    this.badge = { kind: isCorrect ? 'correct' : 'wrong', t: 0 };

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
      if (round.trial.lure) this.lureMissed++;
      this.multiplier = Math.max(1, this.multiplier - 1);
      this.streak = 0;
      this.shake = 1;
      Sfx.play('wrong');
    }
  }

  // ------------------------------------------------------------------ update

  protected update(dt: number): void {
    this.tick(dt);
    if (this.phase !== 'playing') return;

    if (!this.round) {
      this.gap -= dt;
      if (this.gap <= 0) this.spawn();
      return;
    }

    this.advance(this.round, dt, true);
    if (this.round.state === 'exiting' && this.round.t >= EXIT_DUR) {
      this.round = null;
      this.gap = GAP;
    }
  }

  private tick(dt: number): void {
    if (this.badge) {
      this.badge.t += dt;
      if (this.badge.t >= BADGE_DUR) this.badge = null;
    }
    if (this.press) {
      this.press.t += dt;
      if (this.press.t >= 0.2) this.press = null;
    }
    this.shake = Math.max(0, this.shake - dt * 4.5);
  }

  private advance(round: Round, dt: number, enforce: boolean): void {
    round.t += dt;
    if (round.state === 'entering' && round.t >= ENTER_DUR) {
      round.state = 'active';
      round.t = 0;
    }
    if (enforce && round.state === 'active' && !round.answered) {
      round.deadline -= dt;
      if (round.deadline <= 0) this.resolve(round, false);
    }
  }

  // ---------------------------------------------------------------- tutorial

  private freshTutorialRound(stroop: number, lure: number): Round {
    return {
      trial: makeTrial(this.rng, stroop, lure),
      t: 0,
      state: 'entering',
      answered: false,
      outcome: 'none',
      deadline: Infinity,
    };
  }

  protected updateTutorial(dt: number): boolean {
    this.tick(dt);

    if (this.tutStep === 0) {
      this.setCaption({
        text: 'Does the MEANING of the top word match the COLOUR the bottom word is printed in?',
      });
      if (!this.round) this.round = this.freshTutorialRound(0, 0);
      this.advance(this.round, dt, false);
      if (this.round.state === 'exiting' && this.round.t >= EXIT_DUR) {
        this.round = null;
        this.tutStep = 1;
        this.gap = GAP;
      }
      return false;
    }

    if (this.tutStep === 1) {
      this.setCaption({
        text: 'Careful — the bottom word will often say one colour and be printed in another.',
      });
      if (!this.round) {
        this.gap -= dt;
        if (this.gap <= 0) this.round = this.freshTutorialRound(1, 0.5);
        return false;
      }
      this.advance(this.round, dt, false);
      if (this.round.state === 'exiting' && this.round.t >= EXIT_DUR) {
        this.round = null;
        this.gap = GAP;
        if (this.tutDone >= 4) {
          this.tutStep = 2;
          this.tutTimer = 0;
        }
      }
      return false;
    }

    this.setCaption({
      text: 'Respond as quickly as possible while avoiding mistakes.',
      card: true,
    });
    this.round = null;
    this.tutTimer += dt;
    return this.tutTimer >= 1.9;
  }

  private tutorialAnswer(isCorrect: boolean, round: Round): void {
    if (!isCorrect) {
      this.badge = { kind: 'wrong', t: 0 };
      this.shake = 1;
      Sfx.play('wrong');
      return;
    }
    round.answered = true;
    round.outcome = 'correct';
    round.state = 'exiting';
    round.t = 0;
    this.badge = { kind: 'correct', t: 0 };
    Sfx.play('correct');
    if (this.tutStep === 1) this.tutDone++;
  }

  private setCaption(hint: TutorialHint): void {
    if (this.tutCaption === hint.text) return;
    this.tutCaption = hint.text;
    this.hooks.onTutorialCaption?.(hint);
  }

  // -------------------------------------------------------------------- draw

  protected draw(): void {
    const ctx = this.surface.ctx;
    const w = this.surface.width;
    const h = this.surface.height;
    const unit = this.surface.unit;
    const pal = BROWN_TABLE;

    ctx.save();
    if (this.shake > 0) {
      const amp = this.shake * this.shake * unit * 0.014;
      const now = performance.now();
      ctx.translate(Math.sin(now * 0.05) * amp, Math.cos(now * 0.043) * amp);
    }

    drawTable(ctx, w, h, pal, this.grain);

    const slots = slotRects(w, h);
    const round = this.round;
    const enterT = round?.state === 'entering' ? round.t / ENTER_DUR : 1;
    const alpha = round?.state === 'exiting' ? 1 - clamp01(round.t / EXIT_DUR) * 0.35 : 1;

    // The standing question, which this game never hides.
    drawPrompt(
      ctx,
      'Does the meaning match the text colour?',
      w / 2,
      slots.top.y - unit * 0.14,
      unit,
      pal,
    );

    drawCard(
      ctx,
      slots.top,
      round ? { text: round.trial.topWord, color: NEUTRAL } : null,
      enterT,
      alpha,
    );
    drawCard(
      ctx,
      slots.bottom,
      round
        ? { text: round.trial.bottomWord, color: this.inks[round.trial.bottomInk] }
        : null,
      enterT,
      alpha,
    );

    drawLabel(ctx, 'meaning', w / 2, slots.top.y - unit * 0.045, unit, pal);
    drawLabel(
      ctx,
      'text colour',
      w / 2,
      slots.bottom.y + slots.bottom.height + unit * 0.045,
      unit,
      pal,
    );

    if (this.badge) {
      const midY = slots.top.y + slots.top.height + (slots.bottom.y - slots.top.y - slots.top.height) / 2;
      drawVerdict(ctx, this.badge.kind, w / 2, midY, unit, this.badge.t, BADGE_DUR);
    }

    // See the note in BrainShiftEngine: the tutorial names the side that
    // answers the card, so the control is taught alongside the rule.
    const hint =
      this.phase === 'tutorial' && round && !round.answered && round.state !== 'exiting'
        ? round.trial.answer
          ? 'yes'
          : 'no'
        : null;
    drawAnswerBar(ctx, w, h, unit, pal, this.press, hint);
    ctx.restore();
  }

  // --------------------------------------------------------------- reporting

  protected hudState(): HudState {
    const k = this.knobs;
    const detail: CmHudDetail = {
      urgency:
        this.round && this.round.deadline !== Infinity
          ? clamp01(this.round.deadline / Math.max(k.responseWindow, 0.001))
          : 1,
    };
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
    const r = this.round;
    return {
      phase: this.phase,
      score: this.score,
      multiplier: this.multiplier,
      correct: this.correct,
      mistakes: this.mistakes,
      lureSeen: this.lureSeen,
      lureMissed: this.lureMissed,
      difficulty: difficultyIndex(this.opts.level, this.correct),
      window: +this.knobs.responseWindow.toFixed(2),
      trial: r
        ? {
            topWord: r.trial.topWord,
            bottomWord: r.trial.bottomWord,
            bottomInk: r.trial.bottomInk,
            answer: r.trial.answer,
            bottomCongruent: r.trial.bottomCongruent,
            lure: r.trial.lure,
            answered: r.answered,
            state: r.state,
          }
        : null,
    };
  }

  protected buildResult(): RoundResult {
    const answered = this.correct + this.mistakes;
    const accuracy = answered === 0 ? 0 : this.correct / answered;
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
