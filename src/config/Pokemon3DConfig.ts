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
    // Player on the grass field directly above player's info box (bottom-left)
    player: {
      x: -1.35,
      y: 0,
      z: 1.2,
      // Facing toward opponent (top-right along battle diagonal)
      rotationY: 2.356, // 135 deg: perfectly aligns with foe position (+2.8, -2.8)
    },
    // Opponent on the grass field aligned with opponent's info box (top-right)
    foe: {
      x: 1.45,
      y: 0,
      z: -1.6,
      // Facing toward player (bottom-left along battle diagonal)
      rotationY: -0.785, // -45 deg: perfectly aligns with player position (-2.8, +2.8)
    },
  },

  // Base normalization scale: target height in world units (compact & proportional)
  TARGET_HEIGHT: 1.15,

  // Custom scale adjustments for specific Pokemon species (to reflect canon sizes naturally)
  SPECIES_SCALE_MODIFIERS: {
    // Large / giant Pokemon
    95: 1.35,  // Onix
    130: 1.3,  // Gyarados
    143: 1.25, // Snorlax
    149: 1.2,  // Dragonite
    131: 1.2,  // Lapras
    6: 1.15,   // Charizard
    9: 1.15,   // Blastoise
    3: 1.15,   // Venusaur
    68: 1.1,   // Machamp
    103: 1.2,  // Exeggutor
    144: 1.15, // Articuno
    145: 1.15, // Zapdos
    146: 1.2,  // Moltres
    150: 1.15, // Mewtwo

    // Tiny / small Pokemon (scaled to be clearly visible)
    10: 0.9,   // Caterpie
    13: 0.9,   // Weedle
    16: 0.9,   // Pidgey
    19: 0.9,   // Rattata
    25: 0.95,  // Pikachu
    39: 0.95,  // Jigglypuff
    50: 1.0,   // Diglett
    41: 0.9,   // Zubat
    43: 0.9,   // Oddish
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
