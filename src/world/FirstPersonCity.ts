/**
 * FirstPersonCity.ts
 * Optional 3D third-person "chase camera" view of Route 1 and Viridian City.
 *
 * The camera follows behind and above your trainer (GTA-style). The scene is
 * generated from the existing route data and reuses the 2.5D engine's artwork
 * (ground image, building facades, trees, props, trainer/NPC sprites) as
 * textures. Movement uses the engine's collision; grass encounters, item
 * pickups, discoveries, route exits, interaction prompts and the walking
 * partner all run through the engine, so gameplay is identical to 2.5D.
 *
 * Controls: Up/Down (W/S, joystick up/down) walk forward/back, Left/Right
 * (A/D, joystick left/right) turn, A/Space/E interact, V toggles the view.
 */

import * as THREE from 'three';
import { routeExplorationEngine as eng, RouteDefinition, RouteBuilding } from '../systems/RouteExplorationEngine';
import { inputManager } from '../systems/InputManager';
import { getRouteDefinition } from '../data/specialAreas';
import { drawTrainerSpriteCached, getTrainerById, TrainerCustomization } from '../data/characters';
import { specFor } from './BuildingVolume';
import { loadRouteModels, RouteModelsHandle, addWindSway, windTime } from './RouteModels';
import { buildGround, buildWater, planFillerTrees } from './RouteGround';
import { createCharacter, modelForTrainer, modelForNpc, Character3D } from './Characters3D';
import { Pokemon3DLoader } from '../systems/Pokemon3DLoader';
import { pokemon3DManager } from '../systems/Pokemon3DManager';
import { RouteTree } from '../systems/RouteExplorationEngine';
import { POKEMON_SPECIES_MAP } from '../data/pokemon';
import { buildEncounterMon } from '../systems/EncounterSystem';

const ROUTE_ID = 0;
const WALK = 165;
const TURN = 2.6;
const CAM_DIST = 110; // boom length behind the trainer
const CAM_HEIGHT = 62;
const LOOK_AHEAD = 50;
// The 2D art draws trees barely taller than people. In 3D, people are scaled
// down and trees / lamps up so the world has believable proportions.
const PEOPLE = 0.72;
const TREES = 1.9;
const LAMPS = 1.4;
const SMALL_PROPS = 0.75; // fences, benches, signs
const HERO_HEIGHT = 30;
const SPRITE_URL = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
type Dir = 'up' | 'down' | 'left' | 'right';

interface OverworldPokemonEntity {
  id: string;
  speciesId: number;
  name: string;
  x: number;
  z: number;
  baseY: number;
  size: number;
  sprite: THREE.Sprite;
  shadow: THREE.Mesh;
  tag: THREE.Sprite;
  model3D?: { obj: THREE.Object3D; mixer: THREE.AnimationMixer };
  phase: number;
  isStatic?: boolean;
  isLost?: boolean;
  isWild?: boolean;
  encData?: any;
}

class FirstPersonCity {
  public active = false;
  /** Remembered so the 3D view comes back after battles, shops and menus. */
  private wanted = false;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera = new THREE.PerspectiveCamera(58, 1, 8, 2600);
  private npcGroup = new THREE.Group();
  private pokemonGroup = new THREE.Group();
  private overworldPokemon: OverworldPokemonEntity[] = [];
  private pokemonTexCache = new Map<number, THREE.Texture>();
  private partner: THREE.Sprite | null = null;
  private partnerShadow: THREE.Mesh | null = null;
  private partnerSpecies = -1;
  private hero: THREE.Sprite | null = null;
  private heroShadow: THREE.Mesh | null = null;
  private heroFrames = new Map<string, THREE.CanvasTexture>();
  private heroLook: TrainerCustomization | null = null;
  public yaw = 0;
  // Billboard art that the Kenney 3D models replace once they have loaded
  private treeSprites: THREE.Sprite[] = [];
  private stoneSprites: THREE.Sprite[] = [];
  private fenceMeshes: THREE.Mesh[] = [];
  private houseParts = new Map<RouteBuilding, THREE.Object3D[]>();
  private models: RouteModelsHandle | null = null;
  private bladeMeshes: THREE.Object3D[] = [];
  private waterUpdate: ((t: number) => void) | null = null;
  /** Lawn trees added in 3D only; they collide here. */
  private fillerTrees: RouteTree[] = [];
  // Billboards / boxes replaced by 3D models once they load
  private propSprites: THREE.Object3D[] = [];
  private ledgeMeshes: THREE.Object3D[] = [];
  // Animated 3D people (fall back to the sprites until loaded)
  private heroModel: Character3D | null = null;
  private heroModelKey = '';
  private heroYaw = Math.PI;
  private npcModels: { c: Character3D; x: number; z: number; facing: number; sprite: THREE.Object3D | null }[] = [];
  private npcToken = 0;
  /** Walking partner as the same 3D model used in battles (sprite stays as fallback). */
  private partner3D: { obj: THREE.Object3D; mixer: THREE.AnimationMixer; idle?: THREE.AnimationAction; walk?: THREE.AnimationAction; on?: THREE.AnimationAction } | null = null;
  private partner3DSpecies = -1;
  private camYaw = 0;
  private camDist = CAM_DIST;
  /** Portrait phones get a longer, higher camera boom (wider view of the world). */
  private boom = 1;
  private walkPhase = 0;
  private raf = 0;
  private last = 0;

  public isAvailable(): boolean {
    const r = eng.currentRoute;
    return !!r && r.id === ROUTE_ID && !!document.getElementById('route')?.classList.contains('on');
  }

  public toggle(): void {
    if (this.active) {
      this.wanted = false;
      this.exit(true);
    } else {
      this.wanted = true;
      this.enter();
    }
  }

  public enter(): void {
    if (this.active || !this.isAvailable()) return;
    const route = getRouteDefinition(ROUTE_ID);
    if (!this.scene) this.build(route);
    this.refreshDynamic(route);
    eng.stop();
    document.getElementById('route-viewport')!.appendChild(this.renderer!.domElement);
    this.resize();
    const d = eng.player.dir;
    this.yaw = d === 'up' ? 0 : d === 'down' ? Math.PI : d === 'left' ? Math.PI / 2 : -Math.PI / 2;
    this.camYaw = this.yaw;
    this.camDist = CAM_DIST * this.boom;
    this.placeCamera(1, 1);
    this.active = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    this.updateButton();
    this.hint('3D view', 'Up/Down walk · Left/Right turn · V to switch back');
  }

  public exit(resume: boolean): void {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.renderer?.domElement.remove();
    inputManager.resetTouch();
    if (resume && document.getElementById('route')?.classList.contains('on')) eng.start();
    this.updateButton();
  }

  // -------------------------------------------------------------- scene build
  private build(route: RouteDefinition): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'fp-canvas';
    const scene = new THREE.Scene();
    this.scene = scene;

    const sky = document.createElement('canvas');
    sky.width = 2;
    sky.height = 256;
    const sg = sky.getContext('2d')!;
    const grad = sg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#5fb4ea');
    grad.addColorStop(0.55, '#a9dcf3');
    grad.addColorStop(1, '#e6f6ea');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(sky);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.Fog(0xcfe9f2, 420, 920); // matches the model culling distance

    scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x4a6b3a, 2.2));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
    sun.position.set(-1, 2.2, -0.8);
    scene.add(sun);

    // Ground: lush tiled grass + the route's own art (paths, plazas, shores) minus its flat lawn
    const W = route.worldWidth;
    const H = route.worldHeight;
    buildGround(scene, route, eng.snapshotGround(route, { x: 0, y: 0, w: W, h: H }), this.renderer.capabilities.getMaxAnisotropy());
    this.waterUpdate = buildWater(scene, route);

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
      this.treeSprites.push(this.addSprite(mat, 180, 230, 90, 212, t.x, eng.getTreeTrunkFootY(t), this.scene!, TREES));
    }
    for (const s of props.stones) this.stoneSprites.push(this.addSprite(this.material(60, 56, 30, 44, s.x, s.y + s.radius * 0.4, c => eng.paintProp(c, route, 'stone', s)), 60, 56, 30, 44, s.x, s.y + s.radius * 0.4));
    for (const l of route.streetlamps || []) this.propSprites.push(this.addSprite(this.material(40, 56, 20, 50, l.x, l.y + 2, c => eng.paintProp(c, route, 'lamp', l)), 40, 56, 20, 50, l.x, l.y + 2, this.scene!, LAMPS));
    for (const bn of route.benches || []) {
      const w = (bn.w || 28) + 12;
      this.propSprites.push(this.addSprite(this.material(w, 30, w / 2, 24, bn.x + w / 2 - 6, bn.y + 14, c => eng.paintProp(c, route, 'bench', bn)), w, 30, w / 2, 24, bn.x + w / 2 - 6, bn.y + 14, this.scene!, SMALL_PROPS));
    }
    for (const sp of route.signposts || []) this.propSprites.push(this.addSprite(this.material(50, 46, 25, 40, sp.x, sp.y + 16, c => eng.paintProp(c, route, 'sign', sp)), 50, 46, 25, 40, sp.x, sp.y + 16, this.scene!, SMALL_PROPS));
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
    scene.add(this.pokemonGroup);

    this.heroShadow = this.blobShadow(11 * PEOPLE);
    this.partnerShadow = this.blobShadow(9);
    scene.add(this.heroShadow, this.partnerShadow);
    this.loadModels(route, props);
  }

  /** Swap billboard trees/rocks/fences/houses for Kenney 3D models; keep the billboards if loading fails. */
  private loadModels(route: RouteDefinition, props: ReturnType<typeof eng.worldProps>): void {
    const extraTrees = planFillerTrees(route, props.trees, (x, y) => this.canPlant(x, y, route));
    loadRouteModels({
      scene: this.scene!,
      route,
      trees: props.trees,
      treeFootY: t => eng.getTreeTrunkFootY(t),
      stones: props.stones,
      fences: props.fences,
      isFreeGround: (x, y) => !eng.isPointOnRoad(x, y - 8, route) && !eng.isBlocked(x, y - 8, route),
      scale: { trees: 1.6, props: SMALL_PROPS },
      extraTrees,
      isDirtPath: p => (p.style ?? 'dirt') === 'dirt',
      signText: b => (b.type === 'center' ? 'Pokémon Center' : b.type === 'mart' ? 'Poké Mart' : b.label.replace(/\s*\(.*\)\s*/, '')),
    })
      .then(handle => {
        const drop = (o: THREE.Object3D) => this.scene!.remove(o);
        [...this.treeSprites, ...this.stoneSprites, ...this.fenceMeshes].forEach(drop);
        const gone = new Set<THREE.Object3D>([...this.treeSprites, ...this.stoneSprites]);
        this.occluders = this.occluders.filter(o => !gone.has(o));
        for (const b of handle.houses) this.houseParts.get(b)?.forEach(drop);
        this.bladeMeshes.forEach(drop); // replaced by real 3D grass clumps
        this.fillerTrees = extraTrees.inner;
        if (handle.propsReplaced) {
          this.propSprites.forEach(drop);
          const gone2 = new Set(this.propSprites);
          this.occluders = this.occluders.filter(o => !gone2.has(o));
        }
        this.ledgeMeshes.forEach(drop); // replaced by the rock embankment
        this.models = handle;
      })
      .catch(err => console.warn('3D models unavailable, keeping billboard art:', err));
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

  /** Box + roof volume with the original facade artwork on the front. */
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

  private sizeTags(): void {
    const h = 0.03; // fraction of the viewport (clip-space units)
    for (const o of this.npcGroup.children) {
      if (o.userData.isTag) (o as THREE.Sprite).scale.set((h * o.userData.ratio) / this.camera.aspect, h, 1);
    }
    for (const o of this.pokemonGroup.children) {
      if (o.userData.isTag) (o as THREE.Sprite).scale.set((h * o.userData.ratio) / this.camera.aspect, h, 1);
    }
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
          this.pokemonTexCache.set(id, tex);
          cb(tex);
        },
        undefined,
        () => tryUrl(i + 1)
      );
    };
    tryUrl(0);
  }

  /** Spawns a Pokemon entity in 3D: High-res 3D illustration billboard + animated 3D GLB model fallback + shadow & name tag. */
  private spawnOverworldPokemon(cfg: {
    id: string;
    speciesId: number;
    name: string;
    x: number;
    z: number;
    scale: number;
    isStatic?: boolean;
    isLost?: boolean;
    isWild?: boolean;
    encData?: any;
  }): void {
    const BASE_POKEMON_SIZE = 76;
    const size = BASE_POKEMON_SIZE * cfg.scale;
    const shadow = this.blobShadow(size * 0.22);
    shadow.position.set(cfg.x, 0.2, cfg.z);
    this.pokemonGroup.add(shadow);

    const mat = new THREE.SpriteMaterial({ alphaTest: 0.35, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.center.set(0.5, 0.10);
    sprite.scale.set(size, size, 1);
    sprite.position.set(cfg.x, 0, cfg.z);
    this.pokemonGroup.add(sprite);
    this.occluders.push(sprite);

    const tag = this.nameTag(cfg.name, cfg.x, cfg.z, Math.max(26, size * 0.8));
    this.pokemonGroup.add(tag);

    const mon: OverworldPokemonEntity = {
      id: cfg.id,
      speciesId: cfg.speciesId,
      name: cfg.name,
      x: cfg.x,
      z: cfg.z,
      baseY: 0,
      size,
      sprite,
      shadow,
      tag,
      phase: Math.random() * Math.PI * 2,
      isStatic: cfg.isStatic,
      isLost: cfg.isLost,
      isWild: cfg.isWild,
      encData: cfg.encData,
    };
    this.overworldPokemon.push(mon);

    // 1. High-Resolution 3D illustration texture
    this.loadPokemonTexture(cfg.speciesId, tex => {
      if (sprite.material) {
        (sprite.material as THREE.SpriteMaterial).map = tex;
        (sprite.material as THREE.SpriteMaterial).needsUpdate = true;
      }
    });

    // 2. Real animated 3D mesh model if enabled and available
    if (pokemon3DManager.isEnabled()) {
      Pokemon3DLoader.getInstance()
        .loadPokemon(cfg.speciesId)
        .then(({ model, animations }) => {
          if (!this.overworldPokemon.includes(mon)) return;
          const box = new THREE.Box3().setFromObject(model);
          const targetH = size * 0.55;
          const k = targetH / Math.max(0.001, box.max.y - box.min.y);
          model.scale.multiplyScalar(k);
          model.position.y = -box.min.y * k;
          const obj = new THREE.Group();
          obj.add(model);
          obj.position.set(cfg.x, 0, cfg.z);
          obj.rotation.y = Math.PI * 0.2;
          const mixer = new THREE.AnimationMixer(model);
          const clip = (re: RegExp) => animations.find(a => re.test(a.name.toLowerCase()));
          const idleClip = clip(/idle|wait/) || animations[0];
          if (idleClip) mixer.clipAction(idleClip).play();
          mon.model3D = { obj, mixer };
          this.scene!.add(obj);
          sprite.visible = false;
        })
        .catch(() => { });
    }
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
      this.heroFrames.set(key, t);
    }
    return t;
  }

  private refreshDynamic(route: RouteDefinition): void {
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
      this.scene!.add(this.hero);
    }
    // Animated 3D trainer wearing the chosen outfit colours
    const heroKey = modelForTrainer(eng.selectedTrainerId) + '|' + look.palette.topMain + '|' + look.palette.bottomMain;
    if (heroKey !== this.heroModelKey) {
      this.heroModelKey = heroKey;
      createCharacter(modelForTrainer(eng.selectedTrainerId), HERO_HEIGHT, { top: look.palette.topMain, bottom: look.palette.bottomMain })
        .then(c => {
          if (this.heroModelKey !== heroKey) return;
          if (this.heroModel) this.scene!.remove(this.heroModel.object);
          this.heroModel = c;
          this.scene!.add(c.object);
          this.hero!.visible = false;
        })
        .catch(err => console.warn('Trainer model unavailable, keeping sprite:', err));
    }

    const token = ++this.npcToken;
    for (const n of this.npcModels) this.scene!.remove(n.c.object);
    this.npcModels = [];
    for (const o of [...this.npcGroup.children]) {
      const m = (o as THREE.Sprite).material as THREE.SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.npcGroup.remove(o);
      this.occluders = this.occluders.filter(x => x !== o);
    }

    // Reset overworld Pokemon
    for (const mon of this.overworldPokemon) {
      if (mon.model3D) this.scene?.remove(mon.model3D.obj);
      this.occluders = this.occluders.filter(x => x !== mon.sprite);
    }
    while (this.pokemonGroup.children.length > 0) {
      this.pokemonGroup.remove(this.pokemonGroup.children[0]);
    }
    this.overworldPokemon = [];

    for (const n of eng.visibleNPCs()) {
      const w = 110;
      const h = 80;
      const mat = this.material(w, h, w / 2, 68, n.x, n.y + 13, c => eng.paintProp(c, route, 'npc', { ...n, facing: 'down' }));
      const sprite = this.addSprite(mat, w, h, w / 2, 68, n.x, n.y + 13, this.npcGroup, PEOPLE);
      this.npcGroup.add(this.nameTag(n.name, n.x, n.y + 13));
      const facing = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[n.facing || 'down'];
      createCharacter(modelForNpc(n.id, n.name), HERO_HEIGHT * 0.97)
        .then(c => {
          if (token !== this.npcToken) return;
          c.object.position.set(n.x, 0, n.y + 10);
          c.object.rotation.y = facing;
          this.scene!.add(c.object);
          sprite.visible = false;
          this.occluders = this.occluders.filter(o => o !== sprite);
          this.npcModels.push({ c, x: n.x, z: n.y + 10, facing, sprite });
        })
        .catch(() => { });
    }
    this.sizeTags();

    const info = eng.companion.info;
    if (!info) {
      if (this.partner) this.partner.visible = false;
      this.partnerShadow!.visible = false;
    } else {
      if (info.speciesId !== this.partnerSpecies) {
        this.partnerSpecies = info.speciesId;
        if (this.partner) this.scene!.remove(this.partner);
        const size = [65, 82, 102][info.sizeClass];
        this.partner = new THREE.Sprite(new THREE.SpriteMaterial({ alphaTest: 0.35, transparent: true }));
        this.partner.center.set(0.5, 0.10);
        this.partner.scale.set(size, size, 1);
        this.scene!.add(this.partner);
        this.loadPokemonTexture(info.speciesId, tex => {
          if (this.partner && this.partnerSpecies === info.speciesId) {
            (this.partner.material as THREE.SpriteMaterial).map = tex;
            (this.partner.material as THREE.SpriteMaterial).needsUpdate = true;
          }
        });
      }
      this.partner!.visible = !this.partner3D;
      this.partnerShadow!.visible = true;
      if (info.speciesId !== this.partner3DSpecies && pokemon3DManager.isEnabled()) {
        const species = info.speciesId;
        this.partner3DSpecies = species;
        if (this.partner3D) this.scene!.remove(this.partner3D.obj);
        this.partner3D = null;
        Pokemon3DLoader.getInstance()
          .loadPokemon(species)
          .then(({ model, animations }) => {
            if (this.partner3DSpecies !== species) return;
            const box = new THREE.Box3().setFromObject(model);
            const targetH = [34, 46, 60][info.sizeClass];
            const k = targetH / Math.max(0.001, box.max.y - box.min.y);
            model.scale.multiplyScalar(k);
            model.position.y = -box.min.y * k;
            const obj = new THREE.Group();
            obj.add(model);
            const mixer = new THREE.AnimationMixer(model);
            const clip = (re: RegExp) => animations.find(a => re.test(a.name.toLowerCase()));
            const idleClip = clip(/idle|wait/) || animations[0];
            const walkClip = clip(/walk|run|move/);
            this.partner3D = { obj, mixer, idle: idleClip && mixer.clipAction(idleClip), walk: walkClip && mixer.clipAction(walkClip) };
            this.scene!.add(obj);
            this.partner!.visible = false;
          })
          .catch(() => { }); // no model for this species: keep the 3D illustration
      }
    }

    // --------------------------------------------------------------------------
    // Overworld Pokémon in 3D Chase Camera
    // --------------------------------------------------------------------------
    // 1. Static route encounters (Snorlax, legendaries, Lapras, etc.)
    for (const enc of route.staticEncounters || []) {
      if (eng.getFlag(enc.doneFlag) || !eng.isConditionMet(enc.requires)) continue;
      const spec = POKEMON_SPECIES_MAP[enc.speciesId];
      const name = spec?.name || 'Wild Pokémon';
      this.spawnOverworldPokemon({
        id: 'static_' + enc.speciesId,
        speciesId: enc.speciesId,
        name: `${name} Lv.${enc.level || 30}`,
        x: enc.x,
        z: enc.y + 8,
        scale: 1.8,
        isStatic: true,
        encData: enc,
      });
    }

    // 2. Lost Pokémon sidequests
    for (const lost of route.lostPokemon || []) {
      if (eng.getFlag(lost.foundFlag) || !eng.isConditionMet(lost.requires)) continue;
      const spec = POKEMON_SPECIES_MAP[lost.speciesId];
      const name = spec?.name || 'Lost Pokémon';
      this.spawnOverworldPokemon({
        id: 'lost_' + lost.speciesId,
        speciesId: lost.speciesId,
        name: `Lost ${name} ❓`,
        x: lost.x,
        z: lost.y + 8,
        scale: 1.25,
        isLost: true,
        encData: lost,
      });
    }

    // 3. Ambient Wild Pokémon roaming in Route 1 & Viridian natural habitats
    const ambientSpawns = [
      { speciesId: 16, x: 260, z: 270, level: 3, name: 'Pidgey', scale: 1.1 },
      { speciesId: 19, x: 440, z: 660, level: 3, name: 'Rattata', scale: 1.05 },
      { speciesId: 10, x: 520, z: 290, level: 2, name: 'Caterpie', scale: 0.95 },
      { speciesId: 60, x: 910, z: 630, level: 5, name: 'Poliwag', scale: 1.15 },
      { speciesId: 54, x: 1120, z: 740, level: 6, name: 'Psyduck', scale: 1.25 },
      { speciesId: 43, x: 940, z: 210, level: 5, name: 'Oddish', scale: 1.05 },
      { speciesId: 25, x: 1640, z: 310, level: 9, name: 'Pikachu', scale: 1.25 },
      { speciesId: 133, x: 1470, z: 190, level: 10, name: 'Eevee', scale: 1.2 },
    ];
    for (const sp of ambientSpawns) {
      this.spawnOverworldPokemon({
        id: `wild_${sp.speciesId}_${sp.x}`,
        speciesId: sp.speciesId,
        name: `${sp.name} Lv.${sp.level}`,
        x: sp.x,
        z: sp.z,
        scale: sp.scale,
        isWild: true,
        encData: sp,
      });
    }

    this.sizeTags();
  }

  // -------------------------------------------------------------- loop
  private tick = (now: number): void => {
    if (!this.active) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    windTime.value = now / 1000;
    this.waterUpdate?.(now / 1000);
    this.last = now;
    const route = eng.currentRoute;
    // Battles, shops, menus and route changes hand control back to the 2.5D screens
    if (!route || route.id !== ROUTE_ID || !document.getElementById('route')?.classList.contains('on')) {
      this.exit(false);
      return;
    }

    // Only one world loop at a time: anything that restarted the 2.5D loop (e.g. closing the map) is stopped again
    eng.stop();
    const busy =
      eng.isPaused ||
      document.getElementById('ov')?.style.display === 'flex' ||
      !!document.querySelector('.xp-sheet, .kanto-map-modal-overlay');
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

    // Encounters, item pickups, discoveries and route exits: same rules as 2.5D
    if (!busy && eng.tickWorld(dt, moving)) {
      // A battle or route change just started: shut down cleanly (still "wanted",
      // so the 3D view comes back on its own when the player returns).
      this.exit(false);
      return;
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

    eng.companion.update(dt, p.x, p.y);
    if (this.partner && eng.companion.info) {
      const hop = moving ? Math.abs(Math.sin(this.walkPhase * 11)) * 3 : 0;
      // Walk the partner slightly to the camera's right so it never hides the trainer
      const side = 32;
      const ahead = 18; // and a little forward, level with the trainer rather than in front of the lens
      const px2 = eng.companion.x + Math.cos(this.camYaw) * side - Math.sin(this.camYaw) * ahead;
      const pz2 = eng.companion.y + 10 - Math.sin(this.camYaw) * side - Math.cos(this.camYaw) * ahead;
      this.partner.position.set(px2, hop, pz2);
      if (this.partner3D) {
        const pp = this.partner3D;
        pp.obj.position.set(px2, 0, pz2);
        pp.obj.rotation.y = this.heroYaw;
        const next = moving && pp.walk ? pp.walk : pp.idle;
        if (next && next !== pp.on) {
          next.reset().play();
          if (pp.on) pp.on.crossFadeTo(next, 0.2, false);
          pp.on = next;
        }
        pp.mixer.update(dt * (moving && !pp.walk ? 1.8 : 1)); // no walk clip: a livelier idle
      }
      this.partnerShadow!.position.set(px2, 0.3, pz2);
    }
    eng.refreshPrompt();

    // Overworld Pokémon animations, mixers and wild encounter proximity
    for (const mon of this.overworldPokemon) {
      if (mon.model3D) {
        mon.model3D.mixer.update(dt);
      } else if (mon.sprite) {
        mon.sprite.position.y = mon.baseY + Math.max(0, Math.sin(this.walkPhase * 2.2 + mon.x * 0.05) * 1.8);
      }
      if (mon.isWild && mon.encData && !busy && eng.onTriggerEncounter) {
        const dist = Math.hypot(p.x - mon.x, p.y - mon.z);
        if (dist < 34) {
          eng.onTriggerEncounter(buildEncounterMon(mon.speciesId, mon.encData.level, 15), Math.round(p.x), Math.round(p.y));
          break;
        }
      }
    }

    this.placeCamera(1 - Math.exp(-dt * 5), 1 - Math.exp(-dt * 8));
    // Anything standing right in front of the lens is hidden so it never blocks the view of the trainer
    const cp = this.camera.position;
    const clear = Math.min(90, this.camDist * 0.7); // anything this close to the lens sits between camera and trainer
    this.models?.updateOcclusion(cp.x, cp.z, clear);
    for (const o of this.occluders) o.visible = Math.hypot(o.position.x - cp.x, o.position.z - cp.z) > clear;
    for (const n of this.npcModels) n.c.object.visible = Math.hypot(n.x - cp.x, n.z - cp.z) > clear;
    for (const o of this.npcGroup.children) {
      if (o.userData.isTag) {
        const d = Math.hypot(o.position.x - cp.x, o.position.z - cp.z);
        o.visible = d > clear && d < 650;
      }
    }
    for (const mon of this.overworldPokemon) {
      const d = Math.hypot(mon.x - cp.x, mon.z - cp.z);
      const visible = d > clear && d < 750;
      if (mon.sprite) mon.sprite.visible = visible;
      if (mon.model3D) mon.model3D.obj.visible = visible;
      if (mon.shadow) mon.shadow.visible = visible;
      if (mon.tag) mon.tag.visible = visible && d < 450;
    }
    for (const o of this.pokemonGroup.children) {
      if (o.userData.isTag) {
        const d = Math.hypot(o.position.x - cp.x, o.position.z - cp.z);
        o.visible = d > clear && d < 450;
      }
    }
    this.renderer!.render(this.scene!, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Chase camera: trails behind the trainer, eases into turns, pulls in to avoid walls. */
  private placeCamera(yawK: number, posK: number): void {
    const p = eng.player;
    let d = this.yaw - this.camYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.camYaw += d * yawK;
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);
    const route = eng.currentRoute;
    // Shorten the boom if a building sits between camera and trainer
    const full = CAM_DIST * this.boom;
    let want = full;
    if (route) {
      for (let t = 0.2; t <= 1.0001; t += 0.1) {
        const x = p.x - fx * full * t;
        const z = p.y + 6 - fz * full * t;
        if (route.buildings.some(b => x > b.x - 6 && x < b.x + b.w + 6 && z > b.y - 6 && z < b.y + b.h + 6)) {
          want = Math.max(36, full * (t - 0.12));
          break;
        }
      }
    }
    this.camDist += (want - this.camDist) * (want < this.camDist ? 0.5 : posK);
    const k = this.camDist / full;
    const target = new THREE.Vector3(p.x - fx * this.camDist, CAM_HEIGHT * this.boom * (0.45 + 0.55 * k), p.y + 6 - fz * this.camDist);
    this.camera.position.lerp(target, posK);
    this.camera.lookAt(p.x + fx * LOOK_AHEAD, 14, p.y + 6 + fz * LOOK_AHEAD);
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
    if ((route.ledges || []).some(l => near(l, 30))) return false;
    const spots: { x: number; y: number }[] = [
      ...route.npcs,
      ...route.items,
      ...(route.signposts || []),
      ...(route.fountains || []),
      ...(route.noticeBoards || []),
      ...(route.portals || []),
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
    const pad = 10;
    return route.buildings.some(b => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad - 4);
  }

  private resize(): void {
    const vp = document.getElementById('route-viewport');
    if (!vp || !this.renderer) return;
    const w = vp.clientWidth || 800;
    const h = vp.clientHeight || 480;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 74 : 58;
    this.boom = w < h ? Math.min(1.7, 0.75 + 0.5 * (h / w)) : 1;
    this.camera.updateProjectionMatrix();
    this.sizeTags();
  }

  // -------------------------------------------------------------- HUD
  public updateButton(): void {
    // Bring the 3D view back after battles / menus if the player was using it
    if (this.wanted && !this.active && this.isAvailable() && !eng.isPaused) this.enter();
    const btn = document.getElementById('hud-fp-btn');
    if (!btn) return;
    btn.classList.toggle('hidden', !(this.active || this.isAvailable()));
    btn.classList.toggle('on', this.active);
    btn.title = this.active ? 'Back to 2.5D view (V)' : '3D view (V)';
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
