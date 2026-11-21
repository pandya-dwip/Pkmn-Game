/**
 * RouteModels.ts
 * Places real 3D models (see EnvironmentAssets.ts for sources, all CC0) for any
 * location, driven by its LocationEnvironment config:
 *  - the route's own trees, stones, fences, lamps, benches, signs and fountains,
 *    at their existing positions (so collision and gameplay are unchanged);
 *  - filler trees and the forest / cliff / skyline ring beyond the edges;
 *  - ground cover, encounter grass, pebbles, ledge embankments;
 *  - houses, Pokémon Centers, Marts, Gyms and gatehouses;
 *  - per-zone decorations (rock formations, market stalls, ruins, crops...).
 *
 * Repeated models use GPU instancing; foliage and grass sway in the wind via a
 * small vertex-shader hook. Instances far from (or right in front of) the
 * camera are culled per instance. If loading fails, the caller keeps the
 * existing billboard art.
 */

import * as THREE from 'three';
import { RouteDefinition, RouteBuilding, RouteTree, RouteStone, RouteFence, RoutePath } from '../systems/RouteExplorationEngine';
import { environmentAssets, Loaded } from './EnvironmentAssets';
import { LocationEnv, ZoneEnv, DecorRule, zoneAt, pickWeighted, modelKeysFor, WeightedModel } from './LocationEnvironment';

export { windTime, addWindSway } from './EnvironmentAssets';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Which way the commercial buildings' storefronts face in model space (radians about Y). */
const COMMERCIAL_ROTATION = Math.PI; // Kenney commercial storefronts face -Z
/** Which way the suburban houses' front doors face in model space (radians about Y). */
const HOUSE_ROTATION = 0;
/** poly.pizza buildings whose front door does not face +Z (checked by rendering each from four sides). */
const MODEL_ROTATION: Record<string, number> = { 'p:lab_b': Math.PI };
const rotationFor = (key: string) => MODEL_ROTATION[key] ?? (key.startsWith('c:') ? COMMERCIAL_ROTATION : HOUSE_ROTATION);

/** A sign board (4:1) rendered to a canvas: coloured panel, optional Poké Ball emblem, bold label. */
function signBoard(text: string, bg: string, ink: string, band: string, ball: boolean): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1f2937';
  g.beginPath();
  g.roundRect(0, 0, 512, 128, 18);
  g.fill();
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(6, 6, 500, 116, 14);
  g.fill();
  g.fillStyle = band;
  g.fillRect(6, 100, 500, 8);
  let x = 256;
  if (ball) {
    const cx = 70;
    const cy = 58;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx, cy, 38, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.arc(cx, cy, 38, Math.PI, 0);
    g.fill();
    g.fillStyle = '#111827';
    g.fillRect(cx - 38, cy - 4, 76, 8);
    g.beginPath();
    g.arc(cx, cy, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx, cy, 7, 0, Math.PI * 2);
    g.fill();
    x = 290;
  }
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 54;
  const label = text.toUpperCase();
  do {
    g.font = '900 ' + size + 'px system-ui, sans-serif';
    size -= 2;
  } while (g.measureText(label).width > (ball ? 380 : 470) && size > 18);
  g.fillText(label, x, 56);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex }));
}

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

interface Placement {
  x: number;
  z: number;
  rot: number;
  sx: number;
  sy: number;
  sz: number;
  /** Cull distance for this instance (small plants vanish sooner than trees). */
  far?: number;
}

interface InstancedSet {
  parts: { mesh: THREE.InstancedMesh; local: THREE.Matrix4 }[];
  inst: THREE.Matrix4[];
  items: Placement[];
}

/** A round obstacle added by the 3D view only (filler trees, rock formations, tents...). */
export interface Solid {
  x: number;
  z: number;
  r: number;
}

export interface RouteModelsHandle {
  /** Buildings now represented by a 3D model (their procedural box should be removed). */
  houses: Set<RouteBuilding>;
  /** Lamps, benches, signposts and fountains are now 3D models (drop their billboards). */
  propsReplaced: boolean;
  /** Decorations that block the trainer and the camera boom. */
  solids: Solid[];
  /** Cull instances too close to the lens or too far away. */
  updateOcclusion(cx: number, cz: number, clear: number): void;
}

export interface RouteModelInput {
  scene: THREE.Scene;
  route: RouteDefinition;
  env: LocationEnv;
  trees: RouteTree[];
  treeFootY: (t: RouteTree) => number;
  stones: RouteStone[];
  fences: RouteFence[];
  /** Decorations must not land on roads or blocked tiles. */
  isFreeGround: (x: number, y: number) => boolean;
  /** Open lawn well away from paths, grass, buildings and points of interest (safe for solid decor). */
  canPlant: (x: number, y: number) => boolean;
  /** The ground at this point is lawn (not sand, rock, snow, plaza...). */
  isLawn: (x: number, y: number) => boolean;
  /** Point is on a road / path. */
  isRoad: (x: number, y: number) => boolean;
  scale: { trees: number; props: number };
  /** Ground-cover density multiplier (lighter on phones). */
  groundCover?: number;
  /** Seas / rivers that boats and docks may use (route waters + scenic edge water). */
  waters?: { x: number; y: number; w: number; h: number; kind: string }[];
  /** Extra trees: `inner` fill open lawn, `ring` is the forest beyond the edges (drawn with lighter models). */
  extraTrees?: { inner: RouteTree[]; ring: RouteTree[] };
  /** Dirt trails get pebbles along their edges. */
  isDirtPath?: (p: RoutePath) => boolean;
  /** Text for a building's sign board (Pokémon Center, Mart, Gym). */
  signText?: (b: RouteBuilding) => string;
}

/** One InstancedMesh per mesh part of a model, all sharing the model's geometry and materials. */
function instance(model: Loaded, items: Placement[], parent: THREE.Object3D): InstancedSet {
  const parts: InstancedSet['parts'] = [];
  model.scene.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const im = new THREE.InstancedMesh(m.geometry, m.material, items.length);
    parts.push({ mesh: im, local: m.matrixWorld.clone() });
  });
  const q = new THREE.Quaternion();
  const inst = items.map(
    it => new THREE.Matrix4().compose(new THREE.Vector3(it.x, -model.box.min.y * it.sy, it.z), q.setFromAxisAngle(Y_AXIS, it.rot).clone(), new THREE.Vector3(it.sx, it.sy, it.sz))
  );
  const tmp = new THREE.Matrix4();
  for (const p of parts) {
    inst.forEach((M, i) => p.mesh.setMatrixAt(i, tmp.multiplyMatrices(M, p.local)));
    p.mesh.instanceMatrix.needsUpdate = true;
    p.mesh.frustumCulled = false; // instances span the whole route; we cull per instance instead
    parent.add(p.mesh);
  }
  return { parts, inst, items };
}

/** Reference mapping (Route 1 / Pallet / Viridian): 2D tree type / colour variant -> model and height. */
function referenceTreeModel(t: RouteTree, h: number): { name: string; height: number } {
  const v = t.colorVariant;
  if (v === 'blossom' || t.type === 'blossom') return { name: 'CommonTree_5#blossom', height: 78 };
  if (v === 'golden' || t.type === 'golden') return { name: 'CommonTree_2#golden', height: 82 };
  if (v === 'dark') {
    if (t.type === 'conifer' || t.type === 'pine') return { name: 'Pine_4', height: 96 };
    return { name: 'CommonTree_4#dark', height: 92 };
  }
  switch (t.type) {
    case 'mature':
    case 'oak':
      return { name: 'CommonTree_2', height: 88 };
    case 'dense_forest':
      return { name: h > 0.5 ? 'CommonTree_4' : 'CommonTree_2', height: 92 };
    case 'small':
      return { name: 'CommonTree_5', height: 58 };
    case 'slender':
      return { name: 'CommonTree_3', height: 92 };
    case 'conifer':
    case 'pine':
      return { name: h > 0.66 ? 'Pine_5' : h > 0.33 ? 'Pine_4' : 'Pine_2', height: 94 };
    case 'coastal':
      return { name: 'k:tree_palmTall', height: 92 };
    case 'decorative':
      return { name: 'CommonTree_5', height: 64 };
    default:
      return { name: h > 0.6 ? 'CommonTree_3' : h > 0.3 ? 'CommonTree_5' : 'CommonTree_2', height: 82 };
  }
}

/** Zone skin first (keeping the rare blossom / golden accents of the data), then the reference mapping. */
function treeModel(t: RouteTree, h: number, z: ZoneEnv): { name: string; height: number } {
  const accent = t.colorVariant === 'blossom' || t.type === 'blossom' || t.colorVariant === 'golden' || t.type === 'golden';
  const list = !accent && z.treeSkin ? z.treeSkin[t.type || 'broadleaf'] || z.treeSkin['*'] : undefined;
  if (list && list.length) {
    const [name, , height] = pickWeighted(list, h);
    return { name, height };
  }
  return referenceTreeModel(t, h);
}

/** Reference ring mapping (lighter models). */
function referenceRingModel(t: RouteTree, h: number): { name: string; height: number } {
  const blossom = t.type === 'blossom';
  const name = blossom ? 'CommonTree_5#blossom' : t.type === 'conifer' || h < 0.35 ? 'Pine_5' : t.colorVariant === 'dark' ? 'CommonTree_4#dark' : 'CommonTree_5';
  return { name, height: blossom ? 80 : 98 };
}

/** Ground cover per lawn style: [model, cumulative roll band, target size]. Rolls above the last band leave a gap. */
const LAWNS: Record<Exclude<ZoneEnv['lawn'], 'none'>, { keep: number; list: [string, number, number][] }> = {
  lush: {
    keep: 0.8,
    list: [
      ['Grass_Common_Short', 0.5, 13],
      ['Grass_Wispy_Short', 0.66, 14],
      ['Clover_1#green', 0.78, 10],
      ['Plant_7#green', 0.87, 10],
      ['Plant_7_Big#green', 0.93, 14],
      ['Flower_3_Single', 1, 15],
    ],
  },
  meadow: {
    keep: 0.85,
    list: [
      ['Grass_Common_Short', 0.36, 13],
      ['Grass_Wispy_Short', 0.52, 15],
      ['Clover_1#green', 0.62, 10],
      ['Flower_3_Single', 0.74, 15],
      ['k:flower_yellowA', 0.82, 11],
      ['k:flower_purpleA', 0.9, 12],
      ['Plant_7_Big#green', 1, 14],
    ],
  },
  dry: {
    keep: 0.6,
    list: [
      ['Grass_Wispy_Short#olive', 0.45, 15],
      ['k:grass_leafs#olive', 0.68, 11],
      ['Grass_Common_Short#olive', 0.85, 12],
      ['k:rock_smallFlatA', 1, 7],
    ],
  },
  sparse: {
    keep: 0.42,
    list: [
      ['Grass_Common_Short', 0.55, 13],
      ['Grass_Wispy_Short', 0.8, 14],
      ['Clover_1#green', 1, 10],
    ],
  },
};

/** Everything the reference placement code may use regardless of location. */
const BASE_KEYS = [
  'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5', 'Pine_2', 'Pine_4', 'Pine_5',
  'CommonTree_5#blossom', 'CommonTree_2#golden', 'CommonTree_4#dark',
  'Bush_Common_Flowers', 'Flower_3_Group', 'Flower_4_Group', 'Fern_1', 'Plant_1_Big',
  'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Grass_Common_Tall',
  'Pebble_Round_1', 'Pebble_Round_2', 'Pebble_Round_3', 'Pebble_Square_1',
  'k:tree_palmTall', 'k:sign', 't:lantern', 't:stall-bench', 't:fence', 't:fountain-round-detail', 't:hedge',
  'c:building-c', 'c:building-e', 'c:building-n', 'c:building-d',
];

const CIVIC: Record<'center' | 'mart' | 'gym' | 'gate', { model: string; sign: string; ink: string; band: string }> = {
  center: { model: 'c:building-e', sign: '#dc2626', ink: '#ffffff', band: '#fecaca' },
  mart: { model: 'c:building-c', sign: '#1d4ed8', ink: '#ffffff', band: '#bfdbfe' },
  gym: { model: 'c:building-n', sign: '#a16207', ink: '#fef3c7', band: '#fde68a' },
  gate: { model: 'c:building-d', sign: '#7f1d1d', ink: '#fee2e2', band: '#fca5a5' },
};

/** Model keys a location needs (loaded before its fade-in lifts). */
export function routeModelKeys(route: RouteDefinition, env: LocationEnv): Set<string> {
  const keys = modelKeysFor(env);
  BASE_KEYS.forEach(k => keys.add(k));
  for (const z of env.zones) if (z.lawn !== 'none') LAWNS[z.lawn].list.forEach(([k]) => keys.add(k));
  for (const g of route.grassPatches) {
    if (g.style === 'dunes') keys.add('k:grass_large#olive');
    if (g.style === 'rubble') ['k:rock_smallA', 'k:rock_smallC', 'k:rock_smallFlatA'].forEach(k => keys.add(env.underground ? k + '#cave' : k));
  }
  return keys;
}

export async function loadRouteModels(input: RouteModelInput): Promise<RouteModelsHandle> {
  const { scene, route, env } = input;
  const W = route.worldWidth;
  const H = route.worldHeight;
  const FAR = env.drawDistance;
  const loaded = await environmentAssets.loadMany(routeModelKeys(route, env));
  if (!loaded.size) throw new Error('no environment models could be loaded');
  const has = (n: string) => loaded.has(n);
  const model = (n: string): Loaded => loaded.get(n)!;

  const group = new THREE.Group();
  group.name = 'route-models';
  const sets: InstancedSet[] = [];
  const solids: Solid[] = [];
  const bucket = new Map<string, Placement[]>();
  const put = (n: string, p: Placement) => {
    if (!has(n)) return;
    if (!bucket.has(n)) bucket.set(n, []);
    bucket.get(n)!.push(p);
  };
  const sized = (n: string, along: 'y' | 'xz', target: number) => {
    if (!has(n)) return 1;
    const size = model(n).box.getSize(new THREE.Vector3());
    return target / Math.max(0.0001, along === 'y' ? size.y : Math.max(size.x, size.z));
  };
  const zoneEnd = (z: ZoneEnv) => {
    const i = env.zones.indexOf(z);
    return i + 1 < env.zones.length ? env.zones[i + 1].from : W;
  };

  // Trees at the existing trunk foot (so collision still matches), plus undergrowth
  const decos = ['Bush_Common_Flowers', 'Flower_3_Group', 'Flower_4_Group', 'Fern_1', 'Plant_1_Big', 'Bush_Common_Flowers'];
  const inner = input.extraTrees?.inner || [];
  for (const t of [...input.trees, ...inner]) {
    const h = hash(t.x, t.y);
    const z = zoneAt(env, t.x);
    let { name, height } = treeModel(t, h, z);
    if (!has(name)) ({ name, height } = referenceTreeModel(t, h));
    const s = sized(name, 'y', height * (t.scale || 1) * input.scale.trees * (0.88 + h * 0.24));
    put(name, { x: t.x, z: input.treeFootY(t), rot: h * Math.PI * 2, sx: s, sy: s, sz: s });

    if (h < 0.55 && z.lawn !== 'none') {
      const a = h * 40;
      const r = 22 + h * 34;
      const dx = t.x + Math.cos(a) * r;
      const dz = input.treeFootY(t) + Math.sin(a) * r * 0.7;
      if (input.isFreeGround(dx, dz)) {
        const deco = decos[Math.floor(h * 97) % decos.length];
        const target = deco.startsWith('Bush') ? 30 : deco === 'Fern_1' ? 34 : deco === 'Plant_1_Big' ? 22 : 16;
        const ds = sized(deco, deco.startsWith('Flower') || deco === 'Plant_1_Big' ? 'y' : 'xz', target * input.scale.props);
        put(deco, { x: dx, z: dz, rot: h * 9, sx: ds, sy: ds, sz: ds });
      }
    }
  }

  // Beyond the edges: forest ring, cliff walls or a distant skyline
  const ringItems = new Set<Placement>();
  const putRing = (n: string, p: Placement) => {
    ringItems.add(p);
    put(n, p);
  };
  for (const t of input.extraTrees?.ring || []) {
    const h = hash(t.x, t.y);
    const z = zoneAt(env, Math.max(0, Math.min(W - 1, t.x)));
    if (z.ringDensity !== undefined && hash(t.y, t.x) > z.ringDensity) continue;
    const cityZone = z.houses.some(m => m.startsWith('c:'));
    const outside = t.y < 0 || t.y > H;
    if (env.ring === 'skyline' && cityZone && t.y < 0) {
      // Low-detail city blocks fill the northern horizon behind the city
      if (h < 0.5) {
        const names = ['c:low-detail-building-a', 'c:low-detail-building-b', 'c:low-detail-building-c', 'c:low-detail-building-g', 'c:low-detail-building-h', 'c:low-detail-building-j'];
        const n = names[Math.floor(h * 60) % names.length];
        if (has(n)) {
          const s = sized(n, 'xz', 60 + h * 30);
          putRing(n, { x: t.x, z: t.y - 120, rot: Math.round(h * 4) * (Math.PI / 2), sx: s, sy: s * (1 + h), sz: s, far: 1400 });
        }
      }
      continue;
    }
    if (env.ring === 'cliffs' && outside && h < 0.45) {
      const n = h < 0.15 ? 'k:rock_tallA' : h < 0.3 ? 'k:rock_tallC' : 'k:rock_tallB';
      if (has(n)) {
        const s = sized(n, 'y', 120 + h * 160);
        putRing(n, { x: t.x, z: t.y + (t.y < 0 ? -40 : 40), rot: h * 9, sx: s * 1.4, sy: s, sz: s * 1.4, far: 1400 });
        continue;
      }
    }
    const pick = z.ringTrees?.length ? pickWeighted(z.ringTrees, h) : null;
    let { name, height } = pick ? { name: pick[0], height: pick[2] + 6 } : referenceRingModel(t, h);
    if (!has(name)) ({ name, height } = referenceRingModel(t, h));
    const s = sized(name, 'y', height * (t.scale || 1) * input.scale.trees);
    putRing(name, { x: t.x, z: t.y, rot: h * Math.PI * 2, sx: s, sy: s, sz: s, far: FAR + 50 });
  }

  // Lawn: grass clumps, clover, flowers or dry tufts on open lawn, per zone style
  const inPatch = (x: number, y: number) => route.grassPatches.some(g => x > g.x - 4 && x < g.x + g.w + 4 && y > g.y - 4 && y < g.y + g.h + 4);
  for (let y = 75; y < H - 40; y += 32) {
    for (let x = 30; x < W - 30; x += 32) {
      const z = zoneAt(env, x);
      if (z.lawn === 'none') continue;
      const lawn = LAWNS[z.lawn];
      const h = hash(x * 0.37, y * 1.91);
      if (h > lawn.keep * (input.groundCover ?? 1)) continue;
      const lx = x + (hash(y, x) - 0.5) * 26;
      const ly = y + (h - 0.5) * 26;
      if (inPatch(lx, ly) || !input.isFreeGround(lx, ly) || !input.isLawn(lx, ly)) continue;
      const roll = hash(lx, ly);
      const hit = lawn.list.find(([, cut]) => roll < cut);
      if (!hit) continue;
      const [name, , target] = hit;
      // Leafy plants are wide and flat: size them by footprint, grasses by height
      const byY = /grass|flower/i.test(name) || name.startsWith('Grass') || name.startsWith('Flower');
      const s = sized(name, byY ? 'y' : 'xz', target * (0.8 + h * 0.5));
      put(name, { x: lx, z: ly, rot: roll * 7, sx: s, sy: s, sz: s, far: Math.min(500, FAR) });
    }
  }

  // Encounter patches: dense knee-high grass, reeds, dune grass or rubble
  for (const g of route.grassPatches) {
    const style = g.style || 'grass';
    const z = zoneAt(env, g.x + g.w / 2);
    const step = style === 'rubble' ? 22 : style === 'dunes' ? 19 : 15;
    for (let y = g.y + 6; y < g.y + g.h - 2; y += step) {
      for (let x = g.x + 6; x < g.x + g.w - 2; x += step) {
        const h = hash(x, y);
        const px = x + (h - 0.5) * 9;
        const pz = y + (hash(y, x) - 0.5) * 9;
        if (style === 'rubble') {
          // Underground rubble loses the grass caps
          const n = ['k:rock_smallA', 'k:rock_smallC', 'k:rock_smallFlatA'][Math.floor(h * 30) % 3] + (env.underground ? '#cave' : '');
          const s = sized(n, 'xz', 9 + h * 9);
          put(n, { x: px, z: pz, rot: h * 6.28, sx: s, sy: s, sz: s, far: 600 });
        } else if (style === 'dunes') {
          const s = sized('k:grass_large#olive', 'y', 14 * (0.8 + h * 0.5));
          put('k:grass_large#olive', { x: px, z: pz, rot: h * 6.28, sx: s * 1.3, sy: s, sz: s * 1.3, far: 650 });
        } else {
          const n = z.tallGrass && has(z.tallGrass) ? z.tallGrass : 'Grass_Common_Tall';
          const s = sized(n, 'y', (style === 'reeds' ? 32 : 24) * (0.85 + h * 0.35));
          put(n, { x: px, z: pz, rot: h * 6.28, sx: s * 1.25, sy: s, sz: s * 1.25, far: 700 });
        }
      }
    }
  }

  // Pebbles scattered along the edges of dirt trails
  if (input.isDirtPath) {
    const pebbles = ['Pebble_Round_1', 'Pebble_Round_2', 'Pebble_Round_3', 'Pebble_Square_1'];
    for (const p of route.path) {
      if (!input.isDirtPath(p)) continue;
      const along = p.w >= p.h;
      const len = along ? p.w : p.h;
      for (let k = 6; k < len - 6; k += 11) {
        for (const side of [0, 1]) {
          const h = hash(p.x + k * 3.1 + side, p.y + k);
          if (h > 0.55) continue;
          const off = 2 + h * 7;
          const x = along ? p.x + k : side ? p.x + p.w - off : p.x + off;
          const y = along ? (side ? p.y + p.h - off : p.y + off) : p.y + k;
          const name = pebbles[Math.floor(h * 40) % pebbles.length];
          const s = sized(name, 'xz', 4 + h * 6);
          put(name, { x, z: y, rot: h * 9, sx: s, sy: s, sz: s, far: 520 });
        }
      }
    }
  }

  // Textured rocks sized to the existing stone collision radius
  for (const st of input.stones) {
    const h = hash(st.x, st.y);
    const name = h < 0.33 ? 'Rock_Medium_1' : h < 0.66 ? 'Rock_Medium_2' : 'Rock_Medium_3';
    const s = sized(name, 'xz', st.radius * 2.5);
    put(name, { x: st.x, z: st.y + st.radius * 0.2, rot: h * Math.PI * 2, sx: s, sy: s * 0.8, sz: s });
  }

  // Fences: wooden post-and-rail segments along each fence rectangle
  if (has('t:fence')) {
    const fm = model('t:fence');
    const size = fm.box.getSize(new THREE.Vector3());
    const c = fm.box.getCenter(new THREE.Vector3());
    for (const f of input.fences) {
      const count = Math.max(1, Math.round(f.w / 30));
      const seg = f.w / count;
      const s = seg / size.z; // panel runs along model z; turned a quarter to run east-west
      const sy = (24 * input.scale.props) / size.y;
      for (let i = 0; i < count; i++) {
        // After rotating +90deg about Y, model (x, z) -> world (z, -x)
        put('t:fence', { x: f.x + seg * (i + 0.5) - c.z * s, z: f.y + f.h - 2 + c.x * s, rot: Math.PI / 2, sx: s, sy, sz: s });
      }
    }
  }

  // Street lanterns, benches, signposts and fountains
  for (const l of route.streetlamps || []) {
    const s = sized('t:lantern', 'y', 50);
    put('t:lantern', { x: l.x, z: l.y, rot: 0, sx: s, sy: s, sz: s });
  }
  for (const b of route.benches || []) {
    if (!has('t:stall-bench')) break;
    const w = b.w || 28;
    const size = model('t:stall-bench').box.getSize(new THREE.Vector3());
    const s = (w * 1.15) / size.z;
    put('t:stall-bench', { x: b.x + w / 2, z: b.y + 8, rot: Math.PI / 2, sx: s, sy: s * 1.3, sz: s });
  }
  for (const sp of route.signposts || []) {
    const s = sized('k:sign', 'y', 26);
    put('k:sign', { x: sp.x, z: sp.y + 12, rot: 0, sx: s, sy: s, sz: s });
  }
  // Plaza fountains: every city has its own model (sized to the fountain's collision footprint)
  for (const f of route.fountains || []) {
    const own = zoneAt(env, f.x).fountain;
    if (own && has(own)) {
      const s = sized(own, 'xz', f.radius * 2.5);
      put(own, { x: f.x, z: f.y, rot: 0, sx: s, sy: s, sz: s });
      continue;
    }
    const s = sized('t:fountain-round-detail', 'xz', f.radius * 2.3);
    put('t:fountain-round-detail', { x: f.x, z: f.y, rot: 0, sx: s, sy: s * 1.6, sz: s });
  }

  // Terrace ledges: a natural rock embankment (gaps left at the stairs)
  const rockNames = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'];
  for (const l of route.ledges || []) {
    const cuts = [...(l.stairs || [])].sort((a, b) => a.x - b.x);
    const segs: [number, number][] = [];
    let x0 = l.x;
    for (const c of cuts) {
      segs.push([x0, c.x]);
      x0 = c.x + c.w;
    }
    segs.push([x0, l.x + l.w]);
    for (const [a, b] of segs) {
      for (let x = a + 9; x < b - 4; x += 17) {
        const h = hash(x, l.y);
        const name = rockNames[Math.floor(h * 30) % 3];
        const s = sized(name, 'xz', 24 + h * 14);
        put(name, { x: x + (h - 0.5) * 6, z: l.y + l.h * (0.35 + h * 0.4), rot: h * 7, sx: s, sy: s * (0.55 + h * 0.35), sz: s });
        if (h < 0.45) {
          const fs = sized('Fern_1', 'xz', 18);
          put('Fern_1', { x: x + 8, z: l.y - 4, rot: h * 11, sx: fs, sy: fs, sz: fs, far: 520 });
        }
      }
    }
  }

  // Zone decorations: rock formations, ruins, stalls, crops, lily pads...
  const poi = [...route.npcs, ...route.items, ...(route.portals || []), ...(route.signposts || []), ...(route.noticeBoards || []), ...(route.landmarks || []), { x: route.startX, y: route.startY }];
  const nearPoi = (x: number, y: number, d: number) => poi.some(o => Math.hypot(o.x - x, o.y - y) < d);
  const nearSolid = (x: number, y: number, d: number) => solids.some(s => Math.hypot(s.x - x, s.z - y) < s.r + d);
  const roadWithin = (x: number, y: number, d: number) => [[d, 0], [-d, 0], [0, d], [0, -d]].some(([ox, oy]) => input.isRoad(x + ox, y + oy));
  const skyline: { x: number; half: number }[] = [];
  const zoneWaters = (x0: number, x1: number) =>
    (input.waters || []).filter(w => (w.kind === 'sea' || w.kind === 'river' || w.kind === 'lake') && w.x < x1 - 60 && w.x + w.w > x0 + 60);
  /** Fog-free copy of a model (aerial-perspective tint instead) for skyline landmarks. */
  const fogColor = new THREE.Color(env.fog.color);
  const noFog = (n: string): string => {
    const key = n + '@nofog';
    if (!loaded.has(key)) {
      const src = model(n);
      const scene = src.scene.clone(true);
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const conv = (mat: THREE.Material) => {
          const c = (mat as THREE.MeshLambertMaterial).clone();
          c.fog = false;
          c.color.lerp(fogColor, 0.3);
          return c;
        };
        m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
      });
      scene.updateMatrixWorld(true);
      loaded.set(key, { scene, box: src.box });
    }
    return key;
  };
  env.zones.forEach((z, zi) => {
    const x0 = z.from;
    const x1 = zoneEnd(z);
    const buildings = route.buildings.filter(b => b.x + b.w / 2 >= x0 && b.x + b.w / 2 < x1);
    z.decor.forEach((rule: DecorRule, ri) => {
      const want = Math.max(rule.density >= 1 ? 1 : 0, Math.round((rule.density * (x1 - x0)) / 1000));
      let placed = 0;
      for (let i = 0; i < want * 6 && placed < want; i++) {
        const h1 = hash(i * 13.7 + zi * 101 + ri * 7.3, ri * 31.1 + zi * 3.3);
        const h2 = hash(i * 5.3 + ri * 17.9, zi * 41.7 + i * 0.37);
        let x = x0 + 30 + h1 * (x1 - x0 - 60);
        let y = 75 + h2 * (H - 120);
        let rot = h1 * Math.PI * 2;
        switch (rule.where) {
          case 'open':
            if (rule.solid ? !input.canPlant(x, y) : !input.isFreeGround(x, y) || inPatch(x, y) || input.isRoad(x, y) || nearPoi(x, y, 40)) continue;
            if (rule.solid && nearSolid(x, y, 30)) continue;
            break;
          case 'roadside': {
            if (input.isRoad(x, y) || !input.isFreeGround(x, y) || !roadWithin(x, y, 26) || inPatch(x, y) || nearPoi(x, y, 46)) continue;
            if (route.buildings.some(b => x > b.x - 24 && x < b.x + b.w + 24 && y > b.y - 24 && y < b.y + b.h + 40)) continue;
            if (rule.solid && (roadWithin(x, y, 12) || nearSolid(x, y, 24))) continue;
            break;
          }
          case 'building': {
            if (!buildings.length) return;
            const b = buildings[Math.floor(h1 * 997) % buildings.length];
            const side = Math.floor(h2 * 4);
            if (side === 0) [x, y] = [b.x - 16, b.y + b.h * (0.3 + h2 * 0.6)];
            else if (side === 1) [x, y] = [b.x + b.w + 16, b.y + b.h * (0.3 + h2 * 0.6)];
            else [x, y] = [side === 2 ? b.x + 12 + h1 * 10 : b.x + b.w - 12 - h1 * 10, b.y + b.h + 12];
            if (Math.abs(x - (b.x + b.w / 2)) < 34 && y > b.y + b.h) continue; // keep the doorway clear
            if (!input.isFreeGround(x, y) || input.isRoad(x, y) || nearPoi(x, y, 36)) continue;
            rot = side < 2 ? Math.PI / 2 : 0;
            break;
          }
          case 'water': {
            const pools = [...(route.ponds || []), ...(route.waters || []).filter(w => w.kind === 'lake' || w.kind === 'river')];
            if (!pools.length) return;
            const p = pools[Math.floor(h1 * 991) % pools.length];
            x = p.x + 14 + h1 * Math.max(1, p.w - 28);
            y = p.y + 14 + h2 * Math.max(1, p.h - 28);
            const pier = (p as { pier?: { x: number; y: number; w: number; h: number } }).pier;
            if (pier && x > pier.x - 16 && x < pier.x + pier.w + 16 && y > pier.y - 16 && y < pier.y + pier.h + 16) continue;
            break;
          }
          case 'offshore':
          case 'shore': {
            const pools = zoneWaters(x0, x1);
            if (!pools.length) return;
            const w = pools[Math.floor(h1 * 991) % pools.length];
            const lo = Math.max(w.x + 40, x0 + 30);
            const hi = Math.min(w.x + w.w - 40, x1 - 30);
            if (hi <= lo) return;
            x = lo + h1 * (hi - lo);
            const northBank = w.y + w.h <= 80; // river / sea along the north edge
            const [name0, , target0] = pickWeighted(rule.models, hash(x, w.y));
            if (!has(name0)) continue;
            const sz = model(name0).box.getSize(new THREE.Vector3());
            const longZ = sz.z > sz.x;
            if (rule.where === 'offshore') {
              // Out on the water, broadside to the shore, clear of the bank
              y = northBank ? w.y + 20 + h2 * Math.max(10, w.h - 70) : Math.max(w.y, H) + 60 + h2 * 220;
              if (w.w < 200 && w.h < 200) y = w.y + w.h / 2;
              rot = (longZ ? Math.PI / 2 : 0) + (h2 < 0.5 ? 0 : Math.PI);
            } else {
              // Docks / bridges run out from the shore across the water
              const s0 = sized(name0, rule.fit || 'y', target0);
              const len = (longZ ? sz.z : sz.x) * s0;
              y = northBank ? w.y + w.h / 2 : w.y + len / 2 - 6;
              rot = longZ ? 0 : Math.PI / 2;
            }
            if (nearSolid(x, y, 60)) continue;
            break;
          }
          case 'backdrop': {
            // A landmark on the northern skyline, behind the ring of trees
            y = -190 - h2 * 70;
            x = x0 + (x1 - x0) * (0.45 + h1 * 0.1);
            break;
          }
          case 'edge': {
            // Just beyond the walkable boundary, so landmarks frame the route without blocking it
            const north = z.edgeWater ? z.edgeWater.side === 'south' : h2 < 0.55;
            y = north ? 10 + h2 * 80 : H - 20 + (h2 - 0.55) * 120;
            if ((route.portals || []).some(p => Math.abs(p.x - x) < 120 && Math.abs(p.y - y) < 160)) continue;
            if (route.buildings.some(b => x > b.x - 60 && x < b.x + b.w + 60 && Math.abs(y - (b.y + b.h / 2)) < b.h / 2 + 60)) continue;
            if (route.exitX > 0 && x > route.exitX - 120) continue;
            if (nearSolid(x, y, 26)) continue;
            break;
          }
        }
        const onWater = rule.where === 'offshore' || rule.where === 'shore';
        const [name, , target] = pickWeighted(rule.models, onWater ? hash(x, zoneWaters(x0, x1)[0]?.y ?? 0) : hash(x, y));
        if (!has(name)) continue;
        const big = rule.where === 'backdrop' || onWater;
        const s = sized(name, rule.fit || 'y', target * (big ? 1 : 0.85 + h2 * 0.3));
        // Skyline landmarks are drawn without fog so they read from across the map
        const key = rule.where === 'backdrop' ? noFog(name) : name;
        put(key, { x, z: y, rot, sx: s, sy: s, sz: s, far: rule.where === 'backdrop' ? 4000 : onWater ? FAR + 300 : rule.solid ? FAR + 100 : Math.min(FAR, 640) });
        if (rule.where === 'backdrop') {
          const bs = model(name).box.getSize(new THREE.Vector3());
          skyline.push({ x, half: (Math.max(bs.x, bs.z) * s) / 2 + 60 });
        }
        if (rule.solid) solids.push({ x, z: y, r: rule.solid });
        placed++;
      }
    });
  });

  // Nothing on the northern ring may hide a skyline landmark
  for (const c of skyline) {
    for (const items of bucket.values()) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (ringItems.has(it) && it.z < 0 && Math.abs(it.x - c.x) < c.half) items.splice(i, 1);
      }
    }
  }

  for (const [name, items] of bucket) if (items.length) sets.push(instance(model(name), items, group));

  // Houses: per-zone models fitted to each house footprint, door facing the street (south)
  const houses = new Set<RouteBuilding>();
  const place = (b: RouteBuilding, key: string, skin: THREE.Texture | null, maxH?: number): { s: number; size: THREE.Vector3; front: number } | null => {
    if (!has(key)) return null;
    const obj = model(key).scene.clone(true);
    if (skin) {
      obj.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshLambertMaterial).clone();
        mat.map = skin;
        mesh.material = mat;
      });
    }
    obj.rotation.y = rotationFor(key);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    let s = Math.min((b.w * 1.05) / size.x, (b.h * (b.type === 'house' ? 1.0 : 1.05)) / size.z);
    if (maxH && size.y * s > maxH) s = maxH / size.y;
    obj.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    const front = b.y + b.h;
    obj.position.set(b.x + b.w / 2 - c.x * s, -box.min.y * s, front - box.max.z * s);
    group.add(obj);
    houses.add(b);
    return { s, size, front };
  };
  for (const b of route.buildings) {
    if (b.type !== 'house') continue;
    const z = zoneAt(env, b.x + b.w / 2);
    if (!z.houses.length) continue;
    const h = hash(b.x, b.y);
    const key = z.houses[Math.floor(h * z.houses.length) % z.houses.length];
    // Colour-map variations only exist for the Kenney kits
    const kit = key.startsWith('c:') ? 'commercial' : key.startsWith('s:') ? 'suburban' : null;
    const skins = kit ? z.houseSkins.filter(p => p.startsWith(kit)) : [];
    const skin = skins.length ? environmentAssets.texture(skins[Math.floor(h * 97) % skins.length]) : null;
    place(b, key, skin, z.maxBuildingHeight);
  }

  // Pokémon Center, Poké Mart, Gym and gatehouses: 3D buildings with a sign board over the door
  for (const b of route.buildings) {
    const spec = CIVIC[b.type as keyof typeof CIVIC];
    if (!spec) continue;
    const z = zoneAt(env, b.x + b.w / 2);
    const key = z.civic?.[b.type as keyof typeof CIVIC] && has(z.civic[b.type as keyof typeof CIVIC]!) ? z.civic[b.type as keyof typeof CIVIC]! : spec.model;
    const r = place(b, key, null, b.type === 'gym' ? Math.max(z.maxBuildingHeight || 0, 160) : z.maxBuildingHeight);
    if (!r) continue;
    const { s, size, front } = r;
    // Coloured roof cap in the sign colour gives each civic building its identity from afar
    const roofH = Math.min(size.y * s, b.type === 'gym' ? 999 : z.maxBuildingHeight || 999);
    if (b.type !== 'gate') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(size.x * s * 0.98, 3.5, size.z * s * 0.98), new THREE.MeshLambertMaterial({ color: spec.sign }));
      cap.position.set(b.x + b.w / 2, roofH + 1.2, front - (size.z * s) / 2);
      group.add(cap);
    }
    const board = signBoard(input.signText?.(b) || b.label, spec.sign, spec.ink, spec.band, b.type === 'center');
    const bw = Math.min(b.w * 0.85, 110);
    board.scale.set(bw, bw / 4, 1);
    board.position.set(b.x + b.w / 2, Math.min(size.y * s * 0.62, 46), front + 1.5);
    group.add(board);
  }

  scene.add(group);

  const tmp = new THREE.Matrix4();
  let lastX = Infinity;
  let lastZ = Infinity;
  let lastClear = -1;
  return {
    houses,
    propsReplaced: true,
    solids,
    // Visible instances are packed to the front and mesh.count trimmed, so culled
    // instances cost nothing on the GPU. Only rebuilt when the camera has moved.
    updateOcclusion(cx, cz, clear) {
      if (Math.hypot(cx - lastX, cz - lastZ) < 12 && Math.abs(clear - lastClear) < 6) return;
      lastX = cx;
      lastZ = cz;
      lastClear = clear;
      for (const set of sets) {
        let n = 0;
        for (let i = 0; i < set.items.length; i++) {
          const it = set.items[i];
          const d = Math.hypot(it.x - cx, it.z - cz);
          if (d < clear || d > (it.far ?? FAR)) continue;
          for (const p of set.parts) p.mesh.setMatrixAt(n, tmp.multiplyMatrices(set.inst[i], p.local));
          n++;
        }
        for (const p of set.parts) {
          p.mesh.count = n;
          p.mesh.instanceMatrix.needsUpdate = true;
        }
      }
    },
  };
}

export type { WeightedModel };
