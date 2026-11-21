/**
 * CompanionController.ts
 * The selected party Pokémon follows the trainer through the world.
 *
 * Movement: the trainer's foot positions are recorded as a breadcrumb trail.
 * The companion walks *along that exact polyline*, keeping FOLLOW_DIST of path
 * length behind the trainer. Because the trainer's path is already collision-
 * free, the companion never cuts corners through trees, buildings or water and
 * handles narrow paths and tight turns naturally. It only snaps into place on
 * location changes (or if the trail somehow grows absurdly long).
 */

import { getPokemonSprite, preloadPokemonSprites } from './PokemonSprites';
import { drawMarker } from './FeatureRenderer';

export interface CompanionInfo {
  uid: string;
  speciesId: number;
  name: string;
  sizeClass: 0 | 1 | 2; // small / medium / large overworld size
  flies?: boolean;
}

type Dir = 'up' | 'down' | 'left' | 'right';
type Mood = 'none' | 'happy' | 'alert' | 'sleep';

const FOLLOW_DIST = 34;
const SNAP_DIST = 520;
const SIZES = [38, 46, 56];

export class CompanionController {
  public info: CompanionInfo | null = null;
  public x = 0;
  public y = 0;
  public dir: Dir = 'down';
  private trail: { x: number; y: number }[] = [];
  private speed = 0;
  private walkPhase = 0;
  private idleTime = 0;
  private mood: Mood = 'none';
  private moodTimer = 0;
  private hop = 0; // celebrate hop timer
  private noticed = new Map<string, number>();

  public setCompanion(info: CompanionInfo | null): void {
    const changed = info?.uid !== this.info?.uid || info?.speciesId !== this.info?.speciesId;
    this.info = info;
    if (info && changed) preloadPokemonSprites(info.speciesId);
  }

  /** Place the companion just behind the trainer on a free tile. */
  public snapBehind(px: number, py: number, facing: Dir, isFree: (x: number, y: number) => boolean): void {
    const back: Record<Dir, [number, number]> = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] };
    const candidates: [number, number][] = [back[facing], [0, 1], [-1, 0], [1, 0], [0, -1]];
    let placed = false;
    for (const [dx, dy] of candidates) {
      const cx = px + dx * FOLLOW_DIST;
      const cy = py + dy * FOLLOW_DIST;
      if (isFree(cx, cy)) {
        this.x = cx;
        this.y = cy;
        placed = true;
        break;
      }
    }
    if (!placed) {
      this.x = px;
      this.y = py + 2;
    }
    this.trail = [{ x: this.x, y: this.y }, { x: px, y: py }];
    this.dir = facing;
    this.speed = 0;
    this.idleTime = 0;
    this.noticed.clear();
  }

  public update(dt: number, px: number, py: number): void {
    if (!this.info) return;
    const head = this.trail[this.trail.length - 1];
    if (!head || Math.hypot(head.x - px, head.y - py) >= 2) this.trail.push({ x: px, y: py });

    // Total path length from companion to trainer along the trail
    let total = 0;
    let prev = { x: this.x, y: this.y };
    for (const p of this.trail) {
      total += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
    }

    if (total > SNAP_DIST) {
      // Only reached if the trainer was moved without walking (should not happen in play)
      const keep = this.trail.slice(-3);
      this.trail = keep;
      this.x = keep[0].x;
      this.y = keep[0].y;
      total = 0;
    }

    const excess = total - FOLLOW_DIST;
    let moved = 0;
    if (excess > 0.5) {
      // Catch up slightly faster than the trainer when lagging, ease in when close.
      const maxStep = (excess > 40 ? 330 : 250) * dt;
      let remaining = Math.min(excess, maxStep);
      while (remaining > 0 && this.trail.length) {
        const t = this.trail[0];
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= remaining) {
          remaining -= d;
          moved += d;
          this.faceToward(t.x - this.x, t.y - this.y);
          this.x = t.x;
          this.y = t.y;
          this.trail.shift();
        } else {
          const k = remaining / d;
          this.faceToward(t.x - this.x, t.y - this.y);
          this.x += (t.x - this.x) * k;
          this.y += (t.y - this.y) * k;
          moved += remaining;
          remaining = 0;
        }
      }
    }
    if (this.trail.length > 400) this.trail.splice(0, this.trail.length - 400);

    this.speed = dt > 0 ? moved / dt : 0;
    if (this.speed > 5) {
      this.walkPhase += dt * (this.speed > 260 ? 16 : 12);
      this.idleTime = 0;
      if (this.mood === 'sleep') this.mood = 'none';
    } else {
      this.idleTime += dt;
      // Face the trainer while waiting
      if (this.idleTime > 0.4 && this.mood !== 'sleep') this.faceToward(px - this.x, py - this.y);
      if (this.idleTime > 14 && this.mood === 'none') this.mood = 'sleep';
    }
    if (this.moodTimer > 0) {
      this.moodTimer -= dt;
      if (this.moodTimer <= 0 && this.mood !== 'sleep') this.mood = 'none';
    }
    if (this.hop > 0) this.hop = Math.max(0, this.hop - dt);
  }

  private faceToward(dx: number, dy: number): void {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
    this.dir = Math.abs(dx) > Math.abs(dy) * 1.1 ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  /** Trainer interacted with the companion. */
  public celebrate(): void {
    this.mood = 'happy';
    this.moodTimer = 1.8;
    this.hop = 0.9;
    this.idleTime = 0;
  }

  /** React to something interesting nearby (hidden item, secret path...). */
  public notice(key: string, tx: number, ty: number, now: number): boolean {
    const last = this.noticed.get(key) ?? -999;
    if (now - last < 25) return false;
    this.noticed.set(key, now);
    this.faceToward(tx - this.x, ty - this.y);
    this.mood = 'alert';
    this.moodTimer = 2.2;
    this.hop = 0.35;
    this.idleTime = 0;
    return true;
  }

  public isNear(px: number, py: number, r = 44): boolean {
    return !!this.info && Math.hypot(this.x - px, this.y - py) < r;
  }

  /** Foot anchor y used by the depth sorter. */
  public get anchorY(): number {
    return this.y + 10;
  }

  /** Draw in world coordinates (caller has set the billboard transform). */
  public draw(ctx: CanvasRenderingContext2D, time: number): void {
    const info = this.info;
    if (!info) return;
    const size = SIZES[info.sizeClass];
    const moving = this.speed > 5;
    const footY = this.y + 10;

    // Hop / bob / breathing
    let lift = 0;
    if (moving) lift = Math.abs(Math.sin(this.walkPhase)) * (this.speed > 260 ? 5 : 3.5);
    if (this.hop > 0) lift += Math.sin((1 - this.hop / 0.9) * Math.PI * 3) * 7 * (this.hop / 0.9) + 2;
    if (info.flies) lift += 10 + Math.sin(time * 3) * 3;
    lift = Math.max(0, lift);
    const breathe = moving ? 1 : 1 + Math.sin(time * 2.6) * 0.025;
    const squash = moving ? 1 - Math.abs(Math.cos(this.walkPhase)) * 0.06 : 1;
    const sleeping = this.mood === 'sleep';

    // Contact shadow shrinks as it lifts
    const sk = 1 - Math.min(0.4, lift / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(this.x, footY, size * 0.3 * sk, size * 0.11 * sk, 0, 0, Math.PI * 2);
    ctx.fill();

    const back = this.dir === 'up';
    const img = getPokemonSprite(info.speciesId, back) || getPokemonSprite(info.speciesId, false);
    ctx.save();
    ctx.translate(this.x, footY - lift);
    // PokeAPI front sprites face left; mirror when walking right.
    if (this.dir === 'right') ctx.scale(-1, 1);
    ctx.scale(1 + (1 - squash) * 0.6, squash * breathe * (sleeping ? 0.94 : 1));
    if (img) {
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      // Sprites have ~18% empty space under the feet in a 96px frame.
      ctx.drawImage(img, -size / 2, -size * 0.84, size, size);
      ctx.imageSmoothingEnabled = prevSmooth;
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.3, size * 0.28, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Mood indicators
    const topY = footY - lift - size * 0.86;
    if (this.mood === 'happy') {
      for (let i = 0; i < 2; i++) {
        const p = (time * 1.2 + i * 0.5) % 1;
        drawHeart(ctx, this.x - 8 + i * 14, topY - p * 18, 5, 1 - p);
      }
    } else if (this.mood === 'alert') {
      drawMarker(ctx, this.x, topY - 6, 'alert', time);
    } else if (sleeping) {
      ctx.fillStyle = 'rgba(226,232,240,0.85)';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const p = (time * 0.5) % 1;
      ctx.globalAlpha = 1 - p;
      ctx.fillText('z', this.x + 10 + p * 6, topY + 4 - p * 12);
      ctx.font = '800 7px system-ui, sans-serif';
      ctx.fillText('z', this.x + 16 + p * 6, topY - 4 - p * 12);
      ctx.globalAlpha = 1;
    }
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.4, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
  ctx.restore();
}
