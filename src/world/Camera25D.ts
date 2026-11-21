/**
 * Camera25D.ts
 * Pitched pinhole camera used by the exploration renderer.
 *
 * The world stays a flat 2D plane (x right, y "south"). The camera hovers
 * above and behind the focus point and looks down at PITCH radians, so:
 *  - ground further north (smaller y) is smaller and higher on screen,
 *  - upright sprites are drawn at their foot point scaled by scaleAt(),
 *  - vertical sprite extents use the same scale (billboards), which keeps
 *    existing 3/4-view artwork consistent with the perspective ground.
 *
 * The mapping depends only on (x - fx, y - fy), so camera motion is a pure
 * translation in world space: no jitter from re-projection.
 */

export interface ScreenPoint {
  x: number;
  y: number;
  s: number; // billboard scale at this ground point
}

export class Camera25D {
  /** Camera pitch (radians). sin(pitch) is the ground foreshortening at focus. */
  public pitch = (48 * Math.PI) / 180;
  public zoom = 1;

  public fx = 0; // focus point (world)
  public fy = 0;
  public W = 800; // viewport (CSS px)
  public H = 480;

  private L = 1000; // camera distance to focus
  private f = 1000; // focal length in px
  private sinP = Math.sin(this.pitch);
  private cosP = Math.cos(this.pitch);
  private Hc = 0;
  private Dc = 0;
  /** Screen-space focus anchor; slightly below centre so more world is visible ahead. */
  private cx = 400;
  private cy = 240;

  public setViewport(w: number, h: number): void {
    this.W = w;
    this.H = h;
    // Longer camera distance on taller screens keeps perspective strength similar.
    this.L = Math.max(900, h * 2.2);
    // Small screens (phones) zoom in slightly so characters stay readable.
    this.zoom = w < 520 ? 1.08 : h > 760 ? 1.05 : 1;
    this.f = this.L * this.zoom;
    this.sinP = Math.sin(this.pitch);
    this.cosP = Math.cos(this.pitch);
    this.Hc = this.L * this.sinP;
    this.Dc = this.L * this.cosP;
    this.cx = w / 2;
    this.cy = h * 0.54;
  }

  /** Project a ground point (optionally with art height h in px above ground). */
  public project(x: number, y: number): ScreenPoint {
    const d = this.Dc + (this.fy - y);
    const zc = d * this.cosP + this.Hc * this.sinP;
    const yc = d * this.sinP - this.Hc * this.cosP;
    const s = this.f / Math.max(1, zc);
    return { x: this.cx + (x - this.fx) * s, y: this.cy - yc * s, s };
  }

  public scaleAt(y: number): number {
    const d = this.Dc + (this.fy - y);
    return this.f / Math.max(1, d * this.cosP + this.Hc * this.sinP);
  }

  /** World y of the ground under a screen row (null above the horizon). */
  public groundYAtScreen(sy: number): number | null {
    const t = (this.cy - sy) / this.f;
    const denom = this.sinP - t * this.cosP;
    if (denom <= 0.02) return null;
    const d = (this.Hc * (this.cosP + t * this.sinP)) / denom;
    return this.fy + this.Dc - d;
  }

  /** World x seen at screen column sx on a row with scale s. */
  public worldXAtScreen(sx: number, s: number): number {
    return this.fx + (sx - this.cx) / s;
  }

  /** Inverse projection for taps / clicks. */
  public unproject(sx: number, sy: number): { x: number; y: number } | null {
    const y = this.groundYAtScreen(sy);
    if (y === null) return null;
    const s = this.scaleAt(y);
    return { x: this.fx + (sx - this.cx) / s, y };
  }

  /** World-space bounding box of everything the viewport can show. */
  public visibleWorldRect(margin = 0): { x: number; y: number; w: number; h: number } {
    const yTop = this.groundYAtScreen(-margin) ?? this.fy - this.H * 2;
    const yBot = this.groundYAtScreen(this.H + margin) ?? this.fy + this.H;
    const sTop = this.scaleAt(yTop);
    const halfTop = (Math.max(this.cx, this.W - this.cx) + margin) / sTop;
    return { x: this.fx - halfTop, y: yTop, w: halfTop * 2, h: yBot - yTop };
  }

  /** Distance from focus to the top / bottom screen edge, in world y units. */
  public verticalReach(): { up: number; down: number } {
    const yTop = this.groundYAtScreen(0) ?? this.fy - this.H;
    const yBot = this.groundYAtScreen(this.H) ?? this.fy + this.H;
    return { up: this.fy - yTop, down: yBot - this.fy };
  }

  /** Half width of the narrowest (nearest) visible row, used for x clamping. */
  public nearHalfWidth(): number {
    const yBot = this.groundYAtScreen(this.H) ?? this.fy;
    const yMid = (this.fy + yBot) / 2;
    return this.cx / this.scaleAt(yMid);
  }

  /**
   * Canvas transform so that code drawing in absolute world coordinates
   * renders as an upright billboard anchored at (ax, ay).
   */
  public billboard(ctx: CanvasRenderingContext2D, ax: number, ay: number, dpr: number): number {
    const p = this.project(ax, ay);
    const s = p.s;
    ctx.setTransform(s * dpr, 0, 0, s * dpr, (p.x - ax * s) * dpr, (p.y - ay * s) * dpr);
    return s;
  }
}
