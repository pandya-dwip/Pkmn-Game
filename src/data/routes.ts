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

import { RouteDefinition, RouteTree, RouteSignpost } from '../systems/RouteExplorationEngine';

export const KANTO_JOURNEY_ROUTES: RouteDefinition[] = [
  // ==========================================================================
  // ROUTE 0: Pallet Town ➔ Route 1 ➔ Viridian City (Structured 5-Section Map)
  // ==========================================================================
  {
    id: 0,
    name: 'Route 1',
    locationLabel: 'Route 1 & Viridian City',
    destinationLabel: 'Viridian City & Pewter Gateway',
    worldWidth: 3500,
    worldHeight: 920,
    theme: 'route',
    startX: 90,
    startY: 440,
    sections: [
      {
        id: 'r0_sec1',
        name: 'Pallet Valley',
        subtitle: 'Route 1 Starter Trail (Lv 2-4)',
        icon: '🌿',
        x: 0,
        y: 0,
        w: 640,
        h: 920,
      },
      {
        id: 'r0_sec2',
        name: 'Clear Creek Glade',
        subtitle: 'Waterfront Pond & Fishing Dock',
        icon: '🌊',
        x: 640,
        y: 440,
        w: 700,
        h: 480,
      },
      {
        id: 'r0_sec3',
        name: 'Blossom Terrace',
        subtitle: 'Sakura Ridge & Flower Meadow',
        icon: '🌸',
        x: 640,
        y: 0,
        w: 700,
        h: 440,
      },
      {
        id: 'r0_sec4',
        name: 'Deep Ancient Sanctuary',
        subtitle: 'High-Level Wild Pokémon Zone (Lv 8-14)',
        icon: '⚡',
        x: 1340,
        y: 0,
        w: 580,
        h: 480,
        isRareZone: true,
      },
      {
        id: 'r0_sec5',
        name: 'Viridian City',
        subtitle: 'The City of Evergreen Blossoms & Kanto Gateway',
        icon: '🏛️',
        x: 1920,
        y: 0,
        w: 1580,
        h: 920,
      },
    ],
    path: [
      // 1. Pallet Valley Main Highway from Pallet Town Gate to Viridian City
      { x: 50, y: 420, w: 590, h: 64, style: 'dirt' },
      { x: 640, y: 420, w: 1280, h: 64, style: 'dirt' },
      // 2. Clear Creek Waterfront Southern Promenade Loop
      { x: 750, y: 440, w: 60, h: 170, style: 'dirt' },
      { x: 720, y: 580, w: 460, h: 56, style: 'dirt' },
      // 3. Sunlit Blossom Terrace Northern Trail
      { x: 740, y: 240, w: 60, h: 180, style: 'dirt' },
      { x: 740, y: 240, w: 580, h: 56, style: 'dirt' },
      // 4. Secret Stairway into Deep Ancient Sanctuary
      { x: 1440, y: 210, w: 60, h: 210, style: 'dirt' },
      { x: 1440, y: 210, w: 440, h: 56, style: 'dirt' },
      // 5. Viridian City Grand Metropolis Network of Paved Flagstone Avenues
      // Main West-East Avenue connecting Route 1 entrance right across the city
      { x: 1920, y: 418, w: 1460, h: 68, style: 'flagstone' },
      // Central Civic Boulevard (North-South Avenue)
      { x: 2320, y: 170, w: 76, h: 540, style: 'flagstone' },
      // North Civic Promenade (in front of Pokémon Center, Mart, and Academy)
      { x: 2100, y: 254, w: 660, h: 60, style: 'flagstone' },
      // Central Fountain Square Piazza (Grand stone terrace framing marble fountain)
      { x: 2250, y: 388, w: 220, h: 130, style: 'flagstone' },
      // South Residential Quarter Lane
      { x: 1980, y: 600, w: 680, h: 56, style: 'flagstone' },
      // Gym Boulevard (Connecting Main Avenue to Gym Court & Route 2 Gate)
      { x: 2790, y: 290, w: 76, h: 430, style: 'flagstone' },
      // Gym Front Terrace
      { x: 2740, y: 550, w: 200, h: 60, style: 'flagstone' },
      // Route 2 Gatehouse Approach
      { x: 2790, y: 310, w: 590, h: 64, style: 'flagstone' },
    ],
    ponds: [
      {
        x: 780,
        y: 620,
        w: 360,
        h: 200,
        pier: { x: 920, y: 570, w: 60, h: 80 },
      },
    ],
    ledges: [
      // Terrace 1: Blossom Ridge Cliff Ledge
      {
        x: 640,
        y: 410,
        w: 700,
        h: 26,
        stairs: [{ x: 738, w: 64 }],
      },
      // Terrace 2: Deep Ancient Sanctuary Cliff Ledge
      {
        x: 1340,
        y: 410,
        w: 600,
        h: 26,
        stairs: [{ x: 1438, w: 64 }],
      },
    ],
    grassPatches: [
      // Section 1: Pallet Valley Beginner Fields (Lv 2-4 mons: Pidgey, Rattata, Caterpie, Weedle)
      { x: 160, y: 210, w: 260, h: 150, zone: 'field' },
      { x: 160, y: 540, w: 260, h: 150, zone: 'field' },
      // Section 2: Clear Creek Freshwater Shoreline (Poliwag, Psyduck, Magikarp, Goldeen)
      { x: 1160, y: 620, w: 150, h: 170, zone: 'water' },
      // Section 3: Blossom Terrace Upper Meadow (Spearow, Bellsprout, Nidoran♀, Nidoran♂)
      { x: 860, y: 150, w: 280, h: 160, zone: 'deep' },
      // Section 4: ⚡ THE DEEP ANCIENT SANCTUARY (Rare & High Level Lv 8-14: Pikachu, Eevee, Scyther, Electabuzz, Abra, Jigglypuff!)
      { x: 1540, y: 120, w: 320, h: 160, zone: 'rare' },
      { x: 1540, y: 310, w: 220, h: 90, zone: 'rare' },
    ],
    signposts: [
      {
        id: 'sp_pallet',
        x: 130,
        y: 380,
        title: '🌿 Pallet Valley Signpost',
        lines: [
          'Route 1: Pallet Town ➔ Viridian City',
          'Tip: Paved roads and open lawns are safe to walk on.',
          'Wild Pokémon dwell only inside rustling tall grass!',
        ],
      },
      {
        id: 'sp_creek',
        x: 740,
        y: 530,
        title: '🌊 Clear Creek Notice',
        lines: [
          'Clear Creek Glade & Fishing Promenade',
          'Freshwater pond with aquatic Pokémon in the shoreline reeds.',
          'Angler Ned: "Feel free to fish from the wooden dock!"',
        ],
      },
      {
        id: 'sp_blossom',
        x: 820,
        y: 370,
        title: '🌸 Blossom Terrace Marker',
        lines: [
          'Blossom Terrace - Elevated Sakura Ridge',
          'Climb the stone stairs to enjoy pink sakura blossoms and wild Oran Berries.',
          'Habitat for graceful flying & grass Pokémon.',
        ],
      },
      {
        id: 'sp_sanctuary',
        x: 1400,
        y: 380,
        title: '⚠️ Ancient Sanctuary Warning',
        lines: [
          '⚡ DEEP ANCIENT SANCTUARY',
          '⚠️ DANGER: High-Level Wild Pokémon Zone (Lv 8–14)!',
          'Rare Pikachu, Eevee, Scyther, and Electabuzz dwell within.',
          'Only well-prepared Trainers should venture past the stone stairs!',
        ],
      },
      {
        id: 'sp_viridian_welcome',
        x: 1980,
        y: 380,
        title: '🏛️ Viridian City Entrance',
        lines: [
          'Viridian City - The City of Evergreen Blossoms',
          'A vibrant garden metropolis connecting Pallet Town and Pewter City.',
          'Follow Main Avenue east toward the Central Fountain Square.',
        ],
      },
      {
        id: 'sp_viridian_civic',
        x: 2320,
        y: 360,
        title: '⛲ Central Fountain Square',
        lines: [
          'Viridian City Civic & Commercial District',
          '• North: Pokémon Center, Poké Mart & Trainer Academy',
          '• East: Viridian Gym & Route 2 Gatehouse',
          '• South: Residential Cottages & Garden District',
        ],
      },
      {
        id: 'sp_viridian_gym',
        x: 2840,
        y: 420,
        title: '⚡ Viridian City Pokémon Gym',
        lines: [
          'Viridian City Gym - Official Kanto League',
          '⚠️ NOTICE: The Gym is temporarily closed.',
          'The Gym Leader Giovanni is currently away on urgent business.',
        ],
      },
      {
        id: 'sp_viridian_gate',
        x: 3290,
        y: 375,
        title: '🚪 Route 2 Gateway Checkpoint',
        lines: [
          'North Checkpoint Gate: Connecting to Route 2 & Viridian Forest.',
          'Prepare your bug-catching gear before entering the forest!',
        ],
      },
    ],
    buildings: [
      // 1. Pokémon Center
      {
        type: 'center',
        x: 2140,
        y: 175,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 2. Poké Mart
      {
        type: 'mart',
        x: 2440,
        y: 175,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 3. Viridian Trainer Academy (Emerald Roof)
      {
        type: 'house',
        x: 2630,
        y: 175,
        w: 96,
        h: 76,
        label: 'Trainer Academy',
        roofStyle: 'emerald',
        wallColor: '#f8fafc',
        chimney: false,
        occupant: 'Headmaster Oak',
        dialogue: "Welcome to the Viridian Pokémon Academy! Status conditions are vital: Sleep and Paralysis make Pokémon much easier to catch!",
      },
      // 4. Old Man's Cottage (Terracotta Roof with Chimney)
      {
        type: 'house',
        x: 2000,
        y: 520,
        w: 84,
        h: 74,
        label: "Old Man's Cottage",
        roofStyle: 'terracotta',
        wallColor: '#fef3c7',
        chimney: true,
        occupant: 'Grandpa Kanto',
        dialogue: "Ho ho! I've had my morning coffee and I'm feeling spry! Remember: weaken wild Pokémon first before tossing a Poké Ball!",
      },
      // 5. Botanist's Floral Villa (Emerald Roof with Tulip Flowerboxes)
      {
        type: 'house',
        x: 2160,
        y: 520,
        w: 84,
        h: 74,
        label: "Botanist's Villa",
        roofStyle: 'emerald',
        wallColor: '#ecfdf5',
        chimney: true,
        occupant: 'Florist Lily',
        dialogue: "Viridian City is known as the Evergreen City because flowers and cypresses bloom here all year round!",
      },
      // 6. Veteran Trainer's Manor (Azure Roof with Porch Lantern)
      {
        type: 'house',
        x: 2480,
        y: 520,
        w: 88,
        h: 74,
        label: "Veteran's Manor",
        roofStyle: 'azure',
        wallColor: '#f1f5f9',
        chimney: true,
        occupant: 'Veteran Trent',
        dialogue: "To enter the Pokémon League Championship, you must collect 8 Official Gym Badges across Kanto. It is a long but noble journey!",
      },
      // 7. Berry Hobbyist Cottage (Wood Roof)
      {
        type: 'house',
        x: 2000,
        y: 690,
        w: 84,
        h: 74,
        label: 'Berry Cottage',
        roofStyle: 'wood',
        wallColor: '#fed7aa',
        chimney: true,
        occupant: 'Berry Forager Sam',
        dialogue: "Berries grow best in rich green soil! Always keep a pouch of Oran and Sitrus berries handy for battle.",
      },
      // 8. Viridian City Gym (Gym 8 - Giovanni)
      {
        type: 'gym',
        x: 2780,
        y: 450,
        w: 120,
        h: 96,
        label: 'Viridian Gym (Locked)',
        dialogue: "The Gym doors are sealed tight with heavy iron padlocks! A notice reads: 'The Gym Leader is away on business. Return once you have proven yourself at other Kanto Gyms!'",
      },
      // 9. Route 2 Gateway Checkpoint Gatehouse
      {
        type: 'gate',
        x: 3340,
        y: 300,
        w: 90,
        h: 86,
        label: 'Route 2 Gate',
      },
    ],
    items: [
      {
        id: 'r0_ball1',
        x: 240,
        y: 270,
        name: 'Poké Ball',
        type: 'ball',
        amount: 3,
        collected: false,
      },
      {
        id: 'r0_berry1',
        x: 980,
        y: 210,
        name: 'Oran Berry',
        type: 'berry',
        amount: 3,
        collected: false,
      },
      {
        id: 'r0_money1',
        x: 1180,
        y: 690,
        name: 'Poké Dollars',
        type: 'money',
        amount: 650,
        collected: false,
      },
      {
        id: 'r0_rare1',
        x: 1720,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r0_money2',
        x: 2180,
        y: 560,
        name: 'Poké Dollars',
        type: 'money',
        amount: 800,
        collected: false,
      },
    ],
    npcs: [
      {
        id: 'r0_npc1',
        x: 190,
        y: 390,
        avatar: '🧢',
        name: 'Guide Red',
        dialogue: 'Welcome to Route 1! Stay on the paths or open lawn to travel safely, or step into the tall grass to train and catch wild Pokémon.',
        gift: { type: 'ball', name: 'Poké Ball', amount: 3 },
      },
      {
        id: 'r0_npc2',
        x: 820,
        y: 200,
        avatar: '🌸',
        name: 'Botanist Clara',
        dialogue: 'The pink cherry blossom trees only bloom on this sunny upper terrace! Rare grass Pokémon thrive here.',
        gift: { type: 'berry', name: 'Oran Berry', amount: 2 },
      },
      {
        id: 'r0_npc_ned',
        x: 950,
        y: 600,
        avatar: '🎣',
        name: 'Angler Ned',
        dialogue: 'Clear Creek is home to lively water Pokémon! Poliwag and Psyduck love playing in the reeds by the dock.',
        gift: { type: 'money', name: 'Poké Dollars', amount: 300 },
      },
      {
        id: 'r0_npc_vance',
        x: 1490,
        y: 380,
        avatar: '🌲',
        name: 'Ranger Vance',
        dialogue: '⚠️ Caution Trainer! Up those stone steps is the Deep Ancient Sanctuary. Rare, high-level Pokémon (Lv 8-14) like Pikachu, Eevee, and Scyther dwell within!',
      },
      {
        id: 'r0_npc3',
        x: 2110,
        y: 280,
        avatar: '👮‍♀️',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Viridian City! Stop by the Pokémon Center to heal your team anytime for free.',
      },
      {
        id: 'r0_npc4',
        x: 2330,
        y: 490,
        avatar: '🌸',
        name: 'Lass Julie',
        dialogue: 'The cool spray from the marble fountain in the center of town is so refreshing on sunny days!',
      },
      {
        id: 'r0_npc5',
        x: 2630,
        y: 280,
        avatar: '🧢',
        name: 'School Kid Tommy',
        dialogue: "I'm studying hard at the Trainer Academy! Did you know Ground-type moves are super-effective against Electric and Rock?",
      },
      {
        id: 'r0_npc6',
        x: 2470,
        y: 620,
        avatar: '🧢',
        name: 'Youngster Ralph',
        dialogue: 'Viridian City has the most beautiful houses in all of Kanto! Look at all the vibrant flowerboxes under every window.',
      },
    ],
    targetEncounters: 5,
    exitX: 3420,
    fountains: [
      { x: 2360, y: 452, radius: 34, style: 'clock', label: 'Viridian Floral Sun Clock' },
    ],
    streetlamps: [
      // Civic Center North
      { x: 2110, y: 275 },
      { x: 2280, y: 275 },
      { x: 2570, y: 275 },
      { x: 2740, y: 275 },
      // Central Fountain Square
      { x: 2270, y: 400 },
      { x: 2450, y: 400 },
      { x: 2270, y: 505 },
      { x: 2450, y: 505 },
      // Residential Quarter
      { x: 2000, y: 620 },
      { x: 2160, y: 620 },
      { x: 2480, y: 620 },
      // Viridian Gym Court & Gate
      { x: 2760, y: 565 },
      { x: 2930, y: 565 },
      { x: 3300, y: 330 },
    ],
    benches: [
      { x: 2300, y: 425 },
      { x: 2390, y: 425 },
      { x: 2650, y: 275 },
      { x: 2180, y: 620 },
    ],
    fences: [
      // Section 1: Pallet Valley Post-and-Rail Fences framing gardens and paths
      { x: 50, y: 400, w: 220, h: 16 },
      { x: 330, y: 400, w: 280, h: 16 },
      { x: 50, y: 494, w: 220, h: 16 },
      { x: 330, y: 494, w: 280, h: 16 },
      // Section 2: Clear Creek lakeside promenade fence
      { x: 680, y: 640, w: 16, h: 160 },
      { x: 700, y: 780, w: 420, h: 16 },
      // Section 4: Deep Ancient Sanctuary cliff fence
      { x: 1360, y: 400, w: 70, h: 16 },
      { x: 1510, y: 400, w: 320, h: 16 },
      // Section 5: Viridian City Residential Garden Picket Fences
      { x: 1980, y: 500, w: 110, h: 16 },
      { x: 2140, y: 500, w: 110, h: 16 },
      { x: 2460, y: 500, w: 110, h: 16 },
      { x: 1980, y: 670, w: 110, h: 16 },
    ],
    stones: [
      { x: 150, y: 160, radius: 18, variant: 'mossy' },
      { x: 420, y: 160, radius: 15, variant: 'granite' },
      { x: 690, y: 640, radius: 16, variant: 'granite' },
      { x: 1090, y: 630, radius: 18, variant: 'mossy' },
      { x: 1380, y: 150, radius: 20, variant: 'slate' },
      { x: 1840, y: 150, radius: 22, variant: 'slate' },
      // Viridian City Plaza Garden Rocks
      { x: 2300, y: 360, radius: 12, variant: 'slate' },
      { x: 2420, y: 360, radius: 12, variant: 'slate' },
      { x: 2730, y: 530, radius: 16, variant: 'granite' },
      { x: 2950, y: 530, radius: 18, variant: 'granite' },
    ],
    trees: [
      // ======================================================================
      // 1. LEFT BOUNDARY DOUBLE ROW (Enclosing Pallet Town west edge)
      // ======================================================================
      ...Array.from({ length: 18 }, (_, i) => {
        const y = 50 + i * 48;
        if (y >= 400 && y <= 470) return null; // Opening for Pallet Town trail
        return { x: 25, y, scale: 1.05, type: 'oak' as const };
      }).filter(Boolean) as RouteTree[],
      ...Array.from({ length: 18 }, (_, i) => {
        const y = 72 + i * 48;
        if (y >= 390 && y <= 480) return null; // Opening for Pallet Town trail
        return { x: 60, y, scale: 1.0, type: 'oak' as const };
      }).filter(Boolean) as RouteTree[],

      // ======================================================================
      // 2. TOP BOUNDARY DOUBLE ROW (Full width from X: 40 to 3480)
      // ======================================================================
      ...Array.from({ length: 79 }, (_, i) => {
        const x = 40 + i * 44;
        const type = (x >= 640 && x < 1340) ? 'blossom' : (x >= 1340 && x < 1920) ? 'mystic' : 'oak';
        return { x, y: 45, scale: 1.05, type: type as 'oak' | 'pine' | 'blossom' | 'mystic' };
      }),
      ...Array.from({ length: 78 }, (_, i) => {
        const x = 62 + i * 44;
        const type = (x >= 660 && x < 1320) ? 'blossom' : (x >= 1360 && x < 1900) ? 'mystic' : 'oak';
        return { x, y: 88, scale: 1.0, type: type as 'oak' | 'pine' | 'blossom' | 'mystic' };
      }),

      // ======================================================================
      // 3. BOTTOM BOUNDARY DOUBLE ROW (Full width from X: 40 to 3480)
      // ======================================================================
      ...Array.from({ length: 79 }, (_, i) => ({
        x: 40 + i * 44,
        y: 840,
        scale: 1.05,
        type: 'oak' as const,
      })),
      ...Array.from({ length: 78 }, (_, i) => ({
        x: 62 + i * 44,
        y: 885,
        scale: 1.0,
        type: 'oak' as const,
      })),

      // ======================================================================
      // 4. RIGHT BOUNDARY DOUBLE ROW (Framing Route 2 Gatehouse exit at X: 3450)
      // ======================================================================
      ...Array.from({ length: 18 }, (_, i) => {
        const y = 50 + i * 48;
        if (y >= 260 && y <= 410) return null; // Gatehouse portal
        return { x: 3450, y, scale: 1.05, type: 'oak' as const };
      }).filter(Boolean) as RouteTree[],
      ...Array.from({ length: 18 }, (_, i) => {
        const y = 72 + i * 48;
        if (y >= 250 && y <= 420) return null; // Gatehouse portal
        return { x: 3485, y, scale: 1.0, type: 'oak' as const };
      }).filter(Boolean) as RouteTree[],

      // Viridian City Ornamental Trees & Cypresses
      { x: 2090, y: 155, scale: 1.1, type: 'oak' },
      { x: 2380, y: 155, scale: 1.15, type: 'oak' },
      { x: 2560, y: 155, scale: 1.1, type: 'oak' },
      { x: 2740, y: 155, scale: 1.15, type: 'oak' },
      { x: 2260, y: 530, scale: 1.1, type: 'blossom' },
      { x: 2580, y: 530, scale: 1.15, type: 'blossom' },
      { x: 2920, y: 440, scale: 1.2, type: 'oak' },
      { x: 3000, y: 540, scale: 1.15, type: 'oak' },
      { x: 3120, y: 250, scale: 1.1, type: 'oak' },
      { x: 3260, y: 250, scale: 1.15, type: 'oak' },

      // ======================================================================
      // 5. PALLET VALLEY SECTION INTERIOR FRAMING TREES
      // ======================================================================
      { x: 100, y: 150, scale: 1.1, type: 'oak' },
      { x: 440, y: 150, scale: 1.15, type: 'oak' },
      { x: 500, y: 220, scale: 1.1, type: 'oak' },
      { x: 500, y: 300, scale: 1.15, type: 'oak' },
      { x: 100, y: 730, scale: 1.1, type: 'oak' },
      { x: 440, y: 730, scale: 1.15, type: 'oak' },
      { x: 500, y: 640, scale: 1.1, type: 'oak' },

      // ======================================================================
      // 6. SECTION DIVIDER VERTICAL GROVES
      // ======================================================================
      // Section 1 ➔ Section 2/3 Divider (X: 620)
      { x: 620, y: 140, scale: 1.15, type: 'oak' },
      { x: 620, y: 190, scale: 1.1, type: 'oak' },
      { x: 620, y: 240, scale: 1.15, type: 'oak' },
      { x: 620, y: 290, scale: 1.1, type: 'oak' },
      { x: 620, y: 340, scale: 1.15, type: 'oak' },
      { x: 620, y: 720, scale: 1.15, type: 'oak' },
      { x: 620, y: 780, scale: 1.1, type: 'oak' },

      // Blossom Terrace Accent Trees (Pink Sakura!)
      { x: 800, y: 140, scale: 1.25, type: 'blossom' },
      { x: 970, y: 140, scale: 1.2, type: 'blossom' },
      { x: 1160, y: 140, scale: 1.25, type: 'blossom' },
      { x: 740, y: 360, scale: 1.15, type: 'blossom' },
      { x: 1220, y: 360, scale: 1.2, type: 'blossom' },
      { x: 1260, y: 220, scale: 1.15, type: 'blossom' },

      // Clear Creek Waterfront Groves
      { x: 720, y: 720, scale: 1.1, type: 'oak' },
      { x: 1140, y: 760, scale: 1.15, type: 'oak' },
      { x: 1260, y: 760, scale: 1.2, type: 'oak' },

      // ======================================================================
      // 7. DEEP ANCIENT SANCTUARY ENCLOSING GROVES (Mystic Oaks!)
      // ======================================================================
      // Western mystic tree wall (X: 1330)
      { x: 1330, y: 140, scale: 1.25, type: 'mystic' },
      { x: 1330, y: 190, scale: 1.2, type: 'mystic' },
      { x: 1330, y: 240, scale: 1.25, type: 'mystic' },
      { x: 1330, y: 290, scale: 1.2, type: 'mystic' },
      { x: 1330, y: 340, scale: 1.25, type: 'mystic' },
      // Eastern mystic tree wall (X: 1910)
      { x: 1910, y: 140, scale: 1.25, type: 'mystic' },
      { x: 1910, y: 190, scale: 1.2, type: 'mystic' },
      { x: 1910, y: 240, scale: 1.25, type: 'mystic' },
      { x: 1910, y: 290, scale: 1.2, type: 'mystic' },
      { x: 1910, y: 340, scale: 1.25, type: 'mystic' },
      { x: 1910, y: 390, scale: 1.2, type: 'mystic' },
      // Interior sacred grove trees
      { x: 1480, y: 140, scale: 1.15, type: 'mystic' },
      { x: 1780, y: 320, scale: 1.2, type: 'mystic' },
    ],
  },

  // ==========================================================================
  // ROUTE 1: Viridian Forest ➔ Route 2 ➔ Pewter City (Gym 1 - Brock)
  // ==========================================================================
  {
    id: 1,
    name: 'Route 2 & Forest',
    locationLabel: 'Route 2 & Pewter City',
    destinationLabel: 'Pewter Gym (Brock)',
    worldWidth: 3300,
    worldHeight: 960,
    theme: 'forest',
    startX: 80,
    startY: 440,
    sections: [
      {
        id: 'r1_sec1',
        name: 'Viridian Forest Deep Canopy',
        subtitle: 'Canopy Glade (Lv 3-7)',
        icon: '🌲',
        x: 0,
        y: 0,
        w: 1620,
        h: 960,
      },
      {
        id: 'r1_sec2',
        name: 'Pewter City',
        subtitle: 'The Stone Gray City of Mt. Moon',
        icon: '⛰️',
        x: 1620,
        y: 0,
        w: 1680,
        h: 960,
      },
    ],
    path: [
      // Main central forest track
      { x: 40, y: 410, w: 1500, h: 80, style: 'dirt' },
      // Deep Canopy Ridge (North)
      { x: 360, y: 220, w: 860, h: 64, style: 'dirt' },
      { x: 360, y: 220, w: 64, h: 200, style: 'dirt' },
      { x: 1160, y: 220, w: 64, h: 200, style: 'dirt' },
      // Rock Tunnel Hollow (South)
      { x: 580, y: 620, w: 880, h: 64, style: 'dirt' },
      { x: 580, y: 480, w: 64, h: 150, style: 'dirt' },
      { x: 1400, y: 480, w: 64, h: 150, style: 'dirt' },
      // Approach to Pewter City
      { x: 1520, y: 390, w: 110, h: 80, style: 'dirt' },
      // Pewter City Granite Ring Road Network (Surrounding the Sunken Quarry Pit)
      // West Quarry Avenue
      { x: 1680, y: 220, w: 72, h: 484, style: 'cobble' },
      // North Museum Promenade
      { x: 1680, y: 220, w: 980, h: 64, style: 'cobble' },
      // South Excavation Ring
      { x: 1680, y: 640, w: 980, h: 64, style: 'cobble' },
      // East Transit Avenue
      { x: 2600, y: 220, w: 64, h: 484, style: 'cobble' },
      // Central Meteorite Monolith Square
      { x: 2060, y: 320, w: 220, h: 180, style: 'cobble' },
      // West-to-Monolith Connector
      { x: 1740, y: 380, w: 330, h: 64, style: 'cobble' },
      // Monolith-to-East Connector
      { x: 2270, y: 380, w: 340, h: 64, style: 'cobble' },
      // Route 3 Gatehouse East Avenue
      { x: 2660, y: 440, w: 560, h: 64, style: 'cobble' },
    ],
    grassPatches: [
      // Zone A: Forest Canopy (Bug Pokémon)
      { x: 90, y: 150, w: 180, h: 90, zone: 'forest' },
      { x: 90, y: 670, w: 180, h: 100, zone: 'forest' },
      { x: 180, y: 270, w: 170, h: 120, zone: 'forest' },
      { x: 200, y: 510, w: 190, h: 130, zone: 'forest' },
      { x: 400, y: 520, w: 140, h: 90, zone: 'forest' },
      { x: 420, y: 130, w: 220, h: 80, zone: 'forest' },
      { x: 540, y: 290, w: 250, h: 100, zone: 'forest' },
      // Zone B: Rock Clearing (Geodude, Diglett, Zubat)
      { x: 720, y: 700, w: 320, h: 110, zone: 'rock' },
      { x: 1100, y: 690, w: 260, h: 110, zone: 'rock' },
      // Zone C: Field Meadows
      { x: 800, y: 500, w: 220, h: 90, zone: 'field' },
      { x: 860, y: 290, w: 260, h: 100, zone: 'field' },
      { x: 1080, y: 500, w: 240, h: 90, zone: 'field' },
      // Zone D: Rare Forest Glade (Pikachu, Scyther, Pinsir)
      { x: 960, y: 130, w: 180, h: 80, zone: 'rare' },
      { x: 1280, y: 150, w: 240, h: 140, zone: 'rare' },
      { x: 1440, y: 160, w: 120, h: 130, zone: 'rare' },
    ],
    buildings: [
      // 1. Pewter Museum of Science (Dominating North-West Clifftop)
      {
        type: 'museum',
        x: 1720,
        y: 120,
        w: 140,
        h: 104,
        label: 'Pewter Museum of Science',
        occupant: 'Curator Fossilman',
        dialogue: 'Welcome to the Pewter Museum of Science! We showcase prehistoric fossils from Mt. Moon, including the legendary Old Amber!',
      },
      // 2. Quarry Mining Supply Mart (West Lane)
      {
        type: 'mart',
        x: 1700,
        y: 450,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 3. Geologist Flint's Stone Cottage (South-West)
      {
        type: 'house',
        x: 1700,
        y: 550,
        w: 84,
        h: 74,
        label: "Geologist's House",
        roofStyle: 'slate',
        wallColor: '#94a3b8',
        chimney: true,
        occupant: 'Geologist Flint',
        dialogue: "Pewter City is famous for its dark granite stone! Brock uses sturdy Rock-type Pokémon like Geodude and Onix.",
      },
      // 4. Pokémon Center (South-East Arrival Terrace)
      {
        type: 'center',
        x: 2480,
        y: 550,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 5. Brock's Sunken Granite Gym (South-Central Quarry Pit)
      {
        type: 'gym',
        x: 2100,
        y: 535,
        w: 120,
        h: 96,
        label: 'Pewter Gym (Brock)',
        gymIndex: 0,
      },
      // 6. Sculptor's Studio (North-East)
      {
        type: 'house',
        x: 2360,
        y: 130,
        w: 84,
        h: 74,
        label: "Sculptor's Studio",
        roofStyle: 'slate',
        wallColor: '#cbd5e1',
        chimney: true,
        occupant: 'Sculptor Rocky',
        dialogue: "I carve boulders into magnificent Pokémon statues! The secret is feeling the natural grain of the granite.",
      },
      // 7. Route 3 Checkpoint Gatehouse (East)
      {
        type: 'gate',
        x: 3180,
        y: 430,
        w: 90,
        h: 86,
        label: 'Route 3 Gate',
      },
    ],
    fountains: [
      { x: 2170, y: 410, radius: 34, style: 'monument', label: 'Mt. Moon Meteorite Monolith' },
    ],
    streetlamps: [
      { x: 1700, y: 260 },
      { x: 1920, y: 260 },
      { x: 2320, y: 260 },
      { x: 2580, y: 260 },
      { x: 2040, y: 350 },
      { x: 2300, y: 350 },
      { x: 2040, y: 470 },
      { x: 2300, y: 470 },
      { x: 1700, y: 620 },
      { x: 2460, y: 620 },
      { x: 3140, y: 460 },
    ],
    benches: [
      { x: 2080, y: 360 },
      { x: 2220, y: 360 },
      { x: 2440, y: 260 },
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
      {
        id: 'r1_money2',
        x: 2280,
        y: 450,
        name: 'Poké Dollars',
        type: 'money',
        amount: 850,
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
      {
        id: 'r1_npc4',
        x: 2020,
        y: 480,
        avatar: 'Geologist Slate',
        name: 'Geologist Slate',
        dialogue: 'The central stone fountain is carved from a solid chunk of Mt. Moon meteor rock!',
      },
    ],
    targetEncounters: 5,
    exitX: 3220,
    fences: [
      { x: 40, y: 398, w: 180, h: 16 },
      { x: 440, y: 208, w: 240, h: 16 },
      { x: 800, y: 208, w: 280, h: 16 },
      { x: 640, y: 398, w: 260, h: 16 },
      { x: 1040, y: 398, w: 240, h: 16 },
      { x: 700, y: 684, w: 320, h: 16 },
      { x: 1140, y: 684, w: 240, h: 16 },
      // Pewter City stone garden fences
      { x: 1740, y: 500, w: 120, h: 16 },
      { x: 1960, y: 500, w: 110, h: 16 },
      { x: 2180, y: 500, w: 110, h: 16 },
      { x: 2560, y: 260, w: 110, h: 16 },
    ],
    stones: [
      { x: 160, y: 180, radius: 17, variant: 'mossy' },
      { x: 300, y: 160, radius: 15, variant: 'granite' },
      { x: 500, y: 380, radius: 14, variant: 'slate' },
      { x: 960, y: 380, radius: 16, variant: 'granite' },
      { x: 680, y: 710, radius: 18, variant: 'mossy' },
      { x: 1040, y: 720, radius: 16, variant: 'slate' },
      { x: 1380, y: 700, radius: 15, variant: 'granite' },
      // Mt. Moon Granite Boulders in Pewter City
      { x: 1940, y: 360, radius: 18, variant: 'granite' },
      { x: 2180, y: 360, radius: 20, variant: 'slate' },
      { x: 2320, y: 530, radius: 22, variant: 'granite' },
      { x: 2560, y: 530, radius: 24, variant: 'slate' },
    ],
    trees: [
      // Top dense pine tree line
      ...Array.from({ length: 75 }, (_, i) => ({
        x: 40 + i * 44,
        y: 65,
        scale: 1.05 + (i % 3) * 0.08,
        type: 'pine' as const,
      })),
      // Meadow standalone pines
      { x: 200, y: 200, scale: 1.2, type: 'pine' },
      { x: 500, y: 155, scale: 1.1, type: 'pine' },
      { x: 920, y: 165, scale: 1.25, type: 'pine' },
      { x: 1300, y: 160, scale: 1.15, type: 'pine' },
      { x: 410, y: 550, scale: 1.2, type: 'pine' },
      { x: 820, y: 550, scale: 1.1, type: 'pine' },
      { x: 1200, y: 550, scale: 1.25, type: 'pine' },
      // Bottom dense pine tree line
      ...Array.from({ length: 75 }, (_, i) => ({
        x: 40 + i * 44,
        y: 890,
        scale: 1.05 + (i % 2) * 0.1,
        type: 'pine' as const,
      })),
      // Right border trees
      ...Array.from({ length: 18 }, (_, i) => {
        const y = 50 + i * 48;
        if (y >= 260 && y <= 410) return null;
        return { x: 3260, y, scale: 1.1, type: 'pine' as const };
      }).filter(Boolean) as RouteTree[],
    ],
  },

  // ==========================================================================
  // ROUTE 2: Route 3/4 & Mt. Moon ➔ Cerulean City (Gym 2 - Misty)
  // ==========================================================================
  {
    id: 2,
    name: 'Route 3 & 4 (Mt. Moon)',
    locationLabel: 'Route 3, 4 & Cerulean City',
    destinationLabel: 'Cerulean Gym (Misty)',
    worldWidth: 3400,
    worldHeight: 980,
    theme: 'rock',
    startX: 80,
    startY: 450,
    sections: [
      {
        id: 'r2_sec1',
        name: 'Mt. Moon Foothills',
        subtitle: 'Mountain Pass & Cave Glade (Lv 6-12)',
        icon: '⛰️',
        x: 0,
        y: 0,
        w: 1560,
        h: 980,
      },
      {
        id: 'r2_sec2',
        name: 'Cerulean City',
        subtitle: 'The Floral Water City of Flowing Canals & Azure Cascades',
        icon: '💧',
        x: 1560,
        y: 0,
        w: 1840,
        h: 980,
      },
    ],
    path: [
      // Main Highway across the mountain foothills
      { x: 40, y: 420, w: 1520, h: 80, style: 'dirt' },
      // Mountain Peak Overlook (North)
      { x: 380, y: 220, w: 900, h: 64, style: 'dirt' },
      { x: 380, y: 220, w: 64, h: 210, style: 'dirt' },
      { x: 1220, y: 220, w: 64, h: 210, style: 'dirt' },
      // Underground Cave Creek (South)
      { x: 560, y: 640, w: 940, h: 64, style: 'dirt' },
      { x: 560, y: 490, w: 64, h: 160, style: 'dirt' },
      { x: 1440, y: 490, w: 64, h: 160, style: 'dirt' },
      // Cerulean City Canal Entrance
      { x: 1500, y: 410, w: 80, h: 80, style: 'dirt' },
      // Cerulean City Azure Marine Canal Network & Bridges
      // West Bank Civic Promenade
      { x: 1650, y: 220, w: 700, h: 64, style: 'flagstone' },
      // West Bank Commercial Pier (Mart & Bike Shop lane)
      { x: 1650, y: 440, w: 700, h: 72, style: 'flagstone' },
      // West Bank Connecting Avenue
      { x: 1720, y: 220, w: 64, h: 480, style: 'flagstone' },
      // South-West Bike Shop Quayside
      { x: 1720, y: 640, w: 600, h: 64, style: 'flagstone' },
      // North Canal Stone Bridge
      { x: 2320, y: 220, w: 260, h: 64, style: 'flagstone' },
      // Grand Central Marine Canal Bridge
      { x: 2320, y: 440, w: 260, h: 72, style: 'flagstone' },
      // East Bank Transit Avenue
      { x: 2560, y: 220, w: 64, h: 484, style: 'flagstone' },
      // East Bank Quayside Boulevard to Route 5 Gate
      { x: 2560, y: 440, w: 680, h: 72, style: 'flagstone' },
      // Misty's Gym Offshore Pier Boardwalk
      { x: 2600, y: 620, w: 220, h: 64, style: 'flagstone' },
    ],
    ponds: [
      // Major Flowing Canal River (Spanning north to south)
      {
        x: 2360,
        y: 120,
        w: 180,
        h: 740,
        pier: { x: 2320, y: 440, w: 260, h: 70 },
      },
      // Misty's Offshore Water Gym Aquatic Lagoon
      {
        x: 2680,
        y: 530,
        w: 280,
        h: 220,
        pier: { x: 2680, y: 550, w: 70, h: 90 },
      },
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
      // 1. Pokémon Center (North Bank Waterfront Promenade)
      {
        type: 'center',
        x: 1840,
        y: 130,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 2. Poké Mart (West Canal Quayside)
      {
        type: 'mart',
        x: 1650,
        y: 520,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 3. Cerulean Bike Shop (South-West Waterfront Villa)
      {
        type: 'house',
        x: 1980,
        y: 520,
        w: 88,
        h: 74,
        label: 'Cerulean Bike Shop',
        roofStyle: 'azure',
        wallColor: '#f0f9ff',
        chimney: true,
        occupant: 'Cycling Enthusiast',
        dialogue: 'Cerulean City is surrounded by glistening waterways! A bicycle is the speediest way to travel across Kanto.',
      },
      // 4. Cerulean Gym (Misty) - Offshore Wooden Pier in South-East Lagoon
      {
        type: 'gym',
        x: 2720,
        y: 540,
        w: 120,
        h: 96,
        label: 'Cerulean Gym (Misty)',
        gymIndex: 1,
      },
      // 5. Water Lily Villa (North-East Bank)
      {
        type: 'house',
        x: 2700,
        y: 130,
        w: 84,
        h: 74,
        label: 'Water Lily Villa',
        roofStyle: 'azure',
        wallColor: '#e0f2fe',
        chimney: true,
        occupant: 'Swimmer Marina',
        dialogue: "Misty's Water Pokémon are tough, but Electric and Grass moves like Vine Whip and Thunder Shock will give you the edge!",
      },
      // 6. Breeder's Lodge (West Bank)
      {
        type: 'house',
        x: 2100,
        y: 130,
        w: 86,
        h: 74,
        label: "Breeder's Lodge",
        roofStyle: 'wood',
        wallColor: '#e0f2fe',
        chimney: true,
        occupant: 'Breeder Kyle',
        dialogue: 'Cerulean City is famous for its pure, crystal-clear water system fed straight from the mountains!',
      },
      // 7. Route 5 Checkpoint Gatehouse (East)
      {
        type: 'gate',
        x: 3240,
        y: 430,
        w: 90,
        h: 86,
        label: 'Route 5 Gate',
      },
    ],
    fountains: [
      { x: 2100, y: 340, radius: 36, style: 'marble', label: 'Cerulean Cascade Fountain' },
    ],
    streetlamps: [
      { x: 1720, y: 260 },
      { x: 2100, y: 260 },
      { x: 1720, y: 480 },
      { x: 2100, y: 480 },
      { x: 2300, y: 260 },
      { x: 2580, y: 260 },
      { x: 2300, y: 480 },
      { x: 2580, y: 480 },
      { x: 2700, y: 640 },
      { x: 3180, y: 460 },
    ],
    benches: [
      { x: 2040, y: 360 },
      { x: 2160, y: 360 },
      { x: 2600, y: 260 },
    ],
    fences: [
      { x: 40, y: 408, w: 180, h: 16 },
      { x: 440, y: 208, w: 240, h: 16 },
      { x: 800, y: 208, w: 280, h: 16 },
      // Cerulean City Canal & Garden Fences
      { x: 1740, y: 500, w: 110, h: 16 },
      { x: 1920, y: 500, w: 110, h: 16 },
      { x: 2540, y: 500, w: 110, h: 16 },
      { x: 2160, y: 605, w: 140, h: 16 },
      { x: 2390, y: 605, w: 130, h: 16 },
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
      {
        id: 'r2_money2',
        x: 2140,
        y: 560,
        name: 'Poké Dollars',
        type: 'money',
        amount: 900,
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
      {
        id: 'r2_npc3',
        x: 1720,
        y: 280,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Cerulean City! The waterways here are pristine and flow directly from the mountain springs.',
      },
      {
        id: 'r2_npc4',
        x: 2130,
        y: 490,
        avatar: 'Lass Shannon',
        name: 'Lass Shannon',
        dialogue: 'The azure cascade fountain creates such cool mist on warm afternoons! I love listening to the water splashing.',
      },
      {
        id: 'r2_npc5',
        x: 2360,
        y: 590,
        avatar: 'Swimmer Kyle',
        name: 'Swimmer Kyle',
        dialogue: 'Fishing from this wooden canal pier is so tranquil! Water-type Pokémon frequently swim up to the surface.',
        gift: { type: 'money', name: 'Poké Dollars', amount: 400 },
      },
    ],
    targetEncounters: 5,
    exitX: 3320,
  },

  // ==========================================================================
  // ROUTE 3: Route 5 & 6 ➔ Vermilion City (Gym 3 - Lt. Surge)
  // ==========================================================================
  {
    id: 3,
    name: 'Route 5 & 6',
    locationLabel: 'Route 5, 6 & Vermilion Port',
    destinationLabel: 'Vermilion Gym (Lt. Surge)',
    worldWidth: 3400,
    worldHeight: 1000,
    theme: 'route',
    startX: 80,
    startY: 460,
    sections: [
      {
        id: 'r3_sec1',
        name: 'Route 5 & 6 Coastal Trail',
        subtitle: 'Electric Meadows & Waterfront (Lv 9-15)',
        icon: '⚡',
        x: 0,
        y: 0,
        w: 1600,
        h: 1000,
      },
      {
        id: 'r3_sec2',
        name: 'Vermilion City',
        subtitle: 'The Lightning Port City of Harbor Brick & Sunsets',
        icon: '⚓',
        x: 1600,
        y: 0,
        w: 1800,
        h: 1000,
      },
    ],
    path: [
      { x: 40, y: 430, w: 1560, h: 80, style: 'dirt' },
      // North Hillside Meadow
      { x: 420, y: 220, w: 920, h: 64, style: 'dirt' },
      { x: 420, y: 220, w: 64, h: 220, style: 'dirt' },
      { x: 1280, y: 220, w: 64, h: 220, style: 'dirt' },
      // South Vermilion Docks & Bay
      { x: 620, y: 660, w: 960, h: 64, style: 'dirt' },
      { x: 620, y: 500, w: 64, h: 170, style: 'dirt' },
      { x: 1520, y: 500, w: 64, h: 170, style: 'dirt' },
      // Vermilion City Port Entry
      { x: 1540, y: 410, w: 80, h: 80, style: 'dirt' },
      // Vermilion City Terracotta Brickwork Network
      // Vermilion Port Red Brickwork & Harbor Boardwalk Network
      // North Highway Entry
      { x: 1600, y: 220, w: 840, h: 64, style: 'brick' },
      // Harbor Boardwalk along Southern Coastline
      { x: 1680, y: 600, w: 1240, h: 72, style: 'brick' },
      // Central Connecting Maritime Avenue
      { x: 2000, y: 220, w: 72, h: 450, style: 'brick' },
      // Central Port Plaza
      { x: 2300, y: 380, w: 240, h: 160, style: 'brick' },
      // Lt. Surge Fortified Access Road (North-East)
      { x: 2700, y: 220, w: 480, h: 64, style: 'brick' },
      { x: 2840, y: 150, w: 64, h: 130, style: 'brick' },
      // Route 11 Gatehouse East Avenue
      { x: 2800, y: 440, w: 500, h: 72, style: 'brick' },
    ],
    ponds: [
      // Expansive South Ocean Bay & Harbor Quayside
      {
        x: 1680,
        y: 720,
        w: 1540,
        h: 260,
        pier: { x: 2000, y: 660, w: 90, h: 100 },
      },
      // Second Cargo Pier Basin
      {
        x: 2380,
        y: 720,
        w: 160,
        h: 220,
        pier: { x: 2420, y: 660, w: 90, h: 100 },
      },
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
      // 1. Pokémon Center (North-West Arrival Plaza)
      {
        type: 'center',
        x: 1680,
        y: 130,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 2. Pokémon Fan Club (Victorian Cottage with Pikachu Weather Vane)
      {
        type: 'fan_club',
        x: 2160,
        y: 120,
        w: 100,
        h: 84,
        label: 'Pokémon Fan Club',
        occupant: 'Fan Club Chairman',
        dialogue: 'I just adore cute Pokémon! Rapidash, Fearow, and Pikachu are so breathtaking! Treat all Pokémon with immense love!',
      },
      // 3. Port Shipping & Tackle Mart (Down on the Southern Harbor Quayside)
      {
        type: 'mart',
        x: 1720,
        y: 500,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 4. Sailor's Bunkhouse (South-Central Waterfront)
      {
        type: 'house',
        x: 2200,
        y: 500,
        w: 84,
        h: 74,
        label: "Sailor's Bunkhouse",
        roofStyle: 'wood',
        wallColor: '#fed7aa',
        chimney: true,
        occupant: 'Sailor Pete',
        dialogue: 'The legendary luxury liner S.S. Anne docks right at our harbor! Sailors come from all corners of the world to trade tales.',
      },
      // 5. Lt. Surge Fortified Electric Gym (Far North-East Fenced Compound)
      {
        type: 'gym',
        x: 2820,
        y: 65,
        w: 120,
        h: 96,
        label: 'Vermilion Gym (Lt. Surge)',
        gymIndex: 2,
      },
      // 6. Dockmaster's Office (East)
      {
        type: 'house',
        x: 2600,
        y: 500,
        w: 88,
        h: 74,
        label: 'Dockmaster Office',
        roofStyle: 'slate',
        wallColor: '#f1f5f9',
        chimney: true,
        occupant: 'Dockmaster Hawkins',
        dialogue: 'Lt. Surge was an army pilot who fought in overseas battles! His electric traps protect the gym from careless challengers.',
      },
      // 7. Route 11 Checkpoint Gatehouse (East)
      {
        type: 'gate',
        x: 3240,
        y: 430,
        w: 90,
        h: 86,
        label: 'Route 11 Gate',
      },
    ],
    fountains: [
      { x: 2420, y: 450, radius: 36, style: 'anchor', label: 'Grand Admiralty Naval Anchor' },
    ],
    streetlamps: [
      { x: 1680, y: 260 },
      { x: 2100, y: 260 },
      { x: 2000, y: 440 },
      { x: 2000, y: 580 },
      { x: 2300, y: 360 },
      { x: 2540, y: 360 },
      { x: 2780, y: 260 },
      { x: 1720, y: 590 },
      { x: 2200, y: 590 },
      { x: 2600, y: 590 },
      { x: 3180, y: 460 },
    ],
    benches: [
      { x: 2320, y: 400 },
      { x: 2460, y: 400 },
      { x: 2100, y: 600 },
    ],
    fences: [
      { x: 40, y: 418, w: 200, h: 16 },
      { x: 440, y: 208, w: 260, h: 16 },
      // Harbor garden & docks fences
      { x: 1760, y: 500, w: 110, h: 16 },
      { x: 1940, y: 500, w: 110, h: 16 },
      { x: 2540, y: 500, w: 110, h: 16 },
      { x: 2160, y: 605, w: 140, h: 16 },
      { x: 2390, y: 605, w: 130, h: 16 },
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
      {
        id: 'r3_money2',
        x: 2140,
        y: 560,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1000,
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
      {
        id: 'r3_npc3',
        x: 1740,
        y: 280,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Vermilion City! Keep an eye on your belongings while exploring the docks.',
      },
      {
        id: 'r3_npc4',
        x: 2130,
        y: 490,
        avatar: 'Lass Connie',
        name: 'Lass Connie',
        dialogue: 'The stone anchor fountain commemorates ancient seafarers who first anchored ships at Vermilion Bay!',
      },
      {
        id: 'r3_npc5',
        x: 2360,
        y: 590,
        avatar: 'Sailor Jack',
        name: 'Sailor Jack',
        dialogue: 'Nothing beats the ocean breeze after weeks at sea! Take this allowance to buy some Poké Balls at the Mart.',
        gift: { type: 'money', name: 'Poké Dollars', amount: 500 },
      },
    ],
    targetEncounters: 5,
    exitX: 3320,
  },

  // ==========================================================================
  // ROUTE 4: Route 7, 8, 9 & Rock Tunnel ➔ Celadon City (Gym 4 - Erika)
  // ==========================================================================
  {
    id: 4,
    name: 'Route 7, 8 & 9',
    locationLabel: 'Route 7, 8 & Celadon City',
    destinationLabel: 'Celadon Gym (Erika)',
    worldWidth: 3500,
    worldHeight: 1020,
    theme: 'city',
    startX: 80,
    startY: 470,
    sections: [
      {
        id: 'r4_sec1',
        name: 'Lavender Outskirts & Meadows',
        subtitle: 'Breezy Grasslands & Blossom Meadows (Lv 12-18)',
        icon: '🌸',
        x: 0,
        y: 0,
        w: 1680,
        h: 1020,
      },
      {
        id: 'r4_sec2',
        name: 'Celadon Metropolis',
        subtitle: 'The Grand City of Rainbow Dreams & Grand Boulevards',
        icon: '🏙️',
        x: 1680,
        y: 0,
        w: 1820,
        h: 1020,
      },
    ],
    path: [
      { x: 40, y: 440, w: 1640, h: 80, style: 'dirt' },
      // North Lavender Outskirts
      { x: 440, y: 220, w: 960, h: 64, style: 'dirt' },
      { x: 440, y: 220, w: 64, h: 230, style: 'dirt' },
      { x: 1340, y: 220, w: 64, h: 230, style: 'dirt' },
      // South Cycling Trail
      { x: 660, y: 680, w: 1000, h: 64, style: 'dirt' },
      { x: 660, y: 510, w: 64, h: 180, style: 'dirt' },
      { x: 1600, y: 510, w: 64, h: 180, style: 'dirt' },
      // Celadon City Main Entrance
      { x: 1620, y: 410, w: 80, h: 80, style: 'dirt' },
      // Celadon Metropolis Pastel Marble Network
      // Celadon Metropolis Pastel Marble Avenue Grid
      // West Department Store Commercial Avenue
      { x: 1720, y: 140, w: 72, h: 660, style: 'paved' },
      // West Department Store Forecourt
      { x: 1720, y: 240, w: 600, h: 72, style: 'paved' },
      // Grand Metropolitan Central Avenue
      { x: 1720, y: 440, w: 1620, h: 80, style: 'paved' },
      // Central Grand Crossroad Plaza
      { x: 2260, y: 360, w: 240, h: 220, style: 'paved' },
      // North Entertainment & Casino Avenue
      { x: 2100, y: 150, w: 860, h: 64, style: 'paved' },
      // North-to-South Transit Avenue
      { x: 2560, y: 150, w: 72, h: 480, style: 'paved' },
      // Secluded South-West Botanical Garden Trail
      { x: 1840, y: 512, w: 64, h: 320, style: 'paved' },
      { x: 1840, y: 760, w: 460, h: 64, style: 'paved' },
      // Eastern Saffron/Route 10 Gate Avenue
      { x: 2800, y: 440, w: 560, h: 72, style: 'paved' },
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
      // 1. Celadon Department Store (Towering Art Deco Multi-Story Hub in West)
      {
        type: 'dept_store',
        x: 1780,
        y: 120,
        w: 140,
        h: 110,
        label: 'Celadon Dept Store',
        occupant: 'Floor Manager Luxury',
        dialogue: 'Welcome to the Celadon Department Store! 5 floors of premier items: TMs, Evolution Stones, and Battle Boosters!',
      },
      // 2. Pokémon Center (Grand Central Crossroad Plaza)
      {
        type: 'center',
        x: 2330,
        y: 250,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 3. Boutique Tea & Herb Apothecary (Eastern Commercial District)
      {
        type: 'mart',
        x: 2840,
        y: 320,
        w: 88,
        h: 74,
        label: 'Boutique Mart',
      },
      // 4. Erika's Gym (Secluded South-West Botanical Garden Sanctuary)
      {
        type: 'gym',
        x: 1950,
        y: 650,
        w: 120,
        h: 96,
        label: 'Celadon Gym (Erika)',
        gymIndex: 3,
      },
      // 5. Game Corner Suite (North Entertainment Quarter)
      {
        type: 'house',
        x: 2680,
        y: 80,
        w: 96,
        h: 76,
        label: 'Game Corner Hall',
        roofStyle: 'emerald',
        wallColor: '#fef3c7',
        chimney: false,
        occupant: 'Lucky Gambler Jack',
        dialogue: 'The Celadon Game Corner is filled with thrills! But keep your wits sharp—there are rumors of suspicious characters in dark uniforms in the basement...',
      },
      // 6. Celadon Luxury Hotel (South-East Quarter)
      {
        type: 'house',
        x: 2840,
        y: 550,
        w: 92,
        h: 76,
        label: 'Celadon Hotel',
        roofStyle: 'terracotta',
        wallColor: '#f8fafc',
        chimney: true,
        occupant: 'Concierge Jean',
        dialogue: "Celadon City never sleeps! The night view of the neon signs from the roof garden is legendary!",
      },
      // 7. Route 10 Checkpoint Gatehouse (East)
      {
        type: 'gate',
        x: 3340,
        y: 430,
        w: 90,
        h: 86,
        label: 'Route 10 Gate',
      },
    ],
    fountains: [
      { x: 2380, y: 470, radius: 36, style: 'stone', label: 'Grand Obelisk Plaza Fountain' },
    ],
    streetlamps: [
      { x: 1720, y: 260, style: 'ornate' },
      { x: 2000, y: 260, style: 'ornate' },
      { x: 2260, y: 350, style: 'ornate' },
      { x: 2500, y: 350, style: 'ornate' },
      { x: 2260, y: 570, style: 'ornate' },
      { x: 2500, y: 570, style: 'ornate' },
      { x: 1840, y: 640, style: 'ornate' },
      { x: 2780, y: 430, style: 'ornate' },
      { x: 3280, y: 430, style: 'ornate' },
    ],
    benches: [
      { x: 2280, y: 410 },
      { x: 2450, y: 410 },
      { x: 1840, y: 260 },
      { x: 2780, y: 360 },
    ],
    fences: [
      { x: 40, y: 428, w: 200, h: 16 },
      { x: 440, y: 208, w: 260, h: 16 },
      // Celadon ornamental garden fences
      { x: 1840, y: 500, w: 110, h: 16 },
      { x: 2020, y: 500, w: 110, h: 16 },
      { x: 2660, y: 500, w: 110, h: 16 },
      { x: 1840, y: 670, w: 110, h: 16 },
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
      {
        id: 'r4_money2',
        x: 2260,
        y: 560,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1200,
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
      {
        id: 'r4_npc2',
        x: 1040,
        y: 240,
        avatar: 'Lass Kimberly',
        name: 'Lass Kimberly',
        dialogue: 'The perfume from Erika’s Gym fills the entire eastern district! It smells of sweet Gloom nectar.',
      },
      {
        id: 'r4_npc3',
        x: 1820,
        y: 280,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Celadon Metropolis! Make sure to visit the rooftop garden of the Department Store.',
      },
      {
        id: 'r4_npc4',
        x: 2260,
        y: 490,
        avatar: 'Super Nerd Glen',
        name: 'Super Nerd Glen',
        dialogue: 'This royal floral fountain has water infused with rare flower essences from the botanical gardens!',
      },
      {
        id: 'r4_npc5',
        x: 2500,
        y: 590,
        avatar: 'Aroma Lady Lily',
        name: 'Aroma Lady Lily',
        dialogue: 'Flowers bloom in every windowbox in Celadon. Here, have these healing berries fresh from our gardens!',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 2 },
      },
      {
        id: 'r4_npc6',
        x: 2640,
        y: 280,
        avatar: 'Gentleman Albert',
        name: 'Gentleman Albert',
        dialogue: 'Celadon Department Store is the grandest shopping center in all of Kanto! Five floors of luxury goods.',
      },
    ],
    targetEncounters: 5,
    exitX: 3420,
  },

  // ==========================================================================
  // ROUTE 5: Cycling Road & Safari Route ➔ Fuchsia City (Gym 5 - Koga)
  // ==========================================================================
  {
    id: 5,
    name: 'Cycling Road & Safari',
    locationLabel: 'Route 17, 18 & Fuchsia City',
    destinationLabel: 'Fuchsia Gym (Koga)',
    worldWidth: 3500,
    worldHeight: 1040,
    theme: 'route',
    startX: 80,
    startY: 480,
    sections: [
      {
        id: 'r5_sec1',
        name: 'Cycling Road & Savannah Plains',
        subtitle: 'Fast Cycling Tracks & Savannah Reeds (Lv 18-24)',
        icon: '🚲',
        x: 0,
        y: 0,
        w: 1700,
        h: 1040,
      },
      {
        id: 'r5_sec2',
        name: 'Fuchsia City',
        subtitle: 'The Historic Ninja Town & Gateway to the Safari Zone',
        icon: '🥷',
        x: 1700,
        y: 0,
        w: 1800,
        h: 1040,
      },
    ],
    path: [
      { x: 40, y: 450, w: 1660, h: 80, style: 'dirt' },
      // North Safari Wetland
      { x: 460, y: 220, w: 980, h: 64, style: 'dirt' },
      { x: 460, y: 220, w: 64, h: 240, style: 'dirt' },
      { x: 1380, y: 220, w: 64, h: 240, style: 'dirt' },
      // South Coastal Shoreline
      { x: 700, y: 700, w: 1020, h: 64, style: 'dirt' },
      { x: 700, y: 520, w: 64, h: 190, style: 'dirt' },
      { x: 1660, y: 520, w: 64, h: 190, style: 'dirt' },
      // Fuchsia City Entrance
      { x: 1640, y: 420, w: 80, h: 80, style: 'dirt' },
      // Fuchsia City Organic Bamboo & Timber Trail Network
      // North Safari Promenade
      { x: 1740, y: 150, w: 1200, h: 70, style: 'flagstone' },
      // Central Winding Bamboo Trail
      { x: 1740, y: 430, w: 800, h: 64, style: 'flagstone' },
      // Central Connecting Trail
      { x: 2200, y: 220, w: 64, h: 480, style: 'flagstone' },
      // South-West Bamboo Glade Road
      { x: 1740, y: 700, w: 520, h: 64, style: 'flagstone' },
      // South-East Shadow Forest Path to Koga's Gym
      { x: 2600, y: 440, w: 64, h: 360, style: 'flagstone' },
      { x: 2600, y: 740, w: 500, h: 64, style: 'flagstone' },
      // South Route 19 Gatehouse Approach
      { x: 2200, y: 700, w: 64, h: 240, style: 'flagstone' },
    ],
    ponds: [
      // West Lotus Lily Koi Pond
      {
        x: 1840,
        y: 560,
        w: 260,
        h: 200,
        pier: { x: 1940, y: 520, w: 60, h: 60 },
      },
      // East Wildlife Watering Hole
      {
        x: 2540,
        y: 220,
        w: 280,
        h: 180,
        pier: { x: 2640, y: 380, w: 60, h: 60 },
      },
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
      // 1. Safari Zone Grand Pavilion (Occupying Northern Boundary)
      {
        type: 'safari_gate',
        x: 2050,
        y: 50,
        w: 140,
        h: 100,
        label: 'Safari Zone Gate',
        occupant: 'Warden Slowpoke',
        dialogue: 'Welcome to the Safari Zone! Catch wild Pokémon with Safari Balls and Poké Bait across vast savanna habitats!',
      },
      // 2. Pokémon Center (South-West Bamboo Glade)
      {
        type: 'center',
        x: 1750,
        y: 610,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 3. Central Market Poké Mart
      {
        type: 'mart',
        x: 2100,
        y: 350,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 4. Koga's Hidden Ninja Pagoda Dojo Gym (Far South-East Shadowed Forest)
      {
        type: 'gym',
        x: 2900,
        y: 650,
        w: 120,
        h: 96,
        label: 'Fuchsia Gym (Koga)',
        gymIndex: 4,
      },
      // 5. Safari Warden's Historic Villa (North-West)
      {
        type: 'house',
        x: 1750,
        y: 240,
        w: 84,
        h: 74,
        label: "Warden's House",
        roofStyle: 'wood',
        wallColor: '#fef3c7',
        chimney: true,
        occupant: 'Safari Ranger',
        dialogue: 'The Safari Warden lost his Gold Teeth! If you find them, he will teach you how to push boulders!',
      },
      // 6. Ninja Herbalist's Pagoda (North-East)
      {
        type: 'house',
        x: 2900,
        y: 130,
        w: 84,
        h: 74,
        label: 'Ninja Herbalist',
        roofStyle: 'emerald',
        wallColor: '#ecfdf5',
        chimney: true,
        occupant: 'Ninja Janine',
        dialogue: 'My father Koga masters Toxic and sleep powder! In darkness, a ninja strikes with absolute stealth.',
      },
      // 7. Route 19 Sea Route Gatehouse (South)
      {
        type: 'gate',
        x: 2185,
        y: 880,
        w: 90,
        h: 86,
        label: 'Route 19 Gate',
      },
    ],
    fountains: [
      { x: 2360, y: 430, radius: 34, style: 'zen', label: 'Ancient Zen Tsukubai Rock Basin' },
    ],
    streetlamps: [
      { x: 1840, y: 220, style: 'lantern' },
      { x: 2200, y: 220, style: 'lantern' },
      { x: 2500, y: 220, style: 'lantern' },
      { x: 1900, y: 430, style: 'lantern' },
      { x: 2300, y: 430, style: 'lantern' },
      { x: 1750, y: 690, style: 'lantern' },
      { x: 2600, y: 600, style: 'lantern' },
      { x: 2900, y: 600, style: 'lantern' },
      { x: 2140, y: 840, style: 'lantern' },
    ],
    benches: [
      { x: 2300, y: 450 },
      { x: 2420, y: 450 },
      { x: 1900, y: 680 },
    ],
    fences: [
      { x: 40, y: 438, w: 200, h: 16 },
      { x: 460, y: 208, w: 260, h: 16 },
      // Fuchsia bamboo garden fences
      { x: 1860, y: 500, w: 110, h: 16 },
      { x: 2040, y: 500, w: 110, h: 16 },
      { x: 2660, y: 500, w: 110, h: 16 },
      { x: 2220, y: 615, w: 140, h: 16 },
      { x: 2450, y: 615, w: 110, h: 16 },
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
      {
        id: 'r5_ball2',
        x: 1600,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r5_money2',
        x: 2260,
        y: 560,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1300,
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
      {
        id: 'r5_npc2',
        x: 1060,
        y: 240,
        avatar: 'Bird Keeper Benny',
        name: 'Bird Keeper Benny',
        dialogue: 'Flying-type Pokémon are immune to ground spikes and can swoop down swiftly on Poison foes!',
      },
      {
        id: 'r5_npc3',
        x: 1840,
        y: 280,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Fuchsia City! Keep your distance from the Safari fence when wild Pokémon are feeding.',
      },
      {
        id: 'r5_npc4',
        x: 2260,
        y: 490,
        avatar: 'Ninja Boy Kenshi',
        name: 'Ninja Boy Kenshi',
        dialogue: 'I have been meditating by the stone basin fountain. It calms the mind before a fierce gym battle.',
      },
      {
        id: 'r5_npc5',
        x: 2500,
        y: 590,
        avatar: 'Lass Alice',
        name: 'Lass Alice',
        dialogue: 'The koi in this pond have lived here for over a hundred years! Such peaceful surroundings.',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 2 },
      },
      {
        id: 'r5_npc6',
        x: 2640,
        y: 280,
        avatar: 'Tamer Phil',
        name: 'Tamer Phil',
        dialogue: 'Koga’s venom tactics require immense patience. Prepare yourself well before entering his dojo!',
      },
    ],
    targetEncounters: 5,
    exitX: 3400,
  },

  // ==========================================================================
  // ROUTE 6: Silph Suburbs ➔ Saffron City (Gym 6 - Sabrina)
  // ==========================================================================
  {
    id: 6,
    name: 'Silph Suburbs',
    locationLabel: 'Saffron Outskirts & Saffron City',
    destinationLabel: 'Saffron Gym (Sabrina)',
    worldWidth: 3600,
    worldHeight: 1060,
    theme: 'city',
    startX: 80,
    startY: 490,
    sections: [
      {
        id: 'r6_sec1',
        name: 'Silph Tech Outskirts',
        subtitle: 'Tech Corridors & Psychic Resonance (Lv 22-28)',
        icon: '⚡',
        x: 0,
        y: 0,
        w: 1780,
        h: 1060,
      },
      {
        id: 'r6_sec2',
        name: 'Saffron Metropolis',
        subtitle: 'The Golden Metropolis of Silph Co. & Telekinetic Masters',
        icon: '🏢',
        x: 1780,
        y: 0,
        w: 1820,
        h: 1060,
      },
    ],
    path: [
      { x: 40, y: 460, w: 1740, h: 80, style: 'dirt' },
      // North Tech Corridor
      { x: 480, y: 230, w: 1000, h: 64, style: 'dirt' },
      { x: 480, y: 230, w: 64, h: 240, style: 'dirt' },
      { x: 1420, y: 230, w: 64, h: 240, style: 'dirt' },
      // South Dojo Foothills
      { x: 740, y: 720, w: 1040, h: 64, style: 'dirt' },
      { x: 740, y: 530, w: 64, h: 200, style: 'dirt' },
      { x: 1720, y: 530, w: 64, h: 200, style: 'dirt' },
      // Saffron City Gateway
      { x: 1720, y: 430, w: 80, h: 80, style: 'dirt' },
      // Saffron Metropolis Platinum & Gold 4-Way Avenue Network
      // Grand East-West Main Boulevard
      { x: 1780, y: 440, w: 1680, h: 80, style: 'flagstone' },
      // Central Grand North-South Avenue
      { x: 2360, y: 140, w: 80, h: 740, style: 'flagstone' },
      // North Commercial Cross-Street (Mart & Dojo & Sabrina)
      { x: 1850, y: 220, w: 1450, h: 64, style: 'flagstone' },
      // South Innovation Cross-Street (Center & Residential)
      { x: 1850, y: 680, w: 1450, h: 64, style: 'flagstone' },
      // East Route 8 Gate Approach Avenue
      { x: 3000, y: 440, w: 460, h: 72, style: 'flagstone' },
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
      // 1. Silph Co. Corporate Headquarters Skyscraper (Center-North Apex)
      {
        type: 'silph',
        x: 2335,
        y: 65,
        w: 130,
        h: 120,
        label: 'Silph Co. HQ',
        occupant: 'President Silph',
        dialogue: 'Welcome to Silph Co.! We invented the Master Ball and the Silph Scope! Our technology powers all of Kanto.',
      },
      // 2. High-Tech Electronics Poké Mart (North-West)
      {
        type: 'mart',
        x: 1900,
        y: 130,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 3. Pokémon Center (South-East Innovation District)
      {
        type: 'center',
        x: 2780,
        y: 580,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 4. Karate Fighting Dojo (North-East District)
      {
        type: 'dojo',
        x: 2700,
        y: 120,
        w: 120,
        h: 96,
        label: 'Fighting Dojo',
        occupant: 'Karate Master Koichi',
        dialogue: 'Hoo-hah! We train Hitmonlee and Hitmonchan with unbreakable discipline and iron fists!',
      },
      // 5. Sabrina's Psychic Gym (North-East beside the Dojo)
      {
        type: 'gym',
        x: 2940,
        y: 120,
        w: 120,
        h: 96,
        label: 'Saffron Gym (Sabrina)',
        gymIndex: 5,
      },
      // 6. Mr. Psychic's Residence (South-West)
      {
        type: 'house',
        x: 1900,
        y: 580,
        w: 84,
        h: 74,
        label: "Mr. Psychic's Manor",
        roofStyle: 'slate',
        wallColor: '#e2e8f0',
        chimney: false,
        occupant: 'Mr. Psychic',
        dialogue: 'I foresaw your arrival! Take this TM29 Psychic — it channels pure mental kinetic force!',
      },
      // 7. Copycat's Villa (South-Central)
      {
        type: 'house',
        x: 2180,
        y: 580,
        w: 84,
        h: 74,
        label: 'Copycat Villa',
        roofStyle: 'terracotta',
        wallColor: '#fdf2f8',
        chimney: true,
        occupant: 'Copycat Doll Girl',
        dialogue: 'Hi! Do you like Pokémon? Yes, I like Pokémon too! ...Hehe, I love mimicking trainers and collecting rare Poké Dolls!',
      },
      // 8. Route 8 East Gatehouse (East)
      {
        type: 'gate',
        x: 3420,
        y: 430,
        w: 90,
        h: 86,
        label: 'Route 8 Gate',
      },
    ],
    fountains: [
      { x: 2400, y: 340, radius: 36, style: 'tech', label: 'Silph Holographic Quantum Matrix' },
    ],
    streetlamps: [
      { x: 1940, y: 250, style: 'modern' },
      { x: 2200, y: 250, style: 'modern' },
      { x: 2600, y: 250, style: 'modern' },
      { x: 2900, y: 250, style: 'modern' },
      { x: 2360, y: 350, style: 'modern' },
      { x: 2360, y: 550, style: 'modern' },
      { x: 1940, y: 700, style: 'modern' },
      { x: 2200, y: 700, style: 'modern' },
      { x: 2700, y: 700, style: 'modern' },
      { x: 3360, y: 440, style: 'modern' },
    ],
    benches: [
      { x: 2320, y: 430 },
      { x: 2460, y: 430 },
      { x: 2700, y: 250 },
      { x: 2000, y: 700 },
    ],
    fences: [
      { x: 40, y: 448, w: 200, h: 16 },
      { x: 480, y: 218, w: 260, h: 16 },
      // Saffron modern railings
      { x: 1960, y: 520, w: 110, h: 16 },
      { x: 2140, y: 520, w: 110, h: 16 },
      { x: 2760, y: 520, w: 110, h: 16 },
      { x: 1960, y: 690, w: 110, h: 16 },
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
      {
        id: 'r6_ball2',
        x: 1660,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r6_money2',
        x: 2360,
        y: 580,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1500,
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
      {
        id: 'r6_npc2',
        x: 1080,
        y: 240,
        avatar: 'Black Belt Mike',
        name: 'Black Belt Mike',
        dialogue: 'Karate chops and focus energy can smash through boulders, but Sabrina’s mind blasts require special defense!',
      },
      {
        id: 'r6_npc3',
        x: 1940,
        y: 280,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Saffron City! Keep security high around Silph Co. headquarters.',
      },
      {
        id: 'r6_npc4',
        x: 2360,
        y: 500,
        avatar: 'Scientist Ted',
        name: 'Scientist Ted',
        dialogue: 'The central fountain is equipped with magnetic levitation hydro-pumps engineered by Silph Co.!',
      },
      {
        id: 'r6_npc5',
        x: 2600,
        y: 600,
        avatar: 'Psychic Laura',
        name: 'Psychic Laura',
        dialogue: 'I sensed your arrival from three routes away! Telepathy is wonderful, isn’t it?',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 2 },
      },
      {
        id: 'r6_npc6',
        x: 2740,
        y: 280,
        avatar: 'Silph Worker Frank',
        name: 'Silph Worker Frank',
        dialogue: 'Working at Silph Co. is a dream come true! Take these extra funds for your journey across Kanto.',
        gift: { type: 'money', name: 'Poké Dollars', amount: 600 },
      },
    ],
    targetEncounters: 5,
    exitX: 3520,
  },

  // ==========================================================================
  // ROUTE 7: Sea Route 19/20 ➔ Cinnabar Island (Gym 7 - Blaine)
  // ==========================================================================
  {
    id: 7,
    name: 'Sea Route 19 & 20',
    locationLabel: 'Sea Route 19, 20 & Cinnabar Island',
    destinationLabel: 'Cinnabar Gym (Blaine)',
    worldWidth: 3500,
    worldHeight: 1080,
    theme: 'water',
    startX: 80,
    startY: 500,
    sections: [
      {
        id: 'r7_sec1',
        name: 'Sea Route 19 & 20 Trench',
        subtitle: 'Coral Shoals & Ocean Currents (Lv 26-32)',
        icon: '🌊',
        x: 0,
        y: 0,
        w: 1760,
        h: 1080,
      },
      {
        id: 'r7_sec2',
        name: 'Cinnabar Volcanic Isle',
        subtitle: 'The Fiery Volcanic Isle of Ancient Fossils & Magma Chambers',
        icon: '🌋',
        x: 1760,
        y: 0,
        w: 1740,
        h: 1080,
      },
    ],
    path: [
      { x: 40, y: 470, w: 1720, h: 80, style: 'dirt' },
      // North Volcano Reef
      { x: 500, y: 240, w: 1040, h: 64, style: 'dirt' },
      { x: 500, y: 240, w: 64, h: 240, style: 'dirt' },
      { x: 1480, y: 240, w: 64, h: 240, style: 'dirt' },
      // South Deep Trench
      { x: 780, y: 740, w: 1080, h: 64, style: 'dirt' },
      { x: 780, y: 540, w: 64, h: 210, style: 'dirt' },
      { x: 1800, y: 540, w: 64, h: 210, style: 'dirt' },
      // Cinnabar Island Wharf Entry
      { x: 1700, y: 440, w: 80, h: 80, style: 'dirt' },
      // Cinnabar Volcanic Basalt & Obsidian Sand Network
      // Ferry Arrival Wharf Lane
      { x: 1840, y: 560, w: 72, h: 200, style: 'cobble' },
      // Southern Coastline Ash Highway
      { x: 1840, y: 560, w: 1300, h: 64, style: 'cobble' },
      // Northern Fossil Research Clifftop Avenue
      { x: 1900, y: 170, w: 800, h: 64, style: 'cobble' },
      // Central Volcanic Caldera Avenue
      { x: 2320, y: 170, w: 72, h: 460, style: 'cobble' },
      // South-East Magma Gym Chasm Approach
      { x: 2840, y: 400, w: 64, h: 220, style: 'cobble' },
      { x: 2840, y: 400, w: 380, h: 64, style: 'cobble' },
      // North-East Route 21 Gate Approach
      { x: 2900, y: 170, w: 480, h: 64, style: 'cobble' },
    ],
    ponds: [
      // Boundless Southern Ocean Shoreline
      {
        x: 1760,
        y: 760,
        w: 1600,
        h: 320,
        pier: { x: 1840, y: 680, w: 120, h: 100 },
      },
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
      // 1. Pokémon Center (South-West Ferry Arrival Wharf)
      {
        type: 'center',
        x: 1880,
        y: 460,
        w: 96,
        h: 76,
        label: 'Pokémon Center',
      },
      // 2. Pokémon Fossil Research Laboratory (North-West Volcanic Cliff)
      {
        type: 'lab',
        x: 1940,
        y: 70,
        w: 130,
        h: 100,
        label: 'Fossil Research Lab',
        occupant: 'Dr. Fuji',
        dialogue: 'Our DNA extraction machines can bring ancient Helix and Dome fossils back to life! Cinnabar’s geothermal energy powers all our instruments.',
      },
      // 3. Volcanic Trading Post Poké Mart (Central Caldera Terrace)
      {
        type: 'mart',
        x: 2200,
        y: 350,
        w: 88,
        h: 74,
        label: 'Poké Mart',
      },
      // 4. Blaine's Volcano Gym (Carved Deep into South-East Basalt Crag)
      {
        type: 'gym',
        x: 2980,
        y: 440,
        w: 120,
        h: 96,
        label: 'Cinnabar Gym (Blaine)',
        gymIndex: 6,
      },
      // 5. Burned Mansion Ruins (North-East)
      {
        type: 'house',
        x: 2740,
        y: 70,
        w: 96,
        h: 80,
        label: 'Burned Mansion',
        roofStyle: 'slate',
        wallColor: '#334155',
        chimney: true,
        occupant: 'Diary of Mew',
        dialogue: 'A tattered journal lies on the burnt desk: "July 5. Deep in the jungle, we discovered a new Pokémon... We christened the newly discovered Pokémon Mew."',
      },
      // 6. Volcanology Villa (South-Central)
      {
        type: 'house',
        x: 2460,
        y: 550,
        w: 86,
        h: 74,
        label: 'Volcanology Villa',
        roofStyle: 'terracotta',
        wallColor: '#fed7aa',
        chimney: true,
        occupant: 'Dr. Volcan',
        dialogue: 'The volcano beneath Cinnabar Island is active! Blaine constructed his Gym inside a natural magma chamber—his Fire Pokémon are searing hot!',
      },
      // 7. Route 21 Sea Route Gatehouse (North-East)
      {
        type: 'gate',
        x: 3340,
        y: 160,
        w: 90,
        h: 86,
        label: 'Route 21 Gate',
      },
    ],
    fountains: [
      { x: 2460, y: 380, radius: 36, style: 'fumarole', label: 'Active Volcanic Fumarole' },
    ],
    streetlamps: [
      { x: 1900, y: 240, style: 'lantern' },
      { x: 2260, y: 240, style: 'lantern' },
      { x: 2600, y: 240, style: 'lantern' },
      { x: 2320, y: 350, style: 'lantern' },
      { x: 2320, y: 550, style: 'lantern' },
      { x: 1840, y: 640, style: 'lantern' },
      { x: 2100, y: 640, style: 'lantern' },
      { x: 2700, y: 640, style: 'lantern' },
      { x: 2940, y: 520, style: 'lantern' },
      { x: 3280, y: 170, style: 'lantern' },
    ],
    benches: [
      { x: 2380, y: 400 },
      { x: 2540, y: 400 },
      { x: 1960, y: 540 },
    ],
    fences: [
      { x: 40, y: 458, w: 200, h: 16 },
      { x: 500, y: 228, w: 260, h: 16 },
      // Cinnabar volcanic rock & iron fences
      { x: 1920, y: 520, w: 110, h: 16 },
      { x: 2100, y: 520, w: 110, h: 16 },
      { x: 2700, y: 520, w: 110, h: 16 },
      { x: 2260, y: 625, w: 140, h: 16 },
      { x: 2490, y: 625, w: 110, h: 16 },
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
      {
        id: 'r7_ball2',
        x: 1720,
        y: 190,
        name: 'Ultra Ball',
        type: 'ball',
        amount: 2,
        collected: false,
      },
      {
        id: 'r7_money2',
        x: 2320,
        y: 580,
        name: 'Poké Dollars',
        type: 'money',
        amount: 1800,
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
      {
        id: 'r7_npc2',
        x: 1100,
        y: 240,
        avatar: 'Swimmer Tara',
        name: 'Swimmer Tara',
        dialogue: 'The deep volcanic trenches harbor wild Dratini and Lapras! Be sure you have high-grade Poké Balls equipped.',
      },
      {
        id: 'r7_npc3',
        x: 1900,
        y: 285,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to Cinnabar Island! Be cautious near the geothermal vents—the steam is scalding.',
      },
      {
        id: 'r7_npc4',
        x: 2320,
        y: 505,
        avatar: 'Hiker Craig',
        name: 'Hiker Craig',
        dialogue: 'The water in this caldera pool is heated by natural underground magma plumes! It soothes tired muscles instantly.',
      },
      {
        id: 'r7_npc5',
        x: 2540,
        y: 610,
        avatar: 'Lass Maya',
        name: 'Lass Maya',
        dialogue: 'I found rare volcanic sea glass on the beach! Here, take some berries to heal your Pokémon.',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 3 },
      },
      {
        id: 'r7_npc6',
        x: 2680,
        y: 285,
        avatar: 'Super Nerd Erik',
        name: 'Super Nerd Erik',
        dialogue: 'Blaine loves riddles and fire quizzes! Test your knowledge before challenging his Gym.',
      },
    ],
    targetEncounters: 5,
    exitX: 3420,
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
    sections: [
      {
        id: 'r8_sec1',
        name: 'Victory Road Summit',
        subtitle: 'Rugged Ascent & Cave Caverns (Lv 34-44)',
        icon: '⚔️',
        x: 0,
        y: 0,
        w: 1840,
        h: 1100,
      },
      {
        id: 'r8_sec2',
        name: 'Indigo Plateau',
        subtitle: 'The Imperial Citadel of Kanto Champions & Final Arena',
        icon: '👑',
        x: 1840,
        y: 0,
        w: 1760,
        h: 1100,
      },
    ],
    ponds: [
      // Twin Imperial Reflecting Pools flanking the grand processional plaza
      { x: 2020, y: 540, w: 260, h: 140 },
      { x: 2570, y: 540, w: 260, h: 140 },
    ],
    path: [
      { x: 40, y: 480, w: 1800, h: 80, style: 'dirt' },
      // North Summit of Champions
      { x: 520, y: 240, w: 1080, h: 64, style: 'dirt' },
      { x: 520, y: 240, w: 64, h: 250, style: 'dirt' },
      { x: 1540, y: 240, w: 64, h: 250, style: 'dirt' },
      // South Cavern Abyss
      { x: 820, y: 760, w: 1120, h: 64, style: 'dirt' },
      { x: 820, y: 550, w: 64, h: 220, style: 'dirt' },
      { x: 1880, y: 550, w: 64, h: 220, style: 'dirt' },
      // Indigo Grand Gateway Approach
      { x: 1780, y: 480, w: 100, h: 80, style: 'dirt' },

      // Indigo Imperial Acropolis - Grand Marble Avenue Network
      // Central North-South Champions Walk
      { x: 2360, y: 150, w: 90, h: 750, style: 'paved' },
      // Grand Forecourt Victory Plaza
      { x: 2240, y: 430, w: 330, h: 180, style: 'paved' },
      // West Entrance Approach
      { x: 1840, y: 480, w: 520, h: 80, style: 'paved' },
      // West Wing Medical & Lore Promenade
      { x: 1950, y: 290, w: 450, h: 70, style: 'paved' },
      { x: 1950, y: 720, w: 450, h: 64, style: 'paved' },
      // East Wing Champions Arsenal Promenade
      { x: 2410, y: 290, w: 480, h: 70, style: 'paved' },
      { x: 2410, y: 720, w: 480, h: 64, style: 'paved' },
      // Apex Colosseum Terrace (Giovanni's Summit Arena)
      { x: 2160, y: 150, w: 490, h: 80, style: 'paved' },
      // East Grand Avenue to Plateau Gate
      { x: 2570, y: 480, w: 920, h: 80, style: 'paved' },
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
      // Apex Summit: Viridian Final Gym (Giovanni's Colosseum Arena)
      {
        type: 'gym',
        x: 2340,
        y: 55,
        w: 130,
        h: 95,
        label: 'Viridian Gym (Giovanni)',
        gymIndex: 7,
      },
      // West Wing: League Medical Recovery Center
      {
        type: 'center',
        x: 1980,
        y: 210,
        w: 100,
        h: 80,
        label: 'League Recovery Center',
      },
      // East Wing: Champions Poké Mart Arsenal
      {
        type: 'mart',
        x: 2790,
        y: 210,
        w: 90,
        h: 76,
        label: 'Champions Poké Mart',
      },
      // West Wing Upper Manor: Lorelei's Elite Council
      {
        type: 'house',
        x: 1980,
        y: 640,
        w: 94,
        h: 76,
        label: 'Elite Council Manor',
        roofStyle: 'emerald',
        wallColor: '#fdf4ff',
        chimney: true,
        occupant: 'Lorelei of Elite Four',
        dialogue: 'Beyond Giovanni’s arena lies the Indigo Plateau Championship! Ice, Fighting, Ghost, and Dragon masters await those who claim all eight badges.',
      },
      // West Wing Lower Pavilion: Hall of Fame Archive
      {
        type: 'house',
        x: 2180,
        y: 780,
        w: 92,
        h: 74,
        label: 'Hall of Fame Archive',
        roofStyle: 'slate',
        wallColor: '#f1f5f9',
        chimney: true,
        occupant: 'League Archivist Scott',
        dialogue: 'Every great trainer begins in Pallet Town with a single partner. Today, your name is inscribed in the historic Kanto Hall of Fame ledger!',
      },
      // East Wing Upper Pavilion: Lance's Dragon Sanctum
      {
        type: 'house',
        x: 2790,
        y: 640,
        w: 94,
        h: 76,
        label: "Lance's Dragon Pavilion",
        roofStyle: 'azure',
        wallColor: '#f8fafc',
        chimney: true,
        occupant: 'Dragon Master Lance',
        dialogue: 'You have scaled Victory Road and proven your valor across Kanto! Only true champions who share unbreakable bonds with their Pokémon stand here.',
      },
      // East Wing Lower Pavilion: Champion Blue's Quarters
      {
        type: 'house',
        x: 2590,
        y: 780,
        w: 92,
        h: 74,
        label: 'Champion Sanctuary',
        roofStyle: 'terracotta',
        wallColor: '#fef3c7',
        chimney: true,
        occupant: 'Veteran Blue',
        dialogue: 'Giovanni commands the ultimate Ground and Rock juggernauts. Bring your strongest, most balanced team to this final battle!',
      },
      // East Gate: Indigo Plateau Gate
      {
        type: 'gate',
        x: 3420,
        y: 475,
        w: 100,
        h: 90,
        label: 'Indigo Plateau Gate',
      },
    ],
    fountains: [
      { x: 2405, y: 520, radius: 42, style: 'marble', label: 'Victory Flame & Imperial Fountain' },
    ],
    streetlamps: [
      { x: 1980, y: 310, style: 'ornate' },
      { x: 2180, y: 310, style: 'ornate' },
      { x: 2620, y: 310, style: 'ornate' },
      { x: 2820, y: 310, style: 'ornate' },
      { x: 2330, y: 460, style: 'ornate' },
      { x: 2480, y: 460, style: 'ornate' },
      { x: 2330, y: 580, style: 'ornate' },
      { x: 2480, y: 580, style: 'ornate' },
      { x: 2280, y: 170, style: 'ornate' },
      { x: 2530, y: 170, style: 'ornate' },
      { x: 3050, y: 500, style: 'ornate' },
      { x: 3350, y: 500, style: 'ornate' },
    ],
    benches: [
      { x: 2350, y: 450 },
      { x: 2460, y: 450 },
      { x: 2150, y: 520 },
      { x: 2660, y: 520 },
    ],
    fences: [
      { x: 40, y: 468, w: 200, h: 16 },
      { x: 520, y: 228, w: 260, h: 16 },
      // Indigo golden wrought iron fences
      { x: 1980, y: 620, w: 100, h: 16 },
      { x: 2790, y: 620, w: 100, h: 16 },
      { x: 2180, y: 760, w: 100, h: 16 },
      { x: 2590, y: 760, w: 100, h: 16 },
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
      {
        id: 'r8_ball2',
        x: 1780,
        y: 190,
        name: 'Master Ball',
        type: 'ball',
        amount: 1,
        collected: false,
      },
      {
        id: 'r8_money2',
        x: 2420,
        y: 600,
        name: 'Poké Dollars',
        type: 'money',
        amount: 2500,
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
      {
        id: 'r8_npc2',
        x: 1120,
        y: 240,
        avatar: 'Cooltrainer Mary',
        name: 'Cooltrainer Mary',
        dialogue: 'Victory Road separates true champions from the rest. Keep your team healed and focused!',
      },
      {
        id: 'r8_npc3',
        x: 2000,
        y: 280,
        avatar: 'Officer Jenny',
        name: 'Officer Jenny',
        dialogue: 'Welcome to the Indigo Plateau Citadel! The Kanto Pokémon League headquarters awaits the greatest trainers in the land.',
      },
      {
        id: 'r8_npc4',
        x: 2420,
        y: 510,
        avatar: 'League Clerk Ronald',
        name: 'League Clerk Ronald',
        dialogue: 'The Victory Fountain streams water touched by the blessings of legendary Pokémon. Best of luck in the Final Gym!',
      },
      {
        id: 'r8_npc5',
        x: 2680,
        y: 620,
        avatar: 'Black Belt Bruno',
        name: 'Black Belt Bruno',
        dialogue: 'True power comes from boundless physical and spiritual discipline! Giovanni will test every ounce of your resolve.',
        gift: { type: 'berry', name: 'Sitrus Berry', amount: 3 },
      },
      {
        id: 'r8_npc6',
        x: 2800,
        y: 280,
        avatar: 'Ace Trainer Jennifer',
        name: 'Ace Trainer Jennifer',
        dialogue: 'All eight badges are required to enter the Hall of Fame. You are one battle away from history!',
      },
    ],
    targetEncounters: 5,
    exitX: 3520,
  },
];
