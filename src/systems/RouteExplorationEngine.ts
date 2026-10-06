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

import { POKEMON_SPECIES_MAP } from '../data/pokemon';
import { sound } from '../audio/SoundSynthesizer';
import { generateEncounterMon, EncounterMon } from './EncounterSystem';
import { inputManager } from './InputManager';

export interface RouteBuilding {
  type: 'center' | 'mart' | 'gym' | 'gate' | 'house' | 'museum' | 'dept_store' | 'silph' | 'safari_gate' | 'lab' | 'fan_club' | 'dojo';
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
  type: 'ball' | 'berry' | 'money';
  amount: number;
  collected: boolean;
}

export interface RouteNPC {
  id: string;
  x: number;
  y: number;
  avatar: string;
  name: string;
  dialogue: string;
  gift?: { type: 'ball' | 'berry' | 'money'; name: string; amount: number };
  given?: boolean;
}

export interface GrassPatch {
  x: number;
  y: number;
  w: number;
  h: number;
  zone?: string;
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

export interface RouteTree {
  x: number;
  y: number;
  scale?: number;
  type?: 'oak' | 'pine' | 'blossom' | 'mystic';
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
  style?: 'stone' | 'marble' | 'brick' | 'monument' | 'anchor' | 'clock' | 'fumarole' | 'zen' | 'tech';
  label?: string;
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

  // Camera
  private camX: number = 0;
  private camY: number = 0;

  // Input Keys
  private keys: Record<string, boolean> = {};

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

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.isPaused || !this.canvas || !this.currentRoute) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;
    const worldX = screenX + this.camX;
    const worldY = screenY + this.camY;
    this.targetDest = { x: worldX, y: worldY };
  };

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.loop.bind(this);
  }

  public resize(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      const w = parent.clientWidth || 800;
      const h = parent.clientHeight || 480;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }
  }

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', this.handlePointerDown);

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

    // Check NPC interaction
    for (const npc of this.currentRoute.npcs) {
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < 55) {
        sound.beep(660, 0.1, 'triangle');
        if (this.onTalkNPC) this.onTalkNPC(npc);
        return;
      }
    }

    // Check Building interaction
    for (const b of this.currentRoute.buildings) {
      const nearDoor =
        this.player.x >= b.x - 20 &&
        this.player.x <= b.x + b.w + 24 &&
        this.player.y >= b.y + b.h - 16 &&
        this.player.y <= b.y + b.h + 45;

      if (nearDoor) {
        sound.beep(880, 0.15, 'sine');
        if (b.type === 'gym') {
          if (b.gymIndex !== undefined && this.onEnterGym) {
            this.onEnterGym(b.gymIndex);
          } else if (this.onEnterHouse) {
            this.onEnterHouse(b);
          }
        } else if (b.type === 'mart' && this.onEnterMart) {
          this.onEnterMart();
        } else if (b.type === 'center' && this.onEnterCenter) {
          this.onEnterCenter();
        } else if (b.type === 'house' && this.onEnterHouse) {
          this.onEnterHouse(b);
        } else if (
          (b.type === 'museum' ||
            b.type === 'dept_store' ||
            b.type === 'silph' ||
            b.type === 'safari_gate' ||
            b.type === 'lab' ||
            b.type === 'fan_club' ||
            b.type === 'dojo') &&
          this.onEnterHouse
        ) {
          this.onEnterHouse(b);
        } else if (b.type === 'gate') {
          if (this.onEnterGate) {
            this.onEnterGate(b);
          } else if (this.onRouteExit) {
            this.onRouteExit(this.currentRoute.id + 1);
          }
        }
        return;
      }
    }

    // Check Route Exit Signpost (Forward / East)
    if (this.currentRoute.exitX > 0) {
      const ex = this.currentRoute.exitX - 30;
      const ey = 200;
      if (Math.hypot(this.player.x - ex, this.player.y - ey) < 55) {
        sound.beep(880, 0.15, 'sine');
        if (this.onRouteExit) {
          this.onRouteExit(this.currentRoute.id + 1);
        }
        return;
      }
    }

    // Check Previous Route Entrance (Backward / West)
    if (this.currentRoute.id > 0 && this.player.x <= 55) {
      sound.beep(880, 0.15, 'sine');
      if (this.onRoutePreviousExit) {
        this.onRoutePreviousExit(this.currentRoute.id - 1);
      }
      return;
    }

    // Check Route Signposts
    if (this.currentRoute.signposts) {
      for (const sp of this.currentRoute.signposts) {
        if (Math.hypot(this.player.x - sp.x, this.player.y - sp.y) < 50) {
          sound.beep(750, 0.1, 'sine');
          if (this.onReadSignpost) {
            this.onReadSignpost(sp);
          }
          return;
        }
      }
    }
  }

  public hasNearbyInteractable(): boolean {
    if (!this.currentRoute) return false;
    for (const npc of this.currentRoute.npcs) {
      if (Math.hypot(this.player.x - npc.x, this.player.y - npc.y) < 55) return true;
    }
    for (const b of this.currentRoute.buildings) {
      const nearDoor =
        this.player.x >= b.x - 20 &&
        this.player.x <= b.x + b.w + 24 &&
        this.player.y >= b.y + b.h - 16 &&
        this.player.y <= b.y + b.h + 45;
      if (nearDoor) return true;
    }
    if (this.currentRoute.exitX > 0) {
      const ex = this.currentRoute.exitX - 30;
      const ey = 200;
      if (Math.hypot(this.player.x - ex, this.player.y - ey) < 55) return true;
    }
    if (this.currentRoute.signposts) {
      for (const sp of this.currentRoute.signposts) {
        if (Math.hypot(this.player.x - sp.x, this.player.y - sp.y) < 50) return true;
      }
    }
    return false;
  }

  public loadRoute(routeDef: RouteDefinition, resumeX?: number, resumeY?: number): void {
    this.currentRoute = routeDef;
    this.routeIndex = routeDef.id;
    this.player.x = resumeX !== undefined ? resumeX : routeDef.startX;
    this.player.y = resumeY !== undefined ? resumeY : routeDef.startY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.cooldownTimer = 2.0; // 2 seconds safety cooldown after returning
    this.isPaused = false;
    this.initParticles();
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
    if (!this.currentRoute) return;

    this.time += dt;

    // Update atmospheric floating particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += (p.vy + Math.sin(this.time * 2 + p.x * 0.05) * 4) * dt;
      p.rot += p.rotSpeed * dt;
      if (this.currentRoute) {
        if (p.x > this.currentRoute.worldWidth + 20) p.x = -20;
        if (p.y > this.currentRoute.worldHeight + 20) p.y = -20;
      }
    }

    // Update grass kick-up particles
    for (let i = this.grassParticles.length - 1; i >= 0; i--) {
      const gp = this.grassParticles[i];
      gp.x += gp.vx * dt;
      gp.y += gp.vy * dt;
      gp.life -= dt;
      if (gp.life <= 0) {
        this.grassParticles.splice(i, 1);
      }
    }

    const move = inputManager.getMovement();
    let dx = move.dx;
    let dy = move.dy;

    // Combine with legacy keys if any
    if (this.keys['ArrowUp']) dy -= 1;
    if (this.keys['ArrowDown']) dy += 1;
    if (this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['ArrowRight']) dx += 1;

    let len = Math.hypot(dx, dy);

    // If manual input is given, cancel tap-to-move destination
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

    if (Math.abs(dx) > Math.abs(dy)) {
      this.player.dir = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 0) {
      this.player.dir = dy > 0 ? 'down' : 'up';
    }

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

    // Cooldown timer
    if (this.player.cooldownTimer > 0) {
      this.player.cooldownTimer -= dt;
    }

    // Move player with axis-aligned sliding collision checks
    const moveX = dx * this.player.speed * dt;
    const moveY = dy * this.player.speed * dt;

    if (Math.abs(moveX) > 0.001) {
      const nextX = this.player.x + moveX;
      if (!this.isBlocked(nextX, this.player.y, this.currentRoute)) {
        this.player.x = nextX;
      }
    }

    if (Math.abs(moveY) > 0.001) {
      const nextY = this.player.y + moveY;
      if (!this.isBlocked(this.player.x, nextY, this.currentRoute)) {
        this.player.y = nextY;
      }
    }

    // Check Tall Grass (Spawn Grass Patches) & Wild Encounters
    // Normal lawn grass outside paths is safe walking terrain.
    // Wild Pokémon encounters ONLY occur when wading inside tall grass patches!
    let inGrassNow = false;
    let currentGrassZone: string | undefined = undefined;

    // Check player's foot position for realistic wading
    const footX = this.player.x;
    const footY = this.player.y + 10;

    for (const patch of this.currentRoute.grassPatches) {
      if (
        footX >= patch.x - 2 &&
        footX <= patch.x + patch.w + 2 &&
        footY >= patch.y - 2 &&
        footY <= patch.y + patch.h + 2
      ) {
        inGrassNow = true;
        currentGrassZone = patch.zone;
        break;
      }
    }

    this.player.inGrass = inGrassNow;

    if (inGrassNow && isMoving) {
      if (Math.random() < 0.45) {
        this.spawnGrassParticle(this.player.x, this.player.y + 12);
      }
      if (this.player.cooldownTimer <= 0) {
        // Increased spawn rate when walking in tall grass (responsive & snappy)
        this.player.grassSteps += dt * 3.8;
        if (this.player.grassSteps >= 2.6) {
          this.player.grassSteps = 0;
          // Roll for wild encounter (~60% chance per check)
          const encounterRoll = Math.random();
          if (encounterRoll < 0.60) {
            this.triggerWildBattle(currentGrassZone || (this.currentRoute.theme === 'forest' ? 'forest' : 'field'));
            return;
          }
        }
      }
    }

    // Update Active Map Section & On-Screen Banner
    if (this.currentRoute.sections) {
      for (const sec of this.currentRoute.sections) {
        if (
          this.player.x >= sec.x &&
          this.player.x <= sec.x + sec.w &&
          this.player.y >= sec.y &&
          this.player.y <= sec.y + sec.h
        ) {
          if (!this.activeSection || this.activeSection.id !== sec.id) {
            this.activeSection = sec;
            this.sectionBannerTimer = 3.8;
            const locEl = document.getElementById('route-location-label');
            if (locEl) {
              locEl.innerHTML = `${this.currentRoute.name} &bull; ${sec.icon} ${sec.name}`;
            }
          }
          break;
        }
      }
    }
    if (this.sectionBannerTimer > 0) {
      this.sectionBannerTimer -= dt;
    }

    // Check Contextual Proximity Prompt
    const promptEl = document.getElementById('route-prompt');
    let promptTarget = '';
    let promptAction = '';

    for (const npc of this.currentRoute.npcs) {
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < 55) {
        promptTarget = npc.name;
        promptAction = 'Talk';
        break;
      }
    }

    if (!promptTarget && this.currentRoute.signposts) {
      for (const sp of this.currentRoute.signposts) {
        if (Math.hypot(this.player.x - sp.x, this.player.y - sp.y) < 50) {
          promptTarget = sp.title;
          promptAction = 'Read Sign';
          break;
        }
      }
    }

    if (!promptTarget) {
      for (const b of this.currentRoute.buildings) {
        const nearDoor =
          this.player.x >= b.x - 20 &&
          this.player.x <= b.x + b.w + 24 &&
          this.player.y >= b.y + b.h - 16 &&
          this.player.y <= b.y + b.h + 45;
        if (nearDoor) {
          promptTarget = b.label;
          promptAction = b.type === 'gym' ? (b.gymIndex !== undefined ? 'Enter Gym' : 'Inspect') : (b.type === 'house' || b.type === 'museum' || b.type === 'dept_store' || b.type === 'silph' || b.type === 'safari_gate' || b.type === 'lab' || b.type === 'fan_club' || b.type === 'dojo') ? 'Visit' : 'Enter';
          break;
        }
      }
    }

    if (!promptTarget && this.currentRoute.exitX > 0) {
      const ex = this.currentRoute.exitX - 30;
      const ey = 200;
      if (Math.hypot(this.player.x - ex, this.player.y - ey) < 55) {
        promptTarget = this.currentRoute.destinationLabel || 'Next Route';
        promptAction = 'Travel';
      }
    }

    if (!promptTarget && this.currentRoute.id > 0 && this.player.x <= 55) {
      promptTarget = 'Previous Route / Area';
      promptAction = 'Return ⬅';
    }

    const actBtn = document.getElementById('btn-interact');
    if (promptEl) {
      if (promptTarget) {
        promptEl.innerHTML = `<span class="context-label">${promptTarget}</span><button class="context-action-btn" id="context-pill-btn">${promptAction}</button>`;
        promptEl.classList.remove('hidden');
        const pillBtn = document.getElementById('context-pill-btn');
        if (pillBtn) {
          pillBtn.onclick = (e) => {
            e.stopPropagation();
            this.interact();
          };
        }
      } else {
        promptEl.classList.add('hidden');
      }
    }
    if (actBtn) {
      if (promptTarget) {
        actBtn.classList.remove('hidden');
        actBtn.classList.add('pulse');
        actBtn.textContent = promptAction;
      } else {
        actBtn.classList.add('hidden');
        actBtn.classList.remove('pulse');
      }
    }

    // Check Ground Items
    for (const it of this.currentRoute.items) {
      if (!it.collected) {
        const dist = Math.hypot(this.player.x - it.x, this.player.y - it.y);
        if (dist < 26) {
          it.collected = true;
          sound.beep(880, 0.15, 'sine');
          sound.beep(1100, 0.2, 'sine', 0.1, 0.12);
          if (this.onPickItem) this.onPickItem(it);
        }
      }
    }

    // Check Route Exit (Forward / East)
    if (this.currentRoute.exitX > 0 && this.player.x >= this.currentRoute.exitX) {
      if (this.onRouteExit) {
        this.isPaused = true;
        sound.beep(780, 0.25, 'triangle');
        this.onRouteExit(this.currentRoute.id + 1);
        return;
      }
    }

    // Check Route Exit (Backward / West)
    if (this.currentRoute.id > 0 && this.player.x <= 26) {
      if (this.onRoutePreviousExit) {
        this.isPaused = true;
        sound.beep(780, 0.25, 'triangle');
        this.onRoutePreviousExit(this.currentRoute.id - 1);
        return;
      }
    }

    // Update Camera with Smooth Lerp
    if (this.canvas) {
      const targetCamX = this.player.x - this.canvas.width / 2;
      const targetCamY = this.player.y - this.canvas.height / 2;

      let desiredCamX = 0;
      let desiredCamY = 0;

      if (this.canvas.width >= this.currentRoute.worldWidth) {
        desiredCamX = -(this.canvas.width - this.currentRoute.worldWidth) / 2;
      } else {
        const maxCamX = this.currentRoute.worldWidth - this.canvas.width;
        desiredCamX = Math.max(0, Math.min(maxCamX, targetCamX));
      }

      if (this.canvas.height >= this.currentRoute.worldHeight) {
        desiredCamY = -(this.canvas.height - this.currentRoute.worldHeight) / 2;
      } else {
        const maxCamY = this.currentRoute.worldHeight - this.canvas.height;
        desiredCamY = Math.max(0, Math.min(maxCamY, targetCamY));
      }

      // Smooth camera interpolation
      const lerp = Math.min(1.0, dt * 10);
      this.camX += (desiredCamX - this.camX) * lerp;
      this.camY += (desiredCamY - this.camY) * lerp;
    }
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

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const route = this.currentRoute;
    if (!ctx || !canvas || !route) return;

    ctx.save();

    // Fill screen background outside world boundaries
    const baseGreen = route.theme === 'forest' ? '#143825' : route.theme === 'city' ? '#245239' : '#1e431b';
    ctx.fillStyle = baseGreen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Translation
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));

    // 1. Terrain Grass Base
    this.renderTerrain(ctx, route);

    // 2. Freshwater Ponds with Aquatic Caustics & Wooden Piers
    this.renderPonds(ctx, route);

    // 3. Terraced Cliff Ledges with Carved Stone Stairs
    this.renderLedges(ctx, route);

    // 4. Paths & Cobblestone Avenues
    this.renderPaths(ctx, route);

    // 4.5 City Fountains
    this.renderFountains(ctx, route);

    // 4.6 City Benches
    this.renderBenches(ctx, route);

    // 5. Tall Grass with Wind Sway Animation & Wildflowers (Special mystical grass in Rare Sanctuary!)
    this.renderTallGrass(ctx, route);

    // 6. Natural Stones & Boulders
    this.renderStones(ctx, route);

    // 6.5 Carved Wooden Signposts
    this.renderSignposts(ctx, route);

    // 7. Wooden Post-and-Rail Fences
    this.renderFences(ctx, route);

    // 8. Buildings (Pokémon Center, Poké Mart, Gym, Route Gate, Houses)
    for (const b of route.buildings) {
      this.renderBuilding(ctx, b);
    }

    // 8.5 Ornate City Streetlamps with Warm Radial Glow
    this.renderStreetlamps(ctx, route);

    // 9. Ground Items (3D Poké Balls with Sparkle)
    for (const it of route.items) {
      if (!it.collected) {
        this.renderGroundItem(ctx, it);
      }
    }

    // 10. Trees BEHIND Player
    this.renderTreesLayer(ctx, route, 'behind');

    // 11. NPCs with Animated Interaction Prompts
    for (const npc of route.npcs) {
      this.renderNPC(ctx, npc);
    }

    // 12. Grass Particles
    this.renderGrassParticles(ctx);

    // 13. Player Character (Detailed Red/Ash with Animated Walking Cycle)
    this.renderPlayer(ctx);

    // 14. Trees IN FRONT OF Player
    this.renderTreesLayer(ctx, route, 'front');

    // 15. Overhead Exit Signpost & Scenery
    this.renderOverheadScenery(ctx, route);

    // 16. Ambient Atmospheric Particles (Leaves & Pollen in the Breeze)
    this.renderAtmosphere(ctx, route);

    ctx.restore();

    // 17. Active Map Section HUD Badge & Rare Area Warning Banner (Screen Space)
    this.renderSectionBanner(ctx);
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

    const isPavedPath = (p: RoutePath) =>
      p.style === 'flagstone' ||
      p.style === 'cobble' ||
      p.style === 'brick' ||
      p.style === 'paved' ||
      isCityTheme ||
      (route.id === 0 && p.x >= 1900);

    const pavedPaths = route.path.filter(isPavedPath);
    const dirtPaths = route.path.filter(p => !isPavedPath(p));

    // ========================================================================
    // 1. DIRT / NATURAL COUNTRY TRAILS
    // ========================================================================
    for (const p of dirtPaths) {
      ctx.save();

      // Soft ambient drop shadow underneath
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.roundRect(p.x - 2, p.y - 2, p.w + 4, p.h + 6, 8);
      ctx.fill();

      // Deep Earth Loam Base
      ctx.fillStyle = '#8c5e39';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Main Sunlit Trodden Earth Bed
      ctx.fillStyle = '#b88d67';
      ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);

      // Central Sun-Baked Walking Lane
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(p.x + 10, p.y + 8, p.w - 20, p.h - 16);

      // Subtle Dual Wagon / Foot-Traffic Ruts
      ctx.fillStyle = '#a07855';
      ctx.fillRect(p.x + 12, p.y + 14, p.w - 24, 6);
      ctx.fillRect(p.x + 12, p.y + p.h - 20, p.w - 24, 6);

      // Embedded 3D Cobblestones & River Stones
      const stoneCount = Math.floor(p.w / 20);
      for (let i = 0; i < stoneCount; i++) {
        const sHash1 = Math.abs(Math.sin((p.x + i * 29.3) * 1.7));
        const sHash2 = Math.abs(Math.cos((p.y + i * 47.9) * 2.3));
        const stX = p.x + 12 + sHash1 * (p.w - 24);
        const stY = p.y + 10 + sHash2 * (p.h - 20);

        const rx = 3.2 + (sHash1 * 2.5);
        const ry = 2.0 + (sHash2 * 1.6);
        const rot = sHash1 * Math.PI;

        ctx.fillStyle = 'rgba(30, 20, 10, 0.35)';
        ctx.beginPath();
        ctx.ellipse(stX + 1.2, stY + 2, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = sHash1 > 0.5 ? '#8c6239' : '#a67c52';
        ctx.beginPath();
        ctx.ellipse(stX, stY, rx, ry, rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e6ccb2';
        ctx.beginPath();
        ctx.ellipse(stX - rx * 0.3, stY - ry * 0.3, rx * 0.4, ry * 0.35, rot, 0, Math.PI * 2);
        ctx.fill();
      }

      // Organic Edge Grass Encroachment
      const grassEdgeCol = route.theme === 'forest' ? '#173d2a' : '#22552b';
      ctx.fillStyle = grassEdgeCol;

      for (let bx = p.x; bx < p.x + p.w; bx += 16) {
        const eHash = Math.abs(Math.sin(bx * 17.3));
        const eW = 10 + eHash * 10;
        const eH = 2 + eHash * 4;
        ctx.beginPath();
        ctx.ellipse(bx + eW / 2, p.y + 1, eW / 2, eH, 0, 0, Math.PI);
        ctx.fill();
      }

      for (let bx = p.x; bx < p.x + p.w; bx += 16) {
        const eHash = Math.abs(Math.sin(bx * 29.7));
        const eW = 10 + eHash * 10;
        const eH = 2 + eHash * 4;
        ctx.beginPath();
        ctx.ellipse(bx + eW / 2, p.y + p.h - 1, eW / 2, eH, 0, Math.PI, 0);
        ctx.fill();
      }

      ctx.restore();
    }

    // ========================================================================
    // 2. PAVED CITY STREETS & PLAZAS (Seamless Continuous Mesh System)
    // ========================================================================
    if (pavedPaths.length === 0) return;

    // Helper: checks if a world coordinate is inside another paved path segment
    const isCoveredByOtherPaved = (currentSegment: RoutePath, qx: number, qy: number) => {
      for (const other of pavedPaths) {
        if (other === currentSegment) continue;
        if (qx >= other.x - 1 && qx <= other.x + other.w + 1 && qy >= other.y - 1 && qy <= other.y + other.h + 1) {
          return true;
        }
      }
      return false;
    };

    // Regional Paver Palette Specifications
    let paverTones = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#fed7aa', '#cbd5e1']; // Default / Viridian ivory
    let subBaseColor = '#64748b';
    let curbColor = '#475569';
    let paverW = 32;
    let paverH = 20;

    if (route.id === 3) {
      // Vermilion Port Brickwork & Harbor Boardwalk
      paverTones = ['#ea580c', '#c2410c', '#9a3412', '#b45309', '#f97316'];
      subBaseColor = '#7c2d12';
      curbColor = '#431407';
      paverW = 26;
      paverH = 16;
    } else if (route.id === 1) {
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
      paverW = 30;
      paverH = 20;
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

    // Step 2A: Unified Ambient Shadow Bed
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    for (const p of pavedPaths) {
      ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 5);
    }
    ctx.restore();

    // Step 2B: Continuous Sub-Base Foundation
    ctx.save();
    ctx.fillStyle = subBaseColor;
    for (const p of pavedPaths) {
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();

    // Step 2C: Global-Grid Aligned Pavers (Seamlessly continuous across all segments!)
    ctx.save();
    for (const p of pavedPaths) {
      const startPy = Math.floor(p.y / paverH) * paverH;
      for (let py = startPy; py < p.y + p.h; py += paverH) {
        const globalRow = Math.round(py / paverH);
        const rowOffset = (Math.abs(globalRow) % 2 === 0) ? 0 : paverW / 2;
        const startPx = Math.floor((p.x - rowOffset) / paverW) * paverW + rowOffset;

        for (let px = startPx; px < p.x + p.w + paverW; px += paverW) {
          // Clip boundaries of pavers to the segment
          const drawX = Math.max(p.x, px);
          const drawY = Math.max(p.y, py);
          const drawW = Math.min(p.x + p.w, px + paverW) - drawX;
          const drawH = Math.min(p.y + p.h, py + paverH) - drawY;

          if (drawW <= 1 || drawH <= 1) continue;

          // Deterministic hash based on world position
          const paverHash = Math.abs(Math.sin(px * 17.3 + py * 41.9));
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
      }
    }
    ctx.restore();

    // Step 2D: Exterior-Only Curbs (ONLY where street meets grass/earth, NEVER across intersections!)
    ctx.save();
    ctx.strokeStyle = curbColor;
    ctx.lineWidth = 3;
    const stepSize = 16;

    for (const p of pavedPaths) {
      // Top Edge: from x to x+w at y
      for (let ex = p.x; ex < p.x + p.w; ex += stepSize) {
        const segW = Math.min(stepSize, p.x + p.w - ex);
        const midX = ex + segW / 2;
        if (!isCoveredByOtherPaved(p, midX, p.y - 3)) {
          ctx.beginPath();
          ctx.moveTo(ex, p.y);
          ctx.lineTo(ex + segW, p.y);
          ctx.stroke();
        }
      }

      // Bottom Edge: from x to x+w at y+h
      for (let ex = p.x; ex < p.x + p.w; ex += stepSize) {
        const segW = Math.min(stepSize, p.x + p.w - ex);
        const midX = ex + segW / 2;
        if (!isCoveredByOtherPaved(p, midX, p.y + p.h + 3)) {
          ctx.beginPath();
          ctx.moveTo(ex, p.y + p.h);
          ctx.lineTo(ex + segW, p.y + p.h);
          ctx.stroke();
        }
      }

      // Left Edge: from y to y+h at x
      for (let ey = p.y; ey < p.y + p.h; ey += stepSize) {
        const segH = Math.min(stepSize, p.y + p.h - ey);
        const midY = ey + segH / 2;
        if (!isCoveredByOtherPaved(p, p.x - 3, midY)) {
          ctx.beginPath();
          ctx.moveTo(p.x, ey);
          ctx.lineTo(p.x, ey + segH);
          ctx.stroke();
        }
      }

      // Right Edge: from y to y+h at x+w
      for (let ey = p.y; ey < p.y + p.h; ey += stepSize) {
        const segH = Math.min(stepSize, p.y + p.h - ey);
        const midY = ey + segH / 2;
        if (!isCoveredByOtherPaved(p, p.x + p.w + 3, midY)) {
          ctx.beginPath();
          ctx.moveTo(p.x + p.w, ey);
          ctx.lineTo(p.x + p.w, ey + segH);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private renderTallGrass(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const px = this.player.x;
    const py = this.player.y;
    const camW = this.canvas ? this.canvas.width : 800;
    const camH = this.canvas ? this.canvas.height : 480;

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
    } else if (b.type === 'museum') {
      // 1. Classical Granite Tiered Plinth (3 steps)
      ctx.fillStyle = '#475569';
      ctx.fillRect(b.x - 4, b.y + b.h - 8, b.w + 8, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 2, b.y + b.h - 6, b.w + 4, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(b.x, b.y + b.h - 4, b.w, 3);

      // 2. Main Facade (Ashlar Limestone Blocks)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(b.x, b.y + 20, b.w, b.h - 26);

      // Classical Horizontal Entablature & Ashlar Lines
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      for (let sy = b.y + 28; sy < b.y + b.h - 8; sy += 10) {
        ctx.beginPath();
        ctx.moveTo(b.x + 4, sy);
        ctx.lineTo(b.x + b.w - 4, sy);
        ctx.stroke();
      }

      // 3. Classical Triangular Pediment Roof with Verdigris Bronze Trim
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(b.x - 6, b.y + 18, b.w + 12, 5);

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + 20);
      ctx.lineTo(b.x + b.w / 2, b.y - 8);
      ctx.lineTo(b.x + b.w + 6, b.y + 20);
      ctx.closePath();
      ctx.fill();

      // Pediment Sunlit Raking Cornice
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + 20);
      ctx.lineTo(b.x + b.w / 2, b.y - 8);
      ctx.lineTo(b.x + b.w + 6, b.y + 20);
      ctx.stroke();

      // Gold Museum Crest in Tympanum
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('M', b.x + b.w / 2, b.y + 11);

      // 4. Four Classical Ionic / Corinthian Columns
      const colCount = 4;
      const colSpacing = (b.w - 28) / (colCount - 1);
      for (let ci = 0; ci < colCount; ci++) {
        const colX = b.x + 14 + ci * colSpacing;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(colX - 4, b.y + 22, 8, b.h - 28);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(colX - 3.5, b.y + 22, 7, b.h - 28);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(colX - 1.5, b.y + 22, 2, b.h - 28);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(colX - 5, b.y + 20, 10, 3);
        ctx.fillRect(colX - 5, b.y + b.h - 8, 10, 3);
      }

      // 5. Arched Amber Fossil Exhibit Windows
      const fossilWins = [b.x + 18, b.x + b.w - 38];
      fossilWins.forEach(fx => {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(fx - 1, b.y + 32, 20, 26);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(fx, b.y + 33, 18, 24);
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(fx + 9, b.y + 45, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(fx + 9, b.y + 45, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Double Mahogany Entrance Doors
      const dW = 26;
      const dH = 30;
      const dX = b.x + b.w / 2 - dW / 2;
      const dY = b.y + b.h - dH;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(dX - 2, dY - 2, dW + 4, dH + 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(dX, dY, dW, dH);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dX + 2, dY + 3, dW / 2 - 3, dH - 6);
      ctx.strokeRect(dX + dW / 2 + 1, dY + 3, dW / 2 - 3, dH - 6);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(dX + dW / 2 - 3, dY + dH / 2, 2, 0, Math.PI * 2);
      ctx.arc(dX + dW / 2 + 3, dY + dH / 2, 2, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'dept_store') {
      // 1. Granite Plinth Base
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(b.x - 4, b.y + b.h - 6, b.w + 8, 8);

      // 2. Multi-Story Art Deco Terraced Body
      ctx.fillStyle = '#047857';
      ctx.fillRect(b.x, b.y + 16, b.w, b.h - 20);

      // Decorative Gold Cornices
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(b.x - 2, b.y + 16, b.w + 4, 4);
      ctx.fillRect(b.x + 4, b.y + 44, b.w - 8, 3);
      ctx.fillRect(b.x + 4, b.y + 70, b.w - 8, 3);

      // Upper Floor Windows
      for (let floor = 0; floor < 2; floor++) {
        const fy = b.y + 24 + floor * 26;
        for (let col = 0; col < 5; col++) {
          const wx = b.x + 12 + col * ((b.w - 24) / 5);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(wx - 1, fy - 1, 14, 16);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(wx, fy, 12, 14);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, fy, 12, 14);
        }
      }

      // 3. Ground Floor Showcase Atrium Windows
      const gwW = (b.w - 44) / 2;
      [b.x + 8, b.x + b.w - 8 - gwW].forEach(gx => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(gx - 1, b.y + b.h - 30, gwW + 2, 26);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(gx, b.y + b.h - 29, gwW, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx + 6, b.y + b.h - 20, 6, 12);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(gx + gwW - 12, b.y + b.h - 18, 7, 10);
      });

      // 4. Rooftop Marquee Sign: "CELADON DEPT STORE"
      const roofAtriumW = b.w - 32;
      const roofAtriumX = b.x + 16;
      ctx.fillStyle = '#065f46';
      ctx.fillRect(roofAtriumX, b.y + 2, roofAtriumW, 14);
      ctx.fillStyle = '#6ee7b7';
      ctx.fillRect(roofAtriumX + 2, b.y + 4, roofAtriumW - 4, 10);

      const neonHue = (this.time * 60) % 360;
      ctx.fillStyle = `hsl(${neonHue}, 90%, 55%)`;
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('★ CELADON DEPT STORE ★', b.x + b.w / 2, b.y + 12);

      // 5. Grand Revolving Glass Entrance Doors
      const entW = 28;
      const entH = 30;
      const entX = b.x + b.w / 2 - entW / 2;
      const entY = b.y + b.h - entH;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(entX - 2, entY - 2, entW + 4, entH + 2);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(entX, entY, entW, entH);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(entX + 4, entY + entH - 4, entW - 8, 6);
      const revAngle = this.time * 2;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(entX + entW / 2, entY + 4);
      ctx.lineTo(entX + entW / 2 + Math.cos(revAngle) * 9, entY + entH - 8);
      ctx.stroke();

    } else if (b.type === 'silph') {
      // 1. Sleek Modern Foundation Plinth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(b.x - 3, b.y + b.h - 6, b.w + 6, 8);

      // 2. Midnight Blue Reflective Glass Tower Body
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x, b.y + 14, b.w, b.h - 18);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(b.x + 4, b.y + 18, b.w - 8, b.h - 26);

      // Reflective Curtain Wall Mullions
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      for (let fx = b.x + 14; fx < b.x + b.w - 10; fx += 16) {
        ctx.beginPath();
        ctx.moveTo(fx, b.y + 18);
        ctx.lineTo(fx, b.y + b.h - 10);
        ctx.stroke();
      }
      for (let fy = b.y + 24; fy < b.y + b.h - 14; fy += 14) {
        ctx.beginPath();
        ctx.moveTo(b.x + 4, fy);
        ctx.lineTo(b.x + b.w - 4, fy);
        ctx.stroke();
      }

      // Animated Glowing Cyan Data Conduit Traces
      const pulseAlpha = 0.5 + Math.sin(this.time * 4) * 0.4;
      ctx.strokeStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 2, b.y + 16, b.w - 4, b.h - 22);

      // 3. Rooftop Antenna & Blinking Beacon
      const antX = b.x + b.w / 2;
      const antY = b.y + 14;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(antX, antY);
      ctx.lineTo(antX, antY - 20);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(antX + 18, antY - 6, 8, 0, Math.PI, true);
      ctx.fill();

      const flash = Math.sin(this.time * 6) > 0.4;
      ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(antX, antY - 21, 3, 0, Math.PI * 2);
      ctx.fill();

      // 4. Glowing "SILPH CO." Corporate Logo Crest
      ctx.fillStyle = '#06b6d4';
      ctx.font = '800 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SILPH CO.', b.x + b.w / 2, b.y + 32);

      // 5. Automated High-Tech Sliding Glass Entrance Doors
      const sDoorW = 28;
      const sDoorH = 26;
      const sDoorX = b.x + b.w / 2 - sDoorW / 2;
      const sDoorY = b.y + b.h - sDoorH;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sDoorX - 2, sDoorY - 2, sDoorW + 4, sDoorH + 2);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(sDoorX, sDoorY, sDoorW, sDoorH);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(sDoorX + sDoorW + 4, sDoorY + sDoorH / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'safari_gate') {
      // 1. Rustic Timber Pier Base
      ctx.fillStyle = '#451a03';
      ctx.fillRect(b.x - 4, b.y + b.h - 6, b.w + 8, 8);

      // 2. Heavy Cedar & Teak Timber Post Frame
      ctx.fillStyle = '#78350f';
      ctx.fillRect(b.x, b.y + 18, b.w, b.h - 22);

      [b.x - 3, b.x + b.w - 7].forEach(lx => {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(lx, b.y + 12, 10, b.h - 16);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(lx + 2, b.y + 12, 3, b.h - 16);
      });

      // 3. Tropical Thatched Straw / Bamboo Canopy
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(b.x - 10, b.y + 20);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 10, b.y + 20);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.5;
      for (let s = 0; s < 4; s++) {
        const sy = b.y + s * 6;
        const sw = (b.w + 16) * (1 - s * 0.22);
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 - sw / 2, sy);
        ctx.lineTo(b.x + b.w / 2 + sw / 2, sy);
        ctx.stroke();
      }

      // Wooden Archway Signboard: "SAFARI ZONE"
      ctx.fillStyle = '#451a03';
      ctx.fillRect(b.x + 16, b.y + 22, b.w - 32, 14);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x + 16, b.y + 22, b.w - 32, 14);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🌿 SAFARI ZONE 🌿', b.x + b.w / 2, b.y + 33);

      // Fluttering Safari Pennant Flags on Roof
      const flagX = b.x + b.w / 2;
      const flagY = b.y - 6;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(flagX, flagY);
      ctx.lineTo(flagX, flagY - 14);
      ctx.stroke();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(flagX, flagY - 14);
      ctx.lineTo(flagX + 12 + Math.sin(this.time * 4) * 2, flagY - 9);
      ctx.lineTo(flagX, flagY - 4);
      ctx.closePath();
      ctx.fill();

      // 4. Massive Double Wooden Safari Gates with Iron Straps
      const gW = 34;
      const gH = 32;
      const gX = b.x + b.w / 2 - gW / 2;
      const gY = b.y + b.h - gH;
      ctx.fillStyle = '#292524';
      ctx.fillRect(gX - 2, gY - 2, gW + 4, gH + 2);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(gX, gY, gW, gH);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(gX, gY + 6, gW, 3);
      ctx.fillRect(gX, gY + gH - 8, gW, 3);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(gX + gW / 2, gY + gH / 2, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'lab') {
      // 1. Reinforced Volcanic Seismic Concrete Plinth
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x - 4, b.y + b.h - 6, b.w + 8, 8);

      // 2. High-Tech White Industrial Composite Walls
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(b.x, b.y + 16, b.w, b.h - 20);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      for (let sy = b.y + 26; sy < b.y + b.h - 8; sy += 12) {
        ctx.beginPath();
        ctx.moveTo(b.x + 3, sy);
        ctx.lineTo(b.x + b.w - 3, sy);
        ctx.stroke();
      }

      // 3. Solar Panel Array on Roof
      const solW = b.w - 18;
      const solX = b.x + 9;
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(solX, b.y + 2, solW, 14);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1;
      for (let sx = solX + 8; sx < solX + solW; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, b.y + 2);
        ctx.lineTo(sx, b.y + 16);
        ctx.stroke();
      }

      // Industrial Exhaust Turbine
      ctx.fillStyle = '#475569';
      ctx.fillRect(b.x + b.w - 20, b.y - 4, 12, 10);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(b.x + b.w - 14, b.y - 4, 6, 0, Math.PI, true);
      ctx.fill();

      // 4. Laboratory Chemical Research Windows
      const labWinW = 20;
      const labWins = [b.x + 12, b.x + b.w - 12 - labWinW];
      labWins.forEach(lx => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(lx - 1, b.y + 30, labWinW + 2, 22);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(lx, b.y + 31, labWinW, 20);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(lx + 6, b.y + 44, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(lx + 14, b.y + 42, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Heavy Steel Pressure-Seal Air-Lock Door
      const labDoorW = 24;
      const labDoorH = 28;
      const labDoorX = b.x + b.w / 2 - labDoorW / 2;
      const labDoorY = b.y + b.h - labDoorH;
      ctx.fillStyle = '#334155';
      ctx.fillRect(labDoorX - 2, labDoorY - 2, labDoorW + 4, labDoorH + 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(labDoorX, labDoorY, labDoorW, labDoorH);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(labDoorX + 2, labDoorY + 4, labDoorW - 4, 3);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(labDoorX + labDoorW / 2, labDoorY + labDoorH / 2 + 1, 5, 0, Math.PI * 2);
      ctx.stroke();

    } else if (b.type === 'fan_club') {
      // 1. Maritime Granite Foundation
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(b.x - 3, b.y + b.h - 6, b.w + 6, 8);

      // 2. Royal Blue Maritime Timber Lap Siding
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(b.x, b.y + 18, b.w, b.h - 22);

      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      for (let sy = b.y + 26; sy < b.y + b.h - 6; sy += 8) {
        ctx.beginPath();
        ctx.moveTo(b.x + 2, sy);
        ctx.lineTo(b.x + b.w - 2, sy);
        ctx.stroke();
      }

      // 3. High-Pitched Crimson Cottage Roof
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(b.x - 6, b.y + 16, b.w + 12, 5);

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y + 18);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 7, b.y + 18);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y + 18);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 7, b.y + 18);
      ctx.stroke();

      // Spinning Pikachu Weathervane on Chimney
      const chimX = b.x + b.w - 18;
      const chimY = b.y - 8;
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(chimX, chimY, 10, 18);
      const vaneAngle = Math.sin(this.time * 2) * 0.4;
      ctx.fillStyle = '#facc15';
      ctx.save();
      ctx.translate(chimX + 5, chimY - 6);
      ctx.rotate(vaneAngle);
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -7, 2, 5);
      ctx.fillRect(1, -7, 2, 5);
      ctx.restore();

      // 4. Brass Circular Porthole Windows
      const portholes = [b.x + 14, b.x + b.w - 26];
      portholes.forEach(px => {
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(px, b.y + 36, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(px, b.y + 36, 6.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Welcoming Dutch Oak Door with Heart Emblem
      const fcDoorW = 20;
      const fcDoorH = 26;
      const fcDoorX = b.x + b.w / 2 - fcDoorW / 2;
      const fcDoorY = b.y + b.h - fcDoorH;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(fcDoorX - 2, fcDoorY - 2, fcDoorW + 4, fcDoorH + 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(fcDoorX, fcDoorY, fcDoorW, fcDoorH);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fcDoorX + fcDoorW / 2, fcDoorY + 8, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'dojo') {
      // 1. Heavy Mountain Granite Plinth (Platform)
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x - 5, b.y + b.h - 8, b.w + 10, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 3, b.y + b.h - 6, b.w + 6, 4);

      // 2. Traditional Japanese Lacquer Timber Facade
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(b.x, b.y + 18, b.w, b.h - 24);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x + 3, b.y + 18, 5, b.h - 24);
      ctx.fillRect(b.x + b.w - 8, b.y + 18, 5, b.h - 24);

      // 3. Sweeping Pagoda Hip Roof with Upturned Corners
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(b.x - 10, b.y + 16, b.w + 20, 5);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(b.x - 12, b.y + 18);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 12, b.y + 18);
      ctx.closePath();
      ctx.fill();

      // Gold Upturned Pagoda Roof Finials
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(b.x - 12, b.y + 14, 3.5, 0, Math.PI * 2);
      ctx.arc(b.x + b.w + 12, b.y + 14, 3.5, 0, Math.PI * 2);
      ctx.arc(b.x + b.w / 2, b.y - 7, 4, 0, Math.PI * 2);
      ctx.fill();

      // 4. Traditional Paper Andon Lanterns
      const lanternPositions = [b.x + 14, b.x + b.w - 22];
      lanternPositions.forEach(lx => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(lx, b.y + 28, 8, 2);
        ctx.fillRect(lx, b.y + 42, 8, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx + 1, b.y + 30, 6, 12);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(lx + 3, b.y + 34, 2, 4);
      });

      // 5. Sliding Shoji Wood Lattice Entrance Doors
      const dojoDoorW = 26;
      const dojoDoorH = 28;
      const dojoDoorX = b.x + b.w / 2 - dojoDoorW / 2;
      const dojoDoorY = b.y + b.h - dojoDoorH;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(dojoDoorX - 2, dojoDoorY - 2, dojoDoorW + 4, dojoDoorH + 2);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(dojoDoorX, dojoDoorY, dojoDoorW, dojoDoorH);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(dojoDoorX + dojoDoorW / 2, dojoDoorY);
      ctx.lineTo(dojoDoorX + dojoDoorW / 2, dojoDoorY + dojoDoorH);
      ctx.moveTo(dojoDoorX, dojoDoorY + 9);
      ctx.lineTo(dojoDoorX + dojoDoorW, dojoDoorY + 9);
      ctx.moveTo(dojoDoorX, dojoDoorY + 18);
      ctx.lineTo(dojoDoorX + dojoDoorW, dojoDoorY + 18);
      ctx.stroke();

      // Stone Guardian Lions
      [-9, dojoDoorW + 3].forEach(offX => {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(dojoDoorX + offX, dojoDoorY + dojoDoorH - 12, 6, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(dojoDoorX + offX + 3, dojoDoorY + dojoDoorH - 12, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // High-Contrast Glassmorphic Building Label Badge
    const labelX = b.x + b.w / 2;
    const labelY = b.y - 18;
    const isGym = b.type === 'gym';
    const isMart = b.type === 'mart';
    const isCenter = b.type === 'center';
    const isHouse = b.type === 'house';
    const isMuseum = b.type === 'museum';
    const isDeptStore = b.type === 'dept_store';
    const isSilph = b.type === 'silph';
    const isSafariGate = b.type === 'safari_gate';
    const isLab = b.type === 'lab';
    const isFanClub = b.type === 'fan_club';
    const isDojo = b.type === 'dojo';

    const tagBg = isGym
      ? 'rgba(113, 63, 18, 0.94)'
      : isMart
        ? 'rgba(30, 58, 138, 0.94)'
        : isCenter
          ? 'rgba(153, 27, 27, 0.94)'
          : isMuseum
            ? 'rgba(51, 65, 85, 0.94)'
            : isDeptStore
              ? 'rgba(19, 78, 74, 0.94)'
              : isSilph
                ? 'rgba(15, 23, 42, 0.96)'
                : isSafariGate
                  ? 'rgba(120, 53, 15, 0.94)'
                  : isLab
                    ? 'rgba(30, 64, 175, 0.94)'
                    : isFanClub
                      ? 'rgba(29, 78, 216, 0.94)'
                      : isDojo
                        ? 'rgba(153, 27, 27, 0.94)'
                        : isHouse
                          ? 'rgba(22, 101, 52, 0.94)'
                          : 'rgba(15, 23, 42, 0.9)';

    const tagBorder = isGym
      ? '#facc15'
      : isMart
        ? '#60a5fa'
        : isCenter
          ? '#fca5a5'
          : isMuseum
            ? '#cbd5e1'
            : isDeptStore
              ? '#34d399'
              : isSilph
                ? '#38bdf8'
                : isSafariGate
                  ? '#fbbf24'
                  : isLab
                    ? '#93c5fd'
                    : isFanClub
                      ? '#fde047'
                      : isDojo
                        ? '#f87171'
                        : isHouse
                          ? '#86efac'
                          : '#94a3b8';

    const tagIcon = isGym
      ? '🏆'
      : isMart
        ? '🛒'
        : isCenter
          ? '🏥'
          : isMuseum
            ? '🏛️'
            : isDeptStore
              ? '🏬'
              : isSilph
                ? '🏢'
                : isSafariGate
                  ? '🦁'
                  : isLab
                    ? '🔬'
                    : isFanClub
                      ? '⚡'
                      : isDojo
                        ? '🥋'
                        : isHouse
                          ? '🏡'
                          : '🚪';

    ctx.font = '800 11px system-ui';
    const textWidth = ctx.measureText(`${tagIcon} ${b.label}`).width;
    const pillW = textWidth + 18;

    ctx.fillStyle = tagBg;
    ctx.strokeStyle = tagBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(labelX - pillW / 2, labelY - 12, pillW, 21, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${tagIcon} ${b.label}`, labelX, labelY + 2.5);

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
    ctx.save();

    // 1. Contact Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(npc.x, npc.y + 13, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-Quality Pixel-Art Styled NPC Character Sprite
    this.drawNPCCharacter(ctx, npc);

    // 3. Proximity Interactive Indicator (💬 Speech bubble)
    const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
    if (dist < 55) {
      const bob = Math.sin(this.time * 5) * 3;
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💬', npc.x, npc.y - 25 + bob);
    }

    // 4. Sleek Name Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(npc.x - 34, npc.y - 22, 68, 16, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, npc.x, npc.y - 10);

    ctx.restore();
  }

  private drawNPCCharacter(ctx: CanvasRenderingContext2D, npc: RouteNPC): void {
    const nx = npc.x;
    const ny = npc.y;
    const key = (npc.id + ' ' + npc.name + ' ' + (npc.avatar || '')).toLowerCase();

    if (key.includes('angler') || key.includes('ned')) {
      // ANGLER NED: Yellow bucket hat, blue overalls, holding fishing rod with line
      // Legs
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(nx - 5, ny + 3, 4, 8);
      ctx.fillRect(nx + 1, ny + 3, 4, 8);
      // Boots
      ctx.fillStyle = '#78350f';
      ctx.fillRect(nx - 6, ny + 10, 5, 3);
      ctx.fillRect(nx + 1, ny + 10, 5, 3);
      // Overalls & Shirt
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(nx - 6, ny - 6, 12, 10);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(nx - 3, ny - 6, 6, 4);
      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(nx - 4, ny - 14, 8, 8);
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 2, ny - 11, 2, 2);
      ctx.fillRect(nx + 1, ny - 11, 2, 2);
      // Yellow Bucket Hat
      ctx.fillStyle = '#facc15';
      ctx.fillRect(nx - 7, ny - 16, 14, 4);
      ctx.fillRect(nx - 5, ny - 20, 10, 5);
      // Fishing Rod
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(nx + 4, ny - 2);
      ctx.lineTo(nx + 16, ny - 16);
      ctx.stroke();
      // Fishing Line drooping down
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(nx + 16, ny - 16);
      ctx.quadraticCurveTo(nx + 20, ny - 4, nx + 22, ny + 16);
      ctx.stroke();
      // Red Bobber
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(nx + 22, ny + 16, 2.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (key.includes('ranger') || key.includes('vance')) {
      // RANGER VANCE: Green safari uniform, khaki hat, binoculars
      // Pants
      ctx.fillStyle = '#713f12';
      ctx.fillRect(nx - 5, ny + 3, 4, 8);
      ctx.fillRect(nx + 1, ny + 3, 4, 8);
      // Boots
      ctx.fillStyle = '#451a03';
      ctx.fillRect(nx - 6, ny + 10, 5, 3);
      ctx.fillRect(nx + 1, ny + 10, 5, 3);
      // Ranger Park Uniform
      ctx.fillStyle = '#15803d';
      ctx.fillRect(nx - 6, ny - 6, 12, 10);
      // Gold Badge
      ctx.fillStyle = '#facc15';
      ctx.fillRect(nx - 4, ny - 3, 3, 3);
      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(nx - 4, ny - 14, 8, 8);
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 2, ny - 11, 2, 2);
      ctx.fillRect(nx + 1, ny - 11, 2, 2);
      // Safari Hat
      ctx.fillStyle = '#a16207';
      ctx.fillRect(nx - 8, ny - 16, 16, 3.5);
      ctx.fillRect(nx - 5, ny - 20, 10, 5);
      // Binoculars around neck
      ctx.fillStyle = '#334155';
      ctx.fillRect(nx - 3, ny - 2, 6, 3.5);

    } else if (key.includes('botanist') || key.includes('clara') || key.includes('girl') || key.includes('beauty')) {
      // BOTANIST CLARA: Pink dress/apron, green skirt, sunhat with flower ribbon
      // Skirt
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(nx - 6, ny + 2, 12, 8);
      // Shoes
      ctx.fillStyle = '#db2777';
      ctx.fillRect(nx - 5, ny + 10, 4, 3);
      ctx.fillRect(nx + 1, ny + 10, 4, 3);
      // Apron Top
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(nx - 5, ny - 6, 10, 9);
      // Hair
      ctx.fillStyle = '#78350f';
      ctx.fillRect(nx - 6, ny - 15, 12, 10);
      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(nx - 4, ny - 14, 8, 8);
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 2, ny - 11, 2, 2);
      ctx.fillRect(nx + 1, ny - 11, 2, 2);
      // Straw Sunhat
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(nx - 8, ny - 16, 16, 3.5);
      ctx.fillRect(nx - 5, ny - 20, 10, 5);
      // Pink Flower Ribbon on hat
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(nx - 5, ny - 16, 10, 2);
      ctx.beginPath();
      ctx.arc(nx + 3, ny - 15, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (key.includes('officer') || key.includes('jenny')) {
      // OFFICER JENNY: Cyan police uniform, peaked cap with gold badge
      // Pants
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(nx - 5, ny + 3, 4, 8);
      ctx.fillRect(nx + 1, ny + 3, 4, 8);
      // Boots
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 6, ny + 10, 5, 3);
      ctx.fillRect(nx + 1, ny + 10, 5, 3);
      // Police Jacket
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(nx - 6, ny - 6, 12, 10);
      // White Tie & Gold Buttons
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(nx - 1, ny - 6, 2, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(nx - 1, ny + 1, 2, 2);
      // Hair
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(nx - 6, ny - 15, 12, 9);
      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(nx - 4, ny - 14, 8, 8);
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 2, ny - 11, 2, 2);
      ctx.fillRect(nx + 1, ny - 11, 2, 2);
      // Peaked Police Cap
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(nx - 7, ny - 18, 14, 5);
      // Cap Brim
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 6, ny - 14, 12, 2);
      // Gold Star Badge on Cap
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(nx, ny - 16, 2, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // DEFAULT GUIDE / TRAINER RED:
      // Jeans
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(nx - 5, ny + 3, 4, 8);
      ctx.fillRect(nx + 1, ny + 3, 4, 8);
      // Red Shoes
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(nx - 6, ny + 10, 5, 3);
      ctx.fillRect(nx + 1, ny + 10, 5, 3);
      // Red Trainer Vest
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(nx - 6, ny - 6, 12, 10);
      // White undershirt
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(nx - 2, ny - 6, 4, 5);
      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(nx - 4, ny - 14, 8, 8);
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(nx - 2, ny - 11, 2, 2);
      ctx.fillRect(nx + 1, ny - 11, 2, 2);
      // Red Baseball Cap
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(nx - 6, ny - 18, 12, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(nx - 5, ny - 14, 10, 2);
    }
  }

  private renderSignposts(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.signposts || route.signposts.length === 0) return;

    for (const sp of route.signposts) {
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
      if (dist < 50) {
        const bob = Math.sin(this.time * 5) * 3;
        ctx.font = '13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('📋', sp.x, sp.y - 24 + bob);
      }

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
    const px = this.player.x;
    const py = this.player.y;
    const dir = this.player.dir;
    const anim = this.player.animFrame;
    const bob = anim === 1 ? -2 : anim === 3 ? 2 : 0;
    const legSwing = anim === 1 ? -3.5 : anim === 3 ? 3.5 : 0;

    ctx.save();

    // 1. Realistic Elliptical Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(px, py + 13, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Denim Jeans (Indigo with crease shading)
    ctx.fillStyle = '#1e3a8a';
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(px - 6, py + 3 + bob + (dir === 'down' ? legSwing : -legSwing), 5, 9);
      ctx.fillRect(px + 1, py + 3 + bob + (dir === 'down' ? -legSwing : legSwing), 5, 9);
      // Knee highlight
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(px - 5, py + 6 + bob + (dir === 'down' ? legSwing : -legSwing), 3, 2);
      ctx.fillRect(px + 2, py + 6 + bob + (dir === 'down' ? -legSwing : legSwing), 3, 2);
    } else {
      ctx.fillRect(px - 5 + legSwing, py + 3 + bob, 10, 9);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(px - 3 + legSwing, py + 6 + bob, 6, 2);
    }

    // 3. Running Sneakers (Red with White Rubber Midsoles)
    ctx.fillStyle = '#dc2626';
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(px - 7, py + 10 + bob, 6, 4);
      ctx.fillRect(px + 1, py + 10 + bob, 6, 4);
      ctx.fillStyle = '#ffffff'; // White soles
      ctx.fillRect(px - 7, py + 13 + bob, 6, 2);
      ctx.fillRect(px + 1, py + 13 + bob, 6, 2);
    } else {
      const shoeDir = dir === 'right' ? 1 : -1;
      ctx.fillRect(px - 6 + legSwing, py + 10 + bob, 11, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 6 + legSwing + (shoeDir > 0 ? 2 : 0), py + 13 + bob, 9, 2);
    }

    // 4. Green Explorer Backpack (Behind player when facing up or side)
    if (dir === 'up' || dir === 'left' || dir === 'right') {
      ctx.fillStyle = '#15803d';
      const bpX = dir === 'up' ? px - 6 : dir === 'left' ? px + 2 : px - 8;
      ctx.fillRect(bpX, py - 6 + bob, 6, 11);
      ctx.fillStyle = '#166534';
      ctx.fillRect(bpX + 1, py - 3 + bob, 4, 6);
      // Backpack buckle
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bpX + 2, py - 1 + bob, 2, 2);
    }

    // 5. Red Trainer Vest / Jacket
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 7, py - 7 + bob, 14, 12);

    // White Undershirt with Collar & Zipper
    ctx.fillStyle = '#ffffff';
    if (dir === 'down') {
      ctx.fillRect(px - 3, py - 7 + bob, 6, 5);
      // Vest center zipper
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(px - 1, py - 3 + bob, 2, 8);
    } else if (dir === 'left' || dir === 'right') {
      const colX = dir === 'left' ? px - 4 : px + 1;
      ctx.fillRect(colX, py - 7 + bob, 3, 4);
    }

    // Arm Swings with Skin Hands
    ctx.fillStyle = '#dc2626';
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(px - 9, py - 6 + bob - legSwing, 3, 7);
      ctx.fillRect(px + 6, py - 6 + bob + legSwing, 3, 7);
      // Skin hands
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(px - 9, py + 1 + bob - legSwing, 3, 3);
      ctx.fillRect(px + 6, py + 1 + bob + legSwing, 3, 3);
    }

    // 6. Head / Face & Anime Eyes
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(px - 5, py - 17 + bob, 10, 10);

    // Spiky Hair bangs peeking out
    ctx.fillStyle = '#292524';
    ctx.fillRect(px - 6, py - 18 + bob, 12, 3);
    if (dir === 'down') {
      ctx.fillRect(px - 5, py - 15 + bob, 2, 3);
      ctx.fillRect(px + 3, py - 15 + bob, 2, 3);

      // Expressive Anime Eyes with Catchlights
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 3, py - 13 + bob, 2, 3);
      ctx.fillRect(px + 1, py - 13 + bob, 2, 3);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 3, py - 13 + bob, 1, 1);
      ctx.fillRect(px + 1, py - 13 + bob, 1, 1);
    } else if (dir === 'left') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 4, py - 13 + bob, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 4, py - 13 + bob, 1, 1);
    } else if (dir === 'right') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 2, py - 13 + bob, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 3, py - 13 + bob, 1, 1);
    }

    // 7. Iconic Red Trainer Baseball Cap
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 6, py - 21 + bob, 12, 6);

    // White Half-Circle Emblem on Cap
    ctx.fillStyle = '#ffffff';
    if (dir === 'down' || dir === 'left' || dir === 'right') {
      ctx.fillRect(px - 2, py - 20 + bob, 4, 3);
    }

    // Curved Visor / Brim
    ctx.fillStyle = '#ffffff';
    const visorOffset = dir === 'left' ? -9 : dir === 'right' ? 3 : -5;
    const visorW = dir === 'down' ? 10 : 7;
    ctx.fillRect(px + visorOffset, py - 16 + bob, visorW, 2.5);

    // Dark Under-Visor Shadow over Eyes
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px + visorOffset, py - 14 + bob, visorW, 1.2);

    // 8. Tall Grass Immersion: Overlapping grass blades covering legs when wading in grass
    if (this.player.inGrass) {
      const gSway = Math.sin(this.time * 3 + px * 0.1) * 2.5;
      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.moveTo(px - 9, py + 14);
      ctx.lineTo(px - 7 + gSway, py + 3);
      ctx.lineTo(px - 4, py + 14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#52b788';
      ctx.beginPath();
      ctx.moveTo(px - 3, py + 14);
      ctx.lineTo(px + gSway, py + 1);
      ctx.lineTo(px + 3, py + 14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 14);
      ctx.lineTo(px + 7 + gSway, py + 4);
      ctx.lineTo(px + 9, py + 14);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
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

  public getRouteTrees(route: RouteDefinition): RouteTree[] {
    if (route.trees && route.trees.length > 0) {
      return route.trees;
    }
    const trees: RouteTree[] = [];
    // Top boundary dense tree line
    for (let x = 30; x < route.worldWidth - 20; x += 44) {
      const tHash = Math.abs(Math.sin(x * 31.7 + route.id));
      const ty = 60 + ((tHash - 0.5) * 16);
      trees.push({
        x,
        y: ty,
        scale: 0.95 + tHash * 0.15,
        type: route.theme === 'forest' ? 'pine' : 'oak',
      });
    }
    // Bottom boundary dense tree line
    for (let x = 30; x < route.worldWidth - 20; x += 44) {
      const tHash = Math.abs(Math.cos(x * 29.3 + route.id));
      const ty = route.worldHeight - 50 + ((tHash - 0.5) * 16);
      trees.push({
        x,
        y: ty,
        scale: 0.95 + tHash * 0.15,
        type: route.theme === 'forest' ? 'pine' : 'oak',
      });
    }
    // Scattered meadow shade trees
    for (let x = 180; x < route.worldWidth - 400; x += 280) {
      const tHash = Math.abs(Math.sin(x * 47.1));
      const ty = 170 + tHash * 40;
      if (!this.isPointOnRoad(x, ty, route)) {
        trees.push({
          x,
          y: ty,
          scale: 1.1 + tHash * 0.2,
          type: route.theme === 'forest' ? 'pine' : 'oak',
        });
      }
      const ty2 = route.worldHeight - 240 - tHash * 40;
      if (!this.isPointOnRoad(x + 100, ty2, route)) {
        trees.push({
          x: x + 100,
          y: ty2,
          scale: 1.05 + tHash * 0.2,
          type: route.theme === 'forest' ? 'pine' : 'oak',
        });
      }
    }
    return trees;
  }

  public isBlocked(x: number, y: number, route: RouteDefinition): boolean {
    // 1. World Boundaries
    if (x < 24 || x > route.worldWidth - 24 || y < 65 || y > route.worldHeight - 35) {
      return true;
    }

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
    const fences = this.getRouteFences(route);
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
    const stones = this.getRouteStones(route);
    for (const s of stones) {
      const dist = Math.hypot(x - s.x, footY - s.y);
      if (dist < s.radius + 8) {
        return true;
      }
    }

    // 5. Tree Trunks
    const trees = this.getRouteTrees(route);
    for (const t of trees) {
      const trunkX = t.x;
      const trunkY = t.y + 12;
      const trunkR = (10 * (t.scale || 1.0)) + 6;
      const dist = Math.hypot(x - trunkX, footY - trunkY);
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

  private renderFountains(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.fountains || route.fountains.length === 0) return;

    for (const f of route.fountains) {
      ctx.save();
      const x = f.x;
      const y = f.y;
      const r = f.radius;

      // 1. Soft Contact Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.4, r + 6, r * 0.6 + 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (f.style === 'monument') {
        // ====================================================================
        // PEWTER METEORITE OBELISK / MT. MOON STONE MONUMENT
        // ====================================================================
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r - 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x - 14, y - 14, 28, 28);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 10, y - 10, 20, 20);

        const floatY = y - 6 + Math.sin(this.time * 2.5) * 4;
        const glow = ctx.createRadialGradient(x, floatY, 2, x, floatY, 26);
        glow.addColorStop(0, 'rgba(192, 132, 252, 0.6)');
        glow.addColorStop(0.5, 'rgba(147, 197, 253, 0.3)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, floatY, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(x, floatY - 14);
        ctx.lineTo(x + 10, floatY);
        ctx.lineTo(x, floatY + 14);
        ctx.lineTo(x - 10, floatY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f3e8ff';
        ctx.beginPath();
        ctx.moveTo(x, floatY - 14);
        ctx.lineTo(x, floatY + 14);
        ctx.lineTo(x - 10, floatY);
        ctx.closePath();
        ctx.fill();

        for (let si = 0; si < 3; si++) {
          const sAngle = this.time * 1.5 + si * 2.1;
          const sDist = 14 + Math.sin(this.time * 3 + si) * 4;
          const sx = x + Math.cos(sAngle) * sDist;
          const sy = floatY + Math.sin(sAngle) * sDist;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (f.style === 'anchor') {
        // ====================================================================
        // VERMILION PORT GRAND ADMIRALTY ANCHOR
        // ====================================================================
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(254, 243, 199, 0.25)';
        ctx.lineWidth = 1;
        for (let py = y - r + 6; py < y + r - 6; py += 8) {
          ctx.beginPath();
          ctx.moveTo(x - r + 8, py);
          ctx.lineTo(x + r - 8, py);
          ctx.stroke();
        }

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x - 3.5, y - r + 8, 7, r * 1.4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - r * 0.55, y - r + 16, r * 1.1, 6);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - r * 0.55, y - r + 15, 3, 8);
        ctx.fillRect(x + r * 0.55 - 3, y - r + 15, 3, 8);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(x, y + r * 0.2, r * 0.5, 0.2, Math.PI - 0.2, false);
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.5 - 2, y + r * 0.2);
        ctx.lineTo(x - r * 0.5 + 8, y + r * 0.1);
        ctx.lineTo(x - r * 0.5 + 4, y + r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + r * 0.5 + 2, y + r * 0.2);
        ctx.lineTo(x + r * 0.5 - 8, y + r * 0.1);
        ctx.lineTo(x + r * 0.5 - 4, y + r * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - r + 8, 6, 0, Math.PI * 2);
        ctx.stroke();

      } else if (f.style === 'clock') {
        // ====================================================================
        // VIRIDIAN FLORAL SUN CLOCK
        // ====================================================================
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(x, y, r - 4, 0, Math.PI * 2);
        ctx.fill();

        const flCount = 12;
        const flColors = ['#ef4444', '#facc15', '#f472b6', '#38bdf8', '#fb923c'];
        for (let i = 0; i < flCount; i++) {
          const angle = (i / flCount) * Math.PI * 2;
          const fx = x + Math.cos(angle) * (r - 9);
          const fy = y + Math.sin(angle) * (r - 9);
          ctx.fillStyle = flColors[i % flColors.length];
          ctx.beginPath();
          ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let h = 0; h < 12; h++) {
          const hAngle = (h / 12) * Math.PI * 2;
          const hx1 = x + Math.cos(hAngle) * (r * 0.44);
          const hy1 = y + Math.sin(hAngle) * (r * 0.44);
          const hx2 = x + Math.cos(hAngle) * (r * 0.36);
          const hy2 = y + Math.sin(hAngle) * (r * 0.36);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = (h % 3 === 0) ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(hx1, hy1);
          ctx.lineTo(hx2, hy2);
          ctx.stroke();
        }

        const minuteAngle = this.time * 0.5;
        const hourAngle = this.time * 0.04;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(minuteAngle) * (r * 0.36), y + Math.sin(minuteAngle) * (r * 0.36));
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(hourAngle) * (r * 0.24), y + Math.sin(hourAngle) * (r * 0.24));
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (f.style === 'fumarole') {
        // ====================================================================
        // CINNABAR VOLCANIC GEOTHERMAL FUMAROLE
        // ====================================================================
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 4;
        ctx.stroke();

        const lavaGrad = ctx.createRadialGradient(x, y, 2, x, y, r - 6);
        lavaGrad.addColorStop(0, '#fef08a');
        lavaGrad.addColorStop(0.3, '#f97316');
        lavaGrad.addColorStop(0.8, '#dc2626');
        lavaGrad.addColorStop(1, '#450a0a');
        ctx.fillStyle = lavaGrad;
        ctx.beginPath();
        ctx.arc(x, y, r - 6, 0, Math.PI * 2);
        ctx.fill();

        const heatAlpha = 0.3 + Math.sin(this.time * 3) * 0.2;
        ctx.fillStyle = `rgba(249, 115, 22, ${heatAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.fill();

        for (let pi = 0; pi < 5; pi++) {
          const pPhase = (this.time * 2.2 + pi * 0.6) % 2.0;
          const pProg = pPhase / 2.0;
          const px = x + Math.sin(this.time * 3 + pi) * (r * 0.4);
          const py = y - pProg * 35;
          const pAlpha = (1 - pProg) * 0.6;
          ctx.fillStyle = pi % 2 === 0 ? `rgba(254, 215, 170, ${pAlpha})` : `rgba(239, 68, 68, ${pAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 + pProg * 4, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (f.style === 'zen') {
        // ====================================================================
        // FUCHSIA ZEN ROCK GARDEN & TSUKUBAI BASIN
        // ====================================================================
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.2;
        for (let ring = 8; ring < r - 4; ring += 7) {
          ctx.beginPath();
          ctx.arc(x, y, ring, 0, Math.PI * 2);
          ctx.stroke();
        }

        const riverStones = [
          { ox: -r * 0.45, oy: r * 0.2, sr: 6 },
          { ox: r * 0.4, oy: -r * 0.3, sr: 5 },
          { ox: r * 0.3, oy: r * 0.4, sr: 7 },
        ];
        riverStones.forEach(st => {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(x + st.ox, y + st.oy, st.sr, st.sr * 0.7, 0.4, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#65a30d';
        ctx.fillRect(x - r * 0.45, y - 5, r * 0.45, 5);
        const dropProg = (this.time * 2) % 1.0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(x, y - 2 + dropProg * 4, 1.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (f.style === 'tech') {
        // ====================================================================
        // SAFFRON SILPH QUANTUM HOLOGRAPHIC MATRIX
        // ====================================================================
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        for (let ring = 6; ring < r - 4; ring += 8) {
          ctx.beginPath();
          ctx.arc(x, y, ring, 0, Math.PI * 2);
          ctx.stroke();
        }

        const holoAlpha = 0.4 + Math.sin(this.time * 5) * 0.3;
        const holoGrad = ctx.createRadialGradient(x, y, 2, x, y, r - 4);
        holoGrad.addColorStop(0, `rgba(56, 189, 248, ${holoAlpha})`);
        holoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = holoGrad;
        ctx.beginPath();
        ctx.arc(x, y, r - 4, 0, Math.PI * 2);
        ctx.fill();

        const rot1 = this.time * 2.2;
        const rot2 = -this.time * 1.8;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y - 6, r * 0.42, r * 0.18, rot1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(x, y - 6, r * 0.38, r * 0.15, rot2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y - 6, 4.5, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // ====================================================================
        // CLASSIC ARCHITECTURAL WATER FOUNTAIN (STONE / MARBLE / BRICK)
        // ====================================================================
        const basinBorder = f.style === 'marble' ? '#f8fafc' : f.style === 'brick' ? '#ea580c' : '#64748b';
        const innerBorder = f.style === 'marble' ? '#cbd5e1' : f.style === 'brick' ? '#7c2d12' : '#334155';

        ctx.fillStyle = basinBorder;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = f.style === 'marble' ? '#fef08a' : '#cbd5e1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = innerBorder;
        ctx.beginPath();
        ctx.arc(x, y, r - 5, 0, Math.PI * 2);
        ctx.fill();

        const waterGrad = ctx.createRadialGradient(x, y, 2, x, y, r - 6);
        waterGrad.addColorStop(0, '#38bdf8');
        waterGrad.addColorStop(0.6, '#0284c7');
        waterGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.arc(x, y, r - 6, 0, Math.PI * 2);
        ctx.fill();

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

        const pedR = r * 0.36;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(x, y, pedR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x, y - 2, pedR * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, y - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        const jetH = 14 + Math.sin(this.time * 4) * 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y - 3 - jetH);
        ctx.stroke();

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
      }

      ctx.restore();
    }
  }

  private renderStreetlamps(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.streetlamps || route.streetlamps.length === 0) return;

    for (const lamp of route.streetlamps) {
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

  private renderBenches(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (!route.benches || route.benches.length === 0) return;

    for (const b of route.benches) {
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

  private renderFences(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const fences = this.getRouteFences(route);
    if (fences.length === 0) return;

    ctx.save();

    for (const f of fences) {
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

  private renderTreesLayer(ctx: CanvasRenderingContext2D, route: RouteDefinition, layer: 'behind' | 'front'): void {
    const trees = this.getRouteTrees(route);
    const playerFootY = this.player.y + 8;

    for (const t of trees) {
      const trunkY = t.y + 12;
      const isBehind = trunkY <= playerFootY;
      if ((layer === 'behind' && isBehind) || (layer === 'front' && !isBehind)) {
        this.drawTree(ctx, t.x, t.y, t.scale || 1.0, t.type || (route.theme === 'forest' ? 'pine' : 'oak'));
      }
    }
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

      // 1. Drop shadow onto lower ground
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(ledge.x, ledge.y + ledge.h, ledge.w, 8);

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
    const cW = this.canvas.width;
    const badgeW = Math.min(cW - 32, isRare ? 420 : 330);
    const badgeH = 46;
    const bx = (cW - badgeW) / 2;
    const by = Math.min(125, Math.max(72, this.canvas.height * 0.16));

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

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0, type: 'oak' | 'pine' | 'blossom' | 'mystic' = 'oak'): void {
    ctx.save();

    // Natural variation per tree so they aren't all identical clones
    const treeHash = Math.abs(Math.sin(x * 47.9 + y * 73.1));
    const hOff = (treeHash - 0.5) * 6;
    const rScale = scale * (0.92 + treeHash * 0.16);

    // 1. Soft Elliptical Ground Drop Shadow (Skewed south-east)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x + 4 * rScale, y + 18 * rScale + hOff, 24 * rScale, 10 * rScale, 0.12, 0, Math.PI * 2);
    ctx.fill();

    // 2. Realistic Gnarled Trunk with Root Flare & Bark Texture
    ctx.fillStyle = '#271206';
    ctx.beginPath();
    ctx.moveTo(x - 9 * rScale, y + 18 * rScale + hOff);
    ctx.lineTo(x + 9 * rScale, y + 18 * rScale + hOff);
    ctx.lineTo(x + 5 * rScale, y + 8 * rScale + hOff);
    ctx.lineTo(x - 5 * rScale, y + 8 * rScale + hOff);
    ctx.closePath();
    ctx.fill();

    // Trunk Body
    const trunkGrad = ctx.createLinearGradient(x - 6 * rScale, y + 4, x + 6 * rScale, y + 4);
    trunkGrad.addColorStop(0, '#78350f');
    trunkGrad.addColorStop(0.35, '#58240c');
    trunkGrad.addColorStop(0.85, '#3a1805');
    trunkGrad.addColorStop(1, '#271206');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(x - 5.5 * rScale, y + 3 * rScale + hOff, 11 * rScale, 15 * rScale);

    // Bark Grain Grooves
    ctx.strokeStyle = '#1c0a02';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1 * rScale, y + 5 * rScale + hOff);
    ctx.lineTo(x - 1 * rScale, y + 17 * rScale + hOff);
    ctx.moveTo(x + 2.5 * rScale, y + 6 * rScale + hOff);
    ctx.lineTo(x + 2.5 * rScale, y + 16 * rScale + hOff);
    ctx.stroke();

    // Lower Shaded Moss Accent
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(x - 3 * rScale, y + 14 * rScale + hOff, 2.5 * rScale, 4 * rScale, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Canopy Rendering
    if (type === 'pine') {
      this.drawPineTier(ctx, x, y + 2 + hOff, 26 * rScale, 18 * rScale);
      this.drawPineTier(ctx, x, y - 10 + hOff, 20 * rScale, 16 * rScale);
      this.drawPineTier(ctx, x, y - 22 + hOff, 14 * rScale, 16 * rScale);
    } else if (type === 'blossom') {
      const canopyWind = Math.sin(this.time * 2.2 + x * 0.05) * 1.5;

      // Base Ambient Shadow Under-canopy (Radiant Cherry Blossom)
      const baseGrad = ctx.createRadialGradient(x - 4, y - 6 + hOff, 4, x, y + hOff, 26 * rScale);
      baseGrad.addColorStop(0, '#db2777');
      baseGrad.addColorStop(0.65, '#9d174d');
      baseGrad.addColorStop(1, '#500724');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(x, y + hOff, 24 * rScale, 0, Math.PI * 2);
      ctx.fill();

      // Foliage Lobes (Pink Sakura)
      this.drawFoliageLobe(ctx, x - 12 * rScale, y + 2 + hOff, 14 * rScale, '#f472b6', '#db2777', '#831843');
      this.drawFoliageLobe(ctx, x + 11 * rScale, y + 3 + hOff, 13 * rScale, '#ec4899', '#be185d', '#831843');
      this.drawFoliageLobe(ctx, x - 10 * rScale + canopyWind * 0.5, y - 8 + hOff, 16 * rScale, '#f9a8d4', '#f472b6', '#db2777');
      this.drawFoliageLobe(ctx, x + 9 * rScale, y - 7 + hOff, 15 * rScale, '#f472b6', '#ec4899', '#be185d');
      this.drawFoliageLobe(ctx, x + canopyWind * 0.8, y - 16 + hOff, 17 * rScale, '#fbcfe8', '#f472b6', '#db2777');

      // Floating Pink Sakura Petals
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 5 * rScale + canopyWind, y - 20 + hOff, 2.5 * rScale, 0, Math.PI * 2);
      ctx.arc(x + 2 * rScale + canopyWind, y - 18 + hOff, 2.0 * rScale, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'mystic') {
      const canopyWind = Math.sin(this.time * 2.2 + x * 0.05) * 1.5;

      // Base Deep Ambient Shadow Under-canopy (Ancient Enchanted Oak)
      const baseGrad = ctx.createRadialGradient(x - 4, y - 6 + hOff, 4, x, y + hOff, 26 * rScale);
      baseGrad.addColorStop(0, '#047857');
      baseGrad.addColorStop(0.65, '#064e3b');
      baseGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(x, y + hOff, 24 * rScale, 0, Math.PI * 2);
      ctx.fill();

      // Enchanted Emerald Lobes
      this.drawFoliageLobe(ctx, x - 12 * rScale, y + 2 + hOff, 14 * rScale, '#059669', '#047857', '#064e3b');
      this.drawFoliageLobe(ctx, x + 11 * rScale, y + 3 + hOff, 13 * rScale, '#047857', '#064e3b', '#022c22');
      this.drawFoliageLobe(ctx, x - 10 * rScale + canopyWind * 0.5, y - 8 + hOff, 16 * rScale, '#10b981', '#059669', '#047857');
      this.drawFoliageLobe(ctx, x + 9 * rScale, y - 7 + hOff, 15 * rScale, '#059669', '#047857', '#064e3b');
      this.drawFoliageLobe(ctx, x + canopyWind * 0.8, y - 16 + hOff, 17 * rScale, '#34d399', '#10b981', '#059669');

      // Fairy Dust Catchlights
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.arc(x - 4 * rScale + canopyWind, y - 20 + hOff, 2.5 * rScale, 0, Math.PI * 2);
      ctx.arc(x + 3 * rScale + canopyWind, y - 19 + hOff, 2.2 * rScale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const canopyWind = Math.sin(this.time * 2.2 + x * 0.05) * 1.5;

      // Base Deep Ambient Shadow Under-canopy
      const baseGrad = ctx.createRadialGradient(x - 4, y - 6 + hOff, 4, x, y + hOff, 26 * rScale);
      baseGrad.addColorStop(0, '#15803d');
      baseGrad.addColorStop(0.65, '#14532d');
      baseGrad.addColorStop(1, '#052e16');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(x, y + hOff, 24 * rScale, 0, Math.PI * 2);
      ctx.fill();

      // Lower Left Bough
      this.drawFoliageLobe(ctx, x - 12 * rScale, y + 2 + hOff, 14 * rScale, '#16a34a', '#14532d', '#052e16');
      // Lower Right Bough
      this.drawFoliageLobe(ctx, x + 11 * rScale, y + 3 + hOff, 13 * rScale, '#15803d', '#14532d', '#052e16');
      // Mid Left Bough
      this.drawFoliageLobe(ctx, x - 10 * rScale + canopyWind * 0.5, y - 8 + hOff, 16 * rScale, '#4ade80', '#22c55e', '#15803d');
      // Mid Right Bough
      this.drawFoliageLobe(ctx, x + 9 * rScale, y - 7 + hOff, 15 * rScale, '#22c55e', '#16a34a', '#14532d');
      // Central Crown Lobe
      this.drawFoliageLobe(ctx, x + canopyWind * 0.8, y - 16 + hOff, 17 * rScale, '#4ade80', '#22c55e', '#15803d');

      // Sun-Dappled Leaf Flecks & Rim Light on Crown
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(x - 6 * rScale + canopyWind, y - 20 + hOff, 3.5 * rScale, 0, Math.PI * 2);
      ctx.arc(x - 1 * rScale + canopyWind, y - 22 + hOff, 3.0 * rScale, 0, Math.PI * 2);
      ctx.arc(x + 4 * rScale + canopyWind, y - 18 + hOff, 2.5 * rScale, 0, Math.PI * 2);
      ctx.fill();

      // Golden Sun Glint
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.arc(x - 5 * rScale + canopyWind, y - 21 + hOff, 1.8 * rScale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawFoliageLobe(ctx: CanvasRenderingContext2D, lx: number, ly: number, r: number, cLight: string, cMid: string, cDark: string): void {
    const grad = ctx.createRadialGradient(lx - r * 0.35, ly - r * 0.35, r * 0.1, lx, ly, r);
    grad.addColorStop(0, cLight);
    grad.addColorStop(0.55, cMid);
    grad.addColorStop(1, cDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle edge leaf bumps for organic texture
    ctx.fillStyle = cLight;
    for (let a = -Math.PI * 0.8; a < 0; a += 0.7) {
      const bx = lx + Math.cos(a) * (r - 1);
      const by = ly + Math.sin(a) * (r - 1);
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPineTier(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const pineGrad = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y + h);
    pineGrad.addColorStop(0, '#15803d');
    pineGrad.addColorStop(0.5, '#166534');
    pineGrad.addColorStop(1, '#052e16');
    ctx.fillStyle = pineGrad;

    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.4);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x - w / 2, y + h);
    ctx.closePath();
    ctx.fill();

    // Serrated bottom needles
    ctx.fillStyle = '#14532d';
    for (let nx = x - w / 2; nx <= x + w / 2; nx += 6) {
      ctx.beginPath();
      ctx.moveTo(nx - 3, y + h);
      ctx.lineTo(nx, y + h + 3);
      ctx.lineTo(nx + 3, y + h);
      ctx.closePath();
      ctx.fill();
    }
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

  private renderAtmosphere(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    // 1. Diagonal Volumetric Sunbeams / God-Rays filtering from top-left
    const rayCount = 4;
    for (let i = 0; i < rayCount; i++) {
      const rayX = (route.worldWidth * (i / rayCount)) + ((this.time * 8) % 80) - 40;
      const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 90, route.worldHeight);
      rayGrad.addColorStop(0, 'rgba(254, 240, 138, 0.07)');
      rayGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.03)');
      rayGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rayX - 30, 0);
      ctx.lineTo(rayX + 50, 0);
      ctx.lineTo(rayX + 170, route.worldHeight);
      ctx.lineTo(rayX + 70, route.worldHeight);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Ambient Atmospheric Floating Particles (Leaves, Petals, Pollen)
    if (this.particles.length === 0) return;
    ctx.save();

    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;

      if (p.type === 'leaf') {
        // Floating Emerald Leaf with Spine
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-p.size * 0.7, -0.4, p.size * 1.4, 0.8);
      } else if (p.type === 'blossom') {
        // Cherry Blossom Petal
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(0.5, 0.5, p.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Golden Sunlit Pollen Dust Mote
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private renderScreenHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, route: RouteDefinition): void {
    ctx.save();

    // Top-left Route Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 10, 220, 36, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 12.5px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`🧭 ${route.locationLabel}`, 20, 26);
    ctx.font = '600 10.5px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Destination: ${route.destinationLabel}`, 20, 40);

    // Compass indicator toward exit
    if (route.exitX > 0) {
      const progressPct = Math.min(100, Math.round((this.player.x / route.exitX) * 100));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(canvas.width - 130, 10, 120, 36, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`ROUTE ➔ ${progressPct}%`, canvas.width - 20, 26);
      ctx.fillStyle = '#4ade80';
      ctx.font = '9px system-ui';
      ctx.fillText(`Reach Exit to Advance`, canvas.width - 20, 39);
    }

    ctx.restore();
  }
}

export const routeExplorationEngine = new RouteExplorationEngine();
