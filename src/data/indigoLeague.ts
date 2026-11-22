/**
 * indigoLeague.ts
 * Indigo League City: the capital of the Pokemon League, built on the Indigo
 * Plateau. The 15 Championship competitors live here during the tournament
 * and can all be talked to; the Indigo Stadium at the east end is where the
 * Championship is fought (entering it starts the tournament).
 *
 * Districts (west to east):
 *   Gateway Plaza       Pokemon Center, Poke Mart, Welcome Center, fountain
 *   Competitors' Quarter lodges, cafe, library, dojo, move tutor, hotel, school
 *   Garden of Legends   ponds, champion statues, shrines, the Founders' Oak
 *   Hall of Fame        League Headquarters, Hall of Fame, Champions' Gallery
 *   Stadium Plaza       the Indigo Stadium, a second Center and Mart
 *
 * Every building door faces south onto a street; everything is laid out on
 * the same flat world coordinates as the other maps, so the 2.5D and 3D views
 * share collision, interactions and NPCs.
 */

import type { RouteDefinition, RouteNPC, RouteTree, RouteBuilding, RouteBench, RouteStreetlamp, RouteTreeType, FoliageColorVariant } from '../systems/RouteExplorationEngine';
import type { Rect } from '../world/WorldTypes';
import { CHAMPIONSHIP_OPPONENTS } from './championship16';
import { COMPETITOR_PROFILES } from './leagueCompetitors';

export const INDIGO_LEAGUE_ID = 110;
const W = 4000;
const H = 1600;

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

// ---------------------------------------------------------------------------
// Streets and plazas
// ---------------------------------------------------------------------------
const PATHS = [
  { ...R(40, 780, 3920, 84), style: 'paved' as const }, // Grand Boulevard
  { ...R(620, 330, 2480, 60), style: 'brick' as const }, // North Promenade
  { ...R(120, 1240, 2980, 60), style: 'brick' as const }, // South Promenade
  { ...R(620, 330, 64, 970), style: 'flagstone' as const }, // Quarter Avenue
  { ...R(1640, 330, 64, 970), style: 'flagstone' as const }, // Garden Avenue
  { ...R(2580, 330, 64, 970), style: 'flagstone' as const }, // Legends Avenue
  { ...R(3040, 330, 64, 970), style: 'flagstone' as const }, // Champions' Avenue
  { ...R(120, 640, 480, 380), style: 'flagstone' as const }, // Gateway Plaza
  { ...R(140, 1000, 60, 260), style: 'flagstone' as const }, // Gateway lane
  { ...R(1760, 600, 780, 40), style: 'cobble' as const }, // Garden walk (north)
  { ...R(1760, 1080, 780, 40), style: 'cobble' as const }, // Garden walk (south)
  { ...R(2000, 900, 320, 220), style: 'flagstone' as const }, // Fountain Court
  { ...R(720, 880, 820, 180), style: 'cobble' as const }, // Practice Grounds
  { ...R(3100, 600, 860, 580), style: 'paved' as const }, // Stadium Plaza
  { ...R(2040, 1300, 240, 200), style: 'flagstone' as const }, // Overlook terrace
];

// ---------------------------------------------------------------------------
// Buildings (doors at the bottom edge, onto a street)
// ---------------------------------------------------------------------------
type B = RouteBuilding & { facade?: 'hall' | 'tower' | 'temple'; model3d?: string };
const BUILDINGS: B[] = [
  // Gateway Plaza
  { type: 'center', x: 160, y: 520, w: 130, h: 110, label: 'Pokémon Center' },
  { type: 'mart', x: 400, y: 524, w: 120, h: 106, label: 'Poké Mart' },
  {
    type: 'house', x: 230, y: 1110, w: 200, h: 120, label: 'League Welcome Center', facade: 'hall', model3d: 'gen:welcome',
    occupant: 'Guide Aiko',
    dialogue: 'Welcome to Indigo League City! Fifteen of Kanto\'s finest trainers are staying here for the Championship. Go and meet them - they all have a story. When you are ready, the Indigo Stadium is at the far east end of the Grand Boulevard.',
  },

  // Competitors' Quarter - north promenade
  {
    type: 'house', x: 720, y: 196, w: 200, h: 134, label: "Competitors' Lodge - Sunrise Wing", roofStyle: 'terracotta', wallColor: '#f5ead6', model3d: 'gen:lodge',
    occupant: 'Lodge Keeper Hana',
    dialogue: 'Every competitor gets a room with a view of the stadium. Ace Trainer Jake asked for the earliest wake-up call. Rival Blue asked for none - he said he does not sleep before a tournament.',
  },
  {
    type: 'house', x: 960, y: 196, w: 200, h: 134, label: "Competitors' Lodge - Sunset Wing", roofStyle: 'slate', wallColor: '#ede7f6', model3d: 'gen:lodge_slate',
    occupant: 'Lodge Keeper Oren',
    dialogue: 'Quiet hours start at ten. Black Belt Daisuke has been politely reminded four times. He apologises, then does push-ups more quietly.',
  },
  {
    type: 'house', x: 1200, y: 214, w: 150, h: 116, label: "Trainer's Café", roofStyle: 'wood', wallColor: '#fde7c8', model3d: 'gen:cafe',
    occupant: 'Barista Lou',
    dialogue: 'Moomoo Milk lattes and berry scones! Lass Emily orders a Pecha tea every morning. Veteran Marcus has had the same order for forty years.',
  },
  {
    type: 'house', x: 1390, y: 200, w: 200, h: 130, label: 'Strategy Library', facade: 'hall', model3d: 'gen:library',
    occupant: 'Librarian Sage',
    dialogue: 'Every Championship battle since the League was founded is recorded here. Scientist Edison has borrowed every single volume. Twice.',
  },

  // Competitors' Quarter - Grand Boulevard
  {
    type: 'house', x: 720, y: 650, w: 210, h: 130, label: 'Training Dojo', roofStyle: 'wood', wallColor: '#e7d3b0', model3d: 'gen:dojo',
    occupant: 'Sensei Goro',
    dialogue: 'Strength is nothing without control. The competitors train in the yard outside every morning - you are welcome to watch.',
  },
  {
    type: 'house', x: 980, y: 656, w: 170, h: 124, label: 'Move Tutor Hall', roofStyle: 'azure', wallColor: '#e0f2fe', model3d: 'gen:tutor',
    occupant: 'Move Tutor Inez',
    dialogue: 'A move is only as good as the moment you choose to use it. That is the one lesson I teach every competitor.',
  },
  {
    type: 'house', x: 1200, y: 660, w: 160, h: 120, label: 'Berry Market', roofStyle: 'emerald', wallColor: '#ecfccb', model3d: 'gen:market',
    occupant: 'Grocer Pim',
    dialogue: 'Oran, Sitrus, Pecha, Chesto - fresh from the Garden of Legends! Botanist Flora grows half of them herself.',
  },
  {
    type: 'house', x: 1400, y: 650, w: 200, h: 130, label: "Competitors' Lounge", facade: 'hall', model3d: 'gen:lounge',
    occupant: 'Host Renata',
    dialogue: 'This is where the competitors watch each other\'s matches on the big screen. The arguments get louder than the stadium crowd.',
  },

  // Competitors' Quarter - south promenade
  {
    type: 'house', x: 720, y: 1110, w: 180, h: 130, label: 'Pokémon Fan Club', roofStyle: 'terracotta', wallColor: '#fce7f3', model3d: 'gen:fanclub',
    occupant: 'Fan Club Chair Mabel',
    dialogue: 'We have a poster of every competitor! Young Prodigy Leo signed his three times. He is very proud of his signature.',
  },
  {
    type: 'house', x: 940, y: 1110, w: 260, h: 130, label: 'Plateau Grand Hotel', facade: 'tower', model3d: 'gen:hotel',
    occupant: 'Concierge Bellamy',
    dialogue: 'Every suite is booked for the Championship. Families of the competitors have travelled from all over Kanto to watch.',
  },
  {
    type: 'house', x: 1260, y: 1110, w: 200, h: 130, label: 'Trainer School', roofStyle: 'azure', wallColor: '#f1f5f9', model3d: 'gen:school',
    occupant: 'Teacher Ruth',
    dialogue: 'The children here dream of competing one day. Today they are studying type matchups - by watching the real competitors train.',
  },

  // Garden of Legends
  {
    type: 'house', x: 2200, y: 206, w: 220, h: 124, label: 'Conservatory', roofStyle: 'emerald', wallColor: '#ecfdf5', model3d: 'gen:conservatory',
    occupant: 'Gardener Hugo',
    dialogue: 'Rare plants from every corner of Kanto grow under this glass. Botanist Flora has been helping me since she arrived - she has a gift.',
  },
  {
    type: 'house', x: 1820, y: 214, w: 180, h: 116, label: 'Garden Pavilion', roofStyle: 'emerald', wallColor: '#fefce8', model3d: 'gen:pavilion',
    occupant: 'Poet Wren',
    dialogue: 'People come to the gardens to be calm before they battle. I come to write about them. Most of my poems are about nerves.',
  },

  // Hall of Fame district
  {
    type: 'house', x: 2680, y: 150, w: 320, h: 180, label: 'Pokémon League Headquarters', facade: 'tower', model3d: 'gen:hq',
    occupant: 'League Director Hayes',
    dialogue: 'The Pokémon League was founded on this plateau to give every trainer in Kanto the same fair chance to become Champion. That promise is older than this building - and it still holds.',
  },
  {
    type: 'house', x: 2680, y: 600, w: 320, h: 180, label: 'Hall of Fame', facade: 'temple', model3d: 'p:greek_temple',
    occupant: 'Curator Elsbeth',
    dialogue: 'Every champion\'s team is recorded in this hall forever. There is a space on the newest wall. It has been waiting a long time for a name.',
  },
  {
    type: 'house', x: 2700, y: 1100, w: 280, h: 140, label: "Champions' Gallery", facade: 'hall', model3d: 'gen:gallery',
    occupant: 'Gallery Guide Teo',
    dialogue: 'Portraits of every champion and their partner Pokémon. Look closely - in every painting, the trainer is looking at their partner, not at the painter.',
  },

  // Stadium Plaza
  { type: 'stadium', x: 3170, y: 150, w: 720, h: 450, label: 'Indigo Stadium' },
  { type: 'center', x: 3760, y: 1040, w: 130, h: 110, label: 'Stadium Pokémon Center' },
  { type: 'mart', x: 3170, y: 1044, w: 120, h: 106, label: 'Stadium Poké Mart' },
];

// ---------------------------------------------------------------------------
// People: the 15 competitors + the staff and citizens of the city
// ---------------------------------------------------------------------------
const COMPETITOR_SPOTS: Record<string, [number, number, RouteNPC['facing']]> = {
  'Ace Trainer Jake': [480, 950, 'left'],
  'Pyromaniac Flint': [1940, 1190, 'right'],
  'Sailor Marina': [2080, 680, 'up'],
  'Ninja Shadow Raven': [1180, 480, 'down'],
  'Black Belt Daisuke': [840, 960, 'right'],
  'Scientist Edison': [3300, 1000, 'up'],
  'Botanist Flora': [2320, 690, 'down'],
  'Psychic Soren': [2400, 1190, 'left'],
  'Mountaineer Boulder': [3820, 660, 'down'],
  'Veteran Marcus': [2860, 900, 'down'],
  'Young Prodigy Leo': [1500, 920, 'down'],
  'Dragon Tamer Drake': [2210, 730, 'down'],
  'Lass Emily': [290, 955, 'right'],
  'Bird Keeper Zephyr': [1490, 420, 'up'],
  'Rival Blue': [3640, 660, 'down'],
};

const COMPETITORS: RouteNPC[] = CHAMPIONSHIP_OPPONENTS.map((c, i) => {
  const spot = COMPETITOR_SPOTS[c.name] || [400 + i * 200, 900, 'down'];
  const profile = COMPETITOR_PROFILES[c.name];
  return {
    id: 'il_comp_' + (i + 1),
    x: spot[0],
    y: spot[1],
    avatar: c.avatar,
    name: c.name,
    dialogue: profile?.greeting || c.dialogue?.intro || 'The Championship is almost here!',
    facing: spot[2],
    competitorId: i + 1,
  };
});

const CITIZENS: RouteNPC[] = [
  {
    id: 'il_guide', x: 360, y: 700, avatar: '', name: 'League Guide Aiko', facing: 'down',
    dialogue: 'Welcome to Indigo League City! Here, take these for the road ahead - every competitor gets them.',
    gift: { type: 'berry', name: 'Sitrus Berry', amount: 2 },
  },
  { id: 'il_receptionist', x: 3420, y: 660, avatar: '', name: 'Receptionist Mai', facing: 'down', dialogue: 'The Indigo Stadium is the home of the Kanto Championship. Only trainers holding all eight Gym Badges may enter as competitors. Step through the main gate when you are ready.' },
  { id: 'il_announcer', x: 3400, y: 1100, avatar: '', name: 'Announcer Lily', facing: 'up', dialogue: 'Sixteen trainers! Four rounds! One Champion! I have been practising my voice all week - the whole Plateau is going to hear this final!' },
  { id: 'il_reporter', x: 2950, y: 960, avatar: '', name: 'Reporter Ken', facing: 'left', dialogue: 'Kanto Daily, sports desk. Everyone is betting on Rival Blue to reach the final. Off the record? I have been watching you. I think they are all wrong.' },
  { id: 'il_fan', x: 1060, y: 940, avatar: '', name: 'Superfan Toby', facing: 'down', dialogue: 'I have watched every Championship since I was five! The Round of 16 is the best part - nobody knows who will make it yet.' },
  { id: 'il_gardener', x: 2060, y: 1160, avatar: '', name: 'Gardener Hugo', facing: 'right', dialogue: 'Every tree in this garden was planted by a past champion. The big oak by the shrine is the oldest - the Founders planted it the year the League began.' },
  { id: 'il_child', x: 1380, y: 1320, avatar: '', name: 'Schoolkid Noor', facing: 'up', dialogue: 'When I grow up I am going to enter the Championship! My teacher says I have to learn type matchups first. Ugh.' },
  { id: 'il_elder', x: 2240, y: 1420, avatar: '', name: 'Old Man Ferris', facing: 'down', dialogue: 'From the Overlook you can see all of Kanto. Every town, every route. Every trainer here walked that whole way to stand on this plateau.' },
  { id: 'il_nurse', x: 3600, y: 1110, avatar: '', name: 'Medic Joy', facing: 'down', dialogue: 'Between rounds, bring your team to the Stadium Pokémon Center. Every competitor gets full treatment, free of charge.' },
  { id: 'il_guard', x: 2520, y: 945, avatar: '', name: 'League Guard Bram', facing: 'left', dialogue: 'The city is safe and the competitors are all accounted for. All fifteen of them. Sixteen, counting you.' },
];

// ---------------------------------------------------------------------------
// Gardens, monuments, props
// ---------------------------------------------------------------------------
const PONDS = [
  { ...R(1760, 420, 280, 150), pier: { x: 1880, y: 520, w: 36, h: 60 } },
  { ...R(2300, 430, 240, 140) },
  { ...R(1760, 920, 210, 130) },
  { ...R(2360, 920, 190, 130) },
];

const LANDMARKS = [
  { id: 'il_statue_first', x: 1880, y: 700, style: 'statue' as const, title: 'Statue of the First Champion', lines: ['A trainer and their partner, carved side by side.', '"The first Champion of the Pokémon League. They won with a team of six Pokémon they had caught on a single route."'] },
  { id: 'il_statue_flame', x: 2130, y: 700, style: 'statue' as const, title: 'Statue of the Galloping Flame', lines: ['A great fire horse rearing on a tall pedestal.', '"For the champion who led every battle with a single Rapidash - and never once switched it out."'] },
  { id: 'il_statue_partner', x: 2440, y: 700, style: 'statue' as const, title: 'Statue of Partners', lines: ['A trainer kneeling beside a small Pokémon.', '"No champion stands alone." Fresh flowers are left here every morning.'] },
  { id: 'il_eternal_flame', x: 1880, y: 1180, style: 'shrine' as const, title: 'The Eternal Flame', lines: ['A flame that has burned since the League was founded.', 'Every competitor lights a candle here before the Championship begins.'] },
  { id: 'il_reflection', x: 2460, y: 1180, style: 'shrine' as const, title: 'Shrine of Reflection', lines: ['A quiet stone shrine beside a still pond.', 'Visitors come here to remember the Pokémon who helped them on their journey.'] },
  { id: 'il_founders_oak', x: 2160, y: 1210, style: 'old_tree' as const, title: "The Founders' Oak", lines: ['The oldest tree on the Plateau.', 'Planted by the founders of the Pokémon League on the day the first Championship began.'] },
  { id: 'il_overlook', x: 2160, y: 1440, style: 'viewpoint' as const, title: 'Plateau Overlook', lines: ['All of Kanto spreads out below: Pallet Town, Viridian Forest, the sea, the mountains.', 'Every route you walked to get here is down there somewhere.'] },
  { id: 'il_league_arch', x: 3530, y: 1060, style: 'monument' as const, title: "Champions' Arch", lines: ['A gold-trimmed arch at the heart of the Stadium Plaza.', 'Every Champion\'s name is engraved on its inner stones. The newest stone is still blank.'] },
];

const SIGNPOSTS = [
  { id: 'il_sign_gate', x: 600, y: 700, title: 'Indigo League City', lines: ['Welcome to the capital of the Pokémon League.', 'Gateway Plaza  ·  Competitors\' Quarter  ·  Garden of Legends  ·  Hall of Fame  ·  Indigo Stadium (east)'] },
  { id: 'il_sign_garden', x: 1720, y: 900, title: 'Garden of Legends', lines: ['Statues of past champions, the Eternal Flame and the Founders\' Oak.', 'Please do not feed the Magikarp in the ponds.'] },
  { id: 'il_sign_stadium', x: 3070, y: 900, title: 'Indigo Stadium', lines: ['Home of the Kanto Championship.', 'Competitors: enter through the main gate. Eight Gym Badges required.'] },
];

const NOTICE_BOARDS = [{ id: 'nb_league', x: 560, y: 1000, title: 'Championship Notice Board', questIds: [] as string[] }];

const FOUNTAINS = [
  { x: 380, y: 900, radius: 38, style: 'marble' as const },
  { x: 2160, y: 1010, radius: 46, style: 'marble' as const },
  { x: 3530, y: 880, radius: 50, style: 'marble' as const },
];

const LAMPS: RouteStreetlamp[] = [];
for (let x = 90; x < 3950; x += 190) {
  if (x > 3080 && x < 3980) continue; // the plaza has its own
  LAMPS.push({ x, y: 884, style: 'ornate' });
}
for (let x = 1780; x < 2560; x += 190) LAMPS.push({ x, y: 770, style: 'ornate' });
for (const x of [3130, 3930]) for (let y = 640; y < 1160; y += 130) LAMPS.push({ x, y, style: 'ornate' });

const BENCHES: RouteBench[] = [
  { x: 180, y: 980, w: 30 }, { x: 540, y: 980, w: 30 },
  { x: 900, y: 470, w: 30 }, { x: 1380, y: 470, w: 30 },
  { x: 760, y: 1060, w: 30 }, { x: 1440, y: 1060, w: 30 },
  { x: 2040, y: 960, w: 28 }, { x: 2250, y: 960, w: 28 },
  { x: 2700, y: 880, w: 30 }, { x: 2940, y: 1060, w: 30 },
  { x: 3240, y: 960, w: 30 }, { x: 3800, y: 960, w: 30 },
  { x: 2120, y: 1360, w: 28 }, { x: 2200, y: 1360, w: 28 },
];

// ---------------------------------------------------------------------------
// Trees: avenues, parks and the garden groves (deterministic placement)
// ---------------------------------------------------------------------------
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

const inside = (x: number, y: number, r: Rect, m = 0) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;

function plantCityTrees(): RouteTree[] {
  const r = rng(110);
  const trees: RouteTree[] = [];
  const blocked = (x: number, y: number) => {
    const foot = y + 18;
    if (PATHS.some(p => inside(x, foot, p, 30))) return true;
    if (BUILDINGS.some(b => inside(x, foot, b, 46))) return true;
    if (PONDS.some(p => inside(x, foot, p, 34))) return true;
    if (FOUNTAINS.some(f => Math.hypot(f.x - x, f.y - foot) < f.radius + 50)) return true;
    const spots: { x: number; y: number }[] = [...COMPETITORS, ...CITIZENS, ...LANDMARKS, ...SIGNPOSTS, ...NOTICE_BOARDS, ...BENCHES, ...LAMPS, { x: 200, y: 820 }];
    if (spots.some(o => Math.hypot(o.x - x, o.y - foot) < 60)) return true;
    return trees.some(t => Math.hypot(t.x - x, t.y - y) < 54);
  };
  const add = (x: number, y: number, type: RouteTreeType, colorVariant: FoliageColorVariant, scale = 1) => {
    if (x < 40 || x > W - 40 || y < 70 || y > H - 60 || blocked(x, y)) return;
    trees.push({ x: Math.round(x), y: Math.round(y), type, colorVariant, scale: +scale.toFixed(2) });
  };
  // Avenue rows: decorative trees lining both sides of the Grand Boulevard and promenades
  for (let x = 80; x < 3080; x += 96) {
    add(x + (r() - 0.5) * 10, 940, 'decorative', 'standard', 0.9 + r() * 0.15);
  }
  for (let x = 700; x < 3080; x += 110) {
    add(x, 410, r() < 0.5 ? 'decorative' : 'slender', 'standard', 0.95);
    add(x + 40, 1180, r() < 0.5 ? 'decorative' : 'slender', 'standard', 0.95);
  }
  // Gardens: blossom groves around the ponds and statues
  for (let i = 0; i < 90; i++) {
    const x = 1720 + r() * 860;
    const y = 400 + r() * 840;
    add(x, y, r() < 0.55 ? 'blossom' : 'decorative', r() < 0.55 ? 'blossom' : r() < 0.2 ? 'golden' : 'standard', 0.85 + r() * 0.35);
  }
  // Competitors' Green and Practice Grounds edges
  for (let i = 0; i < 60; i++) {
    const x = 700 + r() * 920;
    const y = 400 + r() * 840;
    add(x, y, r() < 0.4 ? 'oak' : r() < 0.7 ? 'mature' : 'conifer', 'standard', 0.9 + r() * 0.3);
  }
  // A frame of tall conifers along the northern and southern edges
  for (let x = 60; x < W - 60; x += 70) {
    add(x + (r() - 0.5) * 20, 90 + r() * 30, 'conifer', r() < 0.5 ? 'dark' : 'standard', 1 + r() * 0.3);
    add(x + (r() - 0.5) * 20, H - 90 - r() * 30, 'conifer', r() < 0.5 ? 'dark' : 'standard', 1 + r() * 0.3);
  }
  // Hall of Fame cypress line and the Overlook copse
  for (let y = 420; y < 1200; y += 90) add(3020, y, 'slender', 'dark', 1.05);
  for (let i = 0; i < 24; i++) add(1900 + r() * 520, 1320 + r() * 220, r() < 0.5 ? 'mature' : 'blossom', r() < 0.4 ? 'blossom' : 'standard', 0.9 + r() * 0.3);
  return trees;
}

export const indigoLeagueCity: RouteDefinition = {
  id: INDIGO_LEAGUE_ID,
  name: 'Indigo League City',
  locationLabel: 'Indigo League City',
  destinationLabel: 'Indigo Stadium',
  worldWidth: W,
  worldHeight: H,
  theme: 'city',
  isSpecialArea: true,
  areaKind: 'city',
  parentRouteId: 8,
  architecture: 'marble',
  music: 'menu',
  startX: 210,
  startY: 820,
  exitX: 0,
  targetEncounters: 0,
  sections: [
    { id: 'il_gate', name: 'Gateway Plaza', subtitle: 'Welcome to Indigo League City', icon: '🏛️', x: 0, y: 0, w: 640, h: H },
    { id: 'il_quarter', name: "Competitors' Quarter", subtitle: 'Where the Championship trainers live', icon: '🏨', x: 640, y: 0, w: 1060, h: H },
    { id: 'il_garden', name: 'Garden of Legends', subtitle: 'Statues of champions past', icon: '🌸', x: 1700, y: 0, w: 900, h: H },
    { id: 'il_hall', name: 'Hall of Fame District', subtitle: 'The heart of the Pokémon League', icon: '🏆', x: 2600, y: 0, w: 480, h: H },
    { id: 'il_stadium', name: 'Indigo Stadium', subtitle: 'Home of the Kanto Championship', icon: '🏟️', x: 3080, y: 0, w: 920, h: H },
  ],
  path: PATHS,
  grassPatches: [],
  buildings: BUILDINGS,
  items: [],
  npcs: [...COMPETITORS, ...CITIZENS],
  ponds: PONDS,
  fountains: FOUNTAINS,
  streetlamps: LAMPS,
  benches: BENCHES,
  signposts: SIGNPOSTS,
  noticeBoards: NOTICE_BOARDS,
  landmarks: LANDMARKS,
  portals: [
    {
      id: 'il_exit',
      x: 70,
      y: 760,
      style: 'trail',
      label: 'Indigo Plateau (Route)',
      target: 8,
      targetX: 3200,
      targetY: 500,
    },
  ],
  trees: plantCityTrees(),
};
