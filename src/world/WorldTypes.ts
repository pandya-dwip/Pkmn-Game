/**
 * WorldTypes.ts
 * Optional world features layered onto RouteDefinition. Existing routes use
 * none of them; special exploration areas (forests, caves, coast, mountains)
 * combine them. Everything stays in flat world coordinates; the 2.5D look
 * comes from the renderer, so collision remains simple and robust.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Visibility / availability predicate evaluated against player progress. */
export interface WorldCondition {
  flag?: string;
  notFlag?: string;
  questActive?: string;
  questCompleted?: string;
  questNotCompleted?: string;
  minBadges?: number;
  keyItem?: string;
}

export type PortalStyle = 'cave' | 'forest_path' | 'trail' | 'stairs_down' | 'stairs_up' | 'dock' | 'cave_exit' | 'cracked_wall';

export interface RoutePortal {
  id: string;
  x: number;
  y: number; // front (walk-in) point
  style: PortalStyle;
  label: string;
  target: number; // destination route / area id
  targetX: number;
  targetY: number;
  /** Hidden portals are invisible until discovered at close range. */
  hidden?: boolean;
  requires?: WorldCondition;
  lockedText?: string;
}

export type WaterKind = 'sea' | 'lake' | 'river' | 'chasm' | 'shallows';

export interface RouteWater extends Rect {
  kind: WaterKind;
  shore?: 'sand' | 'grass' | 'rock';
  zone?: string; // encounter zone for fishing
}

export interface RouteBridge extends Rect {
  style: 'wood' | 'stone' | 'rope' | 'pier';
  vertical?: boolean; // planks run horizontally when walking north/south
}

export type TerrainKind = 'sand' | 'rock' | 'plateau' | 'moss' | 'snow' | 'cave' | 'dirt' | 'wetsand' | 'meadow';

export interface RouteTerrainPatch extends Rect {
  kind: TerrainKind;
  /** Purely visual elevation tier: higher tiers are lit more and cast shadows. */
  tier?: number;
}

export interface RouteBoulder {
  id: string;
  x: number;
  y: number;
  r?: number;
}

export interface RouteSwitch {
  id: string;
  x: number;
  y: number;
  flag: string; // set when a boulder rests on the plate
}

export interface RouteBarrier extends Rect {
  id: string;
  /** Barrier disappears once this flag is set. */
  openFlag: string;
  style: 'rockfall' | 'crystal' | 'vines';
}

export interface RouteLandmark {
  id: string;
  x: number;
  y: number;
  style: 'viewpoint' | 'shrine' | 'ruin' | 'lighthouse' | 'old_tree' | 'monument';
  title: string;
  lines: string[];
}

export interface RouteFishingSpot {
  id: string;
  x: number;
  y: number;
  zone: string;
}

export interface RouteWaterfall {
  x: number;
  y: number; // bottom (pool) line
  w: number;
  h: number; // visual drop height
}

export interface RouteCrystal {
  x: number;
  y: number;
  color: string;
  scale?: number;
  light?: number; // radius of light emitted in dark areas
}

export interface RouteNoticeBoard {
  id: string;
  x: number;
  y: number;
  title: string;
  questIds: string[];
}

export interface RouteStaticEncounter {
  id: string;
  x: number;
  y: number;
  speciesId: number;
  level: number;
  doneFlag: string;
  requires?: WorldCondition;
  intro: string;
}

/** A wandering Pokémon NPC (e.g. a lost Pokémon for an assistance quest). */
export interface RouteLostPokemon {
  id: string;
  x: number;
  y: number;
  speciesId: number;
  requires?: WorldCondition;
  foundFlag: string;
  text: string;
}
