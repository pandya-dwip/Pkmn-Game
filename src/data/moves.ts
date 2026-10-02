import { MoveData, MoveAnimationType, TypeShort, PokemonType } from '../types';
import { TYPE_NAMES } from './types';

// Exact Move Icon mapping from kanto-cup.html
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

// Exact move names by type from kanto-cup.html
export const TYPE_MOVE_MAP: Record<TypeShort, string[]> = {
  No: ['Tackle', 'Quick Attack', 'Body Slam', 'Hyper Beam', 'Scratch', 'Headbutt'],
  Fi: ['Ember', 'Fire Fang', 'Flamethrower', 'Fire Blast'],
  Wa: ['Water Gun', 'Bubble Beam', 'Surf', 'Hydro Pump'],
  Gr: ['Vine Whip', 'Razor Leaf', 'Giga Drain', 'Solar Beam'],
  El: ['Thunder Shock', 'Spark', 'Thunderbolt', 'Thunder'],
  Ic: ['Powder Snow', 'Ice Shard', 'Ice Beam', 'Blizzard'],
  Fg: ['Karate Chop', 'Low Kick', 'Cross Chop', 'Dynamic Punch'],
  Po: ['Poison Sting', 'Acid', 'Sludge', 'Sludge Bomb'],
  Gd: ['Mud Slap', 'Bulldoze', 'Dig', 'Earthquake'],
  Fl: ['Gust', 'Wing Attack', 'Aerial Ace', 'Sky Attack'],
  Ps: ['Confusion', 'Psybeam', 'Psychic', 'Future Sight'],
  Bu: ['Bug Bite', 'Pin Missile', 'X-Scissor', 'Megahorn'],
  Ro: ['Rock Throw', 'Rock Tomb', 'Rock Slide', 'Stone Edge'],
  Gh: ['Lick', 'Shadow Sneak', 'Shadow Ball', 'Hex'],
  Dr: ['Dragon Rage', 'Dragon Claw', 'Dragon Pulse', 'Outrage'],
};

// Animation type lookup for combat visual fx
const ANIMATION_MAP: Record<string, MoveAnimationType> = {
  Tackle: 'SLAM',
  'Quick Attack': 'QUICK_ATTACK',
  'Body Slam': 'SLAM',
  'Hyper Beam': 'BEAM',
  Scratch: 'SCRATCH',
  Headbutt: 'SLAM',
  Ember: 'EMBER',
  'Fire Fang': 'BITE',
  Flamethrower: 'FLAMETHROWER',
  'Fire Blast': 'FIRE_BLAST',
  'Water Gun': 'WATER_GUN',
  'Bubble Beam': 'WATER_GUN',
  Surf: 'HYDRO_PUMP',
  'Hydro Pump': 'HYDRO_PUMP',
  'Vine Whip': 'VINE_WHIP',
  'Razor Leaf': 'RAZOR_LEAF',
  'Giga Drain': 'RAZOR_LEAF',
  'Solar Beam': 'BEAM',
  'Thunder Shock': 'THUNDER_SHOCK',
  Spark: 'SPARK',
  Thunderbolt: 'THUNDERBOLT',
  Thunder: 'THUNDER',
  'Powder Snow': 'ICE_BEAM',
  'Ice Shard': 'ICE_BEAM',
  'Ice Beam': 'ICE_BEAM',
  Blizzard: 'ICE_BEAM',
  'Karate Chop': 'SLAM',
  'Low Kick': 'SLAM',
  'Cross Chop': 'SLAM',
  'Dynamic Punch': 'SLAM',
  'Poison Sting': 'VINE_WHIP',
  Acid: 'WATER_GUN',
  Sludge: 'WATER_GUN',
  'Sludge Bomb': 'ORB',
  'Mud Slap': 'ROCK_THROW',
  Bulldoze: 'EARTHQUAKE',
  Dig: 'EARTHQUAKE',
  Earthquake: 'EARTHQUAKE',
  Gust: 'GUST',
  'Wing Attack': 'QUICK_ATTACK',
  'Aerial Ace': 'QUICK_ATTACK',
  'Sky Attack': 'SLAM',
  Confusion: 'PSYCHIC',
  Psybeam: 'BEAM',
  Psychic: 'PSYCHIC',
  'Future Sight': 'PSYCHIC',
  'Bug Bite': 'BITE',
  'Pin Missile': 'RAZOR_LEAF',
  'X-Scissor': 'SCRATCH',
  Megahorn: 'SLAM',
  'Rock Throw': 'ROCK_THROW',
  'Rock Tomb': 'ROCK_THROW',
  'Rock Slide': 'ROCK_THROW',
  'Stone Edge': 'ROCK_THROW',
  Lick: 'BITE',
  'Shadow Sneak': 'QUICK_ATTACK',
  'Shadow Ball': 'SHADOW_BALL',
  Hex: 'PSYCHIC',
  'Dragon Rage': 'BEAM',
  'Dragon Claw': 'SCRATCH',
  'Dragon Pulse': 'BEAM',
  Outrage: 'SLAM',
};

// Build MOVES_DATA adhering strictly to kanto-cup.html tiers and rules:
// p:[40,60,85,110,35,70][i]
// a:[100,100,95,85,100,100][i]
// u:[1,1,14,30,1,8][i]
// c:'FgPoGdFlBuRoGhNo'.includes(t)?'Physical':'Special'
export const MOVES_DATA: Record<string, MoveData> = {};

for (const t in TYPE_MOVE_MAP) {
  const typeShort = t as TypeShort;
  const fullType = TYPE_NAMES[typeShort] as PokemonType;
  const moveNames = TYPE_MOVE_MAP[typeShort];

  moveNames.forEach((n, i) => {
    const power = [40, 60, 85, 110, 35, 70][i];
    const accuracy = [100, 100, 95, 85, 100, 100][i];
    const unlockLevel = [1, 1, 14, 30, 1, 8][i];
    const isPhysical = 'FgPoGdFlBuRoGhNo'.includes(typeShort);
    const priority = n === 'Quick Attack' || n === 'Shadow Sneak' ? 1 : 0;

    MOVES_DATA[n] = {
      id: n.toLowerCase().replace(/\s+/g, '_'),
      name: n,
      type: fullType,
      typeShort,
      power,
      accuracy,
      category: isPhysical ? 'Physical' : 'Special',
      priority,
      animationType: ANIMATION_MAP[n] || 'SLAM',
      sound: isPhysical ? 'physical_hit' : 'special_hit',
      description: `${fullType} move with ${power} base power and ${accuracy}% accuracy. Unlocked at Lv.${unlockLevel}.`,
      unlockLevel,
    };
  });
}

export function getAvailableMoves(types: TypeShort[], level: number): MoveData[] {
  const moveNames = new Set<string>();
  const typesToCheck: TypeShort[] = [...types, 'No'];

  for (const t of typesToCheck) {
    const list = TYPE_MOVE_MAP[t] || [];
    for (const name of list) {
      moveNames.add(name);
    }
  }

  return Array.from(moveNames)
    .map(name => MOVES_DATA[name])
    .filter(m => m && m.unlockLevel <= level)
    .sort((a, b) => b.power - a.power);
}
