/**
 * economy.ts
 * Centralized Economy Configuration for Pokémon: Kanto Cup
 * Balances shop prices, gym rewards, and encounter prize pools.
 */

export interface EconomyConfig {
  shop: {
    pokeball: number;
    healthBerry: number;
    sitrusBerry: number;
    fullHealBerry: number;
    revive: number;
    evolutionStone: number;
  };
  startingMoney: number;
  startingBalls: number;
  startingBerries: {
    oran: number;
    fullHeal: number;
    revive: number;
  };
  gymRewards: Record<number, number>;
  tournamentReward: number;
  interactionRewards: {
    minMoney: number;
    maxMoney: number;
  };
}

export const ECONOMY: EconomyConfig = {
  shop: {
    pokeball: 200,        // Standard Poké Ball for catching wild Pokémon
    healthBerry: 150,     // Oran Berry (restores 30% HP)
    sitrusBerry: 300,     // Sitrus Berry (restores 50% HP)
    fullHealBerry: 600,   // Full Heal Berry (restores 100% HP)
    revive: 500,          // Revive (restores fainted Pokémon to 50% HP)
    evolutionStone: 1500, // Evolution Stones (Fire, Water, Thunder, Leaf, Moon)
  },
  startingMoney: 1000,
  startingBalls: 5,
  startingBerries: {
    oran: 3,
    fullHeal: 2,
    revive: 2,
  },
  gymRewards: {
    0: 1500,  // Gym 1 (Pewter - Brock)
    1: 2200,  // Gym 2 (Cerulean - Misty)
    2: 3000,  // Gym 3 (Vermilion - Lt. Surge)
    3: 4000,  // Gym 4 (Celadon - Erika)
    4: 5500,  // Gym 5 (Fuchsia - Koga)
    5: 7000,  // Gym 6 (Saffron - Sabrina)
    6: 8500,  // Gym 7 (Cinnabar - Blaine)
    7: 10000, // Gym 8 (Viridian - Giovanni)
  },
  tournamentReward: 15000,
  interactionRewards: {
    minMoney: 150,
    maxMoney: 400,
  },
};
