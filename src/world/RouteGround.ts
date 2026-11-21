/**
 * RouteGround.ts
 * Ground, paths, water and forest fill for the 3D chase view.
 *
 *  - Ground: a tiled, high-detail grass texture everywhere, with the route's own
 *    2D ground art laid on top *except* its flat lawn (paths, plazas, shores and
 *    ledges keep their art; lawn is replaced by the grass). Dirt trails are
 *    re-textured with natural dirt and ragged, grassy edges.
 *  - Water: animated ponds (scrolling ripple normals, sun glints, soft foam
 *    edges) with a 3D wooden pier.
 *  - Forest fill: extra trees in open lawn far from paths and points of interest
 *    (these collide in the 3D view), plus a dense ring of forest beyond the
 *    walkable edges so the world never ends in empty fields.
 * All textures are generated procedurally (no extra downloads).
 */

import * as THREE from 'three';
import { RouteDefinition, RoutePath, RouteTree } from '../systems/RouteExplorationEngine';

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

/** Lush lawn: layered greens, thousands of short blade strokes, a few flowers. */
function grassTile(): HTMLCanvasElement {
  const r = rng(77);
  return tile(512, (wrap, ctx) => {
    ctx.fillStyle = '#4f8f36';
    ctx.fillRect(0, 0, 512, 512);
    // broad colour variation
    for (let i = 0; i < 90; i++) {
      const x = r() * 512;
      const y = r() * 512;
      const rad = 30 + r() * 70;
      const col = r() < 0.5 ? 'rgba(70, 130, 45, 0.35)' : 'rgba(110, 160, 60, 0.28)';
      wrap(x, y, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      });
    }
    // blades
    const blades = ['#3f7a2c', '#5a9c3c', '#6bb046', '#467f31', '#7cbf52', '#356b25'];
    for (let i = 0; i < 9000; i++) {
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
      ctx.fillStyle = ['#f8fafc', '#fde047', '#f9a8d4'][Math.floor(r() * 3)];
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

/** Grass base + route art overlay (lawn removed, dirt trails re-textured). */
export function buildGround(scene: THREE.Scene, route: RouteDefinition, snapshot: HTMLCanvasElement, anisotropy: number): void {
  const W = route.worldWidth;
  const H = route.worldHeight;

  // 1) Tiled lush grass across the world and well beyond it
  const gTex = new THREE.CanvasTexture(grassTile());
  gTex.colorSpace = THREE.SRGBColorSpace;
  gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping;
  gTex.anisotropy = anisotropy;
  const EXT = 1600;
  gTex.repeat.set((W + EXT * 2) / 110, (H + EXT * 2) / 110);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(W + EXT * 2, H + EXT * 2), new THREE.MeshLambertMaterial({ map: gTex }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(W / 2, 0, H / 2);
  scene.add(grass);

  // 2) Route art minus its flat-green lawn
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(snapshot, 0, 0);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (g > r + 22 && g > b + 12) d[i + 3] = 0; // green-dominant = lawn / grass art
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
}

/** Animated ponds with a 3D pier. Returns a per-frame updater. */
export function buildWater(scene: THREE.Scene, route: RouteDefinition): (t: number) => void {
  const ponds = route.ponds || [];
  if (!ponds.length) return () => {};
  const nTex = new THREE.CanvasTexture(waterNormalTile());
  nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping;
  const mats: THREE.MeshPhongMaterial[] = [];
  const foams: THREE.MeshBasicMaterial[] = [];

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

  for (const p of ponds) {
    const tex = nTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(p.w / 110, p.h / 110);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1f5f86,
      emissive: 0x0a2a3d,
      specular: 0xcfeeff,
      shininess: 70,
      normalMap: tex,
      normalScale: new THREE.Vector2(0.45, 0.45),
      transparent: true,
      opacity: 0.9,
    });
    mats.push(mat);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(p.w - 4, p.h - 4), mat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(p.x + p.w / 2, 0.6, p.y + p.h / 2);
    scene.add(water);

    // soft foam rim
    const foam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
    foams.push(foam);
    for (const [w, h, x, z] of [
      [p.w, 3, p.x + p.w / 2, p.y + 2],
      [p.w, 3, p.x + p.w / 2, p.y + p.h - 2],
      [3, p.h, p.x + 2, p.y + p.h / 2],
      [3, p.h, p.x + p.w - 2, p.y + p.h / 2],
    ]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), foam);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.75, z);
      scene.add(m);
    }

    // 3D pier: plank deck on posts
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

  return (t: number) => {
    for (const m of mats) {
      const n = m.normalMap!;
      n.offset.set(t * 0.014 + Math.sin(t * 0.3) * 0.02, t * 0.009 + Math.cos(t * 0.23) * 0.02);
      m.normalScale.setScalar(0.5 + Math.sin(t * 0.7) * 0.08);
    }
    for (const f of foams) f.opacity = 0.28 + Math.sin(t * 1.6) * 0.1;
  };
}

/**
 * Extra trees: `inner` fills open lawn far from paths and points of interest
 * (they collide in the 3D view); `ring` is a dense forest beyond the edges.
 */
export function planFillerTrees(
  route: RouteDefinition,
  existing: RouteTree[],
  canPlant: (x: number, y: number) => boolean
): { inner: RouteTree[]; ring: RouteTree[] } {
  const W = route.worldWidth;
  const H = route.worldHeight;
  const inner: RouteTree[] = [];
  const ring: RouteTree[] = [];
  const all = [...existing];
  const farFromTrees = (x: number, y: number, d: number) => all.every(t => Math.hypot(t.x - x, t.y - y) >= d);
  const pick = (x: number, h: number): Partial<RouteTree> => {
    // Keep each section's character: blossom terrace, rare sanctuary, plain meadow
    if (x >= 640 && x < 1340) return h < 0.6 ? { type: 'blossom', colorVariant: 'blossom' } : { type: 'broadleaf', colorVariant: 'standard' };
    if (x >= 1340 && x < 1920) return h < 0.4 ? { type: 'conifer', colorVariant: 'dark' } : { type: 'dense_forest', colorVariant: 'dark' };
    return h < 0.25 ? { type: 'conifer', colorVariant: 'standard' } : h < 0.55 ? { type: 'mature', colorVariant: 'standard' } : { type: 'broadleaf', colorVariant: 'standard' };
  };

  const STEP = 68;
  for (let y = 90; y < H - 50; y += STEP) {
    for (let x = 40; x < W - 40; x += STEP) {
      const h = hash(x, y);
      const tx = x + (h - 0.5) * STEP * 0.7;
      const ty = y + (hash(y, x) - 0.5) * STEP * 0.7;
      if (h > 0.7) continue; // keep some meadows open
      if (!canPlant(tx, ty) || !farFromTrees(tx, ty, 62)) continue;
      const t = { x: tx, y: ty, scale: 0.9 + h * 0.4, ...pick(tx, h) } as RouteTree;
      inner.push(t);
      all.push(t);
    }
  }

  // Forest ring beyond the north/south edges and the western start
  const addRing = (x: number, y: number) => {
    const h = hash(x * 1.3, y * 0.7);
    ring.push({ x: x + (h - 0.5) * 30, y: y + (hash(y, x) - 0.5) * 24, scale: 1 + h * 0.45, ...pick(x, h) } as RouteTree);
  };
  for (let x = -200; x < W + 200; x += 46) {
    for (const y of [-6, -56, -110]) addRing(x, y);
    for (const y of [H + 20, H + 70, H + 124]) addRing(x, y);
  }
  for (let y = 0; y < H; y += 46) for (const x of [-30, -80, -130]) addRing(x, y);
  return { inner, ring };
}
