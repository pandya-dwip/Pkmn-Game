/**
 * championship16.ts
 * 16-Player Kanto Championship Tournament Data & Simulation
 * Exactly 16 participants (Player + 15 distinct competitors)
 * Progression: Round of 16 -> Quarter Finals -> Semi Finals -> Final -> Champion
 */

export interface ChampionshipTrainer {
  id: number;
  name: string;
  title: string;
  avatar: string;
  style: string;
  seed: number;
  team: { id: number; lv: number }[];
  dialogue?: {
    intro: string;
    defeat: string;
  };
}

export interface ChampionshipMatch {
  trainerAId: number;
  trainerBId: number;
  winnerId: number;
  resolved: boolean;
}

export interface ChampionshipRound {
  name: string;
  shortName: string;
  matches: ChampionshipMatch[];
}

export interface Championship16State {
  trainers: ChampionshipTrainer[];
  currentRoundIndex: number; // 0: Ro16, 1: QF, 2: SF, 3: Final
  activeIds: number[];       // IDs of trainers still in the running
  history: ChampionshipMatch[][];
}

export const CHAMPIONSHIP_OPPONENTS: Omit<ChampionshipTrainer, 'id'>[] = [
  {
    name: 'Ace Trainer Jake',
    title: 'Balanced Prodigy',
    avatar: '⭐',
    style: 'Balanced Offensive',
    seed: 1.1,
    team: [
      { id: 18, lv: 48 },  // Pidgeot
      { id: 26, lv: 49 },  // Raichu
      { id: 130, lv: 51 }, // Gyarados
      { id: 65, lv: 52 },  // Alakazam
    ],
    dialogue: {
      intro: "I've travelled across every route in Kanto to qualify for this Championship. Let's see who prepared better!",
      defeat: "Incredible synergy with your team. You deserve this spot in the next round!",
    },
  },
  {
    name: 'Pyromaniac Flint',
    title: 'Blazing Striker',
    avatar: '🔥',
    style: 'Aggressive Fire',
    seed: 1.0,
    team: [
      { id: 126, lv: 49 }, // Magmar
      { id: 78, lv: 49 },  // Rapidash
      { id: 136, lv: 51 }, // Flareon
      { id: 6, lv: 53 },   // Charizard
    ],
    dialogue: {
      intro: "Can you feel the heat in this stadium? My flames will burn brighter than anything you've ever faced!",
      defeat: "My blazing passion wasn't enough to scorch your defense. What a battle!",
    },
  },
  {
    name: 'Sailor Marina',
    title: 'Deep Ocean Diver',
    avatar: '🌊',
    style: 'Bulky Water',
    seed: 0.95,
    team: [
      { id: 62, lv: 48 },  // Poliwrath
      { id: 73, lv: 50 },  // Tentacruel
      { id: 91, lv: 51 },  // Cloyster
      { id: 9, lv: 53 },   // Blastoise
    ],
    dialogue: {
      intro: "The ocean is vast and unforgiving. Prepare to be swept away by our tidal combinations!",
      defeat: "You weathered the storm like an experienced captain. Great match!",
    },
  },
  {
    name: 'Ninja Shadow Raven',
    title: 'Illusionist of Fuchsia',
    avatar: '🥷',
    style: 'Speed & Status',
    seed: 0.98,
    team: [
      { id: 24, lv: 49 },  // Arbok
      { id: 49, lv: 50 },  // Venomoth
      { id: 123, lv: 51 }, // Scyther
      { id: 94, lv: 53 },  // Gengar
    ],
    dialogue: {
      intro: "You won't even see the strikes coming. Step into the shadow web!",
      defeat: "You pierced through my deceptive illusions. Impressive focus!",
    },
  },
  {
    name: 'Black Belt Daisuke',
    title: 'Fighting Spirit Master',
    avatar: '🥋',
    style: 'Physical Force',
    seed: 1.05,
    team: [
      { id: 57, lv: 50 },  // Primeape
      { id: 106, lv: 51 }, // Hitmonlee
      { id: 107, lv: 51 }, // Hitmonchan
      { id: 68, lv: 54 },  // Machamp
    ],
    dialogue: {
      intro: "Ten thousand hours of discipline and hard punches! Test your willpower against pure fighting spirit!",
      defeat: "Your spirit was stronger than my fists today. Bow of respect to you!",
    },
  },
  {
    name: 'Scientist Edison',
    title: 'Electromagnetic Genius',
    avatar: '⚡',
    style: 'Technical Electric',
    seed: 1.0,
    team: [
      { id: 101, lv: 50 }, // Electrode
      { id: 82, lv: 51 },  // Magneton
      { id: 125, lv: 52 }, // Electabuzz
      { id: 135, lv: 54 }, // Jolteon
    ],
    dialogue: {
      intro: "According to my precise voltage calculations, your odds of victory are precisely 18.4%. Commencing test!",
      defeat: "An anomaly! My calculations couldn't predict the intensity of your Pokémon's heart!",
    },
  },
  {
    name: 'Botanist Flora',
    title: 'Greenhouse Whisperer',
    avatar: '🌿',
    style: 'Tactical Status Grass',
    seed: 0.92,
    team: [
      { id: 47, lv: 50 },  // Parasect
      { id: 71, lv: 51 },  // Victreebel
      { id: 103, lv: 52 }, // Exeggutor
      { id: 3, lv: 54 },   // Venusaur
    ],
    dialogue: {
      intro: "The sweet scent of flowers conceals dangerous thorns. Let nature guide this clash!",
      defeat: "The sun shines upon your victorious team. May your roots continue to grow!",
    },
  },
  {
    name: 'Psychic Soren',
    title: 'Telepathic Seer',
    avatar: '🔮',
    style: 'Special Psychic',
    seed: 1.15,
    team: [
      { id: 97, lv: 51 },  // Hypno
      { id: 64, lv: 51 },  // Kadabra
      { id: 124, lv: 53 }, // Jynx
      { id: 65, lv: 55 },  // Alakazam
    ],
    dialogue: {
      intro: "Your thoughts are an open book to my mind. Can you move faster than thought itself?",
      defeat: "Remarkable... You overwhelmed our psychic barrier with unyielding focus!",
    },
  },
  {
    name: 'Mountaineer Boulder',
    title: 'Apex Peak Climber',
    avatar: '⛰️',
    style: 'Defensive Ground',
    seed: 0.96,
    team: [
      { id: 28, lv: 50 },  // Sandslash
      { id: 105, lv: 52 }, // Marowak
      { id: 76, lv: 53 },  // Golem
      { id: 112, lv: 55 }, // Rhydon
    ],
    dialogue: {
      intro: "We climb the highest cliffs in Mt. Moon! No ordinary attack can shake our solid defense!",
      defeat: "You brought down a mountain today! Take that strength straight to the top!",
    },
  },
  {
    name: 'Veteran Marcus',
    title: 'Battle-Tested Champion',
    avatar: '🎖️',
    style: 'Versatile Veteran',
    seed: 1.2,
    team: [
      { id: 143, lv: 52 }, // Snorlax
      { id: 131, lv: 53 }, // Lapras
      { id: 115, lv: 53 }, // Kangaskhan
      { id: 149, lv: 56 }, // Dragonite
    ],
    dialogue: {
      intro: "I've fought in three previous Championships. You have talent, young trainer, but experience will be your teacher!",
      defeat: "Superb! The next generation of Kanto trainers is in very capable hands!",
    },
  },
  {
    name: 'Young Prodigy Leo',
    title: 'Lightning Swift Rookie',
    avatar: '⚡',
    style: 'Speed Attacker',
    seed: 1.08,
    team: [
      { id: 85, lv: 51 },  // Dodrio
      { id: 51, lv: 52 },  // Dugtrio
      { id: 135, lv: 53 }, // Jolteon
      { id: 94, lv: 55 },  // Gengar
    ],
    dialogue: {
      intro: "Speed is everything! You won't know what hit you before the ref calls the match!",
      defeat: "Whoa, you timed every counter perfectly! You really are something else!",
    },
  },
  {
    name: 'Dragon Tamer Drake',
    title: 'Dragon Clan Disciple',
    avatar: '🐲',
    style: 'Heavy Draconic',
    seed: 1.25,
    team: [
      { id: 142, lv: 53 }, // Aerodactyl
      { id: 130, lv: 54 }, // Gyarados
      { id: 99, lv: 54 },  // Kingler
      { id: 149, lv: 57 }, // Dragonite
    ],
    dialogue: {
      intro: "Dragons are mythical, supreme, and virtually invincible. Can your team stand against dragons?",
      defeat: "You tamed the tempest of my dragons! A truly worthy championship contender!",
    },
  },
  {
    name: 'Lass Emily',
    title: 'Enchanting Tactician',
    avatar: '🎀',
    style: 'Cute & Deadly',
    seed: 0.94,
    team: [
      { id: 36, lv: 51 },  // Clefable
      { id: 40, lv: 52 },  // Wigglytuff
      { id: 38, lv: 53 },  // Ninetales
      { id: 134, lv: 55 }, // Vaporeon
    ],
    dialogue: {
      intro: "Don't underestimate my cute team! They pack a punch that has surprised many veteran trainers!",
      defeat: "Aww, good game! You were totally in sync with your Pokémon!",
    },
  },
  {
    name: 'Bird Keeper Zephyr',
    title: 'Skies Sovereign',
    avatar: '🦅',
    style: 'High Aerial',
    seed: 1.02,
    team: [
      { id: 22, lv: 52 },  // Fearow
      { id: 42, lv: 53 },  // Golbat
      { id: 18, lv: 54 },  // Pidgeot
      { id: 142, lv: 56 }, // Aerodactyl
    ],
    dialogue: {
      intro: "We rule the open skies of Kanto! Try dodging attacks that dive down with the speed of wind!",
      defeat: "You grounded my flock with precision. Fly high in the remainder of the tournament!",
    },
  },
  {
    name: 'Rival Blue',
    title: 'The Eternal Rival',
    avatar: '👑',
    style: 'Supreme All-Rounder',
    seed: 1.4,
    team: [
      { id: 18, lv: 54 },  // Pidgeot
      { id: 65, lv: 55 },  // Alakazam
      { id: 112, lv: 55 }, // Rhydon
      { id: 103, lv: 56 }, // Exeggutor
      { id: 130, lv: 57 }, // Gyarados
      { id: 6, lv: 58 },   // Charizard / Ace
    ],
    dialogue: {
      intro: "Well, well! You finally made it all the way here! I've been waiting for this showdown. Let's see who is truly the greatest Pokémon Trainer in Kanto!",
      defeat: "What?! Unbelievable... You really out-battled me. Go claim your title, Champion!",
    },
  },
];

export const ROUND_NAMES_16 = [
  'ROUND OF 16',
  'QUARTER FINALS',
  'SEMI FINALS',
  'THE FINAL',
];

export function createChampionship16(trainerName: string): Championship16State {
  const player: ChampionshipTrainer = {
    id: 0,
    name: trainerName.toUpperCase() || 'YOU',
    title: 'Kanto League Challenger',
    avatar: '★',
    style: 'Master Strategist',
    seed: 1.3,
    team: [],
  };

  const trainers: ChampionshipTrainer[] = [
    player,
    ...CHAMPIONSHIP_OPPONENTS.map((opp, idx) => ({
      ...opp,
      id: idx + 1,
    })),
  ];

  // Exactly 16 trainers: ID 0 to 15
  // Pairings:
  // Match 0: 0 (Player) vs 1 (Jake)
  // Match 1: 2 vs 3
  // Match 2: 4 vs 5
  // Match 3: 6 vs 7
  // Match 4: 8 vs 9
  // Match 5: 10 vs 11
  // Match 6: 12 vs 13
  // Match 7: 14 vs 15 (Rival Blue)
  const activeIds = Array.from({ length: 16 }, (_, i) => i);

  return {
    trainers,
    currentRoundIndex: 0,
    activeIds,
    history: [],
  };
}

export function simulateChampionshipRound16(state: Championship16State): {
  roundMatches: { a: ChampionshipTrainer; b: ChampionshipTrainer; winner: ChampionshipTrainer }[];
} {
  const { trainers, activeIds, currentRoundIndex } = state;
  const matches: ChampionshipMatch[] = [];
  const nextActive: number[] = [];
  const report: { a: ChampionshipTrainer; b: ChampionshipTrainer; winner: ChampionshipTrainer }[] = [];

  for (let i = 0; i < activeIds.length; i += 2) {
    const aId = activeIds[i];
    const bId = activeIds[i + 1];

    let winnerId: number;
    // Player match is resolved by the player playing!
    if (aId === 0 || bId === 0) {
      winnerId = 0; // Player advances when this simulation is triggered after player's victory
    } else {
      const aSeed = trainers[aId].seed;
      const bSeed = trainers[bId].seed;
      const chance = aSeed / (aSeed + bSeed);
      winnerId = Math.random() < chance ? aId : bId;
    }

    matches.push({ trainerAId: aId, trainerBId: bId, winnerId, resolved: true });
    nextActive.push(winnerId);
    report.push({
      a: trainers[aId],
      b: trainers[bId],
      winner: trainers[winnerId],
    });
  }

  state.history.push(matches);
  state.activeIds = nextActive;
  state.currentRoundIndex++;

  return { roundMatches: report };
}
