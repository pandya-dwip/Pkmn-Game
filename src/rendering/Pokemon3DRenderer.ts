/**
 * Pokemon3DRenderer.ts
 * Manages the Three.js WebGLRenderer, mobile device capability detection,
 * resolution scaling, quality levels (AUTO, HIGH, MEDIUM, LOW), and responsive resizing.
 */

import * as THREE from 'three';
import { Pokemon3DConfig, type QualityLevel, type QualityConfig, QUALITY_CONFIGS } from '../config/Pokemon3DConfig';
import type { Pokemon3DScene } from './Pokemon3DScene';

export class Pokemon3DRenderer {
  public renderer: THREE.WebGLRenderer;
  public canvas: HTMLCanvasElement;
  private currentQualityLevel: QualityLevel = 'AUTO';
  private activeConfig: QualityConfig;
  private isRendering = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private onUpdateCallback?: (delta: number) => void;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pokemon-3d-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '3'; // Positioned between background SVG (1) and UI cards/effects (4+)

    container.appendChild(this.canvas);

    this.activeConfig = this.detectOptimalQuality();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: this.activeConfig.antialias,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.activeConfig.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.handleResize(container);

    // Responsive resize listener
    window.addEventListener('resize', () => {
      this.handleResize(container);
    });
  }

  /**
   * Detects device performance profile for AUTO quality
   */
  private detectOptimalQuality(): QualityConfig {
    if (typeof navigator === 'undefined') return QUALITY_CONFIGS.MEDIUM;

    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const pixelRatio = window.devicePixelRatio || 1;

    if (isMobile) {
      if (cores <= 4 || pixelRatio > 2.5) {
        return QUALITY_CONFIGS.MEDIUM;
      }
      return QUALITY_CONFIGS.HIGH;
    }

    if (cores >= 8) {
      return QUALITY_CONFIGS.HIGH;
    } else if (cores >= 4) {
      return QUALITY_CONFIGS.HIGH;
    } else {
      return QUALITY_CONFIGS.MEDIUM;
    }
  }

  public setQuality(level: QualityLevel, scene?: Pokemon3DScene): void {
    this.currentQualityLevel = level;
    if (level === 'AUTO') {
      this.activeConfig = this.detectOptimalQuality();
    } else {
      this.activeConfig = QUALITY_CONFIGS[level];
    }

    this.renderer.shadowMap.enabled = this.activeConfig.shadows;
    const maxPr = this.activeConfig.pixelRatioMax;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPr));

    if (scene) {
      scene.applyQuality(this.activeConfig);
    }
  }

  private boundCamera: THREE.PerspectiveCamera | null = null;

  public getQuality(): QualityLevel {
    return this.currentQualityLevel;
  }

  public handleResize(container: HTMLElement, camera?: THREE.PerspectiveCamera): void {
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 480;

    const maxPr = this.activeConfig.pixelRatioMax;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPr));
    this.renderer.setSize(width, height, false);

    const activeCam = camera || this.boundCamera;
    if (activeCam) {
      const aspect = width / height;
      activeCam.aspect = aspect;

      // Preserve horizontal framing on narrow / mobile viewports so Pokémon are never cut off
      const baseAspect = 1.25;
      if (aspect < baseAspect) {
        const defaultFovRad = (36 * Math.PI) / 180;
        const targetHRad = 2 * Math.atan(Math.tan(defaultFovRad / 2) * baseAspect);
        const newVFovRad = 2 * Math.atan(Math.tan(targetHRad / 2) / aspect);
        activeCam.fov = (newVFovRad * 180) / Math.PI;
      } else {
        activeCam.fov = 36;
      }
      activeCam.updateProjectionMatrix();
    }
  }

  /**
   * Starts the animation loop
   */
  public start(scene: Pokemon3DScene, onUpdate: (delta: number) => void): void {
    this.boundCamera = scene.camera;
    this.handleResize(this.canvas.parentElement || document.body, scene.camera);

    if (this.isRendering) return;
    this.isRendering = true;
    this.onUpdateCallback = onUpdate;
    this.lastTime = performance.now();

    const loop = (now: number) => {
      if (!this.isRendering) return;

      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      // Update scene, animations, and camera
      scene.update(delta);
      if (this.onUpdateCallback) {
        this.onUpdateCallback(delta);
      }

      // Render Three.js scene
      this.renderer.render(scene.scene, scene.camera);

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pauses the animation loop to save power when battle is hidden
   */
  public stop(): void {
    this.isRendering = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
