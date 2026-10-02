/**
 * Pokemon3DCache.ts
 * In-memory cache for loaded GLTF models with support for safe skinned-mesh cloning
 * so player and opponent instances never share mutable animation or transform states.
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CachedModelData {
  gltf: GLTF;
  timestamp: number;
}

export class Pokemon3DCache {
  private static instance: Pokemon3DCache;
  private cache: Map<string, CachedModelData> = new Map();
  private maxCachedModels: number = 30;

  private constructor() {}

  public static getInstance(): Pokemon3DCache {
    if (!Pokemon3DCache.instance) {
      Pokemon3DCache.instance = new Pokemon3DCache();
    }
    return Pokemon3DCache.instance;
  }

  private makeKey(pokemonId: number, formName: string = 'regular'): string {
    return `${pokemonId}_${formName.toLowerCase()}`;
  }

  public has(pokemonId: number, formName: string = 'regular'): boolean {
    return this.cache.has(this.makeKey(pokemonId, formName));
  }

  public get(pokemonId: number, formName: string = 'regular'): CachedModelData | undefined {
    const key = this.makeKey(pokemonId, formName);
    const data = this.cache.get(key);
    if (data) {
      data.timestamp = Date.now();
    }
    return data;
  }

  public set(pokemonId: number, formName: string, gltf: GLTF): void {
    const key = this.makeKey(pokemonId, formName);
    if (this.cache.size >= this.maxCachedModels) {
      // Evict oldest entry (LRU)
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache.entries()) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      gltf,
      timestamp: Date.now(),
    });
  }

  /**
   * Creates an independent, cloned instance of the cached model for rendering.
   * Uses SkeletonUtils.clone so skinned meshes and bone hierarchies are cloned properly,
   * preserving independent animation states.
   */
  public createInstance(pokemonId: number, formName: string = 'regular'): { model: THREE.Group; animations: THREE.AnimationClip[] } | null {
    const cached = this.get(pokemonId, formName);
    if (!cached) return null;

    // Clone the scene using SkeletonUtils for skinned meshes
    const clonedScene = SkeletonUtils.clone(cached.gltf.scene) as THREE.Group;

    // Clone animation clips so their tracks can be uniquely bound
    const clonedAnimations = cached.gltf.animations.map(clip => clip.clone());

    // Traverse and ensure materials are cloned if needed, shadows are enabled
    clonedScene.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        // Clone material so hit reaction flashes don't affect other instances
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
      }
    });

    return {
      model: clonedScene,
      animations: clonedAnimations,
    };
  }

  public clear(): void {
    this.cache.clear();
  }
}
