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

    if (promptEl) {
      if (promptText) {
        promptEl.textContent = promptText;
        promptEl.classList.remove('hidden');
      } else {
        promptEl.classList.add('hidden');
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

    const col1 = isForest ? '#1b4332' : isCity ? '#2d6a4f' : '#2d5a27';
    const col2 = isForest ? '#173a2b' : isCity ? '#275d45' : '#32632b';

    // Base fill
    ctx.fillStyle = col1;
    ctx.fillRect(0, 0, route.worldWidth, route.worldHeight);

    // Checkered subtle turf texture
    const tileSize = 32;
    const cols = Math.ceil(route.worldWidth / tileSize);
    const rows = Math.ceil(route.worldHeight / tileSize);

    ctx.fillStyle = col2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((c + r) % 2 === 0) {
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }

    // Subtle natural ground accents
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = 20; x < route.worldWidth; x += 48) {
      for (let y = 30; y < route.worldHeight; y += 48) {
        ctx.fillRect(x + ((y * 13) % 24), y, 2, 2);
      }
    }
  }

  private renderPaths(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    const isCity = route.theme === 'city';

    for (const p of route.path) {
      ctx.save();
      // Drop shadow underneath path
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(p.x + 2, p.y + 3, p.w, p.h);

      if (isCity) {
        // City Pavers: Clean flagstones with beveled tiles
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Stone curb border
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        // Flagstone mortar grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1;
        const paverSize = 24;
        for (let px = p.x; px < p.x + p.w; px += paverSize) {
          ctx.beginPath();
          ctx.moveTo(px, p.y);
          ctx.lineTo(px, p.y + p.h);
          ctx.stroke();
        }
        for (let py = p.y; py < p.y + p.h; py += paverSize) {
          ctx.beginPath();
          ctx.moveTo(p.x, py);
          ctx.lineTo(p.x + p.w, py);
          ctx.stroke();
        }
      } else {
        // Country Route Dirt Trail: Rich dirt base with sunlit center lane & cobblestones
        ctx.fillStyle = '#b08968'; // Darker dirt edges
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Sunlit main tread lane
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);

        // Subtle lighter center path
        ctx.fillStyle = '#ddb892';
        ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);

        // Cobblestones and pebbles embedded in path
        ctx.fillStyle = '#7f5539';
        for (let sx = p.x + 12; sx < p.x + p.w - 12; sx += 36) {
          for (let sy = p.y + 10; sy < p.y + p.h - 10; sy += 28) {
            const ox = (sy * 7) % 18;
            ctx.beginPath();
            ctx.ellipse(sx + ox, sy, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Highlight on stone
            ctx.fillStyle = '#e6ccb2';
            ctx.fillRect(sx + ox - 2, sy - 2, 2, 1);
            ctx.fillStyle = '#7f5539';
          }
        }

        // Irregular organic border stones along the trail sides
        ctx.fillStyle = '#9c6644';
        for (let bx = p.x; bx < p.x + p.w; bx += 20) {
          ctx.beginPath();
          ctx.ellipse(bx + ((bx * 3) % 8), p.y - 1, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(bx + ((bx * 5) % 8), p.y + p.h + 1, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  private renderTallGrass(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    for (const g of route.grassPatches) {
      ctx.save();
      // Drop shadow around grass patch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(g.x + 2, g.y + 3, g.w, g.h);

      // Deep mossy grass bed
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(g.x, g.y, g.w, g.h);

      // Emerald mid-bed
      ctx.fillStyle = '#2d6a4f';
      ctx.fillRect(g.x + 2, g.y + 2, g.w - 4, g.h - 4);

      // Swaying Multi-blade Grass Tufts with wind motion
      const tuftStep = 18;
      for (let tx = g.x + 6; tx < g.x + g.w - 6; tx += tuftStep) {
        for (let ty = g.y + 6; ty < g.y + g.h - 6; ty += tuftStep) {
          // Dynamic wind sway wave
          const windSway = Math.sin(this.time * 2.8 + tx * 0.08 + ty * 0.08) * 3.2;

          // Shadow blade
          ctx.fillStyle = '#1b4332';
          ctx.beginPath();
          ctx.moveTo(tx - 3, ty + 12);
          ctx.lineTo(tx + windSway - 1, ty + 1);
          ctx.lineTo(tx + 2, ty + 12);
          ctx.fill();

          // Left blade
          ctx.fillStyle = '#40916c';
          ctx.beginPath();
          ctx.moveTo(tx - 4, ty + 12);
          ctx.lineTo(tx + windSway - 2, ty + 2);
          ctx.lineTo(tx, ty + 12);
          ctx.fill();

          // Center prominent blade (vibrant emerald with sunlit tip)
          ctx.fillStyle = '#52b788';
          ctx.beginPath();
          ctx.moveTo(tx - 1, ty + 12);
          ctx.lineTo(tx + windSway + 1, ty - 1);
          ctx.lineTo(tx + 3, ty + 12);
          ctx.fill();

          // Sunlit tip
          ctx.fillStyle = '#74c69d';
          ctx.beginPath();
          ctx.moveTo(tx + windSway, ty + 2);
          ctx.lineTo(tx + windSway + 1, ty - 1);
          ctx.lineTo(tx + windSway + 2, ty + 2);
          ctx.fill();

          // Right blade
          ctx.fillStyle = '#40916c';
          ctx.beginPath();
          ctx.moveTo(tx + 2, ty + 12);
          ctx.lineTo(tx + windSway + 4, ty + 3);
          ctx.lineTo(tx + 6, ty + 12);
          ctx.fill();

          // Embedded Wildflowers (buttercups, poppies, forget-me-nots, daisies)
          const flowerSeed = (tx * 17 + ty * 31) % 100;
          if (flowerSeed < 16) {
            const flowerColors = ['#facc15', '#ef4444', '#60a5fa', '#ffffff', '#e879f9'];
            const flowerCol = flowerColors[flowerSeed % flowerColors.length];
            const fx = tx + 3 + windSway * 0.5;
            const fy = ty + 4;

            // Stem
            ctx.strokeStyle = '#2d6a4f';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx + 3, ty + 10);
            ctx.lineTo(fx, fy + 2);
            ctx.stroke();

            // Petals
            ctx.fillStyle = flowerCol;
            ctx.beginPath();
            ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Center eye
            ctx.fillStyle = flowerCol === '#facc15' ? '#ea580c' : '#fef08a';
            ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
          }
        }
      }
      ctx.restore();
    }
  }

  private renderBuilding(ctx: CanvasRenderingContext2D, b: RouteBuilding): void {
    ctx.save();

    // Universal Soft Cast Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h + 2, b.w / 2 + 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    if (b.type === 'center') {
      // ------------------------------------------------------------------------
      // POKÉMON CENTER: Architectural Red Gabled Roof with Pulsing Crest
      // ------------------------------------------------------------------------
      // Foundation / Steps
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(b.x - 4, b.y + b.h - 6, b.w + 8, 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(b.x - 2, b.y + b.h - 4, b.w + 4, 4);

      // Main Facade Walls (Cream-White Architectural Stucco)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(b.x, b.y + 24, b.w, b.h - 26);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y + 24, b.w, b.h - 26);

      // Corner Sky-Blue Pilasters
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(b.x, b.y + 24, 7, b.h - 26);
      ctx.fillRect(b.x + b.w - 7, b.y + 24, 7, b.h - 26);

      // Curved Red Roof Base
      ctx.fillStyle = '#991b1b'; // Deep shadow under-eaves
      ctx.fillRect(b.x - 8, b.y + 22, b.w + 16, 6);

      // Crimson Gabled Roof with Highlight
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 8, b.y + 24);
      ctx.closePath();
      ctx.fill();

      // Sunlit Roof Ridge Highlight
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + 22);
      ctx.lineTo(b.x + b.w / 2, b.y - 4);
      ctx.lineTo(b.x + b.w / 2, b.y + 10);
      ctx.lineTo(b.x - 2, b.y + 22);
      ctx.closePath();
      ctx.fill();

      // White Fascia Bargeboard Trim
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 8, b.y + 24);
      ctx.stroke();

      // Rooftop Communications Antenna with Blinking Status Beacon
      const antX = b.x + b.w / 2;
      const antY = b.y - 6;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(antX, antY);
      ctx.lineTo(antX, antY - 10);
      ctx.stroke();
      const beaconGlow = Math.sin(this.time * 6) > 0;
      ctx.fillStyle = beaconGlow ? '#22c55e' : '#15803d';
      ctx.beginPath();
      ctx.arc(antX, antY - 11, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Twin Curved Front Windows with Warm Interior Golden Glow
      const winW = 16;
      const winH = 18;
      const winY = b.y + 30;
      [b.x + 12, b.x + b.w - 12 - winW].forEach(wx => {
        // Window Frame
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx - 1, winY - 1, winW + 2, winH + 2);
        // Golden Interior Illumination
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(wx, winY, winW, winH);
        // Glass Glare
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.moveTo(wx, winY + winH);
        ctx.lineTo(wx + winW, winY);
        ctx.lineTo(wx + winW - 5, winY);
        ctx.lineTo(wx, winY + winH - 5);
        ctx.closePath();
        ctx.fill();
        // Window Cross Frame
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx + winW / 2, winY);
        ctx.lineTo(wx + winW / 2, winY + winH);
        ctx.moveTo(wx, winY + winH / 2);
        ctx.lineTo(wx + winW, winY + winH / 2);
        ctx.stroke();
      });

      // Automatic Cyan Sliding Glass Entrance
      const doorW = 26;
      const doorH = 26;
      const doorX = b.x + b.w / 2 - doorW / 2;
      const doorY = b.y + b.h - doorH;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2);

      // Cyan Backlit Glass
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.fillRect(doorX, doorY, doorW, doorH);

      // Glass shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(doorX + 2, doorY + doorH);
      ctx.lineTo(doorX + doorW - 4, doorY + 2);
      ctx.lineTo(doorX + doorW - 10, doorY + 2);
      ctx.lineTo(doorX + 2, doorY + doorH - 8);
      ctx.closePath();
      ctx.fill();

      // Center Door Seam
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(doorX + doorW / 2, doorY);
      ctx.lineTo(doorX + doorW / 2, doorY + doorH);
      ctx.stroke();

      // Green Welcome Floor Mat
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(doorX + 2, doorY + doorH - 3, doorW - 4, 4);

      // Iconic Illuminated Poké Ball Crest with Pulsing LED Center
      const crestX = b.x + b.w / 2;
      const crestY = b.y + 11;
      const crestR = 10;

      // Outer Chrome Ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR + 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Half (White)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR, 0, Math.PI);
      ctx.fill();

      // Top Half (Crimson)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR, Math.PI, 0);
      ctx.fill();

      // Divider band
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(crestX - crestR, crestY - 1.5, crestR * 2, 3);

      // Center Button with Pulsing Cyan Glow
      const glowScale = Math.sin(this.time * 5) * 0.25 + 0.75;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.beginPath();
      ctx.arc(crestX, crestY, 4.5 * glowScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(crestX, crestY, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'mart') {
      // ------------------------------------------------------------------------
      // POKÉ MART: Vibrant Royal Blue Hip Roof with Storefront Window
      // ------------------------------------------------------------------------
      // Foundation & Ramp
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 3, b.y + b.h - 5, b.w + 6, 7);

      // Ivory Brick Facade Walls
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(b.x, b.y + 22, b.w, b.h - 24);

      // Blue Pilasters & Wainscoting
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(b.x, b.y + 22, 6, b.h - 24);
      ctx.fillRect(b.x + b.w - 6, b.y + 22, 6, b.h - 24);
      ctx.fillRect(b.x, b.y + b.h - 8, b.w, 4);

      // Royal Blue Hipped Roof
      ctx.fillStyle = '#1e40af'; // Shadow base
      ctx.fillRect(b.x - 6, b.y + 4, b.w + 12, 20);

      ctx.fillStyle = '#2563eb'; // Vibrant roof face
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + 24);
      ctx.lineTo(b.x + 8, b.y + 4);
      ctx.lineTo(b.x + b.w - 8, b.y + 4);
      ctx.lineTo(b.x + b.w + 6, b.y + 24);
      ctx.closePath();
      ctx.fill();

      // Ridge highlight
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(b.x + 8, b.y + 4, b.w - 16, 2.5);

      // White Fascia Crown Molding
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 6, b.y + 22, b.w + 12, 3);

      // Storefront Display Window with Blue/White Striped Scalloped Awning
      const sWinX = b.x + 8;
      const sWinY = b.y + 30;
      const sWinW = 26;
      const sWinH = 20;

      // Warm Shop Light
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(sWinX, sWinY, sWinW, sWinH);
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1;
      ctx.strokeRect(sWinX, sWinY, sWinW, sWinH);

      // Shelf silhouettes (mini potions & balls visible on shelves)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(sWinX + 3, sWinY + 8, 4, 7); // Potion
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(sWinX + 13, sWinY + 11, 3, 0, Math.PI * 2); // Ball
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(sWinX + 19, sWinY + 9, 4, 6); // Antidote

      // Scalloped Awning above Window
      const awnH = 6;
      for (let ax = sWinX - 2; ax < sWinX + sWinW + 2; ax += 6) {
        ctx.fillStyle = (ax / 6) % 2 === 0 ? '#1d4ed8' : '#ffffff';
        ctx.fillRect(ax, sWinY - awnH, 6, awnH);
        ctx.beginPath();
        ctx.arc(ax + 3, sWinY, 3, 0, Math.PI);
        ctx.fill();
      }

      // Automatic Sliding Entrance Door
      const dX = b.x + b.w - 30;
      const dY = b.y + b.h - 26;
      const dW = 22;
      const dH = 24;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(dX - 1, dY - 1, dW + 2, dH + 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(dX, dY, dW, dH);
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(dX + dW / 2 - 0.75, dY, 1.5, dH);

      // Blue Floor Mat
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(dX + 2, dY + dH - 3, dW - 4, 4);

      // Illuminated Gold Sign: 🛒 POKÉ MART
      const signX = b.x + b.w / 2;
      const signY = b.y + 14;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(signX - 32, signY - 7, 64, 15);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signX - 32, signY - 7, 64, 15);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🛒 POKÉ MART', signX, signY + 4);

    } else if (b.type === 'gym') {
      // ------------------------------------------------------------------------
      // KANTO GYM: Monumental Classical Arena with Glowing Elemental Crystal
      // ------------------------------------------------------------------------
      // Grand 3-Tier Granite Base Steps
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x - 8, b.y + b.h - 10, b.w + 16, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(b.x - 6, b.y + b.h - 7, b.w + 12, 8);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(b.x - 4, b.y + b.h - 4, b.w + 8, 5);

      // Monumental Stone Wall Facade
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x, b.y + 26, b.w, b.h - 28);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y + 26, b.w, b.h - 28);

      // Classical Stone Pediment Roof (Triangular Gable with Multi-tier Cornices)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(b.x - 12, b.y + 28);
      ctx.lineTo(b.x + b.w / 2, b.y - 12);
      ctx.lineTo(b.x + b.w + 12, b.y + 28);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 26);
      ctx.lineTo(b.x + b.w / 2, b.y - 9);
      ctx.lineTo(b.x + b.w + 8, b.y + 26);
      ctx.closePath();
      ctx.fill();

      // Cornice Ridge Highlight
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - 12, b.y + 28);
      ctx.lineTo(b.x + b.w / 2, b.y - 12);
      ctx.lineTo(b.x + b.w + 12, b.y + 28);
      ctx.stroke();

      // 4 Monumental Fluted Marble Columns
      const colW = 12;
      const colH = b.h - 26;
      const colY = b.y + 26;
      const colXs = [
        b.x + 6,
        b.x + b.w / 2 - 28,
        b.x + b.w / 2 + 16,
        b.x + b.w - 18,
      ];

      colXs.forEach(cx => {
        // Drop shadow behind column
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(cx + 4, colY, colW, colH);

        // Column shaft
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx, colY, colW, colH);

        // Fluting lines
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx + 3, colY, 2, colH);
        ctx.fillRect(cx + 7, colY, 2, colH);

        // Capital (top)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(cx - 2, colY, colW + 4, 4);

        // Base (bottom)
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - 2, colY + colH - 4, colW + 4, 4);
      });

      // Grand Arched Double Wooden Portal
      const archW = 34;
      const archH = 34;
      const archX = b.x + b.w / 2 - archW / 2;
      const archY = b.y + b.h - archH;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(archX - 2, archY - 2, archW + 4, archH + 2);

      // Heavy Dark Oak Double Doors
      ctx.fillStyle = '#451a03';
      ctx.fillRect(archX, archY, archW, archH);

      // Bronze hinge bands
      ctx.fillStyle = '#b45309';
      ctx.fillRect(archX, archY + 6, archW, 3);
      ctx.fillRect(archX, archY + archH - 8, archW, 3);

      // Center Door Seam
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(archX + archW / 2 - 1, archY, 2, archH);

      // Brass Ring Knockers
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(archX + archW / 2 - 6, archY + 16, 2.5, 0, Math.PI * 2);
      ctx.arc(archX + archW / 2 + 6, archY + 16, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Flanking Stone Braziers with Animated Flickering Flames
      const flk = Math.sin(this.time * 12) * 2;
      [-16, b.w + 10].forEach(bxOff => {
        const brX = b.x + bxOff;
        const brY = b.y + b.h - 14;

        // Stone Brazier Stand
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(brX - 4, brY, 8, 12);
        ctx.fillStyle = '#475569';
        ctx.fillRect(brX - 6, brY, 12, 4);

        // Flame glow
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.beginPath();
        ctx.arc(brX, brY - 4, 8 + Math.abs(flk), 0, Math.PI * 2);
        ctx.fill();

        // Outer Orange Flame
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(brX - 4, brY);
        ctx.lineTo(brX + flk, brY - 10);
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

      // Glowing Elemental Crystal / Badge Emblem on the Pediment Apex
      const crysX = b.x + b.w / 2;
      const crysY = b.y - 3;
      const crysPulse = Math.sin(this.time * 4) * 3 + 7;

      // Radial elemental aura
      const auraGrad = ctx.createRadialGradient(crysX, crysY, 2, crysX, crysY, crysPulse + 6);
      auraGrad.addColorStop(0, 'rgba(250, 204, 21, 0.9)');
      auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(crysX, crysY, crysPulse + 6, 0, Math.PI * 2);
      ctx.fill();

      // Crystal Diamond
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(crysX, crysY - 8);
      ctx.lineTo(crysX + 6, crysY);
      ctx.lineTo(crysX, crysY + 8);
      ctx.lineTo(crysX - 6, crysY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(crysX - 2, crysY - 6);
      ctx.lineTo(crysX, crysY);
      ctx.lineTo(crysX - 4, crysY);
      ctx.closePath();
      ctx.fill();

      // Gold Ribbon Tournament Banner across Columns
      const banX = b.x + b.w / 2;
      const banY = b.y + 17;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(banX - 42, banY - 6, 84, 13);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.strokeRect(banX - 42, banY - 6, 84, 13);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 8.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ KANTO LEAGUE GYM ⚡', banX, banY + 4);

    } else if (b.type === 'gate') {
      // ------------------------------------------------------------------------
      // ROUTE GATE: Red Brick Checkpoint Gatehouse
      // ------------------------------------------------------------------------
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(b.x, b.y + 18, b.w, b.h - 18);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(b.x - 4, b.y + 4, b.w + 8, 16);

      // Gate Arch Passage
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h - 24, 16, Math.PI, 0);
      ctx.lineTo(b.x + b.w / 2 + 16, b.y + b.h);
      ctx.lineTo(b.x + b.w / 2 - 16, b.y + b.h);
      ctx.closePath();
      ctx.fill();

      // Warm Yellow Sconce Lamp
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 24, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // High-Contrast Glassmorphic Building Label Banner
    const labelX = b.x + b.w / 2;
    const labelY = b.y - 18;
    const isGym = b.type === 'gym';
    const isMart = b.type === 'mart';
    const isCenter = b.type === 'center';

    const tagBg = isGym ? 'rgba(113, 63, 18, 0.92)' : isMart ? 'rgba(30, 58, 138, 0.92)' : isCenter ? 'rgba(153, 27, 27, 0.92)' : 'rgba(15, 23, 42, 0.88)';
    const tagBorder = isGym ? '#facc15' : isMart ? '#60a5fa' : isCenter ? '#fca5a5' : '#94a3b8';
    const tagIcon = isGym ? '🏆' : isMart ? '🛒' : isCenter ? '🏥' : '🚪';

    ctx.font = '800 10.5px system-ui';
    const textWidth = ctx.measureText(`${tagIcon} ${b.label}`).width;
    const pillW = textWidth + 16;

    ctx.fillStyle = tagBg;
    ctx.strokeStyle = tagBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(labelX - pillW / 2, labelY - 12, pillW, 20, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${tagIcon} ${b.label}`, labelX, labelY + 2);

    ctx.restore();
  }

  private renderGroundItem(ctx: CanvasRenderingContext2D, it: RouteItem): void {
    ctx.save();
    // Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(it.x, it.y + 7, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Poké Ball Lower White Half
    ctx.beginPath();
    ctx.arc(it.x, it.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // Top Crimson Half
    ctx.beginPath();
    ctx.arc(it.x, it.y, 7, Math.PI, 0);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    // Sunlit Ball Highlight
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(it.x - 2, it.y - 2.5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Center Black Divider Band
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(it.x - 7, it.y - 1.2, 14, 2.4);

    // Center Button
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(it.x, it.y, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(it.x, it.y, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Periodic Twinkle Sparkle
    const spTime = (this.time * 2 + it.x) % 3;
    if (spTime < 0.3) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(it.x - 6, it.y - 6, 2, 2);
      ctx.fillRect(it.x - 5, it.y - 7, 1, 4);
      ctx.fillRect(it.x - 7, it.y - 5, 4, 1);
    }

    ctx.restore();
  }

  private renderNPC(ctx: CanvasRenderingContext2D, npc: RouteNPC): void {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(npc.x, npc.y + 12, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // NPC Avatar
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(npc.avatar, npc.x, npc.y + 8);

    // Animated Speech Indicator when Player is nearby
    const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
    if (dist < 55) {
      const bob = Math.sin(this.time * 5) * 3;
      ctx.font = '14px system-ui';
      ctx.fillText('💬', npc.x, npc.y - 22 + bob);
    }

    // Name Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(npc.x - 30, npc.y - 18, 60, 14, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 8.5px system-ui';
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
      ctx.ellipse(gp.x, gp.y, 2.5, 1.2, 0.4, 0, Math.PI * 2);
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
    const legSwing = anim === 1 ? -3 : anim === 3 ? 3 : 0;

    ctx.save();

    // Realistic Ground Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 13, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Legs / Blue Denim Jeans
    ctx.fillStyle = '#1e3a8a';
    if (dir === 'down' || dir === 'up') {
      // Left leg
      ctx.fillRect(px - 6, py + 3 + bob + (dir === 'down' ? legSwing : -legSwing), 5, 9);
      // Right leg
      ctx.fillRect(px + 1, py + 3 + bob + (dir === 'down' ? -legSwing : legSwing), 5, 9);
    } else {
      // Side profile leg stride
      ctx.fillRect(px - 5 + legSwing, py + 3 + bob, 10, 9);
    }

    // 2. Running Sneakers (Red with White Rubber Soles)
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

    // 3. Green Explorer Backpack (Behind player when facing up or side)
    if (dir === 'up' || dir === 'left' || dir === 'right') {
      ctx.fillStyle = '#15803d';
      const bpX = dir === 'up' ? px - 6 : dir === 'left' ? px + 2 : px - 8;
      ctx.fillRect(bpX, py - 6 + bob, 6, 11);
      ctx.fillStyle = '#166534';
      ctx.fillRect(bpX + 1, py - 3 + bob, 4, 6);
    }

    // 4. Red Trainer Vest / Jacket
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 7, py - 7 + bob, 14, 12);

    // White Undershirt with Collar
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

    // Arm Swings
    ctx.fillStyle = '#dc2626';
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(px - 9, py - 6 + bob - legSwing, 3, 7);
      ctx.fillRect(px + 6, py - 6 + bob + legSwing, 3, 7);
      // Skin hands
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(px - 9, py + 1 + bob - legSwing, 3, 3);
      ctx.fillRect(px + 6, py + 1 + bob + legSwing, 3, 3);
    }

    // 5. Head / Face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(px - 5, py - 17 + bob, 10, 10);

    // Spiky Hair bangs peeking out
    ctx.fillStyle = '#292524';
    ctx.fillRect(px - 6, py - 18 + bob, 12, 3);
    if (dir === 'down') {
      ctx.fillRect(px - 5, py - 15 + bob, 2, 3);
      ctx.fillRect(px + 3, py - 15 + bob, 2, 3);

      // Expressive Anime Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 3, py - 13 + bob, 2, 3);
      ctx.fillRect(px + 1, py - 13 + bob, 2, 3);
      // Eye highlights
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

    // 6. Iconic Red Trainer Baseball Cap
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

    // Visor dark underside
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px + visorOffset, py - 14 + bob, visorW, 1);

    // 7. Tall Grass Immersion: Overlapping grass blades covering legs when in grass
    if (this.player.inGrass) {
      const gSway = Math.sin(this.time * 3 + px * 0.1) * 2;
      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.moveTo(px - 8, py + 14);
      ctx.lineTo(px - 6 + gSway, py + 4);
      ctx.lineTo(px - 4, py + 14);
      ctx.fill();

      ctx.fillStyle = '#52b788';
      ctx.beginPath();
      ctx.moveTo(px - 3, py + 14);
      ctx.lineTo(px + gSway, py + 2);
      ctx.lineTo(px + 3, py + 14);
      ctx.fill();

      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 14);
      ctx.lineTo(px + 6 + gSway, py + 5);
      ctx.lineTo(px + 8, py + 14);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderOverheadScenery(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    ctx.save();

    // Perimeter boundary trees (dense lush forest line)
    for (let x = 12; x < route.worldWidth; x += 40) {
      // Top boundary
      this.drawTree(ctx, x, 22);
      // Bottom boundary
      this.drawTree(ctx, x, route.worldHeight - 14);
    }

    // Exit Signpost
    if (route.exitX > 0) {
      const ex = route.exitX - 30;
      const ey = 200;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey + 32, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Post
      ctx.fillStyle = '#58240c';
      ctx.fillRect(ex - 2, ey + 10, 5, 24);

      // Carved Wooden Signboard
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(ex - 24, ey - 2, 54, 20);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.strokeRect(ex - 24, ey - 2, 54, 20);

      // Arrow & Text
      ctx.fillStyle = '#78350f';
      ctx.font = '900 9.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT ROUTE ➔', ex + 3, ey + 12);
    }

    ctx.restore();
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();

    // Drop shadow under tree
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sturdy Gnarled Tree Trunk
    ctx.fillStyle = '#58240c';
    ctx.fillRect(x - 4, y + 4, 8, 12);

    // Root flare on ground
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 16);
    ctx.lineTo(x + 7, y + 16);
    ctx.lineTo(x + 4, y + 8);
    ctx.lineTo(x - 4, y + 8);
    ctx.closePath();
    ctx.fill();

    // Bark texture lines
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 2, y + 5, 2, 9);

    // Layer 1: Deep forest shadow canopy
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(x, y - 2, 19, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Main vibrant emerald foliage body
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(x - 4, y - 5, 14, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 4, 13, 0, Math.PI * 2);
    ctx.arc(x, y - 8, 15, 0, Math.PI * 2);
    ctx.fill();

    // Layer 3: Upper foliage highlights
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x - 4, y - 9, 10, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 8, 9, 0, Math.PI * 2);
    ctx.fill();

    // Layer 4: Sun-dappled lime highlights
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x - 5, y - 11, 5, 0, Math.PI * 2);
    ctx.arc(x + 1, y - 12, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderAtmosphere(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    if (this.particles.length === 0) return;
    ctx.save();

    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;

      if (p.type === 'leaf') {
        // Floating green/autumn leaf
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'blossom') {
        // Cherry blossom petal
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sunlit dust mote / pollen
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private renderScreenHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, route: RouteDefinition): void {
    ctx.save();

    // Top-left Route Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(canvas.width - 130, 10, 120, 36, 10);
      ctx.fill();
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
