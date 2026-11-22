/**
 * WorldFeatures3D.ts
 * 3D versions of the exploration features that the 2.5D renderer draws as
 * billboards: cave walls, bridges, waterfalls, portals (cave mouths, stairs,
 * forest paths, trails, docks), landmarks (lighthouse, shrine, ruins, old
 * tree, monument, viewpoint), glowing crystals, pushable boulders, barriers,
 * ground items, notice boards, wild / lost Pokémon, fishing ripples, pressure
 * plates and the route exit gates.
 *
 * Positions come straight from the route data, so the engine's collision and
 * interaction rules apply unchanged. Dynamic state (collected items, revealed
 * or locked portals, opened barriers, moved boulders, finished encounters) is
 * mirrored from the engine a few times per second.
 *
 * Geometry is procedural (no downloads) except where a Kenney / Quaternius
 * model is available from the shared asset cache.
 */

import * as THREE from 'three';
import type { RouteDefinition, RouteItem } from '../systems/RouteExplorationEngine';
import type { RoutePortal, WorldCondition, RouteNoticeBoard } from './WorldTypes';
import { isOnCaveFloor } from './FeatureRenderer';
import { LocationEnv } from './LocationEnvironment';
import { environmentAssets } from './EnvironmentAssets';
import { plankTexture } from './RouteGround';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** What the features need from the exploration engine. */
export interface FeatureWorld {
  visibleItems(): RouteItem[];
  portalState(p: RoutePortal): { revealed: boolean; locked: boolean };
  boulderPosition(id: string): { x: number; y: number } | undefined;
  getFlag(flag: string): boolean;
  isConditionMet(c?: WorldCondition): boolean;
  noticeBoardHasNew: ((nb: RouteNoticeBoard) => boolean) | null;
}

export interface FeatureInput {
  scene: THREE.Scene;
  route: RouteDefinition;
  env: LocationEnv;
  world: FeatureWorld;
  /** Pokémon artwork for overworld encounters (shared texture cache). */
  pokemonTexture(id: number, cb: (t: THREE.Texture) => void): void;
  /** Floating label factory (constant on-screen size). */
  label(text: string, x: number, z: number, y: number): THREE.Sprite;
}

export interface FeaturesHandle {
  /** Name tags created for portals / landmarks (sized by the caller with the NPC tags). */
  tags: THREE.Sprite[];
  /** True where the camera boom must not pass (cave rock, cliff faces). */
  cameraBlocked(x: number, z: number): boolean;
  /** Animate and mirror dynamic engine state. */
  update(t: number, dt: number, px: number, pz: number): void;
}

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const lambert = (color: number | string, o: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...o });

/** Mottled rock texture for cave walls / cliffs. */
function rockTexture(base: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    const x = hash(i, 1) * 128;
    const y = hash(i, 2) * 128;
    const r = 2 + hash(i, 3) * 9;
    g.fillStyle = hash(i, 4) < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)';
    g.beginPath();
    g.ellipse(x, y, r, r * 0.6, hash(i, 5) * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    let x = hash(i, 9) * 128;
    let y = hash(i, 10) * 128;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (hash(i * 7 + k, 11) - 0.5) * 30;
      y += hash(i * 3 + k, 12) * 20;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft radial glow sprite (additive). */
function glowSprite(color: string, size: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, 1);
  return s;
}

/** Place a cached model (loaded lazily) under `parent`, sized by height or footprint. */
function attachModel(parent: THREE.Object3D, key: string, target: number, fit: 'y' | 'xz' = 'y', onDone?: (o: THREE.Object3D) => void): void {
  environmentAssets
    .load(key)
    .then(m => {
      const o = m.scene.clone(true);
      const size = m.box.getSize(new THREE.Vector3());
      const s = target / Math.max(0.0001, fit === 'y' ? size.y : Math.max(size.x, size.z));
      o.scale.setScalar(s);
      o.position.y = -m.box.min.y * s;
      parent.add(o);
      onDone?.(o);
    })
    .catch(() => {});
}

/**
 * Bake every plain-coloured (untextured, opaque Lambert) mesh under `root` into one
 * vertex-coloured mesh: a prop built from many parts then costs a single draw call.
 * Textured / transparent / unlit parts are left as they are.
 */
function bakeParts(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts: THREE.BufferGeometry[] = [];
  const victims: THREE.Mesh[] = [];
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const mat = m.material as THREE.MeshLambertMaterial;
    if (!mat.isMeshLambertMaterial || mat.map || mat.transparent || mat.alphaMap) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.deleteAttribute('uv');
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const c = mat.color.clone().add(mat.emissive.clone().multiplyScalar(0.6));
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
    victims.push(m);
  });
  if (parts.length < 2) return;
  const merged = mergeGeometries(parts, false);
  parts.forEach(g => g.dispose());
  if (!merged) return;
  for (const v of victims) {
    v.parent?.remove(v);
    v.geometry.dispose();
    (v.material as THREE.Material).dispose();
  }
  root.add(new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true })));
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildCaveWalls(group: THREE.Group, route: RouteDefinition, underwater: boolean): void {
  const floors = route.floors!;
  const CELL = 24;
  const W = route.worldWidth;
  const H = route.worldHeight;
  const onBridge = (x: number, y: number) => (route.bridges || []).some(b => x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2);
  const open = (x: number, y: number) => isOnCaveFloor(floors, x, y) || onBridge(x, y);
  const cols = Math.ceil((W + 192) / CELL);
  const rows = Math.ceil((H + 192) / CELL);
  const walk = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) walk[r * cols + c] = open(-96 + c * CELL + CELL / 2, -96 + r * CELL + CELL / 2) ? 1 : 0;
  const cells: [number, number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (walk[r * cols + c]) continue;
      let near = 9;
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || !walk[rr * cols + cc]) continue;
          near = Math.min(near, Math.max(Math.abs(dr), Math.abs(dc)));
        }
      }
      if (near <= 3) cells.push([-96 + c * CELL + CELL / 2, -96 + r * CELL + CELL / 2, near]);
    }
  }
  const tex = rockTexture(underwater ? '#3f4f55' : '#4d433a');
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geo, mat, cells.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  cells.forEach(([x, z, near], i) => {
    const h = hash(x, z);
    const height = 60 + near * 34 + h * 46;
    const jitter = CELL * (1.15 + h * 0.5);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h * 0.6);
    m4.compose(new THREE.Vector3(x + (h - 0.5) * 6, -2, z + (hash(z, x) - 0.5) * 6), q, new THREE.Vector3(jitter, height, jitter));
    inst.setMatrixAt(i, m4);
    col.setHSL(underwater ? 0.53 : 0.08, 0.12, 0.26 + h * 0.14);
    inst.setColorAt(i, col);
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);

  // Stalagmites scattered just inside the walls
  const spikeGeo = new THREE.ConeGeometry(1, 1, 6);
  spikeGeo.translate(0, 0.5, 0);
  const spikes = cells.filter(([x, z, near]) => near === 1 && hash(z, x) < 0.18);
  const sm = new THREE.InstancedMesh(spikeGeo, lambert(underwater ? 0x56656a : 0x5f544a), spikes.length);
  spikes.forEach(([x, z], i) => {
    const h = hash(x * 3, z);
    m4.compose(new THREE.Vector3(x, 0, z), q.identity(), new THREE.Vector3(6 + h * 6, 24 + h * 30, 6 + h * 6));
    sm.setMatrixAt(i, m4);
  });
  sm.instanceMatrix.needsUpdate = true;
  group.add(sm);
}

function buildBridges(group: THREE.Group, route: RouteDefinition): void {
  if (!route.bridges?.length) return;
  const plank = plankTexture();
  for (const b of route.bridges || []) {
    const stone = b.style === 'stone';
    let deckMat: THREE.Material;
    if (stone) deckMat = lambert(0x9a9590);
    else {
      const t = plank.clone();
      t.needsUpdate = true;
      t.repeat.set(b.vertical ? b.w / 48 : b.h / 48, b.vertical ? b.h / 48 : b.w / 48);
      t.rotation = b.vertical ? 0 : Math.PI / 2;
      t.center.set(0.5, 0.5);
      deckMat = new THREE.MeshLambertMaterial({ map: t });
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(b.w, stone ? 4 : 2.4, b.h), deckMat);
    deck.position.set(b.x + b.w / 2, stone ? 2 : 1.6, b.y + b.h / 2);
    group.add(deck);
    // Railings along the long sides (piers keep posts only)
    const along = b.vertical ? b.h : b.w;
    const postMat = lambert(stone ? 0x7d7873 : 0x4a2c12);
    const n = Math.max(2, Math.round(along / 34));
    for (const side of [0, 1]) {
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x = b.vertical ? (side ? b.x + b.w - 3 : b.x + 3) : b.x + k * b.w;
        const z = b.vertical ? b.y + k * b.h : side ? b.y + b.h - 3 : b.y + 3;
        const post = new THREE.Mesh(stone ? new THREE.BoxGeometry(5, 10, 5) : new THREE.CylinderGeometry(1.6, 2, b.style === 'pier' ? 9 : 12, 6), postMat);
        post.position.set(x, b.style === 'pier' ? 2 : 6, z);
        group.add(post);
      }
      if (b.style === 'pier') continue;
      const railLen = along;
      const rail = new THREE.Mesh(
        b.style === 'rope' ? new THREE.CylinderGeometry(0.6, 0.6, railLen, 4) : new THREE.BoxGeometry(stone ? 4 : 1.6, stone ? 3 : 1.6, railLen),
        lambert(b.style === 'rope' ? 0xc8a46a : stone ? 0x8a8580 : 0x6b4423)
      );
      if (b.style === 'rope') rail.rotation.x = Math.PI / 2;
      if (!b.vertical) rail.rotation.y = Math.PI / 2;
      rail.position.set(b.vertical ? (side ? b.x + b.w - 3 : b.x + 3) : b.x + b.w / 2, 11, b.vertical ? b.y + b.h / 2 : side ? b.y + b.h - 3 : b.y + 3);
      group.add(rail);
    }
  }
  plank.dispose(); // only clones were used
}

function waterfallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(120, 190, 230, 0.85)';
  g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,255,255,${0.25 + hash(i, 3) * 0.5})`;
    g.fillRect(hash(i, 1) * 64, hash(i, 2) * 128, 1 + hash(i, 4) * 3, 10 + hash(i, 5) * 30);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function buildPortal(p: RoutePortal, underground: boolean): THREE.Group {
  const g = new THREE.Group();
  const x = p.x;
  const z = p.y - 6;
  g.position.set(x, 0, z);
  const rock = lambert(p.style === 'cracked_wall' ? 0x6b5d50 : 0x5d5348);
  switch (p.style) {
    case 'cave':
    case 'cave_exit':
    case 'cracked_wall': {
      // Rock arch around a dark (or daylit) mouth, set into a cliff face
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(150, 84, 30), new THREE.MeshLambertMaterial({ map: rockTexture('#5d5348') }));
      cliff.position.set(0, 42, -30);
      g.add(cliff);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(32, 11, 8, 14, Math.PI), rock);
      arch.position.set(0, 30, -14);
      g.add(arch);
      for (const sx of [-32, 32]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(22, 32, 22), rock);
        leg.position.set(sx, 16, -14);
        g.add(leg);
      }
      const mouth = new THREE.Mesh(
        new THREE.CircleGeometry(30, 18, 0, Math.PI),
        new THREE.MeshBasicMaterial({ color: p.style === 'cave_exit' && underground ? 0xfff6d8 : 0x050505 })
      );
      mouth.position.set(0, 30, -16);
      const lower = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), mouth.material);
      lower.position.set(0, 15, -16);
      g.add(mouth, lower);
      if (p.style === 'cave_exit' && underground) {
        const glow = glowSprite('rgba(255, 240, 200, 0.8)', 120);
        glow.position.set(0, 30, -10);
        g.add(glow);
      }
      break;
    }
    case 'stairs_down':
    case 'stairs_up': {
      const down = p.style === 'stairs_down';
      const rim = lambert(0x8a8378);
      for (let i = 0; i < 5; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(46, 4, 8), lambert(down ? 0x3a352f - i * 0x050505 : 0x7b746a));
        step.position.set(0, down ? -i * 3 : 2 + i * 4, -8 - i * 8);
        g.add(step);
      }
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(46, 40), new THREE.MeshBasicMaterial({ color: 0x030303 }));
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(0, down ? 0.4 : 22, -30);
      if (down) g.add(hole);
      for (const sx of [-27, 27]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(8, down ? 6 : 26, 46), rim);
        side.position.set(sx, down ? 3 : 13, -26);
        g.add(side);
      }
      break;
    }
    case 'forest_path': {
      const wood = lambert(0x5a3a1e);
      for (const sx of [-24, 24]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 44, 7), wood);
        post.position.set(sx, 22, 0);
        g.add(post);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(60, 5, 6), wood);
      beam.position.set(0, 44, 0);
      g.add(beam);
      const leaf = lambert(0x3f7f35);
      for (let i = 0; i < 7; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(7 + hash(i, x) * 5, 0), leaf);
        b.position.set(-30 + i * 10, 46 + hash(x, i) * 6, (hash(i, 3) - 0.5) * 8);
        g.add(b);
      }
      break;
    }
    case 'trail': {
      const wood = lambert(0x7a4f2a);
      const post = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), wood);
      post.position.set(-20, 17, 0);
      const board = new THREE.Mesh(new THREE.BoxGeometry(30, 9, 2), lambert(0xa8743f));
      board.position.set(-8, 28, 0);
      g.add(post, board);
      for (let i = 0; i < 4; i++) {
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(5 - i, 0), lambert(0x8d867b));
        st.position.set(20, 3 + i * 6, 0);
        g.add(st);
      }
      break;
    }
    case 'dock': {
      const t = plankTexture();
      t.repeat.set(1, 2);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(40, 2.4, 70), new THREE.MeshLambertMaterial({ map: t }));
      deck.position.set(0, 1.4, -20);
      g.add(deck);
      break;
    }
  }
  bakeParts(g);
  return g;
}

function buildLandmark(lm: { id?: string; style: string; x: number; y: number }, group: THREE.Group, animated: ((t: number, dt: number) => void)[]): void {
  const g = new THREE.Group();
  g.position.set(lm.x, 0, lm.y);
  group.add(g);
  const stone = lambert(0x9a958c);
  switch (lm.style) {
    case 'statue': {
      // Champion statue: stone pedestal with a gold plaque, then the sculpture itself
      const id = lm.id || '';
      if (/flame|horse/.test(id)) {
        attachModel(g, 'p:horse_statue', 74); // carries its own pedestal
        break;
      }
      const ped = new THREE.Mesh(new THREE.BoxGeometry(36, 22, 36), stone);
      ped.position.y = 11;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(42, 4, 42), lambert(0xd1d5db));
      cap.position.y = 24;
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 1), lambert(0xd4a017, { emissive: 0x2a1c00 }));
      plaque.position.set(0, 12, 18.5);
      g.add(ped, cap, plaque);
      const top = new THREE.Group();
      top.position.y = 26;
      g.add(top);
      attachModel(top, 'p:hero_statue', 48, 'y', o => {
        if (/partner/.test(id)) o.position.x -= 6;
      });
      if (/partner/.test(id)) {
        const pet = new THREE.Group();
        pet.position.set(12, 0, 6);
        top.add(pet);
        attachModel(pet, 'p:fox_statue', 22);
      }
      break;
    }
    case 'lighthouse': {
      for (let i = 0; i < 6; i++) {
        const r0 = 20 - i * 1.4;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r0 - 1.4, r0, 22, 16), lambert(i % 2 ? 0xdc2626 : 0xf8fafc));
        seg.position.y = 11 + i * 22;
        g.add(seg);
      }
      const gallery = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 3, 16), lambert(0x1f2937));
      gallery.position.y = 133;
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 14, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
      lamp.position.y = 142;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(12, 12, 12), lambert(0xb91c1c));
      cap.position.y = 155;
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(18, 220, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })
      );
      beam.rotation.z = Math.PI / 2;
      beam.position.x = 110;
      const pivot = new THREE.Group();
      pivot.position.y = 142;
      pivot.add(beam);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 6, 16), stone);
      base.position.y = 3;
      g.add(gallery, lamp, cap, pivot, base);
      animated.push(t => (pivot.rotation.y = t * 0.6));
      break;
    }
    case 'shrine': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(46, 6, 34), stone);
      base.position.y = 3;
      g.add(base);
      for (const sx of [-18, 18]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 40, 8), lambert(0xb4513a));
        post.position.set(sx, 26, -4);
        g.add(post);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(56, 5, 7), lambert(0x8a2f22));
      top.position.set(0, 47, -4);
      const top2 = new THREE.Mesh(new THREE.BoxGeometry(44, 3, 5), lambert(0xb4513a));
      top2.position.set(0, 40, -4);
      g.add(top, top2);
      const altar = new THREE.Group();
      altar.position.set(0, 6, -8);
      g.add(altar);
      attachModel(altar, 'k:statue_ring', 22);
      break;
    }
    case 'ruin': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hgt = 14 + hash(i, lm.x) * 44;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, hgt, 10), stone);
        col.position.set(Math.cos(a) * 40, hgt / 2, Math.sin(a) * 26);
        g.add(col);
      }
      for (let i = 0; i < 4; i++) {
        const blk = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 9), lambert(0x86827a));
        blk.position.set((hash(i, 2) - 0.5) * 60, 3.5, (hash(i, 5) - 0.5) * 40);
        blk.rotation.y = hash(i, 7) * 3;
        g.add(blk);
      }
      const head = new THREE.Group();
      head.position.set(0, 0, -10);
      g.add(head);
      attachModel(head, 'k:statue_head', 30);
      break;
    }
    case 'old_tree': {
      attachModel(g, 'CommonTree_4#dark', 190);
      for (let i = 0; i < 5; i++) {
        const root = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 26, 6), lambert(0x4e3420));
        const a = (i / 5) * Math.PI * 2;
        root.position.set(Math.cos(a) * 12, 2, Math.sin(a) * 12);
        root.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
        g.add(root);
      }
      break;
    }
    case 'monument': {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), stone);
      ped.position.y = 7;
      g.add(ped);
      const iron = lambert(0x374151);
      const shank = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), iron);
      shank.position.y = 31;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 1.4, 6, 12), iron);
      ring.position.y = 50;
      const fluke = new THREE.Mesh(new THREE.TorusGeometry(13, 2, 6, 14, Math.PI), iron);
      fluke.rotation.z = Math.PI;
      fluke.position.y = 24;
      g.add(shank, ring, fluke);
      break;
    }
    case 'viewpoint':
    default: {
      const t = plankTexture();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(50, 3, 30), new THREE.MeshLambertMaterial({ map: t }));
      deck.position.y = 1.5;
      g.add(deck);
      const wood = lambert(0x6b4423);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 2), wood);
      rail.position.set(0, 12, -14);
      g.add(rail);
      for (const sx of [-24, 0, 24]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(2.5, 12, 2.5), wood);
        p.position.set(sx, 6, -14);
        g.add(p);
      }
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 14, 8), lambert(0x334155));
      scope.rotation.x = -1.1;
      scope.position.set(10, 18, -6);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 6), lambert(0x1f2937));
      stand.position.set(10, 8, -4);
      g.add(scope, stand);
    }
  }
  bakeParts(g);
}

/** Crystal cluster: elongated hexagonal prisms with a glow. */
function crystalCluster(color: string, scale: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.65 });
  for (let i = 0; i < 5; i++) {
    const h = (18 + hash(i, scale * 10) * 22) * scale;
    const geo = new THREE.CylinderGeometry(0, 4.5 * scale, h, 6);
    geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, mat);
    const a = (i / 5) * Math.PI * 2;
    m.position.set(i ? Math.cos(a) * 6 * scale : 0, 0, i ? Math.sin(a) * 5 * scale : 0);
    m.rotation.set(i ? Math.sin(a) * 0.4 : 0, 0, i ? -Math.cos(a) * 0.4 : 0);
    g.add(m);
  }
  const glow = glowSprite(color, 70 * scale);
  glow.position.y = 16 * scale;
  g.add(glow);
  return g;
}

/** Overworld item: Poké Balls by colour, berries, coins, stones, key items. */
function itemMesh(it: RouteItem): THREE.Group {
  const g = new THREE.Group();
  const ball = (top: number, band = 0x111827) => {
    const r = 4.6;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(top));
    const lower = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lambert(0xf8fafc));
    const belt = new THREE.Mesh(new THREE.TorusGeometry(r, 0.7, 6, 20), lambert(band));
    belt.rotation.x = Math.PI / 2;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1, 10), lambert(0xffffff));
    btn.rotation.x = Math.PI / 2;
    btn.position.z = r;
    g.add(upper, lower, belt, btn);
  };
  switch (it.type) {
    case 'ball':
      ball(0xef4444);
      break;
    case 'greatBall':
      ball(0x2563eb);
      break;
    case 'ultraBall':
      ball(0x1f2937, 0xfacc15);
      break;
    case 'berry':
    case 'sitrus': {
      const c = it.type === 'sitrus' ? 0xfacc15 : 0x3b82f6;
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), lambert(c));
        b.position.set((i - 1) * 3.4, 0, (i % 2) * 1.5);
        g.add(b);
      }
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 5), lambert(0x16a34a));
      leaf.position.y = 3;
      g.add(leaf);
      break;
    }
    case 'money': {
      for (let i = 0; i < 4; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 14), lambert(0xfbbf24, { emissive: 0x3a2a00 }));
        coin.position.y = i * 1.2 - 2;
        g.add(coin);
      }
      break;
    }
    case 'stone':
    case 'revive': {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(4.2, 0), lambert(it.type === 'revive' ? 0xfde047 : 0x34d399, { emissive: 0x1a2a1a }));
      g.add(gem);
      break;
    }
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), lambert(0xa78bfa, { emissive: 0x2a1a4a }));
      g.add(box);
    }
  }
  bakeParts(g);
  const spark = glowSprite('rgba(255, 250, 220, 0.9)', 22);
  g.add(spark);
  return g;
}

function noticeBoard(): THREE.Group {
  const g = new THREE.Group();
  const wood = lambert(0x6b4423);
  for (const sx of [-14, 14]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(3, 30, 3), wood);
    p.position.set(sx, 15, 0);
    g.add(p);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(36, 20, 2.5), lambert(0x9a6a3a));
  board.position.set(0, 24, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(42, 3, 8), lambert(0x7c2d12));
  roof.position.set(0, 36, 0);
  g.add(board, roof);
  for (let i = 0; i < 3; i++) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), new THREE.MeshLambertMaterial({ color: i === 1 ? 0xfef3c7 : 0xf8fafc }));
    sheet.position.set(-11 + i * 11, 24, 1.4);
    sheet.rotation.z = (hash(i, 4) - 0.5) * 0.2;
    g.add(sheet);
  }
  bakeParts(g);
  return g;
}

/** "!" bubble above anything with something new to tell. */
function alertMarker(): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#facc15';
  g.beginPath();
  g.arc(32, 32, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1f2937';
  g.font = '900 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  s.scale.set(10, 10, 1);
  return s;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildFeatures(input: FeatureInput): FeaturesHandle {
  const { scene, route, env, world } = input;
  const group = new THREE.Group();
  group.name = 'world-features';
  scene.add(group);
  const tags: THREE.Sprite[] = [];
  const animated: ((t: number, dt: number) => void)[] = [];
  const syncers: (() => void)[] = [];

  if (route.floors) buildCaveWalls(group, route, route.theme === 'water');
  buildBridges(group, route);

  // Waterfalls: scrolling sheet of water down a rock face, foam at the pool
  for (const wf of route.waterfalls || []) {
    const tex = waterfallTexture();
    tex.repeat.set(wf.w / 64, wf.h / 128);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(wf.w, wf.h + 10), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false }));
    sheet.position.set(wf.x + wf.w / 2, (wf.h + 10) / 2, wf.y - 14);
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(wf.w + 60, wf.h + 16, 26), new THREE.MeshLambertMaterial({ map: rockTexture('#5f5a50') }));
    cliff.position.set(wf.x + wf.w / 2, (wf.h + 16) / 2, wf.y - 28);
    const foam = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2;
    foam.scale.set(wf.w * 0.62, 16, 1);
    foam.position.set(wf.x + wf.w / 2, 0.9, wf.y - 6);
    group.add(cliff, sheet, foam);
    animated.push(t => {
      tex.offset.y = t * 1.4;
      (foam.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 5) * 0.1;
    });
  }

  // Portals
  for (const p of route.portals || []) {
    const obj = buildPortal(p, !!env.underground);
    group.add(obj);
    const tag = input.label(p.label, p.x, p.y - 6, 70);
    group.add(tag);
    tags.push(tag);
    const rope = new THREE.Group();
    for (const sx of [-22, 22]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 16, 6), lambert(0x6b4423));
      post.position.set(sx, 8, 6);
      rope.add(post);
    }
    const line = new THREE.Mesh(new THREE.BoxGeometry(44, 1.2, 1.2), lambert(0xb91c1c));
    line.position.set(0, 13, 6);
    rope.add(line);
    rope.position.set(p.x, 0, p.y - 6);
    bakeParts(rope);
    group.add(rope);
    syncers.push(() => {
      const s = world.portalState(p);
      obj.visible = s.revealed;
      tag.userData.allowed = s.revealed;
      rope.visible = s.locked;
    });
  }

  // Landmarks
  for (const lm of route.landmarks || []) {
    buildLandmark(lm, group, animated);
    const tag = input.label(lm.title, lm.x, lm.y, lm.style === 'lighthouse' ? 170 : 64);
    group.add(tag);
    tags.push(tag);
  }

  // Crystals with a small pool of real point lights (nearest crystals get them)
  const crystals = (route.crystals || []).map(c => {
    const obj = crystalCluster(c.color, c.scale || 1);
    obj.position.set(c.x, 0, c.y);
    group.add(obj);
    return { c, obj };
  });
  const lights: THREE.PointLight[] = [];
  if (crystals.length) {
    for (let i = 0; i < Math.min(4, crystals.length); i++) {
      const l = new THREE.PointLight(0xffffff, 0, 200, 1.6);
      l.position.y = 24;
      group.add(l);
      lights.push(l);
    }
  }
  let lightTimer = 0;
  animated.push((t, dt) => {
    for (const { obj } of crystals) obj.children.forEach((m, i) => {
      if ((m as THREE.Sprite).isSprite) (m as THREE.Sprite).material.opacity = 0.65 + Math.sin(t * 2 + obj.position.x) * 0.25;
      else if (i === 0) ((m as THREE.Mesh).material as THREE.MeshLambertMaterial).emissiveIntensity = 0.55 + Math.sin(t * 1.5 + obj.position.z) * 0.2;
    });
    lightTimer -= dt;
  });

  // Pushable boulders (follow the engine's positions)
  for (const b of route.boulders || []) {
    const r = b.r || 18;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 1.05, 1), new THREE.MeshLambertMaterial({ map: rockTexture('#7a7266') }));
    m.scale.y = 0.85;
    group.add(m);
    animated.push(() => {
      const pos = world.boulderPosition(b.id) || b;
      m.position.set(pos.x, r * 0.8, pos.y);
    });
  }

  // Barriers (rockfall, crystal wall, vines) until their flag opens them
  for (const ba of route.barriers || []) {
    const g = new THREE.Group();
    const n = Math.max(3, Math.round(ba.w / 16));
    for (let i = 0; i < n; i++) {
      const h = hash(i, ba.x);
      const px = ba.x + ((i + 0.5) / n) * ba.w;
      const pz = ba.y + ba.h * (0.3 + h * 0.4);
      if (ba.style === 'rockfall') {
        const r = 9 + h * 8;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lambert(0x6f675c));
        m.position.set(px, r * 0.7, pz);
        m.rotation.set(h * 3, h * 5, 0);
        g.add(m);
      } else if (ba.style === 'crystal') {
        const c = crystalCluster('#a78bfa', 0.9 + h * 0.4);
        c.position.set(px, 0, pz);
        g.add(c);
      } else {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(10 + h * 6, 0), lambert(0x2f6b2a));
        m.position.set(px, 10 + h * 10, pz);
        g.add(m);
      }
    }
    group.add(g);
    syncers.push(() => (g.visible = !world.getFlag(ba.openFlag)));
  }

  // Ground items
  const itemObjs = new Map<string, THREE.Group>();
  for (const it of route.items) {
    const g = itemMesh(it);
    g.position.set(it.x, 6, it.y + 4);
    g.visible = false;
    group.add(g);
    itemObjs.set(it.id, g);
  }
  syncers.push(() => {
    const vis = new Set(world.visibleItems().map(i => i.id));
    for (const [id, g] of itemObjs) g.visible = vis.has(id);
  });
  animated.push(t => {
    for (const g of itemObjs.values()) {
      if (!g.visible) continue;
      g.position.y = 6 + Math.sin(t * 2.4 + g.position.x) * 1.4;
      g.rotation.y = t * 1.2;
    }
  });

  // Notice boards
  for (const nb of route.noticeBoards || []) {
    const g = noticeBoard();
    g.position.set(nb.x, 0, nb.y);
    group.add(g);
    const mark = alertMarker();
    mark.position.set(nb.x, 50, nb.y);
    group.add(mark);
    const tag = input.label(nb.title, nb.x, nb.y, 62);
    group.add(tag);
    tags.push(tag);
    syncers.push(() => (mark.visible = !!world.noticeBoardHasNew?.(nb)));
    animated.push(t => (mark.position.y = 50 + Math.sin(t * 3) * 1.5));
  }

  // Static encounters and lost Pokémon: artwork billboards with a marker
  const wild = [
    ...(route.staticEncounters || []).map(e => ({ id: e.id, x: e.x, y: e.y, speciesId: e.speciesId, size: 46, visible: () => !world.getFlag(e.doneFlag) && world.isConditionMet(e.requires) })),
    ...(route.lostPokemon || []).map(l => ({ id: l.id, x: l.x, y: l.y, speciesId: l.speciesId, size: 34, visible: () => !world.getFlag(l.foundFlag) && world.isConditionMet(l.requires) })),
  ];
  for (const w of wild) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ alphaTest: 0.35, transparent: true }));
    s.center.set(0.5, 0.1);
    s.scale.set(w.size, w.size, 1);
    s.position.set(w.x, 0, w.y + 8);
    input.pokemonTexture(w.speciesId, t => {
      s.material.map = t;
      s.material.needsUpdate = true;
    });
    const mark = alertMarker();
    mark.position.set(w.x, w.size + 6, w.y + 8);
    group.add(s, mark);
    syncers.push(() => (s.visible = mark.visible = w.visible()));
    animated.push(t => (s.position.y = Math.abs(Math.sin(t * 2.2 + w.x)) * 1.5));
  }

  // Fishing spots: expanding ripple rings
  for (const f of route.fishingSpots || []) {
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(f.x, 1, f.y);
      group.add(m);
      rings.push(m);
    }
    animated.push(t => rings.forEach((m, i) => {
      const k = (t * 0.5 + i / 3) % 1;
      m.scale.setScalar(3 + k * 16);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.55;
    }));
  }

  // Pressure plates
  for (const sw of route.switches || []) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 2, 18), lambert(0x6b7280));
    plate.position.set(sw.x, 1, sw.y);
    const rune = new THREE.Mesh(new THREE.RingGeometry(6, 9, 18), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
    rune.rotation.x = -Math.PI / 2;
    rune.position.set(sw.x, 2.2, sw.y);
    group.add(plate, rune);
    syncers.push(() => (rune.material as THREE.MeshBasicMaterial).color.set(world.getFlag(sw.flag) ? 0x4ade80 : 0x60a5fa));
  }

  // Route exits on the main chain: gate arches on the trail at both ends
  if (!route.isSpecialArea) {
    const gateAt = (x: number, text: string) => {
      const p = route.path.find(r => x >= r.x - 40 && x <= r.x + r.w + 40 && r.w >= r.h) || null;
      const cz = p ? p.y + p.h / 2 : route.startY;
      const half = Math.max(40, (p ? p.h : 80) / 2 + 18);
      const g = new THREE.Group();
      g.position.set(x, 0, cz);
      const wood = lambert(0x7c4a24);
      // Tall enough that the chase camera always passes underneath the beam
      for (const s of [-half, half]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(5, 96, 5), wood);
        post.position.set(0, 48, s);
        g.add(post);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(6, 6, half * 2 + 14), lambert(0x9a3412));
      beam.position.y = 96;
      g.add(beam);
      bakeParts(g);
      group.add(g);
      const tag = input.label(text, x, cz, 104);
      group.add(tag);
      tags.push(tag);
    };
    if (route.exitX > 0) gateAt(route.exitX + 6, '➔ ' + route.destinationLabel);
    if (route.id > 0) gateAt(30, '⬅ Previous route');
  }

  // Sync dynamic state a few times per second; lights follow the nearest crystals
  let syncTimer = 0;
  const sync = () => syncers.forEach(f => f());
  sync();

  const floors = route.floors;
  const onBridge = (x: number, y: number) => (route.bridges || []).some(b => x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2);
  return {
    tags,
    cameraBlocked(x, z) {
      if (floors) return !isOnCaveFloor(floors, x, z) && !onBridge(x, z);
      return false;
    },
    update(t, dt, px, pz) {
      for (const f of animated) f(t, dt);
      syncTimer -= dt;
      if (syncTimer <= 0) {
        syncTimer = 0.2;
        sync();
      }
      if (lights.length && lightTimer <= 0) {
        lightTimer = 0.3;
        const near = [...crystals].sort((a, b) => Math.hypot(a.c.x - px, a.c.y - pz) - Math.hypot(b.c.x - px, b.c.y - pz));
        lights.forEach((l, i) => {
          const c = near[i];
          if (!c) return (l.intensity = 0);
          l.position.set(c.c.x, 24, c.c.y);
          l.color.set(c.c.color);
          l.distance = (c.c.light || 100) * 1.8;
          l.intensity = env.underground ? 900 : 300;
        });
      }
    },
  };
}
