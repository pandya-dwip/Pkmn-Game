/**
 * RouteExplorationEngine.ts
 * Interactive Top-Down Kanto Route Exploration System
 * Features:
 * - Controlled real-time character movement (Desktop WASD/Arrows, Mobile Virtual D-Pad)
 * - Dynamic route environments: paths, rustling tall grass, trees, flowers, water, buildings
 * - Tall grass encounters leading seamlessly into REAL wild battles
 * - Destination buildings: Pokémon Center (full team heal), Poké Mart (Shop), Gyms (Leader battles)
 * - Ground items pickup, interactive NPCs, smooth camera tracking
 * - Preserves exact route position upon returning from battle!
 */

import { sound } from '../audio/SoundSynthesizer';
import { generateEncounterMon, EncounterMon } from './EncounterSystem';
import { inputManager } from './InputManager';
import { Camera25D } from '../world/Camera25D';
import { CompanionController } from '../world/CompanionController';
import { drawBuildingVolume, Architecture } from '../world/BuildingVolume';
import { getPokemonSprite } from '../world/PokemonSprites';
import { drawTrainerSpriteCached, getNpcAppearance, getTrainerById, TrainerCustomization } from '../data/characters';
import {
  CAVE_WALL_FACE,
  drawTerrainPatch,
  drawCaveFloors,
  isOnCaveFloor,
  drawWater,
  drawBridge,
  drawSwitchPlate,
  drawFishingSpot,
  drawPortal,
  portalAnchorY,
  drawBoulder,
  drawBarrier,
  drawLandmark,
  drawWaterfall,
  drawCrystal,
  drawNoticeBoard,
  drawMarker,
  drawEncounterPatch,
} from '../world/FeatureRenderer';
import {
  Rect,
  WorldCondition,
  RoutePortal,
  RouteWater,
  RouteBridge,
  RouteTerrainPatch,
  RouteBoulder,
  RouteSwitch,
  RouteBarrier,
  RouteLandmark,
  RouteFishingSpot,
  RouteWaterfall,
  RouteCrystal,
  RouteNoticeBoard,
  RouteStaticEncounter,
  RouteLostPokemon,
} from '../world/WorldTypes';

export interface RouteBuilding {
  type: 'center' | 'mart' | 'gym' | 'gate' | 'house';
  x: number;
  y: number;
  w: number;
  h: number;

  label: string;
  gymIndex?: number;
  roofStyle?: 'terracotta' | 'emerald' | 'slate' | 'azure' | 'wood';
  roofColor?: string;
  wallColor?: string;
  chimney?: boolean;
  occupant?: string;
  dialogue?: string;
}

export interface RoutePath {
  x: number;
  y: number;
  w: number;
  h: number;
  style?: 'dirt' | 'flagstone' | 'cobble' | 'brick' | 'paved';
}

export interface RouteItem {
  id: string;
  x: number;
  y: number;
  name: string;
  type: 'ball' | 'berry' | 'money' | 'greatBall' | 'ultraBall' | 'sitrus' | 'revive' | 'stone' | 'key';
  amount: number;
  collected: boolean;
  /** Hidden items only become visible (and collectable) at close range. */
  hidden?: boolean;
  /** Stone type for 'stone' items, key-item id for 'key' items. */
  detail?: string;
  requires?: WorldCondition;
}

export interface RouteNPC {
  id: string;
  x: number;
  y: number;
  avatar: string;
  name: string;
  dialogue: string;
  gift?: { type: 'ball' | 'berry' | 'money' | 'key'; name: string; amount: number; detail?: string };
  given?: boolean;
  /** Quests this NPC offers or accepts. */
  questIds?: string[];
  visibleWhen?: WorldCondition;
  /** Optional trainer battle. */
  trainer?: { id: string; team: { id: number; lv: number }[]; reward: number; intro: string; defeat: string };
  /** Ferry / guide NPC that moves the player to another location. */
  ferry?: { target: number; x: number; y: number; label: string; requires?: WorldCondition };
  facing?: 'up' | 'down' | 'left' | 'right';
}

export interface GrassPatch {
  x: number;
  y: number;
  w: number;
  h: number;
  zone?: string;
  /** Visual style of the encounter patch (tall grass by default). */
  style?: 'grass' | 'rubble' | 'reeds' | 'dunes';
}

export interface RouteFence {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RouteStone {
  x: number;
  y: number;
  radius: number;
  variant?: 'granite' | 'mossy' | 'slate';
}

export type RouteTreeType =
  | 'broadleaf'
  | 'mature'
  | 'small'
  | 'slender'
  | 'dense_forest'
  | 'conifer'
  | 'coastal'
  | 'decorative'
  | 'blossom'
  | 'golden'
  | 'mystic'
  | 'oak'
  | 'pine';

export type FoliageColorVariant =
  | 'standard'
  | 'light'
  | 'dark'
  | 'olive'
  | 'golden'
  | 'blossom'
  | 'mystic'
  | 'coastal';

export interface RouteTree {
  x: number;
  y: number;
  scale?: number;
  type?: RouteTreeType;
  colorVariant?: FoliageColorVariant;
}

export interface RouteLedge {
  x: number;
  y: number;
  w: number;
  h: number;
  stairs?: { x: number; w: number }[];
}

export interface RoutePond {
  x: number;
  y: number;
  w: number;
  h: number;
  pier?: { x: number; y: number; w: number; h: number };
}

export interface RouteSignpost {
  id: string;
  x: number;
  y: number;
  title: string;
  lines: string[];
}

export interface RouteSection {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  badgeColor?: string;
  isRareZone?: boolean;
}

export interface RouteFountain {
  x: number;
  y: number;
  radius: number;
  style?: 'stone' | 'marble' | 'brick';
}

export interface RouteStreetlamp {
  x: number;
  y: number;
  style?: 'ornate' | 'modern' | 'lantern';
}

export interface RouteBench {
  x: number;
  y: number;
  w?: number;
  facing?: 'up' | 'down' | 'left' | 'right';
}

export interface RouteDefinition {
  id: number;
  name: string;
  locationLabel: string;
  destinationLabel: string;
  worldWidth: number;
  worldHeight: number;
  theme: 'forest' | 'route' | 'city' | 'rock' | 'water';
  startX: number;
  startY: number;
  path: RoutePath[];
  grassPatches: GrassPatch[];
  buildings: RouteBuilding[];
  items: RouteItem[];
  npcs: RouteNPC[];
  targetEncounters: number;
  exitX: number;
  fences?: RouteFence[];
  stones?: RouteStone[];
  trees?: RouteTree[];
  ledges?: RouteLedge[];
  ponds?: RoutePond[];
  sections?: RouteSection[];
  signposts?: RouteSignpost[];
  fountains?: RouteFountain[];
  streetlamps?: RouteStreetlamp[];
  benches?: RouteBench[];

  // ---- 2.5D world expansion (all optional) ----
  /** Special exploration area (forest / cave / coast / mountain) outside the linear route chain. */
  isSpecialArea?: boolean;
  areaKind?: 'forest' | 'cave' | 'coast' | 'mountain';
  /** Area this one returns to by default (for the HUD / hub). */
  parentRouteId?: number;
  /** Ambient darkness 0..1 (caves). */
  dark?: number;
  architecture?: Architecture;
  music?: string;
  portals?: RoutePortal[];
  waters?: RouteWater[];
  bridges?: RouteBridge[];
  terrain?: RouteTerrainPatch[];
  /** Cave chambers: when set, only these rectangles (and bridges) are walkable. */
  floors?: Rect[];
  boulders?: RouteBoulder[];
  switches?: RouteSwitch[];
  barriers?: RouteBarrier[];
  landmarks?: RouteLandmark[];
  fishingSpots?: RouteFishingSpot[];
  waterfalls?: RouteWaterfall[];
  crystals?: RouteCrystal[];
  noticeBoards?: RouteNoticeBoard[];
  staticEncounters?: RouteStaticEncounter[];
  lostPokemon?: RouteLostPokemon[];
  /** Base backdrop colour outside the world bounds. */
  backdrop?: string;
}

/** What the trainer can currently interact with. */
export interface InteractTarget {
  label: string;
  action: string;
  run: () => void;
}

export class RouteExplorationEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private time: number = 0;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; type: 'leaf' | 'pollen' | 'blossom'; rot: number; rotSpeed: number }> = [];
  private grassParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }> = [];
  private activeSection: RouteSection | null = null;
  private sectionBannerTimer: number = 0;
  private targetDest: { x: number; y: number } | null = null;

  // Player State
  public player = {
    x: 80,
    y: 220,
    w: 24,
    h: 28,
    vx: 0,
    vy: 0,
    speed: 235,
    dir: 'down' as 'down' | 'up' | 'left' | 'right',
    stepTimer: 0,
    animFrame: 0,
    inGrass: false,
    grassSteps: 0,
    cooldownTimer: 0,
  };

  // Active Route
  public currentRoute: RouteDefinition | null = null;
  public routeIndex: number = 0;
  public encountersTriggered: number = 0;
  public isPaused: boolean = false;

  // 2.5D camera (camX/camY hold the ground-view origin while the ground layer renders)
  public readonly cam = new Camera25D();
  private camX: number = 0;
  private camY: number = 0;
  private viewW = 800;
  private viewH = 480;
  private dpr = 1;
  private groundCanvas: HTMLCanvasElement | null = null;
  private groundCtx: CanvasRenderingContext2D | null = null;
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticRouteRef: RouteDefinition | null = null;
  private darkCanvas: HTMLCanvasElement | null = null;
  private groundRect = { x: 0, y: 0, w: 0, h: 0 };

  // Per-route caches (generated trees/fences/stones are otherwise rebuilt on every collision test)
  private treeCache: RouteTree[] = [];
  private fenceCache: RouteFence[] = [];
  private stoneCache: RouteStone[] = [];
  private cacheRoute: RouteDefinition | null = null;

  // Exploration state
  public readonly companion = new CompanionController();
  private boulderPos = new Map<string, { x: number; y: number }>();
  private revealedPortals = new Set<string>();
  private revealedItems = new Set<string>();
  private toast: { title: string; sub: string; t: number } | null = null;
  private fishing: { spot: RouteFishingSpot; t: number; biteAt: number; bite: boolean } | null = null;

  // Input Keys
  private keys: Record<string, boolean> = {};

  public selectedTrainerId: string = 'male_red';
  /** Fully resolved trainer look (base character + cosmetics). */
  public playerAppearance: TrainerCustomization | null = null;
  /** Lantern / headlamp increases the light radius in caves. */
  public hasLantern = false;

  // Progress hooks provided by the game layer
  public isConditionMet: (c?: WorldCondition) => boolean = () => true;
  public getFlag: (flag: string) => boolean = () => false;
  public setFlag: (flag: string) => void = () => {};
  public questMarkerFor: ((npc: RouteNPC) => 'quest' | 'turnin' | null) | null = null;
  public noticeBoardHasNew: ((board: RouteNoticeBoard) => boolean) | null = null;

  // External Callbacks
  public onTriggerEncounter: ((mon: EncounterMon, x: number, y: number) => void) | null = null;
  public onEnterGym: ((gymIndex: number) => void) | null = null;
  public onEnterMart: (() => void) | null = null;
  public onEnterCenter: (() => void) | null = null;
  public onEnterHouse: ((building: RouteBuilding) => void) | null = null;
  public onEnterGate: ((building: RouteBuilding) => void) | null = null;
  public onPickItem: ((item: RouteItem) => void) | null = null;
  public onTalkNPC: ((npc: RouteNPC) => void) | null = null;
  public onReadSignpost: ((sp: RouteSignpost) => void) | null = null;
  public onRouteExit: ((nextRouteIndex: number) => void) | null = null;
  public onRoutePreviousExit: ((prevRouteIndex: number) => void) | null = null;
  public onOpenMap: (() => void) | null = null;
  public onOpenMenu: (() => void) | null = null;
  public onUsePortal: ((portal: RoutePortal) => void) | null = null;
  public onLandmark: ((lm: RouteLandmark) => void) | null = null;
  public onNoticeBoard: ((board: RouteNoticeBoard) => void) | null = null;
  public onStaticEncounter: ((enc: RouteStaticEncounter) => void) | null = null;
  public onLostPokemon: ((lost: RouteLostPokemon) => void) | null = null;
  public onFishBite: ((spot: RouteFishingSpot) => void) | null = null;
  public onFishStart: ((spot: RouteFishingSpot) => boolean) | null = null;
  public onCompanionInteract: (() => void) | null = null;
  public onPuzzleSolved: ((sw: RouteSwitch) => void) | null = null;
  public onReveal: ((what: 'portal' | 'item', label: string) => void) | null = null;

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.isPaused || !this.canvas || !this.currentRoute) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * this.viewW;
    const sy = ((e.clientY - rect.top) / rect.height) * this.viewH;
    const w = this.cam.unproject(sx, sy);
    if (w) this.targetDest = w;
  };

  private handleResize = (): void => this.resize();

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.loop.bind(this);
  }

  public resize(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const w = (parent && parent.clientWidth) || 800;
    const h = (parent && parent.clientHeight) || 480;
    // Sharper rendering on high-DPI screens, capped to protect mobile fill-rate.
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 2 : 1.5);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.viewW = w;
    this.viewH = h;
    this.dpr = dpr;
    this.cam.setViewport(w, h);
  }

  public init(canvas: HTMLCanvasElement): void {
    if (this.canvas !== canvas) {
      if (this.canvas) this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
      canvas.addEventListener('pointerdown', this.handlePointerDown);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    // Re-adding the same bound listeners is a no-op, so repeated init() calls never stack handlers.
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    const viewport = document.getElementById('route-viewport');
    const joystick = document.getElementById('touch-joystick');
    const stick = document.getElementById('joystick-stick');
    if (viewport && joystick && stick) {
      inputManager.init(viewport, joystick, stick);
      inputManager.onInteract = () => this.interact();
      inputManager.onOpenMenu = () => {
        if (this.onOpenMenu) this.onOpenMenu();
      };
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }
    inputManager.destroy();
  }

  public setDirection(dir: 'up' | 'down' | 'left' | 'right' | null): void {
    if (!dir) {
      this.keys['ArrowUp'] = false;
      this.keys['ArrowDown'] = false;
      this.keys['ArrowLeft'] = false;
      this.keys['ArrowRight'] = false;
      return;
    }
    this.keys['ArrowUp'] = dir === 'up';
    this.keys['ArrowDown'] = dir === 'down';
    this.keys['ArrowLeft'] = dir === 'left';
    this.keys['ArrowRight'] = dir === 'right';
  }

  public interact(): void {
    if (!this.currentRoute || this.isPaused) return;
    if (this.fishing) {
      this.reelIn();
      return;
    }
    const t = this.getInteractTarget();
    if (t) t.run();
  }

  public hasNearbyInteractable(): boolean {
    return !!this.currentRoute && !!this.getInteractTarget();
  }

  /** NPCs currently present (quest / story conditions applied). */
  public visibleNPCs(): RouteNPC[] {
    const r = this.currentRoute;
    if (!r) return [];
    return r.npcs.filter(n => !n.visibleWhen || this.isConditionMet(n.visibleWhen));
  }

  private isNearDoor(b: RouteBuilding): boolean {
    const p = this.player;
    return p.x >= b.x - 20 && p.x <= b.x + b.w + 24 && p.y >= b.y + b.h - 16 && p.y <= b.y + b.h + 45;
  }

  /**
   * Single source of truth for proximity interactions, shared by the A button,
   * keyboard, contextual prompt and pulse indicator. Ordered by priority.
   */
  public getInteractTarget(): InteractTarget | null {
    const r = this.currentRoute;
    if (!r) return null;
    const p = this.player;
    const near = (x: number, y: number, d: number) => Math.hypot(p.x - x, p.y - y) < d;

    for (const npc of this.visibleNPCs()) {
      if (near(npc.x, npc.y, 55)) {
        const action = npc.trainer && !this.getFlag('trainer:' + npc.trainer.id) ? 'Battle' : npc.ferry ? 'Board' : 'Talk';
        return {
          label: npc.name,
          action,
          run: () => {
            sound.beep(660, 0.1, 'triangle');
            if (this.onTalkNPC) this.onTalkNPC(npc);
          },
        };
      }
    }
    for (const enc of r.staticEncounters || []) {
      if (this.getFlag(enc.doneFlag) || !this.isConditionMet(enc.requires)) continue;
      if (near(enc.x, enc.y, 60)) {
        return { label: 'Wild Pokémon', action: 'Approach', run: () => this.onStaticEncounter?.(enc) };
      }
    }
    for (const lost of r.lostPokemon || []) {
      if (this.getFlag(lost.foundFlag) || !this.isConditionMet(lost.requires)) continue;
      if (near(lost.x, lost.y, 52)) {
        return { label: 'Lost Pokémon', action: 'Approach', run: () => this.onLostPokemon?.(lost) };
      }
    }
    for (const nb of r.noticeBoards || []) {
      if (near(nb.x, nb.y + 4, 52)) return { label: nb.title, action: 'Read', run: () => this.onNoticeBoard?.(nb) };
    }
    for (const lm of r.landmarks || []) {
      if (near(lm.x, lm.y, 62)) {
        return {
          label: lm.title,
          action: 'Inspect',
          run: () => {
            sound.beep(784, 0.12, 'sine');
            this.onLandmark?.(lm);
          },
        };
      }
    }
    for (const portal of r.portals || []) {
      if (portal.hidden && !this.revealedPortals.has(portal.id) && !this.getFlag('portal:' + portal.id)) continue;
      if (near(portal.x, portal.y, 48)) {
        return {
          label: portal.label,
          action: portal.style === 'dock' ? 'Sail' : portal.style.startsWith('stairs') ? 'Climb' : 'Enter',
          run: () => {
            sound.beep(880, 0.15, 'sine');
            this.onUsePortal?.(portal);
          },
        };
      }
    }
    for (const b of r.buildings) {
      if (this.isNearDoor(b)) {
        const action = b.type === 'gym' ? (b.gymIndex !== undefined ? 'Enter Gym' : 'Inspect') : b.type === 'house' ? 'Visit' : 'Enter';
        return { label: b.label, action, run: () => this.enterBuilding(b) };
      }
    }
    if (r.exitX > 0 && near(r.exitX - 30, 200, 55)) {
      return {
        label: r.destinationLabel || 'Next Route',
        action: 'Travel',
        run: () => {
          sound.beep(880, 0.15, 'sine');
          this.onRouteExit?.(r.id + 1);
        },
      };
    }
    for (const sp of r.signposts || []) {
      if (near(sp.x, sp.y, 50)) {
        return {
          label: sp.title,
          action: 'Read Sign',
          run: () => {
            sound.beep(750, 0.1, 'sine');
            this.onReadSignpost?.(sp);
          },
        };
      }
    }
    for (const f of r.fishingSpots || []) {
      if (near(f.x, f.y, 70)) return { label: 'Fishing Spot', action: 'Fish', run: () => this.startFishing(f) };
    }
    // Petting the partner requires turning to face it (it usually trails behind)
    const c = this.companion;
    const facingCompanion =
      !!c.info &&
      c.isNear(p.x, p.y, 46) &&
      ((p.dir === 'up' && c.y < p.y - 6) || (p.dir === 'down' && c.y > p.y + 6) || (p.dir === 'left' && c.x < p.x - 6) || (p.dir === 'right' && c.x > p.x + 6));
    if (this.companion.info && facingCompanion) {
      return {
        label: this.companion.info.name,
        action: 'Pet',
        run: () => {
          this.companion.celebrate();
          this.onCompanionInteract?.();
        },
      };
    }
    return null;
  }

  private enterBuilding(b: RouteBuilding): void {
    const r = this.currentRoute;
    if (!r) return;
    sound.beep(880, 0.15, 'sine');
    if (b.type === 'gym') {
      if (b.gymIndex !== undefined && this.onEnterGym) this.onEnterGym(b.gymIndex);
      else this.onEnterHouse?.(b);
    } else if (b.type === 'mart') this.onEnterMart?.();
    else if (b.type === 'center') this.onEnterCenter?.();
    else if (b.type === 'house') this.onEnterHouse?.(b);
    else if (b.type === 'gate') {
      if (this.onEnterGate) this.onEnterGate(b);
      else this.onRouteExit?.(r.id + 1);
    }
  }

  // ---------------------------------------------------------------- fishing
  private startFishing(spot: RouteFishingSpot): void {
    if (this.onFishStart && !this.onFishStart(spot)) return;
    sound.swp(900, 400, 0.25, 'sine', 0.08);
    this.fishing = { spot, t: 0, biteAt: 1.2 + Math.random() * 2.4, bite: false };
    this.showToast('Fishing...', 'Press A when something bites');
  }

  private reelIn(): void {
    const f = this.fishing;
    if (!f) return;
    this.fishing = null;
    if (f.bite) {
      sound.beep(1046, 0.12, 'square');
      this.onFishBite?.(f.spot);
    } else {
      sound.beep(220, 0.15, 'triangle');
      this.showToast('Too early!', 'Nothing was biting yet');
    }
  }

  public showToast(title: string, sub: string): void {
    this.toast = { title, sub, t: 2.6 };
  }

  public loadRoute(routeDef: RouteDefinition, resumeX?: number, resumeY?: number): void {
    const routeChanged = this.currentRoute !== routeDef;
    this.currentRoute = routeDef;
    this.routeIndex = routeDef.id;
    this.player.x = resumeX !== undefined ? resumeX : routeDef.startX;
    this.player.y = resumeY !== undefined ? resumeY : routeDef.startY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.cooldownTimer = 2.0; // 2 seconds safety cooldown after returning
    this.isPaused = false;
    this.targetDest = null;
    this.fishing = null;
    this.lastPromptKey = '#';
    if (routeChanged) {
      this.revealedPortals.clear();
      this.revealedItems.clear();
      this.activeSection = null;
    }
    this.rebuildCaches(routeDef);
    this.resetBoulders(routeDef);
    // Never spawn inside a solid (e.g. an old save position that is now blocked)
    if (this.isBlocked(this.player.x, this.player.y, routeDef)) {
      const spot = this.findFreeSpotNear(this.player.x, this.player.y) || { x: routeDef.startX, y: routeDef.startY };
      this.player.x = spot.x;
      this.player.y = spot.y;
    }
    this.companion.snapBehind(this.player.x, this.player.y, this.player.dir, (x, y) => !this.isBlocked(x, y, routeDef));
    this.snapCamera();
    this.initParticles();
  }

  private rebuildCaches(route: RouteDefinition): void {
    if (this.cacheRoute === route) return;
    this.cacheRoute = null;
    // Generated lists are computed once per route; trees are cleared away from
    // visible portals so entrances are never buried in foliage.
    const trees = this.getRouteTrees(route);
    const clear = (route.portals || []).filter(p => !p.hidden);
    this.treeCache = trees.filter(t => !clear.some(p => Math.hypot(t.x - p.x, this.getTreeTrunkFootY(t) - p.y) < 58));
    this.fenceCache = this.getRouteFences(route);
    this.stoneCache = this.getRouteStones(route);
    this.cacheRoute = route;
    this.staticRouteRef = null; // force static ground rebuild
  }

  private resetBoulders(route: RouteDefinition): void {
    this.boulderPos.clear();
    for (const b of route.boulders || []) {
      // A solved puzzle keeps its boulder resting on the matching plate.
      const solvedPlate = (route.switches || []).find(sw => this.getFlag(sw.flag) && sw.id === b.id);
      this.boulderPos.set(b.id, solvedPlate ? { x: solvedPlate.x, y: solvedPlate.y } : { x: b.x, y: b.y });
    }
  }

  public findFreeSpotNear(x: number, y: number): { x: number; y: number } | null {
    const r = this.currentRoute;
    if (!r) return null;
    for (let rad = 16; rad < 300; rad += 16) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const cx = x + Math.cos(a) * rad;
        const cy = y + Math.sin(a) * rad;
        if (!this.isBlocked(cx, cy, r)) return { x: cx, y: cy };
      }
    }
    return null;
  }

  /** Focus point the camera wants for the current player position (clamped to the world). */
  private desiredFocus(): { x: number; y: number } {
    const r = this.currentRoute!;
    const cam = this.cam;
    const half = cam.nearHalfWidth();
    const reach = cam.verticalReach();
    let fx = this.player.x;
    let fy = this.player.y - 8;
    if (r.worldWidth <= half * 2) fx = r.worldWidth / 2;
    else fx = Math.max(half, Math.min(r.worldWidth - half, fx));
    const minY = reach.up - 50;
    const maxY = r.worldHeight - reach.down + 20;
    fy = maxY < minY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, fy));
    return { x: fx, y: fy };
  }

  private snapCamera(): void {
    if (!this.currentRoute) return;
    const f = this.desiredFocus();
    this.cam.fx = f.x;
    this.cam.fy = f.y;
  }

  private initParticles(): void {
    if (!this.currentRoute) return;
    this.particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.currentRoute.worldWidth,
        y: Math.random() * this.currentRoute.worldHeight,
        vx: 12 + Math.random() * 22,
        vy: 6 + Math.random() * 14,
        size: 2.5 + Math.random() * 3,
        alpha: 0.35 + Math.random() * 0.45,
        type: Math.random() < 0.5 ? 'leaf' : Math.random() < 0.8 ? 'pollen' : 'blossom',
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2.5,
      });
    }
  }

  private spawnGrassParticle(x: number, y: number): void {
    if (this.grassParticles.length > 25) return;
    const colors = ['#52b788', '#74c69d', '#40916c', '#95d5b2'];
    this.grassParticles.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 32,
      vy: -18 - Math.random() * 24,
      life: 0.32,
      maxLife: 0.32,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  public start(): void {
    if (this.animFrameId) return;
    this.resize();
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' ', 'e', 'E', 'z', 'Z', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.keys['ArrowUp'] = true;
    if (key === 'arrowdown' || key === 's') this.keys['ArrowDown'] = true;
    if (key === 'arrowleft' || (key === 'a' && !this.hasNearbyInteractable())) this.keys['ArrowLeft'] = true;
    if (key === 'arrowright' || key === 'd') this.keys['ArrowRight'] = true;

    if (key === ' ' || key === 'e' || key === 'enter' || key === 'z' || (key === 'a' && this.hasNearbyInteractable())) {
      this.interact();
    }
    if (key === 'escape' && this.onOpenMenu) {
      this.onOpenMenu();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.keys['ArrowUp'] = false;
    if (key === 'arrowdown' || key === 's') this.keys['ArrowDown'] = false;
    if (key === 'arrowleft' || key === 'a') this.keys['ArrowLeft'] = false;
    if (key === 'arrowright' || key === 'd') this.keys['ArrowRight'] = false;
  }

  private loop(now: number): void {
    const dt = Math.min(0.06, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private update(dt: number): void {
    const route = this.currentRoute;
    if (!route) return;

    this.time += dt;
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }

    // Atmospheric floating particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += (p.vy + Math.sin(this.time * 2 + p.x * 0.05) * 4) * dt;
      p.rot += p.rotSpeed * dt;
      if (p.x > route.worldWidth + 20) p.x = -20;
      if (p.y > route.worldHeight + 20) p.y = -20;
    }

    // Grass kick-up particles
    for (let i = this.grassParticles.length - 1; i >= 0; i--) {
      const gp = this.grassParticles[i];
      gp.x += gp.vx * dt;
      gp.y += gp.vy * dt;
      gp.life -= dt;
      if (gp.life <= 0) this.grassParticles.splice(i, 1);
    }

    // Fishing: the trainer stands still until a bite or until they reel in
    if (this.fishing) {
      const f = this.fishing;
      f.t += dt;
      if (!f.bite && f.t >= f.biteAt) {
        f.bite = true;
        sound.beep(1318, 0.08, 'square');
        sound.beep(1318, 0.08, 'square', 0.05, 0.12);
        this.showToast('Something bit!', 'Press A to reel in');
      } else if (f.bite && f.t >= f.biteAt + 1.6) {
        this.fishing = null;
        this.showToast('It got away...', 'Try again');
      }
      this.updateCompanionAndCamera(dt);
      this.updatePrompt();
      return;
    }

    const move = inputManager.getMovement();
    let dx = move.dx;
    let dy = move.dy;
    if (this.keys['ArrowUp']) dy -= 1;
    if (this.keys['ArrowDown']) dy += 1;
    if (this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['ArrowRight']) dx += 1;

    let len = Math.hypot(dx, dy);
    if (len > 0.05) {
      this.targetDest = null;
    } else if (this.targetDest) {
      const tdx = this.targetDest.x - this.player.x;
      const tdy = this.targetDest.y - this.player.y;
      const tdist = Math.hypot(tdx, tdy);
      if (tdist < 10) {
        this.targetDest = null;
      } else {
        dx = tdx / tdist;
        dy = tdy / tdist;
        len = 1.0;
      }
    }
    if (len > 1.0) {
      dx /= len;
      dy /= len;
    }

    if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dy) > 0) this.player.dir = dy > 0 ? 'down' : 'up';

    const isMoving = len > 0.05;
    if (isMoving) {
      this.player.stepTimer += dt;
      if (this.player.stepTimer > 0.12) {
        this.player.stepTimer = 0;
        this.player.animFrame = (this.player.animFrame + 1) % 4;
      }
    } else {
      this.player.animFrame = 0;
    }
    if (this.player.cooldownTimer > 0) this.player.cooldownTimer -= dt;

    // Shallow water slows the trainer down
    const speed = this.player.speed * (this.isInShallows(this.player.x, this.player.y + 8) ? 0.62 : 1);
    const moveX = dx * speed * dt;
    const moveY = dy * speed * dt;
    let blockedMove = false;
    if (Math.abs(moveX) > 0.001) {
      const nextX = this.player.x + moveX;
      if (!this.isBlocked(nextX, this.player.y, route)) this.player.x = nextX;
      else {
        this.tryPushBoulder(nextX, this.player.y, Math.sign(moveX), 0, dt);
        blockedMove = true;
      }
    }
    if (Math.abs(moveY) > 0.001) {
      const nextY = this.player.y + moveY;
      if (!this.isBlocked(this.player.x, nextY, route)) this.player.y = nextY;
      else {
        this.tryPushBoulder(this.player.x, nextY, 0, Math.sign(moveY), dt);
        blockedMove = true;
      }
    }
    if (blockedMove && this.targetDest) {
      // Tap-to-move gives up instead of grinding against a wall
      const tdist = Math.hypot(this.targetDest.x - this.player.x, this.targetDest.y - this.player.y);
      if (tdist < 60) this.targetDest = null;
    }

    if (this.worldStep(route, dt, isMoving)) return;

    this.updateCompanionAndCamera(dt);
    this.updatePrompt();
  }

  /**
   * Everything that happens after the trainer moves: tall-grass encounters,
   * section banners, discoveries, puzzles, item pickups and route exits.
   * Shared by the 2.5D loop and the 3D chase view. Returns true on a scene change.
   */
  private worldStep(route: RouteDefinition, dt: number, isMoving: boolean): boolean {
    // Tall grass & wild encounters (only inside tall grass patches)
    let inGrassNow = false;
    let inEncounterPatch = false;
    let currentGrassZone: string | undefined = undefined;
    const footX = this.player.x;
    const footY = this.player.y + 10;
    for (const patch of route.grassPatches) {
      if (footX >= patch.x - 2 && footX <= patch.x + patch.w + 2 && footY >= patch.y - 2 && footY <= patch.y + patch.h + 2) {
        inGrassNow = patch.style !== 'rubble';
        inEncounterPatch = true;
        currentGrassZone = patch.zone;
        break;
      }
    }
    this.player.inGrass = inGrassNow;

    if (inEncounterPatch && isMoving) {
      if (inGrassNow && Math.random() < 0.45) this.spawnGrassParticle(this.player.x, this.player.y + 12);
      if (this.player.cooldownTimer <= 0) {
        this.player.grassSteps += dt * 3.8;
        if (this.player.grassSteps >= 2.6) {
          this.player.grassSteps = 0;
          if (Math.random() < 0.6) {
            this.triggerWildBattle(currentGrassZone || (route.theme === 'forest' ? 'forest' : 'field'));
            return true;
          }
        }
      }
    }

    // Map section banner
    if (route.sections) {
      for (const sec of route.sections) {
        if (this.player.x >= sec.x && this.player.x <= sec.x + sec.w && this.player.y >= sec.y && this.player.y <= sec.y + sec.h) {
          if (!this.activeSection || this.activeSection.id !== sec.id) {
            this.activeSection = sec;
            this.sectionBannerTimer = 3.8;
            const locEl = document.getElementById('route-location-label');
            if (locEl) locEl.textContent = route.name + ' · ' + sec.name;
          }
          break;
        }
      }
    }
    if (this.sectionBannerTimer > 0) this.sectionBannerTimer -= dt;

    this.updateDiscoveries();
    this.updateSwitches(route);

    // Ground items (hidden ones must be revealed first)
    for (const it of route.items) {
      if (it.collected || (it.requires && !this.isConditionMet(it.requires))) continue;
      if (it.hidden && !this.revealedItems.has(it.id)) continue;
      if (Math.hypot(this.player.x - it.x, this.player.y - it.y) < 26) {
        it.collected = true;
        sound.beep(880, 0.15, 'sine');
        sound.beep(1100, 0.2, 'sine', 0.1, 0.12);
        this.onPickItem?.(it);
      }
    }

    // Linear route exits (main Kanto chain only; special areas use portals)
    if (!route.isSpecialArea) {
      if (route.exitX > 0 && this.player.x >= route.exitX && this.onRouteExit) {
        this.isPaused = true;
        sound.beep(780, 0.25, 'triangle');
        this.onRouteExit(route.id + 1);
        return true;
      }
      if (route.id > 0 && this.player.x <= 40 && this.onRoutePreviousExit) {
        this.isPaused = true;
        sound.beep(660, 0.25, 'triangle');
        this.onRoutePreviousExit(route.id - 1);
        return true;
      }
    }

    return false;
  }

  /** World logic for an external renderer that moves the trainer itself (3D chase view). */
  public tickWorld(dt: number, isMoving: boolean): boolean {
    const route = this.currentRoute;
    if (!route) return true;
    this.time += dt;
    if (this.player.cooldownTimer > 0) this.player.cooldownTimer -= dt;
    return this.worldStep(route, dt, isMoving);
  }

  private updateCompanionAndCamera(dt: number): void {
    this.companion.update(dt, this.player.x, this.player.y);
    const f = this.desiredFocus();
    // Frame-rate independent exponential smoothing: no overshoot, so no jitter.
    const k = 1 - Math.exp(-dt * 7);
    this.cam.fx += (f.x - this.cam.fx) * k;
    this.cam.fy += (f.y - this.cam.fy) * k;
  }

  private lastPromptKey = '';
  private updatePrompt(): void {
    const target = this.getInteractTarget();
    const key = target ? target.label + '|' + target.action : '';
    if (key === this.lastPromptKey) return; // avoid rebuilding DOM every frame
    this.lastPromptKey = key;
    const promptEl = document.getElementById('route-prompt');
    const actBtn = document.getElementById('btn-interact');
    if (promptEl) {
      if (target) {
        promptEl.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'context-label';
        label.textContent = target.label;
        const btn = document.createElement('button');
        btn.className = 'context-action-btn';
        btn.id = 'context-pill-btn';
        btn.textContent = target.action;
        promptEl.append(label, btn);
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }
    }
    if (actBtn) {
      if (target) {
        actBtn.classList.remove('hidden');
        actBtn.classList.add('pulse');
        actBtn.textContent = target.action;
      } else {
        actBtn.classList.add('hidden');
        actBtn.classList.remove('pulse');
      }
    }
  }

  /** Hidden paths / items reveal themselves at close range; the companion notices them earlier. */
  private updateDiscoveries(): void {
    const r = this.currentRoute!;
    const p = this.player;
    for (const portal of r.portals || []) {
      if (!portal.hidden || this.revealedPortals.has(portal.id)) continue;
      const d = Math.hypot(p.x - portal.x, p.y - portal.y);
      if (this.getFlag('portal:' + portal.id) || d < 46) {
        this.revealedPortals.add(portal.id);
        if (!this.getFlag('portal:' + portal.id)) {
          this.setFlag('portal:' + portal.id);
          sound.beep(988, 0.12, 'sine');
          sound.beep(1319, 0.2, 'sine', 0.06, 0.12);
          this.showToast('Hidden path discovered', portal.label);
          this.onReveal?.('portal', portal.label);
        }
      } else if (d < 150) {
        this.companion.notice('portal:' + portal.id, portal.x, portal.y, this.time);
      }
    }
    for (const it of r.items) {
      if (!it.hidden || it.collected || this.revealedItems.has(it.id)) continue;
      if (it.requires && !this.isConditionMet(it.requires)) continue;
      const d = Math.hypot(p.x - it.x, p.y - it.y);
      if (d < 44) {
        this.revealedItems.add(it.id);
        sound.beep(1175, 0.1, 'sine');
      } else if (d < 130) {
        this.companion.notice('item:' + it.id, it.x, it.y, this.time);
      }
    }
    for (const lm of r.landmarks || []) {
      if (this.getFlag('landmark:' + lm.id)) continue;
      if (Math.hypot(p.x - lm.x, p.y - lm.y) < 140) this.companion.notice('lm:' + lm.id, lm.x, lm.y, this.time);
    }
  }

  private updateSwitches(route: RouteDefinition): void {
    for (const sw of route.switches || []) {
      if (this.getFlag(sw.flag)) continue;
      const b = this.boulderPos.get(sw.id);
      if (b && Math.hypot(b.x - sw.x, b.y - sw.y) < 16) {
        this.boulderPos.set(sw.id, { x: sw.x, y: sw.y });
        this.setFlag(sw.flag);
        sound.swp(200, 90, 0.5, 'sawtooth', 0.12);
        sound.beep(784, 0.2, 'sine', 0.06, 0.35);
        this.showToast('Something rumbled nearby', 'A passage has opened');
        this.onPuzzleSolved?.(sw);
      }
    }
  }

  /** Push a boulder the trainer is walking into, if the space behind it is free. */
  private tryPushBoulder(nx: number, ny: number, ddx: number, ddy: number, dt: number): void {
    const route = this.currentRoute;
    if (!route || !route.boulders) return;
    const footY = ny + 8;
    for (const b of route.boulders) {
      const pos = this.boulderPos.get(b.id);
      if (!pos) continue;
      const r = b.r || 18;
      if (Math.hypot(nx - pos.x, footY - pos.y) >= r + 10) continue;
      // Solved boulders stay put
      const plate = (route.switches || []).find(sw => sw.id === b.id);
      if (plate && this.getFlag(plate.flag)) return;
      const step = 120 * dt;
      const tx = pos.x + ddx * step;
      const ty = pos.y + ddy * step;
      if (this.isBoulderSpotFree(b.id, tx, ty, r)) {
        pos.x = tx;
        pos.y = ty;
        if (Math.random() < 0.08) sound.nzs(0.08, 400, 200, 0.05, 0, 1, 'lowpass');
      }
      return;
    }
  }

  private isBoulderSpotFree(id: string, x: number, y: number, r: number): boolean {
    const route = this.currentRoute!;
    // Sample the boulder rim against the world (ignoring itself)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const sx = x + Math.cos(a) * r * 0.8;
      const sy = y + Math.sin(a) * r * 0.5;
      if (this.isBlocked(sx, sy - 8, route, id)) return false;
    }
    return true;
  }

  private isInShallows(x: number, footY: number): boolean {
    const r = this.currentRoute;
    if (!r || !r.waters) return false;
    return r.waters.some(w => w.kind === 'shallows' && x >= w.x && x <= w.x + w.w && footY >= w.y && footY <= w.y + w.h);
  }

  private triggerWildBattle(zone?: string): void {
    if (!this.currentRoute || this.isPaused) return;

    this.isPaused = true;
    sound.beep(220, 0.15, 'sawtooth');
    sound.beep(440, 0.25, 'sawtooth', 0.15);

    // Save exact position
    const savedX = this.player.x;
    const savedY = this.player.y;

    const isRare = zone === 'rare' || Math.random() < 0.08;
    const mon = generateEncounterMon(this.currentRoute.id, isRare, zone);

    if (this.onTriggerEncounter) {
      this.onTriggerEncounter(mon, savedX, savedY);
    }
  }

  private isInViewport(x: number, y: number, margin = 90): boolean {
    if (!this.canvas) return true;
    return (
      x >= this.camX - margin &&
      x <= this.camX + this.canvas.width + margin &&
      y >= this.camY - margin &&
      y <= this.camY + this.canvas.height + margin
    );
  }

  // ---------------------------------------------------------------------------
  // Export hooks for the first-person city view (reuses this engine's art,
  // collision, interactions and companion logic instead of duplicating them).
  // ---------------------------------------------------------------------------

  /** Top-down ground image (terrain, paths, water, grass, fountains) for a world rect. */
  public snapshotGround(route: RouteDefinition, rect: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
    this.rebuildCaches(route);
    this.ensureStaticGround(route);
    this.renderGroundView(route, rect);
    const out = document.createElement('canvas');
    out.width = Math.ceil(rect.w);
    out.height = Math.ceil(rect.h);
    out.getContext('2d')!.drawImage(this.groundCanvas!, 0, 0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  public worldProps(route: RouteDefinition): { trees: RouteTree[]; stones: RouteStone[]; fences: RouteFence[] } {
    this.rebuildCaches(route);
    return { trees: this.treeCache, stones: this.stoneCache, fences: this.fenceCache };
  }

  /** Paint one existing world object in absolute world coordinates (caller sets the transform). */
  public paintProp(ctx: CanvasRenderingContext2D, route: RouteDefinition, kind: 'tree' | 'stone' | 'fence' | 'lamp' | 'bench' | 'sign' | 'building' | 'npc', o: any): void {
    if (kind === 'tree') this.drawTree(ctx, o.x, o.y, o.scale || 1, o.type || 'broadleaf', o.colorVariant);
    else if (kind === 'stone') this.drawStone(ctx, o);
    else if (kind === 'fence') this.renderFences(ctx, route, [o]);
    else if (kind === 'lamp') this.renderStreetlamps(ctx, route, [o]);
    else if (kind === 'bench') this.renderBenches(ctx, route, [o]);
    else if (kind === 'sign') this.renderSignposts(ctx, route, [o]);
    else if (kind === 'building') this.renderBuilding(ctx, o);
    else if (kind === 'npc') drawTrainerSpriteCached(ctx, o.x, o.y, o.facing || 'down', 0, this.getNpcLook(o), false, 0, 1);
  }

  /** Ground items currently visible (same rules as the 2.5D renderer). */
  public visibleItems(): RouteItem[] {
    const r = this.currentRoute;
    if (!r) return [];
    return r.items.filter(it => !it.collected && !(it.requires && !this.isConditionMet(it.requires)) && !(it.hidden && !this.revealedItems.has(it.id)));
  }

  /** Whether a portal is shown, and whether it is currently locked. */
  public portalState(p: RoutePortal): { revealed: boolean; locked: boolean } {
    const revealed = !p.hidden || this.revealedPortals.has(p.id);
    return { revealed, locked: revealed && !!p.requires && !this.isConditionMet(p.requires) };
  }

  /** Current position of a pushable boulder. */
  public boulderPosition(id: string): { x: number; y: number } | undefined {
    return this.boulderPos.get(id);
  }

  /** Refresh the contextual A-button / prompt pill (used while the 2.5D loop is stopped). */
  public refreshPrompt(): void {
    this.updatePrompt();
  }

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const route = this.currentRoute;
    if (!ctx || !canvas || !route) return;
    const W = this.viewW;
    const H = this.viewH;
    const dpr = this.dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = this.backdropColor(route);
    ctx.fillRect(0, 0, W, H);

    const rect = this.cam.visibleWorldRect(36);
    this.ensureStaticGround(route);
    this.renderGroundView(route, rect);
    this.blitPerspectiveGround(ctx, route);
    this.renderSortedWorld(ctx, route, rect);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    this.renderScreenAtmosphere(ctx, route);
    if (route.dark) this.renderDarkness(ctx, route);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderSectionBanner(ctx);
    this.renderToast(ctx);
  }

  private backdropColor(route: RouteDefinition): string {
    if (route.backdrop) return route.backdrop;
    if (route.floors) return '#120f0d';
    return route.theme === 'forest' ? '#0f2c1c' : route.theme === 'city' ? '#1c3f2b' : route.theme === 'water' ? '#0b3355' : route.theme === 'rock' ? '#2a2a22' : '#173a1a';
  }

  /** Static ground (terrain, paths, ledges, cave floors) is rendered once per route. */
  private ensureStaticGround(route: RouteDefinition): void {
    if (this.staticRouteRef === route && this.staticCanvas) return;
    const w = Math.ceil(route.worldWidth);
    const h = Math.ceil(route.worldHeight);
    if (!this.staticCanvas) this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = w;
    this.staticCanvas.height = h;
    const g = this.staticCanvas.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.renderTerrain(g, route);
    for (const t of route.terrain || []) drawTerrainPatch(g, t);
    if (route.floors) drawCaveFloors(g, route.floors, w, h);
    this.renderLedges(g, route);
    this.renderPaths(g, route);
    this.staticRouteRef = route;
  }

  /** Top-down ground for the visible area: static cache + animated ground features. */
  private renderGroundView(route: RouteDefinition, rect: { x: number; y: number; w: number; h: number }): void {
    const gw = Math.ceil(rect.w) + 4;
    const gh = Math.ceil(rect.h) + 4;
    if (!this.groundCanvas) {
      this.groundCanvas = document.createElement('canvas');
      this.groundCtx = this.groundCanvas.getContext('2d');
    }
    const gc = this.groundCanvas;
    if (gc.width < gw || gc.height < gh) {
      gc.width = Math.max(gc.width, Math.ceil(gw / 128) * 128);
      gc.height = Math.max(gc.height, Math.ceil(gh / 128) * 128);
    }
    const g = this.groundCtx!;
    const ox = Math.floor(rect.x);
    const oy = Math.floor(rect.y);
    this.groundRect = { x: ox, y: oy, w: gw, h: gh };
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = this.backdropColor(route);
    g.fillRect(0, 0, gw, gh);

    const sx = Math.max(0, ox);
    const sy = Math.max(0, oy);
    const ex = Math.min(route.worldWidth, ox + gw);
    const ey = Math.min(route.worldHeight, oy + gh);
    if (this.staticCanvas && ex > sx && ey > sy) {
      g.drawImage(this.staticCanvas, sx, sy, ex - sx, ey - sy, sx - ox, sy - oy, ex - sx, ey - sy);
    }

    g.setTransform(1, 0, 0, 1, -ox, -oy);
    this.camX = ox;
    this.camY = oy;
    const vis = (r: Rect, m = 40) => r.x + r.w > ox - m && r.x < ox + gw + m && r.y + r.h > oy - m && r.y < oy + gh + m;

    for (const w of route.waters || []) if (vis(w)) drawWater(g, w, this.time);
    for (const b of route.bridges || []) if (vis(b)) drawBridge(g, b);
    this.renderPonds(g, route);
    this.renderFountains(g, route);
    this.renderTallGrass(g, route);
    for (const sw of route.switches || []) drawSwitchPlate(g, sw, this.getFlag(sw.flag), this.time);
    for (const f of route.fishingSpots || []) drawFishingSpot(g, f, this.time);

    // Drifting cloud shadows sell the scale of outdoor areas
    if (!route.floors && !route.dark) {
      g.fillStyle = 'rgba(10, 25, 20, 0.10)';
      for (let i = 0; i < 4; i++) {
        const span = route.worldWidth + 600;
        const cx = ((i * 977 + this.time * 14) % span) - 300;
        const cy = 140 + ((i * 431) % Math.max(200, route.worldHeight - 280));
        if (cx < ox - 300 || cx > ox + gw + 300) continue;
        g.beginPath();
        g.ellipse(cx, cy, 190, 70, 0.12, 0, Math.PI * 2);
        g.ellipse(cx + 120, cy + 26, 120, 50, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  /** Draw the top-down ground view row by row with perspective scaling. */
  private blitPerspectiveGround(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const gc = this.groundCanvas;
    if (!gc) return;
    const cam = this.cam;
    const W = this.viewW;
    const H = this.viewH;
    const gr = this.groundRect;
    const band = 2;
    for (let sy = 0; sy < H; sy += band) {
      const y0 = cam.groundYAtScreen(sy);
      const y1 = cam.groundYAtScreen(sy + band);
      if (y0 === null || y1 === null) continue;
      const s = cam.scaleAt((y0 + y1) * 0.5);
      let srcX = cam.worldXAtScreen(0, s) - gr.x;
      let srcW = W / s;
      const srcY = y0 - gr.y;
      const srcH = y1 - y0;
      let dX = 0;
      let dW = W;
      if (srcX < 0) {
        const cut = -srcX;
        dX += cut * s;
        dW -= cut * s;
        srcW -= cut;
        srcX = 0;
      }
      if (srcX + srcW > gc.width) {
        const cut = srcX + srcW - gc.width;
        dW -= cut * s;
        srcW -= cut;
      }
      if (srcW <= 1 || srcY < 0 || srcY + srcH > gc.height) continue;
      ctx.drawImage(gc, srcX, srcY, srcW, srcH, dX, sy, dW, band + 0.6);
    }
    // Atmospheric perspective: distant rows fade into a soft haze
    if (!route.floors && !route.dark) {
      const haze = ctx.createLinearGradient(0, 0, 0, H * 0.42);
      haze.addColorStop(0, 'rgba(196, 226, 236, 0.20)');
      haze.addColorStop(1, 'rgba(196, 226, 236, 0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H * 0.42);
    }
  }

  /** Every upright object is collected, depth-sorted by its ground anchor and drawn as a billboard. */
  private renderSortedWorld(ctx: CanvasRenderingContext2D, route: RouteDefinition, rect: { x: number; y: number; w: number; h: number }): void {
    const cam = this.cam;
    const dpr = this.dpr;
    const ents: { y: number; x: number; f: () => void }[] = [];
    const inView = (x: number, y: number, mx = 140) => x > rect.x - mx && x < rect.x + rect.w + mx && y > rect.y - 12 && y < rect.y + rect.h + 240;
    const add = (x: number, y: number, f: () => void, mx?: number) => {
      if (inView(x, y, mx)) ents.push({ x, y, f });
    };
    const bb = (ax: number, ay: number) => cam.billboard(ctx, ax, ay, dpr);
    const p = this.player;
    const playerAnchor = p.y + 13;
    const labels: { x: number; y: number; text: string; kind: RouteBuilding['type']; d: number }[] = [];

    for (const b of route.buildings) {
      const ay = b.y + b.h;
      add(b.x + b.w / 2, ay, () => {
        const behind = playerAnchor < ay && p.x > b.x - 16 && p.x < b.x + b.w + 16 && playerAnchor > b.y - 70;
        const alpha = behind ? 0.42 : 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const { labelAnchor } = drawBuildingVolume(ctx, cam, b, route.architecture, alpha);
        bb(b.x + b.w / 2, ay);
        ctx.globalAlpha = alpha;
        this.renderBuilding(ctx, b);
        ctx.globalAlpha = 1;
        labels.push({ x: labelAnchor.x, y: labelAnchor.y, text: b.label, kind: b.type, d: Math.hypot(p.x - (b.x + b.w / 2), p.y - ay) });
      }, b.w);
    }

    for (const t of this.treeCache) {
      const ay = this.getTreeTrunkFootY(t);
      add(t.x, ay, () => {
        const s = bb(t.x, ay);
        const occluding = ay > playerAnchor && Math.abs(t.x - p.x) < 34 * (t.scale || 1) && playerAnchor > ay - 78 * (t.scale || 1);
        ctx.globalAlpha = occluding ? 0.55 : 1;
        this.drawTree(ctx, t.x, t.y, t.scale || 1.0, t.type || 'broadleaf', t.colorVariant);
        ctx.globalAlpha = 1;
        void s;
      });
    }
    for (const st of this.stoneCache) add(st.x, st.y + st.radius * 0.4, () => { bb(st.x, st.y + st.radius * 0.4); this.drawStone(ctx, st); });
    for (const f of this.fenceCache) add(f.x + f.w / 2, f.y + f.h, () => { bb(f.x + f.w / 2, f.y + f.h); this.renderFences(ctx, route, [f]); }, f.w);
    for (const lamp of route.streetlamps || []) add(lamp.x, lamp.y + 2, () => { bb(lamp.x, lamp.y + 2); this.renderStreetlamps(ctx, route, [lamp]); });
    for (const bench of route.benches || []) add(bench.x + (bench.w || 28) / 2, bench.y + 14, () => { bb(bench.x + (bench.w || 28) / 2, bench.y + 14); this.renderBenches(ctx, route, [bench]); });
    for (const sp of route.signposts || []) add(sp.x, sp.y + 16, () => { bb(sp.x, sp.y + 16); this.renderSignposts(ctx, route, [sp]); });
    if (!route.isSpecialArea && route.exitX > 0) add(route.exitX - 30, 232, () => { bb(route.exitX - 30, 232); this.renderOverheadScenery(ctx, route); });

    for (const it of route.items) {
      if (it.collected || (it.requires && !this.isConditionMet(it.requires))) continue;
      if (it.hidden && !this.revealedItems.has(it.id)) continue;
      add(it.x, it.y + 7, () => { bb(it.x, it.y + 7); this.renderGroundItem(ctx, it); });
    }
    for (const portal of route.portals || []) {
      const revealed = !portal.hidden || this.revealedPortals.has(portal.id);
      const locked = revealed && !!portal.requires && !this.isConditionMet(portal.requires);
      add(portal.x, portalAnchorY(portal), () => { bb(portal.x, portalAnchorY(portal)); drawPortal(ctx, portal, this.time, revealed, locked); });
    }
    for (const wf of route.waterfalls || []) add(wf.x + wf.w / 2, wf.y, () => { bb(wf.x + wf.w / 2, wf.y); drawWaterfall(ctx, wf, this.time); }, wf.w);
    for (const bo of route.boulders || []) {
      const pos = this.boulderPos.get(bo.id) || bo;
      add(pos.x, pos.y, () => { bb(pos.x, pos.y); drawBoulder(ctx, { ...bo, x: pos.x, y: pos.y }); });
    }
    for (const ba of route.barriers || []) {
      if (this.getFlag(ba.openFlag)) continue;
      add(ba.x + ba.w / 2, ba.y + ba.h, () => { bb(ba.x + ba.w / 2, ba.y + ba.h); drawBarrier(ctx, ba, this.time); }, ba.w);
    }
    for (const lm of route.landmarks || []) add(lm.x, lm.y, () => { bb(lm.x, lm.y); drawLandmark(ctx, lm, this.time, this.getFlag('landmark:' + lm.id)); });
    for (const c of route.crystals || []) add(c.x, c.y, () => { bb(c.x, c.y); drawCrystal(ctx, c, this.time); });
    for (const nb of route.noticeBoards || []) add(nb.x, nb.y, () => { bb(nb.x, nb.y); drawNoticeBoard(ctx, nb, !!this.noticeBoardHasNew?.(nb), this.time); });
    for (const enc of route.staticEncounters || []) {
      if (this.getFlag(enc.doneFlag) || !this.isConditionMet(enc.requires)) continue;
      add(enc.x, enc.y + 8, () => { bb(enc.x, enc.y + 8); this.drawWildSprite(ctx, enc.x, enc.y + 8, enc.speciesId, 'alert', 1.15); });
    }
    for (const lost of route.lostPokemon || []) {
      if (this.getFlag(lost.foundFlag) || !this.isConditionMet(lost.requires)) continue;
      add(lost.x, lost.y + 8, () => { bb(lost.x, lost.y + 8); this.drawWildSprite(ctx, lost.x, lost.y + 8, lost.speciesId, 'talk', 0.9); });
    }

    for (const npc of this.visibleNPCs()) add(npc.x, npc.y + 13, () => { bb(npc.x, npc.y + 13); this.renderNPC(ctx, npc); });

    if (this.companion.info) {
      const c = this.companion;
      add(c.x, c.anchorY, () => { bb(c.x, c.anchorY); c.draw(ctx, this.time); });
    }
    ents.push({
      x: p.x,
      y: playerAnchor,
      f: () => {
        bb(p.x, playerAnchor);
        this.renderGrassParticles(ctx);
        this.renderPlayer(ctx);
      },
    });

    ents.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const e of ents) e.f();

    // Building signage floats above roofs and is never occluded; distant labels fade out.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const l of labels) {
      const a = Math.max(0, Math.min(1, (620 - l.d) / 240));
      if (a <= 0.02) continue;
      this.drawBuildingLabel(ctx, l.x, l.y - 14, l.text, l.kind, a);
    }
  }

  private drawBuildingLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, kind: RouteBuilding['type'], alpha: number): void {
    const accent = kind === 'gym' ? '#facc15' : kind === 'mart' ? '#60a5fa' : kind === 'center' ? '#fca5a5' : kind === 'house' ? '#86efac' : '#cbd5e1';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 10.5px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = 'rgba(10, 15, 28, 0.82)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 10, w, 19, 9.5);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x - w / 2 + 9, y - 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 4, y);
    ctx.restore();
  }

  /** Overworld Pokémon (static encounters / lost Pokémon). */
  private drawWildSprite(ctx: CanvasRenderingContext2D, x: number, footY: number, speciesId: number, marker: 'alert' | 'talk', scale: number): void {
    const size = 50 * scale;
    const bob = Math.abs(Math.sin(this.time * 2.2 + x)) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(x, footY, size * 0.3, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    const img = getPokemonSprite(speciesId);
    if (img) {
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x - size / 2, footY - size * 0.84 - bob, size, size);
      ctx.imageSmoothingEnabled = prev;
    }
    if (Math.hypot(this.player.x - x, this.player.y - footY) < 220) drawMarker(ctx, x, footY - size * 0.9 - 6, marker, this.time);
  }

  private renderScreenAtmosphere(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const W = this.viewW;
    const H = this.viewH;
    const indoor = !!route.floors || !!route.dark;
    if (!indoor) {
      // Soft diagonal sun shafts
      for (let i = 0; i < 3; i++) {
        const rx = ((i * W) / 3 + ((this.time * 6) % 90)) - 40;
        const g = ctx.createLinearGradient(rx, 0, rx + 120, H);
        g.addColorStop(0, 'rgba(254, 240, 138, 0.07)');
        g.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(rx - 30, 0);
        ctx.lineTo(rx + 60, 0);
        ctx.lineTo(rx + 220, H);
        ctx.lineTo(rx + 110, H);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Floating particles, projected into the scene (dust motes underground)
    for (const pt of this.particles) {
      const sp = this.cam.project(pt.x, pt.y);
      if (sp.x < -10 || sp.x > W + 10 || sp.y < -10 || sp.y > H + 10) continue;
      const lift = 28 * sp.s;
      ctx.save();
      ctx.translate(sp.x, sp.y - lift);
      ctx.rotate(pt.rot);
      ctx.globalAlpha = pt.alpha * (indoor ? 0.5 : 1);
      const sz = pt.size * sp.s;
      if (indoor) {
        ctx.fillStyle = '#e7e5e4';
        ctx.fillRect(-sz * 0.25, -sz * 0.25, sz * 0.5, sz * 0.5);
      } else if (pt.type === 'leaf') {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'blossom') {
        ctx.fillStyle = '#f9a8d4';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Gentle vignette focuses the eye on the trainer
    const v = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, indoor ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /** Cave darkness with light pools around the trainer, crystals and exits. */
  private renderDarkness(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const pw = Math.round(this.viewW * this.dpr);
    const ph = Math.round(this.viewH * this.dpr);
    if (!this.darkCanvas) this.darkCanvas = document.createElement('canvas');
    const dc = this.darkCanvas;
    if (dc.width !== pw || dc.height !== ph) {
      dc.width = pw;
      dc.height = ph;
    }
    const d = dc.getContext('2d')!;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, pw, ph);
    d.fillStyle = `rgba(3, 4, 12, ${route.dark})`;
    d.fillRect(0, 0, pw, ph);
    d.globalCompositeOperation = 'destination-out';
    const light = (wx: number, wy: number, radius: number, strength = 1) => {
      const sp = this.cam.project(wx, wy);
      const r = radius * sp.s * this.dpr;
      const x = sp.x * this.dpr;
      const y = (sp.y - 14 * sp.s) * this.dpr;
      if (x < -r || x > pw + r || y < -r || y > ph + r) return;
      const g = d.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.75})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const flicker = 1 + Math.sin(this.time * 9) * 0.015 + Math.sin(this.time * 23) * 0.01;
    light(this.player.x, this.player.y, (this.hasLantern ? 220 : 130) * flicker);
    for (const c of route.crystals || []) if (c.light) light(c.x, c.y, c.light, 0.8);
    for (const pt of route.portals || []) if (pt.style === 'cave_exit') light(pt.x, pt.y - 10, 120, 0.9);
    for (const sw of route.switches || []) if (this.getFlag(sw.flag)) light(sw.x, sw.y, 60, 0.6);
    d.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dc, 0, 0);
    // Warm lantern tint
    if (this.hasLantern) {
      const sp = this.cam.project(this.player.x, this.player.y);
      const g = ctx.createRadialGradient(sp.x * this.dpr, sp.y * this.dpr, 4, sp.x * this.dpr, sp.y * this.dpr, 160 * sp.s * this.dpr);
      g.addColorStop(0, 'rgba(255, 196, 120, 0.10)');
      g.addColorStop(1, 'rgba(255, 196, 120, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, pw, ph);
    }
  }

  private renderToast(ctx: CanvasRenderingContext2D): void {
    const t = this.toast;
    if (!t) return;
    const a = Math.max(0, Math.min(1, t.t * 2, (2.6 - t.t) * 4));
    const W = this.viewW;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '800 13px system-ui, sans-serif';
    const tw = Math.max(ctx.measureText(t.title).width, (ctx.font = '600 11px system-ui, sans-serif', ctx.measureText(t.sub).width));
    const w = Math.min(W - 24, tw + 40);
    const x = (W - w) / 2;
    const y = this.viewH - 118;
    ctx.fillStyle = 'rgba(10, 15, 28, 0.86)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 44, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(t.title, W / 2, y + 19);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText(t.sub, W / 2, y + 35);
    ctx.restore();
  }

  private renderTerrain(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const isForest = route.theme === 'forest';
    const isCity = route.theme === 'city';
    const isRock = route.theme === 'rock';
    const isWater = route.theme === 'water';

    // Theme-tailored vibrant natural turf base
    const baseCol = isForest
      ? '#1e5234'
      : isCity
        ? '#2d6945'
        : isRock
          ? '#3b633b'
          : isWater
            ? '#215e4b'
            : '#2e7d32'; // Vibrant, rich clean natural lawn green!

    // 1. Rich Base Ground Lawn Fill
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, route.worldWidth, route.worldHeight);

    // 2. Subtle Natural Meadow Gradient (Clean sunlight flow without dark blotches)
    const meadowGrad = ctx.createLinearGradient(0, 0, route.worldWidth, route.worldHeight);
    meadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    meadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    meadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.03)');
    ctx.fillStyle = meadowGrad;
    ctx.fillRect(0, 0, route.worldWidth, route.worldHeight);

    // 3. Ground Micro-Details: Clover clusters, yellow dandelions & delicate short lawn blades
    // (Giving the normal walkable turf realistic living grass texture without any dark spots)
    for (let x = 20; x < route.worldWidth - 20; x += 40) {
      for (let y = 25; y < route.worldHeight - 25; y += 38) {
        // Skip paths and buildings for clean ground
        if (this.isPointOnRoad(x, y, route)) continue;
        if (this.isInsideBuilding(x, y, route)) continue;

        const dHash = Math.sin(x * 37.1 + y * 91.7) * 10000;
        const val = dHash - Math.floor(dHash);

        const ox = (val * 24) - 12;
        const oy = ((val * 7) % 1) * 20 - 10;
        const gx = x + ox;
        const gy = y + oy;

        if (val > 0.82) {
          // Wild 4-leaf clover cluster
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(gx - 2, gy - 2, 1.8, 0, Math.PI * 2);
          ctx.arc(gx + 2, gy - 2, 1.8, 0, Math.PI * 2);
          ctx.arc(gx - 2, gy + 2, 1.8, 0, Math.PI * 2);
          ctx.arc(gx + 2, gy + 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (val < 0.12) {
          // Tiny sunlit dandelion flower
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(gx, gy, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1);
        } else if (val > 0.35 && val < 0.65) {
          // Subtle short lawn blade pair (natural crisp lawn texture)
          ctx.fillStyle = val > 0.50 ? '#388e3c' : '#43a047';
          ctx.beginPath();
          ctx.moveTo(gx - 2, gy + 3);
          ctx.lineTo(gx - 1, gy);
          ctx.lineTo(gx, gy + 3);
          ctx.moveTo(gx, gy + 3);
          ctx.lineTo(gx + 1.5, gy + 0.5);
          ctx.lineTo(gx + 2.5, gy + 3);
          ctx.fill();
        }
      }
    }

    // 5. Route Perimeter Vignette (Dark lush tree-line depth)
    const vigGrad = ctx.createLinearGradient(0, 0, 0, 60);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, route.worldWidth, 60);

    const btmVig = ctx.createLinearGradient(0, route.worldHeight, 0, route.worldHeight - 60);
    btmVig.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    btmVig.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = btmVig;
    ctx.fillRect(0, route.worldHeight - 60, route.worldWidth, 60);
  }

  private renderPaths(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const isCityTheme = route.theme === 'city';

    for (const p of route.path) {
      ctx.save();

      // Soft ambient drop shadow underneath the entire path bed
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.roundRect(p.x - 2, p.y - 2, p.w + 4, p.h + 6, 8);
      ctx.fill();

      // Determine if this path segment is paved flagstone / cobble / brick / city avenue
      const isPaved =
        p.style === 'flagstone' ||
        p.style === 'cobble' ||
        p.style === 'brick' ||
        p.style === 'paved' ||
        isCityTheme ||
        (route.id === 0 && p.x >= 1900);

      if (isPaved) {
        // ====================================================================
        // CITY PLAZA / PAVED STREETS: Ashlar Flagstones with City-Specific Tones
        // ====================================================================
        let paverTones = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#fed7aa', '#cbd5e1']; // Default / Viridian ivory
        let subBaseColor = '#64748b';
        let curbColor = '#475569';
        let paverW = 32;
        let paverH = 20;

        if (p.style === 'brick' || route.id === 3) {
          // Vermilion Port Brickwork & Harbor Boardwalk
          paverTones = ['#ea580c', '#c2410c', '#9a3412', '#b45309', '#f97316'];
          subBaseColor = '#7c2d12';
          curbColor = '#431407';
          paverW = 26;
          paverH = 16;
        } else if (p.style === 'cobble' || route.id === 1) {
          // Pewter Stone / Mt. Moon Granite Chiseled Slate
          paverTones = ['#475569', '#334155', '#64748b', '#1e293b', '#4b5563'];
          subBaseColor = '#1e293b';
          curbColor = '#0f172a';
          paverW = 28;
          paverH = 22;
        } else if (route.id === 2) {
          // Cerulean Floral Water City Cyan / Azure Stone
          paverTones = ['#e0f2fe', '#bae6fd', '#cbd5e1', '#f1f5f9', '#93c5fd'];
          subBaseColor = '#0284c7';
          curbColor = '#0369a1';
        } else if (route.id === 4) {
          // Celadon City Rainbow & Pastel Marble Flagstones
          paverTones = ['#fdf4ff', '#fae8ff', '#f3e8ff', '#f8fafc', '#fef3c7'];
          subBaseColor = '#86198f';
          curbColor = '#a21caf';
          paverW = 34;
          paverH = 22;
        } else if (route.id === 5) {
          // Fuchsia Ninja & Safari Timber/Earthen Stone
          paverTones = ['#d97706', '#b45309', '#92400e', '#78350f', '#fed7aa'];
          subBaseColor = '#451a03';
          curbColor = '#78350f';
          paverW = 30;
          paverH = 18;
        } else if (route.id === 6) {
          // Saffron Tech Platinum & Gold Metropolis Pavers
          paverTones = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#fef08a', '#cbd5e1'];
          subBaseColor = '#334155';
          curbColor = '#eab308';
          paverW = 36;
          paverH = 24;
        } else if (route.id === 7) {
          // Cinnabar Volcanic Basalt & Obsidian Sand
          paverTones = ['#1e293b', '#0f172a', '#334155', '#ea580c', '#475569'];
          subBaseColor = '#450a0a';
          curbColor = '#dc2626';
          paverW = 28;
          paverH = 20;
        } else if (route.id === 8) {
          // Indigo Plateau Champions Marble & Gold
          paverTones = ['#ffffff', '#f8fafc', '#f1f5f9', '#fef9c3', '#e2e8f0'];
          subBaseColor = '#713f12';
          curbColor = '#facc15';
          paverW = 38;
          paverH = 24;
        }

        // Sub-base foundation bed
        ctx.fillStyle = subBaseColor;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        let rowIdx = 0;
        for (let py = p.y; py < p.y + p.h; py += paverH) {
          const rowOffset = (rowIdx % 2 === 0) ? 0 : paverW / 2;
          for (let px = p.x - paverW; px < p.x + p.w + paverW; px += paverW) {
            const actualX = px + rowOffset;
            if (actualX + paverW < p.x || actualX > p.x + p.w) continue;

            // Clip boundaries of pavers at path edges
            const drawX = Math.max(p.x, actualX);
            const drawY = Math.max(p.y, py);
            const drawW = Math.min(p.x + p.w, actualX + paverW) - drawX;
            const drawH = Math.min(p.y + p.h, py + paverH) - drawY;

            if (drawW <= 1 || drawH <= 1) continue;

            const paverHash = Math.abs(Math.sin(actualX * 17.3 + py * 41.9));
            const toneIdx = Math.floor(paverHash * paverTones.length);
            const stoneColor = paverTones[toneIdx];

            // 1. Paver Face
            ctx.fillStyle = stoneColor;
            ctx.fillRect(drawX + 1, drawY + 1, drawW - 2, drawH - 2);

            // 2. Sunlit 3D Bevel (Top & Left Highlight)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillRect(drawX + 1, drawY + 1, drawW - 2, 1);
            ctx.fillRect(drawX + 1, drawY + 1, 1, drawH - 2);

            // 3. Shaded 3D Bevel (Bottom & Right Drop Shadow)
            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.fillRect(drawX + 1, drawY + drawH - 2, drawW - 2, 1);
            ctx.fillRect(drawX + drawW - 2, drawY + 1, 1, drawH - 2);

            // 4. Subtle Surface Weathering / Micro-Fleck
            if (paverHash > 0.7) {
              ctx.fillStyle = 'rgba(51, 65, 85, 0.2)';
              ctx.fillRect(drawX + drawW * 0.4, drawY + drawH * 0.4, 3, 2);
            }
          }
          rowIdx++;
        }

        // Heavy Chiseled Granite Curb Border
        ctx.strokeStyle = curbColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 1.5, p.y + 1.5, p.w - 3, p.h - 3);

      } else {
        // ====================================================================
        // COUNTRY ROUTE: Natural Organic Dirt Trail with Cobblestones & Pebbles
        // ====================================================================
        // 1. Deep Earth Loam Base
        ctx.fillStyle = '#8c5e39';
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // 2. Main Sunlit Trodden Earth Bed
        ctx.fillStyle = '#b88d67';
        ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);

        // 3. Central Sun-Baked Walking Lane
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(p.x + 10, p.y + 8, p.w - 20, p.h - 16);

        // 4. Subtle Dual Wagon / Foot-Traffic Ruts
        ctx.fillStyle = '#a07855';
        ctx.fillRect(p.x + 12, p.y + 14, p.w - 24, 6);
        ctx.fillRect(p.x + 12, p.y + p.h - 20, p.w - 24, 6);

        // 5. Embedded 3D Cobblestones & River Stones (Organically scattered, not in rigid lines!)
        const stoneCount = Math.floor(p.w / 20);
        for (let i = 0; i < stoneCount; i++) {
          const sHash1 = Math.abs(Math.sin((p.x + i * 29.3) * 1.7));
          const sHash2 = Math.abs(Math.cos((p.y + i * 47.9) * 2.3));
          const stX = p.x + 12 + sHash1 * (p.w - 24);
          const stY = p.y + 10 + sHash2 * (p.h - 20);

          const rx = 3.2 + (sHash1 * 2.5);
          const ry = 2.0 + (sHash2 * 1.6);
          const rot = sHash1 * Math.PI;

          // Stone Drop Shadow
          ctx.fillStyle = 'rgba(30, 20, 10, 0.35)';
          ctx.beginPath();
          ctx.ellipse(stX + 1.2, stY + 2, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();

          // Stone Body
          ctx.fillStyle = sHash1 > 0.5 ? '#8c6239' : '#a67c52';
          ctx.beginPath();
          ctx.ellipse(stX, stY, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();

          // Sunlit Specular Highlight (Top-left)
          ctx.fillStyle = '#e6ccb2';
          ctx.beginPath();
          ctx.ellipse(stX - rx * 0.3, stY - ry * 0.3, rx * 0.4, ry * 0.35, rot, 0, Math.PI * 2);
          ctx.fill();
        }

        // 6. Organic Edge Grass Encroachment (Soft natural scalloped borders)
        const grassEdgeCol = route.theme === 'forest' ? '#173d2a' : '#22552b';
        ctx.fillStyle = grassEdgeCol;

        // Top Border Soft Natural Encroachment
        for (let bx = p.x; bx < p.x + p.w; bx += 16) {
          const eHash = Math.abs(Math.sin(bx * 17.3));
          const eW = 10 + eHash * 10;
          const eH = 2 + eHash * 4;
          ctx.beginPath();
          ctx.ellipse(bx + eW / 2, p.y + 1, eW / 2, eH, 0, 0, Math.PI);
          ctx.fill();
        }

        // Bottom Border Soft Natural Encroachment
        for (let bx = p.x; bx < p.x + p.w; bx += 16) {
          const eHash = Math.abs(Math.sin(bx * 29.7));
          const eW = 10 + eHash * 10;
          const eH = 2 + eHash * 4;
          ctx.beginPath();
          ctx.ellipse(bx + eW / 2, p.y + p.h - 1, eW / 2, eH, 0, Math.PI, 0);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  private renderTallGrass(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const px = this.player.x;
    const py = this.player.y;
    const camW = this.groundRect.w || this.viewW;
    const camH = this.groundRect.h || this.viewH;

    for (const g of route.grassPatches) {
      // 1. Frustum Culling: skip patches outside camera view
      if (
        g.x + g.w < this.camX - 40 ||
        g.x > this.camX + camW + 40 ||
        g.y + g.h < this.camY - 40 ||
        g.y > this.camY + camH + 40
      ) {
        continue;
      }
      if (g.style && g.style !== 'grass') {
        drawEncounterPatch(ctx, g, this.time);
        continue;
      }

      ctx.save();

      // 2. Soft Ambient Drop Shadow Underneath Grass Patch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.beginPath();
      ctx.roundRect(g.x + 2, g.y + 5, g.w, g.h, 14);
      ctx.fill();

      const isRarePatch = g.zone === 'rare';

      // 3. Rich Fertile Humus & Moss Under-Bed (Natural blend with lawn turf)
      ctx.fillStyle = isRarePatch ? '#0d3824' : '#225d33';
      ctx.beginPath();
      ctx.roundRect(g.x, g.y, g.w, g.h, 12);
      ctx.fill();

      ctx.fillStyle = isRarePatch ? '#134e31' : '#2c733f';
      ctx.beginPath();
      ctx.roundRect(g.x + 2.5, g.y + 2.5, g.w - 5, g.h - 5, 10);
      ctx.fill();

      if (isRarePatch) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2, 11);
        ctx.stroke();
      }

      // 4. Natural Organic Edge Scalloping (Breaks straight rectangular boundaries)
      ctx.fillStyle = isRarePatch ? '#10b981' : '#388e3c';
      // Top Edge Fringe
      for (let ex = g.x + 6; ex < g.x + g.w - 6; ex += 16) {
        const ew = Math.sin(this.time * 2.5 + ex * 0.05) * 2;
        ctx.beginPath();
        ctx.moveTo(ex - 3, g.y + 4);
        ctx.quadraticCurveTo(ex + ew, g.y - 4, ex + 3, g.y + 4);
        ctx.fill();
      }
      // Bottom Edge Fringe
      for (let ex = g.x + 6; ex < g.x + g.w - 6; ex += 16) {
        const ew = Math.sin(this.time * 2.5 + ex * 0.05) * 2;
        ctx.beginPath();
        ctx.moveTo(ex - 3, g.y + g.h - 2);
        ctx.quadraticCurveTo(ex + ew, g.y + g.h + 5, ex + 3, g.y + g.h - 2);
        ctx.fill();
      }
      // Left Edge Fringe
      for (let ey = g.y + 6; ey < g.y + g.h - 6; ey += 16) {
        ctx.beginPath();
        ctx.moveTo(g.x + 3, ey - 3);
        ctx.quadraticCurveTo(g.x - 4, ey, g.x + 3, ey + 3);
        ctx.fill();
      }
      // Right Edge Fringe
      for (let ey = g.y + 6; ey < g.y + g.h - 6; ey += 16) {
        ctx.beginPath();
        ctx.moveTo(g.x + g.w - 3, ey - 3);
        ctx.quadraticCurveTo(g.x + g.w + 4, ey, g.x + g.w - 3, ey + 3);
        ctx.fill();
      }

      // 5. Dense Living Tall Grass Blade Tufts
      const tuftStep = 15;
      for (let gx = g.x + 4; gx < g.x + g.w - 4; gx += tuftStep) {
        for (let gy = g.y + 4; gy < g.y + g.h - 4; gy += tuftStep) {
          // Organic deterministic tuft offset
          const jx = Math.sin(gx * 23.1 + gy * 47.9) * 2.8;
          const jy = Math.cos(gx * 41.3 + gy * 19.7) * 2.2;
          const tx = gx + jx;
          const ty = gy + jy;

          // Dynamic 2-Phase Wind Waves
          const broadWind = Math.sin(this.time * 2.6 + tx * 0.045 + ty * 0.035) * 3.8;
          const rustle = Math.sin(this.time * 6.0 + tx * 0.18 + ty * 0.12) * 1.2;
          let windSway = broadWind + rustle;

          // Reactive Player Blade Parting: blades push aside as Red walks through
          const distToPlayer = Math.hypot(tx - px, ty - (py + 10));
          if (distToPlayer < 36) {
            const pushFactor = (1 - distToPlayer / 36) * 8.5;
            const pushDir = tx >= px ? 1 : -1;
            windSway += pushFactor * pushDir;
          }

          // Blade 1: Deep Occlusion Shadow Blade behind
          ctx.fillStyle = '#0f381e';
          ctx.beginPath();
          ctx.moveTo(tx - 4, ty + 13);
          ctx.lineTo(tx + windSway * 0.65 - 2, ty + 2);
          ctx.lineTo(tx + 2, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Blade 2: Left Curved Jade Blade
          ctx.fillStyle = isRarePatch ? '#059669' : '#2e7d32';
          ctx.beginPath();
          ctx.moveTo(tx - 5, ty + 13);
          ctx.quadraticCurveTo(tx - 3 + windSway * 0.5, ty + 7, tx - 3 + windSway, ty + 1);
          ctx.lineTo(tx - 1, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Blade 3: Center Dominant Lush Emerald Blade
          ctx.fillStyle = isRarePatch ? '#10b981' : '#388e3c';
          ctx.beginPath();
          ctx.moveTo(tx - 2, ty + 13);
          ctx.quadraticCurveTo(tx + windSway * 0.5, ty + 6, tx + windSway + 1, ty - 3);
          ctx.lineTo(tx + 2, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Sunlit Lime/Gold Tip Glow on Center Blade
          ctx.fillStyle = isRarePatch ? '#fde047' : '#81c784';
          ctx.beginPath();
          ctx.moveTo(tx + windSway - 1, ty + 2);
          ctx.lineTo(tx + windSway + 1, ty - 3);
          ctx.lineTo(tx + windSway + 3, ty + 2);
          ctx.closePath();
          ctx.fill();

          // Blade 4: Right Curved Bright Lime Blade
          ctx.fillStyle = isRarePatch ? '#34d399' : '#4caf50';
          ctx.beginPath();
          ctx.moveTo(tx + 1, ty + 13);
          ctx.quadraticCurveTo(tx + 3 + windSway * 0.6, ty + 7, tx + 4 + windSway, ty + 2);
          ctx.lineTo(tx + 5, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Embedded Natural Clustered Wildflowers
          const clusterKey = Math.floor(gx / 48) * 37 + Math.floor(gy / 48) * 73;
          const clusterHash = Math.abs(Math.sin(clusterKey));
          const isFlowerSpot = clusterHash > 0.65 && ((gx % 48 < 24) && (gy % 48 < 24));

          if (isFlowerSpot) {
            const flowerColors = [
              { petal: '#facc15', eye: '#c2410c' }, // Golden Buttercup
              { petal: '#ef4444', eye: '#450a0a' }, // Crimson Poppy
              { petal: '#38bdf8', eye: '#ffffff' }, // Forget-Me-Not Blue
              { petal: '#ffffff', eye: '#f59e0b' }, // White Daisy
              { petal: '#c084fc', eye: '#581c87' }, // Purple Lavender
            ];
            const fIdx = Math.floor(clusterHash * 10) % flowerColors.length;
            const fPair = flowerColors[fIdx];

            const fx = tx + 2 + windSway * 0.65;
            const fy = ty + 3;

            // Flexible Flower Stem
            ctx.strokeStyle = '#2d6a4f';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(tx + 2, ty + 12);
            ctx.quadraticCurveTo(tx + 2 + windSway * 0.3, ty + 8, fx, fy + 3);
            ctx.stroke();

            // Petals
            ctx.fillStyle = fPair.petal;
            ctx.beginPath();
            ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
            ctx.fill();

            // Center Eye
            ctx.fillStyle = fPair.eye;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    }
  }

  private renderBuilding(ctx: CanvasRenderingContext2D, b: RouteBuilding): void {
    ctx.save();

    // Universal Soft Contact Shadow (Drop shadow with soft ambient occlusion)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h + 3, b.w / 2 + 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    if (b.type === 'center') {
      // ======================================================================
      // POKÉMON CENTER: Architectural Crimson Gabled Roof with Pulsing Crest
      // ======================================================================
      // 1. Concrete 3-Tier Foundation & Accessible Ramp
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 5, b.y + b.h - 8, b.w + 10, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(b.x - 3, b.y + b.h - 6, b.w + 6, 6);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(b.x - 1, b.y + b.h - 4, b.w + 2, 4);

      // 2. Main Facade Walls (Cream Architectural Stucco with Horizontal Lap Relief)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(b.x, b.y + 24, b.w, b.h - 26);

      // Subtle horizontal siding courses
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let sy = b.y + 32; sy < b.y + b.h - 6; sy += 9) {
        ctx.beginPath();
        ctx.moveTo(b.x + 7, sy);
        ctx.lineTo(b.x + b.w - 7, sy);
        ctx.stroke();
      }

      // 3. Sky-Blue Fluted Architectural Pilasters at Corners
      [-2, b.w - 7].forEach(pxOff => {
        const pilX = b.x + pxOff;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(pilX, b.y + 24, 9, b.h - 26);
        ctx.fillStyle = '#38bdf8'; // Sunlit pilaster bevel
        ctx.fillRect(pilX, b.y + 24, 2, b.h - 26);
        // Capital & Plinth
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(pilX - 1, b.y + 23, 11, 3);
        ctx.fillRect(pilX - 1, b.y + b.h - 5, 11, 3);
      });

      // 4. Crimson Curved Gabled Roof with Terracotta Tile Texture
      ctx.fillStyle = '#7f1d1d'; // Deep shadow under-eaves
      ctx.fillRect(b.x - 9, b.y + 22, b.w + 18, 6);

      // Main Crimson Gable Body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(b.x - 9, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 8);
      ctx.lineTo(b.x + b.w + 9, b.y + 24);
      ctx.closePath();
      ctx.fill();

      // Sun-facing Roof Shingle Highlight (Left half)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y + 22);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w / 2, b.y + 22);
      ctx.lineTo(b.x - 4, b.y + 22);
      ctx.closePath();
      ctx.fill();

      // Shingle tile lines
      ctx.strokeStyle = 'rgba(153, 27, 27, 0.45)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 4; r++) {
        const ry = b.y + 2 + r * 5;
        const widthAtRy = (b.w + 14) * (1 - r * 0.22);
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 - widthAtRy / 2, ry);
        ctx.lineTo(b.x + b.w / 2 + widthAtRy / 2, ry);
        ctx.stroke();
      }

      // Enameled White Fascia Bargeboard Trim
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(b.x - 9, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 8);
      ctx.lineTo(b.x + b.w + 9, b.y + 24);
      ctx.stroke();

      // 5. Communications Mast with Animated Green Beacon
      const antX = b.x + b.w / 2;
      const antY = b.y - 8;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(antX, antY);
      ctx.lineTo(antX, antY - 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(antX - 4, antY - 6);
      ctx.lineTo(antX + 4, antY - 6);
      ctx.stroke();

      const beaconGlow = Math.sin(this.time * 6) > 0;
      ctx.fillStyle = beaconGlow ? '#4ade80' : '#15803d';
      ctx.beginPath();
      ctx.arc(antX, antY - 13, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // 6. Arched Transom Windows with Warm Amber Golden Glow & Light Spills
      const winW = 16;
      const winH = 20;
      const winY = b.y + 30;

      [b.x + 11, b.x + b.w - 11 - winW].forEach(wx => {
        // Window Frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wx - 1.5, winY - 1.5, winW + 3, winH + 3);

        // Golden Warm Interior Light
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(wx, winY, winW, winH);

        // Glass Specular Glare
        ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
        ctx.beginPath();
        ctx.moveTo(wx, winY + winH);
        ctx.lineTo(wx + winW, winY);
        ctx.lineTo(wx + winW - 5, winY);
        ctx.lineTo(wx, winY + winH - 5);
        ctx.closePath();
        ctx.fill();

        // White Window Cross Mullions
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wx + winW / 2, winY);
        ctx.lineTo(wx + winW / 2, winY + winH);
        ctx.moveTo(wx, winY + winH / 2);
        ctx.lineTo(wx + winW, winY + winH / 2);
        ctx.stroke();

        // Flowerbox beneath window with blooming tulips
        ctx.fillStyle = '#58240c';
        ctx.fillRect(wx - 2, winY + winH + 1, winW + 4, 4);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(wx - 1, winY + winH - 1, winW + 2, 2);
        // Tulip petals
        const flCols = ['#ef4444', '#facc15', '#f472b6'];
        for (let fx = wx; fx < wx + winW; fx += 5) {
          ctx.fillStyle = flCols[Math.floor(fx) % flCols.length];
          ctx.beginPath();
          ctx.arc(fx + 2, winY + winH - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Automatic Sliding Cyan Glass Entrance
      const doorW = 28;
      const doorH = 26;
      const doorX = b.x + b.w / 2 - doorW / 2;
      const doorY = b.y + b.h - doorH;

      // Dark Frame
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2);

      // Cyan Backlit Glass
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.fillRect(doorX, doorY, doorW, doorH);

      // Glass Diagonal Glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(doorX + 3, doorY + doorH);
      ctx.lineTo(doorX + doorW - 5, doorY + 2);
      ctx.lineTo(doorX + doorW - 11, doorY + 2);
      ctx.lineTo(doorX + 3, doorY + doorH - 9);
      ctx.closePath();
      ctx.fill();

      // Center Door Seam
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(doorX + doorW / 2, doorY);
      ctx.lineTo(doorX + doorW / 2, doorY + doorH);
      ctx.stroke();

      // Green Welcome Floor Mat
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(doorX + 3, doorY + doorH - 3, doorW - 6, 4);

      // 8. Iconic Illuminated 3D Poké Ball Crest on Gable
      const crestX = b.x + b.w / 2;
      const crestY = b.y + 11;
      const crestR = 11;

      // Chrome Metallic Outer Bezel
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR + 2, 0, Math.PI * 2);
      ctx.fill();

      // Lower White Dome
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR, 0, Math.PI);
      ctx.fill();

      // Upper Crimson Dome
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR, Math.PI, 0);
      ctx.fill();

      // Specular Highlight on Upper Crimson Dome
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(crestX - 3, crestY - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Center Divider Band
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(crestX - crestR, crestY - 1.8, crestR * 2, 3.6);

      // Center Button with Pulsing Cyan Glow
      const glowScale = Math.sin(this.time * 5) * 0.3 + 0.8;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.arc(crestX, crestY, 5 * glowScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(crestX, crestY, 2.8, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'mart') {
      // ======================================================================
      // POKÉ MART: Vibrant Royal Blue Hip Roof with Storefront Window
      // ======================================================================
      // 1. Foundation & Ramp
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 4, b.y + b.h - 6, b.w + 8, 8);

      // 2. Ivory Brick Facade Walls
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(b.x, b.y + 22, b.w, b.h - 24);

      // 3. Royal Blue Architectural Pilasters & Base Skirting
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(b.x, b.y + 22, 7, b.h - 24);
      ctx.fillRect(b.x + b.w - 7, b.y + 22, 7, b.h - 24);
      ctx.fillRect(b.x, b.y + b.h - 7, b.w, 4);

      // 4. Royal Blue Hipped Roof with Scalloped Tile Texture
      ctx.fillStyle = '#1e3a8a'; // Shadow base
      ctx.fillRect(b.x - 7, b.y + 4, b.w + 14, 20);

      ctx.fillStyle = '#2563eb'; // Vibrant roof face
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y + 24);
      ctx.lineTo(b.x + 9, b.y + 4);
      ctx.lineTo(b.x + b.w - 9, b.y + 4);
      ctx.lineTo(b.x + b.w + 7, b.y + 24);
      ctx.closePath();
      ctx.fill();

      // Ridge Highlight
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(b.x + 9, b.y + 4, b.w - 18, 2.5);

      // White Crown Cornice Fascia
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 7, b.y + 22, b.w + 14, 3);

      // 5. Storefront Showcase Window with 3D Striped Scalloped Awning
      const sWinX = b.x + 8;
      const sWinY = b.y + 30;
      const sWinW = 28;
      const sWinH = 21;

      // Warm Golden Shop Interior Light
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(sWinX, sWinY, sWinW, sWinH);
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(sWinX, sWinY, sWinW, sWinH);

      // Showcase Wooden Shelves
      ctx.fillStyle = '#b45309';
      ctx.fillRect(sWinX + 2, sWinY + 11, sWinW - 4, 2);

      // Display Items on Shelves: Potion, Poké Ball, Antidote
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sWinX + 4, sWinY + 5, 4, 6); // Potion
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(sWinX + 14, sWinY + 7.5, 3.2, 0, Math.PI * 2); // Ball
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(sWinX + 20, sWinY + 5.5, 4, 5.5); // Antidote

      // Scalloped Blue & White Striped Awning above Showcase
      const awnH = 7;
      for (let ax = sWinX - 2; ax < sWinX + sWinW + 2; ax += 6) {
        ctx.fillStyle = Math.floor(ax / 6) % 2 === 0 ? '#1d4ed8' : '#ffffff';
        ctx.fillRect(ax, sWinY - awnH, 6, awnH);
        ctx.beginPath();
        ctx.arc(ax + 3, sWinY, 3, 0, Math.PI);
        ctx.fill();
      }

      // 6. Automatic Sliding Entrance Door
      const dX = b.x + b.w - 32;
      const dY = b.y + b.h - 26;
      const dW = 24;
      const dH = 24;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(dX - 1, dY - 1, dW + 2, dH + 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(dX, dY, dW, dH);
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(dX + dW / 2 - 1, dY, 2, dH);

      // Blue Floor Mat
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(dX + 2, dY + dH - 3, dW - 4, 4);

      // 7. Decorative Potted Shrub next to Entrance
      const potX = dX - 7;
      const potY = b.y + b.h - 10;
      ctx.fillStyle = '#b45309';
      ctx.fillRect(potX, potY, 6, 7);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(potX + 3, potY - 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // 8. Illuminated Gold Facade Sign: 🛒 POKÉ MART
      const signX = b.x + b.w / 2;
      const signY = b.y + 14;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX - 34, signY - 7, 68, 15);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signX - 34, signY - 7, 68, 15);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 9.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🛒 POKÉ MART', signX, signY + 4.5);

    } else if (b.type === 'gym') {
      // ======================================================================
      // KANTO GYM: Monumental Classical Arena with Glowing Elemental Crystal
      // ======================================================================
      // 1. Grand 3-Tier Marble Base Steps
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x - 9, b.y + b.h - 10, b.w + 18, 12);
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x - 7, b.y + b.h - 7, b.w + 14, 8);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 5, b.y + b.h - 4, b.w + 10, 5);

      // 2. Monumental Ashlar Granite Wall Facade
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x, b.y + 26, b.w, b.h - 28);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y + 26, b.w, b.h - 28);

      // Ashlar stone block courses
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
      ctx.lineWidth = 1;
      for (let gy = b.y + 36; gy < b.y + b.h - 8; gy += 12) {
        ctx.beginPath();
        ctx.moveTo(b.x, gy);
        ctx.lineTo(b.x + b.w, gy);
        ctx.stroke();
      }

      // 3. Classical Triangular Pediment Roof
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(b.x - 14, b.y + 28);
      ctx.lineTo(b.x + b.w / 2, b.y - 14);
      ctx.lineTo(b.x + b.w + 14, b.y + 28);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(b.x - 10, b.y + 26);
      ctx.lineTo(b.x + b.w / 2, b.y - 11);
      ctx.lineTo(b.x + b.w + 10, b.y + 26);
      ctx.closePath();
      ctx.fill();

      // Carved Molded Cornice Ridge
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(b.x - 14, b.y + 28);
      ctx.lineTo(b.x + b.w / 2, b.y - 14);
      ctx.lineTo(b.x + b.w + 14, b.y + 28);
      ctx.stroke();

      // 4. Monumental Fluted Marble Columns (4 Grand Pillars)
      const colW = 13;
      const colH = b.h - 26;
      const colY = b.y + 26;
      const colXs = [
        b.x + 6,
        b.x + b.w / 2 - 30,
        b.x + b.w / 2 + 17,
        b.x + b.w - 19,
      ];

      colXs.forEach(cx => {
        // Drop shadow behind column
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fillRect(cx + 4, colY, colW, colH);

        // Column Shaft
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx, colY, colW, colH);

        // Fluting Grooves
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx + 3, colY, 2, colH);
        ctx.fillRect(cx + 7, colY, 2, colH);

        // Corinthian Capital & Plinth
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(cx - 2, colY, colW + 4, 4);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - 2, colY + colH - 4, colW + 4, 4);
      });

      // 5. Heavy Dark Oak Double Portal with Studs & Knockers
      const archW = 36;
      const archH = 34;
      const archX = b.x + b.w / 2 - archW / 2;
      const archY = b.y + b.h - archH;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(archX - 2, archY - 2, archW + 4, archH + 2);

      // Heavy Dark Oak Doors
      ctx.fillStyle = '#451a03';
      ctx.fillRect(archX, archY, archW, archH);

      // Forged Bronze Hinge Straps
      ctx.fillStyle = '#b45309';
      ctx.fillRect(archX, archY + 6, archW, 3.5);
      ctx.fillRect(archX, archY + archH - 8, archW, 3.5);

      // Center Door Seam
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(archX + archW / 2 - 1, archY, 2, archH);

      // Brass Ring Knockers
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(archX + archW / 2 - 7, archY + 16, 2.6, 0, Math.PI * 2);
      ctx.arc(archX + archW / 2 + 7, archY + 16, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // 6. Flanking Stone Braziers with Dynamic Animated Fire Tongues
      const flk = Math.sin(this.time * 12) * 2.2;
      [-17, b.w + 11].forEach(bxOff => {
        const brX = b.x + bxOff;
        const brY = b.y + b.h - 14;

        // Stone Brazier Stand
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(brX - 4, brY, 8, 12);
        ctx.fillStyle = '#475569';
        ctx.fillRect(brX - 6, brY + 12, 12, 4);

        // Dynamic Warm Light Radial Pool
        const fireLight = ctx.createRadialGradient(brX, brY - 4, 1, brX, brY - 4, 16);
        fireLight.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
        fireLight.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = fireLight;
        ctx.beginPath();
        ctx.arc(brX, brY - 4, 16, 0, Math.PI * 2);
        ctx.fill();

        // Outer Orange Flame
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(brX - 4, brY);
        ctx.lineTo(brX + flk, brY - 11);
        ctx.lineTo(brX + 4, brY);
        ctx.closePath();
        ctx.fill();

        // Inner Yellow Core
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(brX - 2, brY);
        ctx.lineTo(brX + flk * 0.5, brY - 7);
        ctx.lineTo(brX + 2, brY);
        ctx.closePath();
        ctx.fill();
      });

      // 7. Glowing Elemental Crystal Emblem on Pediment Apex
      const crysX = b.x + b.w / 2;
      const crysY = b.y - 4;
      const crysPulse = Math.sin(this.time * 4) * 3 + 8;

      // Radial Golden Aura
      const auraGrad = ctx.createRadialGradient(crysX, crysY, 2, crysX, crysY, crysPulse + 8);
      auraGrad.addColorStop(0, 'rgba(250, 204, 21, 0.95)');
      auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(crysX, crysY, crysPulse + 8, 0, Math.PI * 2);
      ctx.fill();

      // Diamond Badge Crystal
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(crysX, crysY - 9);
      ctx.lineTo(crysX + 7, crysY);
      ctx.lineTo(crysX, crysY + 9);
      ctx.lineTo(crysX - 7, crysY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(crysX - 3, crysY - 7);
      ctx.lineTo(crysX, crysY);
      ctx.lineTo(crysX - 5, crysY);
      ctx.closePath();
      ctx.fill();

      // 8. Gold Tournament Banner across Columns
      const banX = b.x + b.w / 2;
      const banY = b.y + 17;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(banX - 44, banY - 6.5, 88, 14);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(banX - 44, banY - 6.5, 88, 14);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 8.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ KANTO LEAGUE GYM ⚡', banX, banY + 4);

    } else if (b.type === 'gate') {
      // ======================================================================
      // ROUTE GATE: Traditional Kanto Clinker Brick Checkpoint
      // ======================================================================
      // Deep Crimson Brick Base
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(b.x, b.y + 18, b.w, b.h - 18);

      // Brickwork Courses
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(b.x - 4, b.y + 4, b.w + 8, 16);

      // Limestone Quoins
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(b.x, b.y + 20, 5, 8);
      ctx.fillRect(b.x + b.w - 5, b.y + 20, 5, 8);
      ctx.fillRect(b.x, b.y + 36, 5, 8);
      ctx.fillRect(b.x + b.w - 5, b.y + 36, 5, 8);

      // Arched Passageway into Next Route
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h - 26, 17, Math.PI, 0);
      ctx.lineTo(b.x + b.w / 2 + 17, b.y + b.h);
      ctx.lineTo(b.x + b.w / 2 - 17, b.y + b.h);
      ctx.closePath();
      ctx.fill();

      // Hanging Coach Lantern casting warm light
      const lanX = b.x + b.w / 2;
      const lanY = b.y + 22;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lanX, lanY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      const lanLight = ctx.createRadialGradient(lanX, lanY, 2, lanX, lanY, 22);
      lanLight.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      lanLight.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = lanLight;
      ctx.beginPath();
      ctx.arc(lanX, lanY, 22, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === 'house') {
      // ======================================================================
      // RESIDENTIAL HOUSE: Classic Pitched-Roof Cottage with Chimney & Flowerboxes
      // ======================================================================
      // 1. Foundation Plinth (Chiseled Ashlar Base)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 3, b.y + b.h - 6, b.w + 6, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(b.x - 2, b.y + b.h - 5, b.w + 4, 2);

      // 2. Wall Facade (Ivory / Stucco / Timber / Stone)
      const wallColor = b.wallColor || '#f8fafc';
      ctx.fillStyle = wallColor;
      ctx.fillRect(b.x, b.y + 22, b.w, b.h - 26);

      // Horizontal Wall Shiplap Siding or Stone Lines
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 1;
      for (let sy = b.y + 30; sy < b.y + b.h - 6; sy += 8) {
        ctx.beginPath();
        ctx.moveTo(b.x + 2, sy);
        ctx.lineTo(b.x + b.w - 2, sy);
        ctx.stroke();
      }

      // Vertical Corner Pilasters / Timber Posts
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(b.x, b.y + 22, 5, b.h - 26);
      ctx.fillRect(b.x + b.w - 5, b.y + 22, 5, b.h - 26);

      // 3. Chimney with Animated Smoke Puffs
      if (b.chimney !== false) {
        const chimX = b.x + b.w - 18;
        const chimY = b.y - 4;
        const chimW = 12;
        const chimH = 22;

        // Red/Brown Brick Chimney Body
        ctx.fillStyle = '#78350f';
        ctx.fillRect(chimX, chimY, chimW, chimH);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(chimX + 1, chimY + 1, chimW - 2, chimH - 2);
        // Chimney Cap
        ctx.fillStyle = '#334155';
        ctx.fillRect(chimX - 2, chimY - 2, chimW + 4, 3);

        // Animated Soft Smoke Puffs
        for (let sIdx = 0; sIdx < 3; sIdx++) {
          const sPhase = (this.time * 1.8 + sIdx * 0.7) % 2.1;
          const sProg = sPhase / 2.1;
          const sX = chimX + chimW / 2 + Math.sin(this.time * 2 + sIdx) * (6 * sProg);
          const sY = chimY - 3 - sProg * 26;
          const sRadius = 2.5 + sProg * 5;
          const sAlpha = Math.max(0, (1 - sProg) * 0.45);

          ctx.fillStyle = `rgba(241, 245, 249, ${sAlpha})`;
          ctx.beginPath();
          ctx.arc(sX, sY, sRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Roof Configuration by roofStyle
      // Styles: terracotta (warm red/orange), emerald (evergreen Viridian), slate (Pewter gray), azure (Cerulean blue), wood (rustic brown)
      const roofStyle = b.roofStyle || 'terracotta';
      let rPrimary = '#c2410c'; // Terracotta
      let rHighlight = '#ea580c';
      let rShadow = '#7c2d12';
      let rTrim = '#ffffff';

      if (roofStyle === 'emerald') {
        rPrimary = '#059669';
        rHighlight = '#10b981';
        rShadow = '#064e3b';
        rTrim = '#ecfdf5';
      } else if (roofStyle === 'slate') {
        rPrimary = '#334155';
        rHighlight = '#475569';
        rShadow = '#0f172a';
        rTrim = '#cbd5e1';
      } else if (roofStyle === 'azure') {
        rPrimary = '#0284c7';
        rHighlight = '#38bdf8';
        rShadow = '#0369a1';
        rTrim = '#f0f9ff';
      } else if (roofStyle === 'wood') {
        rPrimary = '#78350f';
        rHighlight = '#92400e';
        rShadow = '#451a03';
        rTrim = '#fef3c7';
      }

      if (b.roofColor) {
        rPrimary = b.roofColor;
        rHighlight = b.roofColor;
      }

      // Roof Overhang Shadow
      ctx.fillStyle = rShadow;
      ctx.fillRect(b.x - 7, b.y + 20, b.w + 14, 6);

      // Pitched Gabled Roof Body
      ctx.fillStyle = rPrimary;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 2);
      ctx.lineTo(b.x + b.w + 8, b.y + 24);
      ctx.closePath();
      ctx.fill();

      // Left-facing Sunlit Highlight Shingle Face
      ctx.fillStyle = rHighlight;
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + 23);
      ctx.lineTo(b.x + b.w / 2, b.y);
      ctx.lineTo(b.x + b.w / 2, b.y + 23);
      ctx.lineTo(b.x - 3, b.y + 23);
      ctx.closePath();
      ctx.fill();

      // Shingle Tile Rows
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 4; r++) {
        const ry = b.y + 4 + r * 5;
        const widthAtRy = (b.w + 12) * (1 - r * 0.22);
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 - widthAtRy / 2, ry);
        ctx.lineTo(b.x + b.w / 2 + widthAtRy / 2, ry);
        ctx.stroke();
      }

      // Roof Bargeboard Trim / Fascia
      ctx.strokeStyle = rTrim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 2);
      ctx.lineTo(b.x + b.w + 8, b.y + 24);
      ctx.stroke();

      // 5. Cozy Glowing Windows with Cross Mullions & Flowerboxes
      const winW = 15;
      const winH = 17;
      const winY = b.y + 30;

      // Position windows symmetrically
      const winPositions = [b.x + 9, b.x + b.w - 9 - winW];
      winPositions.forEach(wx => {
        // Window Frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wx - 1.5, winY - 1.5, winW + 3, winH + 3);

        // Warm Golden Amber Glowing Interior Light
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(wx, winY, winW, winH);

        // Glass Glint
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.moveTo(wx, winY + winH);
        ctx.lineTo(wx + winW, winY);
        ctx.lineTo(wx + winW - 4, winY);
        ctx.lineTo(wx, winY + winH - 4);
        ctx.closePath();
        ctx.fill();

        // Cross Mullions
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(wx + winW / 2, winY);
        ctx.lineTo(wx + winW / 2, winY + winH);
        ctx.moveTo(wx, winY + winH / 2);
        ctx.lineTo(wx + winW, winY + winH / 2);
        ctx.stroke();

        // Wooden Window Flowerbox with Blooming Tulips
        ctx.fillStyle = '#78350f';
        ctx.fillRect(wx - 2, winY + winH + 1, winW + 4, 4);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(wx - 1, winY + winH - 1, winW + 2, 2);

        const flColors = ['#ef4444', '#facc15', '#f472b6', '#38bdf8'];
        for (let fx = wx; fx < wx + winW; fx += 4.5) {
          ctx.fillStyle = flColors[Math.floor(fx * 3.7) % flColors.length];
          ctx.beginPath();
          ctx.arc(fx + 2, winY + winH - 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 6. Charming Paneled Wooden Front Door
      const doorW = 20;
      const doorH = 26;
      const doorX = b.x + b.w / 2 - doorW / 2;
      const doorY = b.y + b.h - doorH;

      // Door Frame
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2);

      // Wooden Door Face
      ctx.fillStyle = '#92400e';
      ctx.fillRect(doorX, doorY, doorW, doorH);

      // Door Panels
      ctx.fillStyle = '#78350f';
      ctx.fillRect(doorX + 3, doorY + 3, 6, 8);
      ctx.fillRect(doorX + doorW - 9, doorY + 3, 6, 8);
      ctx.fillRect(doorX + 3, doorY + 14, 6, 9);
      ctx.fillRect(doorX + doorW - 9, doorY + 14, 6, 9);

      // Polished Brass Doorknob
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(doorX + doorW - 4, doorY + doorH / 2 + 1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Stone Doorstep / Mat
      ctx.fillStyle = '#64748b';
      ctx.fillRect(doorX - 2, doorY + doorH - 2, doorW + 4, 3);

      // 7. Porch Coach Lantern with Warm Light Pool
      const porchLanternX = doorX - 6;
      const porchLanternY = doorY + 6;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(porchLanternX - 1.5, porchLanternY - 3, 3, 6);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(porchLanternX, porchLanternY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const porchLight = ctx.createRadialGradient(porchLanternX, porchLanternY, 1, porchLanternX, porchLanternY, 18);
      porchLight.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      porchLight.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = porchLight;
      ctx.beginPath();
      ctx.arc(porchLanternX, porchLanternY, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderGroundItem(ctx: CanvasRenderingContext2D, it: RouteItem): void {
    ctx.save();

    // 1. Soft Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(it.x, it.y + 7.5, 7.5, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Poké Ball Lower White Hemisphere
    ctx.beginPath();
    ctx.arc(it.x, it.y, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // 3. Top Crimson Hemisphere
    ctx.beginPath();
    ctx.arc(it.x, it.y, 7.5, Math.PI, 0);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    // 4. Sunlit Specular Highlight on Dome
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(it.x - 2.5, it.y - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(it.x - 2.5, it.y - 3.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 5. Divider Channel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(it.x - 7.5, it.y - 1.2, 15, 2.4);

    // 6. Center Button Assembly
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(it.x, it.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(it.x, it.y, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 7. Dynamic Periodic Twinkle Flare
    const spTime = (this.time * 2.2 + it.x) % 3;
    if (spTime < 0.35) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(it.x - 7, it.y - 7, 2, 2);
      ctx.fillRect(it.x - 6, it.y - 8, 1, 4);
      ctx.fillRect(it.x - 8, it.y - 6, 4, 1);
    }

    ctx.restore();
  }

  private renderNPC(ctx: CanvasRenderingContext2D, npc: RouteNPC): void {
    const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
    // NPCs turn to face a nearby trainer, otherwise keep their idle facing
    let dir: 'up' | 'down' | 'left' | 'right' = npc.facing || 'down';
    if (dist < 120) {
      const dx = this.player.x - npc.x;
      const dy = this.player.y - npc.y;
      dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    }
    const look = this.getNpcLook(npc);
    drawTrainerSpriteCached(ctx, npc.x, npc.y, dir, 0, look, false, this.time + npc.x * 0.13, 1);
    this.drawNpcProp(ctx, npc, dir);

    // Status marker above the head: quest > rematch/trainer > talk
    const quest = this.questMarkerFor ? this.questMarkerFor(npc) : null;
    const trainerReady = !!npc.trainer && !this.getFlag('trainer:' + npc.trainer.id);
    if (quest) drawMarker(ctx, npc.x, npc.y - 34, quest, this.time);
    else if (trainerReady && dist < 260) drawMarker(ctx, npc.x, npc.y - 34, 'alert', this.time);
    else if (dist < 55) drawMarker(ctx, npc.x, npc.y - 34, 'talk', this.time);

    // Name tag only at conversational range keeps the scene uncluttered
    if (dist < 150) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (150 - dist) / 50);
      ctx.font = '700 9px system-ui, sans-serif';
      const w = ctx.measureText(npc.name).width + 12;
      ctx.fillStyle = 'rgba(10, 15, 28, 0.82)';
      ctx.beginPath();
      ctx.roundRect(npc.x - w / 2, npc.y + 17, w, 13, 6.5);
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(npc.name, npc.x, npc.y + 23.5);
      ctx.restore();
    }
  }

  private npcLooks = new Map<string, TrainerCustomization>();
  /** Role-specific outfits for recognisable townsfolk; everyone else gets a varied deterministic look. */
  private getNpcLook(npc: RouteNPC): TrainerCustomization {
    const cacheKey = npc.id + '|' + npc.name;
    const hit = this.npcLooks.get(cacheKey);
    if (hit) return hit;
    const key = (npc.id + ' ' + npc.name + ' ' + (npc.avatar || '')).toLowerCase();
    const base = getNpcAppearance(npc.id + npc.name);
    const role = (palette: Partial<TrainerCustomization['palette']>, style: Partial<TrainerCustomization['style']>): TrainerCustomization => ({
      ...base,
      palette: { ...base.palette, ...palette },
      style: { ...base.style, hasGlasses: false, hasScarf: false, hasSatchel: false, ...style },
    });
    let look: TrainerCustomization;
    if (key.includes('angler') || key.includes('fisher')) look = role({ topMain: '#ea580c', bottomMain: '#1d4ed8', hatMain: '#facc15', hatSec: '#ca8a04' }, { hatType: 'straw_hat', bottomType: 'overalls' });
    else if (key.includes('ranger')) look = role({ topMain: '#15803d', topSec: '#facc15', bottomMain: '#713f12', hatMain: '#a16207', hatSec: '#713f12' }, { hatType: 'sunhat', bottomType: 'jeans' });
    else if (key.includes('botanist') || key.includes('gardener')) look = role({ topMain: '#f472b6', bottomMain: '#16a34a', hatMain: '#fef08a', hatSec: '#f472b6' }, { hatType: 'straw_hat', bottomType: 'skirt', hairStyle: 'long_fringe' });
    else if (key.includes('officer') || key.includes('jenny')) look = role({ topMain: '#0369a1', topSec: '#f8fafc', bottomMain: '#1e3a8a', hair: '#0e7490', hatMain: '#0c4a6e', hatSec: '#0f172a' }, { hatType: 'sailor_cap', bottomType: 'skirt', hairStyle: 'ponytail' });
    else if (key.includes('hiker') || key.includes('geologist') || key.includes('miner')) look = role({ topMain: '#92400e', topSec: '#fde68a', bottomMain: '#44403c', hatMain: '#f59e0b' }, { hatType: 'helmet', bottomType: 'jeans', hasSatchel: true });
    else if (key.includes('sailor') || key.includes('dock') || key.includes('captain') || key.includes('ferry')) look = role({ topMain: '#f8fafc', topSec: '#1e3a8a', bottomMain: '#1e3a8a', hatMain: '#f8fafc', hatSec: '#1e3a8a' }, { hatType: 'sailor_cap', bottomType: 'jeans' });
    else if (key.includes('scientist') || key.includes('researcher') || key.includes('professor')) look = role({ topMain: '#f1f5f9', topSec: '#38bdf8', bottomMain: '#334155' }, { hatType: 'none', hasGlasses: true, bottomType: 'jeans' });
    else if (key.includes('bug catcher')) look = role({ topMain: '#65a30d', bottomMain: '#a16207', hatMain: '#fef08a' }, { hatType: 'straw_hat', bottomType: 'shorts' });
    else if (key.includes('swimmer') || key.includes('surfer')) look = role({ topMain: '#06b6d4', topSec: '#f8fafc', bottomMain: '#0e7490' }, { hatType: 'none', bottomType: 'shorts' });
    else if (key.includes('leader') || key.includes('rematch')) look = role({ topMain: '#7c2d12', topSec: '#facc15', bottomMain: '#1c1917' }, { hatType: 'none', hairStyle: 'spiky', bottomType: 'jeans' });
    else if (key.includes('guide red')) look = getTrainerById('male_red');
    else look = base;
    this.npcLooks.set(cacheKey, look);
    return look;
  }

  private drawNpcProp(ctx: CanvasRenderingContext2D, npc: RouteNPC, dir: string): void {
    const key = (npc.id + ' ' + npc.name).toLowerCase();
    if (key.includes('angler') || key.includes('fisher')) {
      const side = dir === 'left' ? -1 : 1;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(npc.x + 5 * side, npc.y - 1);
      ctx.lineTo(npc.x + 18 * side, npc.y - 18);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(npc.x + 18 * side, npc.y - 18);
      ctx.quadraticCurveTo(npc.x + 22 * side, npc.y - 4, npc.x + 24 * side, npc.y + 12);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(npc.x + 24 * side, npc.y + 12, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderSignposts(ctx: CanvasRenderingContext2D, route: RouteDefinition, list = route.signposts): void {
    if (!list || list.length === 0) return;

    for (const sp of list) {
      ctx.save();

      // 1. Contact Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 16, 10, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Wooden Post
      ctx.fillStyle = '#58240c';
      ctx.fillRect(sp.x - 2.5, sp.y - 2, 5, 18);

      // 3. Wooden Signboard with Bevel
      ctx.fillStyle = '#78350f';
      ctx.fillRect(sp.x - 17, sp.y - 18, 34, 18);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(sp.x - 15, sp.y - 16, 30, 14);

      // Board Text Lines
      ctx.fillStyle = '#92400e';
      ctx.fillRect(sp.x - 11, sp.y - 13, 22, 1.8);
      ctx.fillRect(sp.x - 11, sp.y - 9.5, 18, 1.8);
      ctx.fillRect(sp.x - 11, sp.y - 6, 14, 1.8);

      // 4. Proximity Interactive Indicator (📋 Read bubble)
      const dist = Math.hypot(this.player.x - sp.x, this.player.y - sp.y);
      if (dist < 50) drawMarker(ctx, sp.x, sp.y - 30, 'talk', this.time);

      ctx.restore();
    }
  }

  private renderGrassParticles(ctx: CanvasRenderingContext2D): void {
    if (this.grassParticles.length === 0) return;
    ctx.save();
    for (const gp of this.grassParticles) {
      ctx.fillStyle = gp.color;
      ctx.globalAlpha = Math.max(0, gp.life / gp.maxLife);
      ctx.beginPath();
      ctx.ellipse(gp.x, gp.y, 2.8, 1.4, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const look = this.playerAppearance || getTrainerById(this.selectedTrainerId);
    const p = this.player;
    drawTrainerSpriteCached(ctx, p.x, p.y, p.dir, p.animFrame, look, p.inGrass, this.time, 1);
    if (this.fishing) {
      const f = this.fishing;
      const side = f.spot.x < p.x ? -1 : 1;
      const tipX = p.x + 20 * side;
      const tipY = p.y - 22;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(p.x + 5 * side, p.y - 2);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      const bob = f.bite ? Math.sin(this.time * 30) * 3 : Math.sin(this.time * 3) * 1.2;
      const fx = p.x + (f.spot.x - p.x) * 0.85;
      const fy = p.y + 4 + (f.spot.y - p.y) * 0.85 + bob;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo((tipX + fx) / 2, Math.max(tipY, fy) + 10, fx, fy);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (f.bite) drawMarker(ctx, p.x, p.y - 36, 'alert', this.time);
    }
  }

  public isPointOnRoad(x: number, y: number, route: RouteDefinition): boolean {
    const footY = y + 8;
    for (const p of route.path) {
      if (x >= p.x - 2 && x <= p.x + p.w + 2 && footY >= p.y - 2 && footY <= p.y + p.h + 2) {
        return true;
      }
    }
    return false;
  }

  public isInsideBuilding(x: number, y: number, route: RouteDefinition): boolean {
    for (const b of route.buildings) {
      if (x >= b.x - 8 && x <= b.x + b.w + 8 && y >= b.y - 8 && y <= b.y + b.h + 8) {
        return true;
      }
    }
    return false;
  }

  public getRouteFences(route: RouteDefinition): RouteFence[] {
    if (route.fences && route.fences.length > 0) {
      return route.fences;
    }
    // Exploration areas are hand-authored: never auto-generate props there
    if (route.isSpecialArea) return route.fences || [];
    const fences: RouteFence[] = [];
    if (route.theme !== 'city') {
      for (const p of route.path) {
        const fenceY = p.y - 12;
        if (fenceY > 50) {
          fences.push({
            x: p.x,
            y: fenceY,
            w: Math.min(180, p.w),
            h: 16,
          });
        }
      }
    }
    return fences;
  }

  public getRouteStones(route: RouteDefinition): RouteStone[] {
    if (route.stones && route.stones.length > 0) {
      return route.stones;
    }
    if (route.isSpecialArea) return route.stones || [];
    const stones: RouteStone[] = [];
    for (let x = 160; x < route.worldWidth - 100; x += 320) {
      const sHash = Math.abs(Math.sin(x * 19.7 + route.id * 31.3));
      const sy = 140 + (sHash * 60);
      stones.push({
        x: x + (sHash * 40),
        y: sy,
        radius: 13 + Math.floor(sHash * 5),
        variant: sHash > 0.5 ? 'mossy' : 'granite',
      });
      const sHash2 = Math.abs(Math.cos(x * 23.1 + route.id * 17.9));
      const sy2 = route.worldHeight - 160 - (sHash2 * 60);
      stones.push({
        x: x + 80 + (sHash2 * 40),
        y: sy2,
        radius: 14 + Math.floor(sHash2 * 4),
        variant: sHash2 > 0.4 ? 'granite' : 'slate',
      });
    }
    return stones;
  }

  public getTreeTrunkFootY(tree: RouteTree): number {
    const rScale = tree.scale || 1.0;
    const type = tree.type || 'broadleaf';
    if (type === 'coastal') return tree.y + 24 * rScale;
    if (type === 'mature') return tree.y + 22 * rScale;
    if (type === 'small') return tree.y + 15 * rScale;
    if (type === 'slender') return tree.y + 20 * rScale;
    if (type === 'decorative') return tree.y + 16 * rScale;
    if (type === 'conifer' || type === 'pine') return tree.y + 19 * rScale;
    return tree.y + 18 * rScale;
  }

  public getTreeCollisionRadius(tree: RouteTree): number {
    const rScale = tree.scale || 1.0;
    const type = tree.type || 'broadleaf';
    if (type === 'small' || type === 'slender' || type === 'decorative') return 7 * rScale;
    if (type === 'mature' || type === 'dense_forest') return 12 * rScale;
    return 9 * rScale;
  }

  public getRouteTrees(route: RouteDefinition): RouteTree[] {
    if (route.trees && route.trees.length > 0) {
      return route.trees;
    }
    if (route.isSpecialArea) return route.trees || [];

    const trees: RouteTree[] = [];
    const isForest = route.theme === 'forest';
    const isRock = route.theme === 'rock';
    const isWater = route.theme === 'water';
    const isCity = route.theme === 'city';

    // 1. Top boundary dense tree line
    for (let x = 32; x < route.worldWidth - 20; x += 44) {
      const tHash = Math.abs(Math.sin(x * 31.7 + route.id * 13.9));
      const ty = 58 + ((tHash - 0.5) * 14);

      let treeType: RouteTreeType = 'broadleaf';
      let colorVar: FoliageColorVariant = 'standard';

      if (isForest) {
        treeType = tHash > 0.6 ? 'dense_forest' : tHash > 0.25 ? 'conifer' : 'mature';
        colorVar = tHash > 0.5 ? 'dark' : 'standard';
      } else if (isRock) {
        treeType = tHash > 0.6 ? 'conifer' : tHash > 0.3 ? 'slender' : 'small';
        colorVar = tHash > 0.4 ? 'olive' : 'standard';
      } else if (isWater) {
        treeType = tHash > 0.65 ? 'coastal' : tHash > 0.3 ? 'slender' : 'broadleaf';
        colorVar = tHash > 0.7 ? 'coastal' : 'standard';
      } else if (isCity) {
        treeType = tHash > 0.65 ? 'decorative' : tHash > 0.3 ? 'small' : 'broadleaf';
        colorVar = tHash > 0.85 ? 'blossom' : tHash > 0.7 ? 'golden' : 'standard';
      } else {
        // Standard route
        treeType = tHash > 0.7 ? 'mature' : tHash > 0.35 ? 'dense_forest' : 'broadleaf';
        colorVar = tHash > 0.85 ? 'golden' : tHash > 0.7 ? 'light' : 'standard';
      }

      trees.push({
        x,
        y: ty,
        scale: 0.96 + tHash * 0.16,
        type: treeType,
        colorVariant: colorVar,
      });
    }

    // 2. Bottom boundary dense tree line
    for (let x = 32; x < route.worldWidth - 20; x += 44) {
      const tHash = Math.abs(Math.cos(x * 29.3 + route.id * 17.1));
      const ty = route.worldHeight - 48 + ((tHash - 0.5) * 14);

      let treeType: RouteTreeType = 'broadleaf';
      let colorVar: FoliageColorVariant = 'standard';

      if (isForest) {
        treeType = tHash > 0.55 ? 'dense_forest' : tHash > 0.2 ? 'conifer' : 'mature';
        colorVar = tHash > 0.5 ? 'dark' : 'standard';
      } else if (isRock) {
        treeType = tHash > 0.6 ? 'conifer' : tHash > 0.3 ? 'slender' : 'small';
        colorVar = tHash > 0.4 ? 'olive' : 'standard';
      } else if (isWater) {
        treeType = tHash > 0.6 ? 'coastal' : tHash > 0.3 ? 'slender' : 'broadleaf';
        colorVar = tHash > 0.7 ? 'coastal' : 'standard';
      } else if (isCity) {
        treeType = tHash > 0.6 ? 'decorative' : tHash > 0.3 ? 'small' : 'broadleaf';
        colorVar = tHash > 0.85 ? 'blossom' : 'standard';
      } else {
        treeType = tHash > 0.7 ? 'mature' : tHash > 0.35 ? 'dense_forest' : 'broadleaf';
        colorVar = tHash > 0.85 ? 'golden' : 'standard';
      }

      trees.push({
        x,
        y: ty,
        scale: 0.96 + tHash * 0.16,
        type: treeType,
        colorVariant: colorVar,
      });
    }

    // 3. Scattered interior meadow & trailside trees
    for (let x = 160; x < route.worldWidth - 360; x += 260) {
      const tHash = Math.abs(Math.sin(x * 47.1 + route.id * 7.7));
      const ty = 160 + tHash * 45;
      if (!this.isPointOnRoad(x, ty, route)) {
        let treeType: RouteTreeType = isForest ? 'conifer' : isRock ? 'slender' : isWater ? 'coastal' : isCity ? 'decorative' : 'broadleaf';
        if (tHash > 0.75) treeType = isForest ? 'mature' : isCity ? 'blossom' : 'mature';
        trees.push({
          x,
          y: ty,
          scale: 1.08 + tHash * 0.18,
          type: treeType,
          colorVariant: tHash > 0.8 ? 'golden' : tHash > 0.6 ? 'light' : 'standard',
        });
      }

      const ty2 = route.worldHeight - 220 - tHash * 45;
      if (!this.isPointOnRoad(x + 90, ty2, route)) {
        let treeType: RouteTreeType = isForest ? 'dense_forest' : isRock ? 'small' : isWater ? 'slender' : isCity ? 'small' : 'small';
        trees.push({
          x: x + 90,
          y: ty2,
          scale: 1.02 + tHash * 0.15,
          type: treeType,
          colorVariant: tHash > 0.75 ? 'light' : 'standard',
        });
      }
    }

    return trees;
  }

  public isBlocked(x: number, y: number, route: RouteDefinition, ignoreBoulder?: string): boolean {
    // 1. World Boundaries
    if (x < 24 || x > route.worldWidth - 24 || y < 65 || y > route.worldHeight - 35) {
      return true;
    }
    if (this.isBlockedByFeatures(x, y + 8, route, ignoreBoulder)) return true;

    // 2. Buildings (with doorway entrance exception)
    for (const b of route.buildings) {
      if (
        x >= b.x - 12 &&
        x <= b.x + b.w + 12 &&
        y >= b.y - 12 &&
        y <= b.y + b.h
      ) {
        const doorCenterX = b.x + b.w / 2;
        const atDoor = Math.abs(x - doorCenterX) < 18 && y >= b.y + b.h - 10;
        if (!atDoor) {
          return true;
        }
      }
    }

    // 3. Fences (Solid Post-and-Rail)
    const fences = this.cacheRoute === route ? this.fenceCache : this.getRouteFences(route);
    const footY = y + 8;
    for (const f of fences) {
      if (
        x + 8 >= f.x - 2 &&
        x - 8 <= f.x + f.w + 2 &&
        footY + 6 >= f.y - 2 &&
        footY - 6 <= f.y + f.h + 2
      ) {
        return true;
      }
    }

    // 4. Stones & Boulders
    const stones = this.cacheRoute === route ? this.stoneCache : this.getRouteStones(route);
    for (const s of stones) {
      const dist = Math.hypot(x - s.x, footY - s.y);
      if (dist < s.radius + 8) {
        return true;
      }
    }

    // 5. Tree Trunks (Collision strictly with visible grounded trunk base)
    const trees = this.cacheRoute === route ? this.treeCache : this.getRouteTrees(route);
    for (const t of trees) {
      const trunkFootY = this.getTreeTrunkFootY(t);
      const trunkR = this.getTreeCollisionRadius(t);
      const dist = Math.hypot(x - t.x, footY - trunkFootY);
      if (dist < trunkR) {
        return true;
      }
    }

    // 6. Water Ponds (Walkable only on wooden docks/piers)
    if (route.ponds) {
      for (const pond of route.ponds) {
        if (
          x >= pond.x - 6 &&
          x <= pond.x + pond.w + 6 &&
          footY >= pond.y - 4 &&
          footY <= pond.y + pond.h + 4
        ) {
          if (pond.pier) {
            const onPier =
              x >= pond.pier.x - 4 &&
              x <= pond.pier.x + pond.pier.w + 4 &&
              footY >= pond.pier.y - 4 &&
              footY <= pond.pier.y + pond.pier.h + 4;
            if (onPier) continue;
          }
          return true;
        }
      }
    }

    // 7. Terraced Cliff Ledges (Walkable only at stone stairways)
    if (route.ledges) {
      for (const ledge of route.ledges) {
        if (
          x >= ledge.x - 4 &&
          x <= ledge.x + ledge.w + 4 &&
          footY >= ledge.y - 2 &&
          footY <= ledge.y + ledge.h + 4
        ) {
          let onStairs = false;
          if (ledge.stairs) {
            for (const st of ledge.stairs) {
              if (x >= st.x - 4 && x <= st.x + st.w + 4) {
                onStairs = true;
                break;
              }
            }
          }
          if (!onStairs) {
            return true;
          }
        }
      }
    }

    // 8. Signposts (Solid Wooden Post)
    if (route.signposts) {
      for (const sp of route.signposts) {
        if (Math.hypot(x - sp.x, footY - sp.y) < 14) {
          return true;
        }
      }
    }

    // 9. Fountains (Solid Stone Basin)
    if (route.fountains) {
      for (const fn of route.fountains) {
        if (Math.hypot(x - fn.x, footY - fn.y) < fn.radius + 6) {
          return true;
        }
      }
    }

    // 10. Streetlamps (Solid Cast Iron Post)
    if (route.streetlamps) {
      for (const sl of route.streetlamps) {
        if (Math.hypot(x - sl.x, footY - sl.y) < 10) {
          return true;
        }
      }
    }

    // 11. Benches  
    if (route.benches) {
      for (const b of route.benches) {
        const bw = b.w || 28;
        if (
          x >= b.x - 4 &&
          x <= b.x + bw + 4 &&
          footY >= b.y - 2 &&
          footY <= b.y + 14 + 4
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /** Collision for the exploration-area features (foot position). */
  private isBlockedByFeatures(x: number, footY: number, route: RouteDefinition, ignoreBoulder?: string): boolean {
    const inRect = (r: Rect, m = 0) => x >= r.x - m && x <= r.x + r.w + m && footY >= r.y - m && footY <= r.y + r.h + m;
    const onBridge = () => (route.bridges || []).some(b => inRect(b, 2));
    if (route.floors && !isOnCaveFloor(route.floors, x, footY) && !onBridge()) return true;
    for (const w of route.waters || []) {
      if (w.kind === 'shallows') continue;
      if (inRect(w, -4) && !onBridge()) return true;
    }
    for (const b of route.barriers || []) {
      if (!this.getFlag(b.openFlag) && inRect(b, 6)) return true;
    }
    for (const b of route.boulders || []) {
      if (b.id === ignoreBoulder) continue;
      const pos = this.boulderPos.get(b.id) || b;
      if (Math.hypot(x - pos.x, footY - pos.y) < (b.r || 18) + 7) return true;
    }
    for (const p of route.portals || []) {
      if (p.hidden && !this.revealedPortals.has(p.id)) continue;
      // The arch / boat behind the walk-in point is solid
      if (p.style === 'cave' || p.style === 'cave_exit' || p.style === 'cracked_wall') {
        if (x > p.x - 54 && x < p.x + 54 && footY > p.y - 44 && footY < p.y - 16) return true;
      } else if (p.style === 'dock') {
        if (x > p.x - 36 && x < p.x + 36 && footY > p.y - 18 && footY < p.y - 4) return true;
      }
    }
    for (const l of route.landmarks || []) {
      const r = l.style === 'lighthouse' ? 20 : 24;
      if (Math.hypot(x - l.x, (footY - l.y) * 1.6) < r) return true;
    }
    for (const c of route.crystals || []) if (Math.hypot(x - c.x, footY - c.y) < 13 * (c.scale || 1)) return true;
    for (const n of route.noticeBoards || []) if (x > n.x - 28 && x < n.x + 28 && footY > n.y - 8 && footY < n.y + 4) return true;
    for (const w of route.waterfalls || []) if (x > w.x - 14 && x < w.x + w.w + 14 && footY > w.y - 30 && footY < w.y + 4) return true;
    for (const e of route.staticEncounters || []) {
      if (!this.getFlag(e.doneFlag) && this.isConditionMet(e.requires) && Math.hypot(x - e.x, footY - e.y - 8) < 18) return true;
    }
    return false;
  }

  private renderFountains(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.fountains || route.fountains.length === 0) return;

    for (const f of route.fountains) {
      if (!this.isInViewport(f.x, f.y, 90)) continue;
      ctx.save();
      const x = f.x;
      const y = f.y;
      const r = f.radius;

      // 1. Soft Contact Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.4, r + 6, r * 0.6 + 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Stone Basin Curb
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Outer Bevel Highlight
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r - 1, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Basin Wall Shadow
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(x, y, r - 5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Clear Blue Water Pool with Animated Ripples
      const waterGrad = ctx.createRadialGradient(x, y, 2, x, y, r - 6);
      waterGrad.addColorStop(0, '#38bdf8');
      waterGrad.addColorStop(0.6, '#0284c7');
      waterGrad.addColorStop(1, '#0369a1');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.arc(x, y, r - 6, 0, Math.PI * 2);
      ctx.fill();

      // Animated Water Caustic Rings
      for (let ri = 1; ri <= 3; ri++) {
        const ringProg = ((this.time * 0.8 + ri * 0.33) % 1.0);
        const ringR = (r - 8) * ringProg;
        const ringAlpha = (1 - ringProg) * 0.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Center Tiered Carved Stone Pedestal
      const pedR = r * 0.36;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(x, y, pedR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(x, y - 2, pedR * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Center Spout Nozzle
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x, y - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      // 5. Animated Water Jet Sprays (Shooting upwards and splashing)
      const jetH = 14 + Math.sin(this.time * 4) * 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y - 3 - jetH);
      ctx.stroke();

      // Splashing droplets falling in radial arcs
      const dropletCount = 6;
      for (let di = 0; di < dropletCount; di++) {
        const angle = (di / dropletCount) * Math.PI * 2 + (this.time * 1.5);
        const sprayDist = (r * 0.5) * ((Math.sin(this.time * 3 + di) + 1.2) * 0.5);
        const dropX = x + Math.cos(angle) * sprayDist;
        const dropY = y - 2 + Math.sin(angle) * (sprayDist * 0.6);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(dropX, dropY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderStreetlamps(ctx: CanvasRenderingContext2D, route: RouteDefinition, list = route.streetlamps): void {
    if (!list || list.length === 0) return;

    for (const lamp of list) {
      ctx.save();
      const lx = lamp.x;
      const ly = lamp.y;

      const isTech = lamp.style === 'modern' || route.id === 6;
      const isGold = lamp.style === 'ornate' || route.id === 8 || route.id === 4;
      const isFire = route.id === 7;
      const isLantern = lamp.style === 'lantern' || route.id === 5;

      const postColor = isGold ? '#ca8a04' : isTech ? '#64748b' : isLantern ? '#78350f' : isFire ? '#450a0a' : '#0f172a';
      const glowColor1 = isTech ? 'rgba(56, 189, 248, 0.35)' : isFire ? 'rgba(249, 115, 22, 0.4)' : isGold ? 'rgba(250, 204, 21, 0.38)' : 'rgba(254, 240, 138, 0.32)';
      const glowColor2 = isTech ? 'rgba(56, 189, 248, 0.12)' : isFire ? 'rgba(249, 115, 22, 0.16)' : isGold ? 'rgba(250, 204, 21, 0.15)' : 'rgba(253, 224, 71, 0.14)';
      const glassColor = isTech ? '#7dd3fc' : isFire ? '#fb923c' : '#fef08a';

      // 1. Warm Radial Light Cast on Ground
      const lightPool = ctx.createRadialGradient(lx, ly - 22, 4, lx, ly - 10, 65);
      lightPool.addColorStop(0, glowColor1);
      lightPool.addColorStop(0.5, glowColor2);
      lightPool.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightPool;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 65, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Contact Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(lx, ly + 2, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Ornate Post Base & Shaft
      ctx.fillStyle = postColor;
      ctx.fillRect(lx - 4, ly - 3, 8, 4);
      ctx.fillRect(lx - 2.5, ly - 8, 5, 5);
      ctx.fillRect(lx - 1.5, ly - 26, 3, 18);

      // Bracket Arms
      ctx.strokeStyle = postColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx - 5, ly - 20);
      ctx.lineTo(lx, ly - 25);
      ctx.lineTo(lx + 5, ly - 20);
      ctx.stroke();

      // 4. Lantern Housing
      ctx.fillStyle = postColor;
      ctx.fillRect(lx - 5, ly - 32, 10, 2);
      ctx.fillRect(lx - 4, ly - 24, 8, 2);

      // Glowing Glass Core
      ctx.fillStyle = glassColor;
      ctx.fillRect(lx - 3.5, ly - 30, 7, 7);

      // Core Filament Highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lx, ly - 26.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Finial Spike on top
      ctx.strokeStyle = postColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 32);
      ctx.lineTo(lx, ly - 36);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderBenches(ctx: CanvasRenderingContext2D, route: RouteDefinition, list = route.benches): void {
    if (!list || list.length === 0) return;

    for (const b of list) {
      ctx.save();
      const bx = b.x;
      const by = b.y;
      const bw = b.w || 28;
      const bh = 14;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.roundRect(bx - 2, by + bh - 2, bw + 4, 4, 2);
      ctx.fill();

      // Wrought Iron Frame / Legs
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, by + 4, 3, bh - 4);
      ctx.fillRect(bx + bw - 3, by + 4, 3, bh - 4);

      // Wooden Slats (Backrest & Seat)
      ctx.fillStyle = '#92400e';
      ctx.fillRect(bx - 1, by, bw + 2, 4);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 1, by + 6, bw + 2, 4);

      // Slat Highlights
      ctx.fillStyle = '#d97706';
      ctx.fillRect(bx, by, bw, 1.2);
      ctx.fillRect(bx, by + 6, bw, 1.2);

      // Iron Armrests
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 2, by + 2, 2, 6);
      ctx.fillRect(bx + bw, by + 2, 2, 6);

      ctx.restore();
    }
  }

  private renderStones(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const stones = this.getRouteStones(route);
    for (const s of stones) {
      if (!this.isInViewport(s.x, s.y, 50)) continue;
      this.drawStone(ctx, s);
    }
  }

  private drawStone(ctx: CanvasRenderingContext2D, s: RouteStone): void {
    ctx.save();
    const x = s.x;
    const y = s.y;
    const r = s.radius;
    const isMossy = s.variant === 'mossy';

    // 1. Soft Ground Contact Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.65, r * 1.15, r * 0.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 2. Irregular Faceted Boulder Shape
    const pts = [
      { dx: -r * 0.95, dy: -r * 0.2 },
      { dx: -r * 0.7, dy: -r * 0.8 },
      { dx: -r * 0.1, dy: -r * 0.95 },
      { dx: r * 0.65, dy: -r * 0.7 },
      { dx: r * 0.95, dy: -r * 0.1 },
      { dx: r * 0.8, dy: r * 0.6 },
      { dx: 0, dy: r * 0.8 },
      { dx: -r * 0.75, dy: r * 0.55 },
    ];

    // Boulder Main Body
    const stoneGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    stoneGrad.addColorStop(0, '#94a3b8');
    stoneGrad.addColorStop(0.45, '#64748b');
    stoneGrad.addColorStop(0.85, '#475569');
    stoneGrad.addColorStop(1, '#334155');
    ctx.fillStyle = stoneGrad;

    ctx.beginPath();
    ctx.moveTo(x + pts[0].dx, y + pts[0].dy);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(x + pts[i].dx, y + pts[i].dy);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Facet Chisel Highlight (Upper Face)
    ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x + pts[1].dx, y + pts[1].dy);
    ctx.lineTo(x + pts[2].dx, y + pts[2].dy);
    ctx.lineTo(x + pts[3].dx, y + pts[3].dy);
    ctx.lineTo(x, y - r * 0.2);
    ctx.closePath();
    ctx.fill();

    // 4. Surface Fissure Fracture Line
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y - r * 0.5);
    ctx.lineTo(x - r * 0.05, y);
    ctx.lineTo(x + r * 0.35, y + r * 0.4);
    ctx.stroke();

    // 5. Living Green Moss Patch on shady lower side
    if (isMossy) {
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.35, y + r * 0.3, r * 0.45, r * 0.28, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.35, y + r * 0.25, r * 0.3, r * 0.16, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Specular Rim Highlight
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + pts[1].dx, y + pts[1].dy);
    ctx.lineTo(x + pts[2].dx, y + pts[2].dy);
    ctx.stroke();

    ctx.restore();
  }

  private renderFences(ctx: CanvasRenderingContext2D, route: RouteDefinition, list?: RouteFence[]): void {
    const fences = list || this.getRouteFences(route);
    if (fences.length === 0) return;

    ctx.save();

    for (const f of fences) {
      if (!this.isInViewport(f.x + f.w / 2, f.y + 7, Math.max(f.w / 2, 35))) continue;
      // 1. Soft Drop Shadow cast beneath fence rails & posts
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(f.x, f.y + 14, f.w, 4);

      // 2. Double Horizontal Wooden Rails
      // Top Rail
      ctx.fillStyle = '#58240c';
      ctx.fillRect(f.x, f.y + 3, f.w, 4.5);
      // Top Rail sunlit upper bevel
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(f.x, f.y + 3, f.w, 1.2);

      // Bottom Rail
      ctx.fillStyle = '#58240c';
      ctx.fillRect(f.x, f.y + 10, f.w, 4);
      // Bottom Rail sunlit upper bevel
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(f.x, f.y + 10, f.w, 1.2);

      // 3. Cylindrical Vertical Posts
      const postStep = 28;
      for (let px = f.x; px <= f.x + f.w; px += postStep) {
        // Ground contact shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px, f.y + 18, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Post body gradient
        const postGrad = ctx.createLinearGradient(px - 3, f.y, px + 3, f.y);
        postGrad.addColorStop(0, '#9a3412');
        postGrad.addColorStop(0.4, '#78350f');
        postGrad.addColorStop(0.85, '#58240c');
        postGrad.addColorStop(1, '#3a1805');
        ctx.fillStyle = postGrad;
        ctx.fillRect(px - 3, f.y - 2, 6, 19);

        // Chamfered Post Top Cap
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(px, f.y - 2, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iron Bracket Rivets at rail intersections
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px - 0.75, f.y + 4.5, 1.5, 1.5);
        ctx.fillRect(px - 0.75, f.y + 11.5, 1.5, 1.5);
      }
    }

    ctx.restore();
  }

  private renderPonds(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.ponds || route.ponds.length === 0) return;

    for (const pond of route.ponds) {
      ctx.save();

      // 1. Shore Sandy Soil Bed with Soft Ambient Drop Shadow
      ctx.fillStyle = '#653b1b';
      ctx.beginPath();
      ctx.roundRect(pond.x - 6, pond.y - 6, pond.w + 12, pond.h + 14, 16);
      ctx.fill();

      // Shore Grass Fringe
      ctx.fillStyle = '#22552b';
      ctx.beginPath();
      ctx.roundRect(pond.x - 3, pond.y - 3, pond.w + 6, pond.h + 8, 14);
      ctx.fill();

      // 2. Deep Water Body with Vibrant Radial Caustic Depth
      const waterGrad = ctx.createLinearGradient(pond.x, pond.y, pond.x, pond.y + pond.h);
      waterGrad.addColorStop(0, '#1d4ed8');
      waterGrad.addColorStop(0.5, '#2563eb');
      waterGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.roundRect(pond.x, pond.y, pond.w, pond.h, 12);
      ctx.fill();

      // 3. Animated Surface Ripples & Caustics
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      for (let ry = pond.y + 14; ry < pond.y + pond.h - 10; ry += 24) {
        const waveShift = Math.sin(this.time * 2.4 + ry * 0.1) * 6;
        ctx.beginPath();
        ctx.moveTo(pond.x + 12, ry);
        ctx.bezierCurveTo(
          pond.x + pond.w * 0.3 + waveShift, ry - 3,
          pond.x + pond.w * 0.7 - waveShift, ry + 3,
          pond.x + pond.w - 12, ry
        );
        ctx.stroke();
      }

      // 4. Floating Lily Pads with Pink Water Lotus Blossoms
      const padPositions = [
        { ox: 34, oy: 28 },
        { ox: pond.w - 42, oy: 36 },
        { ox: 50, oy: pond.h - 38 },
        { ox: pond.w - 60, oy: pond.h - 30 },
      ];
      for (const p of padPositions) {
        const lx = pond.x + p.ox;
        const ly = pond.y + p.oy;
        // Lily pad leaf
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(lx, ly, 7, 0.3, Math.PI * 1.9);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fill();
        // Lotus blossom
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(lx + 1, ly - 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lx + 1, ly - 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Wooden Dock / Pier Extension (Walkable!)
      if (pond.pier) {
        const pr = pond.pier;
        // Shadow beneath pier
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(pr.x + 2, pr.y + 4, pr.w, pr.h);

        // Submerged Wooden Pilings
        ctx.fillStyle = '#451a03';
        ctx.fillRect(pr.x + 4, pr.y + pr.h - 8, 6, 12);
        ctx.fillRect(pr.x + pr.w - 10, pr.y + pr.h - 8, 6, 12);

        // Horizontal Wooden Planks
        for (let py = pr.y; py < pr.y + pr.h; py += 12) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(pr.x, py, pr.w, 10);
          ctx.fillStyle = '#9a3412';
          ctx.fillRect(pr.x, py, pr.w, 1.5);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(pr.x, py + 9, pr.w, 1);
          // Nail rivets
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(pr.x + 3, py + 4, 1.5, 1.5);
          ctx.fillRect(pr.x + pr.w - 4.5, py + 4, 1.5, 1.5);
        }

        // Rope bollards on pier end
        ctx.fillStyle = '#92400e';
        ctx.fillRect(pr.x + 2, pr.y + pr.h - 4, 5, 6);
        ctx.fillRect(pr.x + pr.w - 7, pr.y + pr.h - 4, 5, 6);
      }

      ctx.restore();
    }
  }

  private renderLedges(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.ledges || route.ledges.length === 0) return;

    for (const ledge of route.ledges) {
      ctx.save();

      // 1. Elevation cues: sunlit upper terrace rim + long soft shadow on the lower ground
      const rim = ctx.createLinearGradient(0, ledge.y - 70, 0, ledge.y);
      rim.addColorStop(0, 'rgba(255, 255, 220, 0)');
      rim.addColorStop(1, 'rgba(255, 255, 220, 0.10)');
      ctx.fillStyle = rim;
      ctx.fillRect(ledge.x, ledge.y - 70, ledge.w, 70);
      const drop = ctx.createLinearGradient(0, ledge.y + ledge.h, 0, ledge.y + ledge.h + 30);
      drop.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
      drop.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = drop;
      ctx.fillRect(ledge.x, ledge.y + ledge.h, ledge.w, 30);

      // 2. Earth / Rock Cliff Stratification Face
      const cliffGrad = ctx.createLinearGradient(ledge.x, ledge.y, ledge.x, ledge.y + ledge.h);
      cliffGrad.addColorStop(0, '#8c5835');
      cliffGrad.addColorStop(0.35, '#713f12');
      cliffGrad.addColorStop(0.75, '#542d0c');
      cliffGrad.addColorStop(1, '#381c06');
      ctx.fillStyle = cliffGrad;
      ctx.fillRect(ledge.x, ledge.y + 4, ledge.w, ledge.h - 4);

      // Horizontal Rock Strata Layers
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ledge.x, ledge.y + ledge.h * 0.45);
      ctx.lineTo(ledge.x + ledge.w, ledge.y + ledge.h * 0.45);
      ctx.moveTo(ledge.x, ledge.y + ledge.h * 0.75);
      ctx.lineTo(ledge.x + ledge.w, ledge.y + ledge.h * 0.75);
      ctx.stroke();

      // Vertical fractures give the rock face height
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.lineWidth = 1.4;
      for (let fx = ledge.x + 14; fx < ledge.x + ledge.w - 6; fx += 23 + ((fx * 7) % 13)) {
        ctx.beginPath();
        ctx.moveTo(fx, ledge.y + 6);
        ctx.lineTo(fx + 2, ledge.y + ledge.h * 0.55);
        ctx.lineTo(fx - 1, ledge.y + ledge.h - 2);
        ctx.stroke();
      }

      // 3. Lush Green Overhanging Grass Lip on Top
      ctx.fillStyle = '#22552b';
      ctx.fillRect(ledge.x, ledge.y - 2, ledge.w, 6);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(ledge.x, ledge.y - 2, ledge.w, 1.5);

      // Scalloped grass fringe hanging over cliff edge
      ctx.fillStyle = '#22552b';
      for (let gx = ledge.x; gx < ledge.x + ledge.w; gx += 10) {
        ctx.beginPath();
        ctx.arc(gx + 5, ledge.y + 4, 4, 0, Math.PI);
        ctx.fill();
      }

      // 4. Carved Stone Stairs (Passable Walkways)
      if (ledge.stairs) {
        for (const st of ledge.stairs) {
          // Clear out the cliff face for the staircase
          ctx.fillStyle = '#334155';
          ctx.fillRect(st.x, ledge.y - 2, st.w, ledge.h + 8);

          // 4 Tiers of Stone Steps
          const stepCount = 4;
          const stepH = (ledge.h + 8) / stepCount;
          for (let i = 0; i < stepCount; i++) {
            const sy = ledge.y - 2 + i * stepH;
            // Step tread (top face)
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(st.x + 3, sy, st.w - 6, stepH * 0.65);
            // Step riser (front face)
            ctx.fillStyle = '#64748b';
            ctx.fillRect(st.x + 3, sy + stepH * 0.65, st.w - 6, stepH * 0.35);
            // Highlight bevel
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(st.x + 3, sy, st.w - 6, 1.2);
          }

          // Side Handrail Balustrades
          ctx.fillStyle = '#475569';
          ctx.fillRect(st.x, ledge.y - 4, 4, ledge.h + 10);
          ctx.fillRect(st.x + st.w - 4, ledge.y - 4, 4, ledge.h + 10);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(st.x, ledge.y - 4, 4, 2);
          ctx.fillRect(st.x + st.w - 4, ledge.y - 4, 4, 2);
        }
      }

      ctx.restore();
    }
  }

  private renderSectionBanner(ctx: CanvasRenderingContext2D): void {
    if (!this.activeSection || !this.canvas) return;
    if (this.sectionBannerTimer <= 0) return;

    ctx.save();

    // Smooth entry/exit opacity
    const alpha = Math.min(1.0, this.sectionBannerTimer * 1.5, (3.8 - this.sectionBannerTimer) * 2.0);
    ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));

    const s = this.activeSection;
    const isRare = !!s.isRareZone;
    const cW = this.viewW;
    const badgeW = Math.min(cW - 32, isRare ? 420 : 330);
    const badgeH = 46;
    const bx = (cW - badgeW) / 2;
    const by = Math.min(125, Math.max(64, this.viewH * 0.14));

    // 1. Soft Glassmorphic Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(bx + 2, by + 4, badgeW, badgeH, 23);
    ctx.fill();

    // 2. High-Contrast Gradient Fill
    const bgGrad = ctx.createLinearGradient(bx, by, bx + badgeW, by);
    if (isRare) {
      bgGrad.addColorStop(0, '#451a03');
      bgGrad.addColorStop(0.5, '#78350f');
      bgGrad.addColorStop(1, '#451a03');
    } else {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 23);
    ctx.fill();

    // 3. Glowing Border
    ctx.strokeStyle = isRare ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = isRare ? 2.5 : 1.5;
    ctx.stroke();

    // 4. Section Icon Pill
    ctx.fillStyle = isRare ? '#b45309' : '#0369a1';
    ctx.beginPath();
    ctx.arc(bx + 24, by + badgeH / 2, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.icon || '📍', bx + 24, by + badgeH / 2);

    // 5. Section Title & Subtitle
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '900 13px system-ui';
    ctx.fillStyle = isRare ? '#fef08a' : '#f8fafc';
    ctx.fillText(s.name, bx + 50, by + 19);

    ctx.font = '600 10.5px system-ui';
    ctx.fillStyle = isRare ? '#fed7aa' : '#94a3b8';
    ctx.fillText(s.subtitle, bx + 50, by + 34);

    if (isRare) {
      // Pulsing Warning Tag on right side
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(bx + badgeW - 100, by + 11, 88, 24, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 9.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ Lv 8-14 MONS', bx + badgeW - 56, by + 26);
    }

    ctx.restore();
  }

  private drawTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number = 1.0,
    type: RouteTreeType = 'broadleaf',
    colorVariant?: FoliageColorVariant
  ): void {
    ctx.save();

    // Deterministic seeded variation so trees never flicker or change on revisit
    const treeHash = Math.abs(Math.sin(x * 127.1 + y * 311.7));
    const hOff = (treeHash - 0.5) * 4;
    const rScale = scale * (0.94 + treeHash * 0.12);
    const canopyWind = Math.sin(this.time * 2.2 + x * 0.05 + y * 0.02) * 1.8;

    // Resolve tree category
    const normalizedType: RouteTreeType =
      type === 'oak' ? 'broadleaf' : type === 'pine' ? 'conifer' : type;

    // Resolve foliage color palette
    const pal = this.getFoliagePalette(colorVariant, normalizedType, treeHash);

    // Geometry parameters based on variety
    let footY = y + 19 * rScale + hOff;
    let trunkTopY = y - 4 * rScale + hOff;
    let trunkW = 10;
    let shadowW = 22 * rScale;
    let shadowH = 9 * rScale;

    if (normalizedType === 'mature') {
      footY = y + 24 * rScale + hOff;
      trunkTopY = y - 7 * rScale + hOff;
      trunkW = 14;
      shadowW = 28 * rScale;
      shadowH = 11 * rScale;
    } else if (normalizedType === 'small') {
      footY = y + 15 * rScale + hOff;
      trunkTopY = y - 2 * rScale + hOff;
      trunkW = 8;
      shadowW = 16 * rScale;
      shadowH = 7 * rScale;
    } else if (normalizedType === 'slender') {
      footY = y + 21 * rScale + hOff;
      trunkTopY = y - 6 * rScale + hOff;
      trunkW = 7;
      shadowW = 17 * rScale;
      shadowH = 7.5 * rScale;
    } else if (normalizedType === 'coastal') {
      footY = y + 25 * rScale + hOff;
      trunkTopY = y - 18 * rScale + hOff;
      trunkW = 8;
      shadowW = 20 * rScale;
      shadowH = 8 * rScale;
    } else if (normalizedType === 'conifer') {
      footY = y + 20 * rScale + hOff;
      trunkTopY = y + 2 * rScale + hOff;
      trunkW = 9;
      shadowW = 20 * rScale;
      shadowH = 8.5 * rScale;
    } else if (normalizedType === 'dense_forest') {
      footY = y + 20 * rScale + hOff;
      trunkTopY = y - 5 * rScale + hOff;
      trunkW = 12;
      shadowW = 25 * rScale;
      shadowH = 10 * rScale;
    } else if (normalizedType === 'decorative') {
      footY = y + 16 * rScale + hOff;
      trunkTopY = y - 3 * rScale + hOff;
      trunkW = 8.5;
      shadowW = 18 * rScale;
      shadowH = 7.5 * rScale;
    }

    // 1. SOFT DIRECTIONAL GROUND DROP SHADOW (Anchored at visible trunk base)
    this.drawSoftTreeShadow(ctx, x, footY, shadowW, shadowH, rScale);

    // 2. VISIBLE BROWN TRUNK WITH ROOT FLARE, BARK TEXTURE & BRANCH FORKS
    if (normalizedType === 'coastal') {
      this.drawCoastalPalmTrunk(ctx, x, footY, trunkTopY, trunkW, rScale, treeHash);
    } else {
      const isSlender = normalizedType === 'slender' || normalizedType === 'small';
      this.drawTrunkWithBranches(ctx, x, footY, trunkTopY, trunkW, rScale, isSlender, normalizedType);
    }

    // 3. LAYERED ORGANIC CANOPY SILHOUETTES (No stacked identical spheres)
    switch (normalizedType) {
      case 'mature':
        this.drawMatureCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'small':
        this.drawSmallCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'slender':
        this.drawSlenderCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'dense_forest':
        this.drawDenseForestCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'conifer':
        this.drawConiferCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'coastal':
        this.drawCoastalPalmCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'decorative':
        this.drawDecorativeCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
      case 'blossom':
      case 'golden':
      case 'mystic':
      case 'broadleaf':
      default:
        this.drawBroadleafCanopy(ctx, x, y, rScale, pal, canopyWind, hOff, treeHash);
        break;
    }

    // 4. FLOATING ATMOSPHERIC PARTICLES (Sakura petals, autumn leaves, fairy motes)
    if (pal.motes) {
      ctx.fillStyle = pal.motes;
      const mote1X = x - 8 * rScale + canopyWind * 1.2;
      const mote1Y = y - 28 * rScale + hOff + Math.sin(this.time * 2.8 + x) * 3;
      const mote2X = x + 10 * rScale + canopyWind * 1.5;
      const mote2Y = y - 22 * rScale + hOff + Math.cos(this.time * 2.5 + y) * 3;
      ctx.beginPath();
      ctx.arc(mote1X, mote1Y, 1.8 * rScale, 0, Math.PI * 2);
      ctx.arc(mote2X, mote2Y, 1.4 * rScale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private getFoliagePalette(
    variant: FoliageColorVariant | undefined,
    type: RouteTreeType,
    hash: number
  ): { dark: string; mid: string; light: string; highlight: string; rim: string; motes?: string } {
    if (type === 'blossom' || variant === 'blossom') {
      return {
        dark: '#500724',
        mid: '#831843',
        light: '#be185d',
        highlight: '#ec4899',
        rim: '#fbcfe8',
        motes: '#fdf2f8',
      };
    }
    if (type === 'golden' || variant === 'golden') {
      return {
        dark: '#451a03',
        mid: '#78350f',
        light: '#b45309',
        highlight: '#d97706',
        rim: '#fde047',
        motes: '#fef08a',
      };
    }
    if (type === 'mystic' || variant === 'mystic') {
      return {
        dark: '#022c22',
        mid: '#064e3b',
        light: '#047857',
        highlight: '#10b981',
        rim: '#a7f3d0',
        motes: '#6ee7b7',
      };
    }
    if (type === 'coastal' || variant === 'coastal') {
      return {
        dark: '#042f2e',
        mid: '#0f766e',
        light: '#0d9488',
        highlight: '#14b8a6',
        rim: '#99f6e4',
      };
    }

    const effectiveVariant = variant || (hash > 0.82 ? 'light' : hash > 0.68 ? 'dark' : hash > 0.6 ? 'olive' : 'standard');

    switch (effectiveVariant) {
      case 'light':
        return {
          dark: '#1a2e05',
          mid: '#3f6212',
          light: '#65a30d',
          highlight: '#84cc16',
          rim: '#bef264',
        };
      case 'dark':
        return {
          dark: '#022c22',
          mid: '#064e3b',
          light: '#047857',
          highlight: '#10b981',
          rim: '#6ee7b7',
        };
      case 'olive':
        return {
          dark: '#142805',
          mid: '#273a0c',
          light: '#4d7c0f',
          highlight: '#65a30d',
          rim: '#a3e635',
        };
      case 'standard':
      default:
        return {
          dark: '#052e16',
          mid: '#14532d',
          light: '#16a34a',
          highlight: '#22c55e',
          rim: '#86efac',
        };
    }
  }

  private drawSoftTreeShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    footY: number,
    shadowW: number,
    shadowH: number,
    rScale: number
  ): void {
    ctx.save();
    const sx = x + 3.5 * rScale;
    const sy = footY + 1 * rScale;
    const shGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, shadowW);
    shGrad.addColorStop(0, 'rgba(8, 22, 10, 0.44)');
    shGrad.addColorStop(0.65, 'rgba(8, 22, 10, 0.22)');
    shGrad.addColorStop(1, 'rgba(8, 22, 10, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, shadowW, shadowH, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTrunkWithBranches(
    ctx: CanvasRenderingContext2D,
    x: number,
    footY: number,
    trunkTopY: number,
    trunkW: number,
    rScale: number,
    isSlender: boolean,
    type: RouteTreeType
  ): void {
    ctx.save();

    const rootLeft = x - trunkW * 1.35 * rScale;
    const rootRight = x + trunkW * 1.35 * rScale;
    const topLeft = x - trunkW * 0.52 * rScale;
    const topRight = x + trunkW * 0.52 * rScale;

    // 1. Natural Flared Trunk Path
    ctx.beginPath();
    ctx.moveTo(rootLeft, footY);
    ctx.quadraticCurveTo(x - trunkW * 0.75 * rScale, footY - 7 * rScale, topLeft, trunkTopY);
    ctx.lineTo(topRight, trunkTopY);
    ctx.quadraticCurveTo(x + trunkW * 0.75 * rScale, footY - 7 * rScale, rootRight, footY);
    ctx.closePath();

    // 2. Bark Gradient (Dark Bark Browns to Warm Chestnut)
    const trunkGrad = ctx.createLinearGradient(rootLeft, footY, rootRight, footY);
    trunkGrad.addColorStop(0, '#1c0a02');
    trunkGrad.addColorStop(0.25, '#451a03');
    trunkGrad.addColorStop(0.62, '#78350f');
    trunkGrad.addColorStop(0.88, '#58240c');
    trunkGrad.addColorStop(1, '#271206');
    ctx.fillStyle = trunkGrad;
    ctx.fill();

    // 3. Vertical Bark Grain Lines
    ctx.strokeStyle = 'rgba(28, 10, 2, 0.72)';
    ctx.lineWidth = Math.max(1, 1.2 * rScale);
    ctx.beginPath();
    ctx.moveTo(x - trunkW * 0.22 * rScale, footY - 2 * rScale);
    ctx.quadraticCurveTo(x - trunkW * 0.2 * rScale, (footY + trunkTopY) / 2, topLeft + 2 * rScale, trunkTopY + 2 * rScale);
    ctx.moveTo(x + trunkW * 0.22 * rScale, footY - 3 * rScale);
    ctx.quadraticCurveTo(x + trunkW * 0.16 * rScale, (footY + trunkTopY) / 2, topRight - 2 * rScale, trunkTopY + 3 * rScale);
    ctx.stroke();

    // 4. Subtle Sun-Dappled Bark Highlight Rib
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.32)';
    ctx.lineWidth = 1 * rScale;
    ctx.beginPath();
    ctx.moveTo(x + trunkW * 0.04 * rScale, footY - 4 * rScale);
    ctx.lineTo(x + trunkW * 0.04 * rScale, trunkTopY + 3 * rScale);
    ctx.stroke();

    // 5. Visible Branch Forks (Extending naturally into lower canopy)
    if (!isSlender && type !== 'conifer') {
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = Math.max(2, 3.2 * rScale);
      ctx.lineCap = 'round';
      // Left branch limb
      ctx.beginPath();
      ctx.moveTo(x - trunkW * 0.2 * rScale, trunkTopY + 4 * rScale);
      ctx.quadraticCurveTo(x - trunkW * 0.8 * rScale, trunkTopY - 4 * rScale, x - trunkW * 1.5 * rScale, trunkTopY - 10 * rScale);
      ctx.stroke();
      // Right branch limb
      ctx.beginPath();
      ctx.moveTo(x + trunkW * 0.2 * rScale, trunkTopY + 4 * rScale);
      ctx.quadraticCurveTo(x + trunkW * 0.8 * rScale, trunkTopY - 3 * rScale, x + trunkW * 1.4 * rScale, trunkTopY - 8 * rScale);
      ctx.stroke();

      if (type === 'mature') {
        // Center higher limb for mature tree
        ctx.beginPath();
        ctx.moveTo(x, trunkTopY + 2 * rScale);
        ctx.lineTo(x, trunkTopY - 14 * rScale);
        ctx.stroke();
      }
    }

    // 6. Natural Grass/Turf Contact Blades
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(rootLeft - 2 * rScale, footY);
    ctx.lineTo(rootLeft + 1 * rScale, footY - 4 * rScale);
    ctx.lineTo(rootLeft + 4 * rScale, footY);
    ctx.moveTo(rootRight - 4 * rScale, footY);
    ctx.lineTo(rootRight - 1 * rScale, footY - 5 * rScale);
    ctx.lineTo(rootRight + 2 * rScale, footY);
    ctx.fill();

    ctx.restore();
  }

  private drawCoastalPalmTrunk(
    ctx: CanvasRenderingContext2D,
    x: number,
    footY: number,
    trunkTopY: number,
    trunkW: number,
    rScale: number,
    treeHash: number
  ): void {
    ctx.save();
    const curveOffset = (treeHash - 0.5) * 12 * rScale;
    const midY = (footY + trunkTopY) / 2;

    // Curved slender trunk path
    ctx.beginPath();
    ctx.moveTo(x - trunkW * 0.9 * rScale, footY);
    ctx.quadraticCurveTo(x + curveOffset - trunkW * 0.4 * rScale, midY, x + curveOffset * 0.5 - trunkW * 0.3 * rScale, trunkTopY);
    ctx.lineTo(x + curveOffset * 0.5 + trunkW * 0.3 * rScale, trunkTopY);
    ctx.quadraticCurveTo(x + curveOffset + trunkW * 0.4 * rScale, midY, x + trunkW * 0.9 * rScale, footY);
    ctx.closePath();

    const palmTrunkGrad = ctx.createLinearGradient(x - trunkW * rScale, footY, x + trunkW * rScale, footY);
    palmTrunkGrad.addColorStop(0, '#451a03');
    palmTrunkGrad.addColorStop(0.4, '#78350f');
    palmTrunkGrad.addColorStop(0.85, '#9a3412');
    palmTrunkGrad.addColorStop(1, '#271206');
    ctx.fillStyle = palmTrunkGrad;
    ctx.fill();

    // Segmented ring marks on palm trunk
    ctx.strokeStyle = '#271206';
    ctx.lineWidth = 1.2 * rScale;
    for (let ty = trunkTopY + 6 * rScale; ty < footY - 4 * rScale; ty += 7 * rScale) {
      const progress = (ty - trunkTopY) / (footY - trunkTopY);
      const currX = x + curveOffset * (1 - progress * 0.7);
      ctx.beginPath();
      ctx.moveTo(currX - trunkW * 0.4 * rScale, ty);
      ctx.lineTo(currX + trunkW * 0.4 * rScale, ty + 1 * rScale);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawOrganicBough(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rw: number,
    rh: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    jitterSeed: number = 0
  ): void {
    ctx.save();

    // 7-lobed organic asymmetrical perimeter
    const numLobes = 7;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < numLobes; i++) {
      const angle = (i / numLobes) * Math.PI * 2;
      const wave = Math.sin(angle * 3 + jitterSeed) * 0.16 + Math.cos(angle * 2 + jitterSeed * 1.5) * 0.1;
      const rLobeW = rw * (0.92 + wave);
      const rLobeH = rh * (0.90 + wave * 0.75);
      points.push({
        x: cx + Math.cos(angle) * rLobeW,
        y: cy + Math.sin(angle) * rLobeH,
      });
    }

    ctx.beginPath();
    ctx.moveTo((points[0].x + points[numLobes - 1].x) / 2, (points[0].y + points[numLobes - 1].y) / 2);
    for (let i = 0; i < numLobes; i++) {
      const nextIdx = (i + 1) % numLobes;
      const midX = (points[i].x + points[nextIdx].x) / 2;
      const midY = (points[i].y + points[nextIdx].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    ctx.closePath();

    // Volume gradient: highlight on sunlit top-left, deep shadow on bottom-right
    const grad = ctx.createRadialGradient(cx - rw * 0.35, cy - rh * 0.35, rw * 0.15, cx, cy, Math.max(rw, rh));
    grad.addColorStop(0, pal.highlight);
    grad.addColorStop(0.35, pal.light);
    grad.addColorStop(0.72, pal.mid);
    grad.addColorStop(1, pal.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Interior sunlit leaf mass
    ctx.fillStyle = pal.highlight;
    const hx = cx - rw * 0.28;
    const hy = cy - rh * 0.28;
    ctx.beginPath();
    ctx.ellipse(hx, hy, rw * 0.36, rh * 0.28, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Sun rim catchlight
    ctx.fillStyle = pal.rim;
    ctx.beginPath();
    ctx.arc(hx - rw * 0.08, hy - rh * 0.08, rw * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawBroadleafCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Under-canopy shadow base
    ctx.save();
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(x + wind * 0.3, y - 10 * rScale + hOff, 22 * rScale, 16 * rScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Layer 1: Lower Boughs (leaving 18px of visible trunk beneath)
    this.drawOrganicBough(ctx, x - 13 * rScale + wind * 0.3, y - 8 * rScale + hOff, 14 * rScale, 12 * rScale, pal, seed);
    this.drawOrganicBough(ctx, x + 12 * rScale + wind * 0.4, y - 7 * rScale + hOff, 13 * rScale, 11 * rScale, pal, seed + 1.2);

    // Layer 2: Mid Canopy Body
    this.drawOrganicBough(ctx, x - 10 * rScale + wind * 0.6, y - 16 * rScale + hOff, 16 * rScale, 13 * rScale, pal, seed + 2.4);
    this.drawOrganicBough(ctx, x + 9 * rScale + wind * 0.7, y - 15 * rScale + hOff, 15 * rScale, 12 * rScale, pal, seed + 3.6);

    // Layer 3: Crown Mass
    this.drawOrganicBough(ctx, x + wind * 0.9, y - 24 * rScale + hOff, 17 * rScale, 14 * rScale, pal, seed + 4.8);

    // Sunlit leaf flecks on crown edge
    ctx.fillStyle = pal.rim;
    ctx.beginPath();
    ctx.arc(x - 5 * rScale + wind, y - 32 * rScale + hOff, 2.8 * rScale, 0, Math.PI * 2);
    ctx.arc(x + 1 * rScale + wind, y - 34 * rScale + hOff, 2.2 * rScale, 0, Math.PI * 2);
    ctx.arc(x + 6 * rScale + wind, y - 30 * rScale + hOff, 2.0 * rScale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMatureCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Large deep ambient shadow base
    ctx.save();
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(x + wind * 0.3, y - 14 * rScale + hOff, 32 * rScale, 20 * rScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Expansive 5-bough mature crown
    this.drawOrganicBough(ctx, x - 20 * rScale + wind * 0.3, y - 10 * rScale + hOff, 18 * rScale, 14 * rScale, pal, seed);
    this.drawOrganicBough(ctx, x + 19 * rScale + wind * 0.4, y - 9 * rScale + hOff, 17 * rScale, 13 * rScale, pal, seed + 1);
    this.drawOrganicBough(ctx, x - 14 * rScale + wind * 0.6, y - 22 * rScale + hOff, 20 * rScale, 15 * rScale, pal, seed + 2);
    this.drawOrganicBough(ctx, x + 13 * rScale + wind * 0.7, y - 20 * rScale + hOff, 19 * rScale, 14 * rScale, pal, seed + 3);
    this.drawOrganicBough(ctx, x + wind * 0.9, y - 32 * rScale + hOff, 22 * rScale, 16 * rScale, pal, seed + 4);

    // Crown sun highlights
    ctx.fillStyle = pal.rim;
    ctx.beginPath();
    ctx.arc(x - 8 * rScale + wind, y - 42 * rScale + hOff, 3.5 * rScale, 0, Math.PI * 2);
    ctx.arc(x + wind, y - 44 * rScale + hOff, 2.8 * rScale, 0, Math.PI * 2);
    ctx.arc(x + 7 * rScale + wind, y - 40 * rScale + hOff, 2.5 * rScale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSmallCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Compact garden / street canopy
    this.drawOrganicBough(ctx, x - 7 * rScale + wind * 0.4, y - 6 * rScale + hOff, 11 * rScale, 9 * rScale, pal, seed);
    this.drawOrganicBough(ctx, x + 7 * rScale + wind * 0.5, y - 5 * rScale + hOff, 10 * rScale, 8.5 * rScale, pal, seed + 1.5);
    this.drawOrganicBough(ctx, x + wind * 0.8, y - 16 * rScale + hOff, 13 * rScale, 11 * rScale, pal, seed + 3);

    ctx.fillStyle = pal.rim;
    ctx.beginPath();
    ctx.arc(x - 3 * rScale + wind, y - 23 * rScale + hOff, 2.0 * rScale, 0, Math.PI * 2);
    ctx.arc(x + 2 * rScale + wind, y - 22 * rScale + hOff, 1.8 * rScale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSlenderCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Narrow elevated crown
    this.drawOrganicBough(ctx, x - 5 * rScale + wind * 0.3, y - 9 * rScale + hOff, 10 * rScale, 11 * rScale, pal, seed);
    this.drawOrganicBough(ctx, x + 5 * rScale + wind * 0.4, y - 8 * rScale + hOff, 9.5 * rScale, 10.5 * rScale, pal, seed + 1.2);
    this.drawOrganicBough(ctx, x + wind * 0.7, y - 20 * rScale + hOff, 12 * rScale, 13 * rScale, pal, seed + 2.5);
    this.drawOrganicBough(ctx, x + wind * 0.9, y - 30 * rScale + hOff, 10 * rScale, 11 * rScale, pal, seed + 4);
  }

  private drawDenseForestCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Deep heavy boundary canopy
    ctx.save();
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(x + wind * 0.3, y - 12 * rScale + hOff, 28 * rScale, 18 * rScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawOrganicBough(ctx, x - 17 * rScale + wind * 0.3, y - 8 * rScale + hOff, 16 * rScale, 13 * rScale, pal, seed);
    this.drawOrganicBough(ctx, x + 16 * rScale + wind * 0.4, y - 7 * rScale + hOff, 15 * rScale, 12 * rScale, pal, seed + 1.5);
    this.drawOrganicBough(ctx, x - 11 * rScale + wind * 0.6, y - 18 * rScale + hOff, 17 * rScale, 14 * rScale, pal, seed + 3);
    this.drawOrganicBough(ctx, x + 10 * rScale + wind * 0.7, y - 17 * rScale + hOff, 16 * rScale, 13 * rScale, pal, seed + 4.5);
    this.drawOrganicBough(ctx, x + wind * 0.9, y - 27 * rScale + hOff, 19 * rScale, 15 * rScale, pal, seed + 6);
  }

  private drawConiferCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Distinct conical silhouette with 3 tapered needle tiers (leaving 16px of visible trunk)
    this.drawConiferTier(ctx, x + wind * 0.3, y + 4 * rScale + hOff, 30 * rScale, 17 * rScale, pal, seed);
    this.drawConiferTier(ctx, x + wind * 0.6, y - 9 * rScale + hOff, 23 * rScale, 16 * rScale, pal, seed + 1);
    this.drawConiferTier(ctx, x + wind * 0.9, y - 22 * rScale + hOff, 15 * rScale, 16 * rScale, pal, seed + 2);

    // Tip needle peak
    ctx.fillStyle = pal.rim;
    ctx.beginPath();
    ctx.moveTo(x + wind * 0.9 - 2 * rScale, y - 31 * rScale + hOff);
    ctx.lineTo(x + wind * 0.9, y - 36 * rScale + hOff);
    ctx.lineTo(x + wind * 0.9 + 2 * rScale, y - 31 * rScale + hOff);
    ctx.fill();
  }

  private drawConiferTier(
    ctx: CanvasRenderingContext2D,
    x: number,
    tierBaseY: number,
    w: number,
    h: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    seed: number
  ): void {
    ctx.save();
    const halfW = w / 2;
    const apexY = tierBaseY - h;

    // Conical tier path
    ctx.beginPath();
    ctx.moveTo(x, apexY);
    ctx.lineTo(x + halfW, tierBaseY);
    ctx.lineTo(x - halfW, tierBaseY);
    ctx.closePath();

    // Volume gradient
    const tierGrad = ctx.createLinearGradient(x - halfW, apexY, x + halfW, tierBaseY);
    tierGrad.addColorStop(0, pal.highlight);
    tierGrad.addColorStop(0.35, pal.light);
    tierGrad.addColorStop(0.75, pal.mid);
    tierGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = tierGrad;
    ctx.fill();

    // Serrated bottom needles
    ctx.fillStyle = pal.dark;
    const step = 6;
    for (let nx = x - halfW; nx <= x + halfW; nx += step) {
      ctx.beginPath();
      ctx.moveTo(nx - 3, tierBaseY);
      ctx.lineTo(nx, tierBaseY + 3.5);
      ctx.lineTo(nx + 3, tierBaseY);
      ctx.closePath();
      ctx.fill();
    }

    // Western slope sunlit needle flecks
    ctx.fillStyle = pal.rim;
    ctx.beginPath();
    ctx.moveTo(x - halfW * 0.5, tierBaseY - h * 0.3);
    ctx.lineTo(x - halfW * 0.3, tierBaseY - h * 0.6);
    ctx.lineTo(x - halfW * 0.1, tierBaseY - h * 0.3);
    ctx.fill();

    ctx.restore();
  }

  private drawCoastalPalmCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    ctx.save();
    const crownX = x + wind * 0.6;
    const crownY = y - 18 * rScale + hOff;

    // Coconut cluster under fronds
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(crownX - 3 * rScale, crownY + 2 * rScale, 3.2 * rScale, 0, Math.PI * 2);
    ctx.arc(crownX + 3 * rScale, crownY + 2 * rScale, 3.0 * rScale, 0, Math.PI * 2);
    ctx.arc(crownX, crownY + 4 * rScale, 2.8 * rScale, 0, Math.PI * 2);
    ctx.fill();

    // 5 radiating drooping palm fronds
    const frondAngles = [-Math.PI * 0.85, -Math.PI * 0.6, -Math.PI * 0.35, -Math.PI * 0.1, Math.PI * 0.05];
    for (let i = 0; i < frondAngles.length; i++) {
      const baseAngle = frondAngles[i];
      const frondLen = (28 + (i % 2) * 5) * rScale;
      const endX = crownX + Math.cos(baseAngle) * frondLen + wind * 0.5;
      const endY = crownY + Math.sin(baseAngle) * (frondLen * 0.65) + 12 * rScale;
      const ctrlX = crownX + Math.cos(baseAngle) * (frondLen * 0.6);
      const ctrlY = crownY + Math.sin(baseAngle) * (frondLen * 0.5) - 6 * rScale;

      ctx.beginPath();
      ctx.moveTo(crownX, crownY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
      ctx.strokeStyle = i < 2 ? pal.highlight : pal.mid;
      ctx.lineWidth = 3.5 * rScale;
      ctx.stroke();

      // Frond leaflets
      ctx.fillStyle = i < 2 ? pal.light : pal.dark;
      ctx.beginPath();
      ctx.ellipse(ctrlX, ctrlY + 2 * rScale, 9 * rScale, 4.5 * rScale, baseAngle, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawDecorativeCanopy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rScale: number,
    pal: { dark: string; mid: string; light: string; highlight: string; rim: string },
    wind: number,
    hOff: number,
    seed: number
  ): void {
    // Manicured urban topiary crown
    ctx.save();
    const cy = y - 12 * rScale + hOff;

    const grad = ctx.createRadialGradient(x - 5 * rScale, cy - 6 * rScale, 3 * rScale, x, cy, 18 * rScale);
    grad.addColorStop(0, pal.highlight);
    grad.addColorStop(0.45, pal.light);
    grad.addColorStop(0.8, pal.mid);
    grad.addColorStop(1, pal.dark);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(x + wind * 0.5, cy, 15 * rScale, 18 * rScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Topiary manicured sunlit highlight ring
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.5 * rScale;
    ctx.beginPath();
    ctx.arc(x - 4 * rScale + wind * 0.4, cy - 6 * rScale, 6 * rScale, -Math.PI * 0.7, Math.PI * 0.1);
    ctx.stroke();

    ctx.restore();
  }

  private renderOverheadScenery(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    ctx.save();

    // Exit Signpost
    if (route.exitX > 0) {
      const ex = route.exitX - 30;
      const ey = 200;

      // Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey + 32, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Post
      ctx.fillStyle = '#58240c';
      ctx.fillRect(ex - 2.5, ey + 10, 5, 24);

      // Carved Wooden Signboard
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(ex - 26, ey - 2, 56, 21);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.strokeRect(ex - 26, ey - 2, 56, 21);

      // Arrow & Text
      ctx.fillStyle = '#78350f';
      ctx.font = '900 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT ROUTE ➔', ex + 2, ey + 12.5);
    }

    ctx.restore();
  }


}

export const routeExplorationEngine = new RouteExplorationEngine();
