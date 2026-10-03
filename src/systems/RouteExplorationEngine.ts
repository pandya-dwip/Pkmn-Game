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

  // Player State
  public player = {
    x: 80,
    y: 220,
    w: 24,
    h: 28,
    vx: 0,
    vy: 0,
    speed: 155,
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
      if (dist < 48) {
        sound.beep(660, 0.1, 'triangle');
        if (this.onTalkNPC) this.onTalkNPC(npc);
        return;
      }
    }

    // Check Building interaction
    for (const b of this.currentRoute.buildings) {
      const nearDoor =
        this.player.x >= b.x - 10 &&
        this.player.x <= b.x + b.w + 10 &&
        this.player.y >= b.y + b.h - 10 &&
        this.player.y <= b.y + b.h + 30;

      if (nearDoor) {
        sound.beep(880, 0.15, 'sine');
        if (b.type === 'gym' && this.onEnterGym && b.gymIndex !== undefined) {
          this.onEnterGym(b.gymIndex);
        } else if (b.type === 'mart' && this.onEnterMart) {
          this.onEnterMart();
        } else if (b.type === 'center' && this.onEnterCenter) {
          this.onEnterCenter();
        }
        return;
      }
    }
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
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' ', 'e', 'E', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.keys['ArrowUp'] = true;
    if (key === 'arrowdown' || key === 's') this.keys['ArrowDown'] = true;
    if (key === 'arrowleft' || key === 'a') this.keys['ArrowLeft'] = true;
    if (key === 'arrowright' || key === 'd') this.keys['ArrowRight'] = true;

    if (key === ' ' || key === 'e') {
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
      if (this.player.stepTimer > 0.18) {
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

    if (inGrassNow && isMoving && this.player.cooldownTimer <= 0) {
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

    // Check Interactive Proximity Prompt
    const promptEl = document.getElementById('route-prompt');
    let promptText = '';

    for (const npc of this.currentRoute.npcs) {
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < 48) {
        promptText = `💬 Press [A] to talk to ${npc.name}`;
        break;
      }
    }

    if (!promptText) {
      for (const b of this.currentRoute.buildings) {
        const nearDoor =
          this.player.x >= b.x - 12 &&
          this.player.x <= b.x + b.w + 12 &&
          this.player.y >= b.y + b.h - 10 &&
          this.player.y <= b.y + b.h + 28;
        if (nearDoor) {
          promptText = `🚪 Press [A] to enter ${b.label}`;
          break;
        }
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
    // Fill full canvas with route background theme
    const baseGreen = route.theme === 'forest' ? '#1b4332' : route.theme === 'city' ? '#2d6a4f' : '#2d5a27';
    ctx.fillStyle = baseGreen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Translation
    ctx.translate(-Math.floor(this.camX), -Math.floor(this.camY));

    // 1. Base Terrain Grass
    ctx.fillRect(0, 0, route.worldWidth, route.worldHeight);

    // Subtle terrain texture dots
    ctx.fillStyle = '#1e3a1e';
    for (let x = 30; x < route.worldWidth; x += 60) {
      for (let y = 30; y < route.worldHeight; y += 60) {
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // 2. Paths (Dirt & Cobblestone)
    ctx.fillStyle = route.theme === 'city' ? '#cbd5e1' : '#d4a373';
    for (const p of route.path) {
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // Path border outline
      ctx.strokeStyle = route.theme === 'city' ? '#94a3b8' : '#bc6c25';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    // 3. Tall Grass Patches
    for (const g of route.grassPatches) {
      ctx.fillStyle = '#40916c';
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.fillStyle = '#52b788';
      // Individual tufts
      for (let tx = g.x + 6; tx < g.x + g.w - 6; tx += 18) {
        for (let ty = g.y + 6; ty < g.y + g.h - 6; ty += 18) {
          ctx.beginPath();
          ctx.moveTo(tx, ty + 10);
          ctx.lineTo(tx + 4, ty);
          ctx.lineTo(tx + 8, ty + 10);
          ctx.fill();
        }
      }
    }

    // 4. Route Buildings
    for (const b of route.buildings) {
      this.renderBuilding(ctx, b);
    }

    // 5. Ground Items (Poké Balls)
    for (const it of route.items) {
      if (!it.collected) {
        this.renderGroundItem(ctx, it);
      }
    }

    // 6. NPCs
    for (const npc of route.npcs) {
      this.renderNPC(ctx, npc);
    }

    // 7. Player Character
    this.renderPlayer(ctx);

    // 8. Overhead Canopy & Exit Signposts
    this.renderOverheadScenery(ctx, route);

    ctx.restore();
  }

  private renderBuilding(ctx: CanvasRenderingContext2D, b: RouteBuilding): void {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(b.x + 4, b.y + b.h - 4, b.w, 14);

    if (b.type === 'center') {
      // Pokémon Center: Red Roof, White Walls
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x, b.y + 24, b.w, b.h - 24);
      // Red Roof
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(b.x - 6, b.y + 24);
      ctx.lineTo(b.x + b.w / 2, b.y - 4);
      ctx.lineTo(b.x + b.w + 6, b.y + 24);
      ctx.closePath();
      ctx.fill();
      // Pokéball crest
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 12, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      // Glass Door
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(b.x + b.w / 2 - 12, b.y + b.h - 24, 24, 24);
    } else if (b.type === 'mart') {
      // Poké Mart: Blue Roof
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(b.x, b.y + 24, b.w, b.h - 24);
      // Blue Roof
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(b.x - 4, b.y + 4, b.w + 8, 20);
      // Sign
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('MART', b.x + b.w / 2, b.y + 18);
      // Door
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h - 22, 20, 22);
    } else if (b.type === 'gym') {
      // Gym: Grand Stone Stadium Pillars & Roof
      ctx.fillStyle = '#475569';
      ctx.fillRect(b.x, b.y + 28, b.w, b.h - 28);
      // Triangular Stone Pediment Roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 28);
      ctx.lineTo(b.x + b.w / 2, b.y - 8);
      ctx.lineTo(b.x + b.w + 8, b.y + 28);
      ctx.closePath();
      ctx.fill();
      // Stone Pillars
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(b.x + 8, b.y + 28, 14, b.h - 28);
      ctx.fillRect(b.x + b.w - 22, b.y + 28, 14, b.h - 28);
      // Banner
      ctx.fillStyle = '#facc15';
      ctx.font = '900 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ KANTO GYM ⚡', b.x + b.w / 2, b.y + 16);
      // Grand Wooden Door
      ctx.fillStyle = '#78350f';
      ctx.fillRect(b.x + b.w / 2 - 16, b.y + b.h - 32, 32, 32);
    }

    // Building Label Banner
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, b.y - 12);

    ctx.restore();
  }

  private renderGroundItem(ctx: CanvasRenderingContext2D, it: RouteItem): void {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(it.x, it.y + 6, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Poké Ball Sprite
    ctx.beginPath();
    ctx.arc(it.x, it.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // Top Red Half
    ctx.beginPath();
    ctx.arc(it.x, it.y, 7, Math.PI, 0);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    // Center Band
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(it.x - 7, it.y - 1, 14, 2);
    ctx.beginPath();
    ctx.arc(it.x, it.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  private renderNPC(ctx: CanvasRenderingContext2D, npc: RouteNPC): void {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(npc.x, npc.y + 12, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // NPC Icon / Body
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(npc.avatar, npc.x, npc.y + 8);
    // Name Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.5px system-ui';
    ctx.fillText(npc.name, npc.x, npc.y - 14);
    ctx.restore();
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const px = this.player.x;
    const py = this.player.y;
    const dir = this.player.dir;
    const anim = this.player.animFrame;
    const bob = anim === 1 ? -2 : anim === 3 ? 2 : 0;

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    // Blue Jeans
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(px - 6, py + 4 + bob, 12, 9);
    // Red Jacket
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 7, py - 6 + bob, 14, 11);
    // White Collar / Undershirt
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 3, py - 6 + bob, 6, 4);
    // Head / Face
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(px - 5, py - 16 + bob, 10, 10);
    // Eyes (if facing down or left/right)
    if (dir === 'down') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 3, py - 11 + bob, 2, 3);
      ctx.fillRect(px + 1, py - 11 + bob, 2, 3);
    } else if (dir === 'left') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 4, py - 11 + bob, 2, 3);
    } else if (dir === 'right') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 2, py - 11 + bob, 2, 3);
    }
    // Red Cap with White Visor
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(px - 6, py - 20 + bob, 12, 6);
    ctx.fillStyle = '#ffffff';
    const visorOffset = dir === 'left' ? -8 : dir === 'right' ? 2 : -4;
    ctx.fillRect(px + visorOffset, py - 15 + bob, 7, 2);

    // Green Backpack (on back)
    if (dir === 'up' || dir === 'left' || dir === 'right') {
      ctx.fillStyle = '#15803d';
      const bpX = dir === 'up' ? px - 5 : dir === 'left' ? px + 2 : px - 8;
      ctx.fillRect(bpX, py - 5 + bob, 6, 9);
    }

    // Tall grass cover effect on legs
    if (this.player.inGrass) {
      ctx.fillStyle = '#40916c';
      ctx.fillRect(px - 8, py + 6, 16, 8);
    }

    ctx.restore();
  }

  private renderOverheadScenery(ctx: CanvasRenderingContext2D, route: RouteDefinition): void {
    ctx.save();
    // Trees along perimeter and decorative clusters
    ctx.fillStyle = '#14532d';
    for (let x = 10; x < route.worldWidth; x += 44) {
      // Top boundary trees
      this.drawTree(ctx, x, 24);
      // Bottom boundary trees
      this.drawTree(ctx, x, route.worldHeight - 12);
    }

    // Exit Signpost
    if (route.exitX > 0) {
      const ex = route.exitX - 30;
      const ey = 200;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(ex, ey + 10, 6, 24);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(ex - 22, ey, 50, 18);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex - 22, ey, 50, 18);
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 9.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT ➔', ex + 3, ey + 13);
    }

    ctx.restore();
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Tree Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 3, y + 6, 6, 10);
    // Tree Canopy
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x - 3, y - 4, 11, 0, Math.PI * 2);
    ctx.fill();
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
