/**
 * LocationEnvironment.ts
 * Structured 3D environment configuration for every location in the game.
 *
 * Each journey route (0-8) is one continuous map made of route sections and
 * a city section; each special area (101-109) is its own map. A location is
 * described by global look (sky, fog, light, camera) plus x-ordered zones
 * (one per route / city section) that choose trees, houses, civic buildings,
 * decorations and ground cover. The renderer never special-cases a location;
 * to change how a place looks, edit its entry here.
 *
 * Model keys: (none) Quaternius, k: Kenney Nature, t: Kenney Fantasy Town,
 * s: Kenney Suburban, c: Kenney Commercial, p: poly.pizza (mixed CC0 / CC-BY
 * authors, see public/models/SOURCES.md); "#variant" recolours foliage.
 */

import type { RouteTreeType, FoliageColorVariant, RouteDefinition } from '../systems/RouteExplorationEngine';

/** [model key, relative weight, target height (world units, before global tree scale)] */
export type WeightedModel = [string, number, number];

export interface CameraConfig {
  /** Boom length behind the trainer. */
  dist: number;
  /** Camera height at full boom. */
  height: number;
  /** How far ahead of the trainer the camera aims. */
  lookAhead: number;
  /** Height of the aim point. */
  lookHeight: number;
  /** Closest the boom may pull in when something is in the way. */
  minDist: number;
}

/**
 * open: free lawn · roadside: beside paths · building: around houses · water: on ponds / lakes ·
 * edge: just beyond the walkable boundary · offshore: out on the zone's sea / river ·
 * shore: straddling the water's edge (docks, bridges) · backdrop: huge landmark on the northern skyline
 */
export type DecorPlacement = 'open' | 'roadside' | 'building' | 'water' | 'edge' | 'offshore' | 'shore' | 'backdrop';

export interface DecorRule {
  models: WeightedModel[];
  /** Attempts per 1000 world units of zone width. */
  density: number;
  where: DecorPlacement;
  /** Size models by height ('y', default) or footprint ('xz'). */
  fit?: 'y' | 'xz';
  /** Solid decorations block the trainer (3D view only) and the camera boom. */
  solid?: number;
}

export interface ZoneEnv {
  /** World x where this zone starts (zones are ordered). */
  from: number;
  label: string;
  /** Per tree type model overrides ('*' = any type); unset types use the reference mapping. */
  treeSkin?: Partial<Record<RouteTreeType | '*', WeightedModel[]>>;
  /** Filler trees for open lawn: [type, colour, probability band]. Bands are cumulative over a 0..1 roll. */
  filler: [RouteTreeType, FoliageColorVariant, number][];
  /** Forest beyond the map edges (default: derived from `filler`). */
  ringTrees?: WeightedModel[];
  /** Spacing of the filler grid (default 68). */
  fillSpacing?: number;
  /** Fraction of ring positions that get a tree (default all): sparse for barren places. */
  ringDensity?: number;
  /** Models for ordinary houses, and the colour-map variations they may wear. */
  houses: string[];
  houseSkins: string[];
  /** Pokémon Center / Mart / Gym / Gate models. */
  civic?: Partial<Record<'center' | 'mart' | 'gym' | 'gate' | 'stadium', string>>;
  /** Cap on building height (world units); tall models shrink to fit. */
  maxBuildingHeight?: number;
  decor: DecorRule[];
  /** Ground cover on open lawn. */
  lawn: 'lush' | 'meadow' | 'dry' | 'sparse' | 'none';
  /** Ground tile for this zone (defaults to the location's baseGround). */
  ground?: LocationEnv['baseGround'];
  /** Model used for knee-high encounter grass. */
  tallGrass?: string;
  /** Model for the plaza fountain(s) in this zone (each city has its own). */
  fountain?: string;
  /** Scenic water just beyond the walkable edge: a river to the north or open sea to the south. */
  edgeWater?: { side: 'north' | 'south'; kind: 'river' | 'sea' };
}

export interface LocationEnv {
  sky: [string, string, string];
  fog: { color: number; near: number; far: number };
  hemi: { sky: number; ground: number; intensity: number };
  sun: { color: number; intensity: number; dir: [number, number, number] };
  /** Ground tile under the route art (and beyond the map edges). */
  baseGround: 'grass' | 'meadow' | 'dry' | 'sand' | 'rock' | 'snow' | 'ash' | 'cave';
  /** What surrounds the walkable map. */
  ring: 'forest' | 'cliffs' | 'skyline' | 'sea' | 'none';
  camera: CameraConfig;
  /** Underground: no sky, the trainer carries a lantern, crystals glow. */
  underground?: boolean;
  /** Instances further than this are culled (fog hides the cut). */
  drawDistance: number;
  zones: ZoneEnv[];
}

// ---------------------------------------------------------------------------
// Shared building / tree palettes
// ---------------------------------------------------------------------------

const SUBURBAN_REFERENCE = ['a', 'c', 'd', 'f', 'h', 'k'].map(c => 's:building-type-' + c);
const SKIN_REFERENCE = ['suburban/Textures/colormap.png', 'suburban/Textures/variation-b.png', 'suburban/Textures/variation-c.png'];
const S = (...ids: string[]) => ids.map(c => 's:building-type-' + c);
const SKIN = (...v: string[]) => v.map(x => `suburban/Textures/${x}.png`);
const CSKIN = (...v: string[]) => v.map(x => `commercial/Textures/${x}.png`);

const CAMERA_OPEN: CameraConfig = { dist: 110, height: 62, lookAhead: 50, lookHeight: 14, minDist: 36 };
const CAMERA_CITY: CameraConfig = { dist: 104, height: 60, lookAhead: 48, lookHeight: 14, minDist: 34 };
const CAMERA_FOREST: CameraConfig = { dist: 96, height: 54, lookAhead: 44, lookHeight: 14, minDist: 30 };
const CAMERA_MOUNTAIN: CameraConfig = { dist: 116, height: 70, lookAhead: 52, lookHeight: 14, minDist: 34 };
const CAMERA_CAVE: CameraConfig = { dist: 84, height: 50, lookAhead: 40, lookHeight: 14, minDist: 28 };

const SKY_DAY: [string, string, string] = ['#5fb4ea', '#a9dcf3', '#e6f6ea'];
const LIGHT_DAY = { hemi: { sky: 0xeaf6ff, ground: 0x4a6b3a, intensity: 2.2 }, sun: { color: 0xfff1d6, intensity: 2.4, dir: [-1, 2.2, -0.8] as [number, number, number] } };

// --- Trees (Quaternius MegaKit = no prefix, poly.pizza = p:) ---------------
const FOREST_TREES: WeightedModel[] = [
  ['CommonTree_4#dark', 3, 94],
  ['CommonTree_3', 1, 96],
  ['Pine_4', 1, 98],
  ['p:spruce', 2, 104],
  ['p:willow_big', 1, 92],
];
const FOREST_CONIFERS: WeightedModel[] = [
  ['Pine_4', 2, 100],
  ['Pine_5', 2, 104],
  ['p:spruce', 2, 108],
];
const MOUNTAIN_TREES: WeightedModel[] = [
  ['Pine_2', 2, 92],
  ['Pine_5', 2, 100],
  ['p:spruce', 3, 104],
];
const PALMS: WeightedModel[] = [
  ['p:palm_a', 3, 96],
  ['p:palm_b', 2, 92],
  ['p:palm_lean', 2, 98],
  ['p:palm_tall', 1, 106],
  ['p:palm_bent', 1, 82],
];
// Faceted 'blob canopy' species (cherry, willow, maple, round oak) read much bulkier than the
// airy Quaternius trees, so they are kept smaller and used as accents.
const VIRIDIAN_TREES: WeightedModel[] = [
  ['CommonTree_2', 2, 88],
  ['CommonTree_3', 2, 92],
  ['CommonTree_4#dark', 1, 90],
  ['p:willow', 1, 56],
];
const PEWTER_TREES: WeightedModel[] = [
  ['p:spruce', 3, 98],
  ['Pine_2', 2, 90],
  ['CommonTree_4#dark', 1, 88],
];
const CERULEAN_TREES: WeightedModel[] = [
  ['p:willow', 2, 56],
  ['p:willow_big', 1, 84],
  ['CommonTree_5', 2, 66],
  ['CommonTree_3', 2, 90],
  ['p:cherry', 1, 50],
];
const LAVENDER_TREES: WeightedModel[] = [
  ['p:autumn', 2, 86],
  ['p:birch', 2, 92],
  ['p:maple_red', 1, 58],
  ['CommonTree_2', 2, 88],
];
const CELADON_TREES: WeightedModel[] = [
  ['p:cherry', 3, 52],
  ['p:blossom_white', 2, 58],
  ['p:cypress', 2, 92],
  ['p:poplar', 1, 96],
];
const SAVANNA_TREES: WeightedModel[] = [
  ['p:acacia', 3, 86],
  ['p:savanna', 2, 80],
  ['p:flattop', 2, 78],
];
const FUCHSIA_TREES: WeightedModel[] = [
  ['p:bamboo', 3, 84],
  ['CommonTree_3', 2, 92],
  ['p:cherry', 1, 52],
  ['CommonTree_4#dark', 1, 90],
];
const SILPH_TREES: WeightedModel[] = [
  ['p:poplar', 3, 96],
  ['p:oak_round', 1, 54],
  ['p:birch', 2, 90],
];
const SAFFRON_TREES: WeightedModel[] = [
  ['p:poplar', 3, 96],
  ['p:cypress', 2, 92],
];
const VOLCANIC_TREES: WeightedModel[] = [
  ['p:dead_pale', 3, 74],
  ['p:dead_dark', 2, 80],
  ['p:palm_bent', 1, 80],
];
const INDIGO_TREES: WeightedModel[] = [
  ['p:cypress', 3, 98],
  ['p:spruce', 2, 100],
  ['CommonTree_5', 1, 66],
];
const SNOW_TREES: WeightedModel[] = [
  ['p:pine_snow', 3, 100],
  ['p:birch_snow', 2, 90],
  ['Pine_4#snow', 1, 96],
];
const GROVE_TREES: WeightedModel[] = [
  ['CommonTree_4#dark', 3, 104],
  ['p:willow_big', 2, 100],
  ['p:dead_dark', 1, 92],
];

// --- Decoration sets ---------------------------------------------------------
const ROCKS_SMALL: WeightedModel[] = [['k:rock_smallA', 1, 10], ['k:rock_smallC', 1, 9], ['k:rock_smallFlatA', 1, 6]];
const BOULDERS: WeightedModel[] = [['k:rock_largeA', 1, 22], ['k:rock_largeB', 1, 26], ['k:rock_largeD', 1, 30], ['k:rock_largeC', 1, 22]];
const SPIRES: WeightedModel[] = [['k:rock_tallA', 2, 58], ['k:rock_tallB', 1, 52], ['k:rock_tallC', 1, 64], ['k:rock_tallE', 1, 34]];
const STONE_SPIRES: WeightedModel[] = [['k:stone_tallA', 2, 60], ['k:stone_tallC', 1, 66], ['k:stone_tallE', 1, 36], ['k:stone_largeA', 1, 24], ['k:stone_largeC', 1, 26]];
const FOREST_FLOOR: WeightedModel[] = [
  ['k:mushroom_red', 2, 9],
  ['k:mushroom_tanGroup', 2, 10],
  ['k:log', 2, 10],
  ['k:stump_old', 2, 12],
  ['k:stump_round', 1, 10],
  ['Fern_1', 3, 22],
  ['Bush_Common_Flowers', 2, 20],
];
const FLOWERS: WeightedModel[] = [['k:flower_redA', 1, 12], ['k:flower_yellowA', 1, 11], ['k:flower_purpleA', 1, 12], ['Flower_3_Group', 2, 14], ['Flower_4_Group', 2, 14]];
const BUSHES: WeightedModel[] = [['Bush_Common_Flowers', 3, 20], ['k:plant_bushLarge', 1, 18], ['k:plant_bushDetailed', 1, 20]];
const URBAN_PROPS: WeightedModel[] = [['p:streetlight', 3, 52], ['s:planter', 2, 14], ['t:stall-bench', 1, 16]];
const LANTERNS: WeightedModel[] = [['p:lantern_post', 1, 34]];
const HARBOUR: WeightedModel[] = [['p:container_red', 2, 22], ['p:container_grey', 2, 22], ['k:log_stack', 1, 18], ['t:cart', 1, 24]];
const RUINS: WeightedModel[] = [['k:statue_column', 2, 56], ['k:statue_columnDamaged', 3, 40], ['k:statue_block', 2, 16], ['k:statue_head', 1, 40]];
const CAMP: WeightedModel[] = [['k:tent_detailedOpen', 1, 34], ['k:tent_smallClosed', 1, 30], ['k:campfire_stones', 1, 6], ['k:log_large', 1, 14]];
const FARM: WeightedModel[] = [['k:crops_cornStageD', 3, 30], ['k:crops_wheatStageB', 3, 18], ['k:crop_pumpkin', 2, 10]];
const CACTI: WeightedModel[] = [['k:cactus_short', 1, 18], ['k:cactus_tall', 1, 28]];
const LILIES: WeightedModel[] = [['k:lily_large', 2, 14], ['k:lily_small', 1, 10]];
const SMALL_BOATS: WeightedModel[] = [['p:sailboat', 2, 40], ['k:canoe', 1, 10]];

/** Route 0's reference zones (Pallet Valley / Route 1). Do not restyle: other places are tuned against it. */
const REFERENCE_MEADOW: ZoneEnv['filler'] = [['conifer', 'standard', 0.25], ['mature', 'standard', 0.3], ['broadleaf', 'standard', 0.15]];

function zone(from: number, label: string, z: Partial<ZoneEnv>): ZoneEnv {
  return {
    from,
    label,
    filler: REFERENCE_MEADOW,
    houses: SUBURBAN_REFERENCE,
    houseSkins: SKIN_REFERENCE,
    decor: [],
    lawn: 'lush',
    ...z,
  };
}

function outdoor(zones: ZoneEnv[], o: Partial<LocationEnv> = {}): LocationEnv {
  return {
    sky: SKY_DAY,
    fog: { color: 0xcfe9f2, near: 420, far: 920 },
    ...LIGHT_DAY,
    baseGround: 'grass',
    ring: 'forest',
    camera: CAMERA_OPEN,
    drawDistance: 900,
    zones,
    ...o,
  };
}

// ---------------------------------------------------------------------------
// Journey routes 0-8 (route sections + their cities)
// ---------------------------------------------------------------------------

const ENVIRONMENTS: Record<number, LocationEnv> = {
  // Pallet Valley -> Route 1 -> Viridian City (the route sections are the reference implementation)
  0: outdoor([
    zone(0, 'Pallet Valley', {}),
    zone(640, 'Blossom Terrace / Clear Creek', { filler: [['blossom', 'blossom', 0.6], ['broadleaf', 'standard', 0.1]] }),
    zone(1340, 'Deep Ancient Sanctuary', { filler: [['conifer', 'dark', 0.4], ['dense_forest', 'dark', 0.3]] }),
    // Viridian: a green woodland town of timber cottages and log cabins
    zone(1920, 'Viridian City', {
        fountain: 'p:fountain_grass',
      treeSkin: { '*': VIRIDIAN_TREES },
      houses: ['p:cottage', 'p:timber_house', 'p:log_cabin', 'p:hut_b'],
      houseSkins: [],
      decor: [
        { models: BUSHES, density: 20, where: 'building', fit: 'xz' },
        { models: FLOWERS, density: 30, where: 'building' },
        { models: [['p:market_stand', 1, 34]], density: 2, where: 'roadside', solid: 12 },
        { models: [['p:willow', 1, 56]], density: 3, where: 'open', solid: 10 },
      ],
    }),
  ]),

  // Viridian Forest (Route 2) -> Pewter City (grey stone town in the mountains)
  1: outdoor(
    [
      zone(0, 'Viridian Forest', {
        treeSkin: { '*': FOREST_TREES, conifer: FOREST_CONIFERS, pine: FOREST_CONIFERS },
        filler: [['dense_forest', 'dark', 0.45], ['conifer', 'dark', 0.2], ['slender', 'standard', 0.15]],
        fillSpacing: 56,
        lawn: 'meadow',
        decor: [
          { models: FOREST_FLOOR, density: 70, where: 'open' },
          { models: [['k:log_large', 1, 16], ['k:rock_largeA', 1, 20]], density: 5, where: 'open', fit: 'xz', solid: 14 },
        ],
      }),
      zone(1620, 'Pewter City', {
        fountain: 'p:well_stone',
        ground: 'rock',
        treeSkin: { '*': PEWTER_TREES },
        filler: [['conifer', 'standard', 0.35], ['mature', 'standard', 0.2]],
        ringTrees: PEWTER_TREES,
        houses: ['p:stone_house', 'p:stone_house', 'p:timber_tall'],
        houseSkins: [],
        civic: { gym: 'p:stone_house' },
        decor: [
          { models: STONE_SPIRES, density: 8, where: 'edge', solid: 18 },
          { models: BOULDERS, density: 8, where: 'open', fit: 'xz', solid: 14 },
          { models: ROCKS_SMALL, density: 40, where: 'roadside', fit: 'xz' },
          { models: [['k:statue_column', 1, 54], ['k:statue_obelisk', 1, 46]], density: 3, where: 'building', solid: 8 },
          { models: LANTERNS, density: 6, where: 'roadside' },
        ],
        lawn: 'sparse',
      }),
    ],
    { fog: { color: 0xc5e2d6, near: 380, far: 880 }, camera: CAMERA_FOREST, hemi: { sky: 0xdff2e8, ground: 0x3b5a30, intensity: 2.0 } }
  ),

  // Mt. Moon Foothills (Routes 3 & 4) -> Cerulean City (river town)
  2: outdoor(
    [
      zone(0, 'Mt. Moon Foothills', {
        ground: 'rock',
        treeSkin: { '*': MOUNTAIN_TREES },
        filler: [['conifer', 'standard', 0.3], ['pine', 'dark', 0.15]],
        ringTrees: MOUNTAIN_TREES,
        lawn: 'dry',
        decor: [
          { models: SPIRES, density: 9, where: 'edge', solid: 20 },
          { models: BOULDERS, density: 10, where: 'open', fit: 'xz', solid: 14 },
          { models: ROCKS_SMALL, density: 50, where: 'roadside', fit: 'xz' },
        ],
      }),
      zone(1560, 'Cerulean City', {
        fountain: 'p:fountain_blue',
        treeSkin: { '*': CERULEAN_TREES },
        ringTrees: CERULEAN_TREES,
        houses: S('a', 'i', 'm', 'o', 'q', 'r'),
        houseSkins: SKIN('variation-a', 'variation-a', 'colormap'),
        edgeWater: { side: 'north', kind: 'river' },
        decor: [
          { models: SMALL_BOATS, density: 3, where: 'offshore' },
          { models: [['p:bridge_small', 1, 60]], density: 0.6, where: 'shore', fit: 'xz' },
          { models: LILIES, density: 30, where: 'water', fit: 'xz' },
          { models: [['p:gazebo', 1, 40]], density: 1, where: 'open', solid: 18 },
          { models: BUSHES, density: 20, where: 'building', fit: 'xz' },
          { models: URBAN_PROPS, density: 6, where: 'roadside' },
        ],
      }),
    ],
    { ring: 'cliffs', camera: CAMERA_MOUNTAIN, baseGround: 'meadow' }
  ),

  // Routes 5 & 6 coastal trail -> Vermilion City (harbour)
  3: outdoor(
    [
      zone(0, 'Coastal Trail', {
        treeSkin: { '*': [...PALMS, ['CommonTree_5', 2, 66]] },
        filler: [['coastal', 'coastal', 0.25], ['broadleaf', 'standard', 0.2]],
        ringTrees: PALMS,
        decor: [
          { models: BUSHES, density: 25, where: 'open', fit: 'xz' },
          { models: BOULDERS, density: 4, where: 'edge', fit: 'xz', solid: 14 },
        ],
      }),
      zone(1600, 'Vermilion City', {
        fountain: 'p:fountain_iron',
        treeSkin: { '*': PALMS },
        filler: [['coastal', 'coastal', 0.2]],
        ringTrees: PALMS,
        houses: S('a', 'h', 'p', 's', 'u', 'c'),
        houseSkins: SKIN('variation-a', 'variation-c', 'colormap'),
        civic: { gym: 'c:building-l' },
        edgeWater: { side: 'south', kind: 'sea' },
        decor: [
          { models: [['p:liner', 1, 70]], density: 0.6, where: 'offshore' },
          { models: [['p:tugboat', 1, 34], ['p:sailboat', 1, 40]], density: 2, where: 'offshore' },
          { models: [['p:dock_long', 1, 90], ['p:port', 1, 110]], density: 1.2, where: 'shore', fit: 'xz' },
          { models: [['p:lighthouse', 1, 120]], density: 0.6, where: 'edge', solid: 20 },
          { models: [['p:container_red', 1, 30], ['p:container_grey', 1, 30]], density: 6, where: 'edge', fit: 'xz', solid: 22 },
          { models: [['c:low-detail-building-wide-a', 1, 52], ['c:low-detail-building-wide-b', 1, 56]], density: 2, where: 'edge', solid: 40 },
          { models: HARBOUR, density: 10, where: 'roadside' },
          { models: [['p:streetlight', 1, 52]], density: 6, where: 'roadside' },
        ],
      }),
    ],
    { sky: ['#4aa8ec', '#9fd8f5', '#eaf8f6'], fog: { color: 0xd2ecf5, near: 440, far: 960 } }
  ),

  // Lavender outskirts & meadows (Routes 7-9) -> Celadon City (garden city)
  4: outdoor(
    [
      zone(0, 'Lavender Meadows', {
        treeSkin: { '*': LAVENDER_TREES },
        filler: [['oak', 'standard', 0.25], ['broadleaf', 'standard', 0.2]],
        ringTrees: LAVENDER_TREES,
        lawn: 'meadow',
        decor: [
          { models: FLOWERS, density: 60, where: 'open' },
          { models: [['t:windmill', 1, 120]], density: 0.7, where: 'edge', solid: 30 },
          { models: [['p:barn', 1, 70], ['p:silo', 1, 90]], density: 1.2, where: 'edge', solid: 34 },
          { models: [['k:fence_simple', 1, 14]], density: 6, where: 'roadside', fit: 'y' },
        ],
      }),
      zone(1680, 'Celadon City', {
        fountain: 'p:fountain_garden',
        treeSkin: { '*': CELADON_TREES },
        filler: [['decorative', 'standard', 0.15]],
        ringTrees: CELADON_TREES,
        houses: ['c:building-a', 'c:building-b', 'c:building-d', 'c:building-f', 'c:building-g', 'c:building-h'],
        houseSkins: CSKIN('colormap', 'variation-a', 'colormap'),
        maxBuildingHeight: 150,
        civic: { mart: 'c:building-k', gym: 'c:building-m' },
        decor: [
          { models: [['p:greenhouse', 1, 46]], density: 2, where: 'open', fit: 'xz', solid: 24 },
          { models: [['p:fountain_tiered', 1, 40]], density: 1.2, where: 'open', fit: 'xz', solid: 20 },
          { models: [['p:gazebo', 1, 40]], density: 1, where: 'open', solid: 18 },
          { models: [['t:hedge-large', 1, 18]], density: 10, where: 'building', fit: 'y' },
          { models: FLOWERS, density: 50, where: 'building' },
          { models: [['c:detail-parasol-a', 1, 26], ['c:detail-parasol-b', 1, 26]], density: 5, where: 'roadside' },
          { models: URBAN_PROPS, density: 10, where: 'roadside' },
        ],
      }),
    ],
    { ring: 'skyline' }
  ),

  // Cycling Road & savannah plains -> Fuchsia City (Japanese-style forest town)
  5: outdoor(
    [
      zone(0, 'Savannah Plains', {
        ground: 'dry',
        treeSkin: { '*': SAVANNA_TREES },
        filler: [['broadleaf', 'olive', 0.18]],
        fillSpacing: 90,
        ringTrees: SAVANNA_TREES,
        lawn: 'dry',
        tallGrass: 'k:grass_large',
        decor: [
          { models: [['k:grass_large', 3, 16], ['k:grass_leafs', 2, 12], ['k:plant_bushSmall', 1, 12]], density: 60, where: 'open', fit: 'y' },
          { models: BOULDERS, density: 5, where: 'open', fit: 'xz', solid: 14 },
          { models: [['p:water_tower', 1, 70]], density: 0.6, where: 'edge', solid: 16 },
        ],
      }),
      zone(1700, 'Fuchsia City', {
        fountain: 'p:fountain_waterfall',
        ground: 'meadow',
        treeSkin: { '*': FUCHSIA_TREES },
        filler: [['dense_forest', 'standard', 0.35], ['broadleaf', 'standard', 0.2]],
        fillSpacing: 60,
        ringTrees: FUCHSIA_TREES,
        houses: ['p:hut_b', 'p:log_cabin', 'p:cottage'],
        houseSkins: [],
        civic: { gym: 'p:station' },
        decor: [
          { models: [['p:pagoda', 1, 150]], density: 0.6, where: 'edge', solid: 30 },
          { models: [['p:torii', 1, 56]], density: 2, where: 'edge', solid: 10 },
          { models: [['p:fox_statue', 1, 26], ['p:bonsai_pot', 1, 18]], density: 5, where: 'building', solid: 8 },
          { models: [['p:bamboo', 1, 70]], density: 12, where: 'open', solid: 8 },
          { models: LANTERNS, density: 8, where: 'roadside' },
          { models: FARM, density: 8, where: 'open' },
          { models: [['t:watermill', 1, 70]], density: 0.5, where: 'edge', solid: 28 },
        ],
        lawn: 'meadow',
      }),
    ],
    { baseGround: 'dry', sky: ['#62b0e3', '#b7dcef', '#f3ecd2'], fog: { color: 0xe7e3cc, near: 460, far: 980 }, hemi: { sky: 0xfff6e2, ground: 0x6b6a3a, intensity: 2.2 } }
  ),

  // Silph Tech outskirts -> Saffron City (metropolis)
  6: outdoor(
    [
      zone(0, 'Silph Tech Outskirts', {
        treeSkin: { '*': SILPH_TREES },
        filler: [['broadleaf', 'standard', 0.2]],
        ringTrees: SILPH_TREES,
        houses: S('g', 'i', 'l', 'm', 'q', 'u'),
        houseSkins: SKIN('colormap', 'variation-c', 'variation-a'),
        decor: [
          { models: [['p:streetlight', 1, 52]], density: 8, where: 'roadside' },
          { models: [['p:office_a', 1, 90], ['p:office_b', 1, 80]], density: 3, where: 'edge', solid: 34 },
          { models: [['s:fence-low', 1, 10]], density: 8, where: 'building', fit: 'y' },
        ],
      }),
      zone(1780, 'Saffron City', {
        fountain: 'p:fountain_grand',
        treeSkin: { '*': SAFFRON_TREES },
        filler: [],
        ringTrees: SAFFRON_TREES,
        houses: ['c:building-skyscraper-a', 'c:building-skyscraper-b', 'c:building-skyscraper-c', 'c:building-skyscraper-e', 'p:office_a', 'p:office_b'],
        houseSkins: CSKIN('colormap', 'variation-a', 'variation-b'),
        maxBuildingHeight: 230,
        civic: { gym: 'c:building-skyscraper-d', mart: 'c:building-k' },
        decor: [
          { models: [['p:station', 1, 60]], density: 0.6, where: 'edge', fit: 'y', solid: 40 },
          { models: URBAN_PROPS, density: 16, where: 'roadside' },
          { models: [['c:detail-awning-wide', 1, 10]], density: 3, where: 'building' },
          { models: [['t:hedge', 1, 14]], density: 8, where: 'building', fit: 'y' },
        ],
        lawn: 'sparse',
      }),
    ],
    { ring: 'skyline', camera: CAMERA_CITY, fog: { color: 0xd3e3ea, near: 420, far: 940 } }
  ),

  // Sea Routes 19 & 20 -> Cinnabar volcanic isle
  7: outdoor(
    [
      zone(0, 'Sea Routes 19 & 20', {
        treeSkin: { '*': PALMS },
        filler: [['coastal', 'coastal', 0.18]],
        ringTrees: PALMS,
        decor: [
          { models: SMALL_BOATS, density: 3, where: 'offshore' },
          { models: BOULDERS, density: 6, where: 'edge', fit: 'xz', solid: 14 },
          { models: [['k:grass_leafs', 1, 12], ['k:plant_bushSmall', 1, 12]], density: 30, where: 'open' },
        ],
      }),
      zone(1760, 'Cinnabar Island', {
        fountain: 'p:fountain_rockpool',
        ground: 'ash',
        treeSkin: { '*': VOLCANIC_TREES },
        filler: [['coastal', 'coastal', 0.08]],
        ringTrees: VOLCANIC_TREES,
        ringDensity: 0.3,
        houses: ['p:lab_a', 'p:lab_b', ...S('c', 'k')],
        houseSkins: SKIN('variation-c', 'variation-b'),
        civic: { gym: 'p:lab_b' },
        lawn: 'dry',
        decor: [
          { models: [['p:volcano', 1, 420]], density: 0.6, where: 'backdrop', fit: 'y' },
          { models: [['p:lighthouse_b', 1, 110]], density: 0.6, where: 'edge', solid: 18 },
          { models: [['k:rock_tallA#ash', 2, 70], ['k:rock_tallB', 1, 60], ['k:rock_tallC', 1, 76]], density: 8, where: 'edge', solid: 20 },
          { models: BOULDERS, density: 8, where: 'open', fit: 'xz', solid: 14 },
          { models: CACTI, density: 4, where: 'open' },
          { models: ROCKS_SMALL, density: 40, where: 'roadside', fit: 'xz' },
        ],
      }),
    ],
    {
      baseGround: 'grass',
      ring: 'sea',
      sky: ['#5a9fd8', '#b6d2e6', '#f2dcc4'],
      fog: { color: 0xe1d6cb, near: 440, far: 960 },
      sun: { color: 0xffe0b8, intensity: 2.5, dir: [-1, 2, -0.6] },
    }
  ),

  // Victory Road summit -> Indigo Plateau (the League)
  8: outdoor(
    [
      zone(0, 'Victory Road', {
        ground: 'rock',
        treeSkin: { '*': MOUNTAIN_TREES },
        filler: [['conifer', 'dark', 0.22]],
        ringTrees: MOUNTAIN_TREES,
        lawn: 'dry',
        decor: [
          { models: SPIRES, density: 12, where: 'edge', solid: 22 },
          { models: BOULDERS, density: 10, where: 'open', fit: 'xz', solid: 14 },
          { models: ROCKS_SMALL, density: 50, where: 'roadside', fit: 'xz' },
        ],
      }),
      zone(1840, 'Indigo Plateau', {
        fountain: 'p:fountain_statue',
        treeSkin: { '*': INDIGO_TREES },
        filler: [['conifer', 'standard', 0.15]],
        ringTrees: INDIGO_TREES,
        houses: ['c:building-a', 'c:building-d', 'c:building-h'],
        houseSkins: CSKIN('colormap', 'colormap', 'variation-a'),
        maxBuildingHeight: 140,
        civic: { gym: 'c:building-j' },
        decor: [
          { models: [['p:stadium', 1, 460]], density: 0.6, where: 'backdrop', fit: 'xz' },
          { models: [['k:statue_column', 2, 60], ['k:statue_obelisk', 1, 54]], density: 5, where: 'roadside', solid: 8 },
          { models: [['t:hedge-large', 1, 18]], density: 10, where: 'building', fit: 'y' },
          { models: [['t:banner-red', 1, 40], ['t:banner-green', 1, 40]], density: 3, where: 'building' },
          { models: [['p:streetlight', 1, 52]], density: 8, where: 'roadside' },
        ],
      }),
    ],
    { ring: 'cliffs', camera: CAMERA_MOUNTAIN, baseGround: 'meadow', sky: ['#4f9fe0', '#a8d2f0', '#eef3f6'] }
  ),

  // -------------------------------------------------------------------------
  // Special areas
  // -------------------------------------------------------------------------

  101: outdoor(
    [
      zone(0, 'Whispering Thicket', {
        treeSkin: { '*': FOREST_TREES, conifer: FOREST_CONIFERS },
        filler: [],
        lawn: 'meadow',
        decor: [
          { models: FOREST_FLOOR, density: 90, where: 'open' },
          { models: [['k:log_large', 1, 16]], density: 4, where: 'open', fit: 'xz', solid: 12 },
        ],
      }),
      zone(1460, 'Sunlit Clearing', { treeSkin: { '*': FOREST_TREES }, filler: [], lawn: 'meadow', decor: [{ models: FLOWERS, density: 120, where: 'open' }] }),
    ],
    { camera: CAMERA_FOREST, fog: { color: 0xb9d6c3, near: 300, far: 800 }, hemi: { sky: 0xd6eedd, ground: 0x2f4a26, intensity: 1.8 }, sun: { color: 0xfff1d6, intensity: 2.0, dir: [-1, 2.2, -0.8] } }
  ),

  102: outdoor(
    [
      zone(0, 'Mossveil Grove', {
        treeSkin: { '*': GROVE_TREES },
        filler: [],
        ringTrees: GROVE_TREES,
        lawn: 'meadow',
        decor: [
          { models: FOREST_FLOOR, density: 90, where: 'open' },
          { models: [['k:log_large', 1, 18], ['k:stump_old', 1, 16]], density: 6, where: 'open', fit: 'xz', solid: 12 },
        ],
      }),
      zone(1640, 'Mossveil Ruins', {
        treeSkin: { '*': GROVE_TREES },
        filler: [],
        lawn: 'meadow',
        decor: [{ models: RUINS, density: 24, where: 'open', solid: 9 }],
      }),
    ],
    {
      camera: CAMERA_FOREST,
      sky: ['#5a8f86', '#8fb9a8', '#c9dccb'],
      fog: { color: 0x8fae98, near: 220, far: 700 },
      hemi: { sky: 0xc7e3cf, ground: 0x24381f, intensity: 1.5 },
      sun: { color: 0xe9f3d2, intensity: 1.5, dir: [-1, 2.4, -0.6] },
      drawDistance: 760,
    }
  ),

  // Indigo League City: capital of the Pokemon League (the most dressed-up place in the game)
  110: outdoor(
    [
      zone(0, 'Gateway Plaza', {
        treeSkin: { '*': [['p:cypress', 2, 96], ['CommonTree_5', 2, 68], ['p:cherry', 1, 52]] },
        filler: [],
        ringTrees: INDIGO_TREES,
        houses: ['c:building-a'],
        houseSkins: [],
        fountain: 'p:fountain_pedestal',
        lawn: 'lush',
        ground: 'meadow',
        decor: [
          { models: [['t:hedge-large', 1, 18]], density: 14, where: 'building', fit: 'y' },
          { models: FLOWERS, density: 60, where: 'building' },
          { models: [['p:flag_red', 1, 56]], density: 10, where: 'roadside' },
          { models: [['p:market_stand', 1, 34]], density: 3, where: 'roadside', solid: 12 },
        ],
      }),
      zone(640, "Competitors' Quarter", {
        treeSkin: { '*': [['CommonTree_2', 2, 88], ['CommonTree_3', 2, 92], ['p:poplar', 2, 96], ['p:birch', 1, 90]], conifer: [['p:spruce', 1, 104]] },
        filler: [],
        ringTrees: INDIGO_TREES,
        houses: ['p:timber_tall'],
        houseSkins: [],
        lawn: 'lush',
        decor: [
          { models: BUSHES, density: 30, where: 'building', fit: 'xz' },
          { models: FLOWERS, density: 40, where: 'building' },
          { models: [['c:detail-parasol-a', 1, 26], ['c:detail-parasol-b', 1, 26]], density: 4, where: 'roadside' },
          { models: [['p:flag_banner', 1, 60]], density: 6, where: 'roadside' },
          { models: [['k:fence_simple', 1, 12]], density: 4, where: 'open', fit: 'y' },
        ],
      }),
      zone(1700, 'Garden of Legends', {
        treeSkin: { '*': [['p:blossom_white', 2, 60], ['CommonTree_5', 2, 68], ['p:cypress', 2, 96], ['p:willow', 1, 56]] },
        filler: [],
        ringTrees: CELADON_TREES,
        houses: ['p:greenhouse'],
        houseSkins: [],
        fountain: 'p:wishing_well',
        lawn: 'meadow',
        ground: 'meadow',
        decor: [
          { models: FLOWERS, density: 160, where: 'open' },
          { models: BUSHES, density: 50, where: 'open', fit: 'xz' },
          { models: LILIES, density: 60, where: 'water', fit: 'xz' },
          { models: [['t:hedge-large', 1, 18], ['t:hedge', 1, 14]], density: 20, where: 'roadside', fit: 'y' },
        ],
      }),
      zone(2600, 'Hall of Fame', {
        treeSkin: { '*': [['p:cypress', 3, 100], ['CommonTree_5', 1, 68]] },
        filler: [],
        ringTrees: INDIGO_TREES,
        houses: ['p:grand_hall'],
        houseSkins: [],
        maxBuildingHeight: 210,
        lawn: 'lush',
        decor: [
          { models: [['p:flag_banner', 1, 64]], density: 10, where: 'roadside' },
          { models: [['t:hedge-large', 1, 18]], density: 12, where: 'building', fit: 'y' },
          { models: [['k:statue_column', 1, 60]], density: 6, where: 'roadside', solid: 8 },
        ],
      }),
      zone(3080, 'Indigo Stadium', {
        treeSkin: { '*': [['p:cypress', 3, 100], ['p:poplar', 1, 96]] },
        filler: [],
        ringTrees: INDIGO_TREES,
        houses: [],
        houseSkins: [],
        civic: { stadium: 'p:colosseum' },
        fountain: 'p:fountain_classic',
        lawn: 'lush',
        decor: [
          { models: [['t:banner-red', 1, 40], ['t:banner-green', 1, 40]], density: 6, where: 'building' },
          { models: [['p:flag_red', 1, 60]], density: 14, where: 'edge' },
        ],
      }),
    ],
    {
      ring: 'skyline',
      camera: CAMERA_CITY,
      baseGround: 'grass',
      sky: ['#3d8ee0', '#a5d4f2', '#fbe6c2'],
      fog: { color: 0xe9e4d8, near: 460, far: 1000 },
      hemi: { sky: 0xfff4e0, ground: 0x4a6b3a, intensity: 2.25 },
      sun: { color: 0xffe3b8, intensity: 2.6, dir: [-1, 1.8, -0.9] },
      drawDistance: 950,
    }
  ),

  103: cave([zone(0, 'Glimmerstone Cavern', { filler: [], lawn: 'none', houses: [], decor: [{ models: STONE_SPIRES, density: 14, where: 'edge', solid: 16 }] })]),
  104: cave([zone(0, 'Glimmerstone Depths', { filler: [], lawn: 'none', houses: [], decor: [{ models: STONE_SPIRES, density: 14, where: 'edge', solid: 16 }] })]),

  105: outdoor(
    [
      zone(0, 'Saltwind Shore', {
        treeSkin: { '*': PALMS },
        filler: [],
        ringTrees: PALMS,
        houses: ['p:hut_b', 'p:cottage', 'p:log_cabin'],
        houseSkins: [],
        lawn: 'sparse',
        decor: [
          { models: [['p:sailboat', 2, 40], ['p:tugboat', 1, 34]], density: 3, where: 'offshore' },
          { models: HARBOUR, density: 8, where: 'roadside' },
          { models: [['k:grass_leafs', 1, 12]], density: 30, where: 'open' },
        ],
      }),
    ],
    { baseGround: 'grass', ring: 'sea', sky: ['#4aa8ec', '#9fd8f5', '#eaf8f6'], fog: { color: 0xd2ecf5, near: 460, far: 980 } }
  ),

  106: outdoor(
    [
      zone(0, 'Coral Isle', {
        treeSkin: { '*': PALMS },
        filler: [],
        ringTrees: PALMS,
        lawn: 'sparse',
        decor: [
          { models: [['p:sailboat', 1, 40]], density: 2, where: 'offshore' },
          { models: [['k:grass_leafs', 1, 12], ['k:plant_bushSmall', 1, 12]], density: 30, where: 'open' },
          { models: BOULDERS, density: 4, where: 'edge', fit: 'xz', solid: 14 },
        ],
      }),
    ],
    { baseGround: 'grass', ring: 'sea', sky: ['#43a3ea', '#9ad6f6', '#eefaf6'], fog: { color: 0xd4eef7, near: 460, far: 1000 } }
  ),

  107: cave([zone(0, 'Tidewhisper Grotto', { filler: [], lawn: 'none', houses: [], decor: [{ models: SPIRES, density: 12, where: 'edge', solid: 16 }] })], { fog: { color: 0x0b2733, near: 160, far: 560 }, hemi: { sky: 0x6fb4c9, ground: 0x0d2630, intensity: 0.75 } }),

  108: outdoor(
    [
      zone(0, 'Skyreach Trail', {
        treeSkin: { '*': MOUNTAIN_TREES },
        filler: [],
        ringTrees: MOUNTAIN_TREES,
        lawn: 'dry',
        decor: [
          { models: SPIRES, density: 14, where: 'edge', solid: 20 },
          { models: ROCKS_SMALL, density: 40, where: 'roadside', fit: 'xz' },
        ],
      }),
      zone(1600, 'Shelter Ridge', {
        ground: 'dry',
        treeSkin: { '*': MOUNTAIN_TREES },
        filler: [],
        houses: ['p:log_cabin', 'p:hut_b'],
        houseSkins: [],
        lawn: 'dry',
        decor: [{ models: CAMP, density: 6, where: 'open', solid: 12 }],
      }),
    ],
    { ring: 'cliffs', camera: CAMERA_MOUNTAIN, baseGround: 'rock', sky: ['#4c98d8', '#a6cde8', '#eef1f2'], fog: { color: 0xd9e4ea, near: 420, far: 980 } }
  ),

  109: outdoor(
    [
      zone(0, 'Skyreach Summit', {
        treeSkin: { '*': SNOW_TREES },
        filler: [],
        ringTrees: SNOW_TREES,
        lawn: 'none',
        decor: [{ models: STONE_SPIRES, density: 12, where: 'edge', solid: 18 }],
      }),
    ],
    {
      ring: 'cliffs',
      camera: CAMERA_MOUNTAIN,
      baseGround: 'snow',
      sky: ['#7fb2dc', '#c6dcec', '#f6f9fb'],
      fog: { color: 0xe8eff4, near: 260, far: 760 },
      hemi: { sky: 0xf4f9ff, ground: 0x9aa8b4, intensity: 2.3 },
      sun: { color: 0xffffff, intensity: 2.2, dir: [-0.8, 2.4, -0.6] },
      drawDistance: 780,
    }
  ),
};

function cave(zones: ZoneEnv[], o: Partial<LocationEnv> = {}): LocationEnv {
  return {
    sky: ['#050608', '#07090c', '#0b0d10'],
    fog: { color: 0x07080b, near: 180, far: 620 },
    hemi: { sky: 0x8a96b8, ground: 0x1a1612, intensity: 0.55 },
    sun: { color: 0xc9d4ff, intensity: 0.35, dir: [-0.6, 2, -0.4] },
    baseGround: 'cave',
    ring: 'none',
    camera: CAMERA_CAVE,
    underground: true,
    drawDistance: 640,
    zones,
    ...o,
  };
}

/** Environment for any location; unknown ids get a sensible theme-based default. */
export function environmentFor(route: RouteDefinition): LocationEnv {
  const env = ENVIRONMENTS[route.id];
  if (env) return env;
  if (route.floors || route.areaKind === 'cave') return cave([zone(0, route.name, { filler: [], lawn: 'none', houses: [] })]);
  return outdoor([zone(0, route.name, {})], route.theme === 'forest' ? { camera: CAMERA_FOREST } : {});
}

export function zoneAt(env: LocationEnv, x: number): ZoneEnv {
  let z = env.zones[0];
  for (const c of env.zones) if (x >= c.from) z = c;
  return z;
}

/** Deterministic weighted pick (roll in 0..1). */
export function pickWeighted<T extends [string, number, ...unknown[]]>(list: T[], roll: number): T {
  const live = list.filter(m => m[1] > 0);
  const total = live.reduce((s, m) => s + m[1], 0);
  let acc = 0;
  const r = Math.min(0.999999, Math.max(0, roll)) * total;
  for (const m of live) {
    acc += m[1];
    if (r < acc) return m;
  }
  return live[live.length - 1];
}

/** Every model key a location may need (so it can be loaded up front, before the fade lifts). */
export function modelKeysFor(env: LocationEnv): Set<string> {
  const keys = new Set<string>();
  for (const z of env.zones) {
    for (const list of Object.values(z.treeSkin || {})) for (const m of list || []) if (m[1] > 0) keys.add(m[0]);
    for (const m of z.ringTrees || []) keys.add(m[0]);
    for (const d of z.decor) for (const m of d.models) if (m[1] > 0) keys.add(m[0]);
    z.houses.forEach(h => keys.add(h));
    Object.values(z.civic || {}).forEach(c => c && keys.add(c));
    if (z.tallGrass) keys.add(z.tallGrass);
    if (z.fountain) keys.add(z.fountain);
  }
  return keys;
}
