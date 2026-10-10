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
    pixelRatioMax: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    particles: true,
  },
  MEDIUM: {
    pixelRatioMax: 1.25,
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

  // Battle positioning in 3D world coordinates (calibrated to align with stadium battle pods)
  POSITIONS: {
    // Player on the stadium field (bottom-left pod, perfectly aligned with red marked ring)
    player: {
      x: -1.2,
      y: 0,
      z: 2.3,
      // Facing toward opponent (top-right along battle diagonal)
      rotationY: 2.356, // 135 deg: perfectly aligns with foe position
    },
    // Opponent on the stadium field (top-right pod, perfectly aligned with blue marked ring)
    foe: {
      x: 1.68,
      y: 0,
      z: -1.05,
      // Facing toward player (bottom-left along battle diagonal)
      rotationY: -0.785, // -45 deg: perfectly aligns with player position
    },
  },

  // Base normalization scale: target height in world units (compact & proportional)
  TARGET_HEIGHT: 1.0,

  // Custom scale adjustments for specific Pokemon species (to reflect canon sizes naturally without clipping)
  SPECIES_SCALE_MODIFIERS: {
    // Large / giant Pokemon
    95: 1.25,  // Onix
    130: 1.22, // Gyarados
    143: 1.18, // Snorlax
    149: 1.15, // Dragonite
    131: 1.15, // Lapras
    6: 1.1,    // Charizard
    9: 1.1,    // Blastoise
    3: 1.1,    // Venusaur
    68: 1.08,  // Machamp
    103: 1.15, // Exeggutor
    144: 1.1,  // Articuno
    145: 1.1,  // Zapdos
    146: 1.15, // Moltres
    150: 1.1,  // Mewtwo

    // Tiny / small Pokemon (scaled to be clearly visible)
    10: 0.95,  // Caterpie
    13: 0.95,  // Weedle
    16: 0.95,  // Pidgey
    19: 0.95,  // Rattata
    25: 0.98,  // Pikachu
    39: 0.98,  // Jigglypuff
    50: 1.0,   // Diglett
    41: 0.95,  // Zubat
    43: 0.95,  // Oddish
    60: 0.9,   // Poliwag
    151: 0.9,  // Mew
  } as Record<number, number>,

  // Species model rotation adjustments (if specific GLB models are modeled facing backwards or 90 deg off)
  SPECIES_ROTATION_OFFSETS: {
    // Default rotation offset applied to all models so they face forward
    DEFAULT: 0,
  } as Record<number, number>,

  // Floating / flying Pokemon vertical ground offsets (proportional to 1.15 height)
  SPECIES_Y_OFFSETS: {
    12: 0.3,   // Butterfree
    15: 0.25,  // Beedrill
    41: 0.3,   // Zubat
    42: 0.35,  // Golbat
    92: 0.25,  // Gastly
    93: 0.25,  // Haunter
    144: 0.3,  // Articuno
    145: 0.3,  // Zapdos
    146: 0.35, // Moltres
    151: 0.25, // Mew
  } as Record<number, number>,
};
