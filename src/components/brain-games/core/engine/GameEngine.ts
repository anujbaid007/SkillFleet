import { Surface } from './Surface';
import { DirectionInput, DragInput, TapInput, type DirectionEvent } from './Input';
import type { HudState, RoundResult } from '../types';

/** A line of onboarding copy plus how the host should present it. */
export interface TutorialHint {
  text: string;
  /** Render as a solid card rather than text over the scrim. */
  card?: boolean;
  /** Show the game's bottom HUD strip during this step. */
  showModes?: boolean;
}

export type Phase = 'idle' | 'tutorial' | 'countdown' | 'playing' | 'paused' | 'finished';

export interface EngineHooks {
  /** Fired only when a displayed HUD value actually changes. */
  onHud: (state: HudState) => void;
  onPhase: (phase: Phase) => void;
  /** Countdown ticks 3, 2, 1 then 0 immediately before play. */
  onCountdown: (n: number) => void;
  onFinish: (result: RoundResult) => void;
  /** What the in-canvas tutorial wants shown, or null to hide it. */
  onTutorialCaption?: (hint: TutorialHint | null) => void;
}

export interface EngineOptions {
  level: number;
  /** Personal best for this game, so the engine can flag a new record. */
  best?: number;
  /** Run the in-canvas tutorial before the countdown. */
  tutorial?: boolean;
  seed?: number;
  reducedMotion?: boolean;
  colorblind?: boolean;
  muted?: boolean;
}

/**
 * Base class for every game on the platform.
 *
 * It owns the requestAnimationFrame loop, the clock, pause/resume, resizing
 * and input plumbing so a game subclass only has to implement `update` and
 * `draw`. Nothing here touches React: the loop must never be coupled to a
 * render cycle or frame pacing goes with it.
 */
export abstract class GameEngine {
  protected surface: Surface;
  protected input = new DirectionInput();
  protected taps = new TapInput();
  protected drags = new DragInput();
  protected hooks: EngineHooks;
  protected opts: Required<EngineOptions>;

  phase: Phase = 'idle';

  private rafId = 0;
  private lastFrameTime = 0;
  private countdownRemaining = 0;
  private lastCountdownShown = -1;
  private lastHudKey = '';

  /** Seconds elapsed in the round, excluding paused time. */
  protected elapsed = 0;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks, options: EngineOptions) {
    this.surface = new Surface(canvas);
    this.hooks = hooks;
    this.opts = {
      level: options.level,
      best: options.best ?? 0,
      tutorial: options.tutorial ?? false,
      seed: options.seed ?? (Date.now() >>> 0),
      reducedMotion: options.reducedMotion ?? false,
      colorblind: options.colorblind ?? false,
      muted: options.muted ?? false,
    };
  }

  // ---- Subclass contract -------------------------------------------------

  /** Total seconds in a round. */
  abstract get roundSeconds(): number;
  /** Called once after the surface has its first real size. */
  protected abstract setup(): void;
  /** Advance simulation. `dt` is seconds, already clamped. */
  protected abstract update(dt: number): void;
  /** Paint one frame. */
  protected abstract draw(): void;
  /**
   * Handle a directional answer. Games driven by taps leave this alone.
   * Only called during `playing` or `tutorial`.
   */
  protected onDirection(_e: DirectionEvent): void {}
  /** Handle a tap on the board, in CSS pixels relative to the canvas. */
  protected onTap(_x: number, _y: number): void {}

  /**
   * A drag in progress, for games whose answer is an aim rather than a choice.
   * `first` marks the press that began it.
   */
  protected onDrag(_x: number, _y: number, _first: boolean): void {}

  protected onDragEnd(): void {}
  /** Build the HUD snapshot. Compared by `hudKey` to avoid dead renders. */
  protected abstract hudState(): HudState;
  /** Build the end-of-round result. */
  protected abstract buildResult(): RoundResult;
  /** Optional: react to a resize. */
  protected onResize(_w: number, _h: number): void {}

  /**
   * Introspection for the automated browser harness. The host only exposes
   * this on `window` under `NODE_ENV === 'development'`, so it is unreachable in a
   * production build.
   */
  debugSnapshot(): Record<string, unknown> {
    return { phase: this.phase, elapsed: this.elapsed };
  }
  /**
   * Optional in-canvas tutorial. Return true once it is complete and the
   * round countdown should begin. Games without a tutorial inherit the
   * default, which finishes immediately.
   */
  protected updateTutorial(_dt: number): boolean {
    return true;
  }

  // ---- Lifecycle ---------------------------------------------------------

  start(): void {
    this.surface.observe((w, h) => this.onResize(w, h));
    this.input.attach(this.surface.canvas, (e) => {
      if (this.phase === 'playing' || this.phase === 'tutorial') this.onDirection(e);
    });
    this.taps.attach(this.surface.canvas, (x, y) => {
      if (this.phase === 'playing' || this.phase === 'tutorial') this.onTap(x, y);
    });
    this.drags.attach(
      this.surface.canvas,
      (x, y, first) => {
        if (this.phase === 'playing' || this.phase === 'tutorial') this.onDrag(x, y, first);
      },
      () => {
        if (this.phase === 'playing' || this.phase === 'tutorial') this.onDragEnd();
      },
    );
    this.setup();

    this.phase = this.opts.tutorial ? 'tutorial' : 'countdown';
    this.hooks.onPhase(this.phase);
    this.countdownRemaining = 3;
    this.lastCountdownShown = -1;
    this.elapsed = 0;
    this.lastFrameTime = performance.now();
    this.pushHud(true);
    this.rafId = requestAnimationFrame(this.frame);
  }

  /** Jump straight from the tutorial to the countdown. */
  skipTutorial(): void {
    if (this.phase !== 'tutorial') return;
    this.hooks.onTutorialCaption?.(null);
    this.phase = 'countdown';
    this.hooks.onPhase(this.phase);
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.setEnabled(false);
    this.taps.setEnabled(false);
    this.hooks.onPhase(this.phase);
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.input.setEnabled(true);
    this.taps.setEnabled(true);
    // Discard the wall-clock gap so pausing never costs round time.
    this.lastFrameTime = performance.now();
    this.hooks.onPhase(this.phase);
  }

  /** End the round early (quit). No result is emitted. */
  abort(): void {
    this.stopLoop();
    this.phase = 'finished';
  }

  dispose(): void {
    this.stopLoop();
    this.input.detach();
    this.taps.detach();
    this.drags.detach();
    this.surface.dispose();
  }

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  protected get timeLeft(): number {
    return Math.max(0, this.roundSeconds - this.elapsed);
  }

  // ---- Loop --------------------------------------------------------------

  private frame = (now: number) => {
    this.rafId = requestAnimationFrame(this.frame);

    // Clamp dt: a backgrounded tab returns a huge delta that would teleport
    // every leaf across the screen and burn round time unfairly.
    const dt = Math.min((now - this.lastFrameTime) / 1000, 1 / 20);
    this.lastFrameTime = now;

    if (this.phase === 'tutorial') {
      const done = this.updateTutorial(dt);
      this.draw();
      if (done) {
        this.hooks.onTutorialCaption?.(null);
        this.phase = 'countdown';
        this.hooks.onPhase(this.phase);
      }
      return;
    }

    if (this.phase === 'countdown') {
      this.countdownRemaining -= dt;
      const shown = Math.ceil(this.countdownRemaining);
      if (shown !== this.lastCountdownShown) {
        this.lastCountdownShown = shown;
        this.hooks.onCountdown(Math.max(0, shown));
      }
      if (this.countdownRemaining <= 0) {
        this.phase = 'playing';
        this.hooks.onPhase(this.phase);
      }
      this.update(0);
      this.draw();
      return;
    }

    if (this.phase === 'playing') {
      this.elapsed += dt;
      this.update(dt);
      this.pushHud(false);
      if (this.elapsed >= this.roundSeconds) this.finish();
    } else if (this.phase === 'paused') {
      // Keep painting so the frozen board stays visible behind the overlay.
    } else if (this.phase === 'finished') {
      this.update(dt);
    }

    this.draw();
  };

  /**
   * End the round now, from the game itself.
   *
   * Timed games let the clock run out; trial-based ones — Memory Matrix,
   * Pinball Recall — finish when their last trial resolves and call this
   * instead. Without it such a game has to fake a timer.
   */
  protected endRound(): void {
    if (this.phase === 'finished') return;
    this.finish();
  }

  private finish(): void {
    this.phase = 'finished';
    this.input.setEnabled(false);
    this.taps.setEnabled(false);
    this.pushHud(true);
    this.hooks.onPhase(this.phase);
    this.hooks.onFinish(this.buildResult());
    // Keep the loop alive briefly so the exit animation can play out.
    setTimeout(() => this.stopLoop(), 1500);
  }

  private pushHud(force: boolean): void {
    const s = this.hudState();
    const key = `${s.timeLeft}|${s.score}|${s.multiplier}|${s.streak}|${JSON.stringify(s.detail ?? null)}`;
    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.hooks.onHud(s);
  }
}
