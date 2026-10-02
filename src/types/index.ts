export type PokemonType =
  | 'Normal'
  | 'Fire'
  | 'Water'
  | 'Electric'
  | 'Grass'
  | 'Ice'
  | 'Fighting'
  | 'Poison'
  | 'Ground'
  | 'Flying'
  | 'Psychic'
  | 'Bug'
  | 'Rock'
  | 'Ghost'
  | 'Dragon';

export type TypeShort =
  | 'No'
  | 'Fi'
  | 'Wa'
  | 'El'
  | 'Gr'
  | 'Ic'
  | 'Fg'
  | 'Po'
  | 'Gd'
  | 'Fl'
  | 'Ps'
  | 'Bu'
  | 'Ro'
  | 'Gh'
  | 'Dr';

export type MoveCategory = 'Physical' | 'Special' | 'Status';

export type MoveAnimationType =
  | 'RAZOR_LEAF'
  | 'VINE_WHIP'
  | 'WATER_GUN'
  | 'HYDRO_PUMP'
  | 'EMBER'
  | 'FLAMETHROWER'
  | 'FIRE_BLAST'
  | 'THUNDER_SHOCK'
  | 'SPARK'
  | 'THUNDERBOLT'
  | 'THUNDER'
  | 'ICE_BEAM'
  | 'ROCK_THROW'
  | 'PSYCHIC'
  | 'SHADOW_BALL'
  | 'BITE'
  | 'QUICK_ATTACK'
  | 'SCRATCH'
  | 'SLAM'
  | 'EARTHQUAKE'
  | 'BEAM'
  | 'GUST'
  | 'ORB';

export interface MoveData {
  id: string;
  name: string;
  type: PokemonType;
  typeShort: TypeShort;
  power: number;
  accuracy: number;
  category: MoveCategory;
  priority: number;
  animationType: MoveAnimationType;
  sound: string;
  description: string;
  unlockLevel: number;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  type1: PokemonType;
  type2?: PokemonType;
  typesShort: TypeShort[];
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  baseSpAttack: number;
  baseSpDefense: number;
  baseSpeed: number;
  evolutionLevel: number;
  evolvesTo?: number;
  stoneEvolutions?: { stoneType: string; evolvesTo: number }[];
  possibleMoves: string[];
}

export interface PokemonStats {
  maxHP: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface PokemonInstance {
  instanceId: string;
  speciesId: number;
  level: number;
  experience: number;
  currentHP: number;
  maxHP: number;
  moves: string[];
  stats: PokemonStats;
  iv: number;
  status?: 'NORMAL' | 'FAINTED';
  specialEvolved?: boolean;
}

export interface TournamentRound {
  index: number;
  name: string;
  baseLevel: number;
  levelVariance: number;
  bstCap: number;
  aiLevel: number;
  foeBerries: number;
  teamSize: number;
}

export interface TournamentMatch {
  trainerAId: number;
  trainerBId: number;
  winnerId: number;
}

export interface TournamentBracket {
  trainers: {
    id: number;
    name: string;
    avatar: string;
    style: string;
    seed: number;
  }[];
  activeList: number[];
  history: TournamentMatch[][];
  currentRoundIndex: number;
}

export interface Inventory {
  healthBerries: number;
  fullHealBerries: number;
  revives: number;
  stones: Record<string, number>;
}

export interface GameSettings {
  musicOn: boolean;
  sfxOn: boolean;
  pokemonSoundsOn: boolean;
  musicVolume: number;
  sfxVolume: number;
  pokemonVolume: number;
}

export interface ChampionshipRecord {
  date: string;
  starterName: string;
  finalTeam: { speciesId: number; name: string; level: number }[];
  finalOpponent: string;
  finalOpponentTeam: { speciesId: number; name: string; level: number }[];
  tournamentResult: string;
  playerStats: {
    battlesWon: number;
    totalExpGained: number;
  };
}

export interface GameSaveData {
  version: number;
  savedAt: string;
  currentRound: number;
  currentPhase: string;
  playerCollection: PokemonInstance[];
  playerTeamIds: string[];
  activePokemonId: string;
  inventory: Inventory;
  trainingSessionsRemaining: number;
  maxTrainingSessions: number;
  specialEvolutionCount: number;
  tournamentBracket: TournamentBracket;
  settings: GameSettings;
  championshipHistory: ChampionshipRecord[];
  lastBattleStats?: {
    expEarned: number;
    itemsEarned: string[];
  };
}

export type BattleActionType = 'FIGHT' | 'POKEMON' | 'BAG' | 'RUN';

export interface BattleAction {
  type: BattleActionType;
  move?: MoveData;
  switchIndex?: number;
  itemKey?: 'healthBerry' | 'fullHealBerry' | 'revive' | string;
  targetPokemonIndex?: number;
}
