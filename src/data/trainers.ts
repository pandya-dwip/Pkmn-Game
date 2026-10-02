import { PokemonInstance, TournamentRound, TournamentBracket, TournamentMatch } from '../types';
import { POKEMON_SPECIES_MAP, calculateBaseStatTotal, isEvolutionLine } from './pokemon';
import { createPokemonInstance } from '../entities/PokemonInstance';

export const TOURNAMENT_ROUNDS: TournamentRound[] = [
  {
    index: 0,
    name: 'Round 1',
    baseLevel: 6,
    levelVariance: 1,
    bstCap: 330,
    aiLevel: 0,
    foeBerries: 0,
    teamSize: 1,
  },
  {
    index: 1,
    name: 'Round 2',
    baseLevel: 8,
    levelVariance: 1,
    bstCap: 370,
    aiLevel: 1,
    foeBerries: 0,
    teamSize: 2,
  },
  {
    index: 2,
    name: 'Round 3',
    baseLevel: 11,
    levelVariance: 2,
    bstCap: 410,
    aiLevel: 1,
    foeBerries: 1,
    teamSize: 2,
  },
  {
    index: 3,
    name: 'Quarter Final',
    baseLevel: 14,
    levelVariance: 2,
    bstCap: 460,
    aiLevel: 2,
    foeBerries: 1,
    teamSize: 3,
  },
  {
    index: 4,
    name: 'Semi Final',
    baseLevel: 18,
    levelVariance: 2,
    bstCap: 510,
    aiLevel: 2,
    foeBerries: 2,
    teamSize: 4,
  },
  {
    index: 5,
    name: 'Final',
    baseLevel: 23,
    levelVariance: 2,
    bstCap: 580,
    aiLevel: 3,
    foeBerries: 2,
    teamSize: 5,
  },
];

const TRAINER_CLASSES = [
  { title: 'Ace Trainer', avatar: '⭐' },
  { title: 'Bug Catcher', avatar: '🦋' },
  { title: 'Hiker', avatar: '⛰️' },
  { title: 'Lass', avatar: '🎀' },
  { title: 'Sailor', avatar: '⚓' },
  { title: 'Rocker', avatar: '🎸' },
  { title: 'Swimmer', avatar: '🏊' },
  { title: 'Youngster', avatar: '🧢' },
  { title: 'Psychic', avatar: '🔮' },
  { title: 'Black Belt', avatar: '🥋' },
];

const TRAINER_NAMES = [
  'Jake', 'Mia', 'Leo', 'Ron', 'Maya', 'Kai', 'Alex', 'Zoe',
  'Finn', 'Ivy', 'Gus', 'Nora', 'Sam', 'Tess', 'Omar', 'Lena',
  'Victor', 'Brock', 'Misty', 'Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine',
  'Giovanni', 'Blue', 'Red', 'Lorelei', 'Bruno', 'Agatha', 'Lance', 'Dwip',
];

const STYLES = ['Aggressive', 'Defensive', 'Balanced', 'Tactical'];

export function generateTournamentBracket(): TournamentBracket {
  const trainers: TournamentBracket['trainers'] = [
    {
      id: 0,
      name: 'YOU (Trainer)',
      avatar: '★',
      style: 'Balanced',
      seed: 1.0,
    },
  ];

  const pool: { name: string; avatar: string; style: string }[] = [];
  for (const tc of TRAINER_CLASSES) {
    for (const name of TRAINER_NAMES) {
      pool.push({
        name: `${tc.title} ${name}`,
        avatar: tc.avatar,
        style: STYLES[Math.floor(Math.random() * STYLES.length)],
      });
    }
  }

  // Shuffle pool
  pool.sort(() => Math.random() - 0.5);

  // Fill up to 64 trainers
  for (let i = 1; i < 64; i++) {
    const item = pool[i - 1] || { name: `Trainer ${i}`, avatar: '⚡', style: 'Balanced' };
    trainers.push({
      id: i,
      name: item.name,
      avatar: item.avatar,
      style: item.style,
      seed: 0.6 + Math.random() * 0.8,
    });
  }

  const activeList = Array.from({ length: 64 }, (_, i) => i);

  return {
    trainers,
    activeList,
    history: [],
    currentRoundIndex: 0,
  };
}

export function simulateTournamentRound(bracket: TournamentBracket): void {
  const { trainers, activeList } = bracket;
  const matches: TournamentMatch[] = [];
  const nextActiveList: number[] = [];

  for (let i = 0; i < activeList.length; i += 2) {
    const aId = activeList[i];
    const bId = activeList[i + 1];

    let winnerId: number;
    // Player always wins their own simulation step during game progression
    if (aId === 0) {
      winnerId = 0;
    } else if (bId === 0) {
      winnerId = 0;
    } else {
      const aSeed = trainers[aId].seed;
      const bSeed = trainers[bId].seed;
      const aChance = aSeed / (aSeed + bSeed);
      winnerId = Math.random() < aChance ? aId : bId;
    }

    matches.push({ trainerAId: aId, trainerBId: bId, winnerId });
    nextActiveList.push(winnerId);
  }

  bracket.history.push(matches);
  bracket.activeList = nextActiveList;
}

export function generateOpponentTeam(roundIndex: number, playerAverageLevel: number): PokemonInstance[] {
  const round = TOURNAMENT_ROUNDS[roundIndex] || TOURNAMENT_ROUNDS[0];
  const targetLevel = Math.max(round.baseLevel, playerAverageLevel);
  const teamSize = round.teamSize;

  // Filter valid candidate species
  const candidates: number[] = [];
  for (let id = 1; id <= 151; id++) {
    const species = POKEMON_SPECIES_MAP[id];
    if (!species) continue;
    // Exclude legendaries in early rounds
    if (id >= 144 && id <= 151 && roundIndex < 4) continue;

    const bst = calculateBaseStatTotal(species);
    if (bst <= round.bstCap) {
      candidates.push(id);
    }
  }

  // Shuffle candidates
  candidates.sort(() => Math.random() - 0.5);

  const team: PokemonInstance[] = [];
  for (let i = 0; i < teamSize; i++) {
    let chosenId = candidates[i % candidates.length] || 1;
    const monLevel = targetLevel + Math.floor(Math.random() * (round.levelVariance * 2 + 1)) - round.levelVariance;
    const actualLevel = Math.max(5, monLevel);

    // If candidate has an evolution at or below this level, evolve it
    let currentSpecies = POKEMON_SPECIES_MAP[chosenId];
    while (currentSpecies && currentSpecies.evolutionLevel > 0 && actualLevel >= currentSpecies.evolutionLevel && currentSpecies.evolvesTo) {
      chosenId = currentSpecies.evolvesTo;
      currentSpecies = POKEMON_SPECIES_MAP[chosenId];
    }

    team.push(createPokemonInstance(chosenId, actualLevel));
  }

  return team;
}

export function generateRewardChoices(roundIndex: number, ownedSpeciesIds: number[]): PokemonInstance[] {
  const round = TOURNAMENT_ROUNDS[roundIndex + 1] || TOURNAMENT_ROUNDS[TOURNAMENT_ROUNDS.length - 1];
  const candidates: number[] = [];

  for (let id = 1; id <= 151; id++) {
    // Legends only in late rounds
    if (id >= 144 && id <= 146 && roundIndex < 3) continue;
    if ((id === 150 || id === 151) && roundIndex < 4) continue;

    candidates.push(id);
  }

  // Weight owned mons lower, high BST appropriately
  candidates.sort(() => Math.random() - 0.5);

  const choices: PokemonInstance[] = [];
  for (const id of candidates) {
    if (choices.length >= 3) break;
    if (choices.some(c => c.speciesId === id)) continue;

    const species = POKEMON_SPECIES_MAP[id];
    let level = Math.max(round.baseLevel - 1, species.evolutionLevel > 0 ? species.evolutionLevel - 2 : 5);
    choices.push(createPokemonInstance(id, level));
  }

  return choices;
}
