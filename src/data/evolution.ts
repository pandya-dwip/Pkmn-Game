import { PokemonInstance, PokemonSpecies } from '../types';
import { getPokemonSpecies, POKEMON_SPECIES_MAP, STONE_EVOLUTIONS } from './pokemon';
import { refreshPokemonStats } from '../entities/PokemonInstance';

export interface EvolutionOption {
  targetSpeciesId: number;
  targetName: string;
  method: 'LEVEL' | 'STONE' | 'SPECIAL';
  detail: string;
}

export function getEligibleEvolutions(mon: PokemonInstance): EvolutionOption[] {
  const options: EvolutionOption[] = [];
  const species = getPokemonSpecies(mon.speciesId);

  // Level-based evolution
  if (species.evolutionLevel > 0 && species.evolvesTo) {
    const target = getPokemonSpecies(species.evolvesTo);
    options.push({
      targetSpeciesId: species.evolvesTo,
      targetName: target.name,
      method: 'LEVEL',
      detail: `Evolves at Lv. ${species.evolutionLevel}`,
    });
  }

  // Stone-based evolutions
  const stones = STONE_EVOLUTIONS[mon.speciesId] || [];
  for (const s of stones) {
    const target = getPokemonSpecies(s.evolvesTo);
    options.push({
      targetSpeciesId: s.evolvesTo,
      targetName: target.name,
      method: 'STONE',
      detail: `Evolves with ${s.stoneType} Stone`,
    });
  }

  return options;
}

export function canPokemonEvolveNormally(mon: PokemonInstance): boolean {
  const species = getPokemonSpecies(mon.speciesId);
  return species.evolutionLevel > 0 && mon.level >= species.evolutionLevel && !!species.evolvesTo;
}

export function canPokemonSpecialEvolve(mon: PokemonInstance): boolean {
  if (mon.specialEvolved) return false;
  const options = getEligibleEvolutions(mon);
  return options.length > 0;
}

export function executeEvolution(mon: PokemonInstance, targetSpeciesId: number, isSpecial: boolean = false): {
  oldSpecies: PokemonSpecies;
  newSpecies: PokemonSpecies;
} {
  const oldSpecies = getPokemonSpecies(mon.speciesId);
  const newSpecies = getPokemonSpecies(targetSpeciesId);

  const hpRatio = mon.currentHP / Math.max(1, mon.maxHP);

  mon.speciesId = targetSpeciesId;
  if (isSpecial) {
    mon.specialEvolved = true;
  }

  refreshPokemonStats(mon);
  mon.currentHP = Math.max(1, Math.round(mon.maxHP * hpRatio));

  return { oldSpecies, newSpecies };
}
