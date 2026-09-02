import type { Direction } from '../types';

export type InputSource = 'key' | 'swipe';
export interface DirectionEvent {
  direction: Direction;
  source: InputSource;
}

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

/** Minimum travel before a drag counts as a swipe, in CSS pixels. */
const SWIPE_THRESHOLD = 26;
/** How much the dominant axis must beat the other to be unambiguous. */
const AXIS_RATIO = 1.25;

/**
 * Turns keyboard, touch and mouse into a single directional signal.
 *
 * A swipe fires the moment it crosses the threshold rather than on release,
 * which is what makes fast play feel responsive; the gesture then locks until
 * the pointer lifts so one drag can never emit twice.
 */
export class DirectionInput {
  private handler: ((e: DirectionEvent) => void) | null = null;
  private el: HTMLElement | null = null;

  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private fired = false;

  private enabled = false;

  /** True when the last input came from touch — the tutorial uses this to
   *  say "swipe" instead of "use the arrow keys". */
  lastSourceWasTouch = false;

  attach(el: HTMLElement, handler: (e: DirectionEvent) => void): void {
    this.detach();
    this.el = el;
    this.handler = handler;
    this.enabled = true;

    window.addEventListener('keydown', this.onKeyDown);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerEnd);
    el.addEventListener('pointercancel', this.onPointerEnd);
    // Belt and braces against pull-to-refresh / rubber-banding on mobile.
    el.addEventListener('touchmove', this.preventScroll, { passive: false });
  }

  detach(): void {
    if (this.el) {
      this.el.removeEventListener('pointerdown', this.onPointerDown);
      this.el.removeEventListener('pointermove', this.onPointerMove);
      this.el.removeEventListener('pointerup', this.onPointerEnd);
      this.el.removeEventListener('pointercancel', this.onPointerEnd);
      this.el.removeEventListener('touchmove', this.preventScroll);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    this.el = null;
    this.handler = null;
    this.pointerId = null;
    this.enabled = false;
  }

  /** Stop emitting without tearing down listeners (used while paused). */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.pointerId = null;
  }

  private preventScroll = (e: TouchEvent) => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    const dir = KEY_MAP[e.code];
    if (!dir) return;
    // Arrow keys scroll the page by default; a game screen must not.
    e.preventDefault();
    if (e.repeat) return;
    this.lastSourceWasTouch = false;
    this.handler?.({ direction: dir, source: 'key' });
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled || this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.fired = false;
    if (e.pointerType === 'touch') this.lastSourceWasTouch = true;
    this.el?.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.enabled || this.fired || e.pointerId !== this.pointerId) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;

    // Ignore diagonals: an ambiguous flick should not be scored as a guess.
    const horizontal = ax > ay;
    if ((horizontal ? ax / Math.max(ay, 0.001) : ay / Math.max(ax, 0.001)) < AXIS_RATIO) return;

    this.fired = true;
    const direction: Direction = horizontal
      ? dx > 0
        ? 'right'
        : 'left'
      : dy > 0
        ? 'down'
        : 'up';
    this.handler?.({ direction, source: 'swipe' });
  };

  private onPointerEnd = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.el?.releasePointerCapture?.(e.pointerId);
    this.pointerId = null;
    this.fired = false;
  };
}

/**
 * Taps on the play surface, reported in CSS pixels relative to the canvas.
 *
 * Kept separate from DirectionInput so both can listen to the same element:
 * a gesture that travels far enough to be a swipe is by definition not a tap,
 * so the two never fire for the same gesture.
 */
export class TapInput {
  private el: HTMLElement | null = null;
  private handler: ((x: number, y: number) => void) | null = null;
  private enabled = false;

  private id: number | null = null;
  private startX = 0;
  private startY = 0;
  private startedAt = 0;

  attach(el: HTMLElement, handler: (x: number, y: number) => void): void {
    this.detach();
    this.el = el;
    this.handler = handler;
    this.enabled = true;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onCancel);
  }

  detach(): void {
    if (this.el) {
      this.el.removeEventListener('pointerdown', this.onDown);
      this.el.removeEventListener('pointerup', this.onUp);
      this.el.removeEventListener('pointercancel', this.onCancel);
    }
    this.el = null;
    this.handler = null;
    this.id = null;
    this.enabled = false;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.id = null;
  }

  private onDown = (e: PointerEvent) => {
    if (!this.enabled || this.id !== null) return;
    this.id = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startedAt = performance.now();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.enabled || e.pointerId !== this.id) return;
    this.id = null;

    const moved = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    // A drag is someone swiping or scrolling, not tapping; a very long press
    // is usually a context menu or a fumble.
    if (moved > TAP_SLOP || performance.now() - this.startedAt > TAP_MAX_MS) return;

    const rect = (this.el as HTMLElement).getBoundingClientRect();
    this.handler?.(e.clientX - rect.left, e.clientY - rect.top);
  };

  private onCancel = (e: PointerEvent) => {
    if (e.pointerId === this.id) this.id = null;
  };
}

/**
 * A continuous drag, for games where the answer is a position rather than a
 * choice.
 *
 * `TapInput` deliberately reports only completed taps, which is right for
 * pressing things and useless for aiming one. This reports the whole gesture
 * and leaves the interpretation to the game. It is additive: nothing that
 * does not attach it is affected.
 */
export class DragInput {
  private el: HTMLElement | null = null;
  private id: number | null = null;
  private enabled = false;
  private onMove: ((x: number, y: number, first: boolean) => void) | null = null;
  private onEnd: (() => void) | null = null;

  attach(
    el: HTMLElement,
    onMove: (x: number, y: number, first: boolean) => void,
    onEnd?: () => void,
  ): void {
    this.detach();
    this.el = el;
    this.onMove = onMove;
    this.onEnd = onEnd ?? null;
    this.enabled = true;
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.up);
  }

  detach(): void {
    if (this.el) {
      this.el.removeEventListener('pointerdown', this.down);
      this.el.removeEventListener('pointermove', this.move);
      this.el.removeEventListener('pointerup', this.up);
      this.el.removeEventListener('pointercancel', this.up);
    }
    this.el = null;
    this.id = null;
    this.onMove = null;
    this.onEnd = null;
    this.enabled = false;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.id = null;
  }

  private point(e: PointerEvent): { x: number; y: number } {
    const rect = (this.el as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private down = (e: PointerEvent) => {
    if (!this.enabled || this.id !== null) return;
    this.id = e.pointerId;
    const p = this.point(e);
    this.onMove?.(p.x, p.y, true);
  };

  private move = (e: PointerEvent) => {
    if (!this.enabled || e.pointerId !== this.id) return;
    const p = this.point(e);
    this.onMove?.(p.x, p.y, false);
  };

  private up = (e: PointerEvent) => {
    if (e.pointerId !== this.id) return;
    this.id = null;
    this.onEnd?.();
  };
}

/** Movement allowed before a press stops counting as a tap, in CSS pixels. */
const TAP_SLOP = 14;
/** Longest press still treated as a tap, in milliseconds. */
const TAP_MAX_MS = 700;

/** Best guess at the primary input the device offers, for tutorial copy. */
export function prefersTouch(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );
}
