/**
 * Characters3D.ts
 * Animated 3D people for the 3D chase view, from Kenney's CC0 "Mini Characters"
 * (www.kenney.nl) in public/models/kenney/characters/. Each model is rigged
 * (root / torso / arms / legs / head) with idle, walk and sprint animations.
 *
 * The trainer's chosen outfit colours are applied by repainting the palette
 * cells their shirt and trousers sample, in a private copy of the shared
 * palette texture (the shading gradient inside each cell is preserved).
 * Only the models actually used are downloaded.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env.BASE_URL}models/kenney/characters/`;
/** Palette layout of the shared colormap: 16 columns x 4 rows of colour cells. */
const COLS = 16;
const ROWS = 4;

/** Base trainer id -> closest-looking model. */
const TRAINER_MODELS: Record<string, string> = {
  male_red: 'character-male-c',
  male_ethan: 'character-male-f',
  male_brendan: 'character-male-a',
  male_lucas: 'character-male-e',
  female_leaf: 'character-female-f',
  female_lyra: 'character-female-b',
  female_may: 'character-female-c',
  female_dawn: 'character-female-e',
};
const NPC_POOL = ['character-male-b', 'character-male-d', 'character-male-g', 'character-female-a', 'character-female-d', 'character-female-b', 'character-male-f'];

export function modelForTrainer(id: string | undefined): string {
  return TRAINER_MODELS[id || ''] || TRAINER_MODELS.male_red;
}

export function modelForNpc(id: string, name: string): string {
  const key = (id + ' ' + name).toLowerCase();
  if (/hiker|geologist|miner|worker|engineer/.test(key)) return 'character-worker';
  if (/officer|jenny/.test(key)) return 'character-female-d';
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return NPC_POOL[h % NPC_POOL.length];
}

type Source = { scene: THREE.Group; clips: THREE.AnimationClip[] };
const loader = new GLTFLoader();
const sources = new Map<string, Promise<Source>>();

function load(name: string): Promise<Source> {
  let p = sources.get(name);
  if (!p) {
    p = loader.loadAsync(BASE + name + '.glb').then(g => {
      g.scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const std = m.material as THREE.MeshStandardMaterial;
        // Matte shading to match the rest of the scene
        m.material = new THREE.MeshLambertMaterial({ map: std.map, color: std.color });
      });
      return { scene: g.scene, clips: g.animations };
    });
    sources.set(name, p);
  }
  return p;
}

export interface Character3D {
  object: THREE.Object3D;
  setAction(name: 'idle' | 'walk' | 'sprint'): void;
  update(dt: number): void;
}

/** Cells (col,row) most sampled by vertices skinned mostly to bones matching `bone`. */
function dominantCell(mesh: THREE.SkinnedMesh, bone: RegExp): [number, number] | null {
  const g = mesh.geometry;
  const uv = g.attributes.uv;
  const joints = g.attributes.skinIndex;
  const weights = g.attributes.skinWeight;
  if (!uv || !joints || !weights) return null;
  const counts = new Map<string, number>();
  for (let i = 0; i < uv.count; i++) {
    let best = 0;
    let bw = -1;
    for (let k = 0; k < 4; k++) {
      const w = weights.getComponent(i, k);
      if (w > bw) {
        bw = w;
        best = joints.getComponent(i, k);
      }
    }
    const name = mesh.skeleton.bones[best]?.name || '';
    if (!bone.test(name)) continue;
    const col = Math.min(COLS - 1, Math.floor(uv.getX(i) * COLS));
    const row = Math.min(ROWS - 1, Math.floor(uv.getY(i) * ROWS));
    const key = col + ',' + row;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let top: string | null = null;
  let n = 0;
  for (const [k, v] of counts) if (v > n) [top, n] = [k, v];
  return top ? (top.split(',').map(Number) as [number, number]) : null;
}

/** Copy of the palette with the given cells repainted (keeps each cell's light/dark gradient). */
function recolorPalette(src: THREE.Texture, cells: { cell: [number, number]; color: string }[]): THREE.Texture {
  const img = src.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const cw = c.width / COLS;
  const ch = c.height / ROWS;
  const done = new Set<string>();
  for (const { cell, color } of cells) {
    const key = cell.join(',');
    if (done.has(key)) continue; // shirt and trousers share a cell: the shirt colour wins
    done.add(key);
    const target = new THREE.Color(color);
    const x0 = Math.round(cell[0] * cw);
    const y0 = Math.round(cell[1] * ch);
    const data = ctx.getImageData(x0, y0, Math.round(cw), Math.round(ch));
    const d = data.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const mean = sum / (d.length / 4) || 1;
    for (let i = 0; i < d.length; i += 4) {
      const k = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / mean;
      d[i] = Math.min(255, target.r * 255 * k);
      d[i + 1] = Math.min(255, target.g * 255 * k);
      d[i + 2] = Math.min(255, target.b * 255 * k);
    }
    ctx.putImageData(data, x0, y0);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = src.colorSpace;
  t.flipY = src.flipY;
  t.magFilter = src.magFilter;
  t.minFilter = src.minFilter;
  return t;
}

/**
 * Create an animated character standing `height` world units tall, facing +Z
 * at rotation 0. Optional outfit colours recolour the shirt and trousers.
 */
export async function createCharacter(name: string, height: number, outfit?: { top: string; bottom: string }): Promise<Character3D> {
  const src = await load(name);
  const object = SkeletonUtils.clone(src.scene);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const s = height / Math.max(0.001, box.max.y - box.min.y);
  object.scale.setScalar(s);
  object.position.y = -box.min.y * s;

  if (outfit) {
    let body: THREE.SkinnedMesh | null = null;
    object.traverse(o => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh && /body/i.test(o.name)) body = o as THREE.SkinnedMesh;
    });
    const b = body as THREE.SkinnedMesh | null;
    const mat = b?.material as THREE.MeshLambertMaterial | undefined;
    if (b && mat?.map) {
      const shirt = dominantCell(b, /torso/i);
      const pants = dominantCell(b, /leg/i);
      const cells = [shirt && { cell: shirt, color: outfit.top }, pants && { cell: pants, color: outfit.bottom }].filter(Boolean) as { cell: [number, number]; color: string }[];
      if (cells.length) {
        const map = recolorPalette(mat.map, cells);
        object.traverse(o => {
          const m = o as THREE.Mesh;
          if (m.isMesh && (m.material as THREE.MeshLambertMaterial).map === mat.map) {
            m.material = (m.material as THREE.MeshLambertMaterial).clone();
            (m.material as THREE.MeshLambertMaterial).map = map;
          }
        });
      }
    }
  }

  // Wrap so callers can rotate/position freely without touching the model's own offset
  const root = new THREE.Group();
  root.add(object);
  const mixer = new THREE.AnimationMixer(object);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const clip of src.clips) actions.set(clip.name, mixer.clipAction(clip));
  let current: THREE.AnimationAction | null = null;
  const setAction = (n: string) => {
    const next = actions.get(n) || actions.get('idle') || null;
    if (!next || next === current) return;
    next.reset().play();
    if (current) current.crossFadeTo(next, 0.18, false);
    current = next;
  };
  setAction('idle');
  // Desynchronise idle loops between characters
  mixer.update(Math.random() * 2);
  return { object: root, setAction, update: dt => mixer.update(dt) };
}
