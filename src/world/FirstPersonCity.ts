/**
 * FirstPersonCity.ts
 * 3D third-person "chase camera" view of every Kanto city, route and special
 * area (forests, caves, coast, mountains).
 *
 * The camera follows behind and above your trainer. Each location's scene is
 * generated from its route data plus its LocationEnvironment config (biome
 * ground, sky, light, trees, buildings, decorations, camera), reusing the 2.5D
 * engine's collision, encounters, item pickups, discoveries, route exits,
 * portals, interaction prompts and walking partner, so gameplay is identical
 * to 2.5D.
 *
 * Only the current location is kept in memory: leaving it disposes its
 * scene-specific GPU resources (the small shared model cache stays).
 *
 * Controls: Up/Down (W/S, joystick up/down) walk forward/back, Left/Right
 * (A/D, joystick left/right) turn, A/Space/E interact, V toggles the view.
 */

import * as THREE from 'three';
import { routeExplorationEngine as eng, RouteDefinition, RouteBuilding } from '../systems/RouteExplorationEngine';
import { inputManager } from '../systems/InputManager';
import { drawTrainerSpriteCached, getTrainerById, TrainerCustomization } from '../data/characters';
import { specFor } from './BuildingVolume';
import { loadRouteModels, RouteModelsHandle, addWindSway, windTime, Solid } from './RouteModels';
import { buildGround, buildWater, planFillerTrees, GroundInfo, isOnWater, sceneryWaters } from './RouteGround';
import { createCharacter, modelForTrainer, modelForNpc, Character3D } from './Characters3D';
import { Pokemon3DLoader } from '../systems/Pokemon3DLoader';
import { pokemon3DManager } from '../systems/Pokemon3DManager';
import { RouteTree } from '../systems/RouteExplorationEngine';
import { environmentFor, LocationEnv } from './LocationEnvironment';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { buildFeatures, FeaturesHandle } from './WorldFeatures3D';
import { disposeSceneResources, markShared } from './EnvironmentAssets';

const WALK = 165;
const TURN = 2.6;
// The 2D art draws trees barely taller than people. In 3D, people are scaled
// down and trees / lamps up so the world has believable proportions.
const PEOPLE = 0.72;
const TREES = 1.9;
const LAMPS = 1.4;
const SMALL_PROPS = 0.75; // fences, benches, signs
const HERO_HEIGHT = 30;
/** Longest the loading veil may hold a location back if a model is slow. */
const LOAD_TIMEOUT_MS = 8000;
const PREF_KEY = 'pkmn.view3d';
type Dir = 'up' | 'down' | 'left' | 'right';

/** Canonical visual height of Pokémon in world units (trainer HERO_HEIGHT is 30). */
function getPokemonVisualHeight(speciesId: number, sizeClass: 0 | 1 | 2 = 0): number {
  const custom: Record<number, number> = {
    10: 12, // Caterpie (0.3m caterpillar)
    13: 12, // Weedle
    16: 15, // Pidgey (0.3m bird)
    19: 14, // Rattata (0.3m mouse)
    25: 19, // Pikachu (0.4m mascot)
    43: 15, // Oddish (0.5m plant)
    54: 22, // Psyduck (0.8m duck)
    60: 16, // Poliwag (0.6m tadpole)
    133: 17, // Eevee (0.3m)
    143: 54, // Snorlax (2.1m giant)
    131: 52, // Lapras (2.5m)
  };
  if (custom[speciesId]) return custom[speciesId];
  return [18, 26, 38][sizeClass];
}

/**
 * Remove a character from the scene and free what it owns on the GPU. Geometry and
 * materials are shared with the Characters3D cache; each clone's skeleton owns a bone texture.
 */
function releaseCharacter(scene: THREE.Object3D, c: Character3D): void {
  scene.remove(c.object);
  c.object.traverse(o => {
    const sk = (o as THREE.SkinnedMesh).skeleton;
    if ((o as THREE.SkinnedMesh).isSkinnedMesh && sk) sk.dispose();
  });
}

/** Phones / tablets: a lighter detail tier (shorter draw distance, thinner ground cover, lower pixel ratio). */
const MOBILE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

function lighterForMobile(env: LocationEnv): LocationEnv {
  const k = 0.8;
  return { ...env, drawDistance: env.drawDistance * k, fog: { ...env.fog, near: env.fog.near * k, far: env.fog.far * k } };
}

/** World-space bounds of a model as rendered: skinned meshes use their current bone pose. */
function renderedBounds(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  root.traverse(o => {
    const sk = (o as THREE.SkinnedMesh).skeleton;
    if ((o as THREE.SkinnedMesh).isSkinnedMesh && sk) sk.update();
  });
  return new THREE.Box3().setFromObject(root, true);
}

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

function writePref(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
}

class FirstPersonCity {
  public active = false;
  /** The player's choice (3D by default); remembered so the view comes back after battles, shops and menus. */
  private wanted = readPref();
  private unsupported = false;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  /** Location the current scene was built for. */
  private builtFor: RouteDefinition | null = null;
  private env: LocationEnv | null = null;
  private loadToken = 0;
  private veil: HTMLDivElement | null = null;
  private cam = new ThirdPersonCamera();
  private get camera(): THREE.PerspectiveCamera {
    return this.cam.camera;
  }
  private npcGroup = new THREE.Group();
  private pokemonTexCache = new Map<number, THREE.Texture>();
  private partner: THREE.Sprite | null = null;
  private partnerShadow: THREE.Mesh | null = null;
  private partnerSpecies = -1;
  private partnerPos = new THREE.Vector3();
  private partnerInitialized = false;
  private hero: THREE.Sprite | null = null;
  private heroShadow: THREE.Mesh | null = null;
  private heroFrames = new Map<string, THREE.CanvasTexture>();
  private heroLook: TrainerCustomization | null = null;
  public yaw = 0;
  // Billboard art that the 3D models replace once they have loaded
  private treeSprites: THREE.Sprite[] = [];
  private stoneSprites: THREE.Sprite[] = [];
  private fenceMeshes: THREE.Mesh[] = [];
  private houseParts = new Map<RouteBuilding, THREE.Object3D[]>();
  private models: RouteModelsHandle | null = null;
  private features: FeaturesHandle | null = null;
  private ground: GroundInfo | null = null;
  private bladeMeshes: THREE.Object3D[] = [];
  private waterUpdate: ((t: number) => void) | null = null;
  /** Lawn trees added in 3D only; they collide here. */
  private fillerTrees: RouteTree[] = [];
  /** Rock formations, tents, windmills... added in 3D only; they collide here. */
  private solids: Solid[] = [];
  // Billboards / boxes replaced by 3D models once they load
  private propSprites: THREE.Object3D[] = [];
  private ledgeMeshes: THREE.Object3D[] = [];
  /** Lantern carried underground. */
  private lantern: THREE.PointLight | null = null;
  // Animated 3D people (fall back to the sprites until loaded)
  private heroModel: Character3D | null = null;
  private heroModelKey = '';
  private heroYaw = Math.PI;
  private npcModels: { c: Character3D; x: number; z: number; facing: number; sprite: THREE.Object3D | null }[] = [];
  private npcToken = 0;
  /** Walking partner as the same 3D model used in battles (sprite stays as fallback). */
  private partner3D: { obj: THREE.Object3D; mixer: THREE.AnimationMixer; idle?: THREE.AnimationAction; walk?: THREE.AnimationAction; on?: THREE.AnimationAction } | null = null;
  private partner3DSpecies = -1;
  private walkPhase = 0;
  private raf = 0;
  private last = 0;
  private hinted = false;

  public isAvailable(): boolean {
    return !this.unsupported && !!eng.currentRoute && !!document.getElementById('route')?.classList.contains('on');
  }

  public toggle(): void {
    if (this.active) {
      this.wanted = false;
      writePref(false);
      this.exit(true);
    } else {
      this.wanted = true;
      writePref(true);
      this.enter();
    }
  }

  public enter(): void {
    if (this.active || !this.isAvailable()) return;
    if (!this.ensureRenderer()) return;
    const route = eng.currentRoute!;
    if (this.builtFor !== route || !this.scene) {
      this.load(route);
      this.faceIntoLocation(route);
    }
    this.refreshDynamic(route);
    eng.stop();
    document.getElementById('route-viewport')!.appendChild(this.renderer!.domElement);
    this.resize();
    this.faceFromEngine();
    this.cam.snap(eng.player.x, eng.player.y, this.yaw, (x, z) => this.cameraBlocked(x, z));
    this.active = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    this.updateButton();
    if (!this.hinted) {
      this.hinted = true;
      this.hint('3D view', 'Up/Down walk · Left/Right turn · V to switch to 2.5D');
    }
  }

  public exit(resume: boolean): void {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.renderer?.domElement.remove();
    this.veil?.remove();
    inputManager.resetTouch();
    if (resume && document.getElementById('route')?.classList.contains('on')) eng.start();
    this.updateButton();
  }

  /** One WebGL context for the whole session; without WebGL the game stays in 2.5D. */
  private ensureRenderer(): boolean {
    if (this.renderer) return true;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.warn('WebGL unavailable, staying in 2.5D:', err);
      this.unsupported = true;
      this.updateButton();
      return false;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'fp-canvas';
    this.renderer.domElement.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      this.exit(true);
      this.builtFor = null;
    });
    return true;
  }

  /** Arriving somewhere new near a map edge: face into the location, not back out of the exit. */
  private faceIntoLocation(route: RouteDefinition): void {
    const x = eng.player.x;
    if (x < 260) eng.player.dir = 'right';
    else if (x > route.worldWidth - 260) eng.player.dir = 'left';
  }

  private faceFromEngine(): void {
    const d = eng.player.dir;
    this.yaw = d === 'up' ? 0 : d === 'down' ? Math.PI : d === 'left' ? Math.PI / 2 : -Math.PI / 2;
    this.heroYaw = this.yaw + Math.PI;
    this.partnerInitialized = false;
  }

  // -------------------------------------------------------------- location lifecycle
  /** Replace the scene with `route`'s environment (previous location is disposed). */
  private load(route: RouteDefinition): void {
    this.teardown();
    this.env = MOBILE ? lighterForMobile(environmentFor(route)) : environmentFor(route);
    this.cam.configure(this.env.camera);
    this.showVeil(route.name);
    this.build(route);
    this.builtFor = route;
  }

  /** Release everything the current location created; keep the trainer, partner and shared caches. */
  private teardown(): void {
    const scene = this.scene;
    this.loadToken++;
    if (!scene) return;
    if (this.heroModel) scene.remove(this.heroModel.object);
    if (this.partner3D) scene.remove(this.partner3D.obj);
    for (const n of this.npcModels) releaseCharacter(scene, n.c);
    this.npcModels = [];
    this.npcToken++;
    disposeSceneResources(scene);
    scene.clear();
    this.npcGroup = new THREE.Group();
    this.scene = null;
    this.builtFor = null;
    this.models = null;
    this.features = null;
    this.ground = null;
    this.waterUpdate = null;
    this.lantern = null;
    this.treeSprites = [];
    this.stoneSprites = [];
    this.fenceMeshes = [];
    this.houseParts.clear();
    this.bladeMeshes = [];
    this.fillerTrees = [];
    this.solids = [];
    this.propSprites = [];
    this.ledgeMeshes = [];
    this.occluders = [];
    this.hero = null;
    this.heroShadow = null;
    this.partner = null;
    this.partnerShadow = null;
    this.partnerSpecies = -1;
  }

  private showVeil(name: string): void {
    const vp = document.getElementById('route-viewport');
    if (!vp) return;
    if (!this.veil) {
      this.veil = document.createElement('div');
      this.veil.className = 'fp-veil';
    }
    this.veil.innerHTML = `<div class="fp-veil-card"><b></b><span>Loading 3D world…</span><i></i></div>`;
    this.veil.querySelector('b')!.textContent = name;
    this.veil.classList.remove('out');
    vp.appendChild(this.veil);
  }

  private hideVeil(token: number): void {
    if (token !== this.loadToken || !this.veil) return;
    this.veil.classList.add('out');
    const v = this.veil;
    setTimeout(() => {
      if (v.classList.contains('out')) v.remove();
    }, 400);
  }

  // -------------------------------------------------------------- scene build
  private build(route: RouteDefinition): void {
    const env = this.env!;
    const scene = new THREE.Scene();
    this.scene = scene;

    const sky = document.createElement('canvas');
    sky.width = 2;
    sky.height = 256;
    const sg = sky.getContext('2d')!;
    const grad = sg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, env.sky[0]);
    grad.addColorStop(0.55, env.sky[1]);
    grad.addColorStop(1, env.sky[2]);
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(sky);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.Fog(env.fog.color, env.fog.near, env.fog.far); // matches the model culling distance

    scene.add(new THREE.HemisphereLight(env.hemi.sky, env.hemi.ground, env.hemi.intensity));
    const sun = new THREE.DirectionalLight(env.sun.color, env.sun.intensity);
    sun.position.set(...env.sun.dir);
    scene.add(sun);
    if (env.underground) {
      this.lantern = new THREE.PointLight(0xffd9a0, 1300, 320, 1.4);
      scene.add(this.lantern);
    }

    // Ground: biome ground + the route's own art (paths, plazas, shores, terrain) minus its flat lawn
    const W = route.worldWidth;
    const H = route.worldHeight;
    this.ground = buildGround(scene, route, eng.snapshotGround(route, { x: 0, y: 0, w: W, h: H }), this.renderer!.capabilities.getMaxAnisotropy(), env);
    this.waterUpdate = buildWater(scene, route, env);

    for (const b of route.buildings) this.houseParts.set(b, this.addBuilding(route, b));
    this.addLedges(route);
    this.addTallGrass(route);

    const props = eng.worldProps(route);
    const treeMats = new Map<string, THREE.SpriteMaterial>();
    for (const t of props.trees) {
      const scale = Math.round((t.scale || 1) * 10) / 10;
      const key = `${t.type}|${t.colorVariant}|${scale}`;
      let mat = treeMats.get(key);
      if (!mat) {
        const proto = { x: 0, y: 0, scale, type: t.type, colorVariant: t.colorVariant };
        mat = this.material(180, 230, 90, 212, 0, eng.getTreeTrunkFootY(proto), ctx => eng.paintProp(ctx, route, 'tree', proto));
        treeMats.set(key, mat);
      }
      this.treeSprites.push(this.addSprite(mat, 180, 230, 90, 212, t.x, eng.getTreeTrunkFootY(t), scene, TREES));
    }
    for (const s of props.stones) this.stoneSprites.push(this.addSprite(this.material(60, 56, 30, 44, s.x, s.y + s.radius * 0.4, c => eng.paintProp(c, route, 'stone', s)), 60, 56, 30, 44, s.x, s.y + s.radius * 0.4));
    for (const l of route.streetlamps || []) this.propSprites.push(this.addSprite(this.material(40, 56, 20, 50, l.x, l.y + 2, c => eng.paintProp(c, route, 'lamp', l)), 40, 56, 20, 50, l.x, l.y + 2, scene, LAMPS));
    for (const bn of route.benches || []) {
      const w = (bn.w || 28) + 12;
      this.propSprites.push(this.addSprite(this.material(w, 30, w / 2, 24, bn.x + w / 2 - 6, bn.y + 14, c => eng.paintProp(c, route, 'bench', bn)), w, 30, w / 2, 24, bn.x + w / 2 - 6, bn.y + 14, scene, SMALL_PROPS));
    }
    for (const sp of route.signposts || []) this.propSprites.push(this.addSprite(this.material(50, 46, 25, 40, sp.x, sp.y + 16, c => eng.paintProp(c, route, 'sign', sp)), 50, 46, 25, 40, sp.x, sp.y + 16, scene, SMALL_PROPS));
    for (const f of props.fences) {
      const w = f.w + 12;
      const h = 34;
      const mat = this.material(w, h, 6, h - 10, f.x, f.y + f.h, c => eng.paintProp(c, route, 'fence', f), true) as unknown as THREE.MeshBasicMaterial;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.scale.y = SMALL_PROPS;
      mesh.position.set(f.x - 6 + w / 2, (h / 2 - 10) * SMALL_PROPS, f.y + f.h);
      scene.add(mesh);
      this.fenceMeshes.push(mesh);
    }
    scene.add(this.npcGroup);

    // Caves, bridges, waterfalls, portals, landmarks, crystals, items, boards...
    this.features = buildFeatures({
      scene,
      route,
      env,
      world: eng,
      pokemonTexture: (id, cb) => this.loadPokemonTexture(id, cb),
      label: (text, x, z, y) => this.nameTag(text, x, z, y),
    });

    this.heroShadow = this.blobShadow(11 * PEOPLE);
    this.partnerShadow = this.blobShadow(9);
    scene.add(this.heroShadow, this.partnerShadow);
    // The trainer and partner models survive location changes
    if (this.heroModel) scene.add(this.heroModel.object);
    if (this.partner3D) scene.add(this.partner3D.obj);
    this.loadModels(route, props);
  }

  /** Swap billboard trees/rocks/fences/houses for 3D models; keep the billboards if loading fails. */
  private loadModels(route: RouteDefinition, props: ReturnType<typeof eng.worldProps>): void {
    const token = this.loadToken;
    const env = this.env!;
    const extraTrees = planFillerTrees(route, props.trees, (x, y) => this.canPlant(x, y, route), env);
    const timeout = setTimeout(() => this.hideVeil(token), LOAD_TIMEOUT_MS);
    loadRouteModels({
      scene: this.scene!,
      route,
      env,
      trees: props.trees,
      treeFootY: t => eng.getTreeTrunkFootY(t),
      stones: props.stones,
      fences: props.fences,
      isFreeGround: (x, y) => !eng.isPointOnRoad(x, y - 8, route) && !eng.isBlocked(x, y - 8, route),
      canPlant: (x, y) => this.canPlant(x, y, route),
      isLawn: (x, y) => !!this.ground?.isLawn(x, y),
      isRoad: (x, y) => eng.isPointOnRoad(x, y, route),
      scale: { trees: 1.6, props: SMALL_PROPS },
      groundCover: MOBILE ? 0.6 : 1,
      waters: sceneryWaters(route, env),
      extraTrees,
      isDirtPath: p => (p.style ?? 'dirt') === 'dirt',
      signText: b => (b.type === 'center' ? 'Pokémon Center' : b.type === 'mart' ? 'Poké Mart' : b.label.replace(/\s*\(.*\)\s*/, '')),
    })
      .then(handle => {
        if (token !== this.loadToken || !this.scene) return; // the player already moved on
        const drop = (o: THREE.Object3D) => this.scene!.remove(o);
        [...this.treeSprites, ...this.stoneSprites, ...this.fenceMeshes].forEach(drop);
        const gone = new Set<THREE.Object3D>([...this.treeSprites, ...this.stoneSprites]);
        this.occluders = this.occluders.filter(o => !gone.has(o));
        for (const b of handle.houses) this.houseParts.get(b)?.forEach(drop);
        this.bladeMeshes.forEach(drop); // replaced by real 3D grass clumps
        this.fillerTrees = extraTrees.inner;
        this.solids = handle.solids;
        if (handle.propsReplaced) {
          this.propSprites.forEach(drop);
          const gone2 = new Set(this.propSprites);
          this.occluders = this.occluders.filter(o => !gone2.has(o));
        }
        this.ledgeMeshes.forEach(drop); // replaced by the rock embankment
        this.models = handle;
        // Dropped billboards still own GPU memory: free it now
        const dropped = new THREE.Group();
        [...this.treeSprites, ...this.stoneSprites, ...this.fenceMeshes, ...this.bladeMeshes, ...this.ledgeMeshes, ...(handle.propsReplaced ? this.propSprites : [])].forEach(o => dropped.add(o));
        for (const b of handle.houses) this.houseParts.get(b)?.forEach(o => dropped.add(o));
        disposeSceneResources(dropped);
        this.treeSprites = [];
        this.stoneSprites = [];
        this.fenceMeshes = [];
        this.bladeMeshes = [];
        this.ledgeMeshes = [];
        if (handle.propsReplaced) this.propSprites = [];
      })
      .catch(err => console.warn('3D models unavailable, keeping billboard art:', err))
      .finally(() => {
        clearTimeout(timeout);
        // Compile shaders before the veil lifts so the first frames don't hitch
        if (token === this.loadToken && this.scene && this.renderer) {
          try {
            this.renderer.compile(this.scene, this.camera);
          } catch {
            /* compile is only a warm-up */
          }
        }
        this.hideVeil(token);
      });
  }

  private blobShadow(r: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1, 0.55, 1);
    return m;
  }

  /** Paint 2.5D artwork (world coords) into a texture so world point (ax, ay) lands on pixel (px, py). */
  private material(w: number, h: number, px: number, py: number, ax: number, ay: number, draw: (c: CanvasRenderingContext2D) => void, mesh = false): THREE.SpriteMaterial {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * 2);
    c.height = Math.ceil(h * 2);
    const ctx = c.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.translate(px - ax, py - ay);
    draw(ctx);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Alpha-test (not blending) keeps correct depth and drops the flat 2.5D ground shadows
    if (mesh) return new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide }) as unknown as THREE.SpriteMaterial;
    return new THREE.SpriteMaterial({ map: tex, alphaTest: 0.45 });
  }

  /** Upright props / people that should vanish when they come right up against the camera lens. */
  private occluders: THREE.Sprite[] = [];

  private addSprite(mat: THREE.SpriteMaterial, w: number, h: number, px: number, py: number, x: number, z: number, group: THREE.Object3D = this.scene!, k = 1): THREE.Sprite {
    const s = new THREE.Sprite(mat);
    this.occluders.push(s);
    s.center.set(px / w, 1 - py / h);
    s.scale.set(w * k, h * k, 1);
    s.position.set(x, 0, z);
    group.add(s);
    return s;
  }

  /** Box + roof volume with the original facade artwork on the front (until the 3D model loads). */
  private addBuilding(route: RouteDefinition, b: RouteBuilding): THREE.Object3D[] {
    const scene = this.scene!;
    const spec = specFor(b);
    const front = b.y + b.h;
    const depth = spec.depth;
    const eaveH = b.h - spec.eave;
    const apexH = b.h - spec.apex;
    const cx = b.x + b.w / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, Math.max(8, eaveH), depth), new THREE.MeshLambertMaterial({ color: spec.wall }));
    body.position.set(cx, Math.max(8, eaveH) / 2, front - depth / 2 - 0.5);
    scene.add(body);
    const parts: THREE.Object3D[] = [body];
    const roofMat = new THREE.MeshLambertMaterial({ color: spec.roofLight });
    const ov = spec.overhang;
    if (spec.roof === 'flat') {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(b.w + 8, 6, depth + 4), roofMat);
      slab.position.set(cx, apexH, front - depth / 2);
      scene.add(slab);
      parts.push(slab);
    } else {
      const shape = new THREE.Shape();
      const half = b.w / 2 + ov;
      shape.moveTo(-half, 0);
      shape.lineTo(half, 0);
      shape.lineTo(0, Math.max(6, apexH - eaveH));
      shape.closePath();
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: depth + ov, bevelEnabled: false }), roofMat);
      roof.position.set(cx, eaveH, front - depth - ov * 0.6);
      scene.add(roof);
      parts.push(roof);
    }
    const fw = b.w + 48;
    const fh = b.h + 70;
    const mat = this.material(fw, fh, 24, b.h + 52, b.x, b.y + b.h, c => eng.paintProp(c, route, 'building', b), true) as unknown as THREE.MeshBasicMaterial;
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), mat);
    facade.position.set(cx, fh / 2 - 18, front + 0.6);
    scene.add(facade);
    parts.push(facade);
    return parts;
  }

  /** Terraces get a real raised rock face, with gaps left at their stairs. */
  private addLedges(route: RouteDefinition): void {
    const rock = new THREE.MeshLambertMaterial({ color: 0x7a5233 });
    const lip = new THREE.MeshLambertMaterial({ color: 0x2f7a3c });
    for (const l of route.ledges || []) {
      const segs: [number, number][] = [];
      let x0 = l.x;
      for (const c of [...(l.stairs || [])].sort((a, b) => a.x - b.x)) {
        segs.push([x0, c.x]);
        x0 = c.x + c.w;
      }
      segs.push([x0, l.x + l.w]);
      for (const [a, b] of segs) {
        if (b - a < 4) continue;
        const face = new THREE.Mesh(new THREE.BoxGeometry(b - a, 14, l.h), rock);
        face.position.set((a + b) / 2, 7, l.y + l.h / 2);
        const top = new THREE.Mesh(new THREE.BoxGeometry(b - a, 2, l.h + 2), lip);
        top.position.set((a + b) / 2, 14.5, l.y + l.h / 2);
        this.scene!.add(face, top);
        this.ledgeMeshes.push(face, top);
      }
    }
  }

  /** Tall-grass beds become real blades (two instanced draw calls for the whole route). */
  private addTallGrass(route: RouteDefinition): void {
    if (!route.grassPatches.some(p => p.style !== 'rubble')) return;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 9; i++) {
      const x = 6 + i * 6.5;
      g.fillStyle = i % 3 === 0 ? '#2d6a3e' : i % 3 === 1 ? '#40916c' : '#52b788';
      g.beginPath();
      g.moveTo(x - 4, 64);
      g.lineTo(x + Math.sin(i) * 5, 10 + (i % 4) * 6);
      g.lineTo(x + 4, 64);
      g.closePath();
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    addWindSway(mat, 0.12);
    const geo = new THREE.PlaneGeometry(22, 16);
    geo.translate(0, 8, 0);
    const spots: [number, number][] = [];
    for (const p of route.grassPatches) {
      if (p.style === 'rubble') continue;
      for (let y = p.y + 8; y < p.y + p.h - 4; y += 15) {
        for (let x = p.x + 8; x < p.x + p.w - 4; x += 15) {
          const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const j = h - Math.floor(h);
          spots.push([x + (j - 0.5) * 8, y + (((j * 7) % 1) - 0.5) * 8]);
        }
      }
    }
    if (!spots.length) return;
    const m4 = new THREE.Matrix4();
    for (const rot of [0.4, 0.4 + Math.PI / 2]) {
      const inst = new THREE.InstancedMesh(geo, mat, spots.length);
      spots.forEach(([x, z], i) => {
        m4.makeRotationY(rot + (i % 5) * 0.3);
        m4.setPosition(x, 0, z);
        inst.setMatrixAt(i, m4);
      });
      this.scene!.add(inst);
      this.bladeMeshes.push(inst);
    }
  }

  // -------------------------------------------------------------- dynamic
  /** Name label with a constant on-screen size (never balloons near the camera). */
  private nameTag(text: string, x: number, z: number, yOffset = 46 * PEOPLE): THREE.Sprite {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    ctx.font = '700 22px system-ui, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 28;
    c.width = w;
    c.height = 34;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(10, 15, 28, 0.85)';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, 18);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthWrite: false, transparent: true }));
    tag.center.set(0.5, 0);
    tag.position.set(x, yOffset, z);
    tag.userData.ratio = w / 34;
    tag.userData.isTag = true;
    return tag;
  }

  /** Every name tag in the scene (NPCs + portals / landmarks / boards). */
  private allTags(): THREE.Object3D[] {
    return [...this.npcGroup.children.filter(o => o.userData.isTag), ...(this.features?.tags || [])];
  }

  private sizeTags(): void {
    const h = 0.03; // fraction of the viewport (clip-space units)
    for (const o of this.allTags()) (o as THREE.Sprite).scale.set((h * o.userData.ratio) / this.camera.aspect, h, 1);
  }

  /** Loads high-definition 3D illustration / HOME CG model render with caching and transparent linear filtering. */
  private loadPokemonTexture(id: number, cb: (tex: THREE.Texture) => void): void {
    const cached = this.pokemonTexCache.get(id);
    if (cached) {
      cb(cached);
      return;
    }
    const urls = [
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    ];
    const loader = new THREE.TextureLoader();
    const tryUrl = (i: number) => {
      if (i >= urls.length) return;
      loader.load(
        urls[i],
        tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          markShared(tex); // survives location changes
          this.pokemonTexCache.set(id, tex);
          cb(tex);
        },
        undefined,
        () => tryUrl(i + 1)
      );
    };
    tryUrl(0);
  }

  private heroTexture(dir: Dir, frame: number): THREE.CanvasTexture {
    const key = dir + frame;
    let t = this.heroFrames.get(key);
    if (!t) {
      const c = document.createElement('canvas');
      c.width = 88;
      c.height = 112;
      const ctx = c.getContext('2d')!;
      ctx.scale(2, 2);
      drawTrainerSpriteCached(ctx, 22, 40, dir, frame, this.heroLook!, false, 0, 1);
      t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      markShared(t); // reused by every location
      this.heroFrames.set(key, t);
    }
    return t;
  }

  private refreshDynamic(route: RouteDefinition): void {
    const scene = this.scene!;
    // The trainer's frames follow the current cosmetics
    const look = eng.playerAppearance || getTrainerById(eng.selectedTrainerId);
    if (look !== this.heroLook) {
      this.heroLook = look;
      this.heroFrames.forEach(t => t.dispose());
      this.heroFrames.clear();
      if (this.hero) {
        (this.hero.material as THREE.SpriteMaterial).map = this.heroTexture('up', 0);
        (this.hero.material as THREE.SpriteMaterial).needsUpdate = true;
      }
    }
    if (!this.hero) {
      this.hero = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heroTexture('up', 0), alphaTest: 0.45 }));
      this.hero.center.set(0.5, 1 - 53 / 56);
      this.hero.scale.set(44 * PEOPLE, 56 * PEOPLE, 1);
      this.hero.visible = !this.heroModel;
      scene.add(this.hero);
    }
    // Animated 3D trainer wearing the chosen outfit colours
    const heroKey = modelForTrainer(eng.selectedTrainerId) + '|' + look.palette.topMain + '|' + look.palette.bottomMain;
    if (heroKey !== this.heroModelKey) {
      this.heroModelKey = heroKey;
      createCharacter(modelForTrainer(eng.selectedTrainerId), HERO_HEIGHT, { top: look.palette.topMain, bottom: look.palette.bottomMain })
        .then(c => {
          if (this.heroModelKey !== heroKey || !this.scene) return;
          if (this.heroModel) releaseCharacter(this.scene, this.heroModel);
          this.heroModel = c;
          this.scene.add(c.object);
          if (this.hero) this.hero.visible = false;
        })
        .catch(err => console.warn('Trainer model unavailable, keeping sprite:', err));
    }

    const token = ++this.npcToken;
    for (const n of this.npcModels) releaseCharacter(scene, n.c);
    this.npcModels = [];
    for (const o of [...this.npcGroup.children]) {
      const m = (o as THREE.Sprite).material as THREE.SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.npcGroup.remove(o);
      this.occluders = this.occluders.filter(x => x !== o);
    }

    for (const n of eng.visibleNPCs()) {
      const w = 110;
      const h = 80;
      const mat = this.material(w, h, w / 2, 68, n.x, n.y + 13, c => eng.paintProp(c, route, 'npc', { ...n, facing: 'down' }));
      const sprite = this.addSprite(mat, w, h, w / 2, 68, n.x, n.y + 13, this.npcGroup, PEOPLE);
      this.npcGroup.add(this.nameTag(n.name, n.x, n.y + 13));
      const facing = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[n.facing || 'down'];
      createCharacter(modelForNpc(n.id, n.name), HERO_HEIGHT * 0.97)
        .then(c => {
          if (token !== this.npcToken || !this.scene) return;
          c.object.position.set(n.x, 0, n.y + 10);
          c.object.rotation.y = facing;
          this.scene.add(c.object);
          sprite.visible = false;
          this.occluders = this.occluders.filter(o => o !== sprite);
          this.npcModels.push({ c, x: n.x, z: n.y + 10, facing, sprite });
        })
        .catch(() => { });
    }

    this.partnerInitialized = false;
    const info = eng.companion.info;
    if (!info) {
      if (this.partner) this.partner.visible = false;
      if (this.partner3D) this.partner3D.obj.visible = false;
      if (this.partnerShadow) this.partnerShadow.visible = false;
    } else {
      const vHeight = getPokemonVisualHeight(info.speciesId, info.sizeClass);
      const spriteSize = vHeight / 0.55;
      if (info.speciesId !== this.partnerSpecies || !this.partner) {
        this.partnerSpecies = info.speciesId;
        if (this.partner) scene.remove(this.partner);
        this.partner = new THREE.Sprite(new THREE.SpriteMaterial({ alphaTest: 0.35, transparent: true }));
        this.partner.center.set(0.5, 0.10);
        this.partner.scale.set(spriteSize, spriteSize, 1);
        scene.add(this.partner);
        this.loadPokemonTexture(info.speciesId, tex => {
          if (this.partner && this.partnerSpecies === info.speciesId) {
            (this.partner.material as THREE.SpriteMaterial).map = tex;
            (this.partner.material as THREE.SpriteMaterial).needsUpdate = true;
          }
        });
      }
      this.partner!.visible = !this.partner3D;
      if (this.partner3D) this.partner3D.obj.visible = true;
      this.partnerShadow!.visible = true;
      if (info.speciesId !== this.partner3DSpecies && pokemon3DManager.isEnabled()) {
        const species = info.speciesId;
        this.partner3DSpecies = species;
        if (this.partner3D) scene.remove(this.partner3D.obj);
        this.partner3D = null;
        Pokemon3DLoader.getInstance()
          .loadPokemon(species)
          .then(({ model, animations }) => {
            if (this.partner3DSpecies !== species || !this.scene) return;
            const obj = new THREE.Group();
            obj.add(model);
            const mixer = new THREE.AnimationMixer(model);
            const clip = (re: RegExp) => animations.find(a => re.test(a.name.toLowerCase()));
            const idleClip = clip(/idle|wait/) || animations[0];
            const walkClip = clip(/walk|run|move/);
            // Size from the posed, skinned model as it is actually drawn (the raw bind-pose
            // bounds of these models are far larger than the rendered body, which made partners tiny)
            if (idleClip) mixer.clipAction(idleClip).play();
            mixer.update(0);
            const box = renderedBounds(model);
            const k = vHeight / Math.max(0.001, box.max.y - box.min.y);
            model.scale.multiplyScalar(k);
            model.updateMatrixWorld(true);
            const grounded = renderedBounds(model);
            model.position.y -= grounded.min.y;
            mixer.stopAllAction();
            this.partner3D = { obj, mixer, idle: idleClip && mixer.clipAction(idleClip), walk: walkClip && mixer.clipAction(walkClip) };
            this.scene.add(obj);
            if (this.partner) this.partner.visible = false;
          })
          .catch(() => { }); // no model for this species: keep the 3D illustration
      }
    }

    this.sizeTags();
  }

  // -------------------------------------------------------------- loop
  private tick = (now: number): void => {
    if (!this.active) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    const t = now / 1000;
    windTime.value = t;
    this.waterUpdate?.(t);
    this.last = now;
    const route = eng.currentRoute;
    // Battles, shops and menus hand control back to the 2.5D screens
    if (!route || !document.getElementById('route')?.classList.contains('on')) {
      this.exit(false);
      return;
    }
    // Travelled (portal, fast travel, route exit): build the new location in place
    if (route !== this.builtFor) {
      this.load(route);
      this.refreshDynamic(route);
      this.faceIntoLocation(route);
      this.faceFromEngine();
      this.cam.snap(eng.player.x, eng.player.y, this.yaw, (x, z) => this.cameraBlocked(x, z));
    }

    // Only one world loop at a time: anything that restarted the 2.5D loop (e.g. closing the map) is stopped again
    eng.stop();
    const busy =
      eng.isPaused ||
      document.getElementById('ov')?.style.display === 'flex' ||
      !!document.querySelector('.xp-sheet, .kanto-map-modal-overlay') ||
      !!(this.veil && this.veil.isConnected && !this.veil.classList.contains('out'));
    const p = eng.player;
    let moving = false;
    let turning = 0;
    let backwards = false;
    if (!busy) {
      const m = inputManager.getMovement();
      turning = Math.abs(m.dx) > 0.15 ? Math.sign(m.dx) : 0;
      this.yaw -= m.dx * TURN * dt;
      const step = -m.dy * WALK * dt;
      if (Math.abs(step) > 0.01) {
        const nx = p.x - Math.sin(this.yaw) * step;
        const ny = p.y - Math.cos(this.yaw) * step;
        if (!this.blocked(nx, p.y, route)) p.x = nx;
        if (!this.blocked(p.x, ny, route)) p.y = ny;
        moving = true;
        backwards = step < 0;
      }
    }

    // World-facing direction for NPCs / interactions
    const a = ((this.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    p.dir = a < Math.PI / 4 || a >= (7 * Math.PI) / 4 ? 'up' : a < (3 * Math.PI) / 4 ? 'left' : a < (5 * Math.PI) / 4 ? 'down' : 'right';

    // Encounters, item pickups, discoveries, portals and route exits: same rules as 2.5D
    if (!busy && eng.tickWorld(dt, moving)) {
      // A battle or route change just started. Keep the 3D view running: the
      // engine pauses itself, and a location change is picked up next frame.
      if (!document.getElementById('route')?.classList.contains('on')) {
        this.exit(false);
        return;
      }
    }

    // Trainer sprite relative to the camera: back view while walking, side view while turning
    this.walkPhase += moving ? dt : 0;
    const frame = moving ? Math.floor(this.walkPhase / 0.12) % 4 : 0;
    const viewDir: Dir = backwards ? 'down' : turning && !moving ? (turning < 0 ? 'left' : 'right') : 'up';
    const mat = this.hero!.material as THREE.SpriteMaterial;
    const tex = this.heroTexture(viewDir, frame);
    if (mat.map !== tex) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    this.hero!.position.set(p.x, 0, p.y + 13);
    this.heroShadow!.position.set(p.x, 0.3, p.y + 13);
    // Lantern held out ahead of the trainer: lights the way rather than the hat
    if (this.lantern) this.lantern.position.set(p.x - Math.sin(this.yaw) * 22, 34, p.y + 10 - Math.cos(this.yaw) * 22);
    if (this.heroModel) {
      // Face the direction of travel (toward the camera when stepping back)
      const want = backwards ? this.yaw : this.yaw + Math.PI;
      let d = want - this.heroYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heroYaw += d * Math.min(1, dt * 12);
      this.heroModel.object.position.set(p.x, 0, p.y + 10);
      this.heroModel.object.rotation.y = this.heroYaw;
      this.heroModel.setAction(moving ? 'walk' : 'idle');
      this.heroModel.update(dt * (moving ? 1.25 : 1));
    }
    for (const n of this.npcModels) {
      const dx = p.x - n.x;
      const dz = p.y + 10 - n.z;
      const target = Math.hypot(dx, dz) < 120 ? Math.atan2(dx, dz) : n.facing;
      let d = target - n.c.object.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      n.c.object.rotation.y += d * Math.min(1, dt * 6);
      n.c.update(dt);
    }

    if ((this.partner || this.partner3D) && eng.companion.info) {
      // Forward and right vectors relative to trainer's facing direction
      const fX = -Math.sin(this.heroYaw);
      const fZ = -Math.cos(this.heroYaw);
      const rX = -fZ; // 90 deg right
      const rZ = fX;

      // Position beside trainer: 18 units to the right, 4 units back
      let sideDist = 18;
      const trailDist = 4;
      let targetX = p.x + rX * sideDist - fX * trailDist;
      let targetZ = p.y + 10 + rZ * sideDist - fZ * trailDist;

      // If the right side is blocked by wall/tree, flip to the left side
      if (route && this.blocked(targetX, targetZ, route)) {
        sideDist = -18;
        targetX = p.x + rX * sideDist - fX * trailDist;
        targetZ = p.y + 10 + rZ * sideDist - fZ * trailDist;
      }

      if (!this.partnerInitialized) {
        this.partnerPos.set(targetX, 0, targetZ);
        this.partnerInitialized = true;
      } else {
        const k = moving ? Math.min(1, dt * 10) : Math.min(1, dt * 6);
        this.partnerPos.x += (targetX - this.partnerPos.x) * k;
        this.partnerPos.z += (targetZ - this.partnerPos.z) * k;
      }

      const hop = moving ? Math.abs(Math.sin(this.walkPhase * 11)) * 2.5 : 0;
      if (this.partner) {
        this.partner.position.set(this.partnerPos.x, hop, this.partnerPos.z);
        this.partner.visible = !this.partner3D;
      }
      if (this.partner3D) {
        const pp = this.partner3D;
        pp.obj.position.set(this.partnerPos.x, 0, this.partnerPos.z);
        pp.obj.rotation.y = this.heroYaw;
        const next = moving && pp.walk ? pp.walk : pp.idle;
        if (next && next !== pp.on) {
          next.reset().play();
          if (pp.on) pp.on.crossFadeTo(next, 0.2, false);
          pp.on = next;
        }
        pp.mixer.update(dt * (moving && !pp.walk ? 1.8 : 1));
      }
      if (this.partnerShadow) {
        this.partnerShadow.position.set(this.partnerPos.x, 0.25, this.partnerPos.z);
        this.partnerShadow.visible = true;
      }

      // Synchronize 2D companion coordinates for interactions
      eng.companion.x = this.partnerPos.x;
      eng.companion.y = this.partnerPos.z;
    }
    eng.refreshPrompt();
    this.features?.update(t, dt, p.x, p.y);

    this.cam.update(p.x, p.y, this.yaw, 1 - Math.exp(-dt * 5), 1 - Math.exp(-dt * 8), (x, z) => this.cameraBlocked(x, z), 1 - Math.exp(-dt * 30));
    // Anything standing right in front of the lens is hidden so it never blocks the view of the trainer
    const cp = this.camera.position;
    const clear = Math.min(90, this.cam.dist * 0.7); // anything this close to the lens sits between camera and trainer
    this.models?.updateOcclusion(cp.x, cp.z, clear);
    for (const o of this.occluders) o.visible = Math.hypot(o.position.x - cp.x, o.position.z - cp.z) > clear;
    for (const n of this.npcModels) n.c.object.visible = Math.hypot(n.x - cp.x, n.z - cp.z) > clear;
    for (const o of this.allTags()) {
      const d = Math.hypot(o.position.x - cp.x, o.position.z - cp.z);
      o.visible = o.userData.allowed !== false && d > clear && d < 650;
    }
    this.renderer!.render(this.scene!, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Solid for the camera boom: buildings, large decorations, cave rock. */
  private cameraBlocked(x: number, z: number): boolean {
    const route = this.builtFor;
    if (!route) return false;
    if (route.buildings.some(b => x > b.x - 6 && x < b.x + b.w + 6 && z > b.y - 6 && z < b.y + b.h + 6)) return true;
    if (this.solids.some(s => s.r >= 16 && Math.hypot(x - s.x, z - s.z) < s.r * 0.9)) return true;
    return !!this.features?.cameraBlocked(x, z);
  }

  /** Open lawn well away from paths, tall grass, buildings, water and anything you can interact with. */
  private canPlant(x: number, y: number, route: RouteDefinition): boolean {
    if (eng.isBlocked(x, y - 8, route)) return false;
    for (const [dx, dy] of [[0, 0], [46, 0], [-46, 0], [0, 46], [0, -46], [32, 32], [-32, 32], [32, -32], [-32, -32]]) {
      if (eng.isPointOnRoad(x + dx, y + dy - 8, route)) return false;
    }
    const near = (r: { x: number; y: number; w: number; h: number }, m: number) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;
    if (route.grassPatches.some(g => near(g, 34))) return false;
    if (route.buildings.some(b => near(b, 70))) return false;
    if ((route.ponds || []).some(p => near(p, 46))) return false;
    if (isOnWater(route, x, y, 46)) return false;
    if ((route.bridges || []).some(b => near(b, 40))) return false;
    if ((route.ledges || []).some(l => near(l, 30))) return false;
    if ((route.barriers || []).some(b => near(b, 40))) return false;
    const spots: { x: number; y: number }[] = [
      ...route.npcs,
      ...route.items,
      ...(route.signposts || []),
      ...(route.fountains || []),
      ...(route.noticeBoards || []),
      ...(route.portals || []),
      ...(route.landmarks || []),
      ...(route.crystals || []),
      ...(route.fishingSpots || []),
      ...(route.boulders || []),
      ...(route.switches || []),
      ...(route.staticEncounters || []),
      ...(route.lostPokemon || []),
      { x: route.startX, y: route.startY },
    ];
    if (spots.some(o => Math.hypot(o.x - x, o.y - y) < 80)) return false;
    if (route.exitX > 0 && x > route.exitX - 160) return false;
    return x > 140;
  }

  /** Engine collision plus a small standoff so you never clip into building walls. */
  private blocked(x: number, y: number, route: RouteDefinition): boolean {
    if (eng.isBlocked(x, y, route)) return true;
    if (this.fillerTrees.some(t => Math.hypot(x - t.x, y + 8 - eng.getTreeTrunkFootY(t)) < 12)) return true;
    if (this.solids.some(s => Math.hypot(x - s.x, y + 8 - s.z) < s.r)) return true;
    const pad = 10;
    return route.buildings.some(b => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad - 4);
  }

  private resize(): void {
    const vp = document.getElementById('route-viewport');
    if (!vp || !this.renderer) return;
    const w = vp.clientWidth || 800;
    const h = vp.clientHeight || 480;
    this.renderer.setSize(w, h, false);
    this.cam.resize(w, h);
    this.sizeTags();
  }

  // -------------------------------------------------------------- HUD
  public updateButton(): void {
    // Bring the 3D view back after battles / menus / travel if the player is using it
    if (this.wanted && !this.active && this.isAvailable() && !eng.isPaused) this.enter();
    const btn = document.getElementById('hud-fp-btn');
    if (!btn) return;
    btn.classList.toggle('hidden', !(this.active || this.isAvailable()));
    btn.classList.toggle('on', this.active);
    btn.title = this.active ? 'Switch to 2.5D view (V)' : '3D view (V)';
    btn.setAttribute('aria-label', btn.title);
  }

  private hint(title: string, sub: string): void {
    const vp = document.getElementById('route-viewport');
    if (!vp) return;
    const el = document.createElement('div');
    el.className = 'fp-hint';
    el.innerHTML = `<b>${title}</b><span>${sub}</span>`;
    vp.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  public init(): void {
    document.getElementById('hud-fp-btn')?.addEventListener('click', () => this.toggle());
    window.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'v' && !(e.target instanceof HTMLInputElement)) this.toggle();
    });
    window.addEventListener('resize', () => this.active && this.resize());
    setInterval(() => this.updateButton(), 300);
  }
}

export const firstPersonCity = new FirstPersonCity();
