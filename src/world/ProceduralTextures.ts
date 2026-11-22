/**
 * Canvas-painted textures for the procedural architecture and trees: plaster, brick,
 * ashlar stone, timber, glass curtain wall, roof tiles, slate, copper, doors, awnings,
 * and leaf canopies. Every texture is painted once, cached for the session and marked
 * shared so location teardown never disposes it.
 */
import * as THREE from 'three';
import { markShared } from './EnvironmentAssets';

const cache = new Map<string, THREE.CanvasTexture>();

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  if (f >= 0) c.lerp(new THREE.Color(0xffffff), f);
  else c.multiplyScalar(1 + f);
  return '#' + c.getHexString();
}

function make(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D, r: () => number) => void, repeat = true): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  paint(g, rng(hashStr(key)));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  markShared(t);
  cache.set(key, t);
  return t;
}

/** Fine mottling so flat colour reads as a real surface (per-pixel noise in blocks of `size`). */
function grain(g: CanvasRenderingContext2D, r: () => number, w: number, h: number, amount: number, size = 2): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const amp = amount * 255 * 1.6;
  for (let by = 0; by < h; by += size) {
    for (let bx = 0; bx < w; bx += size) {
      const n = (r() - 0.5) * amp;
      for (let y = by; y < Math.min(h, by + size); y++) {
        for (let x = bx; x < Math.min(w, bx + size); x++) {
          const i = (y * w + x) * 4;
          if (d[i + 3] === 0) continue;
          d[i] = Math.max(0, Math.min(255, d[i] + n));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
}

// ----------------------------------------------------------------------------- wall surfaces

export type WallKind = 'plaster' | 'brick' | 'stone' | 'timber' | 'glass';

function paintSurface(g: CanvasRenderingContext2D, r: () => number, kind: WallKind, color: string, w: number, h: number): void {
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  if (kind === 'plaster') {
    grain(g, r, w, h, 0.06, 3);
    // Soft weathering streaks
    for (let i = 0; i < 10; i++) {
      const x = r() * w;
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(60,50,40,0.06)');
      g.fillStyle = grd;
      g.fillRect(x, 0, 2 + r() * 6, h);
    }
  } else if (kind === 'brick') {
    const bh = h / 16;
    const bw = w / 6;
    g.fillStyle = shade(color, 0.45);
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let c = -1; c < 7; c++) {
        g.fillStyle = shade(color, (r() - 0.5) * 0.28);
        g.fillRect(c * bw + off + 1.5, row * bh + 1.5, bw - 3, bh - 3);
      }
    }
    grain(g, r, w, h, 0.08, 2);
  } else if (kind === 'stone') {
    const rows = 8;
    const bh = h / rows;
    g.fillStyle = shade(color, -0.25);
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -w / 6 : 0;
      while (x < w) {
        const bw = w / 3.5 + r() * (w / 5);
        g.fillStyle = shade(color, (r() - 0.5) * 0.16);
        g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, 2);
        x += bw;
      }
    }
    grain(g, r, w, h, 0.07, 2);
  } else if (kind === 'timber') {
    for (let i = 0; i < w; i += w / 10) {
      g.fillStyle = shade(color, (r() - 0.5) * 0.2);
      g.fillRect(i, 0, w / 10 - 2, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(i + w / 10 - 2, 0, 2, h);
    }
    grain(g, r, w, h, 0.07, 2);
  } else {
    g.fillStyle = shade(color, -0.3);
    g.fillRect(0, 0, w, h);
  }
}

function paintWindow(g: CanvasRenderingContext2D, r: () => number, x: number, y: number, w: number, h: number, trim: string, opts: { arch?: boolean; shutters?: string; box?: boolean; lit?: boolean; panes?: number }): void {
  // Shutters
  if (opts.shutters) {
    for (const sx of [x - w * 0.42, x + w + w * 0.04]) {
      g.fillStyle = opts.shutters;
      g.fillRect(sx, y, w * 0.38, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let k = 1; k < 8; k++) g.fillRect(sx + 2, y + (h / 8) * k, w * 0.38 - 4, 1.5);
    }
  }
  // Frame + reveal shadow
  g.fillStyle = trim;
  g.beginPath();
  if (opts.arch) {
    g.moveTo(x - 4, y + h + 4);
    g.lineTo(x - 4, y + w / 2);
    g.arc(x + w / 2, y + w / 2, w / 2 + 4, Math.PI, 0);
    g.lineTo(x + w + 4, y + h + 4);
  } else g.rect(x - 4, y - 4, w + 8, h + 8);
  g.fill();
  // Glass: sky reflection gradient
  const grd = g.createLinearGradient(x, y, x + w, y + h);
  if (opts.lit) {
    grd.addColorStop(0, '#ffe7a8');
    grd.addColorStop(1, '#f4b860');
  } else {
    grd.addColorStop(0, '#a9cbe6');
    grd.addColorStop(0.45, '#4b7aa6');
    grd.addColorStop(1, '#1f3550');
  }
  g.fillStyle = grd;
  g.beginPath();
  if (opts.arch) {
    g.moveTo(x, y + h);
    g.lineTo(x, y + w / 2);
    g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
  } else g.rect(x, y, w, h);
  g.fill();
  // Diagonal glint
  g.save();
  g.clip();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.moveTo(x + w * 0.1, y + h);
  g.lineTo(x + w * 0.45, y);
  g.lineTo(x + w * 0.62, y);
  g.lineTo(x + w * 0.27, y + h);
  g.fill();
  // Curtains
  if (r() < 0.6) {
    g.fillStyle = r() < 0.5 ? 'rgba(250,240,220,0.75)' : 'rgba(200,80,70,0.55)';
    g.fillRect(x, y, w * 0.18, h);
    g.fillRect(x + w * 0.82, y, w * 0.18, h);
  }
  g.restore();
  // Mullions
  g.fillStyle = trim;
  const panes = opts.panes ?? 2;
  for (let k = 1; k < panes; k++) g.fillRect(x + (w / panes) * k - 1.5, y, 3, h);
  g.fillRect(x, y + h * 0.42, w, 3);
  // Sill
  g.fillStyle = shade(trim, -0.15);
  g.fillRect(x - 7, y + h + 3, w + 14, 6);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(x - 7, y + h + 9, w + 14, 3);
  // Flower box
  if (opts.box) {
    g.fillStyle = '#6b3f1f';
    g.fillRect(x - 2, y + h + 9, w + 4, 9);
    for (let k = 0; k < 9; k++) {
      g.fillStyle = ['#e11d48', '#f59e0b', '#f472b6', '#facc15'][Math.floor(r() * 4)];
      g.beginPath();
      g.arc(x + (w / 8) * k, y + h + 8 - r() * 4, 3 + r() * 2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2f7a35';
      g.fillRect(x + (w / 8) * k - 1, y + h + 9, 2, 4);
    }
  }
}

export interface FacadeOpts {
  kind: WallKind;
  color: string;
  trim: string;
  arch?: boolean;
  shutters?: string;
  boxes?: boolean;
  timberFrame?: string;
}

/** One bay × one storey of an upper floor: repeats across the façade. */
export function upperBayTexture(o: FacadeOpts): THREE.CanvasTexture {
  const key = `bay:${JSON.stringify(o)}`;
  return make(key, 256, 256, (g, r) => {
    if (o.kind === 'glass') {
      // Curtain wall: spandrel band + floor-to-ceiling glazing with mullions
      paintSurface(g, r, 'glass', o.color, 256, 256);
      const grd = g.createLinearGradient(0, 0, 256, 220);
      grd.addColorStop(0, '#b9d7ef');
      grd.addColorStop(0.5, '#5b8fbf');
      grd.addColorStop(1, '#22476e');
      g.fillStyle = grd;
      g.fillRect(0, 30, 256, 210);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.moveTo(40, 240);
      g.lineTo(140, 30);
      g.lineTo(190, 30);
      g.lineTo(90, 240);
      g.fill();
      g.fillStyle = o.trim;
      g.fillRect(0, 0, 256, 30);
      g.fillRect(0, 236, 256, 20);
      for (let x = 0; x <= 256; x += 64) g.fillRect(x - 3, 0, 6, 256);
      return;
    }
    paintSurface(g, r, o.kind, o.color, 256, 256);
    if (o.timberFrame) {
      g.fillStyle = o.timberFrame;
      g.fillRect(0, 0, 256, 12);
      g.fillRect(0, 244, 256, 12);
      g.fillRect(0, 0, 12, 256);
      g.save();
      g.translate(16, 236);
      g.rotate(-0.95);
      g.fillRect(0, 0, 90, 10);
      g.restore();
      g.save();
      g.translate(240, 236);
      g.rotate(-2.19);
      g.fillRect(0, 0, 90, 10);
      g.restore();
    }
    // Lintel / keystone
    if (o.kind === 'stone' || o.kind === 'brick') {
      g.fillStyle = shade(o.trim, -0.05);
      if (!o.arch) g.fillRect(70, 40, 116, 14);
      g.fillStyle = shade(o.trim, 0.1);
      g.fillRect(120, 34, 16, 22);
    }
    paintWindow(g, r, 88, 60, 80, 132, o.trim, { arch: o.arch, shutters: o.shutters, box: o.boxes, lit: r() < 0.12, panes: 2 });
  });
}

/** Ground storey bay: shopfront, arcade or plain windows. */
export function groundBayTexture(o: FacadeOpts & { mode: 'shop' | 'arcade' | 'plain' }): THREE.CanvasTexture {
  const key = `gbay:${JSON.stringify(o)}`;
  return make(key, 256, 256, (g, r) => {
    if (o.mode === 'arcade') {
      paintSurface(g, r, 'stone', o.kind === 'stone' ? o.color : shade(o.color, -0.08), 256, 256);
      g.fillStyle = '#2a2622';
      g.beginPath();
      g.moveTo(40, 256);
      g.lineTo(40, 120);
      g.arc(128, 120, 88, Math.PI, 0);
      g.lineTo(216, 256);
      g.fill();
      paintWindow(g, r, 64, 110, 128, 146, o.trim, { arch: true, lit: r() < 0.5, panes: 3 });
      g.fillStyle = shade(o.trim, 0.1);
      g.fillRect(118, 26, 20, 26);
      return;
    }
    if (o.mode === 'shop') {
      paintSurface(g, r, o.kind === 'glass' ? 'stone' : o.kind, o.color, 256, 256);
      g.fillStyle = o.trim;
      g.fillRect(14, 40, 228, 216);
      paintWindow(g, r, 26, 70, 204, 170, o.trim, { lit: true, panes: 3 });
      // Fascia
      g.fillStyle = shade(o.trim, -0.3);
      g.fillRect(14, 30, 228, 30);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 0; k < 6; k++) g.fillRect(40 + k * 32, 42, 18, 6);
      return;
    }
    paintSurface(g, r, o.kind, o.color, 256, 256);
    paintWindow(g, r, 84, 78, 88, 120, o.trim, { arch: o.arch, shutters: o.shutters, box: o.boxes, panes: 2 });
  });
}

/** Front entrance: panelled double door with transom and lamps, on transparent ground. */
export function doorTexture(color: string, trim: string, arch: boolean): THREE.CanvasTexture {
  return make(`door:${color}:${trim}:${arch}`, 256, 256, (g, r) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = trim;
    g.beginPath();
    if (arch) {
      g.moveTo(28, 256);
      g.lineTo(28, 110);
      g.arc(128, 110, 100, Math.PI, 0);
      g.lineTo(228, 256);
    } else g.rect(28, 30, 200, 226);
    g.fill();
    // Transom glass
    const grd = g.createLinearGradient(0, 30, 0, 110);
    grd.addColorStop(0, '#ffe8b0');
    grd.addColorStop(1, '#e0a050');
    g.fillStyle = grd;
    g.beginPath();
    if (arch) g.arc(128, 112, 82, Math.PI, 0);
    else g.rect(44, 44, 168, 52);
    g.fill();
    // Leaves
    g.fillStyle = color;
    g.fillRect(46, 112, 80, 144);
    g.fillRect(130, 112, 80, 144);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (const x of [54, 138]) {
      g.fillRect(x, 124, 64, 52);
      g.fillRect(x, 190, 64, 52);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (const x of [54, 138]) {
      g.fillRect(x, 174, 64, 3);
      g.fillRect(x, 240, 64, 3);
    }
    g.fillStyle = '#e5c158';
    g.fillRect(116, 180, 6, 18);
    g.fillRect(134, 180, 6, 18);
    grain(g, r, 256, 256, 0.03, 2);
  }, false);
}

// ----------------------------------------------------------------------------- roofs

export type RoofKind = 'terracotta' | 'slate' | 'copper' | 'wood' | 'azure' | 'emerald' | 'gravel';

const ROOF_BASE: Record<RoofKind, string> = {
  terracotta: '#b4532a',
  slate: '#465065',
  copper: '#4f9a86',
  wood: '#7a4a2a',
  azure: '#2f5f9e',
  emerald: '#2f7a4f',
  gravel: '#8b8a86',
};

export function roofTexture(kind: RoofKind): THREE.CanvasTexture {
  return make(`roof:${kind}`, 256, 256, (g, r) => {
    const base = ROOF_BASE[kind];
    g.fillStyle = shade(base, -0.35);
    g.fillRect(0, 0, 256, 256);
    if (kind === 'gravel') {
      g.fillStyle = base;
      g.fillRect(0, 0, 256, 256);
      grain(g, r, 256, 256, 0.25, 3);
      return;
    }
    if (kind === 'copper') {
      g.fillStyle = base;
      g.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 32) {
        g.fillStyle = shade(base, 0.25);
        g.fillRect(x, 0, 4, 256);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x + 4, 0, 3, 256);
      }
      grain(g, r, 256, 256, 0.12, 3);
      return;
    }
    const rows = kind === 'terracotta' ? 10 : 12;
    const th = 256 / rows;
    const cols = kind === 'terracotta' ? 10 : 8;
    const tw = 256 / cols;
    for (let row = 0; row < rows; row++) {
      const off = row % 2 ? tw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * tw + off;
        const y = row * th;
        const col = shade(base, (r() - 0.5) * 0.22);
        if (kind === 'terracotta') {
          // Barrel tiles: rounded bottoms with highlight
          const grd = g.createLinearGradient(x, 0, x + tw, 0);
          grd.addColorStop(0, shade(col, -0.2));
          grd.addColorStop(0.45, shade(col, 0.18));
          grd.addColorStop(1, shade(col, -0.25));
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(x + 1, y);
          g.lineTo(x + 1, y + th * 0.75);
          g.quadraticCurveTo(x + tw / 2, y + th * 1.25, x + tw - 1, y + th * 0.75);
          g.lineTo(x + tw - 1, y);
          g.fill();
        } else {
          g.fillStyle = col;
          g.fillRect(x + 1, y + 1, tw - 2, th - 1);
          g.fillStyle = 'rgba(255,255,255,0.1)';
          g.fillRect(x + 1, y + th - 4, tw - 2, 2);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(0, row * th, 256, 2);
    }
    grain(g, r, 256, 256, 0.06, 2);
  });
}

/** Simple tileable surface (no windows): plinths, cornices, chimneys, columns. */
export function surfaceTexture(kind: WallKind, color: string): THREE.CanvasTexture {
  return make(`surf:${kind}:${color}`, 128, 128, (g, r) => paintSurface(g, r, kind, color, 128, 128));
}

/** Striped awning canvas. */
export function awningTexture(a: string, b: string): THREE.CanvasTexture {
  return make(`awn:${a}:${b}`, 128, 64, (g, r) => {
    for (let x = 0; x < 128; x += 16) {
      g.fillStyle = (x / 16) % 2 ? a : b;
      g.fillRect(x, 0, 16, 64);
    }
    const grd = g.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.15)');
    grd.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 64);
    grain(g, r, 128, 64, 0.05, 2);
  });
}

/** Glazing with white frames for conservatories (used with transparency). */
export function conservatoryGlassTexture(): THREE.CanvasTexture {
  return make('glasshouse', 128, 128, g => {
    g.fillStyle = 'rgba(190,228,236,0.55)';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath();
    g.moveTo(10, 128);
    g.lineTo(60, 0);
    g.lineTo(80, 0);
    g.lineTo(30, 128);
    g.fill();
    g.fillStyle = '#f8fafc';
    g.fillRect(0, 0, 128, 5);
    g.fillRect(0, 0, 5, 128);
    g.fillRect(62, 0, 4, 128);
    g.fillRect(0, 62, 128, 4);
  });
}

// ----------------------------------------------------------------------------- foliage

const LEAF_SHADES = Array.from({ length: 10 }, (_, i) => {
  const l = 0.55 + (i / 9) * 0.6;
  return `rgba(${Math.floor(120 * l)},${Math.floor(170 * l)},${Math.floor(100 * l)},0.9)`;
});
const BLOSSOM_SHADES = ['rgba(240,180,205,0.95)', 'rgba(250,200,220,0.95)', 'rgba(236,170,198,0.95)', 'rgba(252,215,230,0.95)', 'rgba(244,190,214,0.95)'];

/** Leafy canopy texture: thousands of small leaves in a range of greens (tinted by vertex colour). */
export function leafTexture(kind: 'broad' | 'needle' | 'blossom'): THREE.CanvasTexture {
  return make(`leaf:${kind}`, 256, 256, (g, r) => {
    g.fillStyle = kind === 'blossom' ? '#e8b7c8' : '#6f8f5a';
    g.fillRect(0, 0, 256, 256);
    const n = kind === 'needle' ? 2600 : 1700;
    for (let i = 0; i < n; i++) {
      const x = r() * 256;
      const y = r() * 256;
      const l = 0.55 + r() * 0.6;
      if (kind === 'blossom') {
        g.fillStyle = r() < 0.75 ? BLOSSOM_SHADES[Math.floor(r() * BLOSSOM_SHADES.length)] : LEAF_SHADES[Math.floor(r() * 3)];
        g.beginPath();
        g.arc(x, y, 2 + r() * 2.5, 0, Math.PI * 2);
        g.fill();
        continue;
      }
      g.fillStyle = LEAF_SHADES[Math.min(LEAF_SHADES.length - 1, Math.floor(((l - 0.55) / 0.6) * LEAF_SHADES.length))];
      g.save();
      g.translate(x, y);
      g.rotate(r() * Math.PI * 2);
      g.beginPath();
      if (kind === 'needle') g.rect(-0.8, -4, 1.6, 8);
      else g.ellipse(0, 0, 2.2 + r() * 1.6, 4 + r() * 2.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    // Dark gaps between leaf clusters
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(20,35,15,0.22)';
      g.beginPath();
      g.arc(r() * 256, r() * 256, 3 + r() * 6, 0, Math.PI * 2);
      g.fill();
    }
  });
}

export function barkTexture(): THREE.CanvasTexture {
  return make('bark', 64, 128, (g, r) => {
    g.fillStyle = '#5b4231';
    g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(30,20,12,0.45)' : 'rgba(140,110,80,0.25)';
      g.fillRect(r() * 64, r() * 128, 1.5 + r() * 2, 10 + r() * 30);
    }
  });
}
