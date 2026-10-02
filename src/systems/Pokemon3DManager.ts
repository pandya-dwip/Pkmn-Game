/**
 * Pokemon3DManager.ts
 * High-level orchestration facade bridging battle logic with Three.js 3D rendering.
 * Manages player and foe models, orientation, grounding, attack participation,
 * hit reactions, faints, switches, and seamless 2D fallback.
 */

import * as THREE from 'three';
import { Pokemon3DConfig, type QualityLevel } from '../config/Pokemon3DConfig';
import { Pokemon3DApiService } from '../services/Pokemon3DApiService';
import { Pokemon3DLoader } from './Pokemon3DLoader';
import { Pokemon3DScene } from '../rendering/Pokemon3DScene';
import { Pokemon3DRenderer } from '../rendering/Pokemon3DRenderer';
import { Pokemon3DAnimationController } from '../rendering/Pokemon3DAnimationController';

export interface CombatantSlot {
  pokemonId: number;
  formName: string;
  wrapper: THREE.Group;
  controller: Pokemon3DAnimationController | null;
  loaded: boolean;
  failed: boolean;
}

export class Pokemon3DManager {
  private static instance: Pokemon3DManager;
  private scene: Pokemon3DScene | null = null;
  private renderer: Pokemon3DRenderer | null = null;
  private container: HTMLElement | null = null;

  private playerSlot: CombatantSlot | null = null;
  private foeSlot: CombatantSlot | null = null;

  private enabled = true;
  private isInitialized = false;

  private constructor() {
    // Check localStorage preference
    try {
      const pref = localStorage.getItem('pkmn_3d_enabled');
      if (pref !== null) {
        this.enabled = pref === 'true';
      }
    } catch {}
  }

  public static getInstance(): Pokemon3DManager {
    if (!Pokemon3DManager.instance) {
      Pokemon3DManager.instance = new Pokemon3DManager();
    }
    return Pokemon3DManager.instance;
  }

  /**
   * Initializes the 3D subsystem inside the battlefield container (e.g. #world).
   */
  public init(container: HTMLElement): void {
    if (this.isInitialized && this.container === container) return;

    this.container = container;
    this.scene = new Pokemon3DScene();
    this.renderer = new Pokemon3DRenderer(container);

    // Apply saved quality
    try {
      const q = localStorage.getItem('pkmn_3d_quality') as QualityLevel;
      if (q) this.renderer.setQuality(q, this.scene);
    } catch {}

    // Initialize API service in background
    Pokemon3DApiService.getInstance().initialize().catch(() => {});

    // Start render loop
    this.renderer.start(this.scene, delta => {
      if (this.playerSlot?.controller) {
        this.playerSlot.controller.update(delta);
      }
      if (this.foeSlot?.controller) {
        this.foeSlot.controller.update(delta);
      }

      // Update ground shadow positions
      if (this.scene) {
        this.scene.updateShadows(
          this.playerSlot?.wrapper,
          this.foeSlot?.wrapper
        );
      }
    });

    this.isInitialized = true;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem('pkmn_3d_enabled', val ? 'true' : 'false');
    } catch {}

    if (this.renderer?.canvas) {
      this.renderer.canvas.style.display = val ? 'block' : 'none';
    }

    // Toggle 2D sprite visibility accordingly
    const ps = document.querySelector('#ps') as HTMLElement | null;
    const fs = document.querySelector('#fs') as HTMLElement | null;

    if (!val) {
      if (ps) ps.style.opacity = '1';
      if (fs) fs.style.opacity = '1';
    } else {
      if (ps && this.playerSlot?.loaded) ps.style.opacity = '0';
      if (fs && this.foeSlot?.loaded) fs.style.opacity = '0';
    }
  }

  public getQuality(): QualityLevel {
    return this.renderer ? this.renderer.getQuality() : 'AUTO';
  }

  public setQuality(level: QualityLevel): void {
    try {
      localStorage.setItem('pkmn_3d_quality', level);
    } catch {}
    if (this.renderer && this.scene) {
      this.renderer.setQuality(level, this.scene);
    }
  }

  public resize(): void {
    if (this.renderer && this.container && this.scene) {
      this.renderer.handleResize(this.container, this.scene.camera);
    }
  }

  public start(): void {
    if (this.renderer && this.scene) {
      this.resize();
      this.renderer.start(this.scene, delta => {
        if (this.playerSlot?.controller) this.playerSlot.controller.update(delta);
        if (this.foeSlot?.controller) this.foeSlot.controller.update(delta);
        if (this.scene) {
          this.scene.updateShadows(this.playerSlot?.wrapper, this.foeSlot?.wrapper);
        }
      });
    }
  }

  public stop(): void {
    if (this.renderer) {
      this.renderer.stop();
    }
  }

  /**
   * Sets up a Pokemon model in the player or foe slot.
   * If loading succeeds: 3D model appears and 2D sprite fades out.
   * If loading fails: 2D sprite remains active as seamless fallback.
   */
  public async setPokemon(
    side: 'p' | 'f',
    pokemonId: number,
    isShiny: boolean = false
  ): Promise<boolean> {
    if (!this.scene) return false;

    const formName = isShiny ? 'shiny' : 'regular';
    const isPlayer = side === 'p';
    const targetSlot = isPlayer ? this.playerSlot : this.foeSlot;

    // If same model already loaded, skip reload
    if (targetSlot && targetSlot.pokemonId === pokemonId && targetSlot.formName === formName && targetSlot.loaded) {
      targetSlot.wrapper.visible = true;
      if (targetSlot.controller) targetSlot.controller.playIdle();
      return true;
    }

    // Clean up previous slot if present
    if (targetSlot) {
      if (targetSlot.controller) targetSlot.controller.dispose();
      this.scene.scene.remove(targetSlot.wrapper);
    }

    const wrapper = new THREE.Group();
    this.scene.scene.add(wrapper);

    const slot: CombatantSlot = {
      pokemonId,
      formName,
      wrapper,
      controller: null,
      loaded: false,
      failed: false,
    };

    if (isPlayer) this.playerSlot = slot;
    else this.foeSlot = slot;

    // Sprite element reference for smooth crossfade
    const sprEl = document.querySelector(isPlayer ? '#ps' : '#fs') as HTMLElement | null;

    if (!this.enabled) {
      if (sprEl) sprEl.style.opacity = '1';
      return false;
    }

    try {
      const loader = Pokemon3DLoader.getInstance();
      const result = await loader.loadPokemon(pokemonId, formName);

      // Verify slot hasn't changed while loading
      const currentSlot = isPlayer ? this.playerSlot : this.foeSlot;
      if (currentSlot !== slot) {
        return false;
      }

      // 1. Center, ground, and normalize scale
      this.scene.normalizeAndGroundModel(result.model, pokemonId);
      wrapper.add(result.model);

      // 2. Position and orient facing opponent
      const basePos = isPlayer ? Pokemon3DConfig.POSITIONS.player : Pokemon3DConfig.POSITIONS.foe;
      const posVec = new THREE.Vector3(basePos.x, basePos.y, basePos.z);
      const rotY = basePos.rotationY;

      // 3. Initialize animation controller
      const controller = new Pokemon3DAnimationController(wrapper, result.animations);
      controller.setBaseTransform(posVec, rotY, new THREE.Vector3(1, 1, 1));
      slot.controller = controller;
      slot.loaded = true;

      // 4. Smoothly hide 2D placeholder sprite now that 3D model is active
      if (sprEl) {
        sprEl.style.transition = 'opacity 0.3s ease-out';
        sprEl.style.opacity = '0';
      }

      return true;
    } catch (err) {
      console.warn(`[Pokemon3DManager] Falling back to 2D sprite for ${side === 'p' ? 'player' : 'foe'} (Pokemon #${pokemonId}):`, err);
      slot.failed = true;
      if (sprEl) {
        sprEl.style.opacity = '1';
      }
      return false;
    }
  }

  /**
   * Coordinates attack animation between attacker and defender.
   */
  public async playAttackAction(
    side: 'p' | 'f',
    _moveName: string,
    isPhysical: boolean = false
  ): Promise<void> {
    if (!this.enabled) return;

    const attackerSlot = side === 'p' ? this.playerSlot : this.foeSlot;
    if (!attackerSlot || !attackerSlot.controller || !attackerSlot.loaded) return;

    const targetPos = side === 'p' ? Pokemon3DConfig.POSITIONS.foe : Pokemon3DConfig.POSITIONS.player;
    const lungeDir = new THREE.Vector3(
      targetPos.x - attackerSlot.controller.basePosition.x,
      0,
      targetPos.z - attackerSlot.controller.basePosition.z
    ).normalize();

    // Subtle camera zoom on physical strikes
    if (isPhysical && this.scene) {
      this.scene.zoomCamera(1.1, 400);
    }

    await attackerSlot.controller.playAttack(lungeDir, isPhysical ? 0.45 : 0.6);
  }

  /**
   * Plays hit reaction (recoil, material flash, camera shake).
   */
  public async playHitReaction(
    side: 'p' | 'f',
    _damage: number,
    isCritical: boolean = false
  ): Promise<void> {
    if (!this.enabled) return;

    const victimSlot = side === 'p' ? this.playerSlot : this.foeSlot;
    if (this.scene) {
      this.scene.shakeCamera(isCritical ? 0.3 : 0.15, isCritical ? 0.4 : 0.25);
    }

    if (victimSlot && victimSlot.controller && victimSlot.loaded) {
      await victimSlot.controller.playHit(isCritical);
    }
  }

  /**
   * Plays faint animation.
   */
  public async playFaintAnimation(side: 'p' | 'f'): Promise<void> {
    if (!this.enabled) return;

    const victimSlot = side === 'p' ? this.playerSlot : this.foeSlot;
    if (victimSlot && victimSlot.controller && victimSlot.loaded) {
      await victimSlot.controller.playFaint();
    }
  }

  /**
   * Plays Pokeball recall animation on switch.
   */
  public async playRecallAnimation(side: 'p' | 'f'): Promise<void> {
    if (!this.enabled) return;

    const slot = side === 'p' ? this.playerSlot : this.foeSlot;
    if (slot && slot.controller && slot.loaded) {
      await slot.controller.playRecall();
    }
  }

  /**
   * Plays entrance animation for switching in a new Pokemon.
   */
  public async playEntranceAnimation(side: 'p' | 'f', pokemonId: number): Promise<void> {
    if (!this.enabled) return;

    await this.setPokemon(side, pokemonId);
    const slot = side === 'p' ? this.playerSlot : this.foeSlot;
    if (slot && slot.controller && slot.loaded) {
      await slot.controller.playEntrance();
    }
  }
}

export const pokemon3DManager = Pokemon3DManager.getInstance();
