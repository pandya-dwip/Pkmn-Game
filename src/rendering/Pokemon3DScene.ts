/**
 * Pokemon3DScene.ts
 * Manages the Three.js 3D scene, outdoor sunlight and ambient bounce lighting,
 * dynamic ground contact shadows, and responsive perspective battle camera with shake/zoom.
 */

import * as THREE from 'three';
import { Pokemon3DConfig, type QualityConfig, QUALITY_CONFIGS } from '../config/Pokemon3DConfig';

export class Pokemon3DScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Shadow projection meshes (soft radial gradient ground shadows)
  private playerShadow: THREE.Mesh;
  private foeShadow: THREE.Mesh;

  // Camera animation baselines
  private defaultCameraPos = new THREE.Vector3(0, 3.0, 7.8);
  private defaultCameraTarget = new THREE.Vector3(0, 0.85, 0);
  private currentCameraPos = new THREE.Vector3();
  private currentCameraTarget = new THREE.Vector3();

  private shakeIntensity = 0;
  private shakeTimer = 0;
  private zoomFactor = 1.0;
  private targetZoomFactor = 1.0;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent to see the outdoor SVG stadium

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.currentCameraPos.copy(this.defaultCameraPos);
    this.currentCameraTarget.copy(this.defaultCameraTarget);
    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this.currentCameraTarget);

    // Lighting setup matching Kanto outdoor arena
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(this.ambientLight);

    // Key sunlight from top-right
    this.dirLight = new THREE.DirectionalLight(0xfffae2, 2.2);
    this.dirLight.position.set(6, 12, 7);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 30;
    const d = 4.5;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Sky / Grass ambient color bounce
    this.hemiLight = new THREE.HemisphereLight(0x8fbbe6, 0x2a6122, 0.8);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    // Ground shadows
    const shadowTex = this.createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const playerGeo = new THREE.PlaneGeometry(1.6, 1.1);
    this.playerShadow = new THREE.Mesh(playerGeo, shadowMat.clone());
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.set(Pokemon3DConfig.POSITIONS.player.x, 0.02, Pokemon3DConfig.POSITIONS.player.z);
    this.scene.add(this.playerShadow);

    const foeGeo = new THREE.PlaneGeometry(1.4, 0.95);
    this.foeShadow = new THREE.Mesh(foeGeo, shadowMat.clone());
    this.foeShadow.rotation.x = -Math.PI / 2;
    this.foeShadow.position.set(Pokemon3DConfig.POSITIONS.foe.x, 0.02, Pokemon3DConfig.POSITIONS.foe.z);
    this.scene.add(this.foeShadow);
  }

  /**
   * Generates a soft radial gradient shadow texture using Canvas
   */
  private createShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 20, 5, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 20, 5, 0.35)');
    grad.addColorStop(1, 'rgba(0, 20, 5, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  public updateShadows(playerModel?: THREE.Object3D | null, foeModel?: THREE.Object3D | null): void {
    if (playerModel && playerModel.visible) {
      this.playerShadow.position.x = playerModel.position.x;
      this.playerShadow.position.z = playerModel.position.z;
      // Adjust shadow size and opacity based on jump height
      const h = Math.max(0, playerModel.position.y);
      const scale = Math.max(0.2, 1.0 - h * 0.2);
      this.playerShadow.scale.set(scale, scale, 1);
      (this.playerShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - h * 0.2);
      this.playerShadow.visible = true;
    } else {
      this.playerShadow.visible = false;
    }

    if (foeModel && foeModel.visible) {
      this.foeShadow.position.x = foeModel.position.x;
      this.foeShadow.position.z = foeModel.position.z;
      const h = Math.max(0, foeModel.position.y - Pokemon3DConfig.POSITIONS.foe.y);
      const scale = Math.max(0.2, 1.0 - h * 0.2);
      this.foeShadow.scale.set(scale, scale, 1);
      (this.foeShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - h * 0.2);
      this.foeShadow.visible = true;
    } else {
      this.foeShadow.visible = false;
    }
  }

  /**
   * Applies camera shake
   */
  public shakeCamera(intensity: number = 0.2, duration: number = 0.35): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  /**
   * Applies camera zoom (e.g. for attack impact)
   */
  public zoomCamera(factor: number = 1.15, durationMs: number = 400): void {
    this.targetZoomFactor = factor;
    setTimeout(() => {
      this.targetZoomFactor = 1.0;
    }, durationMs);
  }

  /**
   * Normalizes, centers and grounds a Pokemon model to Y=0
   */
  public normalizeAndGroundModel(model: THREE.Group, pokemonId: number): void {
    // 1. Calculate raw bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // 2. Center geometry horizontally and ground bottom at Y = 0
    model.position.x -= center.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;

    // 3. Scale normalization
    const maxDim = Math.max(size.x, size.y, size.z);
    let scaleMultiplier = Pokemon3DConfig.SPECIES_SCALE_MODIFIERS[pokemonId] || 1.0;
    const baseScale = (Pokemon3DConfig.TARGET_HEIGHT / Math.max(0.1, maxDim)) * scaleMultiplier;

    // Wrap in a parent group so position/rotation can be cleanly animated without losing centering
    const wrapper = new THREE.Group();
    wrapper.add(model);
    model.scale.set(baseScale, baseScale, baseScale);

    // Flying / floating offset if applicable
    const yOffset = Pokemon3DConfig.SPECIES_Y_OFFSETS[pokemonId] || 0;
    model.position.y += yOffset;
  }

  public applyQuality(quality: QualityConfig): void {
    this.dirLight.castShadow = quality.shadows;
    if (quality.shadows) {
      this.dirLight.shadow.mapSize.width = quality.shadowMapSize;
      this.dirLight.shadow.mapSize.height = quality.shadowMapSize;
      if (this.dirLight.shadow.map) {
        this.dirLight.shadow.map.dispose();
        this.dirLight.shadow.map = null as any;
      }
    }
  }

  public update(delta: number): void {
    // Camera zoom interpolation
    this.zoomFactor += (this.targetZoomFactor - this.zoomFactor) * (delta * 8);

    // Camera shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.camera.position.x = this.currentCameraPos.x + shakeX;
    this.camera.position.y = this.currentCameraPos.y + shakeY;
    this.camera.position.z = this.currentCameraPos.z / this.zoomFactor;
    this.camera.lookAt(this.currentCameraTarget);
  }
}
