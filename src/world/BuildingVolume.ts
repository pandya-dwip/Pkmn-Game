/**
 * BuildingVolume.ts
 * Gives the existing front-facing building artwork real volume in the 2.5D
 * camera: a cast shadow, the camera-facing side wall (with parallax), and the
 * roof surface receding behind the facade. The facade itself is still the
 * original artwork, drawn afterwards as a billboard at the building's base.
 *
 * Vertical extents use the same billboard rule as all sprites
 * (screenY = groundY - artHeight * scale), so the extrusion lines up exactly
 * with the facade at every camera position.
 */

import { Camera25D } from './Camera25D';
import { shade } from './FeatureRenderer';

import { ARCH_STYLES } from './ProceduralArchitecture';
import { archEave, archRoofTones } from './ArchFacade2D';

export type Architecture = 'stone' | 'wood' | 'brick' | 'stucco' | 'glass' | 'volcanic' | 'marble' | 'timber';

export interface BuildingLike {
  type: 'center' | 'mart' | 'gym' | 'gate' | 'house' | 'stadium';
  facade?: 'hall' | 'tower' | 'temple';
  model3d?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roofStyle?: 'terracotta' | 'emerald' | 'slate' | 'azure' | 'wood';
  roofColor?: string;
  wallColor?: string;
}

export interface VolumeSpec {
  eave: number; // art y-offset (from b.y) where walls meet the roof
  apex: number; // art y-offset of the ridge
  overhang: number;
  roof: 'gable' | 'hip' | 'flat';
  wall: string;
  roofLight: string;
  roofDark: string;
  depth: number;
}

const ROOF_STYLE: Record<string, [string, string]> = {
  terracotta: ['#c2410c', '#7c2d12'],
  emerald: ['#059669', '#064e3b'],
  slate: ['#475569', '#1e293b'],
  azure: ['#0284c7', '#0c4a6e'],
  wood: ['#92400e', '#451a03'],
};

export function specFor(b: BuildingLike): VolumeSpec {
  const depth = Math.min(84, Math.max(46, b.h * 0.78));
  if (b.type === 'stadium') return { eave: 40, apex: 30, overhang: 6, roof: 'flat', wall: '#e7dcc4', roofLight: '#cbbd9c', roofDark: '#8f8167', depth: Math.min(b.h * 0.85, 360) };
  const arch = b.model3d?.startsWith('gen:') ? ARCH_STYLES[b.model3d] : undefined;
  if (arch) {
    const [l, d] = archRoofTones(arch);
    const eave = archEave(b, arch);
    const roof = arch.roof === 'flat' ? 'flat' : arch.roof === 'gable' ? 'gable' : 'hip';
    return { eave, apex: roof === 'gable' ? 2 : roof === 'hip' ? 4 : eave, overhang: roof === 'flat' ? 2 : 6, roof, wall: arch.wall === 'glass' ? '#cbd5e1' : arch.color, roofLight: l, roofDark: d, depth: Math.min(b.h * 0.8, 120) };
  }
  if (b.facade === 'tower') return { eave: 8, apex: 2, overhang: 4, roof: 'flat', wall: '#cbd5e1', roofLight: '#94a3b8', roofDark: '#475569', depth: Math.min(b.h * 0.8, 120) };
  if (b.facade === 'temple') return { eave: 20, apex: -6, overhang: 10, roof: 'gable', wall: '#f8fafc', roofLight: '#e2e8f0', roofDark: '#94a3b8', depth: Math.min(b.h * 0.8, 130) };
  if (b.facade === 'hall') return { eave: 18, apex: 8, overhang: 6, roof: 'hip', wall: '#f1ece2', roofLight: '#1e3a8a', roofDark: '#172554', depth: Math.min(b.h * 0.8, 110) };
  switch (b.type) {
    case 'center':
      return { eave: 24, apex: -8, overhang: 9, roof: 'gable', wall: '#e2e8f0', roofLight: '#dc2626', roofDark: '#7f1d1d', depth };
    case 'mart':
      return { eave: 24, apex: 4, overhang: 7, roof: 'hip', wall: '#e2e8f0', roofLight: '#2563eb', roofDark: '#1e3a8a', depth };
    case 'gym':
      return { eave: 28, apex: -14, overhang: 14, roof: 'gable', wall: '#334155', roofLight: '#334155', roofDark: '#0f172a', depth: depth + 12 };
    case 'gate':
      return { eave: 4, apex: 4, overhang: 4, roof: 'flat', wall: '#7f1d1d', roofLight: '#b91c1c', roofDark: '#7f1d1d', depth: Math.min(depth, 56) };
    default: {
      const [l, d] = ROOF_STYLE[b.roofStyle || 'terracotta'] || ROOF_STYLE.terracotta;
      return {
        eave: 24,
        apex: -2,
        overhang: 8,
        roof: 'gable',
        wall: b.wallColor || '#f1f5f9',
        roofLight: b.roofColor || l,
        roofDark: b.roofColor ? shade(b.roofColor, 0.55) : d,
        depth,
      };
    }
  }
}

type Pt = { x: number; y: number };

function poly(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Bilinear point on quad (p00 front-bottom, p10 back-bottom, p11 back-top, p01 front-top). */
const quadPt = (q: Pt[], u: number, v: number): Pt => lerpPt(lerpPt(q[0], q[1], u), lerpPt(q[3], q[2], u), v);

export function drawBuildingVolume(
  ctx: CanvasRenderingContext2D,
  cam: Camera25D,
  b: BuildingLike,
  arch: Architecture | undefined,
  alpha: number
): { labelAnchor: Pt } {
  const spec = specFor(b);
  const yf = b.y + b.h;
  const yb = yf - spec.depth;
  const xl = b.x;
  const xr = b.x + b.w;
  const P = (x: number, y: number, h: number): Pt => {
    const p = cam.project(x, y);
    return { x: p.x, y: p.y - h * p.s };
  };
  const eaveH = b.h - spec.eave;
  const apexH = b.h - spec.apex;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1) Soft cast shadow (sun from the upper left)
  const sh = Math.min(70, apexH * 0.45);
  ctx.fillStyle = 'rgba(8, 16, 12, 0.26)';
  poly(ctx, [P(xl + 6, yf, 0), P(xr + 4, yf, 0), P(xr + sh, yf - sh * 0.35, 0), P(xr + sh, yb - sh * 0.35, 0), P(xl + sh * 0.5, yb - sh * 0.2, 0)]);
  ctx.fill();

  // 2) Camera-facing side wall (perspective parallax)
  const showLeft = xl > cam.fx + 2;
  const showRight = xr < cam.fx - 2;
  if (showLeft || showRight) {
    const xs = showLeft ? xl : xr;
    const q = [P(xs, yf, 0), P(xs, yb, 0), P(xs, yb, eaveH), P(xs, yf, eaveH)];
    const wallShade = shade(spec.wall, showLeft ? 0.78 : 0.68);
    const g = ctx.createLinearGradient(q[0].x, 0, q[1].x, 0);
    g.addColorStop(0, wallShade);
    g.addColorStop(1, shade(spec.wall, showLeft ? 0.6 : 0.52));
    ctx.fillStyle = g;
    poly(ctx, q);
    ctx.fill();
    drawWallMaterial(ctx, q, arch, b.type);
    // Side window with warm glow
    if (spec.depth > 40 && b.type !== 'gate') {
      const w = [quadPt(q, 0.32, 0.38), quadPt(q, 0.68, 0.38), quadPt(q, 0.68, 0.72), quadPt(q, 0.32, 0.72)];
      ctx.fillStyle = '#1e293b';
      poly(ctx, w);
      ctx.fill();
      const wi = [quadPt(q, 0.36, 0.42), quadPt(q, 0.64, 0.42), quadPt(q, 0.64, 0.68), quadPt(q, 0.36, 0.68)];
      ctx.fillStyle = b.type === 'gym' ? '#fbbf24' : '#fde68a';
      poly(ctx, wi);
      ctx.fill();
      ctx.fillStyle = 'rgba(56,189,248,0.35)';
      poly(ctx, [wi[0], lerpPt(wi[0], wi[1], 0.5), lerpPt(wi[3], wi[2], 0.2), wi[3]]);
      ctx.fill();
    }
    // Foundation strip + vertical corner edge highlight
    ctx.fillStyle = 'rgba(30,41,59,0.55)';
    poly(ctx, [q[0], q[1], quadPt(q, 1, 0.08), quadPt(q, 0, 0.08)]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[3].x, q[3].y);
    ctx.stroke();
  }

  // 3) Roof receding behind the facade
  const ov = spec.overhang;
  const ybr = yb - ov * 0.6;
  const xL = xl - ov;
  const xR = xr + ov;
  const xc = (xl + xr) / 2;
  let labelAnchor: Pt;
  if (spec.roof === 'gable') {
    const lp = [P(xL, yf, eaveH), P(xc, yf, apexH), P(xc, ybr, apexH), P(xL, ybr, eaveH)];
    const rp = [P(xR, yf, eaveH), P(xc, yf, apexH), P(xc, ybr, apexH), P(xR, ybr, eaveH)];
    // back gable end (visible only as a sliver)
    ctx.fillStyle = shade(spec.roofDark, 0.8);
    poly(ctx, [P(xL, ybr, eaveH), P(xc, ybr, apexH), P(xR, ybr, eaveH)]);
    ctx.fill();
    ctx.fillStyle = spec.roofDark;
    poly(ctx, rp);
    ctx.fill();
    ctx.fillStyle = spec.roofLight;
    poly(ctx, lp);
    ctx.fill();
    // shingle courses running front-to-back
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (const plane of [lp, rp]) {
      for (let t = 0.2; t < 0.95; t += 0.2) {
        const a = lerpPt(plane[0], plane[1], t);
        const c = lerpPt(plane[3], plane[2], t);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
      for (let t = 0.25; t < 1; t += 0.25) {
        const a = lerpPt(plane[0], plane[3], t);
        const c = lerpPt(plane[1], plane[2], t);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
    }
    // ridge cap
    ctx.strokeStyle = shade(spec.roofLight, 1.25);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(lp[1].x, lp[1].y);
    ctx.lineTo(lp[2].x, lp[2].y);
    ctx.stroke();
    labelAnchor = lp[2];
  } else if (spec.roof === 'hip') {
    const inset = 9;
    const top = [P(xl + inset, yf, apexH), P(xr - inset, yf, apexH), P(xr - inset, ybr + 8, apexH), P(xl + inset, ybr + 8, apexH)];
    const back = [P(xL, ybr, eaveH), P(xR, ybr, eaveH), top[2], top[3]];
    const left = [P(xL, yf, eaveH), top[0], top[3], P(xL, ybr, eaveH)];
    const right = [P(xR, yf, eaveH), top[1], top[2], P(xR, ybr, eaveH)];
    ctx.fillStyle = shade(spec.roofDark, 0.85);
    poly(ctx, back);
    ctx.fill();
    ctx.fillStyle = spec.roofDark;
    poly(ctx, right);
    ctx.fill();
    ctx.fillStyle = shade(spec.roofLight, 0.9);
    poly(ctx, left);
    ctx.fill();
    ctx.fillStyle = spec.roofLight;
    poly(ctx, top);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.4;
    poly(ctx, top);
    ctx.stroke();
    labelAnchor = lerpPt(top[2], top[3], 0.5);
  } else {
    const topH = b.h - spec.apex;
    const top = [P(xl - 4, yf, topH), P(xr + 4, yf, topH), P(xr + 4, yb, topH), P(xl - 4, yb, topH)];
    ctx.fillStyle = spec.roofDark;
    poly(ctx, top);
    ctx.fill();
    // parapet rim
    ctx.strokeStyle = spec.roofLight;
    ctx.lineWidth = 3;
    poly(ctx, top);
    ctx.stroke();
    // walkway tiles
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let t = 0.25; t < 1; t += 0.25) {
      const a = lerpPt(top[0], top[3], t);
      const c = lerpPt(top[1], top[2], t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    labelAnchor = lerpPt(top[2], top[3], 0.5);
  }

  ctx.restore();
  return { labelAnchor };
}

function drawWallMaterial(ctx: CanvasRenderingContext2D, q: Pt[], arch: Architecture | undefined, type: BuildingLike['type']): void {
  const style: Architecture = arch || (type === 'gym' ? 'stone' : type === 'gate' ? 'brick' : 'stucco');
  ctx.save();
  poly(ctx, q);
  ctx.clip();
  ctx.lineWidth = 1;
  const rows = style === 'brick' ? 10 : style === 'stone' || style === 'volcanic' ? 6 : style === 'glass' ? 4 : 7;
  ctx.strokeStyle =
    style === 'glass' ? 'rgba(186,230,253,0.45)' : style === 'marble' ? 'rgba(148,163,184,0.35)' : style === 'wood' || style === 'timber' ? 'rgba(69,26,3,0.35)' : 'rgba(0,0,0,0.18)';
  for (let i = 1; i < rows; i++) {
    const v = i / rows;
    const a = quadPt(q, 0, v);
    const c = quadPt(q, 1, v);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  }
  if (style === 'stone' || style === 'brick' || style === 'volcanic' || style === 'glass' || style === 'timber') {
    const cols = style === 'glass' ? 3 : style === 'timber' ? 2 : 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const u = (c - (r % 2 ? 0.5 : 0)) / (cols + 0.5);
        const a = quadPt(q, u, r / rows);
        const d = quadPt(q, u, (r + 1) / rows);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }
    }
  }
  if (style === 'glass') {
    ctx.fillStyle = 'rgba(56,189,248,0.12)';
    poly(ctx, q);
    ctx.fill();
  }
  ctx.restore();
}
