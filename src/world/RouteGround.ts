/**
 * RouteGround.ts
 * Ground, paths, water and forest fill for the 3D chase view.
 *
 *  - Ground: a tiled, high-detail biome texture (lawn, meadow, dry grass, sand,
 *    rock, snow, ash, cave floor; one strip per zone, blended at the seams), with
 *    the route's own 2D ground art laid on top *except* its flat lawn (paths,
 *    plazas, shores, terrain patches and ledges keep their art). Dirt trails are
 *    re-textured with natural dirt and ragged, grassy edges. A lawn mask tells
 *    the model placer where ground cover may grow.
 *  - Water: animated ponds, seas (running on to the horizon), lakes, flowing
 *    rivers, shallows and chasms, with foam where water meets land and 3D piers.
 *  - Forest fill: extra trees in open lawn far from paths and points of interest
 *    (these collide in the 3D view), typed by each zone's filler config, plus a
 *    ring beyond the walkable edges (never out on open water) so the world never
 *    ends in empty fields.
 * All textures are generated procedurally (no extra downloads).
 */

import * as THREE from 'three';
import { RouteDefinition, RoutePath, RouteTree } from '../systems/RouteExplorationEngine';
import { LocationEnv, zoneAt } from './LocationEnvironment';

// Deterministic noise helpers
const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seamless tile: anything drawn near an edge is also drawn wrapped onto the opposite edge. */
function tile(size: number, paint: (dot: (x: number, y: number, draw: (x: number, y: number) => void) => void, ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const wrap = (x: number, y: number, draw: (x: number, y: number) => void) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) draw(x + ox, y + oy);
  };
  paint(wrap, ctx);
  return c;
}

interface GroundPalette {
  base: string;
  blobs: [string, string];
  blades: string[];
  dots: string[];
  bladeCount: number;
}

/** Base ground palettes per biome. 'grass' is the reference lawn (Route 1 / Pallet / Viridian). */
const PALETTES: Record<LocationEnv['baseGround'], GroundPalette> = {
  grass: { base: '#4f8f36', blobs: ['rgba(70, 130, 45, 0.35)', 'rgba(110, 160, 60, 0.28)'], blades: ['#3f7a2c', '#5a9c3c', '#6bb046', '#467f31', '#7cbf52', '#356b25'], dots: ['#f8fafc', '#fde047', '#f9a8d4'], bladeCount: 9000 },
  meadow: { base: '#5a9438', blobs: ['rgba(90, 140, 50, 0.35)', 'rgba(140, 170, 70, 0.3)'], blades: ['#4b8430', '#66a240', '#7bb64c', '#55902f', '#8fc45a', '#3f7428'], dots: ['#f8fafc', '#fde047', '#c4b5fd', '#f9a8d4'], bladeCount: 9000 },
  dry: { base: '#8f9a4a', blobs: ['rgba(150, 140, 70, 0.35)', 'rgba(110, 130, 50, 0.3)'], blades: ['#7d8a3c', '#a3a050', '#b5a95c', '#6f7d33', '#c2b46a', '#8c9444'], dots: ['#fde68a', '#f8fafc'], bladeCount: 7000 },
  sand: { base: '#d9c48f', blobs: ['rgba(200, 175, 120, 0.4)', 'rgba(235, 215, 170, 0.35)'], blades: ['#c9b27a', '#e3d3a4', '#bfa56c', '#d6c08a'], dots: ['#f5efe0', '#b9a37a'], bladeCount: 4000 },
  rock: { base: '#8a8574', blobs: ['rgba(110, 105, 92, 0.4)', 'rgba(150, 146, 130, 0.35)'], blades: ['#7a7566', '#9c9787', '#6b675a', '#a8a493', '#5f7a45'], dots: ['#b5b1a3', '#5c5a50'], bladeCount: 5000 },
  snow: { base: '#e7eef3', blobs: ['rgba(200, 214, 226, 0.45)', 'rgba(255, 255, 255, 0.5)'], blades: ['#d7e2ea', '#f4f8fb', '#c8d5df', '#ffffff'], dots: ['#ffffff', '#b8c7d3'], bladeCount: 3000 },
  ash: { base: '#5d5a54', blobs: ['rgba(70, 66, 60, 0.45)', 'rgba(110, 100, 90, 0.35)'], blades: ['#4f4b45', '#6d6860', '#3f3c37', '#7c766c'], dots: ['#8a5a3a', '#3a3632'], bladeCount: 4000 },
  cave: { base: '#2b2723', blobs: ['rgba(20, 18, 16, 0.5)', 'rgba(60, 54, 48, 0.4)'], blades: ['#3a3530', '#24211e', '#48423b'], dots: ['#55504a', '#1a1816'], bladeCount: 3000 },
};

/** Lush lawn (or the biome's ground): layered colour, thousands of short blade strokes, a few flowers. */
function grassTile(pal: GroundPalette = PALETTES.grass): HTMLCanvasElement {
  const r = rng(77);
  return tile(512, (wrap, ctx) => {
    ctx.fillStyle = pal.base;
    ctx.fillRect(0, 0, 512, 512);
    // broad colour variation
    for (let i = 0; i < 90; i++) {
      const x = r() * 512;
      const y = r() * 512;
      const rad = 30 + r() * 70;
      const col = r() < 0.5 ? pal.blobs[0] : pal.blobs[1];
      wrap(x, y, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      });
    }
    // blades
    const blades = pal.blades;
    for (let i = 0; i < pal.bladeCount; i++) {
      const x = r() * 512;
      const y = r() * 512;
      const len = 3 + r() * 6;
      const ang = -Math.PI / 2 + (r() - 0.5) * 0.9;
      ctx.strokeStyle = blades[Math.floor(r() * blades.length)];
      ctx.lineWidth = 0.8 + r() * 0.8;
      wrap(x, y, (px, py) => {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
        ctx.stroke();
      });
    }
    // tiny wildflowers
    for (let i = 0; i < 40; i++) {
      const x = r() * 512;
      const y = r() * 512;
      ctx.fillStyle = pal.dots[Math.floor(r() * pal.dots.length)];
      wrap(x, y, (px, py) => {
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

/** Packed-earth trail: mottled browns, fine grit, scattered pebbles and a few cracks. */
function dirtTile(): HTMLCanvasElement {
  const r = rng(91);
  return tile(256, (wrap, ctx) => {
    ctx.fillStyle = '#a07c52';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      const x = r() * 256;
      const y = r() * 256;
      const rad = 12 + r() * 34;
      const col = r() < 0.5 ? 'rgba(120, 90, 55, 0.35)' : 'rgba(185, 150, 105, 0.3)';
      wrap(x, y, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      });
    }
    for (let i = 0; i < 2600; i++) {
      const x = r() * 256;
      const y = r() * 256;
      ctx.fillStyle = r() < 0.5 ? 'rgba(90, 65, 40, 0.5)' : 'rgba(205, 175, 130, 0.5)';
      wrap(x, y, (px, py) => ctx.fillRect(px, py, 1, 1));
    }
    for (let i = 0; i < 70; i++) {
      const x = r() * 256;
      const y = r() * 256;
      const s = 1.5 + r() * 3;
      const shade = 120 + Math.floor(r() * 70);
      wrap(x, y, (px, py) => {
        ctx.fillStyle = 'rgba(40, 30, 20, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px + 0.8, py + 1, s, s * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 20})`;
        ctx.beginPath();
        ctx.ellipse(px, py, s, s * 0.75, r(), 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.strokeStyle = 'rgba(80, 58, 35, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      let x = r() * 256;
      let y = r() * 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 18;
        y += (r() - 0.5) * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

/** Ripple normal map (sum of sines, tileable). */
function waterNormalTile(): HTMLCanvasElement {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  // Sum of waves with random integer frequencies (keeps the tile seamless, avoids regular stripes)
  const r = rng(13);
  const waves = Array.from({ length: 14 }, (_, i) => ({
    fx: Math.round((r() - 0.5) * (4 + i * 1.6)),
    fy: Math.round((r() - 0.5) * (4 + i * 1.6)) || 1,
    a: 1 / (1 + i * 0.45),
    p: r() * Math.PI * 2,
  }));
  const h = (x: number, y: number) => {
    const t = (2 * Math.PI) / size;
    let v = 0;
    for (const w of waves) v += Math.sin((x * w.fx + y * w.fy) * t + w.p) * w.a;
    return v * 0.35;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      const n = new THREE.Vector3(-dx * 2.2, -dy * 2.2, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const isDirt = (route: RouteDefinition, p: RoutePath) => (p.style ?? (route.theme === 'city' ? 'flagstone' : 'dirt')) === 'dirt';

/** Shared per-biome ground tiles (generated once, reused by every location). */
const tileCache = new Map<string, HTMLCanvasElement>();
function groundTile(kind: LocationEnv['baseGround']): HTMLCanvasElement {
  let c = tileCache.get(kind);
  if (!c) {
    c = grassTile(PALETTES[kind]);
    tileCache.set(kind, c);
  }
  return c;
}

export interface GroundInfo {
  /** True where the route art is lawn (replaced by the 3D ground + ground cover). */
  isLawn(x: number, y: number): boolean;
}

/** Biome ground + route art overlay (lawn removed, dirt trails re-textured). */
export function buildGround(scene: THREE.Scene, route: RouteDefinition, snapshot: HTMLCanvasElement, anisotropy: number, env?: LocationEnv): GroundInfo {
  const W = route.worldWidth;
  const H = route.worldHeight;

  // 1) Tiled ground across the world and well beyond it, one strip per zone ground type.
  //    Later strips fade in over a soft seam so biomes blend instead of meeting on a line.
  const EXT = 1600;
  const BLEND = 120;
  const zones = env?.zones || [];
  const segs: { x0: number; x1: number; kind: LocationEnv['baseGround'] }[] = [];
  zones.forEach((z, i) => {
    const kind = z.ground || env!.baseGround;
    const x0 = i === 0 ? -EXT : z.from;
    const x1 = i + 1 < zones.length ? zones[i + 1].from : W + EXT;
    const prev = segs[segs.length - 1];
    if (prev && prev.kind === kind) prev.x1 = x1;
    else segs.push({ x0, x1, kind });
  });
  if (!segs.length) segs.push({ x0: -EXT, x1: W + EXT, kind: env?.baseGround || 'grass' });
  segs.forEach((sg, i) => {
    const x0 = i === 0 ? sg.x0 : sg.x0 - BLEND;
    const w = sg.x1 - x0;
    const tex = new THREE.CanvasTexture(groundTile(sg.kind));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    tex.repeat.set(w / 110, (H + EXT * 2) / 110);
    tex.offset.set(((x0 + EXT) / 110) % 1, 0); // keep the tiling continuous across strips
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    if (i > 0) {
      // Horizontal alpha ramp over the first BLEND units
      const a = document.createElement('canvas');
      a.width = 512;
      a.height = 1;
      const ag = a.getContext('2d')!;
      const ramp = ag.createLinearGradient(0, 0, 512, 0);
      const k = Math.min(0.5, BLEND / w);
      ramp.addColorStop(0, '#000');
      ramp.addColorStop(k, '#fff');
      ramp.addColorStop(1, '#fff');
      ag.fillStyle = ramp;
      ag.fillRect(0, 0, 512, 1);
      mat.alphaMap = new THREE.CanvasTexture(a);
      mat.transparent = true;
      mat.depthWrite = false;
    }
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, H + EXT * 2), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x0 + w / 2, i * 0.01, H / 2);
    plane.renderOrder = i > 0 ? 0 : -1;
    scene.add(plane);
  });

  // 2) Route art minus its flat-green lawn
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(snapshot, 0, 0);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  // Lawn mask at quarter resolution (ground cover only grows on lawn, never on sand, rock or plazas)
  const MW = Math.ceil(W / 4);
  const MH = Math.ceil(H / 4);
  const mask = new Uint8Array(MW * MH);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (g > r + 22 && g > b + 12) {
      d[i + 3] = 0; // green-dominant = lawn / grass art
      const px = (i >> 2) % W;
      const py = ((i >> 2) / W) | 0;
      mask[(py >> 2) * MW + (px >> 2)] = 1;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const p of route.ponds || []) {
    ctx.beginPath();
    ctx.roundRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, 12);
    ctx.fill();
  }
  ctx.restore();

  // 3) Natural dirt on trails, with ragged grassy edges
  const dirt = ctx.createPattern(dirtTile(), 'repeat')!;
  const rr = rng(5);
  for (const p of route.path) {
    if (!isDirt(route, p)) continue;
    ctx.save();
    ctx.fillStyle = dirt;
    ctx.beginPath();
    ctx.roundRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6, 10);
    ctx.fill();
    // worn darker wheel/foot tracks along the long axis
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#5c4027';
    if (p.w >= p.h) {
      ctx.fillRect(p.x, p.y + p.h * 0.3, p.w, p.h * 0.08);
      ctx.fillRect(p.x, p.y + p.h * 0.62, p.w, p.h * 0.08);
    } else {
      ctx.fillRect(p.x + p.w * 0.3, p.y, p.w * 0.08, p.h);
      ctx.fillRect(p.x + p.w * 0.62, p.y, p.w * 0.08, p.h);
    }
    ctx.globalAlpha = 1;
    // ragged edges: bite out irregular notches so the grass below shows through
    ctx.globalCompositeOperation = 'destination-out';
    const bite = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 2 + rr() * 6, 0, Math.PI * 2);
      ctx.fill();
    };
    for (let x = p.x; x < p.x + p.w; x += 5) {
      bite(x + rr() * 4, p.y - 3 + rr() * 5);
      bite(x + rr() * 4, p.y + p.h + 3 - rr() * 5);
    }
    for (let y = p.y; y < p.y + p.h; y += 5) {
      bite(p.x - 3 + rr() * 5, y + rr() * 4);
      bite(p.x + p.w + 3 - rr() * 5, y + rr() * 4);
    }
    ctx.restore();
  }

  const oTex = new THREE.CanvasTexture(c);
  oTex.colorSpace = THREE.SRGBColorSpace;
  oTex.anisotropy = anisotropy;
  const overlay = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshLambertMaterial({ map: oTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  overlay.rotation.x = -Math.PI / 2;
  overlay.position.set(W / 2, 0.15, H / 2);
  overlay.renderOrder = 1;
  scene.add(overlay);
  return {
    isLawn(x, y) {
      const mx = Math.floor(x / 4);
      const my = Math.floor(y / 4);
      return mx >= 0 && my >= 0 && mx < MW && my < MH && mask[my * MW + mx] === 1;
    },
  };
}

/** Wooden plank texture (piers, docks, bridges). */
export function plankTexture(): THREE.CanvasTexture {
  const plankCanvas = tile(128, (_wrap, ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#8b5a2b' : '#7a4c22';
      ctx.fillRect(0, i * 16, 128, 15);
      ctx.fillStyle = 'rgba(40, 22, 8, 0.6)';
      ctx.fillRect(0, i * 16 + 15, 128, 1);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.12)';
      ctx.fillRect(0, i * 16, 128, 2);
    }
  });
  const plank = new THREE.CanvasTexture(plankCanvas);
  plank.colorSpace = THREE.SRGBColorSpace;
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping;
  return plank;
}

interface WaterLook {
  color: number;
  emissive: number;
  opacity: number;
  y: number;
  ripple: number;
  foam: boolean;
}

const WATER_LOOK: Record<'pond' | 'sea' | 'lake' | 'river' | 'chasm' | 'shallows', WaterLook> = {
  pond: { color: 0x1f5f86, emissive: 0x0a2a3d, opacity: 0.9, y: 0.6, ripple: 0.45, foam: true },
  lake: { color: 0x1f5f86, emissive: 0x0a2a3d, opacity: 0.9, y: 0.6, ripple: 0.45, foam: true },
  sea: { color: 0x17608f, emissive: 0x08304a, opacity: 0.94, y: 0.5, ripple: 0.6, foam: true },
  river: { color: 0x2a6f95, emissive: 0x0c3044, opacity: 0.9, y: 0.6, ripple: 0.5, foam: true },
  shallows: { color: 0x48b5c4, emissive: 0x0c3a40, opacity: 0.5, y: 0.7, ripple: 0.3, foam: false },
  chasm: { color: 0x05070a, emissive: 0x000000, opacity: 1, y: 0.4, ripple: 0, foam: false },
};

/**
 * Animated water for ponds and every water body (sea, lakes, rivers, shallows,
 * chasms). Seas that touch the map edge run on to the horizon; locations whose
 * environment is ringed by sea get an open sea past their southern shore.
 * Returns a per-frame updater.
 */
export function buildWater(scene: THREE.Scene, route: RouteDefinition, env?: LocationEnv): (t: number) => void {
  const ponds = route.ponds || [];
  const waters = route.waters || [];
  const W = route.worldWidth;
  const H = route.worldHeight;
  const EXT = 1600;
  const seaRing = env?.ring === 'sea' && !waters.some(w => w.kind === 'sea');
  if (!ponds.length && !waters.length && !seaRing) return () => {};

  const nTex = new THREE.CanvasTexture(waterNormalTile());
  nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping;
  const mats: THREE.MeshPhongMaterial[] = [];
  const foams: THREE.MeshBasicMaterial[] = [];
  const flows: { tex: THREE.Texture; speed: number }[] = [];
  const plank = plankTexture();

  const body = (x: number, y: number, w: number, h: number, kind: keyof typeof WATER_LOOK, flow = 0) => {
    const look = WATER_LOOK[kind];
    let mat: THREE.Material;
    if (kind === 'chasm') {
      mat = new THREE.MeshBasicMaterial({ color: look.color });
    } else {
      const tex = nTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(w / 110, h / 110);
      const phong = new THREE.MeshPhongMaterial({
        color: look.color,
        emissive: look.emissive,
        specular: 0xcfeeff,
        shininess: 70,
        normalMap: tex,
        normalScale: new THREE.Vector2(look.ripple, look.ripple),
        transparent: look.opacity < 1,
        opacity: look.opacity,
        depthWrite: look.opacity >= 0.9,
      });
      mats.push(phong);
      if (flow) flows.push({ tex, speed: flow });
      mat = phong;
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x + w / 2, look.y, y + h / 2);
    scene.add(m);
    return look;
  };
  const foamRim = (x: number, y: number, w: number, h: number, sides: [boolean, boolean, boolean, boolean] = [true, true, true, true]) => {
    const foam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
    foams.push(foam);
    const rims: [number, number, number, number][] = [
      [w, 3, x + w / 2, y + 2],
      [w, 3, x + w / 2, y + h - 2],
      [3, h, x + 2, y + h / 2],
      [3, h, x + w - 2, y + h / 2],
    ];
    rims.forEach((r, i) => {
      if (!sides[i]) return;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r[0], r[1]), foam);
      m.rotation.x = -Math.PI / 2;
      m.position.set(r[2], 0.75, r[3]);
      scene.add(m);
    });
  };

  // Ponds (Route 1 style) with their 3D pier
  for (const p of ponds) {
    body(p.x, p.y, p.w - 4, p.h - 4, 'pond');
    foamRim(p.x, p.y, p.w, p.h);
    if (p.pier) {
      const pr = p.pier;
      const ptex = plank.clone();
      ptex.needsUpdate = true;
      ptex.repeat.set(pr.w / 48, pr.h / 48);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(pr.w, 2.2, pr.h), new THREE.MeshLambertMaterial({ map: ptex }));
      deck.position.set(pr.x + pr.w / 2, 1.3, pr.y + pr.h / 2);
      scene.add(deck);
      const postMat = new THREE.MeshLambertMaterial({ color: 0x4a2c12 });
      for (const [x, z] of [
        [pr.x + 4, pr.y + pr.h - 4],
        [pr.x + pr.w - 4, pr.y + pr.h - 4],
        [pr.x + 4, pr.y + pr.h * 0.45],
        [pr.x + pr.w - 4, pr.y + pr.h * 0.45],
      ]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 10, 8), postMat);
        post.position.set(x, 3, z);
        scene.add(post);
      }
    }
  }

  // Seas, lakes, rivers, shallows and chasms; seas touching an edge reach the horizon
  for (const w of waters) {
    let { x, y, w: ww, h: hh } = w;
    if (w.kind === 'sea') {
      if (x <= 0) { ww += EXT + x; x = -EXT; }
      if (y <= 0) { hh += EXT + y; y = -EXT; }
      if (x + ww >= W) ww = W + EXT - x;
      if (y + hh >= H) hh = H + EXT - y;
    }
    const flow = w.kind === 'river' ? 0.05 : 0;
    const look = body(x, y, ww, hh, w.kind, flow);
    if (w.kind === 'chasm') {
      // Dark drop with a rocky lip
      const lip = new THREE.MeshLambertMaterial({ color: 0x4b4238 });
      for (const [a, b, c, d] of [[w.w, 4, w.x + w.w / 2, w.y], [w.w, 4, w.x + w.w / 2, w.y + w.h]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(a, 3, b), lip);
        m.position.set(c, 1.5, d);
        scene.add(m);
      }
    } else if (look.foam) {
      // Foam only along edges that meet land
      foamRim(w.x, w.y, w.w, w.h, [w.y > 0, w.y + w.h < H, w.x > 0, w.x + w.w < W]);
    }
  }

  // Open sea beyond the southern shore (sea-ringed locations without their own sea)
  if (seaRing) {
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(W + EXT * 2, 70), new THREE.MeshLambertMaterial({ color: 0xd9c48f }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(W / 2, 0.1, H + 10);
    scene.add(sand);
    body(-EXT, H + 40, W + EXT * 2, EXT, 'sea');
    foamRim(-EXT, H + 40, W + EXT * 2, EXT, [true, false, false, false]);
  }

  // Only clones of these were used; the originals were never uploaded
  nTex.dispose();
  plank.dispose();
  return (t: number) => {
    for (const m of mats) {
      const n = m.normalMap!;
      n.offset.set(t * 0.014 + Math.sin(t * 0.3) * 0.02, t * 0.009 + Math.cos(t * 0.23) * 0.02);
      m.normalScale.setScalar(0.5 + Math.sin(t * 0.7) * 0.08);
    }
    for (const f of flows) f.tex.offset.x = t * f.speed;
    for (const f of foams) f.opacity = 0.28 + Math.sin(t * 1.6) * 0.1;
  };
}

/** True when (x, y) lies on any water body (pond, sea, lake, river, chasm). */
export function isOnWater(route: RouteDefinition, x: number, y: number, margin = 0): boolean {
  const inR = (r: { x: number; y: number; w: number; h: number }) => x > r.x - margin && x < r.x + r.w + margin && y > r.y - margin && y < r.y + r.h + margin;
  return (route.ponds || []).some(inR) || (route.waters || []).some(w => w.kind !== 'shallows' && inR(w));
}

/**
 * Extra trees: `inner` fills open lawn far from paths and points of interest
 * (they collide in the 3D view); `ring` lines the world beyond the edges.
 * Tree types come from each zone's filler bands (see LocationEnvironment).
 */
export function planFillerTrees(
  route: RouteDefinition,
  existing: RouteTree[],
  canPlant: (x: number, y: number) => boolean,
  env: LocationEnv
): { inner: RouteTree[]; ring: RouteTree[] } {
  const W = route.worldWidth;
  const H = route.worldHeight;
  const inner: RouteTree[] = [];
  const ring: RouteTree[] = [];
  const all = [...existing];
  const farFromTrees = (x: number, y: number, d: number) => all.every(t => Math.hypot(t.x - x, t.y - y) >= d);
  /** Cumulative bands over the roll; rolls past the last band take the last entry. */
  const pick = (x: number, h: number): Partial<RouteTree> | null => {
    const bands = zoneAt(env, Math.max(0, Math.min(W - 1, x))).filler;
    if (!bands.length) return null;
    let acc = 0;
    for (const [type, colorVariant, w] of bands) {
      acc += w;
      if (h < acc) return { type, colorVariant };
    }
    const [type, colorVariant] = bands[bands.length - 1];
    return { type, colorVariant };
  };

  if (!env.underground) {
    for (let y = 90; y < H - 50; ) {
      let rowStep = 68;
      for (let x = 40; x < W - 40; ) {
        const z = zoneAt(env, x);
        const STEP = z.fillSpacing || 68;
        rowStep = STEP;
        const h = hash(x, y);
        const tx = x + (h - 0.5) * STEP * 0.7;
        const ty = y + (hash(y, x) - 0.5) * STEP * 0.7;
        x += STEP;
        const total = z.filler.reduce((s, f) => s + f[2], 0);
        if (h > total) continue; // keep some meadows open
        if (!canPlant(tx, ty) || !farFromTrees(tx, ty, Math.min(62, STEP - 6))) continue;
        const kind = pick(tx, h);
        if (!kind) continue;
        const t = { x: tx, y: ty, scale: 0.9 + h * 0.4, ...kind } as RouteTree;
        inner.push(t);
        all.push(t);
      }
      y += rowStep;
    }
  }

  if (env.ring === 'none') return { inner, ring };
  // Ring beyond the north/south edges and the western start (never out on open water)
  const addRing = (x: number, y: number) => {
    const h = hash(x * 1.3, y * 0.7);
    const px = x + (h - 0.5) * 30;
    const py = y + (hash(y, x) - 0.5) * 24;
    if (isOnWater(route, px, py, 10)) return;
    if (env.ring === 'sea' && py > H) return; // open sea to the south
    const kind = pick(x, h) || { type: 'conifer', colorVariant: 'standard' };
    ring.push({ x: px, y: py, scale: 1 + h * 0.45, ...kind } as RouteTree);
  };
  for (let x = -200; x < W + 200; x += 46) {
    for (const y of [-6, -56, -110]) addRing(x, y);
    for (const y of [H + 20, H + 70, H + 124]) addRing(x, y);
  }
  for (let y = 0; y < H; y += 46) for (const x of [-30, -80, -130]) addRing(x, y);
  return { inner, ring };
}
