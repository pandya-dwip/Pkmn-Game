import { PokemonInstance } from '../types';
import { addExperience, LevelUpResult, refreshPokemonStats } from '../entities/PokemonInstance';
import { getPokemonSpecies } from '../data/pokemon';

export type TrainingType = 'Strength' | 'Defense' | 'Speed' | 'HP' | 'Technique';

export interface TrainingResult {
  trainingType: TrainingType;
  pokemonName: string;
  statGain: string;
  expGained: number;
  levelUpResult?: LevelUpResult;
}

export class TrainingSystem {
  public static executeTraining(
    mon: PokemonInstance,
    type: TrainingType,
    roundIndex: number
  ): TrainingResult {
    const species = getPokemonSpecies(mon.speciesId);
    const pokemonName = species.name;

    // Controlled EXP gain scaled by round
    const baseExp = Math.round((25 + roundIndex * 15) * (1 + Math.random() * 0.25));
    let statGainMsg = '';

    // Controlled permanent / current stat bonus (capped by IV / level multipliers)
    switch (type) {
      case 'Strength':
        mon.stats.attack += 1;
        statGainMsg = 'Attack +1';
        break;
      case 'Defense':
        mon.stats.defense += 1;
        statGainMsg = 'Defense +1';
        break;
      case 'Speed':
        mon.stats.speed += 1;
        statGainMsg = 'Speed +1';
        break;
      case 'HP':
        mon.stats.maxHP += 2;
        mon.maxHP = mon.stats.maxHP;
        const healAmt = Math.min(mon.maxHP - mon.currentHP, Math.ceil(mon.maxHP * 0.25));
        mon.currentHP += healAmt;
        statGainMsg = `Max HP +2 and restored ${healAmt} HP`;
        break;
      case 'Technique':
        statGainMsg = 'Combat technique honed (+bonus XP)';
        break;
    }

    const bonusExp = type === 'Technique' ? Math.round(baseExp * 1.6) : baseExp;
    const levelUpResult = addExperience(mon, bonusExp);

    return {
      trainingType: type,
      pokemonName,
      statGain: statGainMsg,
      expGained: bonusExp,
      levelUpResult: levelUpResult.leveledUp ? levelUpResult : undefined,
    };
  }
}
