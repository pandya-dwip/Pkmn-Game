/**
 * FeatureRenderer.ts
 * Original procedural artwork for the exploration-area world features.
 * Ground features are drawn into the flat ground layer (then perspective
 * projected); upright features are drawn as billboards in world coordinates
 * anchored at their base so the shared depth sorter can order them.
 */

import {
  Rect,
  RouteWater,
  RouteBridge,
  RouteTerrainPatch,
  RoutePortal,
  RouteBoulder,
  RouteSwitch,
  RouteBarrier,
  RouteLandmark,
  RouteFishingSpot,
  RouteWaterfall,
  RouteCrystal,
  RouteNoticeBoard,
} from './WorldTypes';

export const CAVE_WALL_FACE = 46;

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------------------
// GROUND LAYER (static: drawn once into the route cache)
// ---------------------------------------------------------------------------

const TERRAIN_COLORS: Record<string, [string, string, string]> = {
  sand: ['#e9d29a', '#d8bb7a', '#f6e7b9'],
  wetsand: ['#c9ae74', '#b39560', '#d8c08a'],
  rock: ['#7c7468', '#655e54', '#958c7e'],
  plateau: ['#5f8f4a', '#4d7a3b', '#7aa860'],
  moss: ['#2f5d34', '#244a29', '#3f7444'],
  snow: ['#eef2f7', '#d6dee9', '#ffffff'],
  cave: ['#4a4038', '#3c332c', '#5a4f45'],
  dirt: ['#8a6a45', '#755836', '#9c7b52'],
  meadow: ['#4f8a3c', '#427733', '#62a04a'],
};

export function drawTerrainPatch(ctx: CanvasRenderingContext2D, t: RouteTerrainPatch): void {
  const [base, dark, light] = TERRAIN_COLORS[t.kind] || TERRAIN_COLORS.dirt;
  ctx.save();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(t.x - 4, t.y - 3, t.w + 8, t.h + 8, 22);
  ctx.fill();
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.roundRect(t.x, t.y, t.w, t.h, 18);
  ctx.fill();
  // Speckle texture
  for (let x = t.x + 8; x < t.x + t.w - 6; x += 14) {
    for (let y = t.y + 8; y < t.y + t.h - 6; y += 12) {
      const v = hash(x, y);
      if (v < 0.35) continue;
      ctx.fillStyle = v > 0.8 ? light : dark;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + v * 8, y + (v * 31) % 8, v > 0.9 ? 3 : 2, 2);
    }
  }
  ctx.globalAlpha = 1;
  // Elevated tiers: lit top edge + shadowed front lip
  if (t.tier && t.tier > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(t.x + 6, t.y + 2, t.w - 12, 5);
    const lip = ctx.createLinearGradient(0, t.y + t.h - 14, 0, t.y + t.h + 10);
    lip.addColorStop(0, 'rgba(0,0,0,0)');
    lip.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = lip;
    ctx.fillRect(t.x, t.y + t.h - 14, t.w, 24);
  }
  ctx.restore();
}

/** Cave chambers: everything outside floors is solid rock (drawn dark). */
export function drawCaveFloors(ctx: CanvasRenderingContext2D, floors: Rect[], worldW: number, worldH: number): void {
  ctx.save();
  // Solid rock mass (top surface seen from above)
  ctx.fillStyle = '#1b1714';
  ctx.fillRect(0, 0, worldW, worldH);
  for (let x = 0; x < worldW; x += 22) {
    for (let y = 0; y < worldH; y += 22) {
      const v = hash(x, y);
      ctx.fillStyle = v > 0.6 ? '#2a231e' : '#221c18';
      ctx.fillRect(x + v * 6, y + v * 9, 14 + v * 8, 10 + v * 6);
    }
  }
  // 1) Back wall faces (vertical rock) along every chamber's north edge
  for (const f of floors) {
    const face = ctx.createLinearGradient(0, f.y, 0, f.y + CAVE_WALL_FACE);
    face.addColorStop(0, '#5b4b3e');
    face.addColorStop(0.55, '#463a30');
    face.addColorStop(1, '#2b241e');
    ctx.fillStyle = face;
    ctx.fillRect(f.x, f.y, f.w, CAVE_WALL_FACE + 4);
    // vertical strata
    for (let x = f.x + 4; x < f.x + f.w; x += 9) {
      const v = hash(x, f.y);
      ctx.fillStyle = v > 0.5 ? 'rgba(255,230,200,0.07)' : 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, f.y + 3 + v * 6, 2 + v * 2, CAVE_WALL_FACE - 8 - v * 8);
    }
  }
  // 2) Walkable floor surfaces
  for (const f of floors) {
    const top = f.y + CAVE_WALL_FACE;
    const g = ctx.createLinearGradient(0, top, 0, f.y + f.h);
    g.addColorStop(0, '#5e5146');
    g.addColorStop(1, '#4a3f36');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(f.x, top, f.w, f.h - CAVE_WALL_FACE, 10);
    ctx.fill();
  }
  // 3) Floor grit (after all surfaces so overlaps look continuous)
  for (const f of floors) {
    const top = f.y + CAVE_WALL_FACE;
    for (let x = f.x + 10; x < f.x + f.w - 8; x += 17) {
      for (let y = top + 8; y < f.y + f.h - 6; y += 15) {
        const v = hash(x, y);
        if (v < 0.45) continue;
        ctx.fillStyle = v > 0.85 ? '#7a6a5b' : '#3f352d';
        ctx.beginPath();
        ctx.ellipse(x + v * 8, y + v * 5, 2 + v * 2.5, 1.4 + v, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // contact shadow under the back wall
    const sh = ctx.createLinearGradient(0, top, 0, top + 18);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(f.x, top, f.w, 18);
  }
  ctx.restore();
}

export function isOnCaveFloor(floors: Rect[], x: number, footY: number): boolean {
  for (const f of floors) {
    if (x >= f.x + 9 && x <= f.x + f.w - 9 && footY >= f.y + CAVE_WALL_FACE - 4 && footY <= f.y + f.h - 6) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// GROUND LAYER (animated: drawn every frame into the ground view)
// ---------------------------------------------------------------------------

export function drawWater(ctx: CanvasRenderingContext2D, w: RouteWater, time: number): void {
  ctx.save();
  if (w.kind === 'chasm') {
    const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
    g.addColorStop(0, '#3b3530');
    g.addColorStop(0.25, '#151210');
    g.addColorStop(1, '#050404');
    ctx.fillStyle = g;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    // crumbling rims
    ctx.fillStyle = '#6b6156';
    for (let x = w.x; x < w.x + w.w; x += 12) {
      const v = hash(x, w.y);
      ctx.fillRect(x, w.y - 2, 10, 5 + v * 4);
      ctx.fillRect(x + 3, w.y + w.h - 4 - v * 3, 9, 4 + v * 3);
    }
    // drifting mist
    ctx.fillStyle = 'rgba(220,225,235,0.06)';
    for (let i = 0; i < 4; i++) {
      const mx = w.x + ((time * 18 + i * 97) % (w.w + 80)) - 40;
      ctx.beginPath();
      ctx.ellipse(mx, w.y + w.h * (0.3 + i * 0.15), 50, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  const shallow = w.kind === 'shallows';
  // Shoreline rim
  if (w.shore) {
    ctx.fillStyle = w.shore === 'sand' ? '#e4cf96' : w.shore === 'rock' ? '#6f675c' : '#2f6b37';
    ctx.beginPath();
    ctx.roundRect(w.x - 10, w.y - 10, w.w + 20, w.h + 20, 26);
    ctx.fill();
    if (w.shore === 'sand') {
      ctx.fillStyle = '#c9ae74';
      ctx.beginPath();
      ctx.roundRect(w.x - 4, w.y - 4, w.w + 8, w.h + 8, 22);
      ctx.fill();
    }
  }
  const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
  if (shallow) {
    g.addColorStop(0, '#5fc4cf');
    g.addColorStop(1, '#3aa7b8');
  } else if (w.kind === 'sea') {
    g.addColorStop(0, '#0b3f73');
    g.addColorStop(0.5, '#0f5b9a');
    g.addColorStop(1, '#1679b8');
  } else {
    g.addColorStop(0, '#1d4ed8');
    g.addColorStop(1, '#0e7490');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(w.x, w.y, w.w, w.h, 18);
  ctx.fill();

  // Depth band near the shore (lighter) to suggest a slope into deep water
  if (!shallow) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(w.x + 5, w.y + 5, w.w - 10, w.h - 10, 14);
    ctx.stroke();
  }

  // Animated wave crests (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(w.x, w.y, w.w, w.h, 18);
  ctx.clip();
  ctx.strokeStyle = shallow ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.6;
  const flow = w.kind === 'river' ? time * 40 : time * 10;
  for (let y = w.y + 14; y < w.y + w.h; y += 22) {
    for (let x = w.x - 60 + ((flow + y * 3) % 60); x < w.x + w.w; x += 60) {
      const v = hash(Math.floor(x / 60), y);
      const len = 14 + v * 14;
      const bob = Math.sin(time * 2 + x * 0.05 + y) * 2;
      ctx.beginPath();
      ctx.moveTo(x, y + bob);
      ctx.quadraticCurveTo(x + len / 2, y - 3 + bob, x + len, y + bob);
      ctx.stroke();
    }
  }
  // Sun glints
  for (let i = 0; i < 6; i++) {
    const gx = w.x + hash(i, w.x) * w.w;
    const gy = w.y + hash(w.y, i) * w.h;
    const a = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.7);
    ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
    ctx.fillRect(gx, gy, 4, 1.5);
  }
  ctx.restore();

  // Foam line along the shore
  if (w.shore === 'sand') {
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.25 * Math.sin(time * 1.6)})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -time * 12;
    ctx.beginPath();
    ctx.roundRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4, 17);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export function drawBridge(ctx: CanvasRenderingContext2D, b: RouteBridge): void {
  ctx.save();
  // Shadow cast onto the water / chasm below
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(b.x + 4, b.y + 6, b.w, b.h);
  const plank = b.style === 'stone' ? '#9ca3af' : b.style === 'rope' ? '#a16207' : '#8b5a2b';
  const plankDark = b.style === 'stone' ? '#6b7280' : '#5c3a1a';
  ctx.fillStyle = plankDark;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (b.vertical) {
    for (let y = b.y + 1; y < b.y + b.h - 1; y += 9) {
      ctx.fillStyle = hash(b.x, y) > 0.5 ? plank : shade(plank, 0.9);
      ctx.fillRect(b.x + 3, y, b.w - 6, 7);
    }
  } else {
    for (let x = b.x + 1; x < b.x + b.w - 1; x += 9) {
      ctx.fillStyle = hash(x, b.y) > 0.5 ? plank : shade(plank, 0.9);
      ctx.fillRect(x, b.y + 3, 7, b.h - 6);
    }
  }
  // Side rails / curbs
  ctx.fillStyle = b.style === 'stone' ? '#d1d5db' : '#3f2a14';
  if (b.vertical) {
    ctx.fillRect(b.x - 2, b.y, 4, b.h);
    ctx.fillRect(b.x + b.w - 2, b.y, 4, b.h);
  } else {
    ctx.fillRect(b.x, b.y - 2, b.w, 4);
    ctx.fillRect(b.x, b.y + b.h - 2, b.w, 4);
  }
  ctx.restore();
}

export function drawSwitchPlate(ctx: CanvasRenderingContext2D, s: RouteSwitch, active: boolean, time: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 3, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#57534e';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? '#4ade80' : `rgba(56,189,248,${0.45 + 0.3 * Math.sin(time * 3)})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 15, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  // carved glyph
  ctx.strokeStyle = active ? '#bbf7d0' : '#a8a29e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(s.x - 6, s.y);
  ctx.lineTo(s.x, s.y - 4);
  ctx.lineTo(s.x + 6, s.y);
  ctx.lineTo(s.x, s.y + 4);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawFishingSpot(ctx: CanvasRenderingContext2D, f: RouteFishingSpot, time: number): void {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const p = (time * 0.6 + i / 3) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 6 + p * 18, 3 + p * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Non-grass encounter zones: cave rubble, marsh reeds, beach dunes. */
export function drawEncounterPatch(
  ctx: CanvasRenderingContext2D,
  g: { x: number; y: number; w: number; h: number; style?: string; zone?: string },
  time: number
): void {
  ctx.save();
  const rare = g.zone === 'rare';
  if (g.style === 'rubble') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.roundRect(g.x, g.y, g.w, g.h, 16);
    ctx.fill();
    for (let x = g.x + 6; x < g.x + g.w - 4; x += 11) {
      for (let y = g.y + 6; y < g.y + g.h - 4; y += 9) {
        const v = hash(x, y);
        ctx.fillStyle = v > 0.7 ? '#8a7a68' : v > 0.35 ? '#6b5d50' : '#4f453b';
        ctx.beginPath();
        ctx.ellipse(x + v * 6, y + v * 4, 2.5 + v * 3, 1.8 + v * 2, v * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (rare) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2, 15);
      ctx.stroke();
    }
  } else if (g.style === 'reeds') {
    ctx.fillStyle = '#2d4a2b';
    ctx.beginPath();
    ctx.roundRect(g.x, g.y, g.w, g.h, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(56, 120, 140, 0.35)';
    ctx.beginPath();
    ctx.roundRect(g.x + 8, g.y + 8, g.w - 16, g.h - 16, 10);
    ctx.fill();
    for (let x = g.x + 5; x < g.x + g.w - 3; x += 7) {
      for (let y = g.y + 12; y < g.y + g.h; y += 14) {
        const v = hash(x, y);
        const sway = Math.sin(time * 2.2 + x * 0.05) * 2.5;
        ctx.strokeStyle = v > 0.5 ? '#4d7c0f' : '#3f6212';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + v * 4, y);
        ctx.quadraticCurveTo(x + v * 4 + sway * 0.5, y - 9, x + v * 4 + sway, y - 16 - v * 6);
        ctx.stroke();
        if (v > 0.82) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + v * 4 + sway - 1.5, y - 22 - v * 6, 3, 7);
        }
      }
    }
  } else {
    // dunes: pale sand with sparse beach grass
    ctx.fillStyle = 'rgba(214, 190, 130, 0.55)';
    ctx.beginPath();
    ctx.roundRect(g.x, g.y, g.w, g.h, 22);
    ctx.fill();
    for (let x = g.x + 8; x < g.x + g.w - 6; x += 13) {
      for (let y = g.y + 10; y < g.y + g.h - 2; y += 12) {
        const v = hash(x, y);
        if (v < 0.25) continue;
        const sway = Math.sin(time * 2.6 + x * 0.07 + y) * 2;
        ctx.strokeStyle = v > 0.6 ? '#84a35a' : '#6b8f47';
        ctx.lineWidth = 1.3;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(x + k * 2, y);
          ctx.lineTo(x + k * 4 + sway, y - 9 - v * 5);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// UPRIGHT FEATURES (billboards anchored at their base)
// ---------------------------------------------------------------------------

export function portalAnchorY(p: RoutePortal): number {
  return p.y - 6;
}

export function drawPortal(ctx: CanvasRenderingContext2D, p: RoutePortal, time: number, revealed: boolean, locked: boolean): void {
  ctx.save();
  const x = p.x;
  const y = p.y - 6; // base line
  if (p.hidden && !revealed) {
    // Subtle clue only: trampled grass + a few out-of-place flowers.
    ctx.fillStyle = 'rgba(120, 90, 50, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#f9a8d4' : '#fde68a';
      ctx.beginPath();
      ctx.arc(x - 14 + i * 9, y - 8 + (i % 2) * 5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (p.style === 'cave' || p.style === 'cave_exit' || p.style === 'cracked_wall') {
    // Rocky arch with a dark mouth
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    const rock = p.style === 'cracked_wall' ? '#6b5d50' : '#5d5348';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const rx = x + Math.cos(a) * 40;
      const ry = y - 24 + Math.sin(a) * 40;
      ctx.fillStyle = i % 2 ? rock : shade(rock, 1.15);
      ctx.beginPath();
      ctx.ellipse(rx, ry, 16, 13, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rock;
    ctx.fillRect(x - 52, y - 30, 18, 30);
    ctx.fillRect(x + 34, y - 30, 18, 30);
    if (p.style === 'cracked_wall') {
      ctx.strokeStyle = '#2b241e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 50);
      ctx.lineTo(x - 2, y - 30);
      ctx.lineTo(x - 12, y - 14);
      ctx.moveTo(x - 2, y - 30);
      ctx.lineTo(x + 12, y - 22);
      ctx.stroke();
    }
    const mouth = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 34);
    mouth.addColorStop(0, '#000000');
    mouth.addColorStop(0.7, '#0b0908');
    mouth.addColorStop(1, '#2a221c');
    ctx.fillStyle = mouth;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x - 30, y - 22);
    ctx.quadraticCurveTo(x, y - 66, x + 30, y - 22);
    ctx.lineTo(x + 30, y);
    ctx.closePath();
    ctx.fill();
    if (p.style === 'cave_exit') {
      const glow = ctx.createRadialGradient(x, y - 20, 2, x, y - 20, 40);
      glow.addColorStop(0, 'rgba(255, 244, 214, 0.55)');
      glow.addColorStop(1, 'rgba(255, 244, 214, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 40, y - 60, 80, 60);
    }
  } else if (p.style === 'stairs_down' || p.style === 'stairs_up') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 26, y - 34, 52, 36);
    for (let i = 0; i < 5; i++) {
      const sy = y - 32 + i * 7;
      ctx.fillStyle = p.style === 'stairs_down' ? shade('#78716c', 1 - i * 0.12) : shade('#78716c', 0.6 + i * 0.1);
      ctx.fillRect(x - 22 + (p.style === 'stairs_down' ? i * 2 : 0), sy, 44 - (p.style === 'stairs_down' ? i * 4 : 0), 5);
    }
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(x - 28, y - 36, 5, 38);
    ctx.fillRect(x + 23, y - 36, 5, 38);
  } else if (p.style === 'dock') {
    // Boat moored at a dock post
    const bob = Math.sin(time * 1.8) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(x - 34, y - 14 + bob);
    ctx.lineTo(x + 34, y - 14 + bob);
    ctx.lineTo(x + 24, y + bob);
    ctx.lineTo(x - 24, y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x - 30, y - 17 + bob, 60, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x - 3, y - 58 + bob, 3, 44);
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(x, y - 58 + bob);
    ctx.lineTo(x + 26, y - 22 + bob);
    ctx.lineTo(x, y - 22 + bob);
    ctx.closePath();
    ctx.fill();
  } else {
    // forest_path / trail: two weathered posts with a hanging sign and a dirt lane
    ctx.fillStyle = 'rgba(110, 80, 45, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c3b1e';
    ctx.fillRect(x - 24, y - 40, 5, 40);
    ctx.fillRect(x + 19, y - 40, 5, 40);
    ctx.fillStyle = '#7c4f28';
    ctx.fillRect(x - 26, y - 44, 52, 6);
    ctx.fillStyle = p.style === 'trail' ? '#e7d3a8' : '#d9c79c';
    ctx.fillRect(x - 16, y - 36, 32, 13);
    ctx.fillStyle = '#5c3b1e';
    ctx.fillRect(x - 11, y - 31, 18, 2);
    ctx.beginPath();
    ctx.moveTo(x + 7, y - 33);
    ctx.lineTo(x + 12, y - 30);
    ctx.lineTo(x + 7, y - 27);
    ctx.fill();
  }

  if (locked) {
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.beginPath();
    ctx.roundRect(x - 9, y - 62, 18, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y - 62, 5, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBoulder(ctx: CanvasRenderingContext2D, b: RouteBoulder): void {
  const r = b.r || 18;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + r * 0.35, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 1.2, 2, b.x, b.y - r * 0.7, r * 1.25);
  g.addColorStop(0, '#b6aa9a');
  g.addColorStop(0.6, '#857a6c');
  g.addColorStop(1, '#4e463d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y - r * 0.7, r, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,32,26,0.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(b.x - r * 0.4, b.y - r * 1.1);
  ctx.lineTo(b.x - r * 0.1, b.y - r * 0.6);
  ctx.lineTo(b.x + r * 0.3, b.y - r * 0.75);
  ctx.stroke();
  ctx.restore();
}

export function drawBarrier(ctx: CanvasRenderingContext2D, b: RouteBarrier, time: number): void {
  ctx.save();
  if (b.style === 'crystal') {
    for (let x = b.x + 8; x < b.x + b.w; x += 16) {
      const h = 34 + hash(x, b.y) * 26;
      const pulse = 0.6 + 0.4 * Math.sin(time * 2 + x);
      ctx.fillStyle = `rgba(147, 197, 253, ${0.55 + 0.25 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(x - 8, b.y + b.h);
      ctx.lineTo(x, b.y + b.h - h);
      ctx.lineTo(x + 8, b.y + b.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - 1, b.y + b.h - h + 6, 2, h * 0.5);
    }
  } else if (b.style === 'vines') {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(b.x, b.y + b.h - 40, b.w, 40);
    for (let x = b.x; x < b.x + b.w; x += 7) {
      ctx.strokeStyle = hash(x, 3) > 0.5 ? '#166534' : '#15803d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, b.y + b.h);
      ctx.quadraticCurveTo(x + 6, b.y + b.h - 30, x + 2, b.y + b.h - 56);
      ctx.stroke();
    }
  } else {
    // rockfall
    for (let i = 0; i < Math.max(3, Math.floor(b.w / 18)); i++) {
      const rx = b.x + 10 + (i * (b.w - 20)) / Math.max(1, Math.floor(b.w / 18) - 1);
      const r = 13 + hash(rx, b.y) * 9;
      drawBoulder(ctx, { id: '', x: rx, y: b.y + b.h - (i % 2) * 8, r });
    }
  }
  ctx.restore();
}

export function drawLandmark(ctx: CanvasRenderingContext2D, l: RouteLandmark, time: number, discovered: boolean): void {
  ctx.save();
  const { x, y } = l;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (l.style === 'viewpoint') {
    // Stone platform with a brass telescope
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(x - 24, y - 10, 48, 10);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(x - 24, y - 12, 48, 3);
    ctx.fillStyle = '#374151';
    ctx.fillRect(x - 2, y - 34, 4, 24);
    ctx.save();
    ctx.translate(x, y - 36);
    ctx.rotate(-0.35);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-14, -4, 28, 8);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(10, -5, 6, 10);
    ctx.restore();
  } else if (l.style === 'shrine' || l.style === 'monument') {
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(x - 18, y - 10, 36, 10);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(x - 11, y - 52, 22, 44);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(x - 15, y - 56, 30, 6);
    ctx.fillStyle = `rgba(250, 204, 21, ${0.5 + 0.3 * Math.sin(time * 2)})`;
    ctx.beginPath();
    ctx.arc(x, y - 36, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (l.style === 'ruin') {
    ctx.fillStyle = '#78716c';
    ctx.fillRect(x - 30, y - 46, 12, 46);
    ctx.fillRect(x + 18, y - 34, 12, 34);
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(x - 32, y - 50, 16, 6);
    ctx.fillStyle = '#57534e';
    ctx.fillRect(x - 10, y - 8, 22, 8);
  } else if (l.style === 'lighthouse') {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 10, y - 96);
    ctx.lineTo(x + 10, y - 96);
    ctx.lineTo(x + 16, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 14, y - 30, 28, 12);
    ctx.fillRect(x - 12, y - 66, 24, 12);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x - 13, y - 110, 26, 14);
    ctx.fillStyle = `rgba(253, 224, 71, ${0.7 + 0.3 * Math.sin(time * 3)})`;
    ctx.fillRect(x - 9, y - 108, 18, 10);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 110);
    ctx.lineTo(x, y - 124);
    ctx.lineTo(x + 15, y - 110);
    ctx.fill();
  } else if (l.style === 'statue') {
    // Champion statue: stepped stone pedestal with a bronze trainer and partner
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(x - 24, y - 10, 48, 10);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(x - 18, y - 34, 36, 24);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(x - 21, y - 38, 42, 5);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 10, y - 26, 20, 6);
    const bronze = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
    bronze.addColorStop(0, '#78350f');
    bronze.addColorStop(0.5, '#b45309');
    bronze.addColorStop(1, '#451a03');
    ctx.fillStyle = bronze;
    // trainer: legs, body, raised arm, head
    ctx.fillRect(x - 8, y - 58, 5, 20);
    ctx.fillRect(x - 1, y - 58, 5, 20);
    ctx.fillRect(x - 10, y - 78, 16, 22);
    ctx.save();
    ctx.translate(x + 6, y - 76);
    ctx.rotate(-0.9);
    ctx.fillRect(0, -2.5, 18, 5);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x - 2, y - 85, 7, 0, Math.PI * 2);
    ctx.fill();
    // partner Pokemon at their feet
    ctx.beginPath();
    ctx.ellipse(x + 12, y - 44, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 49);
    ctx.lineTo(x + 6, y - 58);
    ctx.lineTo(x + 12, y - 50);
    ctx.moveTo(x + 15, y - 50);
    ctx.lineTo(x + 19, y - 58);
    ctx.lineTo(x + 18, y - 48);
    ctx.fill();
    ctx.fillStyle = `rgba(254, 240, 138, ${0.15 + 0.1 * Math.sin(time * 2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 60, 28, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // old_tree: an ancient oak with a wide crown and a stone ring around its roots
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c3b1e';
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 4);
    ctx.quadraticCurveTo(x - 8, y - 50, x - 16, y - 92);
    ctx.lineTo(x + 14, y - 92);
    ctx.quadraticCurveTo(x + 8, y - 50, x + 13, y - 4);
    ctx.closePath();
    ctx.fill();
    const leaves = ['#166534', '#15803d', '#22c55e', '#14532d'];
    const blobs: [number, number, number][] = [[0, -120, 42], [-36, -104, 32], [36, -104, 32], [-20, -146, 30], [22, -146, 30], [0, -96, 30]];
    blobs.forEach(([dx, dy, r], i) => {
      ctx.fillStyle = leaves[i % leaves.length];
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(x - 14, y - 132, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!discovered) {
    const bob = Math.sin(time * 4) * 2;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x, y - (l.style === 'lighthouse' ? 132 : 66) + bob);
    ctx.lineTo(x + 5, y - (l.style === 'lighthouse' ? 140 : 74) + bob);
    ctx.lineTo(x, y - (l.style === 'lighthouse' ? 148 : 82) + bob);
    ctx.lineTo(x - 5, y - (l.style === 'lighthouse' ? 140 : 74) + bob);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawWaterfall(ctx: CanvasRenderingContext2D, w: RouteWaterfall, time: number): void {
  ctx.save();
  const top = w.y - w.h;
  // rock lips either side
  ctx.fillStyle = '#57534e';
  ctx.fillRect(w.x - 14, top - 6, 16, w.h + 6);
  ctx.fillRect(w.x + w.w - 2, top - 6, 16, w.h + 6);
  const g = ctx.createLinearGradient(0, top, 0, w.y);
  g.addColorStop(0, '#bae6fd');
  g.addColorStop(1, '#38bdf8');
  ctx.fillStyle = g;
  ctx.fillRect(w.x, top, w.w, w.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  for (let x = w.x + 4; x < w.x + w.w - 2; x += 7) {
    const off = (time * 140 + hash(x, 1) * 200) % w.h;
    ctx.beginPath();
    ctx.moveTo(x, top + off);
    ctx.lineTo(x, Math.min(w.y, top + off + 22));
    ctx.stroke();
  }
  // splash foam
  for (let i = 0; i < 7; i++) {
    const a = (time * 2 + i) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - a)})`;
    ctx.beginPath();
    ctx.arc(w.x + (i + 0.5) * (w.w / 7), w.y - a * 10, 4 + a * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCrystal(ctx: CanvasRenderingContext2D, c: RouteCrystal, time: number): void {
  const s = c.scale || 1;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 14 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const shards = [
    [-8, 26, -0.25],
    [0, 40, 0],
    [8, 30, 0.3],
    [-3, 18, -0.6],
  ];
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.2 + c.x);
  for (const [ox, h, rot] of shards) {
    ctx.save();
    ctx.translate(c.x + ox * s, c.y);
    ctx.rotate(rot);
    ctx.fillStyle = c.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-5 * s, 0);
    ctx.lineTo(-3 * s, -h * s);
    ctx.lineTo(0, -(h + 8) * s);
    ctx.lineTo(3 * s, -h * s);
    ctx.lineTo(5 * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.5 * s, -h * s, 1.5 * s, h * 0.7 * s);
    ctx.restore();
  }
  ctx.restore();
}

export function drawNoticeBoard(ctx: CanvasRenderingContext2D, n: RouteNoticeBoard, hasNew: boolean, time: number): void {
  ctx.save();
  const { x, y } = n;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a2e14';
  ctx.fillRect(x - 24, y - 44, 5, 44);
  ctx.fillRect(x + 19, y - 44, 5, 44);
  ctx.fillStyle = '#7c4f28';
  ctx.fillRect(x - 28, y - 50, 56, 32);
  ctx.fillStyle = '#c8a26a';
  ctx.fillRect(x - 25, y - 47, 50, 26);
  const notes = ['#fef9c3', '#e0f2fe', '#fce7f3'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = notes[i];
    ctx.fillRect(x - 21 + i * 15, y - 44 + (i % 2) * 3, 12, 15);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 16 + i * 15, y - 45 + (i % 2) * 3, 2, 2);
  }
  ctx.fillStyle = '#5c3b1e';
  ctx.fillRect(x - 30, y - 53, 60, 4);
  if (hasNew) {
    const bob = Math.sin(time * 4) * 2;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y - 64 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 60.5 + bob);
  }
  ctx.restore();
}

/** Small floating marker used for quest-givers etc. (no emoji). */
export function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, kind: 'quest' | 'turnin' | 'talk' | 'alert', time: number): void {
  const bob = Math.sin(time * 4.5) * 2.2;
  ctx.save();
  const col = kind === 'quest' ? '#facc15' : kind === 'turnin' ? '#4ade80' : kind === 'alert' ? '#f87171' : '#e2e8f0';
  ctx.fillStyle = 'rgba(15,23,42,0.88)';
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 9 + bob, 16, 16, 5);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = '900 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind === 'turnin' ? '?' : kind === 'talk' ? '…' : '!', x, y - 0.5 + bob);
  ctx.restore();
}

export function shade(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}
