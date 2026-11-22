/**
 * LeagueArt.ts
 * 2.5D facade artwork for Indigo League City's landmark buildings: the Indigo
 * Stadium and the grand civic halls (classical hall, glass tower, Greek
 * temple). Drawn in world coordinates over the building's footprint, like the
 * engine's other building facades (the front edge b.y + b.h is the ground
 * line and the art rises b.h above it); BuildingVolume adds the side walls
 * and roof depth around it.
 */

import type { RouteBuilding } from '../systems/RouteExplorationEngine';

const lin = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

/** Small Poke Ball crest. */
function crest(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.fillRect(x - r, y - r * 0.12, r * 2, r * 0.24);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, r + ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}

/** Arched opening (dark interior, lit sky above the seats for the top tier). */
function archOpening(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: boolean): void {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = lit ? lin(ctx, 0, y, 0, y + h, [[0, '#93c5fd'], [0.55, '#64748b'], [1, '#334155']]) : lin(ctx, 0, y, 0, y + h, [[0, '#2a2118'], [1, '#4a3c2b']]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 248, 230, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** The Indigo Stadium: a three-tier arcaded colosseum with a crown of flags and a gold gate. */
export function drawStadium(ctx: CanvasRenderingContext2D, b: RouteBuilding, time: number): void {
  const x0 = b.x;
  const w = b.w;
  const yb = b.y + b.h;
  const top = b.y + 26;
  const cx = x0 + w / 2;

  // Floodlight pylons behind the crown
  for (const px of [x0 + 34, x0 + w - 34]) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(px - 4, top - 70, 8, 140);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(px - 22, top - 84, 44, 18);
    ctx.fillStyle = `rgba(254, 240, 138, ${0.85 + 0.15 * Math.sin(time * 2 + px)})`;
    for (let i = 0; i < 4; i++) ctx.fillRect(px - 19 + i * 10, top - 81, 7, 12);
    const glow = ctx.createRadialGradient(px, top - 75, 2, px, top - 75, 46);
    glow.addColorStop(0, 'rgba(254, 249, 195, 0.55)');
    glow.addColorStop(1, 'rgba(254, 249, 195, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px - 46, top - 121, 92, 92);
  }

  // Curved sandstone shell
  ctx.beginPath();
  ctx.moveTo(x0, yb);
  ctx.lineTo(x0, top + 50);
  ctx.quadraticCurveTo(cx, top - 26, x0 + w, top + 50);
  ctx.lineTo(x0 + w, yb);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, top, 0, yb, [[0, '#f3e9d2'], [0.5, '#e4d4b0'], [1, '#c9b48b']]);
  ctx.fill();
  ctx.strokeStyle = '#a8916a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Crown parapet with flags
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, top + 50);
  ctx.quadraticCurveTo(cx, top - 26, x0 + w, top + 50);
  ctx.lineTo(x0 + w, top + 64);
  ctx.quadraticCurveTo(cx, top - 12, x0, top + 64);
  ctx.closePath();
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x0, top + 62, w, 0);
  ctx.restore();
  const crownY = (t: number) => {
    // y on the crown curve for parameter t in [0,1]
    const a = top + 50;
    const c = top - 26;
    return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * a;
  };
  const flagColors = ['#dc2626', '#2563eb', '#facc15', '#16a34a'];
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const fx = x0 + w * t;
    const fy = crownY(t);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - 34);
    ctx.stroke();
    const wave = Math.sin(time * 3 + i) * 3;
    ctx.fillStyle = flagColors[i % 4];
    ctx.beginPath();
    ctx.moveTo(fx, fy - 34);
    ctx.quadraticCurveTo(fx + 10, fy - 36 + wave, fx + 20, fy - 31 + wave);
    ctx.lineTo(fx + 20, fy - 21 + wave);
    ctx.quadraticCurveTo(fx + 10, fy - 26 + wave, fx, fy - 22);
    ctx.closePath();
    ctx.fill();
  }

  // Three arcaded tiers
  const tiersTop = top + 76;
  const tiersBottom = yb - 28;
  const tierH = (tiersBottom - tiersTop) / 3;
  for (let t = 0; t < 3; t++) {
    const ty = tiersTop + t * tierH;
    // cornice
    ctx.fillStyle = '#b9a47d';
    ctx.fillRect(x0 + 4, ty - 6, w - 8, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0 + 4, ty - 6, w - 8, 2);
    const archW = 30;
    const step = 46;
    const n = Math.floor((w - 40) / step);
    const startX = cx - (n * step) / 2 + (step - archW) / 2;
    for (let i = 0; i < n; i++) {
      const ax = startX + i * step;
      // keep the bottom tier clear where the grand gate stands
      if (t === 2 && Math.abs(ax + archW / 2 - cx) < 110) continue;
      archOpening(ctx, ax, ty + 8, archW, tierH - 16, t === 0);
      // pilaster
      ctx.fillStyle = 'rgba(255, 250, 235, 0.5)';
      ctx.fillRect(ax + archW + 5, ty + 4, 5, tierH - 8);
    }
  }

  // League banners flanking the gate
  for (const side of [-1, 1]) {
    const bx = cx + side * 132 - 18;
    const by = tiersTop + tierH * 1.2;
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 36, by);
    ctx.lineTo(bx + 36, by + 120);
    ctx.lineTo(bx + 18, by + 136);
    ctx.lineTo(bx, by + 120);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();
    crest(ctx, bx + 18, by + 34, 11);
  }

  // The grand gate
  const gw = 150;
  const gh = 200;
  const gx = cx - gw / 2;
  const gy = yb - gh;
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(gx - 12, yb);
  ctx.lineTo(gx - 12, gy + gw / 2);
  ctx.arc(cx, gy + gw / 2, gw / 2 + 12, Math.PI, 0);
  ctx.lineTo(gx + gw + 12, yb);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(gx, yb);
  ctx.lineTo(gx, gy + gw / 2);
  ctx.arc(cx, gy + gw / 2, gw / 2, Math.PI, 0);
  ctx.lineTo(gx + gw, yb);
  ctx.closePath();
  const inner = ctx.createRadialGradient(cx, yb - 40, 10, cx, yb - 60, 170);
  inner.addColorStop(0, 'rgba(254, 243, 199, 0.95)');
  inner.addColorStop(0.45, '#a16207');
  inner.addColorStop(1, '#1c1408');
  ctx.fillStyle = inner;
  ctx.fill();
  // Sign plate and crest above the gate
  const sw = 260;
  const sy = gy - 52;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - sw / 2, sy, sw, 38);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - sw / 2, sy, sw, 38);
  ctx.fillStyle = '#facc15';
  ctx.font = '900 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('INDIGO STADIUM', cx, sy + 20);
  crest(ctx, cx, sy - 26, 20);

  // Entrance steps
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 ? '#e7dcc4' : '#d6c7a5';
    ctx.fillRect(gx - 30 - i * 14, yb - 8 + i * 4, gw + 60 + i * 28, 5);
  }
}

/** Grand civic facades: a classical hall, a modern glass tower, or a Greek temple. */
export function drawCivicHall(ctx: CanvasRenderingContext2D, b: RouteBuilding, variant: 'hall' | 'tower' | 'temple'): void {
  const x0 = b.x;
  const w = b.w;
  const yb = b.y + b.h;
  const y0 = b.y;
  const cx = x0 + w / 2;

  if (variant === 'tower') {
    // Steel-and-glass tower rising above its footprint
    const tt = y0 + 8;
    ctx.fillStyle = lin(ctx, x0, 0, x0 + w, 0, [[0, '#cbd5e1'], [0.5, '#e2e8f0'], [1, '#94a3b8']]);
    ctx.fillRect(x0, tt, w, yb - tt);
    const cols = Math.max(4, Math.floor(w / 28));
    const rows = Math.max(5, Math.floor((yb - tt - 50) / 22));
    const cw = (w - 16) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x0 + 8 + c * cw;
        const wy = tt + 12 + r * 22;
        ctx.fillStyle = lin(ctx, wx, wy, wx + cw, wy + 16, [[0, '#1e40af'], [0.6, '#60a5fa'], [1, '#bfdbfe']]);
        ctx.fillRect(wx + 2, wy, cw - 4, 16);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.15, tt);
    ctx.lineTo(x0 + w * 0.35, tt);
    ctx.lineTo(x0 + w * 0.05, yb - 40);
    ctx.lineTo(x0, yb - 60);
    ctx.closePath();
    ctx.fill();
    // Roof crown and emblem
    ctx.fillStyle = '#334155';
    ctx.fillRect(x0 - 4, tt - 8, w + 8, 10);
    crest(ctx, cx, tt - 22, 12);
    // Entrance canopy
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 30, yb - 36, 60, 36);
    ctx.fillStyle = 'rgba(254, 243, 199, 0.85)';
    ctx.fillRect(cx - 24, yb - 30, 48, 30);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(cx - 46, yb - 44, 92, 8);
    return;
  }

  if (variant === 'temple') {
    // Stylobate steps
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#f1f5f9' : '#e2e8f0';
      ctx.fillRect(x0 - 10 + i * 6, yb - 10 - i * 7, w + 20 - i * 12, 8);
    }
    const base = yb - 30;
    const capY = y0 + 52;
    // Dark cella between the columns with a warm glow
    ctx.fillStyle = lin(ctx, 0, capY, 0, base, [[0, '#1f2937'], [1, '#78350f']]);
    ctx.fillRect(x0 + 16, capY, w - 32, base - capY);
    const n = Math.max(6, Math.floor(w / 40));
    for (let i = 0; i < n; i++) {
      const colX = x0 + 18 + (i * (w - 36 - 14)) / (n - 1);
      ctx.fillStyle = lin(ctx, colX, 0, colX + 14, 0, [[0, '#cbd5e1'], [0.4, '#ffffff'], [1, '#94a3b8']]);
      ctx.fillRect(colX, capY, 14, base - capY);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(colX - 3, capY - 6, 20, 6);
    }
    // Entablature and pediment
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x0 + 6, y0 + 34, w - 12, 18);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x0 + 6, y0 + 48, w - 12, 3);
    ctx.fillStyle = lin(ctx, 0, y0 - 20, 0, y0 + 36, [[0, '#ffffff'], [1, '#e2e8f0']]);
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 36);
    ctx.lineTo(cx, y0 - 18);
    ctx.lineTo(x0 + w, y0 + 36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    crest(ctx, cx, y0 + 16, 12);
    return;
  }

  // Classical hall: plinth, cream walls, columns between tall windows, blue roof band
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(x0 - 6, yb - 10, w + 12, 10);
  ctx.fillStyle = lin(ctx, 0, y0 + 18, 0, yb, [[0, '#fbf7ee'], [1, '#e9dfcb']]);
  ctx.fillRect(x0, y0 + 18, w, yb - y0 - 28);
  const n = Math.max(4, Math.floor(w / 34));
  for (let i = 0; i <= n; i++) {
    const px = x0 + 4 + (i * (w - 16)) / n;
    ctx.fillStyle = lin(ctx, px, 0, px + 8, 0, [[0, '#e5e7eb'], [0.5, '#ffffff'], [1, '#cbd5e1']]);
    ctx.fillRect(px, y0 + 26, 8, yb - y0 - 38);
    if (i < n) {
      const wx = px + 12;
      const ww = (w - 16) / n - 16;
      if (Math.abs(wx + ww / 2 - cx) < 24) continue; // door bay
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(wx, y0 + 40, ww, (yb - y0) * 0.42);
      ctx.fillStyle = 'rgba(191, 219, 254, 0.55)';
      ctx.fillRect(wx + 2, y0 + 42, ww - 4, (yb - y0) * 0.18);
    }
  }
  // Roof band with gold trim
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(x0 - 6, y0, w + 12, 20);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x0 - 6, y0 + 18, w + 12, 3);
  crest(ctx, cx, y0 + 4, 9);
  // Arched door
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.moveTo(cx - 16, yb - 10);
  ctx.lineTo(cx - 16, yb - 40);
  ctx.arc(cx, yb - 40, 16, Math.PI, 0);
  ctx.lineTo(cx + 16, yb - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(254, 243, 199, 0.8)';
  ctx.fillRect(cx - 1, yb - 50, 2, 40);
}
