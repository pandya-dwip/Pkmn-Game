/**
 * quests.ts
 * Side-quest definitions (pure data). Logic lives in systems/QuestSystem.ts.
 * Givers are NPCs or notice boards placed in the world (see specialAreas.ts).
 */

export type QuestCategory = 'collection' | 'exploration' | 'trainer' | 'assistance' | 'pokemon';

export type QuestObjective =
  | { kind: 'catch'; count: number; type?: string; areaIds?: number[]; label: string }
  | { kind: 'wild_win'; count: number; areaIds?: number[]; label: string }
  | { kind: 'defeat_trainer'; trainerIds: string[]; count: number; label: string }
  | { kind: 'visit_area'; areaId: number; label: string }
  | { kind: 'landmark'; landmarkId: string; label: string }
  | { kind: 'flag'; flag: string; label: string }
  | { kind: 'talk'; npcId: string; label: string }
  | { kind: 'key_item'; item: string; label: string }
  | { kind: 'show_type'; type: string; minLevel: number; label: string }
  | { kind: 'have_item'; item: 'b' | 'b50' | 'balls'; count: number; consume: boolean; label: string };

export interface QuestReward {
  money?: number;
  balls?: number;
  greatBalls?: number;
  ultraBalls?: number;
  oran?: number;
  sitrus?: number;
  revives?: number;
  stones?: Record<string, number>;
  cosmetics?: string[];
  flags?: string[];
  /** Human-readable extras (unlocks) shown in the journal. */
  notes?: string[];
}

export interface QuestSource {
  kind: 'npc' | 'board';
  id: string;
  routeId: number;
  name: string;
}

export interface QuestDef {
  id: string;
  title: string;
  category: QuestCategory;
  summary: string;
  giver: QuestSource;
  turnIn?: QuestSource; // defaults to the giver
  location: string;
  requires?: { minBadges?: number; questsCompleted?: string[]; flags?: string[] };
  objectives: QuestObjective[];
  rewards: QuestReward;
  dialogue: { offer: string; reminder: string; complete: string };
  /** Spoken when the player talks to a 'talk' objective NPC. */
  talkLine?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q_lost_clefairy',
    title: 'A Ribbon in the Thicket',
    category: 'assistance',
    summary: 'Mina\'s Clefairy, Pip, wandered off near the Viridian Forest trail. Find Pip and bring good news back.',
    giver: { kind: 'npc', id: 'r0_mina', routeId: 0, name: 'Pip\'s Owner Mina' },
    location: 'Viridian Forest trail (north edge)',
    objectives: [
      { kind: 'flag', flag: 'lost_clefairy_found', label: 'Find Pip somewhere off the forest trail' },
    ],
    rewards: { money: 800, greatBalls: 3 },
    dialogue: {
      offer: 'Have you seen a Clefairy with a blue ribbon? Pip chased a butterfly into the trees by the Viridian Forest trail and never came back. Some say there\'s a hidden path along the forest\'s north edge...',
      reminder: 'Pip loves quiet, mossy places. Please keep looking near the forest trail\'s north edge.',
      complete: 'Pip is safe? Oh, thank you! Pip came running home just after you found it. Please take these.',
    },
  },
  {
    id: 'q_bug_survey',
    title: 'Bug Survey',
    category: 'collection',
    summary: 'Sammy is cataloguing local Bug-type Pokémon and needs fresh field records.',
    giver: { kind: 'npc', id: 'r1_npc1', routeId: 1, name: 'Bug Catcher Sammy' },
    location: 'Any tall grass or forest',
    objectives: [{ kind: 'catch', count: 3, type: 'Bu', label: 'Catch Bug-type Pokémon' }],
    rewards: { money: 600, sitrus: 3 },
    dialogue: {
      offer: 'I\'m writing the ultimate bug guide! Catch three Bug-type Pokémon and tell me about them?',
      reminder: 'Bug-types love forests and long grass. Three is all I need!',
      complete: 'These notes are amazing! Take some Sitrus Berries for the road.',
    },
  },
  {
    id: 'q_glimmer_echoes',
    title: 'Echoes Underground',
    category: 'exploration',
    summary: 'Geologist Slate heard of a crystal cave in the Mt. Moon foothills and of a glowing heart deep inside.',
    giver: { kind: 'npc', id: 'r1_npc4', routeId: 1, name: 'Geologist Slate' },
    location: 'Mt. Moon Foothills (Route 3 & 4)',
    requires: { minBadges: 1 },
    objectives: [
      { kind: 'visit_area', areaId: 103, label: 'Find Glimmerstone Cavern' },
      { kind: 'landmark', landmarkId: 'crystal_heart', label: 'Reach the Crystal Heart on the lower floor' },
    ],
    rewards: { ultraBalls: 2, cosmetics: ['hat_helmet', 'outfit_caver'], notes: ['Headlamp Helmet & Cavern Explorer outfit'] },
    dialogue: {
      offer: 'Hikers talk of a cavern in the Mt. Moon foothills where the walls glitter. Supposedly there\'s a crystal "heart" on the lower floor. Will you confirm it?',
      reminder: 'The cavern mouth is on the north side of the Mt. Moon foothills. Bring light if you can.',
      complete: 'A crystal heart! Incredible. You\'ve earned some proper caving gear.',
    },
  },
  {
    id: 'q_glimmer_deeper',
    title: 'Field Sample',
    category: 'pokemon',
    summary: 'Slate wants a Rock-type Pokémon caught inside Glimmerstone Cavern to study crystal deposits.',
    giver: { kind: 'npc', id: 'r1_npc4', routeId: 1, name: 'Geologist Slate' },
    location: 'Glimmerstone Cavern',
    requires: { questsCompleted: ['q_glimmer_echoes'] },
    objectives: [{ kind: 'catch', count: 1, type: 'Ro', areaIds: [103, 104], label: 'Catch a Rock-type inside Glimmerstone Cavern' }],
    rewards: { money: 1200, stones: { Mo: 1 } },
    dialogue: {
      offer: 'One more favour: Rock-types from that cavern should carry crystal dust. Catch one there for me?',
      reminder: 'It has to be caught inside Glimmerstone Cavern, either floor.',
      complete: 'Look at that sparkle! Here, a Moon Stone from my own collection.',
    },
  },
  {
    id: 'q_shore_showdown',
    title: 'Shoreline Showdown',
    category: 'trainer',
    summary: 'Surfer Marlo has beaten every trainer in Saltwind. Ilse wants someone to humble him.',
    giver: { kind: 'npc', id: 'ss_ilse', routeId: 105, name: 'Dockmaster Ilse' },
    location: 'Saltwind Shore (east beach)',
    objectives: [{ kind: 'defeat_trainer', trainerIds: ['marlo'], count: 1, label: 'Defeat Surfer Marlo' }],
    rewards: { money: 1500, cosmetics: ['hat_sailor'], notes: ['Sailor Cap'] },
    dialogue: {
      offer: 'Marlo on the east beach won\'t stop boasting. Beat him and I\'ll find you a proper sailor\'s cap.',
      reminder: 'Marlo is on the east end of the beach, past the second pier.',
      complete: 'Ha! The whole dock heard that. One sailor cap, as promised.',
    },
  },
  {
    id: 'q_parcel',
    title: 'Special Delivery',
    category: 'assistance',
    summary: 'Deliver Ilse\'s parcel of lamp oil to Keeper Orin at the Coral Isle lighthouse.',
    giver: { kind: 'npc', id: 'ss_ilse', routeId: 105, name: 'Dockmaster Ilse' },
    location: 'Coral Isle (by ferry)',
    requires: { minBadges: 3 },
    objectives: [{ kind: 'talk', npcId: 'ci_orin', label: 'Deliver the parcel to Keeper Orin' }],
    rewards: { stones: { Wa: 1 }, flags: ['lapras_cove'], notes: ['A rare Pokémon appears at Coral Isle'] },
    talkLine: 'Lamp oil from Ilse! Perfect timing. Tell her the lamp keeps turning, and... between us, a rare visitor has been resting by the east cove lately.',
    dialogue: {
      offer: 'This parcel needs to reach Keeper Orin on Coral Isle. Captain Mira\'s ferry leaves from the east pier.',
      reminder: 'Captain Mira at the end of the east pier will take you across.',
      complete: 'Delivered safe and sound. Thank you! Take this stone, it washed up last spring.',
    },
  },
  {
    id: 'q_coastal_research',
    title: 'Coastal Life',
    category: 'collection',
    summary: 'Researcher Tali is studying how Pokémon adapt to the coast.',
    giver: { kind: 'npc', id: 'ss_tali', routeId: 105, name: 'Researcher Tali' },
    location: 'Saltwind Shore, Coral Isle or Tidewhisper Grotto',
    objectives: [{ kind: 'catch', count: 2, areaIds: [105, 106, 107], label: 'Catch Pokémon on the coast' }],
    rewards: { money: 900, greatBalls: 4 },
    dialogue: {
      offer: 'Could you catch two Pokémon anywhere along this coast? Fishing counts too!',
      reminder: 'Beach grass, fishing spots, the island... anywhere on this coast works.',
      complete: 'Wonderful specimens. These Great Balls are from my lab budget, use them well.',
    },
  },
  {
    id: 'q_show_water',
    title: 'Tide Partner',
    category: 'pokemon',
    summary: 'Tali wants to see a well-trained Water-type Pokémon up close.',
    giver: { kind: 'npc', id: 'ss_tali', routeId: 105, name: 'Researcher Tali' },
    location: 'Bring it to Saltwind Shore',
    objectives: [{ kind: 'show_type', type: 'Wa', minLevel: 25, label: 'Have a Water-type (Lv 25+) in your party' }],
    rewards: { sitrus: 2, revives: 2 },
    dialogue: {
      offer: 'I\'d love to observe a strong Water-type. Lv 25 or higher, in your party when you talk to me.',
      reminder: 'A Water-type at Lv 25 or above, in your party.',
      complete: 'Beautiful fins... thank you! Some supplies for your journey.',
    },
  },
  {
    id: 'q_mossveil',
    title: 'The Warden\'s Trust',
    category: 'trainer',
    summary: 'Warden Sora guards the path to Mossveil Grove. Prove yourself by winning wild battles in the Safari outskirts.',
    giver: { kind: 'npc', id: 'r5_sora', routeId: 5, name: 'Warden Sora' },
    location: 'Cycling Road & Safari outskirts',
    objectives: [{ kind: 'wild_win', count: 3, areaIds: [5], label: 'Win wild battles on Cycling Road & Safari' }],
    rewards: { money: 1000, flags: ['mossveil_open'], notes: ['Unlocks Mossveil Grove'] },
    dialogue: {
      offer: 'Mossveil Grove is fragile. Show me you can handle wild Pokémon: win three wild battles out here.',
      reminder: 'Three wild battles on this route. I\'m watching.',
      complete: 'Good. I\'ve cut the rope at the grove path north of here. Tread lightly.',
    },
  },
  {
    id: 'q_wild_streak',
    title: 'Grove Guardian',
    category: 'trainer',
    summary: 'Sora wants the grove\'s aggressive Pokémon calmed down through battle.',
    giver: { kind: 'npc', id: 'r5_sora', routeId: 5, name: 'Warden Sora' },
    location: 'Mossveil Grove',
    requires: { questsCompleted: ['q_mossveil'] },
    objectives: [{ kind: 'wild_win', count: 5, areaIds: [102], label: 'Win wild battles in Mossveil Grove' }],
    rewards: { ultraBalls: 3, cosmetics: ['bp_explorer'], notes: ['Leather Explorer backpack'] },
    dialogue: {
      offer: 'Some grove Pokémon have grown too territorial. Win five battles there to settle them.',
      reminder: 'Five wild battles inside Mossveil Grove.',
      complete: 'The grove is calmer already. This pack served me well; it\'s yours now.',
    },
  },
  {
    id: 'q_mountain_remedy',
    title: 'Mountain Remedy',
    category: 'assistance',
    summary: 'Bram needs a Frostbloom Herb from the summit to brew medicine for climbers.',
    giver: { kind: 'npc', id: 'st_bram', routeId: 108, name: 'Shelter Keeper Bram' },
    location: 'Skyreach Summit',
    objectives: [{ kind: 'key_item', item: 'frostbloom', label: 'Find a Frostbloom Herb on the summit' }],
    rewards: { revives: 3, cosmetics: ['outfit_summit'], notes: ['Summit Parka'] },
    dialogue: {
      offer: 'Climbers keep coming down with chills. A Frostbloom Herb from the summit would fix that. They hide in the snow, so look carefully.',
      reminder: 'Frostbloom grows in sheltered snow near the summit\'s eastern rocks.',
      complete: 'Frostbloom! Wear this parka, it\'s warmer than anything in the valley.',
    },
  },
  {
    id: 'q_above_clouds',
    title: 'Above the Clouds',
    category: 'exploration',
    summary: 'The Celadon Hiking Club is looking for trainers to confirm two famous sights on Skyreach.',
    giver: { kind: 'board', id: 'nb_celadon', routeId: 4, name: 'Celadon Notice Board' },
    location: 'Skyreach Trail & Summit',
    requires: { minBadges: 5 },
    objectives: [
      { kind: 'landmark', landmarkId: 'skyreach_lookout', label: 'Visit Skyreach Lookout' },
      { kind: 'landmark', landmarkId: 'summit_cairn', label: 'Add a stone to the Summit Cairn' },
    ],
    rewards: { money: 2000, ultraBalls: 2 },
    dialogue: {
      offer: 'HIKING CLUB: Visit the Skyreach Lookout and the Summit Cairn, then report back to this board.',
      reminder: 'Both sights are on Skyreach (trail entrance north of Celadon\'s outskirts).',
      complete: 'Your report has been pinned. The club left a reward envelope for you.',
    },
  },
  {
    id: 'q_rematch_brock',
    title: 'Rock-Solid Rematch',
    category: 'trainer',
    summary: 'The Pewter Gym Leader is accepting rematches from trainers who hold all eight badges.',
    giver: { kind: 'board', id: 'nb_pewter', routeId: 1, name: 'Pewter Notice Board' },
    location: 'Outside Pewter Gym',
    requires: { minBadges: 8 },
    objectives: [{ kind: 'defeat_trainer', trainerIds: ['rematch_brock'], count: 1, label: 'Win the rematch outside Pewter Gym' }],
    rewards: { money: 3000, ultraBalls: 3 },
    dialogue: {
      offer: 'PEWTER GYM: The Leader awaits challengers with eight badges for a full-power rematch outside the Gym.',
      reminder: 'The Leader is waiting outside Pewter Gym.',
      complete: 'The Gym staff have left your prize at the board.',
    },
  },
  {
    id: 'q_trainer_gauntlet',
    title: 'Wanderer\'s Gauntlet',
    category: 'trainer',
    summary: 'Defeat three wandering trainers who roam Kanto\'s wild places.',
    giver: { kind: 'board', id: 'nb_saffron', routeId: 6, name: 'Saffron Notice Board' },
    location: 'Glimmerstone Cavern, Saltwind Shore, Mossveil Grove, Skyreach Trail',
    requires: { minBadges: 6 },
    objectives: [
      { kind: 'defeat_trainer', trainerIds: ['hiker_dale', 'marlo', 'bugmaniac_ren', 'blackbelt_koa'], count: 3, label: 'Defeat wandering trainers' },
    ],
    rewards: { money: 2500, ultraBalls: 2 },
    dialogue: {
      offer: 'TRAINERS WANTED: Defeat three of the wanderers who train in caves, beaches, groves and mountains.',
      reminder: 'Wanderers train in Glimmerstone, Saltwind, Mossveil and on Skyreach.',
      complete: 'Gauntlet complete! A reward has been left for you.',
    },
  },
  {
    id: 'q_center_aid',
    title: 'Berries for the Clinic',
    category: 'assistance',
    summary: 'The Viridian Pokémon Center is short on Oran Berries for injured wild Pokémon.',
    giver: { kind: 'board', id: 'nb_viridian', routeId: 0, name: 'Viridian Notice Board' },
    location: 'Viridian Notice Board',
    objectives: [{ kind: 'have_item', item: 'b', count: 3, consume: true, label: 'Bring 3 Oran Berries' }],
    rewards: { money: 300, sitrus: 2 },
    dialogue: {
      offer: 'POKÉMON CENTER: We need 3 Oran Berries to treat wild Pokémon. Drop them off here.',
      reminder: 'Leave 3 Oran Berries at this board.',
      complete: 'You left 3 Oran Berries in the drop box. A thank-you parcel was waiting inside.',
    },
  },
  {
    id: 'q_grotto_glow',
    title: 'Lights Beneath the Waves',
    category: 'exploration',
    summary: 'Keeper Orin has seen a strange glow from the sea cave on Coral Isle.',
    giver: { kind: 'npc', id: 'ci_orin', routeId: 106, name: 'Keeper Orin' },
    location: 'Tidewhisper Grotto',
    objectives: [{ kind: 'landmark', landmarkId: 'grotto_glow', label: 'Investigate the glow in Tidewhisper Grotto' }],
    rewards: { money: 1500, greatBalls: 3 },
    dialogue: {
      offer: 'Some nights the grotto glows from inside. My knees won\'t manage the rocks anymore. Would you take a look?',
      reminder: 'The grotto entrance is on the west side of the island.',
      complete: 'Luminous Pokémon in a tide pool? Sixty years and I never knew. Thank you!',
    },
  },
];

export function getQuestDef(id: string): QuestDef | undefined {
  return QUESTS.find(q => q.id === id);
}
