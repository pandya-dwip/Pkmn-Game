/**
 * EncounterSystem.ts
 * Manages Wild Encounters, Poké Ball Capture Mechanics,
 * and 5 Post-Gym Journey Interactions.
 */

import { POKEMON_SPECIES_MAP, calculateBaseStatTotal } from '../data/pokemon';
import { MOVES_DATA, TYPE_MOVE_MAP } from '../data/moves';
import { ECONOMY } from '../config/economy';

export interface EncounterMon {
  uid: string;
  id: number;
  name: string;
  lv: number;
  hp: number;
  maxHp: number;
  typesShort: string[];
  moves: string[];
  iv: number;
  catchRateBase: number;
}

export interface InteractionEvent {
  type: 'encounter' | 'rare_encounter' | 'friendly' | 'wild_battle' | 'discovery' | 'escape';
  title: string;
  description: string;
  mon?: EncounterMon;
  reward?: {
    type: 'berry' | 'ball' | 'money' | 'revive';
    name: string;
    amount: number;
  };
}

// Route pools by Gym level
export const ROUTE_POOLS: Record<number, number[]> = {
  // Before Gym 1 (Pewter - Lv 3-5)
  0: [16, 19, 10, 13, 21, 29, 32, 25, 39], // Pidgey, Rattata, Caterpie, Weedle, Spearow, Nidoran-F, Nidoran-M, Pikachu, Jigglypuff
  // Between Gym 1 & 2 (Cerulean - Lv 10-15)
  1: [17, 20, 23, 27, 43, 69, 54, 74, 120, 60], // Pidgeotto, Raticate, Ekans, Sandshrew, Oddish, Bellsprout, Psyduck, Geodude, Staryu, Poliwag
  // Between Gym 2 & 3 (Vermilion - Lv 15-20)
  2: [52, 56, 81, 100, 96, 92, 50, 46, 79], // Meowth, Mankey, Magnemite, Voltorb, Drowzee, Gastly, Diglett, Paras, Slowpoke
  // Between Gym 3 & 4 (Celadon - Lv 20-26)
  3: [58, 37, 77, 88, 109, 114, 102, 84, 128], // Growlithe, Vulpix, Ponyta, Grimer, Koffing, Tangela, Exeggcute, Doduo, Tauros
  // Between Gym 4 & 5 (Fuchsia - Lv 26-32)
  4: [83, 85, 48, 111, 118, 116, 98, 127, 123], // Farfetch'd, Dodrio, Venonat, Rhyhorn, Goldeen, Horsea, Krabby, Pinsir, Scyther
  // Between Gym 5 & 6 (Saffron - Lv 32-38)
  5: [64, 93, 82, 101, 108, 115, 122, 124, 137], // Kadabra, Haunter, Magneton, Electrode, Lickitung, Kangaskhan, Mr. Mime, Jynx, Porygon
  // Between Gym 6 & 7 (Cinnabar - Lv 38-44)
  6: [78, 59, 126, 125, 131, 138, 140, 142, 143], // Rapidash, Arcanine, Magmar, Electabuzz, Lapras, Omanyte, Kabuto, Aerodactyl, Snorlax
  // Between Gym 7 & 8 (Viridian - Lv 44-50)
  7: [147, 148, 149, 130, 112, 76, 68, 65, 94], // Dratini, Dragonair, Dragonite, Gyarados, Rhydon, Golem, Machamp, Alakazam, Gengar
};

// Rare encounter candidates
export const RARE_POKEMON_IDS = [25, 35, 37, 63, 115, 123, 127, 131, 133, 137, 143, 147];

let UID_COUNTER = 0;
export const createInstanceUid = () => 'p' + Date.now().toString(36) + (UID_COUNTER++).toString(36);

export function generateEncounterMon(gymIndex: number, isRare: boolean = false): EncounterMon {
  const pool = isRare ? RARE_POKEMON_IDS : (ROUTE_POOLS[gymIndex] || ROUTE_POOLS[0]);
  const id = pool[Math.floor(Math.random() * pool.length)] || 16;
  const spec = POKEMON_SPECIES_MAP[id] || POKEMON_SPECIES_MAP[16];

  const baseLv = gymIndex === 0 ? 3 : Math.min(50, 8 + gymIndex * 5);
  const lvVariance = gymIndex === 0 ? 2 : 3;
  const lv = Math.max(3, baseLv + Math.floor(Math.random() * (lvVariance * 2 + 1)) - lvVariance);
  const iv = Math.floor(Math.random() * 16);

  // HP calculation
  const maxHp = Math.floor(((2 * spec.baseHP + iv) * lv) / 100) + lv + 10;

  // Move selection
  const candidateMoves: string[] = [];
  for (const t of [...spec.typesShort, 'No']) {
    const list = TYPE_MOVE_MAP[t as keyof typeof TYPE_MOVE_MAP] || [];
    for (const name of list) {
      if (!candidateMoves.includes(name)) candidateMoves.push(name);
    }
  }
  const moves = candidateMoves
    .map(n => MOVES_DATA[n])
    .filter(m => m && m.unlockLevel <= lv)
    .sort((a, b) => b.power - a.power)
    .slice(0, 4)
    .map(m => m.name);

  // Catch rate estimation from base stat total
  const bst = calculateBaseStatTotal(spec);
  const catchRateBase = Math.max(30, Math.min(255, Math.floor(350 - bst * 0.5)));

  return {
    uid: createInstanceUid(),
    id,
    name: spec.name,
    lv,
    hp: maxHp,
    maxHp,
    typesShort: spec.typesShort,
    moves: moves.length ? moves : ['Tackle'],
    iv,
    catchRateBase,
  };
}

/**
 * Calculates capture success percentage
 * Factor in: catchRateBase, current HP / max HP ratio, Poké Ball bonus
 */
export function calculateCatchSuccess(
  mon: { id: number; hp: number; maxHp?: number; catchRateBase?: number },
  ballMultiplier: number = 1.0
): { success: boolean; shakeCount: number } {
  const spec = POKEMON_SPECIES_MAP[mon.id];
  const bst = spec ? calculateBaseStatTotal(spec) : 300;
  const catchRateBase = mon.catchRateBase ?? Math.max(30, Math.min(255, Math.floor(350 - bst * 0.5)));
  const maxHp = mon.maxHp || (mon.hp ? Math.max(mon.hp, 20) : 20);
  const hpRatio = Math.max(0.05, mon.hp / maxHp);
  // Base catch probability: 0 to 1, amplified by ball multiplier (Poké: 1.0x, Great: 1.5x, Ultra: 2.0x)
  const modifiedRate = (catchRateBase / 255) * (1.6 - hpRatio * 0.8) * ballMultiplier;
  // Never 100% guaranteed (cap at 95%) to preserve suspense
  const finalProb = Math.min(0.95, Math.max(0.15, modifiedRate));

  const roll = Math.random();
  if (roll < finalProb) {
    return { success: true, shakeCount: 3 };
  } else {
    // If failed, determine how close it was (1, 2, or 3 shakes before break)
    const ratio = roll / finalProb;
    const shakeCount = ratio < 1.3 ? 2 : ratio < 2.0 ? 1 : 0;
    return { success: false, shakeCount };
  }
}

/**
 * Generates one of the 5 Post-Gym Interactions
 */
export function generatePostGymInteraction(gymIndex: number, eventNumber: number): InteractionEvent {
  // Rotate types so each set of 5 has great variety:
  // Event 1: Wild Encounter
  // Event 2: Friendly Pokémon (reward)
  // Event 3: Wild Pokémon Battle Challenge
  // Event 4: Rare Pokémon Encounter
  // Event 5: Discovery / Escape
  const roll = (eventNumber - 1) % 5;

  if (roll === 0) {
    const mon = generateEncounterMon(gymIndex, false);
    return {
      type: 'encounter',
      title: 'Wild Pokémon Sighting!',
      description: `A wild ${mon.name.toUpperCase()} (Lv.${mon.lv}) emerged from the tall grass!`,
      mon,
    };
  }

  if (roll === 1) {
    const rewardsList: InteractionEvent['reward'][] = [
      { type: 'berry', name: 'Sitrus Berry 🫐', amount: 1 },
      { type: 'berry', name: 'Oran Berry 🍓', amount: 2 },
      { type: 'money', name: 'Poké Dollars', amount: 250 + gymIndex * 50 },
      { type: 'ball', name: 'Poké Ball ⚾', amount: 2 },
    ];
    const reward = rewardsList[Math.floor(Math.random() * rewardsList.length)];
    const friendlyMon = generateEncounterMon(gymIndex, false);
    return {
      type: 'friendly',
      title: 'A Curious Pokémon Approaches!',
      description: `A friendly wild ${friendlyMon.name.toUpperCase()} wandered up to you. It seems fond of your presence and handed you a gift!`,
      reward,
    };
  }

  if (roll === 2) {
    const mon = generateEncounterMon(gymIndex, false);
    return {
      type: 'wild_battle',
      title: 'Wild Challenger!',
      description: `An aggressive wild ${mon.name.toUpperCase()} (Lv.${mon.lv}) leaped forward to test your skills!`,
      mon,
    };
  }

  if (roll === 3) {
    const mon = generateEncounterMon(gymIndex, true);
    return {
      type: 'rare_encounter',
      title: 'Rare Pokémon Sighted!',
      description: `Rustling branches reveal a very rare ${mon.name.toUpperCase()} (Lv.${mon.lv})! This is an extraordinary chance to expand your team!`,
      mon,
    };
  }

  // roll === 4: Discovery or Escape
  const isDiscovery = Math.random() < 0.6;
  if (isDiscovery) {
    const moneyAmount = 300 + gymIndex * 60;
    return {
      type: 'discovery',
      title: 'Hidden Item Discovered!',
      description: `While hiking along the route, you noticed something gleaming beneath a rock! You found ₽${moneyAmount}!`,
      reward: { type: 'money', name: 'Poké Dollars', amount: moneyAmount },
    };
  } else {
    const mon = generateEncounterMon(gymIndex, false);
    return {
      type: 'escape',
      title: 'A Quick Rustle in the Bushes...',
      description: `A wild ${mon.name.toUpperCase()} noticed you approaching and darted into the dense canopy! Before fleeing, it dropped an Oran Berry!`,
      reward: { type: 'berry', name: 'Oran Berry 🍓', amount: 1 },
    };
  }
}
