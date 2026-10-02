/**
 * Pokemon3DApiService.ts
 * Communicates with the Pokemon 3D API ecosystem, caches model metadata,
 * and resolves GLB URLs for all 151 Kanto Pokemon and their variants (regular, shiny, mega, etc.).
 */

import { Pokemon3DConfig } from '../config/Pokemon3DConfig';

export interface Pokemon3DForm {
  name: string;
  model: string;
  formName: string;
}

export interface Pokemon3DEntry {
  id: number;
  forms: Pokemon3DForm[];
}

const CACHE_STORAGE_KEY = 'pokemon_3d_api_metadata_v1';

export class Pokemon3DApiService {
  private static instance: Pokemon3DApiService;
  private metadataCache: Map<number, Pokemon3DEntry> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): Pokemon3DApiService {
    if (!Pokemon3DApiService.instance) {
      Pokemon3DApiService.instance = new Pokemon3DApiService();
    }
    return Pokemon3DApiService.instance;
  }

  /**
   * Initializes the API service.
   * Loads cached metadata from localStorage if present, then asynchronously refreshes from the API.
   * If the API fails or is slow, falls back to direct deterministic GitHub raw asset URLs without throwing.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // 1. Try loading from localStorage first for instant startup
      try {
        const stored = localStorage.getItem(CACHE_STORAGE_KEY);
        if (stored) {
          const parsed: Pokemon3DEntry[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const entry of parsed) {
              this.metadataCache.set(entry.id, entry);
            }
            this.isInitialized = true;
          }
        }
      } catch (err) {
        console.warn('[Pokemon3DApiService] Failed reading cached metadata from localStorage:', err);
      }

      // 2. Fetch fresh dataset from API endpoint if not cached or in background
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(Pokemon3DConfig.API_BASE_URL, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data: Pokemon3DEntry[] = await response.json();
          if (Array.isArray(data)) {
            for (const entry of data) {
              this.metadataCache.set(entry.id, entry);
            }
            try {
              localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
            } catch {
              // Ignore localStorage quota exceeded
            }
            this.isInitialized = true;
            return;
          }
        } else {
          console.warn(`[Pokemon3DApiService] API responded with status ${response.status}. Using deterministic fallback.`);
        }
      } catch (err) {
        console.warn('[Pokemon3DApiService] Could not reach Pokemon 3D API endpoint directly. Falling back to raw asset structure:', err);
      }

      this.isInitialized = true;
    })();

    return this.initPromise;
  }

  /**
   * Returns the direct GLB URL for a given Pokemon ID and form.
   * Uses API metadata if available, otherwise generates the canonical GitHub raw asset URL.
   */
  public getPokemonModel(pokemonId: number, formName: string = 'regular'): string {
    const entry = this.metadataCache.get(pokemonId);
    if (entry && entry.forms && entry.forms.length > 0) {
      const match = entry.forms.find(f => f.formName.toLowerCase() === formName.toLowerCase());
      if (match && match.model) {
        return match.model;
      }
      // If requested form not found, fall back to first available form
      if (entry.forms[0] && entry.forms[0].model) {
        return entry.forms[0].model;
      }
    }

    // Deterministic fallback URL directly to the official project's raw asset repository
    const safeForm = formName.toLowerCase() === 'shiny' ? 'shiny' : 'regular';
    return `${Pokemon3DConfig.ASSETS_RAW_BASE_URL}/${safeForm}/${pokemonId}.glb`;
  }

  /**
   * Returns the regular model GLB URL
   */
  public getRegularModel(pokemonId: number): string {
    return this.getPokemonModel(pokemonId, 'regular');
  }

  /**
   * Returns the shiny model GLB URL
   */
  public getShinyModel(pokemonId: number): string {
    return this.getPokemonModel(pokemonId, 'shiny');
  }

  /**
   * Preloads the model for an upcoming Pokemon
   */
  public preloadPokemon(pokemonId: number, formName: string = 'regular'): void {
    const url = this.getPokemonModel(pokemonId, formName);
    // Pre-warm browser cache via low-priority fetch
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch(url, { mode: 'cors' }).catch(() => {
        // Silently ignore preload errors
      });
    }
  }

  /**
   * Returns all available forms for a given Pokemon ID
   */
  public getAvailableForms(pokemonId: number): string[] {
    const entry = this.metadataCache.get(pokemonId);
    if (entry && entry.forms) {
      return entry.forms.map(f => f.formName);
    }
    return ['regular', 'shiny'];
  }
}
