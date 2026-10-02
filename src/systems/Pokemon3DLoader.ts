/**
 * Pokemon3DLoader.ts
 * Loads GLB models from the Pokemon 3D API using Three.js GLTFLoader
 * with DRACOLoader decompression configured for Draco-compressed meshes.
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Pokemon3DConfig } from '../config/Pokemon3DConfig';
import { Pokemon3DApiService } from '../services/Pokemon3DApiService';
import { Pokemon3DCache } from './Pokemon3DCache';

export interface LoadedPokemonResult {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
  pokemonId: number;
  formName: string;
}

export class Pokemon3DLoader {
  private static instance: Pokemon3DLoader;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private loadingPromises: Map<string, Promise<GLTF>> = new Map();

  private constructor() {
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();

    // Configure Draco decoder path (local public/draco/ files)
    this.dracoLoader.setDecoderPath(Pokemon3DConfig.DRACO_DECODER_PATH);
    this.dracoLoader.setDecoderConfig({ type: 'js' });
    this.dracoLoader.preload();

    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  public static getInstance(): Pokemon3DLoader {
    if (!Pokemon3DLoader.instance) {
      Pokemon3DLoader.instance = new Pokemon3DLoader();
    }
    return Pokemon3DLoader.instance;
  }

  private makeKey(pokemonId: number, formName: string): string {
    return `${pokemonId}_${formName.toLowerCase()}`;
  }

  /**
   * Loads a Pokemon model by ID and form.
   * Checks cache first; if missing, fetches and parses the GLB with Draco decompression.
   * Returns an independent cloned instance with cloned animation tracks.
   */
  public async loadPokemon(
    pokemonId: number,
    formName: string = 'regular',
    onProgress?: (percent: number) => void
  ): Promise<LoadedPokemonResult> {
    const cache = Pokemon3DCache.getInstance();
    const key = this.makeKey(pokemonId, formName);

    // 1. If already cached, create and return an independent cloned instance
    if (cache.has(pokemonId, formName)) {
      const cloned = cache.createInstance(pokemonId, formName);
      if (cloned) {
        return {
          model: cloned.model,
          animations: cloned.animations,
          pokemonId,
          formName,
        };
      }
    }

    // 2. Resolve model URL via API service
    const apiService = Pokemon3DApiService.getInstance();
    await apiService.initialize();
    const modelUrl = apiService.getPokemonModel(pokemonId, formName);

    // 3. De-duplicate in-flight requests for the same model
    let loadPromise = this.loadingPromises.get(key);
    if (!loadPromise) {
      loadPromise = new Promise<GLTF>((resolve, reject) => {
        this.gltfLoader.load(
          modelUrl,
          gltf => {
            cache.set(pokemonId, formName, gltf);
            this.loadingPromises.delete(key);
            resolve(gltf);
          },
          event => {
            if (event.lengthComputable && onProgress) {
              const pct = (event.loaded / event.total) * 100;
              onProgress(pct);
            }
          },
          error => {
            this.loadingPromises.delete(key);
            console.warn(`[Pokemon3DLoader] Failed to load 3D model for Pokemon #${pokemonId} from ${modelUrl}:`, error);
            reject(error);
          }
        );
      });
      this.loadingPromises.set(key, loadPromise);
    }

    await loadPromise;

    // 4. Return independent cloned instance
    const cloned = cache.createInstance(pokemonId, formName);
    if (!cloned) {
      throw new Error(`Failed to clone instance for Pokemon #${pokemonId}`);
    }

    return {
      model: cloned.model,
      animations: cloned.animations,
      pokemonId,
      formName,
    };
  }

  /**
   * Disposes loaders
   */
  public dispose(): void {
    this.dracoLoader.dispose();
  }
}
