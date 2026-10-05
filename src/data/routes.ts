/**
 * routes.ts
 * Expanded, exploration-oriented Kanto journey route maps.
 * Features:
 * - Significantly expanded world areas (2600px - 3600px width, 900px - 1100px height)
 * - Multiple branching paths: Main Trail, Upper Ridges, Lower Woodlands & Shorelines
 * - Multiple distinct tall grass encounter zones (field, deep, water, forest, rock, rare)
 * - Diverse hidden items: Poké Balls, Great Balls, Ultra Balls, healing berries, and funds
 * - Rich NPCs with tips, regional lore, and gifts
 * - Natural city plazas featuring Pokémon Centers, Poké Marts, Gyms, and gates
 */

import { RouteDefinition } from '../systems/RouteExplorationEngine';

export const KANTO_JOURNEY_ROUTES: RouteDefinition[] = [
  // ==========================================================================
  // ROUTE 0: Pallet Town ➔ Route 1 ➔ Viridian City (Before Gym 1)
  // ==========================================================================
  {
    id: 0,
    name: 'Route 1',
    locationLabel: 'Route 1 & Viridian City',
    destinationLabel: 'Viridian City & Pewter Gateway',
    worldWidth: 2600,
    worldHeight: 920,
    theme: 'route',
    startX: 80,
    startY: 420,
    path: [
      // 1. Main Central Trail from Pallet to Viridian
      { x: 40, y: 390, w: 1400, h: 80 },
      // 2. Upper Meadow Path (branching north)
      { x: 340, y: 220, w: 760, h: 64 },
      { x: 340, y: 220, w: 64, h: 180 },
      { x: 1040, y: 220, w: 64, h: 180 },
      // 3. Lower Riverside Trail (branching south)
      { x: 500, y: 580, w: 860, h: 64 },
      { x: 500, y: 460, w: 64, h: 140 },
      { x: 1300, y: 460, w: 64, h: 140 },
      // 4. Connecting Avenue into Viridian City
      { x: 1420, y: 320, w: 100, h: 220 },
      // 5. Viridian City Grand Plaza
      { x: 1500, y: 240, w: 980, h: 360 },
    ],
    grassPatches: [
      // Zone A: Field (Common starters & early route mons)
      { x: 160, y: 260, w: 160, h: 110, zone: 'field' },
      { x: 180, y: 490, w: 180, h: 120, zone: 'field' },
      { x: 520, y: 300, w: 220, h: 80, zone: 'field' },
      // Zone B: Deep Meadow (Nidoran, Spearow)
      { x: 680, y: 130, w: 260, h: 80, zone: 'deep' },
      { x: 800, y: 480, w: 240, h: 90, zone: 'deep' },
      // Zone C: River Shoreline (Water-edge wild Pokémon)
      { x: 620, y: 660, w: 320, h: 110, zone: 'water' },
      { x: 1020, y: 660, w: 260, h: 100, zone: 'water' },
      // Zone D: Rare Glade (Pikachu, Jigglypuff)
      { x: 1160, y: 140, w: 220, h: 120, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 1680,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 1880,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gate',
        x: 2460,
        y: 350,
        w: 90,
        h: 86,
        label: 'Route 2 Gate',
      },
    ],
    items: [
      {
        id: 'r0_ball1',
        x: 240,
        y: 300,
        name: 'Poké Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r0_berry1',
        x: 740,
        y: 160,
        name: 'Oran Berry',
        type: 'berry',
        amount: 2,
        collected: false,
      },
      {
        id: 'r0_money1',
        x: 680,
        y: 710,
        name: 'Poké Dollars',
        type: 'money',
        amount: 450,
        collected: false,
      },
      {
        id: 'r0_ball2',
        x: 1220,
        y: 180,
        name: 'Great Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r0_money2',
        x: 1120,
        y: 700,
        name: 'Poké Dollars',
        type: 'money',
        amount: 600,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r0_npc1',
        x: 200,
        y: 370,
        avatar: 'Trainer Red',
        name: 'Trainer Red',
        dialogue: 'Wild Pokémon inhabit the rustling tall grass! Weaken them first, then throw Poké Balls to catch them for your team.',
        gift: { type: 'ball', name: 'Poké Ball', amount: 3 },
      },
      {
        id: 'r0_npc2',
        x: 760,
        y: 200,
        avatar: 'Botanist Clara',
        name: 'Botanist Clara',
        dialogue: 'The upper meadow has different species than the main path. Take the optional trails to find rarer Pokémon!',
        gift: { type: 'berry', name: 'Oran Berry', amount: 2 },
      },
      {
        id: 'r0_npc3',
        x: 1580,
        y: 430,
        avatar: 'Viridian Guide',
        name: 'Viridian Guide',
        dialogue: 'Welcome to Viridian City! Stop by the Pokémon Center to heal your team anytime for free.',
      },
    ],
    targetEncounters: 5,
    exitX: 2520,
  },

  // ==========================================================================
  // ROUTE 1: Viridian Forest ➔ Route 2 ➔ Pewter City (Gym 1 - Brock)
  // ==========================================================================
  {
    id: 1,
    name: 'Route 2 & Forest',
    locationLabel: 'Route 2 & Pewter City',
    destinationLabel: 'Pewter Gym (Brock)',
    worldWidth: 2800,
    worldHeight: 960,
    theme: 'forest',
    startX: 80,
    startY: 440,
    path: [
      // Main central forest track
      { x: 40, y: 410, w: 1500, h: 80 },
      // Deep Canopy Ridge (North)
      { x: 360, y: 220, w: 860, h: 64 },
      { x: 360, y: 220, w: 64, h: 200 },
      { x: 1160, y: 220, w: 64, h: 200 },
      // Rock Tunnel Hollow (South)
      { x: 580, y: 620, w: 880, h: 64 },
      { x: 580, y: 480, w: 64, h: 150 },
      { x: 1400, y: 480, w: 64, h: 150 },
      // Approach to Pewter City
      { x: 1520, y: 330, w: 110, h: 240 },
      // Pewter City Flagstone Plaza
      { x: 1620, y: 230, w: 1060, h: 420 },
    ],
    grassPatches: [
      // Zone A: Forest Canopy (Bug Pokémon)
      { x: 180, y: 270, w: 170, h: 120, zone: 'forest' },
      { x: 200, y: 510, w: 190, h: 130, zone: 'forest' },
      { x: 540, y: 290, w: 250, h: 100, zone: 'forest' },
      // Zone B: Rock Clearing (Geodude, Diglett, Zubat)
      { x: 720, y: 700, w: 320, h: 110, zone: 'rock' },
      { x: 1100, y: 690, w: 260, h: 110, zone: 'rock' },
      // Zone C: Field Meadows
      { x: 860, y: 290, w: 260, h: 100, zone: 'field' },
      // Zone D: Rare Forest Glade (Pikachu, Scyther, Pinsir)
      { x: 1280, y: 150, w: 240, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 1780,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 1960,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2180,
        y: 200,
        w: 120,
        h: 96,
        label: 'Pewter Gym (Brock)',
        gymIndex: 0,
      },
      {
        type: 'gate',
        x: 2650,
        y: 380,
        w: 90,
        h: 86,
        label: 'Route 3 Gate',
      },
    ],
    items: [
      {
        id: 'r1_ball1',
        x: 260,
        y: 320,
        name: 'Poké Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r1_berry1',
        x: 620,
        y: 180,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 2,
        collected: false,
      },
      {
        id: 'r1_money1',
        x: 820,
        y: 740,
        name: 'Poké Dollars',
        type: 'money',
        amount: 600,
        collected: false,
      },
      {
        id: 'r1_ball2',
        x: 1360,
        y: 190,
        name: 'Great Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r1_npc1',
        x: 220,
        y: 380,
        avatar: 'Bug Catcher Sammy',
        name: 'Bug Catcher Sammy',
        dialogue: 'Viridian Forest is packed with Bug-type Pokémon! Caterpie and Weedle evolve early into powerful partners.',
        gift: { type: 'ball', name: 'Poké Ball', amount: 2 },
      },
      {
        id: 'r1_npc2',
        x: 920,
        y: 240,
        avatar: 'Hiker Wayne',
        name: 'Hiker Wayne',
        dialogue: 'Brock at the Pewter Gym uses Rock-type Pokémon like Geodude and Onix. Grass and Water moves are super effective against them!',
      },
      {
        id: 'r1_npc3',
        x: 1720,
        y: 450,
        avatar: 'Pewter Official',
        name: 'Pewter Official',
        dialogue: 'Welcome to Pewter City! Brock awaits challengers in the Gym to the north.',
      },
    ],
    targetEncounters: 5,
    exitX: 2720,
  },

  // ==========================================================================
  // ROUTE 2: Route 3/4 & Mt. Moon ➔ Cerulean City (Gym 2 - Misty)
  // ==========================================================================
  {
    id: 2,
    name: 'Route 3 & 4 (Mt. Moon)',
    locationLabel: 'Route 3, 4 & Cerulean City',
    destinationLabel: 'Cerulean Gym (Misty)',
    worldWidth: 2900,
    worldHeight: 980,
    theme: 'rock',
    startX: 80,
    startY: 450,
    path: [
      // Main Highway across the mountain foothills
      { x: 40, y: 420, w: 1560, h: 80 },
      // Mountain Peak Overlook (North)
      { x: 380, y: 220, w: 900, h: 64 },
      { x: 380, y: 220, w: 64, h: 210 },
      { x: 1220, y: 220, w: 64, h: 210 },
      // Underground Cave Creek (South)
      { x: 560, y: 640, w: 940, h: 64 },
      { x: 560, y: 490, w: 64, h: 160 },
      { x: 1440, y: 490, w: 64, h: 160 },
      // Cerulean City Canal Entrance
      { x: 1580, y: 340, w: 120, h: 240 },
      // Cerulean City Water Plaza
      { x: 1680, y: 240, w: 1100, h: 440 },
    ],
    grassPatches: [
      { x: 200, y: 290, w: 170, h: 120, zone: 'field' },
      { x: 240, y: 520, w: 190, h: 110, zone: 'field' },
      { x: 580, y: 300, w: 260, h: 100, zone: 'grass' },
      { x: 920, y: 290, w: 260, h: 100, zone: 'grass' },
      { x: 680, y: 720, w: 340, h: 110, zone: 'water' },
      { x: 1120, y: 710, w: 300, h: 110, zone: 'water' },
      // Rare Moon Glade (Clefairy, Vulpix, Abra)
      { x: 1340, y: 150, w: 250, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 1840,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2020,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2260,
        y: 200,
        w: 120,
        h: 96,
        label: 'Cerulean Gym (Misty)',
        gymIndex: 1,
      },
      {
        type: 'gate',
        x: 2750,
        y: 390,
        w: 90,
        h: 86,
        label: 'Route 5 Gate',
      },
    ],
    items: [
      {
        id: 'r2_ball1',
        x: 280,
        y: 330,
        name: 'Great Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r2_berry1',
        x: 740,
        y: 170,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 2,
        collected: false,
      },
      {
        id: 'r2_money1',
        x: 880,
        y: 760,
        name: 'Poké Dollars',
        type: 'money',
        amount: 750,
        collected: false,
      },
      {
        id: 'r2_ball2',
        x: 1420,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 1,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r2_npc1',
        x: 240,
        y: 400,
        avatar: 'Fossil Maniac',
        name: 'Fossil Maniac',
        dialogue: 'Mt. Moon holds ancient secrets and rare Pokémon like Clefairy! Keep your eyes peeled.',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 1 },
      },
      {
        id: 'r2_npc2',
        x: 980,
        y: 240,
        avatar: 'Swimmer Dean',
        name: 'Swimmer Dean',
        dialogue: 'Misty is a master of Water Pokémon at Cerulean Gym. Electric and Grass attacks give you the edge!',
      },
    ],
    targetEncounters: 5,
    exitX: 2820,
  },

  // ==========================================================================
  // ROUTE 3: Route 5 & 6 ➔ Vermilion City (Gym 3 - Lt. Surge)
  // ==========================================================================
  {
    id: 3,
    name: 'Route 5 & 6',
    locationLabel: 'Route 5, 6 & Vermilion Port',
    destinationLabel: 'Vermilion Gym (Lt. Surge)',
    worldWidth: 3000,
    worldHeight: 1000,
    theme: 'route',
    startX: 80,
    startY: 460,
    path: [
      { x: 40, y: 430, w: 1600, h: 80 },
      // North Hillside Meadow
      { x: 420, y: 220, w: 920, h: 64 },
      { x: 420, y: 220, w: 64, h: 220 },
      { x: 1280, y: 220, w: 64, h: 220 },
      // South Vermilion Docks & Bay
      { x: 620, y: 660, w: 960, h: 64 },
      { x: 620, y: 500, w: 64, h: 170 },
      { x: 1520, y: 500, w: 64, h: 170 },
      // Vermilion City Port Entry
      { x: 1640, y: 350, w: 120, h: 240 },
      // Vermilion City Harbor Plaza
      { x: 1740, y: 240, w: 1140, h: 460 },
    ],
    grassPatches: [
      { x: 220, y: 300, w: 180, h: 120, zone: 'field' },
      { x: 260, y: 530, w: 200, h: 120, zone: 'field' },
      { x: 620, y: 300, w: 280, h: 110, zone: 'electric' },
      { x: 980, y: 300, w: 260, h: 110, zone: 'electric' },
      { x: 740, y: 740, w: 340, h: 120, zone: 'water' },
      { x: 1180, y: 740, w: 320, h: 120, zone: 'water' },
      // Rare Docks Glade (Drowzee, Gastly, Kangaskhan)
      { x: 1400, y: 150, w: 260, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 1900,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2080,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2320,
        y: 200,
        w: 120,
        h: 96,
        label: 'Vermilion Gym (Lt. Surge)',
        gymIndex: 2,
      },
      {
        type: 'gate',
        x: 2840,
        y: 400,
        w: 90,
        h: 86,
        label: 'Route 7 Gate',
      },
    ],
    items: [
      {
        id: 'r3_ball1',
        x: 320,
        y: 350,
        name: 'Great Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r3_berry1',
        x: 780,
        y: 170,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 2,
        collected: false,
      },
      {
        id: 'r3_money1',
        x: 940,
        y: 780,
        name: 'Poké Dollars',
        type: 'money',
        amount: 900,
        collected: false,
      },
      {
        id: 'r3_ball2',
        x: 1480,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r3_npc1',
        x: 260,
        y: 410,
        avatar: 'Sailor Bob',
        name: 'Sailor Bob',
        dialogue: 'The S.S. Anne docks here in Vermilion Port! Electric Pokémon are abundant in the nearby fields.',
        gift: { type: 'ball', name: 'Great Ball', amount: 2 },
      },
      {
        id: 'r3_npc2',
        x: 1040,
        y: 240,
        avatar: 'Engineer Zack',
        name: 'Engineer Zack',
        dialogue: 'Lt. Surge uses Electric Pokémon. Ground-type Pokémon like Diglett and Geodude are completely immune to electricity!',
      },
    ],
    targetEncounters: 5,
    exitX: 2920,
  },

  // ==========================================================================
  // ROUTE 4: Route 7, 8, 9 & Rock Tunnel ➔ Celadon City (Gym 4 - Erika)
  // ==========================================================================
  {
    id: 4,
    name: 'Route 7, 8 & 9',
    locationLabel: 'Route 7, 8 & Celadon City',
    destinationLabel: 'Celadon Gym (Erika)',
    worldWidth: 3100,
    worldHeight: 1020,
    theme: 'city',
    startX: 80,
    startY: 470,
    path: [
      { x: 40, y: 440, w: 1680, h: 80 },
      // North Lavender Outskirts
      { x: 440, y: 220, w: 960, h: 64 },
      { x: 440, y: 220, w: 64, h: 230 },
      { x: 1340, y: 220, w: 64, h: 230 },
      // South Cycling Trail
      { x: 660, y: 680, w: 1000, h: 64 },
      { x: 660, y: 510, w: 64, h: 180 },
      { x: 1600, y: 510, w: 64, h: 180 },
      // Celadon City Main Avenue
      { x: 1720, y: 360, w: 120, h: 240 },
      // Celadon Metropolis Plaza
      { x: 1820, y: 240, w: 1160, h: 480 },
    ],
    grassPatches: [
      { x: 240, y: 310, w: 180, h: 120, zone: 'meadow' },
      { x: 280, y: 540, w: 200, h: 120, zone: 'urban' },
      { x: 660, y: 310, w: 280, h: 110, zone: 'fire' },
      { x: 1020, y: 310, w: 280, h: 110, zone: 'fire' },
      { x: 800, y: 760, w: 340, h: 120, zone: 'urban' },
      { x: 1240, y: 760, w: 320, h: 120, zone: 'meadow' },
      // Rare Botanical Garden (Tangela, Exeggcute, Tauros, Eevee)
      { x: 1480, y: 150, w: 260, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 1980,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2160,
        y: 220,
        w: 110,
        h: 84,
        label: 'Celadon Dept. Store',
      },
      {
        type: 'gym',
        x: 2420,
        y: 200,
        w: 120,
        h: 96,
        label: 'Celadon Gym (Erika)',
        gymIndex: 3,
      },
      {
        type: 'gate',
        x: 2940,
        y: 410,
        w: 90,
        h: 86,
        label: 'Route 10 Gate',
      },
    ],
    items: [
      {
        id: 'r4_ball1',
        x: 340,
        y: 360,
        name: 'Great Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r4_berry1',
        x: 820,
        y: 170,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 3,
        collected: false,
      },
      {
        id: 'r4_money1',
        x: 1000,
        y: 800,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1100,
        collected: false,
      },
      {
        id: 'r4_ball2',
        x: 1540,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r4_npc1',
        x: 280,
        y: 420,
        avatar: 'Beauty Tamia',
        name: 'Beauty Tamia',
        dialogue: 'Celadon is the city of rainbow dreams! Erika uses Grass-type Pokémon. Fire, Ice, and Flying moves will torch her team.',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 2 },
      },
    ],
    targetEncounters: 5,
    exitX: 3020,
  },

  // ==========================================================================
  // ROUTE 5: Cycling Road & Safari Route ➔ Fuchsia City (Gym 5 - Koga)
  // ==========================================================================
  {
    id: 5,
    name: 'Cycling Road & Safari',
    locationLabel: 'Route 17, 18 & Fuchsia City',
    destinationLabel: 'Fuchsia Gym (Koga)',
    worldWidth: 3200,
    worldHeight: 1040,
    theme: 'route',
    startX: 80,
    startY: 480,
    path: [
      { x: 40, y: 450, w: 1720, h: 80 },
      // North Safari Wetland
      { x: 460, y: 220, w: 980, h: 64 },
      { x: 460, y: 220, w: 64, h: 240 },
      { x: 1380, y: 220, w: 64, h: 240 },
      // South Coastal Shoreline
      { x: 700, y: 700, w: 1020, h: 64 },
      { x: 700, y: 520, w: 64, h: 190 },
      { x: 1660, y: 520, w: 64, h: 190 },
      // Fuchsia City Entrance
      { x: 1780, y: 370, w: 120, h: 240 },
      // Fuchsia City Zoo Plaza
      { x: 1880, y: 250, w: 1200, h: 480 },
    ],
    grassPatches: [
      { x: 260, y: 320, w: 180, h: 120, zone: 'savannah' },
      { x: 300, y: 550, w: 200, h: 120, zone: 'savannah' },
      { x: 680, y: 310, w: 280, h: 110, zone: 'marsh' },
      { x: 1060, y: 310, w: 280, h: 110, zone: 'marsh' },
      { x: 840, y: 780, w: 340, h: 120, zone: 'coastal' },
      { x: 1300, y: 780, w: 320, h: 120, zone: 'coastal' },
      // Rare Safari Glade (Scyther, Pinsir, Kangaskhan, Tauros)
      { x: 1540, y: 150, w: 260, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 2040,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2220,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2480,
        y: 200,
        w: 120,
        h: 96,
        label: 'Fuchsia Gym (Koga)',
        gymIndex: 4,
      },
      {
        type: 'gate',
        x: 3020,
        y: 420,
        w: 90,
        h: 86,
        label: 'Route 19 Gate',
      },
    ],
    items: [
      {
        id: 'r5_ball1',
        x: 360,
        y: 370,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r5_berry1',
        x: 840,
        y: 170,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 3,
        collected: false,
      },
      {
        id: 'r5_money1',
        x: 1060,
        y: 820,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1400,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r5_npc1',
        x: 300,
        y: 430,
        avatar: 'Safari Ranger',
        name: 'Safari Ranger',
        dialogue: 'Welcome to the Safari border! Koga uses Poison and Ninja tactics. Psychic and Ground moves hit him hardest.',
        gift: { type: 'ball', name: 'Ultra Ball', amount: 2 },
      },
    ],
    targetEncounters: 5,
    exitX: 3100,
  },

  // ==========================================================================
  // ROUTE 6: Silph Suburbs ➔ Saffron City (Gym 6 - Sabrina)
  // ==========================================================================
  {
    id: 6,
    name: 'Silph Suburbs',
    locationLabel: 'Saffron Outskirts & Saffron City',
    destinationLabel: 'Saffron Gym (Sabrina)',
    worldWidth: 3300,
    worldHeight: 1060,
    theme: 'city',
    startX: 80,
    startY: 490,
    path: [
      { x: 40, y: 460, w: 1780, h: 80 },
      // North Tech Corridor
      { x: 480, y: 230, w: 1000, h: 64 },
      { x: 480, y: 230, w: 64, h: 240 },
      { x: 1420, y: 230, w: 64, h: 240 },
      // South Dojo Foothills
      { x: 740, y: 720, w: 1040, h: 64 },
      { x: 740, y: 530, w: 64, h: 200 },
      { x: 1720, y: 530, w: 64, h: 200 },
      // Saffron City Gateway
      { x: 1840, y: 380, w: 120, h: 240 },
      // Saffron Commercial Center
      { x: 1940, y: 250, w: 1240, h: 500 },
    ],
    grassPatches: [
      { x: 280, y: 330, w: 180, h: 120, zone: 'psychic' },
      { x: 320, y: 560, w: 200, h: 120, zone: 'tech' },
      { x: 720, y: 320, w: 280, h: 110, zone: 'tech' },
      { x: 1100, y: 320, w: 280, h: 110, zone: 'psychic' },
      { x: 880, y: 800, w: 340, h: 120, zone: 'ghost' },
      { x: 1360, y: 800, w: 320, h: 120, zone: 'ghost' },
      // Rare High-Tech Glade (Jynx, Lapras, Snorlax)
      { x: 1600, y: 150, w: 260, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 2100,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2280,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2560,
        y: 200,
        w: 120,
        h: 96,
        label: 'Saffron Gym (Sabrina)',
        gymIndex: 5,
      },
      {
        type: 'gate',
        x: 3120,
        y: 430,
        w: 90,
        h: 86,
        label: 'Route 21 Gate',
      },
    ],
    items: [
      {
        id: 'r6_ball1',
        x: 380,
        y: 380,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r6_berry1',
        x: 880,
        y: 180,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 3,
        collected: false,
      },
      {
        id: 'r6_money1',
        x: 1120,
        y: 840,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1800,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r6_npc1',
        x: 320,
        y: 440,
        avatar: 'Psychic Johan',
        name: 'Psychic Johan',
        dialogue: 'Sabrina commands tremendous psychic power. Bug and Ghost Pokémon are your greatest assets against her!',
        gift: { type: 'ball', name: 'Ultra Ball', amount: 2 },
      },
    ],
    targetEncounters: 5,
    exitX: 3200,
  },

  // ==========================================================================
  // ROUTE 7: Sea Route 19/20 ➔ Cinnabar Island (Gym 7 - Blaine)
  // ==========================================================================
  {
    id: 7,
    name: 'Sea Route 19 & 20',
    locationLabel: 'Sea Route 19, 20 & Cinnabar Island',
    destinationLabel: 'Cinnabar Gym (Blaine)',
    worldWidth: 3400,
    worldHeight: 1080,
    theme: 'water',
    startX: 80,
    startY: 500,
    path: [
      { x: 40, y: 470, w: 1840, h: 80 },
      // North Volcano Reef
      { x: 500, y: 240, w: 1040, h: 64 },
      { x: 500, y: 240, w: 64, h: 240 },
      { x: 1480, y: 240, w: 64, h: 240 },
      // South Deep Trench
      { x: 780, y: 740, w: 1080, h: 64 },
      { x: 780, y: 540, w: 64, h: 210 },
      { x: 1800, y: 540, w: 64, h: 210 },
      // Cinnabar Island Wharf
      { x: 1900, y: 390, w: 120, h: 240 },
      // Cinnabar Volcanic Research Plaza
      { x: 2000, y: 260, w: 1280, h: 500 },
    ],
    grassPatches: [
      { x: 300, y: 340, w: 180, h: 120, zone: 'ocean' },
      { x: 340, y: 570, w: 200, h: 120, zone: 'ocean' },
      { x: 760, y: 330, w: 280, h: 110, zone: 'volcano' },
      { x: 1160, y: 330, w: 280, h: 110, zone: 'volcano' },
      { x: 920, y: 820, w: 340, h: 120, zone: 'fossil' },
      { x: 1420, y: 820, w: 320, h: 120, zone: 'fossil' },
      // Rare Volcanic Island Glade (Electabuzz, Lapras, Snorlax, Dratini)
      { x: 1680, y: 160, w: 260, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 2160,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2340,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2640,
        y: 200,
        w: 120,
        h: 96,
        label: 'Cinnabar Gym (Blaine)',
        gymIndex: 6,
      },
      {
        type: 'gate',
        x: 3220,
        y: 440,
        w: 90,
        h: 86,
        label: 'Route 22 Gate',
      },
    ],
    items: [
      {
        id: 'r7_ball1',
        x: 400,
        y: 390,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r7_berry1',
        x: 920,
        y: 190,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 3,
        collected: false,
      },
      {
        id: 'r7_money1',
        x: 1180,
        y: 860,
        name: 'Poké Dollars',
        type: 'money',
        amount: 2200,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r7_npc1',
        x: 340,
        y: 450,
        avatar: 'Scientist Lowell',
        name: 'Scientist Lowell',
        dialogue: 'Cinnabar Island is famous for the Pokémon Lab! Blaine uses blistering Fire Pokémon. Water and Rock moves douse his flames.',
        gift: { type: 'ball', name: 'Ultra Ball', amount: 2 },
      },
    ],
    targetEncounters: 5,
    exitX: 3300,
  },

  // ==========================================================================
  // ROUTE 8: Victory Road & Indigo Approach ➔ Viridian Final Gym (Giovanni)
  // ==========================================================================
  {
    id: 8,
    name: 'Victory Road & Indigo Path',
    locationLabel: 'Victory Road & Viridian Final Arena',
    destinationLabel: 'Final Gym Leader Giovanni',
    worldWidth: 3600,
    worldHeight: 1100,
    theme: 'rock',
    startX: 80,
    startY: 510,
    path: [
      { x: 40, y: 480, w: 1920, h: 80 },
      // North Summit of Champions
      { x: 520, y: 240, w: 1080, h: 64 },
      { x: 520, y: 240, w: 64, h: 250 },
      { x: 1540, y: 240, w: 64, h: 250 },
      // South Cavern Abyss
      { x: 820, y: 760, w: 1120, h: 64 },
      { x: 820, y: 550, w: 64, h: 220 },
      { x: 1880, y: 550, w: 64, h: 220 },
      // Indigo Grand Gateway
      { x: 1980, y: 400, w: 120, h: 240 },
      // Viridian Final Arena Plaza
      { x: 2080, y: 270, w: 1380, h: 520 },
    ],
    grassPatches: [
      { x: 320, y: 350, w: 180, h: 120, zone: 'cavern' },
      { x: 360, y: 580, w: 200, h: 120, zone: 'cavern' },
      { x: 800, y: 340, w: 280, h: 110, zone: 'summit' },
      { x: 1220, y: 340, w: 280, h: 110, zone: 'summit' },
      { x: 960, y: 840, w: 340, h: 120, zone: 'elite' },
      { x: 1480, y: 840, w: 320, h: 120, zone: 'elite' },
      // Rare Legendary Sanctum (Dratini, Dragonair, Dragonite, Mewtwo, Mew)
      { x: 1740, y: 160, w: 260, h: 140, zone: 'rare' },
    ],
    buildings: [
      {
        type: 'center',
        x: 2240,
        y: 220,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      {
        type: 'mart',
        x: 2420,
        y: 220,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      {
        type: 'gym',
        x: 2740,
        y: 200,
        w: 130,
        h: 100,
        label: 'Viridian Gym (Giovanni)',
        gymIndex: 7,
      },
      {
        type: 'gate',
        x: 3420,
        y: 450,
        w: 100,
        h: 90,
        label: 'Indigo Plateau Gate',
      },
    ],
    items: [
      {
        id: 'r8_ball1',
        x: 420,
        y: 400,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 5,
        collected: false,
      },
      {
        id: 'r8_berry1',
        x: 960,
        y: 190,
        name: 'Sitrus Berry',
        type: 'berry',
        amount: 4,
        collected: false,
      },
      {
        id: 'r8_money1',
        x: 1240,
        y: 880,
        name: 'Poké Dollars',
        type: 'money',
        amount: 3000,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r8_npc1',
        x: 360,
        y: 460,
        avatar: 'Ace Trainer Leo',
        name: 'Ace Trainer Leo',
        dialogue: 'You stand before the final Gym! Giovanni, leader of Team Rocket, commands mighty Ground and Rock titans. Claim your 8th badge to qualify for the Championship!',
        gift: { type: 'ball', name: 'Ultra Ball', amount: 3 },
      },
    ],
    targetEncounters: 5,
    exitX: 3520,
  },
];
