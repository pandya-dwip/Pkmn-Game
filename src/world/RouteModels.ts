/**
 * RouteModels.ts
 * Real 3D models for the 3D chase view. All are CC0 (public domain):
 *  - Quaternius "Stylized Nature MegaKit" (quaternius.com): leafy textured trees,
 *    pines, bushes, flowers, ferns and rocks  -> public/models/quaternius/
 *  - Kenney "Nature Kit" / "City Kit (Suburban)" (kenney.nl): fences, palms,
 *    houses                                      -> public/models/kenney/
 * Files load lazily, only when the 3D view opens.
 *
 * Everything is placed from the existing route data, so collision and gameplay
 * are unchanged. Repeated models use GPU instancing; foliage and grass sway in
 * the wind via a small vertex-shader hook. Instances far from (or right in front
 * of) the camera are culled each frame. If loading fails, the caller keeps the
 * existing billboard art.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RouteDefinition, RouteBuilding, RouteTree, RouteStone, RouteFence, RoutePath } from '../systems/RouteExplorationEngine';

const KENNEY = `${import.meta.env.BASE_URL}models/kenney/`;
const QUAT = `${import.meta.env.BASE_URL}models/quaternius/`;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
/** Instances beyond this distance are culled (the scene fog hides the cut). */
const FAR = 900;

/** Which way the commercial buildings' storefronts face in model space (radians about Y). */
const COMMERCIAL_ROTATION = Math.PI; // Kenney commercial storefronts face -Z

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

/** Which way the suburban houses' front doors face in model space (radians about Y). */
const HOUSE_ROTATION = 0;
const HOUSE_MODELS = ['a', 'c', 'd', 'f', 'h', 'k'];

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------------------
// Wind: shared clock + vertex shader sway for foliage / grass materials
// ---------------------------------------------------------------------------
export const windTime = { value: 0 };

/**
 * Sway vertices by their height above the model base; phase varies per instance so trees don't
 * move in lockstep. An optional tint recolours the texture by its brightness (keeps leaf detail,
 * unlike multiplying a green texture, which turns pink into olive).
 */
export function addWindSway(mat: THREE.Material, strength: number, tint?: THREE.Color): void {
  // three.js caches programs by onBeforeCompile's source text: give each variant its own key
  mat.customProgramCacheKey = () => `wind:${strength}:${tint ? 'tint' : 'plain'}`;
  mat.onBeforeCompile = shader => {
    if (tint) {
      shader.uniforms.uTint = { value: tint };
      shader.fragmentShader = 'uniform vec3 uTint;\n' + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float leafLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = uTint * clamp(leafLum * 2.5, 0.0, 1.3);`
      );
    }
    shader.uniforms.uWindTime = windTime;
    shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float windPhase = 0.0;
      #ifdef USE_INSTANCING
        windPhase = instanceMatrix[3].x * 0.013 + instanceMatrix[3].z * 0.021;
      #endif
      float windH = max(position.y, 0.0);
      float windS = sin(uWindTime * 1.7 + windPhase + position.y * 0.35) * 0.6 + sin(uWindTime * 3.1 + windPhase * 1.7) * 0.25;
      transformed.x += windS * ${strength.toFixed(4)} * windH;
      transformed.z += windS * ${(strength * 0.6).toFixed(4)} * windH;`
    );
  };
  mat.needsUpdate = true;
}

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
  hidden: Set<number>;
}

export interface RouteModelsHandle {
  /** Buildings now represented by a 3D model (their procedural box should be removed). */
  houses: Set<RouteBuilding>;
  /** Lamps, benches, signposts and fountains are now 3D models (drop their billboards). */
  propsReplaced: boolean;
  /** Cull instances too close to the lens or too far away. */
  updateOcclusion(cx: number, cz: number, clear: number): void;
}

export interface RouteModelInput {
  scene: THREE.Scene;
  route: RouteDefinition;
  trees: RouteTree[];
  treeFootY: (t: RouteTree) => number;
  stones: RouteStone[];
  fences: RouteFence[];
  /** Decorations must not land on roads or blocked tiles. */
  isFreeGround: (x: number, y: number) => boolean;
  scale: { trees: number; props: number };
  /** Extra trees: `inner` fill open lawn, `ring` is the forest beyond the edges (drawn with lighter models). */
  extraTrees?: { inner: RouteTree[]; ring: RouteTree[] };
  /** Dirt trails get pebbles along their edges. */
  isDirtPath?: (p: RoutePath) => boolean;
  /** Text for a building's sign board (Pokémon Center, Mart, Gym). */
  signText?: (b: RouteBuilding) => string;
}

type Loaded = { scene: THREE.Group; box: THREE.Box3 };

/** Load a set of models; materials become matte Lambert (matching the scene), foliage gets wind. */
async function loadAll(base: string, names: string[], ext: string, deepen: number): Promise<Map<string, Loaded>> {
  const loader = new GLTFLoader();
  const out = new Map<string, Loaded>();
  await Promise.all(
    names.map(async n => {
      const gltf = await loader.loadAsync(base + n + ext);
      gltf.scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const toLambert = (mat: THREE.Material) => {
          const std = mat as THREE.MeshStandardMaterial;
          const l = new THREE.MeshLambertMaterial({
            color: std.color.clone().multiplyScalar(deepen),
            map: std.map,
            vertexColors: std.vertexColors,
            alphaTest: std.alphaTest,
            transparent: false,
            side: std.side,
          });
          l.name = std.name;
          if (/leaf|leaves|flower|grass|fern/i.test(std.name)) addWindSway(l, /grass|flower/i.test(std.name) ? 0.05 : 0.018);
          return l;
        };
        m.material = Array.isArray(m.material) ? m.material.map(toLambert) : toLambert(m.material);
      });
      gltf.scene.updateMatrixWorld(true);
      out.set(n, { scene: gltf.scene, box: new THREE.Box3().setFromObject(gltf.scene) });
    })
  );
  return out;
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
  return { parts, inst, items, hidden: new Set() };
}

/** Recolour a model's foliage (blossom pinks, autumn golds, deep forest greens). */
function tinted(model: Loaded, leafColor: string): Loaded {
  const scene = model.scene.clone(true);
  scene.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map(mat => {
      if (!/leaf|leaves/i.test(mat.name)) return mat;
      const c = (mat as THREE.MeshLambertMaterial).clone();
      c.color = new THREE.Color(0xffffff);
      addWindSway(c, 0.018, new THREE.Color(leafColor));
      return c;
    });
    m.material = Array.isArray(m.material) ? mats : mats[0];
  });
  scene.updateMatrixWorld(true);
  return { scene, box: model.box };
}

/** 2D tree type / colour variant -> model, with a believable height (world px, before scaling). */
function treeModel(t: RouteTree, h: number): { name: string; height: number } {
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

export async function loadRouteModels(input: RouteModelInput): Promise<RouteModelsHandle> {
  const { scene, route } = input;
  const quatNames = [
    'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5', 'Pine_2', 'Pine_4', 'Pine_5',
    'Bush_Common_Flowers', 'Flower_3_Group', 'Flower_4_Group', 'Fern_1', 'Plant_1_Big',
    'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3',
    'Grass_Common_Short', 'Grass_Wispy_Short', 'Grass_Common_Tall', 'Clover_1', 'Plant_7', 'Plant_7_Big', 'Flower_3_Single',
    'Pebble_Round_1', 'Pebble_Round_2', 'Pebble_Round_3', 'Pebble_Square_1',
  ];
  const kenneyNature = ['tree_palmTall', 'sign'].map(n => 'nature/' + n);
  const townNames = ['lantern', 'stall-bench', 'fence', 'fountain-round-detail', 'hedge'].map(n => 'town/' + n);
  const commercialNames = ['building-c', 'building-e', 'building-n'].map(n => 'commercial/' + n);
  const houseNames = HOUSE_MODELS.map(c => 'suburban/building-type-' + c);
  const [quat, kenney] = await Promise.all([loadAll(QUAT, quatNames, '.gltf', 1), loadAll(KENNEY, [...kenneyNature, ...houseNames, ...townNames, ...commercialNames], '.glb', 0.85)]);

  const variants = new Map<string, Loaded>([
    ['CommonTree_5#blossom', tinted(quat.get('CommonTree_5')!, '#ff9cc6')],
    ['CommonTree_2#golden', tinted(quat.get('CommonTree_2')!, '#ffb347')],
    ['CommonTree_4#dark', tinted(quat.get('CommonTree_4')!, '#3f7a3a')],
    // These sample a purple region of the shared leaf atlas; keep the lawn green
    ['Clover_1#green', tinted(quat.get('Clover_1')!, '#4f9a34')],
    ['Plant_7#green', tinted(quat.get('Plant_7')!, '#5aa83c')],
    ['Plant_7_Big#green', tinted(quat.get('Plant_7_Big')!, '#4c8f30')],
  ]);
  // Prefixes: k: Kenney nature, t: Kenney fantasy town, (none): Quaternius
  const model = (n: string): Loaded =>
    variants.get(n) || (n.startsWith('k:') ? kenney.get('nature/' + n.slice(2))! : n.startsWith('t:') ? kenney.get('town/' + n.slice(2))! : quat.get(n)!);

  const group = new THREE.Group();
  group.name = 'route-models';
  const sets: InstancedSet[] = [];
  const bucket = new Map<string, Placement[]>();
  const put = (n: string, p: Placement) => {
    if (!bucket.has(n)) bucket.set(n, []);
    bucket.get(n)!.push(p);
  };
  const sized = (n: string, along: 'y' | 'xz', target: number) => {
    const size = model(n).box.getSize(new THREE.Vector3());
    return target / (along === 'y' ? size.y : Math.max(size.x, size.z));
  };

  // Trees at the existing trunk foot (so collision still matches), plus undergrowth
  const decos = ['Bush_Common_Flowers', 'Flower_3_Group', 'Flower_4_Group', 'Fern_1', 'Plant_1_Big', 'Bush_Common_Flowers'];
  const inner = input.extraTrees?.inner || [];
  for (const t of [...input.trees, ...inner]) {
    const h = hash(t.x, t.y);
    const { name, height } = treeModel(t, h);
    const s = sized(name, 'y', height * (t.scale || 1) * input.scale.trees * (0.88 + h * 0.24));
    put(name, { x: t.x, z: input.treeFootY(t), rot: h * Math.PI * 2, sx: s, sy: s, sz: s });

    if (h < 0.55) {
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

  // Forest ring beyond the edges: lighter tree models, culled a little sooner
  for (const t of input.extraTrees?.ring || []) {
    const h = hash(t.x, t.y);
    const blossom = t.type === 'blossom';
    const name = blossom ? 'CommonTree_5#blossom' : t.type === 'conifer' || h < 0.35 ? 'Pine_5' : t.colorVariant === 'dark' ? 'CommonTree_4#dark' : 'CommonTree_5';
    const s = sized(name, 'y', (blossom ? 80 : 98) * (t.scale || 1) * input.scale.trees);
    put(name, { x: t.x, z: t.y, rot: h * Math.PI * 2, sx: s, sy: s, sz: s, far: 950 });
  }

  // Lawn: short grass clumps, clover and small plants everywhere that is open ground
  const inPatch = (x: number, y: number) => route.grassPatches.some(g => x > g.x - 4 && x < g.x + g.w + 4 && y > g.y - 4 && y < g.y + g.h + 4);
  const lawn: [string, number, number][] = [
    ['Grass_Common_Short', 0.5, 13],
    ['Grass_Wispy_Short', 0.66, 14],
    ['Clover_1#green', 0.78, 10],
    ['Plant_7#green', 0.87, 10],
    ['Plant_7_Big#green', 0.93, 14],
    ['Flower_3_Single', 1, 15],
  ];
  for (let y = 75; y < route.worldHeight - 40; y += 32) {
    for (let x = 30; x < route.worldWidth - 30; x += 32) {
      const h = hash(x * 0.37, y * 1.91);
      if (h > 0.8) continue;
      const lx = x + (hash(y, x) - 0.5) * 26;
      const ly = y + (h - 0.5) * 26;
      if (inPatch(lx, ly) || !input.isFreeGround(lx, ly)) continue;
      const roll = hash(lx, ly);
      const [name, , target] = lawn.find(([, cut]) => roll < cut)!;
      // Leafy plants are wide and flat: size them by footprint, grasses by height
      const s = sized(name, name.startsWith('Grass') || name.startsWith('Flower') ? 'y' : 'xz', target * (0.8 + h * 0.5));
      put(name, { x: lx, z: ly, rot: roll * 7, sx: s, sy: s, sz: s, far: 500 });
    }
  }

  // Encounter patches: dense knee-high 3D grass
  for (const g of route.grassPatches) {
    for (let y = g.y + 6; y < g.y + g.h - 2; y += 15) {
      for (let x = g.x + 6; x < g.x + g.w - 2; x += 15) {
        const h = hash(x, y);
        const s = sized('Grass_Common_Tall', 'y', 24 * (0.85 + h * 0.35));
        put('Grass_Common_Tall', { x: x + (h - 0.5) * 9, z: y + (hash(y, x) - 0.5) * 9, rot: h * 6.28, sx: s * 1.25, sy: s, sz: s * 1.25, far: 700 });
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
  {
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
    const w = b.w || 28;
    const size = model('t:stall-bench').box.getSize(new THREE.Vector3());
    const s = (w * 1.15) / size.z;
    put('t:stall-bench', { x: b.x + w / 2, z: b.y + 8, rot: Math.PI / 2, sx: s, sy: s * 1.3, sz: s });
  }
  for (const sp of route.signposts || []) {
    const s = sized('k:sign', 'y', 26);
    put('k:sign', { x: sp.x, z: sp.y + 12, rot: 0, sx: s, sy: s, sz: s });
  }
  for (const f of route.fountains || []) {
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

  for (const [name, items] of bucket) sets.push(instance(model(name), items, group));

  // Houses: Kenney suburban models fitted to each house footprint, door facing the street (south)
  const houses = new Set<RouteBuilding>();
  const texLoader = new THREE.TextureLoader();
  const recolors = ['colormap', 'variation-b', 'variation-c'].map(v => {
    const t = texLoader.load(KENNEY + 'suburban/Textures/' + v + '.png');
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  });
  for (const b of route.buildings) {
    if (b.type !== 'house') continue;
    const h = hash(b.x, b.y);
    const m = kenney.get(houseNames[Math.floor(h * houseNames.length) % houseNames.length])!;
    const obj = m.scene.clone(true);
    const tex = recolors[Math.floor(h * 97) % recolors.length];
    obj.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as THREE.MeshLambertMaterial).clone();
      mat.map = tex;
      mesh.material = mat;
    });
    obj.rotation.y = HOUSE_ROTATION;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = Math.min((b.w * 1.05) / size.x, (b.h * 1.0) / size.z);
    obj.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.set(b.x + b.w / 2 - c.x * s, -box.min.y * s, b.y + b.h - box.max.z * s);
    group.add(obj);
    houses.add(b);
  }

  // Pokémon Center, Poké Mart and Gym: 3D commercial buildings with a sign board over the door
  const civic: Record<string, { model: string; sign: string; ink: string; band: string }> = {
    center: { model: 'commercial/building-e', sign: '#dc2626', ink: '#ffffff', band: '#fecaca' },
    mart: { model: 'commercial/building-c', sign: '#1d4ed8', ink: '#ffffff', band: '#bfdbfe' },
    gym: { model: 'commercial/building-n', sign: '#a16207', ink: '#fef3c7', band: '#fde68a' },
  };
  for (const b of route.buildings) {
    const spec = civic[b.type];
    if (!spec) continue;
    const obj = kenney.get(spec.model)!.scene.clone(true);
    obj.name = 'civic-' + b.type;
    obj.rotation.y = COMMERCIAL_ROTATION;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = Math.min((b.w * 1.05) / size.x, (b.h * 1.05) / size.z);
    obj.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    const front = b.y + b.h;
    obj.position.set(b.x + b.w / 2 - c.x * s, -box.min.y * s, front - box.max.z * s);
    group.add(obj);
    // Coloured roof cap in the sign colour gives each civic building its identity from afar
    const roofH = size.y * s;
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * s * 0.98, 3.5, size.z * s * 0.98),
      new THREE.MeshLambertMaterial({ color: spec.sign })
    );
    cap.position.set(b.x + b.w / 2, roofH + 1.2, front - (size.z * s) / 2);
    group.add(cap);
    const board = signBoard(input.signText?.(b) || b.label, spec.sign, spec.ink, spec.band, b.type === 'center');
    const bw = Math.min(b.w * 0.85, 110);
    board.scale.set(bw, bw / 4, 1);
    board.position.set(b.x + b.w / 2, Math.min(size.y * s * 0.62, 46), front + 1.5);
    group.add(board);
    houses.add(b);
  }

  scene.add(group);

  const tmp = new THREE.Matrix4();
  let lastX = Infinity;
  let lastZ = Infinity;
  let lastClear = -1;
  return {
    houses,
    propsReplaced: true,
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
