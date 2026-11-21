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
 * s: Kenney Suburban, c: Kenney Commercial; "#variant" recolours foliage.
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

export type DecorPlacement = 'open' | 'roadside' | 'building' | 'water' | 'edge';

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
  /** Models for ordinary houses, and the colour-map variations they may wear. */
  houses: string[];
  houseSkins: string[];
  /** Pokémon Center / Mart / Gym / Gate models. */
  civic?: Partial<Record<'center' | 'mart' | 'gym' | 'gate', string>>;
  /** Cap on building height (world units); tall models shrink to fit. */
  maxBuildingHeight?: number;
  decor: DecorRule[];
  /** Ground cover on open lawn. */
  lawn: 'lush' | 'meadow' | 'dry' | 'sparse' | 'none';
  /** Ground tile for this zone (defaults to the location's baseGround). */
  ground?: LocationEnv['baseGround'];
  /** Model used for knee-high encounter grass. */
  tallGrass?: string;
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

const FOREST_TREES: WeightedModel[] = [
  ['CommonTree_4#dark', 3, 94],
  ['k:tree_detailed_dark', 2, 96],
  ['k:tree_tall_dark', 2, 108],
  ['Pine_4', 1, 98],
  ['k:tree_oak_dark', 2, 88],
  ['CommonTree_3', 1, 96],
];
const FOREST_CONIFERS: WeightedModel[] = [
  ['Pine_4', 2, 100],
  ['Pine_5', 2, 104],
  ['k:tree_pineTallB_detailed', 1, 116],
  ['k:tree_pineRoundA', 1, 96],
];
const MOUNTAIN_TREES: WeightedModel[] = [
  ['Pine_2', 2, 92],
  ['Pine_5', 2, 100],
  ['k:tree_pineRoundC', 2, 94],
  ['k:tree_pineTallA_detailed', 1, 104],
  ['k:tree_cone_dark', 1, 86],
];
const PALMS: WeightedModel[] = [
  ['k:tree_palmTall', 2, 92],
  ['k:tree_palm', 2, 90],
  ['k:tree_palmBend', 2, 86],
  ['k:tree_palmDetailedTall', 1, 94],
  ['k:tree_palmShort', 1, 66],
];
const CITY_TREES: WeightedModel[] = [
  ['t:tree-high-round', 3, 74],
  ['t:tree', 2, 60],
  ['k:tree_default', 2, 78],
  ['CommonTree_5', 1, 66],
  ['k:tree_cone', 1, 70],
];
const GARDEN_TREES: WeightedModel[] = [
  ['k:tree_fat', 2, 72],
  ['k:tree_detailed', 2, 86],
  ['CommonTree_3', 2, 92],
  ['k:tree_oak', 2, 84],
  ['CommonTree_4#dark', 1, 92],
];
const SAVANNA_TREES: WeightedModel[] = [
  ['k:tree_plateau', 4, 88],
  ['k:tree_fat', 1, 70],
  ['CommonTree_2#olive', 1, 84],
];
const VOLCANIC_TREES: WeightedModel[] = [
  ['k:tree_palmShort', 2, 64],
  ['k:tree_thin#ash', 2, 78],
  ['k:tree_simple#ash', 1, 70],
  ['k:tree_palmBend', 1, 80],
];
const SNOW_TREES: WeightedModel[] = [
  ['k:tree_pineRoundA#snow', 2, 96],
  ['k:tree_pineTallA_detailed#snow', 2, 104],
  ['Pine_4', 1, 96],
  ['k:tree_pineSmallA#snow', 1, 64],
];

// Decoration sets
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
  ['k:plant_bushDetailed', 2, 18],
];
const FLOWERS: WeightedModel[] = [['k:flower_redA', 1, 12], ['k:flower_yellowA', 1, 11], ['k:flower_purpleA', 1, 12], ['Flower_3_Group', 2, 14], ['Flower_4_Group', 2, 14]];
const BUSHES: WeightedModel[] = [['k:plant_bush', 2, 16], ['k:plant_bushLarge', 2, 18], ['k:plant_bushDetailed', 1, 20], ['Bush_Common_Flowers', 2, 20]];
const URBAN_PROPS: WeightedModel[] = [['t:lantern', 3, 50], ['s:planter', 2, 14], ['t:stall-bench', 1, 16]];
const MARKET: WeightedModel[] = [['t:stall', 1, 40], ['t:stall-red', 1, 40], ['t:stall-green', 1, 40], ['t:cart', 1, 26]];
const HARBOUR: WeightedModel[] = [['k:canoe', 2, 9], ['k:log_stack', 2, 18], ['k:pot_large', 1, 10], ['t:cart', 1, 24]];
const RUINS: WeightedModel[] = [['k:statue_column', 2, 56], ['k:statue_columnDamaged', 3, 40], ['k:statue_block', 2, 16], ['k:statue_head', 1, 40]];
const CAMP: WeightedModel[] = [['k:tent_detailedOpen', 1, 34], ['k:tent_smallClosed', 1, 30], ['k:campfire_stones', 1, 6], ['k:log_large', 1, 14]];
const FARM: WeightedModel[] = [['k:crops_cornStageD', 3, 30], ['k:crops_wheatStageB', 3, 18], ['k:crop_pumpkin', 2, 10]];
const CACTI: WeightedModel[] = [['k:cactus_short', 1, 18], ['k:cactus_tall', 1, 28]];
const LILIES: WeightedModel[] = [['k:lily_large', 2, 14], ['k:lily_small', 1, 10]];

/** Route 0's reference zones (Pallet Valley / Route 1 / Viridian). Do not restyle: other places are tuned against it. */
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
  // Pallet Valley -> Route 1 -> Viridian City: the reference implementation
  0: outdoor([
    zone(0, 'Pallet Valley', {}),
    zone(640, 'Blossom Terrace / Clear Creek', { filler: [['blossom', 'blossom', 0.6], ['broadleaf', 'standard', 0.1]] }),
    zone(1340, 'Deep Ancient Sanctuary', { filler: [['conifer', 'dark', 0.4], ['dense_forest', 'dark', 0.3]] }),
    zone(1920, 'Viridian City', {}),
  ]),

  // Viridian Forest (Route 2) -> Pewter City
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
        treeSkin: { '*': [['k:tree_cone', 2, 78], ['Pine_2', 2, 88], ['CommonTree_2', 1, 86], ['k:tree_oak', 1, 82]] },
        filler: [['conifer', 'standard', 0.35], ['mature', 'standard', 0.2]],
        houses: S('b', 'e', 'g', 'j', 'l', 'c'),
        houseSkins: SKIN('variation-c', 'variation-c', 'variation-b'),
        decor: [
          { models: STONE_SPIRES, density: 7, where: 'edge', solid: 18 },
          { models: BOULDERS, density: 8, where: 'open', fit: 'xz', solid: 14 },
          { models: ROCKS_SMALL, density: 40, where: 'roadside', fit: 'xz' },
          { models: [['k:statue_column', 1, 54], ['k:statue_obelisk', 1, 46]], density: 3, where: 'building', solid: 8 },
        ],
        lawn: 'sparse',
      }),
    ],
    { fog: { color: 0xc5e2d6, near: 380, far: 880 }, camera: CAMERA_FOREST, hemi: { sky: 0xdff2e8, ground: 0x3b5a30, intensity: 2.0 } }
  ),

  // Mt. Moon Foothills (Routes 3 & 4) -> Cerulean City
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
        treeSkin: { '*': [['k:tree_default', 2, 80], ['CommonTree_5', 2, 66], ['CommonTree_3', 1, 92], ['k:tree_oak', 1, 84]] },
        houses: S('a', 'i', 'm', 'o', 'q', 'r'),
        houseSkins: SKIN('variation-a', 'variation-a', 'colormap'),
        decor: [
          { models: LILIES, density: 30, where: 'water', fit: 'xz' },
          { models: [['k:canoe', 1, 9]], density: 3, where: 'water', fit: 'y' },
          { models: BUSHES, density: 20, where: 'building', fit: 'xz' },
          { models: URBAN_PROPS, density: 6, where: 'roadside' },
        ],
      }),
    ],
    { ring: 'cliffs', camera: CAMERA_MOUNTAIN, baseGround: 'meadow' }
  ),

  // Routes 5 & 6 coastal trail -> Vermilion City (port)
  3: outdoor(
    [
      zone(0, 'Coastal Trail', {
        treeSkin: { '*': [...PALMS, ['k:tree_default', 2, 80], ['CommonTree_5', 1, 66]] },
        filler: [['coastal', 'coastal', 0.25], ['broadleaf', 'standard', 0.2]],
        ringTrees: PALMS,
        decor: [
          { models: BUSHES, density: 25, where: 'open', fit: 'xz' },
          { models: BOULDERS, density: 4, where: 'edge', fit: 'xz', solid: 14 },
        ],
      }),
      zone(1600, 'Vermilion City', {
        treeSkin: { '*': PALMS },
        filler: [['coastal', 'coastal', 0.25]],
        houses: S('a', 'h', 'p', 's', 'u', 'c'),
        houseSkins: SKIN('variation-a', 'variation-c', 'colormap'),
        civic: { gym: 'c:building-l' },
        decor: [
          { models: [['c:low-detail-building-wide-a', 1, 52], ['c:low-detail-building-wide-b', 1, 56], ['c:low-detail-building-d', 1, 60]], density: 4, where: 'edge', solid: 40 },
          { models: HARBOUR, density: 14, where: 'roadside' },
          { models: [['t:lantern', 1, 50]], density: 6, where: 'roadside' },
        ],
      }),
    ],
    { sky: ['#4aa8ec', '#9fd8f5', '#eaf8f6'], fog: { color: 0xd2ecf5, near: 440, far: 960 } }
  ),

  // Lavender outskirts & meadows (Routes 7-9) -> Celadon City
  4: outdoor(
    [
      zone(0, 'Lavender Meadows', {
        treeSkin: { '*': [['k:tree_oak', 2, 84], ['CommonTree_2', 2, 88], ['k:tree_detailed', 1, 86], ['k:tree_fat_fall', 0.4, 72], ['CommonTree_5#blossom', 0.6, 78]] },
        filler: [['oak', 'standard', 0.25], ['broadleaf', 'standard', 0.2]],
        lawn: 'meadow',
        decor: [
          { models: FLOWERS, density: 60, where: 'open' },
          { models: [['t:windmill', 1, 120]], density: 0.7, where: 'edge', solid: 30 },
          { models: [['k:fence_simple', 1, 14]], density: 6, where: 'roadside', fit: 'y' },
        ],
      }),
      zone(1680, 'Celadon City', {
        treeSkin: { '*': CITY_TREES },
        filler: [['decorative', 'standard', 0.15]],
        houses: ['c:building-a', 'c:building-b', 'c:building-d', 'c:building-f', 'c:building-g', 'c:building-h'],
        houseSkins: CSKIN('colormap', 'variation-a', 'colormap'),
        maxBuildingHeight: 150,
        civic: { mart: 'c:building-k', gym: 'c:building-m' },
        decor: [
          { models: [['t:hedge-large', 1, 18]], density: 10, where: 'building', fit: 'y' },
          { models: FLOWERS, density: 40, where: 'building' },
          { models: [['t:fountain-square-detail', 1, 48]], density: 1, where: 'open', fit: 'xz', solid: 22 },
          { models: [['c:detail-parasol-a', 1, 26], ['c:detail-parasol-b', 1, 26]], density: 5, where: 'roadside' },
          { models: URBAN_PROPS, density: 10, where: 'roadside' },
        ],
      }),
    ],
    { ring: 'skyline' }
  ),

  // Cycling Road & savannah plains -> Fuchsia City
  5: outdoor(
    [
      zone(0, 'Savannah Plains', {
        treeSkin: { '*': SAVANNA_TREES },
        filler: [['broadleaf', 'olive', 0.18]],
        fillSpacing: 90,
        ringTrees: SAVANNA_TREES,
        lawn: 'dry',
        tallGrass: 'k:grass_large',
        decor: [
          { models: [['k:grass_large', 3, 16], ['k:grass_leafs', 2, 12], ['k:plant_bushSmall', 1, 12]], density: 60, where: 'open', fit: 'y' },
          { models: BOULDERS, density: 5, where: 'open', fit: 'xz', solid: 14 },
        ],
      }),
      zone(1700, 'Fuchsia City', {
        ground: 'meadow',
        treeSkin: { '*': GARDEN_TREES },
        filler: [['dense_forest', 'standard', 0.35], ['broadleaf', 'standard', 0.2]],
        fillSpacing: 60,
        houses: S('b', 'f', 'j', 'n', 't', 'k'),
        houseSkins: SKIN('variation-b', 'colormap', 'variation-b'),
        decor: [
          { models: FARM, density: 14, where: 'open' },
          { models: [['k:fence_planks', 1, 13]], density: 6, where: 'building', fit: 'y' },
          { models: BUSHES, density: 30, where: 'building', fit: 'xz' },
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
        treeSkin: { '*': [['s:tree-large', 2, 72], ['s:tree-small', 1, 52], ['k:tree_default', 2, 80], ['t:tree-high-round', 1, 74]] },
        filler: [['broadleaf', 'standard', 0.2]],
        houses: S('g', 'i', 'l', 'm', 'q', 'u'),
        houseSkins: SKIN('colormap', 'variation-c', 'variation-a'),
        decor: [
          { models: [['t:lantern', 1, 50]], density: 8, where: 'roadside' },
          { models: [['c:low-detail-building-a', 1, 80], ['c:low-detail-building-g', 1, 90]], density: 3, where: 'edge', solid: 34 },
          { models: [['s:fence-low', 1, 10]], density: 8, where: 'building', fit: 'y' },
        ],
      }),
      zone(1780, 'Saffron City', {
        treeSkin: { '*': CITY_TREES },
        filler: [],
        houses: ['c:building-skyscraper-a', 'c:building-skyscraper-b', 'c:building-skyscraper-c', 'c:building-skyscraper-e', 'c:building-i', 'c:building-l'],
        houseSkins: CSKIN('colormap', 'variation-a', 'variation-b'),
        maxBuildingHeight: 230,
        civic: { gym: 'c:building-skyscraper-d', mart: 'c:building-k' },
        decor: [
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
          { models: BOULDERS, density: 6, where: 'edge', fit: 'xz', solid: 14 },
          { models: [['k:grass_leafs', 1, 12], ['k:plant_bushSmall', 1, 12]], density: 30, where: 'open' },
        ],
      }),
      zone(1760, 'Cinnabar Island', {
        ground: 'ash',
        treeSkin: { '*': VOLCANIC_TREES },
        filler: [['coastal', 'coastal', 0.08]],
        ringTrees: VOLCANIC_TREES,
        houses: S('c', 'h', 'k', 'r'),
        houseSkins: SKIN('variation-c', 'variation-b'),
        lawn: 'dry',
        decor: [
          { models: [['k:rock_tallA#ash', 2, 70], ['k:rock_tallB', 1, 60], ['k:rock_tallC', 1, 76]], density: 10, where: 'edge', solid: 20 },
          { models: BOULDERS, density: 8, where: 'open', fit: 'xz', solid: 14 },
          { models: CACTI, density: 6, where: 'open' },
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

  // Victory Road summit -> Indigo Plateau
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
        treeSkin: { '*': [['t:tree-high-round', 2, 76], ['k:tree_cone', 2, 74], ['Pine_5', 1, 96]] },
        filler: [['conifer', 'standard', 0.15]],
        houses: ['c:building-a', 'c:building-d', 'c:building-h'],
        houseSkins: CSKIN('colormap', 'colormap', 'variation-a'),
        maxBuildingHeight: 140,
        civic: { gym: 'c:building-j' },
        decor: [
          { models: [['k:statue_column', 2, 60], ['k:statue_obelisk', 1, 54]], density: 5, where: 'roadside', solid: 8 },
          { models: [['t:hedge-large', 1, 18]], density: 10, where: 'building', fit: 'y' },
          { models: [['t:banner-red', 1, 40], ['t:banner-green', 1, 40]], density: 3, where: 'building' },
          { models: [['t:lantern', 1, 50]], density: 8, where: 'roadside' },
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
        treeSkin: { '*': [['CommonTree_4#dark', 3, 104], ['k:tree_thin_dark', 2, 100], ['k:tree_detailed_dark', 2, 104], ['k:tree_tall_dark', 1, 116]] },
        filler: [],
        lawn: 'meadow',
        decor: [
          { models: FOREST_FLOOR, density: 90, where: 'open' },
          { models: [['k:log_large', 1, 18], ['k:stump_old', 1, 16]], density: 6, where: 'open', fit: 'xz', solid: 12 },
        ],
      }),
      zone(1640, 'Mossveil Ruins', {
        treeSkin: { '*': [['CommonTree_4#dark', 1, 104], ['k:tree_thin_dark', 1, 100]] },
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

  103: cave([zone(0, 'Glimmerstone Cavern', { filler: [], lawn: 'none', houses: [], decor: [{ models: STONE_SPIRES, density: 14, where: 'edge', solid: 16 }] })]),
  104: cave([zone(0, 'Glimmerstone Depths', { filler: [], lawn: 'none', houses: [], decor: [{ models: STONE_SPIRES, density: 14, where: 'edge', solid: 16 }] })]),

  105: outdoor(
    [
      zone(0, 'Saltwind Shore', {
        treeSkin: { '*': PALMS },
        filler: [],
        ringTrees: PALMS,
        houses: S('h', 'k', 'c', 'r'),
        houseSkins: SKIN('variation-b', 'variation-a'),
        lawn: 'sparse',
        decor: [
          { models: HARBOUR, density: 10, where: 'roadside' },
          { models: [['k:grass_leafs', 1, 12]], density: 30, where: 'open' },
        ],
      }),
    ],
    { baseGround: 'grass', ring: 'sea', sky: ['#4aa8ec', '#9fd8f5', '#eaf8f6'], fog: { color: 0xd2ecf5, near: 460, far: 980 } }
  ),

  106: outdoor(
    [zone(0, 'Coral Isle', { treeSkin: { '*': PALMS }, filler: [], ringTrees: PALMS, lawn: 'sparse', decor: [{ models: [['k:grass_leafs', 1, 12], ['k:plant_bushSmall', 1, 12]], density: 30, where: 'open' }, { models: BOULDERS, density: 4, where: 'edge', fit: 'xz', solid: 14 }] })],
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
        houses: S('h', 'k'),
        houseSkins: SKIN('variation-b'),
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
  }
  return keys;
}
