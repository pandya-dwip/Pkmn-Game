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

export interface RouteBuilding {
  type: 'center' | 'mart' | 'gym' | 'gate';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  gymIndex?: number;
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
  path: { x: number; y: number; w: number; h: number }[];
  grassPatches: GrassPatch[];
  buildings: RouteBuilding[];
  items: RouteItem[];
  npcs: RouteNPC[];
  targetEncounters: number;
  exitX: number;
}

export class RouteExplorationEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private time: number = 0;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; type: 'leaf' | 'pollen' | 'blossom'; rot: number; rotSpeed: number }> = [];
  private grassParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }> = [];

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
  public onEnterGate: ((building: RouteBuilding) => void) | null = null;
  public onPickItem: ((item: RouteItem) => void) | null = null;
  public onTalkNPC: ((npc: RouteNPC) => void) | null = null;
  public onRouteExit: ((nextRouteIndex: number) => void) | null = null;
  public onOpenMenu: (() => void) | null = null;

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
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
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
        if (b.type === 'gym' && this.onEnterGym && b.gymIndex !== undefined) {
          this.onEnterGym(b.gymIndex);
        } else if (b.type === 'mart' && this.onEnterMart) {
          this.onEnterMart();
        } else if (b.type === 'center' && this.onEnterCenter) {
          this.onEnterCenter();
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

    // Check Route Exit Signpost
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

    let dx = 0;
    let dy = 0;

    if (this.keys['ArrowUp']) dy -= 1;
    if (this.keys['ArrowDown']) dy += 1;
    if (this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['ArrowRight']) dx += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    if (dy < 0) this.player.dir = 'up';
    else if (dy > 0) this.player.dir = 'down';
    else if (dx < 0) this.player.dir = 'left';
    else if (dx > 0) this.player.dir = 'right';

    const isMoving = dx !== 0 || dy !== 0;

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

    // Move player with collision checks
    const targetX = this.player.x + dx * this.player.speed * dt;
    const targetY = this.player.y + dy * this.player.speed * dt;

    // Boundaries
    const clampedX = Math.max(20, Math.min(this.currentRoute.worldWidth - 20, targetX));
    const clampedY = Math.max(60, Math.min(this.currentRoute.worldHeight - 40, targetY));

    // Collision with Buildings
    let blocked = false;
    for (const b of this.currentRoute.buildings) {
      // Solid walls, doorway at bottom center
      if (
        clampedX >= b.x - 12 &&
        clampedX <= b.x + b.w + 12 &&
        clampedY >= b.y - 12 &&
        clampedY <= b.y + b.h
      ) {
        // Doorway check
        const doorCenterX = b.x + b.w / 2;
        const atDoor = Math.abs(clampedX - doorCenterX) < 18 && clampedY >= b.y + b.h - 10;
        if (!atDoor) {
          blocked = true;
          break;
        }
      }
    }

    if (!blocked) {
      this.player.x = clampedX;
      this.player.y = clampedY;
    }

    // Check Tall Grass
    let inGrassNow = false;
    for (const patch of this.currentRoute.grassPatches) {
      if (
        this.player.x >= patch.x &&
        this.player.x <= patch.x + patch.w &&
        this.player.y >= patch.y &&
        this.player.y <= patch.y + patch.h
      ) {
        inGrassNow = true;
        break;
      }
    }

    this.player.inGrass = inGrassNow;

    if (inGrassNow && isMoving) {
      if (Math.random() < 0.45) {
        this.spawnGrassParticle(this.player.x, this.player.y + 12);
      }
      if (this.player.cooldownTimer <= 0) {
        this.player.grassSteps += dt * 3.5;
        if (this.player.grassSteps >= 4.0) {
          this.player.grassSteps = 0;
          // Roll for wild encounter
          const encounterRoll = Math.random();
          if (encounterRoll < 0.65) {
            this.triggerWildBattle();
            return;
          }
        }
      }
    }

    // Check Interactive Proximity Prompt
    const promptEl = document.getElementById('route-prompt');
    let promptText = '';

    for (const npc of this.currentRoute.npcs) {
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < 55) {
        promptText = `💬 Press [A] to talk to ${npc.name}`;
        break;
      }
    }

    if (!promptText) {
      for (const b of this.currentRoute.buildings) {
        const nearDoor =
          this.player.x >= b.x - 20 &&
          this.player.x <= b.x + b.w + 24 &&
          this.player.y >= b.y + b.h - 16 &&
          this.player.y <= b.y + b.h + 45;
        if (nearDoor) {
          promptText = `🚪 Press [A] to enter ${b.label}`;
          break;
        }
      }
    }

    if (!promptText && this.currentRoute.exitX > 0) {
      const ex = this.currentRoute.exitX - 30;
      const ey = 200;
      if (Math.hypot(this.player.x - ex, this.player.y - ey) < 55) {
        promptText = `🚪 Press [A] to proceed to Next Route ➔`;
      }
    }

    const actBtn = document.getElementById('btn-interact');
    if (promptEl) {
      if (promptText) {
        promptEl.textContent = promptText;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
      }
    }
    if (actBtn) {
      if (promptText) {
        actBtn.classList.add('pulse');
      } else {
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

    // Check Route Exit
    if (this.currentRoute.exitX > 0 && this.player.x >= this.currentRoute.exitX) {
      if (this.onRouteExit) {
        this.isPaused = true;
        sound.beep(780, 0.25, 'triangle');
        this.onRouteExit(this.currentRoute.id + 1);
        return;
      }
    }

    // Update Camera
    if (this.canvas) {
      const targetCamX = this.player.x - this.canvas.width / 2;
      const targetCamY = this.player.y - this.canvas.height / 2;

      if (this.canvas.width >= this.currentRoute.worldWidth) {
        this.camX = -(this.canvas.width - this.currentRoute.worldWidth) / 2;
      } else {
        const maxCamX = this.currentRoute.worldWidth - this.canvas.width;
        this.camX = Math.max(0, Math.min(maxCamX, targetCamX));
      }

      if (this.canvas.height >= this.currentRoute.worldHeight) {
        this.camY = -(this.canvas.height - this.currentRoute.worldHeight) / 2;
      } else {
        const maxCamY = this.currentRoute.worldHeight - this.canvas.height;
        this.camY = Math.max(0, Math.min(maxCamY, targetCamY));
      }
    }
  }

  private triggerWildBattle(): void {
    if (!this.currentRoute || this.isPaused) return;

    this.isPaused = true;
    sound.beep(220, 0.15, 'sawtooth');
    sound.beep(440, 0.25, 'sawtooth', 0.15);

    // Save exact position
    const savedX = this.player.x;
    const savedY = this.player.y;

    const mon = generateEncounterMon(this.currentRoute.id, Math.random() < 0.12);

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

    // 2. Paths & Cobblestone Avenues
    this.renderPaths(ctx, route);

    // 3. Tall Grass with Wind Sway Animation & Wildflowers
    this.renderTallGrass(ctx, route);

    // 4. Buildings (Pokémon Center, Poké Mart, Gym, Route Gate)
    for (const b of route.buildings) {
      this.renderBuilding(ctx, b);
    }

    // 5. Ground Items (3D Poké Balls with Sparkle)
    for (const it of route.items) {
      if (!it.collected) {
        this.renderGroundItem(ctx, it);
      }
    }

    // 6. NPCs with Animated Interaction Prompts
    for (const npc of route.npcs) {
      this.renderNPC(ctx, npc);
    }

    // 7. Grass Particles
    this.renderGrassParticles(ctx);

    // 8. Player Character (Detailed Red/Ash with Animated Walking Cycle)
    this.renderPlayer(ctx);

    // 9. Overhead Canopy, Route Signs & Fences
    this.renderOverheadScenery(ctx, route);

    // 10. Ambient Atmospheric Particles (Leaves & Pollen in the Breeze)
    this.renderAtmosphere(ctx, route);

    ctx.restore();
  }

  private renderTerrain(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const isForest = route.theme === 'forest';
    const isCity = route.theme === 'city';
    const isRock = route.theme === 'rock';
    const isWater = route.theme === 'water';

    // Theme-tailored natural turf palettes
    const baseCol = isForest
      ? '#173d2a'
      : isCity
      ? '#255d3c'
      : isRock
      ? '#3b5238'
      : isWater
      ? '#1c4e3e'
      : '#22552b';

    const fleckCol = isForest
      ? '#1d4832'
      : isCity
      ? '#2c6944'
      : isRock
      ? '#445c40'
      : isWater
      ? '#235e4b'
      : '#296133';

    const shadeCol = isForest
      ? '#123322'
      : isCity
      ? '#1e4d31'
      : isRock
      ? '#32462f'
      : isWater
      ? '#164032'
      : '#1c4623';

    // 1. Rich Base Ground Lawn Fill
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, route.worldWidth, route.worldHeight);

    // 2. Multi-tone Organic Turf Dappling (Natural non-grid procedural noise)
    const patchSize = 42;
    const cols = Math.ceil(route.worldWidth / patchSize);
    const rows = Math.ceil(route.worldHeight / patchSize);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const hash = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
        const seed = hash - Math.floor(hash);

        const px = c * patchSize;
        const py = r * patchSize;

        if (seed > 0.6) {
          // Lighter sunlit grass patch
          ctx.fillStyle = fleckCol;
          ctx.beginPath();
          ctx.ellipse(px + 21, py + 21, 20, 15, 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (seed < 0.22) {
          // Deeper shaded loam patch
          ctx.fillStyle = shadeCol;
          ctx.beginPath();
          ctx.ellipse(px + 21, py + 21, 16, 12, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Sunlit Dappled Canopy Light Patches (Warm golden sun filtering through leaves)
    ctx.fillStyle = 'rgba(254, 240, 138, 0.04)';
    for (let sx = 40; sx < route.worldWidth; sx += 120) {
      for (let sy = 30; sy < route.worldHeight; sy += 110) {
        const ox = ((sy * 17) % 50) - 25;
        const oy = ((sx * 23) % 40) - 20;
        ctx.beginPath();
        ctx.ellipse(sx + ox, sy + oy, 38, 24, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Ground Micro-Details: Clover clusters & tiny yellow meadow dandelions
    for (let x = 25; x < route.worldWidth - 25; x += 55) {
      for (let y = 35; y < route.worldHeight - 35; y += 50) {
        const dHash = Math.sin(x * 37.1 + y * 91.7) * 10000;
        const val = dHash - Math.floor(dHash);

        const ox = (val * 30) - 15;
        const oy = ((val * 7) % 1) * 24 - 12;
        const gx = x + ox;
        const gy = y + oy;

        if (val > 0.78) {
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
        } else if (val > 0.45 && val < 0.52) {
          // Embedded smooth tiny pebble
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(gx, gy, 2.5, 1.5, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(gx - 1, gy - 1, 1, 1);
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
    const isCity = route.theme === 'city';

    for (const p of route.path) {
      ctx.save();

      // Soft ambient drop shadow underneath the entire path bed
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.roundRect(p.x - 2, p.y - 2, p.w + 4, p.h + 6, 8);
      ctx.fill();

      if (isCity) {
        // ====================================================================
        // CITY PLAZA: Real Ashlar Flagstones with 3D Bevels & Mortar Joints
        // ====================================================================
        // Sub-base foundation bed
        ctx.fillStyle = '#64748b';
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Stone paver block dimensions
        const paverW = 32;
        const paverH = 20;

        const paverTones = ['#e2e8f0', '#cbd5e1', '#dbeafe', '#f1f5f9', '#94a3b8'];

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
        ctx.strokeStyle = '#475569';
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

    for (const g of route.grassPatches) {
      ctx.save();

      // 1. Soft Ambient Depth Shadow under Grass Patch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.roundRect(g.x + 2, g.y + 4, g.w, g.h, 12);
      ctx.fill();

      // 2. Rich Dark Moss Bed Base
      ctx.fillStyle = '#143825';
      ctx.beginPath();
      ctx.roundRect(g.x, g.y, g.w, g.h, 10);
      ctx.fill();

      // 3. Dense Emerald Undergrowth Bed
      ctx.fillStyle = '#1b4a32';
      ctx.beginPath();
      ctx.roundRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6, 8);
      ctx.fill();

      // 4. Dense Multi-Layered Swaying Blade Tufts
      const tuftStep = 16;
      for (let tx = g.x + 5; tx < g.x + g.w - 5; tx += tuftStep) {
        for (let ty = g.y + 5; ty < g.y + g.h - 5; ty += tuftStep) {
          // Dynamic 2-Phase Wind Waves
          const broadWind = Math.sin(this.time * 2.8 + tx * 0.05 + ty * 0.04) * 4.2;
          const rustle = Math.sin(this.time * 6.5 + tx * 0.2 + ty * 0.1) * 1.2;
          let windSway = broadWind + rustle;

          // Reactive Player Blade Parting:
          // Blades physically part away when Red walks through the tuft
          const distToPlayer = Math.hypot(tx - px, ty - py);
          if (distToPlayer < 36) {
            const pushFactor = (1 - distToPlayer / 36) * 7.5;
            const pushDir = tx >= px ? 1 : -1;
            windSway += pushFactor * pushDir;
          }

          // Blade 1: Deep Shadow Blade (Dark base depth)
          ctx.fillStyle = '#0f291c';
          ctx.beginPath();
          ctx.moveTo(tx - 4, ty + 13);
          ctx.lineTo(tx + windSway * 0.7 - 2, ty + 2);
          ctx.lineTo(tx + 2, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Blade 2: Left Curved Jade Blade
          ctx.fillStyle = '#2d6a4f';
          ctx.beginPath();
          ctx.moveTo(tx - 5, ty + 13);
          ctx.quadraticCurveTo(tx - 3 + windSway * 0.5, ty + 7, tx - 3 + windSway, ty + 1);
          ctx.lineTo(tx - 1, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Blade 3: Center Dominant Emerald Blade with Sunlit Tip
          ctx.fillStyle = '#40916c';
          ctx.beginPath();
          ctx.moveTo(tx - 2, ty + 13);
          ctx.quadraticCurveTo(tx + windSway * 0.5, ty + 6, tx + windSway + 1, ty - 2);
          ctx.lineTo(tx + 2, ty + 13);
          ctx.closePath();
          ctx.fill();

          // Sunlit Lime Tip on Center Blade
          ctx.fillStyle = '#74c69d';
          ctx.beginPath();
          ctx.moveTo(tx + windSway - 1, ty + 3);
          ctx.lineTo(tx + windSway + 1, ty - 2);
          ctx.lineTo(tx + windSway + 3, ty + 3);
          ctx.closePath();
          ctx.fill();

          // Blade 4: Right Curved Lime Blade
          ctx.fillStyle = '#52b788';
          ctx.beginPath();
          ctx.moveTo(tx + 1, ty + 13);
          ctx.quadraticCurveTo(tx + 3 + windSway * 0.6, ty + 7, tx + 4 + windSway, ty + 2);
          ctx.lineTo(tx + 5, ty + 13);
          ctx.closePath();
          ctx.fill();

          // 5. Embedded Colorful Wildflowers (Poppies, Buttercups, Bluebells, Lavender, Daisies)
          const flowerHash = Math.abs(Math.sin(tx * 13.9 + ty * 31.7));
          if (flowerHash > 0.81) {
            const flowerColors = [
              { petal: '#facc15', eye: '#c2410c' }, // Golden Buttercup
              { petal: '#ef4444', eye: '#450a0a' }, // Crimson Poppy
              { petal: '#38bdf8', eye: '#ffffff' }, // Forget-Me-Not Blue
              { petal: '#ffffff', eye: '#f59e0b' }, // White Daisy
              { petal: '#c084fc', eye: '#581c87' }, // Purple Lavender
            ];
            const fIdx = Math.floor(flowerHash * 100) % flowerColors.length;
            const fPair = flowerColors[fIdx];

            const fx = tx + 3 + windSway * 0.65;
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
            ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
            ctx.fill();

            // Center Eye
            ctx.fillStyle = fPair.eye;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.1, 0, Math.PI * 2);
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
    }

    // High-Contrast Glassmorphic Building Label Badge
    const labelX = b.x + b.w / 2;
    const labelY = b.y - 18;
    const isGym = b.type === 'gym';
    const isMart = b.type === 'mart';
    const isCenter = b.type === 'center';

    const tagBg = isGym
      ? 'rgba(113, 63, 18, 0.94)'
      : isMart
      ? 'rgba(30, 58, 138, 0.94)'
      : isCenter
      ? 'rgba(153, 27, 27, 0.94)'
      : 'rgba(15, 23, 42, 0.9)';

    const tagBorder = isGym ? '#facc15' : isMart ? '#60a5fa' : isCenter ? '#fca5a5' : '#94a3b8';
    const tagIcon = isGym ? '🏆' : isMart ? '🛒' : isCenter ? '🏥' : '🚪';

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

    // 2. NPC Avatar
    ctx.font = '23px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(npc.avatar, npc.x, npc.y + 9);

    // 3. Proximity Interactive Indicator (💬 Speech bubble)
    const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
    if (dist < 55) {
      const bob = Math.sin(this.time * 5) * 3;
      ctx.font = '15px system-ui';
      ctx.fillText('💬', npc.x, npc.y - 23 + bob);
    }

    // 4. Sleek Name Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(npc.x - 32, npc.y - 19, 64, 15, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 9px system-ui';
    ctx.fillText(npc.name, npc.x, npc.y - 8);

    ctx.restore();
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

  private renderOverheadScenery(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    ctx.save();

    // 1. Perimeter Boundary Forest Line (Dense lush tree canopy)
    for (let x = 12; x < route.worldWidth; x += 38) {
      // Top Boundary Forest
      this.drawTree(ctx, x, 22);
      // Bottom Boundary Forest
      this.drawTree(ctx, x, route.worldHeight - 14);
    }

    // 2. Wooden Post-and-Rail Fences bordering paths
    for (const p of route.path) {
      if (route.theme !== 'city') {
        const fenceY = p.y - 12;
        if (fenceY > 50) {
          ctx.strokeStyle = '#58240c';
          ctx.lineWidth = 2.5;

          // Horizontal Rails
          ctx.beginPath();
          ctx.moveTo(p.x, fenceY + 4);
          ctx.lineTo(p.x + Math.min(180, p.w), fenceY + 4);
          ctx.moveTo(p.x, fenceY + 10);
          ctx.lineTo(p.x + Math.min(180, p.w), fenceY + 10);
          ctx.stroke();

          // Vertical Posts with soft shadows
          for (let fx = p.x; fx < p.x + Math.min(180, p.w); fx += 30) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(fx - 2, fenceY + 16, 4, 3);

            ctx.fillStyle = '#78350f';
            ctx.fillRect(fx - 2, fenceY, 4, 16);
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(fx - 2, fenceY, 1, 16); // Sunlit post edge
          }
        }
      }
    }

    // 3. Exit Signpost
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

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();

    // Natural variation per tree so they aren't all identical clones
    const treeHash = Math.abs(Math.sin(x * 47.9 + y * 73.1));
    const hOff = (treeHash - 0.5) * 6; // -3px to +3px height variation
    const rScale = 0.92 + treeHash * 0.16; // 92% to 108% scale variation

    // 1. Soft Elliptical Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16 + hOff, 20 * rScale, 8 * rScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Gnarled Oak Trunk with Roots & Bark Texture
    ctx.fillStyle = '#3a1805'; // Deep shadow
    ctx.fillRect(x - 5 * rScale, y + 4 + hOff, 10 * rScale, 14);

    // Spreading Root Flares
    ctx.fillStyle = '#58240c';
    ctx.beginPath();
    ctx.moveTo(x - 8 * rScale, y + 17 + hOff);
    ctx.lineTo(x + 8 * rScale, y + 17 + hOff);
    ctx.lineTo(x + 5 * rScale, y + 9 + hOff);
    ctx.lineTo(x - 5 * rScale, y + 9 + hOff);
    ctx.closePath();
    ctx.fill();

    // Sunlit Bark Highlight on Left
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 5 * rScale, y + 5 + hOff, 3 * rScale, 10);

    // 3. Multi-Lobe Volumetric Foliage Canopy with Radial Lighting (Sun from top-left)
    // Lobe 1: Base Deep Shadow Under-canopy
    const baseGrad = ctx.createRadialGradient(x - 4, y - 6 + hOff, 4, x, y + hOff, 22 * rScale);
    baseGrad.addColorStop(0, '#15803d');
    baseGrad.addColorStop(0.65, '#166534');
    baseGrad.addColorStop(1, '#0b2e16');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(x, y + hOff, 21 * rScale, 0, Math.PI * 2);
    ctx.fill();

    // Lobe 2: Left Mid Foliage Puff
    const leftGrad = ctx.createRadialGradient(x - 8, y - 8 + hOff, 2, x - 5, y - 5 + hOff, 15 * rScale);
    leftGrad.addColorStop(0, '#4ade80');
    leftGrad.addColorStop(0.45, '#22c55e');
    leftGrad.addColorStop(0.85, '#15803d');
    leftGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = leftGrad;
    ctx.beginPath();
    ctx.arc(x - 6 * rScale, y - 5 + hOff, 14 * rScale, 0, Math.PI * 2);
    ctx.fill();

    // Lobe 3: Right Mid Foliage Puff
    const rightGrad = ctx.createRadialGradient(x + 2, y - 7 + hOff, 2, x + 6, y - 4 + hOff, 14 * rScale);
    rightGrad.addColorStop(0, '#22c55e');
    rightGrad.addColorStop(0.55, '#16a34a');
    rightGrad.addColorStop(1, '#0f381e');
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.arc(x + 6 * rScale, y - 4 + hOff, 13 * rScale, 0, Math.PI * 2);
    ctx.fill();

    // Lobe 4: Center Dominant Crown Puff
    const crownGrad = ctx.createRadialGradient(x - 4, y - 13 + hOff, 3, x, y - 9 + hOff, 16 * rScale);
    crownGrad.addColorStop(0, '#4ade80');
    crownGrad.addColorStop(0.35, '#22c55e');
    crownGrad.addColorStop(0.8, '#15803d');
    crownGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.arc(x, y - 9 + hOff, 15 * rScale, 0, Math.PI * 2);
    ctx.fill();

    // 4. Subtle Sun-Dappled Leaf Flecks on Upper Left Crown
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(x - 5 * rScale, y - 13 + hOff, 3, 0, Math.PI * 2);
    ctx.arc(x - 1 * rScale, y - 15 + hOff, 2.4, 0, Math.PI * 2);
    ctx.fill();

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
