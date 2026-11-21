/**
 * specialAreas.ts
 * Exploration areas that branch off the main Kanto route chain: hidden
 * forests, multi-floor caves, a coastline with an island and grotto, and a
 * mountain trail with its summit. All locations, NPCs and landmarks here are
 * original to this game.
 *
 * Areas use ids >= 100 so existing saves (which only reference route ids 0-8)
 * are untouched. Main routes receive their entrances, quest NPCs and notice
 * boards through ROUTE_AUGMENTS, applied once by getRouteDefinition().
 */

import { RouteDefinition, RouteTree, RouteTreeType, FoliageColorVariant, RouteNPC, GrassPatch } from '../systems/RouteExplorationEngine';
import { Rect, RoutePortal, RouteNoticeBoard, RouteFishingSpot } from '../world/WorldTypes';
import { KANTO_JOURNEY_ROUTES } from './routes';
import { registerAreaEncounters } from '../systems/EncounterSystem';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inflate = (r: Rect, m: number): Rect => R(r.x - m, r.y - m, r.w + m * 2, r.h + m * 2);
const inside = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Natural, non-grid tree fill: jittered rows, varied type/colour/scale, avoiding open rects. */
function plantTrees(
  seed: number,
  bounds: Rect,
  avoid: Rect[],
  spacing: number,
  types: RouteTreeType[],
  colors: FoliageColorVariant[],
  scale: [number, number] = [0.9, 1.25]
): RouteTree[] {
  const r = rng(seed);
  const out: RouteTree[] = [];
  const pad = avoid.map(a => inflate(a, 28));
  let row = 0;
  for (let y = bounds.y; y < bounds.y + bounds.h; y += spacing * 0.82, row++) {
    for (let x = bounds.x + (row % 2 ? spacing / 2 : 0); x < bounds.x + bounds.w; x += spacing) {
      const tx = x + (r() - 0.5) * spacing * 0.55;
      const ty = y + (r() - 0.5) * spacing * 0.4;
      if (r() < 0.12) continue; // natural gaps
      if (pad.some(a => inside(tx, ty + 18, a))) continue;
      out.push({
        x: Math.round(tx),
        y: Math.round(ty),
        scale: +(scale[0] + r() * (scale[1] - scale[0])).toFixed(2),
        type: types[Math.floor(r() * types.length)],
        colorVariant: colors[Math.floor(r() * colors.length)],
      });
    }
  }
  return out;
}

/** Weighted colour lists keep the world predominantly green with rare accents. */
const GREENS: FoliageColorVariant[] = ['standard', 'standard', 'standard', 'dark', 'dark', 'light', 'olive', 'standard', 'dark', 'golden'];
const DEEP_GREENS: FoliageColorVariant[] = ['dark', 'dark', 'standard', 'dark', 'olive', 'standard', 'dark', 'light'];

const portal = (p: RoutePortal): RoutePortal => p;
const patch = (x: number, y: number, w: number, h: number, zone: string, style?: GrassPatch['style']): GrassPatch => ({ x, y, w, h, zone, style });

function npc(n: Partial<RouteNPC> & Pick<RouteNPC, 'id' | 'x' | 'y' | 'name' | 'dialogue'>): RouteNPC {
  return { avatar: '', ...n };
}

// ---------------------------------------------------------------------------
// Area ids
// ---------------------------------------------------------------------------

export const AREA = {
  WHISPERING_THICKET: 101,
  MOSSVEIL_GROVE: 102,
  GLIMMERSTONE_1F: 103,
  GLIMMERSTONE_B1: 104,
  SALTWIND_SHORE: 105,
  CORAL_ISLE: 106,
  TIDEWHISPER_GROTTO: 107,
  SKYREACH_TRAIL: 108,
  SKYREACH_SUMMIT: 109,
} as const;

// ---------------------------------------------------------------------------
// 101 · Whispering Thicket (hidden forest off the Viridian Forest trail)
// ---------------------------------------------------------------------------

const thicketOpen = {
  paths: [R(40, 500, 520, 70), R(480, 280, 80, 290), R(480, 280, 720, 70), R(1130, 280, 80, 460), R(1130, 670, 640, 70)],
  clearing: R(1480, 380, 430, 290),
  pond: R(640, 560, 300, 170),
  glade: R(700, 90, 340, 150),
  gap: R(822, 230, 44, 60), // the hidden path: just a gap between trees
};

const whisperingThicket: RouteDefinition = {
  id: AREA.WHISPERING_THICKET,
  name: 'Whispering Thicket',
  locationLabel: 'Whispering Thicket',
  destinationLabel: 'Hidden Forest',
  worldWidth: 2000,
  worldHeight: 1000,
  theme: 'forest',
  isSpecialArea: true,
  areaKind: 'forest',
  parentRouteId: 1,
  music: 'forest',
  startX: 170,
  startY: 535,
  exitX: 0,
  targetEncounters: 0,
  path: thicketOpen.paths.map(p => ({ ...p, style: 'dirt' as const })),
  terrain: [
    { ...thicketOpen.clearing, kind: 'meadow' },
    { ...R(700, 90, 340, 150), kind: 'moss' },
    { ...R(812, 262, 64, 34), kind: 'moss' },
  ],
  waters: [{ ...thicketOpen.pond, kind: 'lake', shore: 'grass' }],
  grassPatches: [
    patch(100, 600, 300, 150, 'thicket'),
    patch(620, 380, 380, 120, 'thicket'),
    patch(1250, 420, 200, 200, 'deep'),
    patch(1560, 440, 270, 170, 'deep'),
    patch(740, 120, 250, 90, 'rare'),
  ],
  sections: [
    { id: 'wt_1', name: 'Whispering Thicket', subtitle: 'A forest few trainers ever find', icon: '🌲', x: 0, y: 0, w: 1460, h: 1000 },
    { id: 'wt_2', name: 'Sunlit Clearing', subtitle: 'Ancient shrine of the thicket', icon: '🌼', x: 1460, y: 0, w: 540, h: 1000 },
  ],
  buildings: [],
  items: [
    { id: 'wt_oran', x: 520, y: 420, name: 'Oran Berry', type: 'berry', amount: 2, collected: false },
    { id: 'wt_leaf', x: 985, y: 170, name: 'Leaf Stone', type: 'stone', detail: 'Gr', amount: 1, collected: false, hidden: true },
    { id: 'wt_great', x: 1840, y: 630, name: 'Great Ball', type: 'greatBall', amount: 2, collected: false, hidden: true },
  ],
  npcs: [
    npc({
      id: 'wt_hana',
      x: 1580,
      y: 640,
      name: 'Forager Hana',
      dialogue: 'The trees here hum when the wind passes. Old folk say the shrine listens. Take these, I picked too many.',
      gift: { type: 'berry', name: 'Oran Berry', amount: 2 },
    }),
  ],
  landmarks: [
    { id: 'thicket_shrine', x: 1700, y: 470, style: 'shrine', title: 'Thicket Shrine', lines: ['A moss-covered stone shrine.', 'Someone has left fresh berries as an offering.'] },
  ],
  lostPokemon: [
    { id: 'lost_pip', x: 880, y: 150, speciesId: 35, requires: { questActive: 'q_lost_clefairy' }, foundFlag: 'lost_clefairy_found', text: 'A frightened Clefairy wearing a blue ribbon. It perks up when you say "Pip".' },
  ],
  portals: [
    portal({ id: 'wt_exit', x: 100, y: 535, style: 'forest_path', label: 'Viridian Forest Trail', target: 1, targetX: 900, targetY: 160 }),
  ],
  trees: [],
};
whisperingThicket.trees = plantTrees(
  1011,
  R(20, 30, 1960, 960),
  [...thicketOpen.paths, thicketOpen.clearing, thicketOpen.pond, thicketOpen.glade, thicketOpen.gap, R(60, 470, 160, 130), ...whisperingThicket.grassPatches.map(g => R(g.x, g.y, g.w, g.h))],
  58,
  ['dense_forest', 'mature', 'broadleaf', 'conifer', 'slender'],
  DEEP_GREENS
);

// ---------------------------------------------------------------------------
// 102 · Mossveil Grove (deep forest, unlocked by the Warden's quest)
// ---------------------------------------------------------------------------

const groveOpen = {
  paths: [R(60, 480, 700, 70), R(700, 200, 80, 350), R(700, 200, 900, 70), R(1540, 200, 80, 600), R(900, 730, 1240, 70)],
  river: R(1000, 300, 110, 700),
  ruins: R(1700, 300, 420, 320),
  basin: R(240, 180, 340, 190),
};

const mossveilGrove: RouteDefinition = {
  id: AREA.MOSSVEIL_GROVE,
  name: 'Mossveil Grove',
  locationLabel: 'Mossveil Grove',
  destinationLabel: 'Ancient Forest',
  worldWidth: 2200,
  worldHeight: 1000,
  theme: 'forest',
  isSpecialArea: true,
  areaKind: 'forest',
  parentRouteId: 5,
  music: 'forest',
  dark: 0.32,
  backdrop: '#0b2015',
  startX: 190,
  startY: 515,
  exitX: 0,
  targetEncounters: 0,
  path: groveOpen.paths.map(p => ({ ...p, style: 'dirt' as const })),
  terrain: [
    { ...groveOpen.ruins, kind: 'moss' },
    { ...R(240, 180, 340, 190), kind: 'moss' },
  ],
  waters: [{ ...groveOpen.river, kind: 'river', shore: 'grass' }],
  bridges: [
    { ...R(990, 730, 130, 70), style: 'wood' },
    { ...R(990, 200, 130, 70), style: 'wood' },
  ],
  waterfalls: [{ x: 1015, y: 300, w: 80, h: 120 }],
  grassPatches: [
    patch(160, 600, 360, 160, 'grove'),
    patch(820, 320, 160, 380, 'marsh', 'reeds'),
    patch(1160, 320, 340, 140, 'grove'),
    patch(1180, 840, 420, 110, 'marsh', 'reeds'),
    patch(1760, 640, 340, 100, 'grove'),
    patch(300, 230, 200, 100, 'rare'),
  ],
  sections: [
    { id: 'mg_1', name: 'Mossveil Grove', subtitle: 'Old growth under a closed canopy', icon: '🌳', x: 0, y: 0, w: 1640, h: 1000 },
    { id: 'mg_2', name: 'Mossveil Ruins', subtitle: 'Stones older than the forest', icon: '🏛️', x: 1640, y: 0, w: 560, h: 1000 },
  ],
  buildings: [],
  items: [
    { id: 'mg_ultra', x: 1960, y: 420, name: 'Ultra Ball', type: 'ultraBall', amount: 1, collected: false, hidden: true },
    { id: 'mg_sitrus', x: 760, y: 610, name: 'Sitrus Berry', type: 'sitrus', amount: 2, collected: false },
    { id: 'mg_revive', x: 420, y: 260, name: 'Revive', type: 'revive', amount: 1, collected: false, hidden: true },
  ],
  npcs: [
    npc({
      id: 'mg_ren',
      x: 1300,
      y: 260,
      name: 'Bug Maniac Ren',
      dialogue: 'Nobody gets past the grove without seeing my collection!',
      trainer: {
        id: 'bugmaniac_ren',
        team: [{ id: 49, lv: 31 }, { id: 47, lv: 31 }, { id: 123, lv: 33 }],
        reward: 1600,
        intro: 'My bugs have been waiting all day for a challenger!',
        defeat: 'Squashed... You really know your stuff.',
      },
    }),
  ],
  landmarks: [{ id: 'mossveil_ruins', x: 1900, y: 460, style: 'ruin', title: 'Mossveil Ruins', lines: ['Broken pillars carved with leaf patterns.', 'Moss has grown over most of the inscriptions.'] }],
  stones: [
    { x: 1760, y: 380, radius: 14, variant: 'mossy' },
    { x: 2060, y: 560, radius: 16, variant: 'mossy' },
    { x: 1820, y: 590, radius: 12, variant: 'mossy' },
  ],
  portals: [portal({ id: 'mg_exit', x: 110, y: 515, style: 'forest_path', label: 'Safari Outskirts', target: 5, targetX: 1200, targetY: 160 })],
  trees: [],
};
mossveilGrove.trees = plantTrees(
  2022,
  R(20, 30, 2160, 960),
  [...groveOpen.paths, groveOpen.river, groveOpen.ruins, groveOpen.basin, R(60, 450, 180, 130), ...mossveilGrove.grassPatches.map(g => R(g.x, g.y, g.w, g.h))],
  60,
  ['dense_forest', 'mature', 'conifer', 'dense_forest', 'slender'],
  DEEP_GREENS,
  [1.0, 1.4]
);

// ---------------------------------------------------------------------------
// 103 · Glimmerstone Cavern 1F
// ---------------------------------------------------------------------------

const glimmer1F: RouteDefinition = {
  id: AREA.GLIMMERSTONE_1F,
  name: 'Glimmerstone Cavern',
  locationLabel: 'Glimmerstone Cavern 1F',
  destinationLabel: 'Cave',
  worldWidth: 1800,
  worldHeight: 1000,
  theme: 'rock',
  isSpecialArea: true,
  areaKind: 'cave',
  parentRouteId: 2,
  music: 'cave',
  dark: 0.86,
  startX: 200,
  startY: 500,
  exitX: 0,
  targetEncounters: 0,
  floors: [R(60, 360, 420, 320), R(440, 470, 300, 150), R(700, 240, 540, 520), R(1180, 120, 160, 200), R(1240, 80, 500, 300), R(1100, 640, 560, 140), R(1480, 560, 280, 420)],
  path: [],
  waters: [{ ...R(820, 420, 220, 150), kind: 'lake', shore: 'rock' }],
  crystals: [
    { x: 1320, y: 210, color: '#93c5fd', light: 130 },
    { x: 1600, y: 170, color: '#c4b5fd', light: 120, scale: 1.2 },
    { x: 1690, y: 340, color: '#93c5fd', light: 90, scale: 0.8 },
    { x: 760, y: 330, color: '#5eead4', light: 100 },
    { x: 1700, y: 930, color: '#fcd34d', light: 90, scale: 0.9 },
  ],
  stones: [
    { x: 380, y: 640, radius: 14, variant: 'slate' },
    { x: 1150, y: 540, radius: 16, variant: 'slate' },
    { x: 1500, y: 300, radius: 13, variant: 'granite' },
  ],
  grassPatches: [
    patch(270, 520, 160, 120, 'cave', 'rubble'),
    patch(900, 600, 260, 120, 'cave', 'rubble'),
    patch(1300, 250, 240, 90, 'crystal', 'rubble'),
    patch(1540, 700, 180, 200, 'cave', 'rubble'),
  ],
  sections: [{ id: 'gc_1', name: 'Glimmerstone Cavern', subtitle: 'Crystal veins light the dark', icon: '💎', x: 0, y: 0, w: 1800, h: 1000 }],
  buildings: [],
  items: [
    { id: 'gc_lantern', x: 1620, y: 880, name: 'Glow Lantern', type: 'key', detail: 'lantern', amount: 1, collected: false },
    { id: 'gc_ultra', x: 1400, y: 735, name: 'Ultra Ball', type: 'ultraBall', amount: 1, collected: false, hidden: true },
    { id: 'gc_great', x: 760, y: 700, name: 'Great Ball', type: 'greatBall', amount: 2, collected: false },
  ],
  npcs: [
    npc({
      id: 'gc_dale',
      x: 1100,
      y: 330,
      name: 'Hiker Dale',
      dialogue: 'Mind the crystals, they bite back if you knock them!',
      trainer: {
        id: 'hiker_dale',
        team: [{ id: 74, lv: 18 }, { id: 95, lv: 19 }, { id: 75, lv: 21 }],
        reward: 1100,
        intro: 'You look sturdy enough. Let\'s see if your team is!',
        defeat: 'Ha! Solid as bedrock, you are.',
      },
    }),
  ],
  portals: [
    portal({ id: 'gc_exit', x: 200, y: 432, style: 'cave_exit', label: 'Mt. Moon Foothills', target: 2, targetX: 700, targetY: 160 }),
    portal({ id: 'gc_down', x: 1650, y: 152, style: 'stairs_down', label: 'Glimmerstone Depths', target: AREA.GLIMMERSTONE_B1, targetX: 220, targetY: 430 }),
  ],
  trees: [],
};

// ---------------------------------------------------------------------------
// 104 · Glimmerstone Depths B1 (boulder puzzle + hidden crystal chamber)
// ---------------------------------------------------------------------------

const glimmerB1: RouteDefinition = {
  id: AREA.GLIMMERSTONE_B1,
  name: 'Glimmerstone Depths',
  locationLabel: 'Glimmerstone Cavern B1',
  destinationLabel: 'Cave',
  worldWidth: 1600,
  worldHeight: 900,
  theme: 'rock',
  isSpecialArea: true,
  areaKind: 'cave',
  parentRouteId: 2,
  music: 'cave',
  dark: 0.9,
  startX: 220,
  startY: 430,
  exitX: 0,
  targetEncounters: 0,
  floors: [R(80, 300, 420, 330), R(460, 420, 120, 130), R(540, 220, 560, 460), R(1060, 360, 260, 140), R(1240, 160, 330, 480)],
  path: [],
  boulders: [{ id: 'gl_boulder', x: 700, y: 560, r: 18 }],
  switches: [{ id: 'gl_boulder', x: 960, y: 400, flag: 'glimmer_gate_open' }],
  barriers: [{ id: 'gl_gate', ...R(1130, 380, 34, 130), openFlag: 'glimmer_gate_open', style: 'crystal' }],
  crystals: [
    { x: 1320, y: 260, color: '#a5b4fc', light: 140, scale: 1.3 },
    { x: 1520, y: 330, color: '#f0abfc', light: 120 },
    { x: 1300, y: 600, color: '#93c5fd', light: 110 },
    { x: 1530, y: 600, color: '#a5b4fc', light: 100, scale: 0.8 },
    { x: 1060, y: 300, color: '#5eead4', light: 80, scale: 0.7 },
    { x: 590, y: 300, color: '#5eead4', light: 80, scale: 0.7 },
  ],
  grassPatches: [patch(600, 290, 200, 100, 'deep', 'rubble'), patch(300, 500, 150, 110, 'deep', 'rubble')],
  signposts: [
    { id: 'gl_tablet', x: 820, y: 330, title: 'Carved Tablet', lines: ['"The crystal door sleeps until stone rests upon the mark."', 'An arrow points toward the round boulder.'] },
  ],
  sections: [{ id: 'gb_1', name: 'Glimmerstone Depths', subtitle: 'Deeper, darker, older', icon: '💎', x: 0, y: 0, w: 1600, h: 900 }],
  buildings: [],
  items: [{ id: 'gb_moon', x: 1500, y: 560, name: 'Moon Stone', type: 'stone', detail: 'Mo', amount: 1, collected: false, hidden: true }],
  npcs: [],
  landmarks: [{ id: 'crystal_heart', x: 1400, y: 300, style: 'shrine', title: 'Crystal Heart', lines: ['A crystal the size of a boulder pulses with soft light.', 'You feel a gentle warmth on your hands.'] }],
  staticEncounters: [
    { id: 'gb_aero', x: 1420, y: 470, speciesId: 142, level: 28, doneFlag: 'static:glimmer_aero', intro: 'An ancient winged Pokémon stirs among the crystals!' },
  ],
  portals: [portal({ id: 'gb_up', x: 220, y: 372, style: 'stairs_up', label: 'Glimmerstone Cavern 1F', target: AREA.GLIMMERSTONE_1F, targetX: 1650, targetY: 215 })],
  trees: [],
};

// ---------------------------------------------------------------------------
// 105 · Saltwind Shore
// ---------------------------------------------------------------------------

const shoreOpen = {
  village: R(820, 150, 760, 260),
  paths: [R(0, 400, 2400, 56), R(940, 290, 56, 120), R(1170, 290, 56, 120), R(1420, 270, 56, 140), R(260, 100, 70, 320)],
};

const saltwindShore: RouteDefinition = {
  id: AREA.SALTWIND_SHORE,
  name: 'Saltwind Shore',
  locationLabel: 'Saltwind Shore',
  destinationLabel: 'Coast',
  worldWidth: 2400,
  worldHeight: 1000,
  theme: 'water',
  isSpecialArea: true,
  areaKind: 'coast',
  parentRouteId: 3,
  music: 'coast',
  architecture: 'wood',
  startX: 295,
  startY: 170,
  exitX: 0,
  targetEncounters: 0,
  path: shoreOpen.paths.map(p => ({ ...p, style: 'dirt' as const })),
  terrain: [{ ...R(0, 470, 2400, 280), kind: 'sand' }, { ...R(0, 640, 2400, 60), kind: 'wetsand' }],
  waters: [
    { ...R(-40, 730, 2480, 330), kind: 'sea', shore: 'sand', zone: 'sea' },
    { ...R(-40, 682, 2480, 60), kind: 'shallows' },
  ],
  bridges: [
    { ...R(560, 600, 56, 300), style: 'pier', vertical: true },
    { ...R(1700, 600, 56, 240), style: 'pier', vertical: true },
  ],
  fishingSpots: [
    { id: 'ss_pier', x: 588, y: 940, zone: 'sea' },
    { id: 'ss_shore', x: 1250, y: 770, zone: 'shore' },
  ],
  grassPatches: [patch(120, 500, 280, 120, 'beach', 'dunes'), patch(1000, 520, 300, 110, 'beach', 'dunes'), patch(2080, 490, 240, 130, 'beach', 'dunes')],
  sections: [
    { id: 'ss_1', name: 'Saltwind Shore', subtitle: 'Fishing village on the southern coast', icon: '⚓', x: 0, y: 0, w: 2400, h: 1000 },
  ],
  buildings: [
    { type: 'house', x: 900, y: 200, w: 120, h: 90, label: 'Dockmaster Office', roofStyle: 'azure', wallColor: '#e7dcc6', occupant: 'Dockmaster Ilse', dialogue: 'Charts, tide tables and a kettle that never stops whistling.' },
    { type: 'house', x: 1140, y: 214, w: 96, h: 76, label: 'Net Shed', roofStyle: 'wood', wallColor: '#d6c4a4', chimney: false, dialogue: 'Fishing nets hang from every rafter. It smells of salt and tar.' },
    { type: 'house', x: 1390, y: 190, w: 100, h: 80, label: 'Gull Cottage', roofStyle: 'azure', wallColor: '#f1ece2', dialogue: 'A retired sailor waves from a rocking chair: "Mind the tide after dusk!"' },
  ],
  items: [
    { id: 'ss_great', x: 1620, y: 560, name: 'Great Ball', type: 'greatBall', amount: 1, collected: false },
    { id: 'ss_cash', x: 2260, y: 650, name: 'Poké Dollars', type: 'money', amount: 600, collected: false, hidden: true },
  ],
  npcs: [
    npc({ id: 'ss_ilse', x: 960, y: 330, name: 'Dockmaster Ilse', dialogue: 'Boats in, boats out. Saltwind never sleeps.' }),
    npc({ id: 'ss_tali', x: 1320, y: 540, name: 'Researcher Tali', dialogue: 'The tide pools here are full of surprises. I study how coastal Pokémon adapt.' }),
    npc({
      id: 'ss_wes',
      x: 588,
      y: 640,
      name: 'Angler Wes',
      dialogue: 'Every trainer should own a rod. Cast near the rings on the water and wait for a bite!',
      gift: { type: 'key', name: 'Fishing Rod', amount: 1, detail: 'rod' },
    }),
    npc({
      id: 'ss_marlo',
      x: 2000,
      y: 600,
      name: 'Surfer Marlo',
      dialogue: 'Waves are flat today. Battle me instead!',
      trainer: {
        id: 'marlo',
        team: [{ id: 72, lv: 24 }, { id: 116, lv: 25 }, { id: 121, lv: 27 }],
        reward: 1300,
        intro: 'Catch this wave, rookie!',
        defeat: 'Wiped out! Nice riding.',
      },
    }),
    npc({
      id: 'ss_mira',
      x: 1728,
      y: 800,
      name: 'Captain Mira',
      dialogue: 'Coral Isle is a short hop across the bay. All aboard?',
      ferry: { target: AREA.CORAL_ISLE, x: 750, y: 735, label: 'Coral Isle', requires: { minBadges: 3 } },
    }),
  ],
  landmarks: [{ id: 'anchor_memorial', x: 1560, y: 480, style: 'monument', title: 'Anchor Memorial', lines: ['An old ship anchor set in stone.', '"For every crew that sailed home safely."'] }],
  portals: [portal({ id: 'ss_exit', x: 295, y: 112, style: 'trail', label: 'Vermilion Coastal Trail', target: 3, targetX: 1000, targetY: 860 })],
  trees: [],
};
saltwindShore.trees = plantTrees(
  3033,
  R(30, 60, 2340, 380),
  [...shoreOpen.paths, shoreOpen.village, R(230, 60, 140, 160)],
  90,
  ['coastal', 'coastal', 'broadleaf', 'small'],
  ['coastal', 'standard', 'light', 'coastal'],
  [0.9, 1.2]
);

// ---------------------------------------------------------------------------
// 106 · Coral Isle
// ---------------------------------------------------------------------------

const coralIsle: RouteDefinition = {
  id: AREA.CORAL_ISLE,
  name: 'Coral Isle',
  locationLabel: 'Coral Isle',
  destinationLabel: 'Island',
  worldWidth: 1600,
  worldHeight: 1000,
  theme: 'water',
  isSpecialArea: true,
  areaKind: 'coast',
  parentRouteId: 3,
  music: 'coast',
  backdrop: '#0b4a7a',
  startX: 750,
  startY: 735,
  exitX: 0,
  targetEncounters: 0,
  path: [{ ...R(600, 440, 520, 50), style: 'dirt' }, { ...R(720, 460, 56, 300), style: 'dirt' }, { ...R(470, 300, 56, 170), style: 'dirt' }],
  terrain: [{ ...R(210, 190, 1190, 630), kind: 'sand' }, { ...R(330, 290, 950, 420), kind: 'meadow' }],
  waters: [
    { ...R(-40, -40, 1680, 230), kind: 'sea', shore: 'sand' },
    { ...R(-40, 820, 1680, 220), kind: 'sea', shore: 'sand' },
    { ...R(-40, -40, 250, 1080), kind: 'sea', shore: 'sand' },
    { ...R(1400, -40, 240, 1080), kind: 'sea', shore: 'sand' },
  ],
  bridges: [{ ...R(720, 760, 60, 170), style: 'pier', vertical: true }],
  fishingSpots: [{ id: 'ci_east', x: 1440, y: 520, zone: 'sea' }],
  grassPatches: [patch(380, 520, 260, 140, 'island'), patch(900, 520, 220, 150, 'island'), patch(1150, 380, 160, 110, 'island', 'dunes')],
  sections: [{ id: 'ci_1', name: 'Coral Isle', subtitle: 'A quiet island with an old lighthouse', icon: '🏝️', x: 0, y: 0, w: 1600, h: 1000 }],
  buildings: [],
  items: [{ id: 'ci_sitrus', x: 360, y: 760, name: 'Sitrus Berry', type: 'sitrus', amount: 1, collected: false, hidden: true }],
  npcs: [
    npc({ id: 'ci_orin', x: 1180, y: 390, name: 'Keeper Orin', dialogue: 'The lamp has turned every night for sixty years. I\'ve not missed one.' }),
    npc({ id: 'ci_mira', x: 690, y: 790, name: 'Captain Mira', dialogue: 'Ready to head back to Saltwind?', ferry: { target: AREA.SALTWIND_SHORE, x: 1728, y: 760, label: 'Saltwind Shore' } }),
  ],
  landmarks: [{ id: 'coral_lighthouse', x: 1250, y: 300, style: 'lighthouse', title: 'Coral Lighthouse', lines: ['A white-and-red lighthouse.', 'Its lamp sweeps the bay even in daylight.'] }],
  staticEncounters: [
    { id: 'ci_lapras', x: 1330, y: 650, speciesId: 131, level: 30, doneFlag: 'static:coral_lapras', requires: { flag: 'lapras_cove' }, intro: 'A gentle Pokémon rests by the cove, watching you curiously.' },
  ],
  portals: [portal({ id: 'ci_grotto', x: 500, y: 300, style: 'cave', label: 'Tidewhisper Grotto', target: AREA.TIDEWHISPER_GROTTO, targetX: 220, targetY: 500 })],
  trees: [],
};
coralIsle.trees = plantTrees(4044, R(230, 210, 1150, 590), [R(330, 290, 950, 420), R(680, 700, 140, 120), R(430, 220, 140, 120), R(1150, 240, 200, 200)], 80, ['coastal', 'coastal', 'small'], ['coastal', 'standard'], [0.9, 1.15]);

// ---------------------------------------------------------------------------
// 107 · Tidewhisper Grotto
// ---------------------------------------------------------------------------

const tidewhisperGrotto: RouteDefinition = {
  id: AREA.TIDEWHISPER_GROTTO,
  name: 'Tidewhisper Grotto',
  locationLabel: 'Tidewhisper Grotto',
  destinationLabel: 'Sea Cave',
  worldWidth: 1400,
  worldHeight: 800,
  theme: 'water',
  isSpecialArea: true,
  areaKind: 'cave',
  parentRouteId: 3,
  music: 'cave',
  dark: 0.62,
  startX: 220,
  startY: 500,
  exitX: 0,
  targetEncounters: 0,
  floors: [R(80, 380, 420, 300), R(460, 460, 260, 130), R(680, 200, 640, 520)],
  path: [],
  waters: [{ ...R(800, 380, 300, 200), kind: 'lake', shore: 'rock' }, { ...R(760, 600, 420, 80), kind: 'shallows' }],
  crystals: [
    { x: 760, y: 300, color: '#67e8f9', light: 110 },
    { x: 1260, y: 420, color: '#67e8f9', light: 120, scale: 1.2 },
    { x: 420, y: 640, color: '#a5f3fc', light: 80, scale: 0.7 },
  ],
  grassPatches: [patch(200, 520, 180, 120, 'grotto', 'rubble'), patch(900, 260, 200, 90, 'grotto', 'rubble')],
  sections: [{ id: 'tg_1', name: 'Tidewhisper Grotto', subtitle: 'The sea breathes through the rock', icon: '🌊', x: 0, y: 0, w: 1400, h: 800 }],
  buildings: [],
  items: [{ id: 'tg_water', x: 1240, y: 650, name: 'Water Stone', type: 'stone', detail: 'Wa', amount: 1, collected: false, hidden: true }],
  npcs: [],
  landmarks: [{ id: 'grotto_glow', x: 1180, y: 300, style: 'shrine', title: 'Glowing Tide Pool', lines: ['Tiny luminous Pokémon gather in a pool here.', 'Their light pulses in time with the waves outside.'] }],
  portals: [portal({ id: 'tg_exit', x: 220, y: 452, style: 'cave_exit', label: 'Coral Isle', target: AREA.CORAL_ISLE, targetX: 500, targetY: 360 })],
  trees: [],
};

// ---------------------------------------------------------------------------
// 108 · Skyreach Trail (mountain)
// ---------------------------------------------------------------------------

const trailOpen = {
  paths: [R(100, 975, 420, 50), R(360, 680, 56, 330), R(400, 560, 1220, 50), R(1220, 190, 60, 400), R(1240, 190, 360, 50), R(1770, 520, 520, 54), R(2200, 200, 54, 360)],
  east: R(1780, 70, 600, 1000),
};

const skyreachTrail: RouteDefinition = {
  id: AREA.SKYREACH_TRAIL,
  name: 'Skyreach Trail',
  locationLabel: 'Skyreach Trail',
  destinationLabel: 'Mountain',
  worldWidth: 2400,
  worldHeight: 1100,
  theme: 'rock',
  isSpecialArea: true,
  areaKind: 'mountain',
  parentRouteId: 4,
  music: 'mountain',
  architecture: 'timber',
  startX: 210,
  startY: 1000,
  exitX: 0,
  targetEncounters: 0,
  path: trailOpen.paths.map(p => ({ ...p, style: 'dirt' as const })),
  terrain: [
    { ...R(0, 676, 1600, 420), kind: 'rock' },
    { ...R(0, 70, 480, 572), kind: 'plateau', tier: 1 },
    { ...R(480, 382, 1100, 260), kind: 'plateau', tier: 1 },
    { ...R(480, 70, 1100, 282), kind: 'rock', tier: 2 },
    { ...R(1780, 70, 620, 1030), kind: 'plateau', tier: 1 },
  ],
  ledges: [
    { x: 0, y: 640, w: 1580, h: 36, stairs: [{ x: 360, w: 64 }] },
    { x: 480, y: 350, w: 1100, h: 32, stairs: [{ x: 1220, w: 64 }] },
  ],
  waters: [
    { ...R(1600, 100, 170, 1000), kind: 'chasm' },
    { ...R(2110, 640, 170, 100), kind: 'lake', shore: 'rock' },
  ],
  bridges: [{ ...R(1590, 520, 190, 54), style: 'rope' }],
  waterfalls: [{ x: 2155, y: 640, w: 80, h: 160 }],
  grassPatches: [
    patch(700, 800, 400, 160, 'slope'),
    patch(1150, 920, 300, 110, 'slope'),
    patch(100, 400, 240, 160, 'ridge'),
    patch(700, 430, 380, 100, 'ridge'),
    patch(620, 120, 260, 120, 'ridge'),
    patch(1850, 780, 380, 200, 'slope'),
  ],
  sections: [
    { id: 'st_1', name: 'Skyreach Trail', subtitle: 'Switchbacks above Celadon', icon: '⛰️', x: 0, y: 0, w: 1600, h: 1100 },
    { id: 'st_2', name: 'Shelter Ridge', subtitle: 'Across the rope bridge', icon: '🏕️', x: 1600, y: 0, w: 800, h: 1100 },
  ],
  buildings: [
    { type: 'house', x: 1960, y: 300, w: 110, h: 86, label: 'Mountain Shelter', roofStyle: 'wood', wallColor: '#b08968', dialogue: 'A warm stove, spare blankets and a guestbook full of summit stories.' },
  ],
  items: [
    { id: 'st_revive', x: 1450, y: 220, name: 'Revive', type: 'revive', amount: 1, collected: false, hidden: true },
    { id: 'st_ultra', x: 120, y: 160, name: 'Ultra Ball', type: 'ultraBall', amount: 1, collected: false },
    { id: 'st_fire', x: 2320, y: 980, name: 'Fire Stone', type: 'stone', detail: 'Fi', amount: 1, collected: false, hidden: true },
  ],
  npcs: [
    npc({ id: 'st_bram', x: 2015, y: 440, name: 'Shelter Keeper Bram', dialogue: 'Rest as long as you like. The summit will wait.' }),
    npc({
      id: 'st_koa',
      x: 1000,
      y: 290,
      name: 'Black Belt Koa',
      dialogue: 'I train where the air is thin!',
      trainer: {
        id: 'blackbelt_koa',
        team: [{ id: 67, lv: 33 }, { id: 106, lv: 34 }, { id: 107, lv: 34 }],
        reward: 1900,
        intro: 'Feel the strength of the mountain!',
        defeat: 'My stance... broken. Impressive.',
      },
    }),
  ],
  landmarks: [{ id: 'skyreach_lookout', x: 900, y: 175, style: 'viewpoint', title: 'Skyreach Lookout', lines: ['The whole of Kanto spreads out below.', 'You can make out Celadon\'s rooftops and the distant sea.'] }],
  stones: [
    { x: 560, y: 900, radius: 18, variant: 'granite' },
    { x: 1500, y: 760, radius: 16, variant: 'granite' },
    { x: 200, y: 300, radius: 15, variant: 'slate' },
    { x: 1450, y: 460, radius: 14, variant: 'granite' },
    { x: 2300, y: 820, radius: 17, variant: 'slate' },
  ],
  portals: [
    portal({ id: 'st_exit', x: 120, y: 1030, style: 'trail', label: 'Celadon Outskirts', target: 4, targetX: 600, targetY: 160 }),
    portal({ id: 'st_up', x: 2227, y: 190, style: 'stairs_up', label: 'Skyreach Summit', target: AREA.SKYREACH_SUMMIT, targetX: 800, targetY: 790 }),
  ],
  trees: [],
};
skyreachTrail.trees = plantTrees(
  5055,
  R(20, 60, 2360, 1020),
  [...trailOpen.paths, R(1590, 60, 200, 1040), R(1950, 290, 130, 160), R(2090, 470, 220, 290), R(60, 940, 200, 140), R(1200, 150, 100, 80), R(2180, 140, 100, 100), ...skyreachTrail.grassPatches.map(g => R(g.x, g.y, g.w, g.h)), R(820, 120, 160, 120), R(0, 620, 1600, 80), R(470, 330, 1120, 70)],
  120,
  ['conifer', 'conifer', 'slender', 'small'],
  ['olive', 'dark', 'standard', 'dark'],
  [0.85, 1.2]
);

// ---------------------------------------------------------------------------
// 109 · Skyreach Summit
// ---------------------------------------------------------------------------

const skyreachSummit: RouteDefinition = {
  id: AREA.SKYREACH_SUMMIT,
  name: 'Skyreach Summit',
  locationLabel: 'Skyreach Summit',
  destinationLabel: 'Summit',
  worldWidth: 1600,
  worldHeight: 900,
  theme: 'rock',
  isSpecialArea: true,
  areaKind: 'mountain',
  parentRouteId: 4,
  music: 'mountain',
  backdrop: '#cbd5e1',
  startX: 800,
  startY: 790,
  exitX: 0,
  targetEncounters: 0,
  path: [{ ...R(770, 260, 60, 560), style: 'dirt' }],
  terrain: [{ ...R(0, 0, 1600, 900), kind: 'snow' }, { ...R(640, 120, 320, 180), kind: 'rock', tier: 1 }],
  grassPatches: [patch(300, 300, 300, 200, 'summit', 'rubble'), patch(1000, 450, 360, 200, 'summit', 'rubble')],
  sections: [{ id: 'ss_top', name: 'Skyreach Summit', subtitle: 'Above the clouds', icon: '🏔️', x: 0, y: 0, w: 1600, h: 900 }],
  buildings: [],
  items: [
    { id: 'sm_frost', x: 1360, y: 250, name: 'Frostbloom Herb', type: 'key', detail: 'frostbloom', amount: 1, collected: false, hidden: true },
    { id: 'sm_ultra', x: 220, y: 720, name: 'Ultra Ball', type: 'ultraBall', amount: 2, collected: false, hidden: true },
  ],
  npcs: [],
  crystals: [
    { x: 520, y: 640, color: '#e0f2fe', scale: 0.8 },
    { x: 1180, y: 300, color: '#e0f2fe', scale: 1.1 },
  ],
  stones: [
    { x: 400, y: 200, radius: 16, variant: 'slate' },
    { x: 1250, y: 760, radius: 18, variant: 'granite' },
  ],
  landmarks: [{ id: 'summit_cairn', x: 800, y: 205, style: 'monument', title: 'Summit Cairn', lines: ['Stones stacked by every trainer who reached the top.', 'You add one of your own.'] }],
  portals: [portal({ id: 'sm_down', x: 800, y: 845, style: 'stairs_down', label: 'Skyreach Trail', target: AREA.SKYREACH_TRAIL, targetX: 2227, targetY: 255 })],
  trees: [],
};
skyreachSummit.trees = plantTrees(6066, R(30, 70, 1540, 800), [R(740, 230, 120, 660), R(620, 100, 360, 220), R(280, 280, 340, 240), R(980, 430, 400, 240), R(1300, 200, 120, 120)], 130, ['conifer', 'slender'], ['dark', 'olive'], [0.8, 1.1]);

export const SPECIAL_AREAS: RouteDefinition[] = [
  whisperingThicket,
  mossveilGrove,
  glimmer1F,
  glimmerB1,
  saltwindShore,
  coralIsle,
  tidewhisperGrotto,
  skyreachTrail,
  skyreachSummit,
];

// ---------------------------------------------------------------------------
// Encounter tables (per area, per zone) and level bands
// ---------------------------------------------------------------------------

registerAreaEncounters(AREA.WHISPERING_THICKET, { thicket: [10, 11, 13, 14, 43, 46, 48], deep: [12, 15, 44, 47, 70, 102], rare: [123, 127, 114, 35] }, [10, 16]);
registerAreaEncounters(AREA.MOSSVEIL_GROVE, { grove: [44, 45, 47, 49, 70, 71, 102, 103], marsh: [48, 88, 109, 60, 61, 116], rare: [123, 127, 114, 128] }, [28, 34]);
registerAreaEncounters(AREA.GLIMMERSTONE_1F, { cave: [41, 74, 46, 95, 50, 27, 35], crystal: [35, 74, 81, 137, 41], rare: [138, 140, 36] }, [14, 20]);
registerAreaEncounters(AREA.GLIMMERSTONE_B1, { deep: [42, 75, 95, 51, 28, 66], rare: [138, 140, 142] }, [18, 24]);
registerAreaEncounters(AREA.SALTWIND_SHORE, { beach: [98, 72, 118, 27, 21, 79], sea: [129, 118, 72, 116, 90, 120], shore: [60, 54, 118, 129, 98], rare: [131, 90, 120, 147] }, [18, 26]);
registerAreaEncounters(AREA.CORAL_ISLE, { island: [21, 22, 84, 79, 90, 120, 98], sea: [72, 73, 116, 117, 120, 130], rare: [131, 143, 121] }, [24, 30]);
registerAreaEncounters(AREA.TIDEWHISPER_GROTTO, { grotto: [41, 42, 86, 90, 116, 98, 138, 140], rare: [87, 91, 139, 141] }, [26, 32]);
registerAreaEncounters(AREA.SKYREACH_TRAIL, { slope: [74, 75, 66, 67, 56, 57, 111], ridge: [21, 22, 84, 85, 77, 78], rare: [142, 147, 106, 107] }, [30, 38]);
registerAreaEncounters(AREA.SKYREACH_SUMMIT, { summit: [87, 124, 91, 75, 112, 22], rare: [147, 148, 131, 143] }, [38, 46]);

// ---------------------------------------------------------------------------
// Augmentations of the main routes: entrances, quest NPCs, notice boards
// ---------------------------------------------------------------------------

interface RouteAugment {
  portals?: RoutePortal[];
  npcs?: RouteNPC[];
  noticeBoards?: RouteNoticeBoard[];
  fishingSpots?: RouteFishingSpot[];
  /** Quest ids attached to existing NPCs by id. */
  npcQuests?: Record<string, string[]>;
  architecture?: RouteDefinition['architecture'];
}

const ROUTE_AUGMENTS: Record<number, RouteAugment> = {
  0: {
    architecture: 'stucco',
    npcs: [npc({ id: 'r0_mina', x: 2080, y: 300, name: 'Pip\'s Owner Mina', dialogue: 'Viridian is lovely this time of year, isn\'t it?', questIds: ['q_lost_clefairy'] })],
    noticeBoards: [{ id: 'nb_viridian', x: 2290, y: 300, title: 'Viridian Notice Board', questIds: ['q_center_aid'] }],
  },
  1: {
    architecture: 'stone',
    portals: [
      portal({ id: 'r1_thicket', x: 900, y: 112, style: 'forest_path', label: 'Whispering Thicket', target: AREA.WHISPERING_THICKET, targetX: 170, targetY: 535, hidden: true }),
    ],
    npcQuests: { r1_npc1: ['q_bug_survey'], r1_npc4: ['q_glimmer_echoes', 'q_glimmer_deeper'] },
    noticeBoards: [{ id: 'nb_pewter', x: 1910, y: 300, title: 'Pewter Notice Board', questIds: ['q_rematch_brock'] }],
    npcs: [
      npc({
        id: 'r1_brock_rematch',
        x: 2550,
        y: 330,
        name: 'Leader Brock (Rematch)',
        dialogue: 'You\'ve grown strong. My rocks have too.',
        visibleWhen: { questActive: 'q_rematch_brock' },
        trainer: {
          id: 'rematch_brock',
          team: [{ id: 76, lv: 50 }, { id: 139, lv: 50 }, { id: 141, lv: 51 }, { id: 95, lv: 52 }, { id: 112, lv: 54 }],
          reward: 3000,
          intro: 'This time I\'m holding nothing back!',
          defeat: 'A true champion\'s strength. Thank you for the battle.',
        },
      }),
    ],
  },
  2: {
    architecture: 'stucco',
    portals: [portal({ id: 'r2_glimmer', x: 700, y: 112, style: 'cave', label: 'Glimmerstone Cavern', target: AREA.GLIMMERSTONE_1F, targetX: 200, targetY: 500 })],
  },
  3: {
    architecture: 'brick',
    portals: [portal({ id: 'r3_shore', x: 1000, y: 905, style: 'trail', label: 'Saltwind Shore', target: AREA.SALTWIND_SHORE, targetX: 295, targetY: 170 })],
  },
  4: {
    architecture: 'glass',
    portals: [
      portal({
        id: 'r4_skyreach',
        x: 600,
        y: 112,
        style: 'trail',
        label: 'Skyreach Trail',
        target: AREA.SKYREACH_TRAIL,
        targetX: 210,
        targetY: 1000,
        requires: { minBadges: 5 },
        lockedText: 'A ranger stops you: "The mountain is dangerous. Come back once you hold five badges."',
      }),
    ],
    noticeBoards: [{ id: 'nb_celadon', x: 1990, y: 300, title: 'Celadon Notice Board', questIds: ['q_above_clouds'] }],
  },
  5: {
    architecture: 'timber',
    portals: [
      portal({
        id: 'r5_mossveil',
        x: 1200,
        y: 112,
        style: 'forest_path',
        label: 'Mossveil Grove',
        target: AREA.MOSSVEIL_GROVE,
        targetX: 190,
        targetY: 515,
        requires: { flag: 'mossveil_open' },
        lockedText: 'Thick vines and a Warden\'s rope block the path. The Fuchsia Warden may know more.',
      }),
    ],
    npcs: [npc({ id: 'r5_sora', x: 1820, y: 300, name: 'Warden Sora', dialogue: 'The old grove north of the Safari is closed to careless trainers.', questIds: ['q_mossveil', 'q_wild_streak'] })],
  },
  6: {
    architecture: 'glass',
    noticeBoards: [{ id: 'nb_saffron', x: 2110, y: 300, title: 'Saffron Notice Board', questIds: ['q_trainer_gauntlet'] }],
  },
  7: { architecture: 'volcanic' },
  8: { architecture: 'marble' },
};

const augmented = new Set<number>();

/** Resolve any location id (main route 0-8 or special area >= 100). */
export function getRouteDefinition(id: number | undefined | null): RouteDefinition {
  if (id !== undefined && id !== null && id >= 100) {
    const a = SPECIAL_AREAS.find(r => r.id === id);
    if (a) return a;
  }
  const idx = typeof id === 'number' && id >= 0 && id < KANTO_JOURNEY_ROUTES.length ? id : 0;
  const route = KANTO_JOURNEY_ROUTES[idx];
  if (!augmented.has(idx)) {
    augmented.add(idx);
    const aug = ROUTE_AUGMENTS[idx];
    if (aug) {
      route.portals = [...(route.portals || []), ...(aug.portals || [])];
      route.npcs = [...route.npcs, ...(aug.npcs || [])];
      route.noticeBoards = [...(route.noticeBoards || []), ...(aug.noticeBoards || [])];
      route.fishingSpots = [...(route.fishingSpots || []), ...(aug.fishingSpots || [])];
      if (aug.architecture) route.architecture = aug.architecture;
      for (const [npcId, quests] of Object.entries(aug.npcQuests || {})) {
        const n = route.npcs.find(x => x.id === npcId);
        if (n) n.questIds = [...(n.questIds || []), ...quests];
      }
    }
  }
  return route;
}

export function isSpecialArea(id: number | undefined | null): boolean {
  return typeof id === 'number' && id >= 100;
}

/** World-map metadata for discovered areas. Caves are never fast-travel targets. */
export interface AreaInfo {
  id: number;
  name: string;
  kind: 'forest' | 'cave' | 'coast' | 'mountain';
  parentRouteId: number;
  fastTravel: boolean;
  blurb: string;
  /** Position on the world map (0-1000 x 0-750); omitted for sub-floors. */
  map?: [number, number];
}

export const AREA_INFO: AreaInfo[] = [
  { id: AREA.WHISPERING_THICKET, name: 'Whispering Thicket', kind: 'forest', parentRouteId: 1, fastTravel: true, blurb: 'Hidden forest off the Viridian Forest trail.', map: [150, 300] },
  { id: AREA.MOSSVEIL_GROVE, name: 'Mossveil Grove', kind: 'forest', parentRouteId: 5, fastTravel: true, blurb: 'Ancient grove north of the Safari outskirts.', map: [470, 565] },
  { id: AREA.GLIMMERSTONE_1F, name: 'Glimmerstone Cavern', kind: 'cave', parentRouteId: 2, fastTravel: false, blurb: 'Crystal cave in the Mt. Moon foothills.', map: [430, 150] },
  { id: AREA.GLIMMERSTONE_B1, name: 'Glimmerstone Depths', kind: 'cave', parentRouteId: 2, fastTravel: false, blurb: 'The cavern\'s lower floor.' },
  { id: AREA.SALTWIND_SHORE, name: 'Saltwind Shore', kind: 'coast', parentRouteId: 3, fastTravel: true, blurb: 'Fishing village on the southern coast.', map: [760, 600] },
  { id: AREA.CORAL_ISLE, name: 'Coral Isle', kind: 'coast', parentRouteId: 3, fastTravel: true, blurb: 'Island with an old lighthouse.', map: [870, 660] },
  { id: AREA.TIDEWHISPER_GROTTO, name: 'Tidewhisper Grotto', kind: 'cave', parentRouteId: 3, fastTravel: false, blurb: 'Sea cave beneath Coral Isle.' },
  { id: AREA.SKYREACH_TRAIL, name: 'Skyreach Trail', kind: 'mountain', parentRouteId: 4, fastTravel: true, blurb: 'Mountain switchbacks above Celadon.', map: [390, 255] },
  { id: AREA.SKYREACH_SUMMIT, name: 'Skyreach Summit', kind: 'mountain', parentRouteId: 4, fastTravel: false, blurb: 'Snowfields above the clouds.' },
];
