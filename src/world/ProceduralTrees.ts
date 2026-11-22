/**
 * Procedural ornamental trees ("g:" asset keys), built from noise-displaced canopy clumps
 * with a painted leaf texture, ambient-occlusion vertex colours and a textured trunk.
 * Each tree is two meshes (bark + leaves) so it instances as cheaply as a downloaded model.
 *
 *   g:cypress   tall Italian cypress column
 *   g:oak       broad rounded shade tree with a forked trunk
 *   g:plane     tall avenue tree, high crown
 *   g:blossom   flowering cherry
 *   g:topiary   clipped ball on a stem
 *   g:cone      clipped cone topiary
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { barkTexture, leafTexture } from './ProceduralTextures';
import { addWindSway, markShared } from './EnvironmentAssets';

export const PROCEDURAL_TREES = ['g:cypress', 'g:oak', 'g:plane', 'g:blossom', 'g:topiary', 'g:cone'] as const;

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

/** Cheap smooth 3D noise from summed sines (deterministic, no tables). */
function noise3(x: number, y: number, z: number, s: number): number {
  return (
    Math.sin(x * 0.9 + s) * Math.cos(y * 1.1 + s * 1.3) * 0.5 +
    Math.sin(y * 1.7 + z * 1.3 + s * 0.7) * 0.3 +
    Math.sin(z * 2.3 + x * 1.9 + s * 2.1) * 0.2
  );
}

interface Clump { x: number; y: number; z: number; rx: number; ry: number; rz: number }

/** One leafy clump: displaced icosphere, normals smoothed, AO baked into vertex colours. */
function clump(c: Clump, seed: number, base: THREE.Color, top: THREE.Color, bumpy: number, treeTop: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, Math.max(c.rx, c.rz) > 12 ? 3 : 2);
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = noise3(v.x * 3, v.y * 3, v.z * 3, seed) * bumpy + noise3(v.x * 7, v.y * 7, v.z * 7, seed + 5) * bumpy * 0.35;
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, c.x + v.x * c.rx, c.y + v.y * c.ry, c.z + v.z * c.rz);
  }
  g.computeVertexNormals();
  // Spherical UVs (world-ish scale so leaf size is consistent between clumps)
  const uv = new Float32Array(pos.count * 2);
  const col = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) - c.x;
    const y = pos.getY(i) - c.y;
    const z = pos.getZ(i) - c.z;
    uv[i * 2] = (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * Math.max(2, (c.rx + c.rz) / 3);
    uv[i * 2 + 1] = (y / Math.max(1, c.ry)) * Math.max(1.5, c.ry / 3);
    // Light from above, occlusion toward the bottom and the tree's core
    const up = THREE.MathUtils.clamp((y / c.ry) * 0.5 + 0.5, 0, 1);
    const height = THREE.MathUtils.clamp(pos.getY(i) / treeTop, 0, 1);
    tmp.copy(base).lerp(top, up * 0.7 + height * 0.3);
    const ao = 0.62 + 0.38 * up;
    col[i * 3] = tmp.r * ao;
    col[i * 3 + 1] = tmp.g * ao;
    col[i * 3 + 2] = tmp.b * ao;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g.toNonIndexed();
}

function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number): THREE.BufferGeometry {
  const len = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true);
  g.translate(0, len / 2, 0);
  const dir = to.clone().sub(from).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  g.translate(from.x, from.y, from.z);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * Math.max(1, len / 12));
  return g.toNonIndexed();
}

const barkMat = (): THREE.MeshLambertMaterial => {
  const m = new THREE.MeshLambertMaterial({ map: barkTexture(), color: 0xffffff });
  m.name = 'bark';
  markShared(m);
  return m;
};

const leafMats = new Map<string, THREE.MeshLambertMaterial>();
function leafMat(kind: 'broad' | 'needle' | 'blossom'): THREE.MeshLambertMaterial {
  let m = leafMats.get(kind);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ map: leafTexture(kind), vertexColors: true, color: 0xffffff });
    m.name = 'leaves';
    addWindSway(m, kind === 'needle' ? 0.006 : 0.012);
    markShared(m);
    leafMats.set(kind, m);
  }
  return m;
}

let sharedBark: THREE.MeshLambertMaterial | null = null;

export function buildProceduralTree(key: string): { scene: THREE.Group; box: THREE.Box3 } {
  const kind = key.split('#')[0].slice(2);
  const r = rng(kind.length * 977 + kind.charCodeAt(0) * 131);
  const trunk: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  let foliage: 'broad' | 'needle' | 'blossom' = 'broad';
  const O = new THREE.Vector3();
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  if (kind === 'cypress') {
    foliage = 'needle';
    trunk.push(limb(O, V(0, 14, 0), 1.6, 1.2));
    const base = new THREE.Color('#2c4a26');
    const top = new THREE.Color('#5f8a43');
    const H = 78;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const y = 10 + t * (H - 20);
      const rad = 9.5 * Math.sin(Math.PI * (0.18 + t * 0.78)) + 1.5;
      leaves.push(clump({ x: (r() - 0.5) * 2, y, z: (r() - 0.5) * 2, rx: rad, ry: 11, rz: rad }, 11 + i, base, top, 0.18, H));
    }
    leaves.push(clump({ x: 0, y: H - 6, z: 0, rx: 3, ry: 8, rz: 3 }, 99, base, top, 0.15, H));
  } else if (kind === 'oak' || kind === 'blossom') {
    foliage = kind === 'blossom' ? 'blossom' : 'broad';
    const H = kind === 'blossom' ? 40 : 52;
    trunk.push(limb(O, V(0, H * 0.42, 0), 3.4, 2.4));
    const forks = [V(-9, H * 0.68, 3), V(8, H * 0.72, -4), V(1, H * 0.78, 9)];
    for (const f of forks) trunk.push(limb(V(0, H * 0.4, 0), f, 2.2, 1.1));
    const base = kind === 'blossom' ? new THREE.Color('#c9849c') : new THREE.Color('#2f5a2a');
    const top = kind === 'blossom' ? new THREE.Color('#ffe1ec') : new THREE.Color('#86b25a');
    const spread = kind === 'blossom' ? 20 : 22;
    leaves.push(clump({ x: 0, y: H * 0.78, z: 0, rx: spread * 0.8, ry: H * 0.26, rz: spread * 0.8 }, 3, base, top, 0.16, H));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.5;
      const d = spread * (0.55 + r() * 0.25);
      leaves.push(clump({ x: Math.cos(a) * d, y: H * (0.66 + r() * 0.2), z: Math.sin(a) * d, rx: 9 + r() * 4, ry: 8 + r() * 3, rz: 9 + r() * 4 }, 20 + i, base, top, 0.2, H));
    }
    leaves.push(clump({ x: 2, y: H * 0.95, z: -1, rx: 11, ry: 8, rz: 11 }, 40, base, top, 0.18, H));
  } else if (kind === 'plane') {
    const H = 72;
    trunk.push(limb(O, V(0, H * 0.55, 0), 3, 2));
    trunk.push(limb(V(0, H * 0.5, 0), V(-7, H * 0.75, 2), 1.8, 1));
    trunk.push(limb(V(0, H * 0.5, 0), V(6, H * 0.78, -3), 1.8, 1));
    const base = new THREE.Color('#355f2c');
    const top = new THREE.Color('#9ac065');
    leaves.push(clump({ x: 0, y: H * 0.78, z: 0, rx: 16, ry: 15, rz: 16 }, 5, base, top, 0.18, H));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r();
      leaves.push(clump({ x: Math.cos(a) * 12, y: H * (0.7 + r() * 0.22), z: Math.sin(a) * 12, rx: 8 + r() * 3, ry: 8 + r() * 3, rz: 8 + r() * 3 }, 50 + i, base, top, 0.2, H));
    }
  } else if (kind === 'topiary') {
    trunk.push(limb(O, V(0, 10, 0), 1.2, 1));
    const base = new THREE.Color('#2f5a2a');
    const top = new THREE.Color('#79a64e');
    leaves.push(clump({ x: 0, y: 17, z: 0, rx: 8.5, ry: 8.5, rz: 8.5 }, 7, base, top, 0.04, 26));
  } else {
    // cone topiary
    const base = new THREE.Color('#2a5226');
    const top = new THREE.Color('#6f9a48');
    trunk.push(limb(O, V(0, 4, 0), 1.2, 1));
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      leaves.push(clump({ x: 0, y: 6 + t * 22, z: 0, rx: 9 * (1 - t * 0.8), ry: 6, rz: 9 * (1 - t * 0.8) }, 70 + i, base, top, 0.03, 32));
    }
  }

  if (!sharedBark) sharedBark = barkMat();
  const scene = new THREE.Group();
  const tg = mergeGeometries(trunk.map(g => { g.deleteAttribute('normal'); g.computeVertexNormals(); return g; }), false)!;
  const lg = mergeGeometries(leaves, false)!;
  markShared(tg);
  markShared(lg);
  const tm = new THREE.Mesh(tg, sharedBark);
  const lm = new THREE.Mesh(lg, leafMat(foliage));
  tm.castShadow = lm.castShadow = true;
  scene.add(tm, lm);
  scene.updateMatrixWorld(true);
  return { scene, box: new THREE.Box3().setFromObject(scene) };
}
