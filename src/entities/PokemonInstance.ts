import { PokemonInstance, PokemonStats } from '../types';
import { getPokemonSpecies, calculateStats, getExpNeededForLevel, POKEMON_SPECIES_MAP } from '../data/pokemon';
import { getAvailableMoves } from '../data/moves';

let instanceCounter = 0;

export function generateInstanceId(): string {
  instanceCounter++;
  return `pkmn_${Date.now().toString(36)}_${instanceCounter}_${Math.random().toString(36).substring(2, 6)}`;
}

export function createPokemonInstance(speciesId: number, level: number, iv?: number): PokemonInstance {
  const species = getPokemonSpecies(speciesId);
  const monIv = iv !== undefined ? iv : Math.floor(Math.random() * 16);
  const stats = calculateStats(species, level, monIv);
  const availableMoves = getAvailableMoves(species.typesShort, level);
  const moves = availableMoves.slice(0, 4).map(m => m.name);

  return {
    instanceId: generateInstanceId(),
    speciesId,
    level,
    experience: 0,
    currentHP: stats.maxHP,
    maxHP: stats.maxHP,
    moves,
    stats,
    iv: monIv,
    status: 'NORMAL',
  };
}

export function refreshPokemonStats(mon: PokemonInstance): void {
  const species = getPokemonSpecies(mon.speciesId);
  const stats = calculateStats(species, mon.level, mon.iv);
  const oldMaxHP = mon.maxHP;
  mon.stats = stats;
  mon.maxHP = stats.maxHP;

  // Preserve HP percentage or add HP difference
  if (mon.currentHP > 0) {
    const hpDiff = mon.maxHP - oldMaxHP;
    mon.currentHP = Math.min(mon.maxHP, Math.max(1, mon.currentHP + (hpDiff > 0 ? hpDiff : 0)));
  }
}

export interface LevelUpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  statGains: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  newMovesLearned: string[];
}

export function addExperience(mon: PokemonInstance, expAmount: number): LevelUpResult {
  const oldLevel = mon.level;
  const oldStats = { ...mon.stats };
  mon.experience += expAmount;

  let leveledUp = false;
  const newMovesLearned: string[] = [];

  while (mon.experience >= getExpNeededForLevel(mon.level) && mon.level < 60) {
    mon.experience -= getExpNeededForLevel(mon.level);
    mon.level++;
    leveledUp = true;

    // Check for newly unlocked moves
    const species = getPokemonSpecies(mon.speciesId);
    const available = getAvailableMoves(species.typesShort, mon.level);
    for (const move of available) {
      if (move.unlockLevel === mon.level && !mon.moves.includes(move.name)) {
        if (mon.moves.length < 4) {
          mon.moves.push(move.name);
          newMovesLearned.push(move.name);
        } else {
          // Replace weakest/first move or register for learning
          newMovesLearned.push(move.name);
        }
      }
    }
  }

  if (leveledUp) {
    refreshPokemonStats(mon);
  }

  const statGains = {
    hp: mon.stats.maxHP - oldStats.maxHP,
    attack: mon.stats.attack - oldStats.attack,
    defense: mon.stats.defense - oldStats.defense,
    spAttack: mon.stats.spAttack - oldStats.spAttack,
    spDefense: mon.stats.spDefense - oldStats.spDefense,
    speed: mon.stats.speed - oldStats.speed,
  };

  return {
    leveledUp,
    oldLevel,
    newLevel: mon.level,
    statGains,
    newMovesLearned,
  };
}

export function healPokemon(mon: PokemonInstance, percent: number): number {
  if (mon.currentHP <= 0) return 0;
  const restoreAmount = Math.ceil(mon.maxHP * (percent / 100));
  const actualGain = Math.min(mon.maxHP - mon.currentHP, restoreAmount);
  mon.currentHP += actualGain;
  return actualGain;
}

export function revivePokemon(mon: PokemonInstance, percent: number = 50): number {
  if (mon.currentHP > 0) return 0;
  const revivedHP = Math.max(1, Math.ceil(mon.maxHP * (percent / 100)));
  mon.currentHP = revivedHP;
  mon.status = 'NORMAL';
  return revivedHP;
}
