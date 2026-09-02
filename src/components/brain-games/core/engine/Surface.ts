/**
 * A device-pixel-ratio-aware 2D canvas surface.
 *
 * Games draw in CSS pixels and never think about DPR: the context is
 * pre-scaled, so a 1px line is 1 CSS px and stays crisp on retina.
 */
export class Surface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Logical size in CSS pixels. */
  width = 0;
  height = 0;
  dpr = 1;

  private observer: ResizeObserver | null = null;
  private onResize?: (w: number, h: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
  }

  /** Start watching the canvas box and keep the backing store in sync. */
  observe(onResize?: (w: number, h: number) => void): void {
    this.onResize = onResize;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas);
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    // Cap DPR at 2.5: beyond that the fill-rate cost buys no visible sharpness.
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this.width && h === this.height && dpr === this.dpr) return;

    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.onResize?.(w, h);
  }

  /** Shortest screen edge — the unit games scale their artwork against. */
  get unit(): number {
    return Math.min(this.width, this.height);
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
