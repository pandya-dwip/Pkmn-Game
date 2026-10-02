/**
 * Pokemon3DConfig.ts
 * Configuration, API URLs, model scales, orientation overrides, and rendering quality presets.
 */

export type QualityLevel = 'AUTO' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface QualityConfig {
  pixelRatioMax: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  particles: boolean;
}

export const QUALITY_CONFIGS: Record<Exclude<QualityLevel, 'AUTO'>, QualityConfig> = {
  HIGH: {
    pixelRatioMax: 2.0,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    particles: true,
  },
  MEDIUM: {
    pixelRatioMax: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 512,
    particles: true,
  },
  LOW: {
    pixelRatioMax: 1.0,
    antialias: false,
    shadows: false,
    shadowMapSize: 256,
    particles: false,
  },
};

export const Pokemon3DConfig = {
  // Official Pokemon 3D API endpoint
  API_BASE_URL: 'https://pokemon-3d-api.onrender.com/v1/pokemon',

  // Raw GitHub assets base fallback for instantaneous loading and offline resilience
  ASSETS_RAW_BASE_URL: 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt',

  // Local Draco decoder files served from /public/draco/
  DRACO_DECODER_PATH: '/draco/',

  // Battle positioning in 3D world coordinates
  POSITIONS: {
    // Player on the lower-left foreground
    player: {
      x: -1.75,
      y: 0,
      z: 1.2,
      // Facing toward opponent (top-right)
      rotationY: Math.PI * 0.32,
    },
    // Opponent on the upper-right midground
    foe: {
      x: 1.6,
      y: 0.3,
      z: -1.2,
      // Facing toward player (bottom-left)
      rotationY: -Math.PI * 0.68,
    },
  },

  // Base normalization scale: target height in world units
  TARGET_HEIGHT: 1.8,

  // Custom scale adjustments for specific Pokemon species (to reflect canon sizes naturally)
  SPECIES_SCALE_MODIFIERS: {
    // Large / giant Pokemon
    95: 1.55,  // Onix
    130: 1.45, // Gyarados
    143: 1.4,  // Snorlax
    149: 1.35, // Dragonite
    131: 1.3,  // Lapras
    6: 1.25,   // Charizard
    9: 1.2,    // Blastoise
    3: 1.2,    // Venusaur
    68: 1.2,   // Machamp
    103: 1.35, // Exeggutor
    144: 1.3,  // Articuno
    145: 1.3,  // Zapdos
    146: 1.35, // Moltres
    150: 1.3,  // Mewtwo

    // Tiny / small Pokemon
    10: 0.75,  // Caterpie
    13: 0.75,  // Weedle
    16: 0.8,   // Pidgey
    19: 0.8,   // Rattata
    25: 0.85,  // Pikachu
    39: 0.85,  // Jigglypuff
    50: 0.75,  // Diglett
    41: 0.8,   // Zubat
    43: 0.8,   // Oddish
    60: 0.8,   // Poliwag
    151: 0.8,  // Mew
  } as Record<number, number>,

  // Species model rotation adjustments (if specific GLB models are modeled facing backwards or 90 deg off)
  SPECIES_ROTATION_OFFSETS: {
    // Default rotation offset applied to all models so they face forward
    DEFAULT: 0,
  } as Record<number, number>,

  // Floating / flying Pokemon vertical ground offsets
  SPECIES_Y_OFFSETS: {
    12: 0.6,  // Butterfree
    15: 0.5,  // Beedrill
    41: 0.65, // Zubat
    42: 0.7,  // Golbat
    92: 0.5,  // Gastly
    93: 0.45, // Haunter
    144: 0.6, // Articuno
    145: 0.6, // Zapdos
    146: 0.7, // Moltres
    151: 0.55,// Mew
  } as Record<number, number>,
};
