import { MoveData, MoveAnimationType, TypeShort, PokemonType } from '../types';
import { TYPE_NAMES } from './types';

// Exact Move Icon mapping
export const MOVE_ICONS: Record<TypeShort, string> = {
  No: '💥',
  Fi: '🔥',
  Wa: '💧',
  El: '⚡',
  Gr: '🌿',
  Ic: '❄️',
  Fg: '🥊',
  Po: '☠️',
  Gd: '🪨',
  Fl: '🌪️',
  Ps: '🔮',
  Bu: '🦗',
  Ro: '💎',
  Gh: '👻',
  Dr: '🐲',
};

// Comprehensive Move Names by Type
export const TYPE_MOVE_MAP: Record<TypeShort, string[]> = {
  No: ['Tackle', 'Quick Attack', 'Body Slam', 'Hyper Beam', 'Scratch', 'Headbutt', 'Double Slap', 'Pound', 'Skull Bash', 'Growl', 'Tail Whip', 'Leer', 'Screech', 'Swords Dance', 'Recover', 'Bite', 'Sand Attack'],
  Fi: ['Ember', 'Fire Fang', 'Flamethrower', 'Fire Blast', 'Fire Spin', 'Heat Wave', 'Will-O-Wisp'],
  Wa: ['Water Gun', 'Bubble Beam', 'Surf', 'Hydro Pump', 'Bubble', 'Aqua Jet', 'Water Pulse'],
  Gr: ['Vine Whip', 'Razor Leaf', 'Giga Drain', 'Solar Beam', 'Leaf Blade', 'Energy Ball', 'Petal Dance', 'Bullet Seed', 'Sleep Powder', 'Stun Spore', 'Poison Powder'],
  El: ['Thunder Shock', 'Spark', 'Thunderbolt', 'Thunder', 'Electro Ball', 'Discharge'],
  Ic: ['Powder Snow', 'Ice Shard', 'Ice Beam', 'Blizzard', 'Icicle Spear', 'Ice Punch'],
  Fg: ['Karate Chop', 'Low Kick', 'Cross Chop', 'Dynamic Punch', 'Brick Break', 'Close Combat', 'Double Kick', 'Submission', 'Aura Sphere'],
  Po: ['Poison Sting', 'Acid', 'Sludge', 'Sludge Bomb', 'Poison Jab', 'Toxic'],
  Gd: ['Mud Slap', 'Mud Shot', 'Bulldoze', 'Dig', 'Earthquake', 'Earth Power', 'Sand Attack'],
  Fl: ['Gust', 'Peck', 'Wing Attack', 'Aerial Ace', 'Sky Attack', 'Air Slash', 'Hurricane', 'Fly'],
  Ps: ['Confusion', 'Psybeam', 'Psychic', 'Future Sight', 'Psyshock', 'Agility'],
  Bu: ['Bug Bite', 'Pin Missile', 'X-Scissor', 'Megahorn', 'Signal Beam', 'Fury Cutter', 'String Shot'],
  Ro: ['Rock Throw', 'Rock Tomb', 'Rock Slide', 'Stone Edge', 'Rock Blast'],
  Gh: ['Lick', 'Shadow Sneak', 'Shadow Ball', 'Hex', 'Night Shade', 'Shadow Punch'],
  Dr: ['Dragon Rage', 'Dragon Claw', 'Dragon Pulse', 'Dragon Breath', 'Outrage'],
};

// Move explicit definitions (power, accuracy, category, unlockLevel)
interface RawMoveDef {
  p: number;
  a: number;
  u: number;
  c: 'Physical' | 'Special' | 'Status';
  pr?: number;
}

const RAW_MOVE_DETAILS: Record<string, RawMoveDef> = {
  // Fire
  Ember: { p: 40, a: 100, u: 1, c: 'Special' },
  'Fire Fang': { p: 65, a: 95, u: 12, c: 'Physical' },
  Flamethrower: { p: 90, a: 100, u: 24, c: 'Special' },
  'Fire Blast': { p: 110, a: 85, u: 36, c: 'Special' },
  'Fire Spin': { p: 35, a: 85, u: 8, c: 'Special' },
  'Heat Wave': { p: 95, a: 90, u: 32, c: 'Special' },
  'Will-O-Wisp': { p: 0, a: 85, u: 16, c: 'Status' },

  // Water
  'Water Gun': { p: 40, a: 100, u: 1, c: 'Special' },
  Bubble: { p: 40, a: 100, u: 1, c: 'Special' },
  'Aqua Jet': { p: 40, a: 100, u: 10, c: 'Physical', pr: 1 },
  'Bubble Beam': { p: 65, a: 100, u: 14, c: 'Special' },
  'Water Pulse': { p: 60, a: 100, u: 18, c: 'Special' },
  Surf: { p: 90, a: 100, u: 28, c: 'Special' },
  'Hydro Pump': { p: 110, a: 85, u: 38, c: 'Special' },

  // Electric
  'Thunder Shock': { p: 40, a: 100, u: 1, c: 'Special' },
  Spark: { p: 65, a: 100, u: 12, c: 'Physical' },
  Thunderbolt: { p: 90, a: 100, u: 26, c: 'Special' },
  Thunder: { p: 110, a: 70, u: 38, c: 'Special' },
  'Electro Ball': { p: 60, a: 100, u: 16, c: 'Special' },
  Discharge: { p: 80, a: 100, u: 30, c: 'Special' },

  // Grass
  'Vine Whip': { p: 45, a: 100, u: 1, c: 'Physical' },
  'Razor Leaf': { p: 55, a: 95, u: 12, c: 'Physical' },
  'Bullet Seed': { p: 50, a: 100, u: 14, c: 'Physical' },
  'Giga Drain': { p: 75, a: 100, u: 22, c: 'Special' },
  'Leaf Blade': { p: 90, a: 100, u: 28, c: 'Physical' },
  'Energy Ball': { p: 90, a: 100, u: 30, c: 'Special' },
  'Petal Dance': { p: 120, a: 100, u: 36, c: 'Special' },
  'Solar Beam': { p: 120, a: 100, u: 40, c: 'Special' },
  'Sleep Powder': { p: 0, a: 75, u: 10, c: 'Status' },
  'Stun Spore': { p: 0, a: 75, u: 10, c: 'Status' },
  'Poison Powder': { p: 0, a: 75, u: 10, c: 'Status' },

  // Ice
  'Powder Snow': { p: 40, a: 100, u: 1, c: 'Special' },
  'Ice Shard': { p: 40, a: 100, u: 8, c: 'Physical', pr: 1 },
  'Icicle Spear': { p: 50, a: 100, u: 16, c: 'Physical' },
  'Ice Punch': { p: 75, a: 100, u: 20, c: 'Physical' },
  'Ice Beam': { p: 90, a: 100, u: 28, c: 'Special' },
  Blizzard: { p: 110, a: 70, u: 38, c: 'Special' },

  // Fighting
  'Karate Chop': { p: 50, a: 100, u: 1, c: 'Physical' },
  'Low Kick': { p: 50, a: 100, u: 6, c: 'Physical' },
  'Double Kick': { p: 60, a: 100, u: 12, c: 'Physical' },
  'Brick Break': { p: 75, a: 100, u: 22, c: 'Physical' },
  Submission: { p: 80, a: 80, u: 26, c: 'Physical' },
  'Cross Chop': { p: 100, a: 80, u: 34, c: 'Physical' },
  'Aura Sphere': { p: 80, a: 100, u: 32, c: 'Special' },
  'Close Combat': { p: 120, a: 100, u: 42, c: 'Physical' },
  'Dynamic Punch': { p: 100, a: 50, u: 36, c: 'Physical' },

  // Poison
  'Poison Sting': { p: 35, a: 100, u: 1, c: 'Physical' },
  Acid: { p: 40, a: 100, u: 8, c: 'Special' },
  Sludge: { p: 65, a: 100, u: 18, c: 'Special' },
  'Poison Jab': { p: 80, a: 100, u: 26, c: 'Physical' },
  'Sludge Bomb': { p: 90, a: 100, u: 32, c: 'Special' },
  Toxic: { p: 0, a: 90, u: 20, c: 'Status' },

  // Ground
  'Mud Slap': { p: 35, a: 100, u: 1, c: 'Special' },
  'Mud Shot': { p: 55, a: 95, u: 8, c: 'Special' },
  Bulldoze: { p: 60, a: 100, u: 14, c: 'Physical' },
  Dig: { p: 80, a: 100, u: 22, c: 'Physical' },
  'Earth Power': { p: 90, a: 100, u: 32, c: 'Special' },
  Earthquake: { p: 100, a: 100, u: 36, c: 'Physical' },

  // Flying
  Gust: { p: 40, a: 100, u: 1, c: 'Special' },
  'Wing Attack': { p: 60, a: 100, u: 10, c: 'Physical' },
  'Air Slash': { p: 75, a: 95, u: 24, c: 'Special' },
  'Aerial Ace': { p: 60, a: 100, u: 18, c: 'Physical' },
  Fly: { p: 90, a: 95, u: 30, c: 'Physical' },
  Hurricane: { p: 110, a: 70, u: 40, c: 'Special' },
  'Sky Attack': { p: 140, a: 90, u: 45, c: 'Physical' },

  // Psychic
  Confusion: { p: 50, a: 100, u: 1, c: 'Special' },
  Psybeam: { p: 65, a: 100, u: 14, c: 'Special' },
  Psyshock: { p: 80, a: 100, u: 24, c: 'Special' },
  Psychic: { p: 90, a: 100, u: 30, c: 'Special' },
  'Future Sight': { p: 120, a: 100, u: 40, c: 'Special' },
  Agility: { p: 0, a: 100, u: 15, c: 'Status' },

  // Bug
  'Bug Bite': { p: 60, a: 100, u: 1, c: 'Physical' },
  'Fury Cutter': { p: 40, a: 95, u: 8, c: 'Physical' },
  'Pin Missile': { p: 55, a: 95, u: 14, c: 'Physical' },
  'Signal Beam': { p: 75, a: 100, u: 24, c: 'Special' },
  'X-Scissor': { p: 80, a: 100, u: 30, c: 'Physical' },
  Megahorn: { p: 120, a: 85, u: 42, c: 'Physical' },
  'String Shot': { p: 0, a: 95, u: 1, c: 'Status' },

  // Rock
  'Rock Throw': { p: 50, a: 90, u: 1, c: 'Physical' },
  'Rock Tomb': { p: 60, a: 95, u: 12, c: 'Physical' },
  'Rock Blast': { p: 50, a: 90, u: 18, c: 'Physical' },
  'Rock Slide': { p: 75, a: 90, u: 26, c: 'Physical' },
  'Stone Edge': { p: 100, a: 80, u: 36, c: 'Physical' },

  // Ghost
  Lick: { p: 30, a: 100, u: 1, c: 'Physical' },
  'Shadow Sneak': { p: 40, a: 100, u: 8, c: 'Physical', pr: 1 },
  'Shadow Punch': { p: 60, a: 100, u: 16, c: 'Physical' },
  Hex: { p: 65, a: 100, u: 22, c: 'Special' },
  'Night Shade': { p: 70, a: 100, u: 26, c: 'Special' },
  'Shadow Ball': { p: 80, a: 100, u: 32, c: 'Special' },

  // Dragon
  'Dragon Rage': { p: 40, a: 100, u: 1, c: 'Special' },
  'Dragon Breath': { p: 60, a: 100, u: 14, c: 'Special' },
  'Dragon Claw': { p: 80, a: 100, u: 26, c: 'Physical' },
  'Dragon Pulse': { p: 85, a: 100, u: 32, c: 'Special' },
  Outrage: { p: 120, a: 100, u: 42, c: 'Physical' },

  // Normal
  Tackle: { p: 40, a: 100, u: 1, c: 'Physical' },
  Scratch: { p: 40, a: 100, u: 1, c: 'Physical' },
  Pound: { p: 40, a: 100, u: 1, c: 'Physical' },
  'Quick Attack': { p: 40, a: 100, u: 4, c: 'Physical', pr: 1 },
  'Double Slap': { p: 35, a: 85, u: 8, c: 'Physical' },
  Headbutt: { p: 70, a: 100, u: 16, c: 'Physical' },
  'Body Slam': { p: 85, a: 100, u: 24, c: 'Physical' },
  'Skull Bash': { p: 130, a: 100, u: 38, c: 'Physical' },
  'Hyper Beam': { p: 150, a: 90, u: 44, c: 'Special' },
  Growl: { p: 0, a: 100, u: 1, c: 'Status' },
  'Tail Whip': { p: 0, a: 100, u: 1, c: 'Status' },
  Leer: { p: 0, a: 100, u: 1, c: 'Status' },
  Screech: { p: 0, a: 85, u: 12, c: 'Status' },
  'Swords Dance': { p: 0, a: 100, u: 20, c: 'Status' },
  Recover: { p: 0, a: 100, u: 25, c: 'Status' },
  'Sand Attack': { p: 0, a: 100, u: 1, c: 'Status' },
  Peck: { p: 35, a: 100, u: 1, c: 'Physical' },
  Bite: { p: 60, a: 100, u: 10, c: 'Physical' },
};

// Build MOVES_DATA
export const MOVES_DATA: Record<string, MoveData> = {};

for (const t in TYPE_MOVE_MAP) {
  const typeShort = t as TypeShort;
  const fullType = TYPE_NAMES[typeShort] as PokemonType;
  const moveNames = TYPE_MOVE_MAP[typeShort];

  moveNames.forEach((n, i) => {
    const raw = RAW_MOVE_DETAILS[n] || {
      p: [40, 60, 85, 110, 35, 70][i % 6] || 60,
      a: 100,
      u: [1, 1, 14, 30, 1, 8][i % 6] || 1,
      c: 'FgPoGdFlBuRoGhNo'.includes(typeShort) ? ('Physical' as const) : ('Special' as const),
    };

    MOVES_DATA[n] = {
      id: n.toLowerCase().replace(/\s+/g, '_'),
      name: n,
      type: fullType,
      typeShort,
      power: raw.p,
      accuracy: raw.a,
      category: raw.c,
      priority: raw.pr || 0,
      animationType: 'SLAM' as MoveAnimationType,
      sound: raw.c === 'Physical' ? 'physical_hit' : 'special_hit',
      description: `${fullType} move with ${raw.p} base power and ${raw.a}% accuracy. Unlocked at Lv.${raw.u}.`,
      unlockLevel: raw.u,
    };
  });
}

/**
 * Bulletproof Move Lookup: Guarantees a valid MoveData object even if given
 * unmapped, lowercase, or missing move names, preventing any typeShort crashes.
 */
export function getMoveData(name: string): MoveData {
  if (name && MOVES_DATA[name]) return MOVES_DATA[name];
  if (name) {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key in MOVES_DATA) {
      if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
        return MOVES_DATA[key];
      }
    }
  }
  return {
    id: (name || 'tackle').toLowerCase().replace(/\s+/g, '_'),
    name: name || 'Tackle',
    type: 'Normal',
    typeShort: 'No',
    power: 40,
    accuracy: 100,
    category: 'Physical',
    priority: 0,
    animationType: 'SLAM' as MoveAnimationType,
    sound: 'physical_hit',
    description: 'A standard physical tackle attack.',
    unlockLevel: 1,
  };
}

export function getAvailableMoves(types: TypeShort[], level: number): MoveData[] {
  const moveNames = new Set<string>();
  const typesToCheck: TypeShort[] = [...types, 'No'];

  for (const t of typesToCheck) {
    const list = TYPE_MOVE_MAP[t] || [];
    for (const name of list) {
      if (!moveNames.has(name)) {
        moveNames.add(name);
      }
    }
  }

  return Array.from(moveNames)
    .map(name => MOVES_DATA[name])
    .filter((move): move is MoveData => move !== undefined && move.unlockLevel <= level)
    .sort((a, b) => b.power - a.power);
}
