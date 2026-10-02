import { MoveData, PokemonInstance } from '../types';
import { getPokemonSpecies } from '../data/pokemon';
import { calculateTypeEffectiveness } from '../data/types';

export interface DamageCalculation {
  damage: number;
  effectiveness: number;
  isCritical: boolean;
  isHit: boolean;
  message: string;
}

export function calculateDamage(
  attacker: PokemonInstance,
  defender: PokemonInstance,
  move: MoveData
): DamageCalculation {
  // Accuracy check
  const roll = Math.random() * 100;
  if (roll > move.accuracy) {
    return {
      damage: 0,
      effectiveness: 1,
      isCritical: false,
      isHit: false,
      message: 'The attack missed!',
    };
  }

  const attackerSpecies = getPokemonSpecies(attacker.speciesId);
  const defenderSpecies = getPokemonSpecies(defender.speciesId);

  // Type effectiveness
  const effectiveness = calculateTypeEffectiveness(move.typeShort, defenderSpecies.typesShort);
  if (effectiveness === 0) {
    return {
      damage: 0,
      effectiveness: 0,
      isCritical: false,
      isHit: true,
      message: `It had no effect on ${defenderSpecies.name}!`,
    };
  }

  // Attack & Defense stats based on move category
  const isPhysical = move.category === 'Physical';
  const attackStat = isPhysical ? attacker.stats.attack : attacker.stats.spAttack;
  const defenseStat = isPhysical ? defender.stats.defense : defender.stats.spDefense;

  // Critical hit (6.25% Gen 1 style)
  const isCritical = Math.random() < 0.0625;

  // STAB (Same-Type Attack Bonus)
  const isSTAB = attackerSpecies.typesShort.includes(move.typeShort);
  const stabMultiplier = isSTAB ? 1.5 : 1.0;

  // Standard Pokémon damage formula
  // Damage = ((((2 * Level / 5 + 2) * Power * Attack / Defense) / 50) + 2) * STAB * Effectiveness * Critical * Random
  const levelFactor = (2 * attacker.level) / 5 + 2;
  const statFactor = (move.power * attackStat) / Math.max(1, defenseStat);
  const baseDamage = (levelFactor * statFactor) / 50 + 2;

  const randomMultiplier = 0.85 + Math.random() * 0.15;
  const criticalMultiplier = isCritical ? 1.5 : 1.0;

  const finalDamage = Math.max(
    1,
    Math.floor(baseDamage * stabMultiplier * effectiveness * criticalMultiplier * randomMultiplier)
  );

  return {
    damage: Math.min(defender.currentHP, finalDamage),
    effectiveness,
    isCritical,
    isHit: true,
    message: '',
  };
}
