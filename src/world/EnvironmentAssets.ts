/**
 * EnvironmentAssets.ts
 * Shared asset manager for the 3D chase view (every city, route and area).
 *
 * All models are CC0 (public domain):
 *  - Quaternius "Stylized Nature MegaKit" (quaternius.com)       -> public/models/quaternius/
 *  - Kenney Nature Kit, Fantasy Town Kit, City Kit (Suburban),
 *    City Kit (Commercial) (kenney.nl)                            -> public/models/kenney/
 *
 * Model keys carry a prefix naming their kit:
 *   (none) Quaternius   k: Kenney Nature   t: Kenney Fantasy Town
 *   s: Kenney Suburban  c: Kenney Commercial
 *   p: poly.pizza (Quaternius, Poly by Google and other CC0 / CC-BY authors;
 *      see public/models/SOURCES.md for each model's author and licence)
 * A "#variant" suffix recolours foliage (e.g. "CommonTree_5#blossom").
 *
 * Loading is lazy and per location: only the keys a location asks for are
 * fetched. Loaded models stay cached across locations (they are small, shared
 * by many places, and re-downloading them on every transition would stall the
 * fade). Everything a location creates on top of them (instanced meshes,
 * cloned materials, canvas textures) is released by `disposeSceneResources`.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = import.meta.env.BASE_URL;
const KENNEY = `${BASE}models/kenney/`;
const QUAT = `${BASE}models/quaternius/`;
const POLY = `${BASE}models/polypizza/`;

// ---------------------------------------------------------------------------
// Wind: shared clock + vertex shader sway for foliage / grass materials
// ---------------------------------------------------------------------------
export const windTime = { value: 0 };

/**
 * Sway vertices by their height above the model base; phase varies per instance so trees don't
 * move in lockstep. An optional tint recolours the texture by its brightness (keeps leaf detail,
 * unlike multiplying a green texture, which turns pink into olive).
 */
const swaying = new WeakSet<THREE.Material>();
export function addWindSway(mat: THREE.Material, strength: number, tint?: THREE.Color): void {
  swaying.add(mat);
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

export type Loaded = { scene: THREE.Group; box: THREE.Box3 };

/**
 * Kenney Nature Kit ships flat pastel/teal material colours. Recolour them by
 * material name so they sit naturally beside the textured Quaternius trees:
 * brown trunks, green foliage, grey stone.
 */
const NATURE_PALETTE: Record<string, string> = {
  leafsGreen: '#4c9a3a',
  leafsDark: '#2f6e34',
  leafsFall: '#d4892f',
  grass: '#5b9b3c',
  dirt: '#8a7560',
  stone: '#a3a8a8',
  stoneDark: '#7d8383',
  woodBark: '#6e4a2e',
  woodBarkDark: '#53361f',
  wood: '#a77446',
  woodDark: '#7b5230',
  woodInner: '#d8b98b',
  woodBirch: '#e6ddcc',
  water: '#4aa3d8',
  corn: '#e8c45a',
};

/** Every geometry / material / texture owned by the cache (never disposed with a scene). */
const shared = new WeakSet<object>();
export function markShared(o: object | null | undefined): void {
  if (o) shared.add(o);
}
export function isShared(o: object): boolean {
  return shared.has(o);
}

function urlFor(key: string): string {
  const n = key.split('#')[0];
  if (n.startsWith('k:')) return `${KENNEY}nature/${n.slice(2)}.glb`;
  if (n.startsWith('t:')) return `${KENNEY}town/${n.slice(2)}.glb`;
  if (n.startsWith('s:')) return `${KENNEY}suburban/${n.slice(2)}.glb`;
  if (n.startsWith('c:')) return `${KENNEY}commercial/${n.slice(2)}.glb`;
  if (n.startsWith('p:')) return `${POLY}${n.slice(2)}.glb`;
  return `${QUAT}${n}.gltf`;
}

/** Foliage recolour variants ("#name" suffix). */
const VARIANTS: Record<string, string> = {
  blossom: '#ff9cc6',
  golden: '#ffb347',
  dark: '#3f7a3a',
  green: '#4f9a34',
  olive: '#7d8a3a',
  snow: '#e8f1f4',
  ash: '#5f6b4c',
  autumn: '#d9772b',
  mystic: '#8f7ce0',
  cave: '#5a524a',
};

class EnvironmentAssetManager {
  private loader = new GLTFLoader();
  private base = new Map<string, Promise<Loaded>>();
  private ready = new Map<string, Loaded>();
  private textures = new Map<string, THREE.Texture>();

  /** Load (or reuse) a set of models. Failed keys are skipped, not fatal. */
  public async loadMany(keys: Iterable<string>): Promise<Map<string, Loaded>> {
    const uniq = [...new Set(keys)];
    const out = new Map<string, Loaded>();
    await Promise.all(
      uniq.map(async k => {
        try {
          out.set(k, await this.load(k));
        } catch (err) {
          console.warn('3D asset unavailable:', k, err);
        }
      })
    );
    return out;
  }

  public get(key: string): Loaded | undefined {
    return this.ready.get(key);
  }

  public load(key: string): Promise<Loaded> {
    const hit = this.base.get(key);
    if (hit) return hit;
    const [name, variant] = key.split('#');
    const p = (variant ? this.load(name).then(m => this.tinted(m, VARIANTS[variant] || variant)) : this.loadRaw(name)).then(m => {
      this.ready.set(key, m);
      return m;
    });
    this.base.set(key, p);
    p.catch(() => this.base.delete(key)); // allow a retry on the next location
    return p;
  }

  /** Kit colour-map variations (e.g. suburban roof colours). Cached and shared. */
  public texture(kitPath: string): THREE.Texture {
    let t = this.textures.get(kitPath);
    if (!t) {
      t = new THREE.TextureLoader().load(KENNEY + kitPath);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      markShared(t);
      this.textures.set(kitPath, t);
    }
    return t;
  }

  private async loadRaw(name: string): Promise<Loaded> {
    const gltf = await this.loader.loadAsync(urlFor(name));
    const isNatureKit = name.startsWith('k:');
    const isPoly = name.startsWith('p:');
    const isPlant = /tree|bush|plant|flower|grass|fern|clover|crop|lily|cactus|pine|palm|hedge|willow|birch|spruce|cypress|poplar|maple|autumn|acacia|savanna|flattop|bamboo|oak|cherry|blossom/i.test(name);
    // Mixed-author models: whole-model sway for foliage (their material names are not standardised)
    const polySway = isPoly && isPlant && !/dead|bonsai/i.test(name);
    const deepen = name.startsWith('t:') || name.startsWith('s:') || name.startsWith('c:') || isNatureKit ? 0.85 : 1;
    gltf.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      markShared(m.geometry);
      const toLambert = (mat: THREE.Material) => {
        const std = mat as THREE.MeshStandardMaterial;
        const color = isNatureKit && NATURE_PALETTE[std.name] ? new THREE.Color(NATURE_PALETTE[std.name]) : std.color.clone().multiplyScalar(deepen);
        const l = new THREE.MeshLambertMaterial({
          color,
          map: std.map,
          vertexColors: std.vertexColors,
          alphaTest: std.alphaTest,
          // Glass (greenhouses, windows) stays see-through on poly.pizza models
          transparent: isPoly && std.transparent,
          opacity: isPoly && std.transparent ? Math.max(0.35, std.opacity) : 1,
          depthWrite: !(isPoly && std.transparent),
          side: std.side,
        });
        l.name = std.name;
        if (isPlant && /leaf|leaves|flower|grass|fern/i.test(std.name)) addWindSway(l, /grass|flower/i.test(std.name) ? 0.05 : 0.018);
        else if (polySway) addWindSway(l, 0.012);
        markShared(l);
        markShared(std.map);
        return l;
      };
      m.material = Array.isArray(m.material) ? m.material.map(toLambert) : toLambert(m.material);
    });
    gltf.scene.updateMatrixWorld(true);
    if (isPoly) {
      // Authors use any origin and unit: stand the model on y=0, centred on its footprint
      const raw = new THREE.Box3().setFromObject(gltf.scene);
      const c = raw.getCenter(new THREE.Vector3());
      const root = new THREE.Group();
      gltf.scene.position.x -= c.x;
      gltf.scene.position.y -= raw.min.y;
      gltf.scene.position.z -= c.z;
      root.add(gltf.scene);
      root.updateMatrixWorld(true);
      return { scene: root, box: new THREE.Box3().setFromObject(root) };
    }
    return { scene: gltf.scene, box: new THREE.Box3().setFromObject(gltf.scene) };
  }

  /** Recolour a model's foliage (blossom pinks, autumn golds, deep forest greens, snow). */
  private tinted(model: Loaded, leafColor: string): Loaded {
    const scene = model.scene.clone(true);
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map(mat => {
        if (!/leaf|leaves|grass/i.test(mat.name)) return mat;
        const c = (mat as THREE.MeshLambertMaterial).clone();
        // Only foliage that already moved keeps moving (grass-topped rocks stay still)
        const sway = !swaying.has(mat) ? 0 : /grass/i.test(mat.name) ? 0.05 : 0.018;
        if (c.map) {
          c.color = new THREE.Color(0xffffff);
          addWindSway(c, sway, new THREE.Color(leafColor));
        } else {
          // Untextured (Kenney) foliage: just set the colour
          c.color = new THREE.Color(leafColor);
          if (sway) addWindSway(c, sway);
        }
        markShared(c);
        return c;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
    });
    scene.updateMatrixWorld(true);
    return { scene, box: model.box };
  }
}

export const environmentAssets = new EnvironmentAssetManager();

/**
 * Release everything a location created (geometry, materials, textures, instance buffers),
 * leaving the shared model cache untouched.
 */
export function disposeSceneResources(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  const freeMat = (m: THREE.Material) => {
    if (isShared(m)) return;
    for (const v of Object.values(m as unknown as Record<string, unknown>)) {
      if (v instanceof THREE.Texture && !isShared(v)) textures.add(v);
    }
    m.dispose();
  };
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if ((mesh as unknown as THREE.InstancedMesh).isInstancedMesh) (mesh as unknown as THREE.InstancedMesh).dispose();
    if (mesh.geometry && !isShared(mesh.geometry)) mesh.geometry.dispose();
    const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(freeMat);
  });
  const scene = root as THREE.Scene;
  if (scene.isScene && scene.background instanceof THREE.Texture && !isShared(scene.background)) textures.add(scene.background);
  textures.forEach(t => t.dispose());
}
