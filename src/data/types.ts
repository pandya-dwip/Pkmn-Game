import { PokemonType, TypeShort } from '../types';

export const TYPE_NAMES: Record<TypeShort, PokemonType> = {
  No: 'Normal',
  Fi: 'Fire',
  Wa: 'Water',
  El: 'Electric',
  Gr: 'Grass',
  Ic: 'Ice',
  Fg: 'Fighting',
  Po: 'Poison',
  Gd: 'Ground',
  Fl: 'Flying',
  Ps: 'Psychic',
  Bu: 'Bug',
  Ro: 'Rock',
  Gh: 'Ghost',
  Dr: 'Dragon',
};

export const TYPE_TO_SHORT: Record<PokemonType, TypeShort> = {
  Normal: 'No',
  Fire: 'Fi',
  Water: 'Wa',
  Electric: 'El',
  Grass: 'Gr',
  Ice: 'Ic',
  Fighting: 'Fg',
  Poison: 'Po',
  Ground: 'Gd',
  Flying: 'Fl',
  Psychic: 'Ps',
  Bug: 'Bu',
  Rock: 'Ro',
  Ghost: 'Gh',
  Dragon: 'Dr',
};

export const TYPE_COLORS: Record<TypeShort, { hex: string; num: number }> = {
  No: { hex: '#9a9a78', num: 0x9a9a78 },
  Fi: { hex: '#f0501a', num: 0xf0501a },
  Wa: { hex: '#2a82e8', num: 0x2a82e8 },
  El: { hex: '#e8c800', num: 0xe8c800 },
  Gr: { hex: '#2fa84a', num: 0x2fa84a },
  Ic: { hex: '#2ac8e0', num: 0x2ac8e0 },
  Fg: { hex: '#f0832a', num: 0xf0832a },
  Po: { hex: '#a24ad0', num: 0xa24ad0 },
  Gd: { hex: '#b8863a', num: 0xb8863a },
  Fl: { hex: '#5aaeff', num: 0x5aaeff },
  Ps: { hex: '#ff5fa8', num: 0xff5fa8 },
  Bu: { hex: '#8cc820', num: 0x8cc820 },
  Ro: { hex: '#8a6a3a', num: 0x8a6a3a },
  Gh: { hex: '#8a5ad8', num: 0x8a5ad8 },
  Dr: { hex: '#5a6cff', num: 0x5a6cff },
};

// [Super effective (2x), Not very effective (0.5x), Immune (0x)]
export const TYPE_CHART: Record<TypeShort, [TypeShort[], TypeShort[], TypeShort[]]> = {
  No: [[], ['Ro'], ['Gh']],
  Fi: [['Gr', 'Ic', 'Bu'], ['Fi', 'Wa', 'Ro', 'Dr'], []],
  Wa: [['Fi', 'Gd', 'Ro'], ['Wa', 'Gr', 'Dr'], []],
  El: [['Wa', 'Fl'], ['El', 'Gr', 'Dr'], ['Gd']],
  Gr: [['Wa', 'Gd', 'Ro'], ['Fi', 'Gr', 'Po', 'Fl', 'Bu', 'Dr'], []],
  Ic: [['Gr', 'Gd', 'Fl', 'Dr'], ['Wa', 'Ic'], []],
  Fg: [['No', 'Ic', 'Ro'], ['Po', 'Fl', 'Ps', 'Bu'], ['Gh']],
  Po: [['Gr', 'Bu'], ['Po', 'Gd', 'Ro', 'Gh'], []],
  Gd: [['Fi', 'El', 'Po', 'Ro'], ['Gr', 'Bu'], ['Fl']],
  Fl: [['Gr', 'Fg', 'Bu'], ['El', 'Ro'], []],
  Ps: [['Fg', 'Po'], ['Ps'], []],
  Bu: [['Gr', 'Ps', 'Po'], ['Fi', 'Fg', 'Fl', 'Gh'], []],
  Ro: [['Fi', 'Ic', 'Fl', 'Bu'], ['Fg', 'Gd'], []],
  Gh: [['Gh'], [], ['No', 'Ps']],
  Dr: [['Dr'], [], []],
};

/**
 * Calculates effectiveness multiplier of an attacking move type against defending pokemon types.
 */
export function calculateTypeEffectiveness(moveType: TypeShort, defenderTypes: TypeShort[]): number {
  const [superEff, weakEff, immune] = TYPE_CHART[moveType] || [[], [], []];
  let multiplier = 1.0;

  for (const defType of defenderTypes) {
    if (immune.includes(defType)) {
      return 0.0;
    }
    if (superEff.includes(defType)) {
      multiplier *= 2.0;
    } else if (weakEff.includes(defType)) {
      multiplier *= 0.5;
    }
  }

  return multiplier;
}

export function getEffectivenessMessage(multiplier: number): string {
  if (multiplier === 0) return 'No effect!';
  if (multiplier > 1.5) return "It's super effective!";
  if (multiplier < 1.0) return "It's not very effective...";
  return '';
}
