/**
 * 2.5D façades for the procedural "gen:" buildings. They are painted with the very same
 * canvas textures the 3D view uses (façade bays, roof tiles, doors, awnings), so a building
 * looks the same from the overhead view and the chase camera.
 *
 * Drawn in world coordinates over the footprint: the front edge b.y + b.h is the ground line
 * and the art rises b.h above it (BuildingVolume adds the side walls and roof depth).
 */
import type { RouteBuilding } from '../systems/RouteExplorationEngine';
import { ARCH_STYLES, type ArchSpec } from './ProceduralArchitecture';
import { upperBayTexture, groundBayTexture, doorTexture, roofTexture, awningTexture, conservatoryGlassTexture, surfaceTexture, type FacadeOpts } from './ProceduralTextures';

const ROOF_TONE: Record<string, [string, string]> = {
  terracotta: ['#c0582c', '#7a2e14'],
  slate: ['#5a6378', '#2b3242'],
  copper: ['#5fae98', '#2f6e5e'],
  wood: ['#8a5531', '#4a2a14'],
  azure: ['#3b6fb0', '#1e3a66'],
  emerald: ['#3a8a5c', '#1d4d33'],
  gravel: ['#a3a29d', '#6b6a66'],
};

/** Roof band height (art offset from b.y where the walls begin) for a style. */
export function archEave(b: { h: number }, s: ArchSpec): number {
  if (s.roof === 'flat') return Math.round(b.h * 0.06);
  if (s.roof === 'vault') return Math.round(b.h * 0.3);
  return Math.round(b.h * (s.doubleRoof ? 0.34 : 0.24));
}

export function archRoofTones(s: ArchSpec): [string, string] {
  return ROOF_TONE[s.roofKind] || ROOF_TONE.slate;
}

const patterns = new WeakMap<object, CanvasPattern>();
function pat(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement | OffscreenCanvas | HTMLImageElement, x: number, y: number, tw: number, th: number): CanvasPattern | string {
  let p = patterns.get(img);
  if (!p) {
    p = ctx.createPattern(img as CanvasImageSource, 'repeat') || undefined;
    if (!p) return '#ccc';
    patterns.set(img, p);
  }
  p.setTransform(new DOMMatrix().translate(x, y).scale(tw / (img as HTMLCanvasElement).width, th / (img as HTMLCanvasElement).height));
  return p;
}

const img = (t: { image: unknown }) => t.image as HTMLCanvasElement;

export function drawArchFacade(ctx: CanvasRenderingContext2D, b: RouteBuilding, key: string): boolean {
  const S = ARCH_STYLES[key];
  if (!S) return false;
  const x0 = b.x;
  const w = b.w;
  const yb = b.y + b.h;
  const cx = x0 + w / 2;
  const eave = b.y + archEave(b, S);
  const wallH = yb - eave;
  const facade: FacadeOpts = { kind: S.wall, color: S.color, trim: S.trim, arch: S.arch, shutters: S.shutters, boxes: S.boxes, timberFrame: S.timberFrame };
  const [roofL, roofD] = archRoofTones(S);

  // ---- Walls
  const bays = Math.max(1, Math.round(w / 34));
  const bayW = w / bays;
  if (S.roof === 'vault') {
    ctx.fillStyle = pat(ctx, img(conservatoryGlassTexture()), x0, eave, bayW, wallH / 2);
    ctx.fillRect(x0, eave, w, wallH);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 1, eave + 1, w - 2, wallH - 2);
  } else {
    const floors = S.floors;
    const groundShare = floors === 1 ? 1 : 1.15 / (floors + 0.15);
    const gH = wallH * groundShare;
    const uH = floors > 1 ? (wallH - gH) / (floors - 1) : 0;
    if (floors > 1) {
      ctx.fillStyle = pat(ctx, img(upperBayTexture(facade)), x0, eave, bayW, uH);
      ctx.fillRect(x0, eave, w, wallH - gH);
    }
    const g = { ...facade, kind: S.groundWall || S.wall, color: S.groundColor || S.color, mode: S.ground, shutters: S.ground === 'plain' ? S.shutters : undefined };
    ctx.fillStyle = pat(ctx, img(groundBayTexture(g)), x0, yb - gH, bayW, gH);
    ctx.fillRect(x0, yb - gH, w, gH);
    // String course + cornice
    ctx.fillStyle = S.trim;
    ctx.fillRect(x0 - 2, yb - gH - 2, w + 4, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x0 - 2, yb - gH + 1, w + 4, 1.5);
    // Balconies on the first upper floor
    if (S.balcony && floors > 1) {
      const by = yb - gH - 2;
      ctx.strokeStyle = S.trim;
      ctx.lineWidth = 1;
      for (let k = 0; k < bays; k++) {
        if (bays > 2 && k % 2 === 1 && floors < 5) continue;
        const bx0 = x0 + (k + 0.18) * bayW;
        const bx1 = x0 + (k + 0.82) * bayW;
        ctx.fillStyle = S.trim;
        ctx.fillRect(bx0, by - 1, bx1 - bx0, 3);
        for (let px = bx0; px <= bx1 + 0.1; px += (bx1 - bx0) / 5) {
          ctx.beginPath();
          ctx.moveTo(px, by);
          ctx.lineTo(px, by - 7);
          ctx.stroke();
        }
        ctx.fillRect(bx0, by - 8, bx1 - bx0, 1.5);
      }
    }
  }
  // Cornice under the roof
  ctx.fillStyle = S.trim;
  ctx.fillRect(x0 - 3, eave - 2, w + 6, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x0 - 3, eave + 2, w + 6, 2);
  // Plinth
  ctx.fillStyle = pat(ctx, img(surfaceTexture('stone', '#bdb3a2')), x0, yb - 4, 24, 24);
  ctx.fillRect(x0 - 2, yb - 4, w + 4, 4);

  // ---- Roof (front elevation)
  const roofFill = (top: number, bottom: number, inset: number, ov: number) => {
    ctx.fillStyle = pat(ctx, img(roofTexture(S.roofKind)), x0, top, 30, 30);
    ctx.beginPath();
    ctx.moveTo(x0 - ov, bottom);
    ctx.lineTo(x0 + inset, top);
    ctx.lineTo(x0 + w - inset, top);
    ctx.lineTo(x0 + w + ov, bottom);
    ctx.closePath();
    ctx.fill();
    // Shading: darker toward the eave, rim highlight on the ridge
    const grd = ctx.createLinearGradient(0, top, 0, bottom);
    grd.addColorStop(0, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = roofD;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = roofL;
    ctx.fillRect(x0 + inset, top - 1, w - inset * 2, 2);
  };
  const band = eave - b.y;
  if (S.roof === 'hip') {
    const ov = Math.min(8, (S.overhang ?? 5) * 0.6);
    if (S.doubleRoof) {
      roofFill(eave - band * 0.42, eave + 2, band * 0.25, ov + 4);
      ctx.fillStyle = pat(ctx, img(surfaceTexture('timber', S.color)), x0, b.y, 24, 24);
      ctx.fillRect(x0 + band * 0.4, eave - band * 0.58, w - band * 0.8, band * 0.18);
      roofFill(b.y + 2, eave - band * 0.56, band * 0.55, ov);
    } else {
      roofFill(b.y + 4, eave + 2, Math.min(w * 0.22, band * 0.9), ov);
    }
  } else if (S.roof === 'gable') {
    const ov = Math.min(8, (S.overhang ?? 6) * 0.6);
    roofFill(b.y + 2, eave + 2, 0, ov);
    // Dormers
    if (w > 140) {
      for (const dx of [-0.25, 0.25]) {
        const ddx = cx + dx * w;
        ctx.fillStyle = S.trim;
        ctx.fillRect(ddx - 9, eave - band * 0.6, 18, band * 0.5);
        ctx.fillStyle = '#3b5f86';
        ctx.fillRect(ddx - 6, eave - band * 0.55, 12, band * 0.36);
        ctx.fillStyle = roofD;
        ctx.beginPath();
        ctx.moveTo(ddx - 12, eave - band * 0.6);
        ctx.lineTo(ddx, eave - band * 0.85);
        ctx.lineTo(ddx + 12, eave - band * 0.6);
        ctx.fill();
      }
    }
  } else if (S.roof === 'flat') {
    // Balustrade parapet
    ctx.fillStyle = S.trim;
    ctx.fillRect(x0 - 2, b.y - 6, w + 4, band + 6);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let px = x0 + 4; px < x0 + w - 2; px += 6) ctx.fillRect(px, b.y - 3, 2, band);
  } else {
    // Glass barrel vault
    ctx.fillStyle = pat(ctx, img(conservatoryGlassTexture()), x0, b.y, bayW, band);
    ctx.beginPath();
    ctx.moveTo(x0, eave);
    ctx.quadraticCurveTo(cx, b.y - band * 0.6, x0 + w, eave);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Chimneys
  for (let i = 0; i < (S.chimneys || 0) && S.roof !== 'flat'; i++) {
    const chx = x0 + w * (0.22 + (0.56 * i) / Math.max(1, (S.chimneys || 1) - 1 || 1));
    ctx.fillStyle = pat(ctx, img(surfaceTexture('brick', '#8f4a37')), chx, b.y - 10, 16, 16);
    ctx.fillRect(chx - 4, b.y - 6, 8, band * 0.6);
    ctx.fillStyle = S.trim;
    ctx.fillRect(chx - 5, b.y - 8, 10, 3);
  }

  // Dome / clock tower / cupola
  if (S.dome) {
    const r = Math.min(w * 0.16, band * 0.9);
    ctx.fillStyle = pat(ctx, img(roofTexture(S.dome)), cx - r, b.y - r, 20, 20);
    ctx.beginPath();
    ctx.ellipse(cx, b.y + band * 0.3, r, r * 0.9, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = S.trim;
    ctx.fillRect(cx - r - 2, b.y + band * 0.3 - 1, r * 2 + 4, 3);
    ctx.fillRect(cx - 1.5, b.y + band * 0.3 - r * 0.9 - 8, 3, 9);
  }
  if (S.tower || S.cupola) {
    const tw = S.tower ? Math.min(30, w * 0.18) : 14;
    const th = S.tower ? band * 1.1 : band * 0.5;
    const top = b.y - th + band * 0.4;
    ctx.fillStyle = S.tower ? pat(ctx, img(surfaceTexture(S.wall === 'glass' ? 'stone' : S.wall, S.color)), cx - tw / 2, top, 20, 20) : '#f8fafc';
    ctx.fillRect(cx - tw / 2, top, tw, th);
    if (S.tower) {
      ctx.fillStyle = '#fdf6e3';
      ctx.beginPath();
      ctx.arc(cx, top + th * 0.45, tw * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, top + th * 0.45);
      ctx.lineTo(cx, top + th * 0.45 - tw * 0.22);
      ctx.moveTo(cx, top + th * 0.45);
      ctx.lineTo(cx + tw * 0.15, top + th * 0.45);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(cx - tw / 2 + 3, top + 3, tw - 6, th - 5);
    }
    ctx.fillStyle = pat(ctx, img(roofTexture(S.tower ? 'copper' : S.roofKind)), cx - tw, top - tw, 16, 16);
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2 - 3, top);
    ctx.lineTo(cx, top - tw * 0.9);
    ctx.lineTo(cx + tw / 2 + 3, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(cx - 1, top - tw * 0.9 - 6, 2, 7);
  }

  // Awning over the shopfront
  if (S.awning) {
    const ay = yb - (wallH / Math.max(1, S.floors + 0.15)) * 0.95;
    ctx.fillStyle = pat(ctx, img(awningTexture(S.awning[0], S.awning[1])), x0, ay, 16, 12);
    ctx.beginPath();
    ctx.moveTo(x0 + 2, ay);
    ctx.lineTo(x0 + w - 2, ay);
    ctx.lineTo(x0 + w + 2, ay + 12);
    ctx.lineTo(x0 - 2, ay + 12);
    ctx.closePath();
    ctx.fill();
    for (let sx = x0 - 2; sx < x0 + w; sx += 8) {
      ctx.beginPath();
      ctx.arc(sx + 4, ay + 12, 4, 0, Math.PI);
      ctx.fill();
    }
  }

  // Door
  if (S.door) {
    const dw = Math.min(26, w * 0.2);
    const dh = Math.min(30, wallH * 0.42);
    const d = img(doorTexture(S.door, S.trim === '#ffffff' || S.trim === '#fffaf0' ? '#d6cfc2' : S.trim, !!S.arch));
    ctx.drawImage(d, cx - dw / 2, yb - 4 - dh, dw, dh);
    ctx.fillStyle = 'rgba(150,140,125,1)';
    ctx.fillRect(cx - dw / 2 - 4, yb - 4, dw + 8, 4);
  }

  // Portico in front of the entrance
  if (S.portico) {
    const n = S.portico;
    const pw = Math.min(w * 0.7, n * 22);
    const px0 = cx - pw / 2;
    const colH = Math.min(wallH * 0.8, 64);
    const top = yb - 4 - colH;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(px0 - 4, top, pw + 8, colH);
    for (let i = 0; i < n; i++) {
      const colX = px0 + (pw * i) / (n - 1);
      const grd = ctx.createLinearGradient(colX - 4, 0, colX + 4, 0);
      grd.addColorStop(0, '#cfc8ba');
      grd.addColorStop(0.45, '#fbf8f1');
      grd.addColorStop(1, '#bdb5a5');
      ctx.fillStyle = grd;
      ctx.fillRect(colX - 3.5, top + 4, 7, colH - 4);
      ctx.fillStyle = S.trim;
      ctx.fillRect(colX - 5, top + 2, 10, 3);
      ctx.fillRect(colX - 5, yb - 6, 10, 2);
    }
    ctx.fillStyle = S.trim;
    ctx.fillRect(px0 - 8, top - 4, pw + 16, 7);
    ctx.fillStyle = pat(ctx, img(surfaceTexture('stone', S.trim)), px0, top - 20, 24, 24);
    ctx.beginPath();
    ctx.moveTo(px0 - 10, top - 4);
    ctx.lineTo(cx, top - 4 - pw * 0.16);
    ctx.lineTo(px0 + pw + 10, top - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = roofD;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,140,125,1)';
    ctx.fillRect(px0 - 8, yb - 4, pw + 16, 4);
  }

  // Lanterns (dojo)
  if (S.lanterns) {
    for (const lx of [x0 + 10, x0 + w - 10]) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(lx, yb - wallH * 0.55, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(253,224,71,0.5)';
      ctx.beginPath();
      ctx.arc(lx, yb - wallH * 0.55, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Flags
  if (S.flags) {
    for (const fx of [x0 + 6, x0 + w - 6]) {
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(fx - 0.75, b.y - 22, 1.5, 26);
      ctx.fillStyle = S.flags;
      ctx.beginPath();
      ctx.moveTo(fx, b.y - 22);
      ctx.lineTo(fx + 13, b.y - 19);
      ctx.lineTo(fx, b.y - 14);
      ctx.fill();
    }
  }
  return true;
}
