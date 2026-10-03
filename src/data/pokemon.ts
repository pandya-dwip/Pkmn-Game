import { PokemonSpecies, PokemonStats, PokemonType, TypeShort } from '../types';
import { TYPE_NAMES, TYPE_TO_SHORT } from './types';
import { TYPE_MOVE_MAP } from './moves';

// Stone evolutions mapping
export const STONE_EVOLUTIONS: Record<number, { stoneType: string; evolvesTo: number }[]> = {
  25: [{ stoneType: 'El', evolvesTo: 26 }], // Pikachu -> Raichu (Thunder)
  30: [{ stoneType: 'Mo', evolvesTo: 31 }], // Nidorina -> Nidoqueen (Moon)
  33: [{ stoneType: 'Mo', evolvesTo: 34 }], // Nidorino -> Nidoking (Moon)
  35: [{ stoneType: 'Mo', evolvesTo: 36 }], // Clefairy -> Clefable (Moon)
  37: [{ stoneType: 'Fi', evolvesTo: 38 }], // Vulpix -> Ninetales (Fire)
  39: [{ stoneType: 'Mo', evolvesTo: 40 }], // Jigglypuff -> Wigglytuff (Moon)
  44: [{ stoneType: 'Gr', evolvesTo: 45 }], // Gloom -> Vileplume (Leaf)
  58: [{ stoneType: 'Fi', evolvesTo: 59 }], // Growlithe -> Arcanine (Fire)
  61: [{ stoneType: 'Wa', evolvesTo: 62 }], // Poliwhirl -> Poliwrath (Water)
  70: [{ stoneType: 'Gr', evolvesTo: 71 }], // Weepinbell -> Victreebel (Leaf)
  90: [{ stoneType: 'Wa', evolvesTo: 91 }], // Shellder -> Cloyster (Water)
  102: [{ stoneType: 'Gr', evolvesTo: 103 }], // Exeggcute -> Exeggutor (Leaf)
  120: [{ stoneType: 'Wa', evolvesTo: 121 }], // Staryu -> Starmie (Water)
  133: [
    { stoneType: 'Wa', evolvesTo: 134 }, // Eevee -> Vaporeon
    { stoneType: 'El', evolvesTo: 135 }, // Eevee -> Jolteon
    { stoneType: 'Fi', evolvesTo: 136 }, // Eevee -> Flareon
  ],
};

// Trade evolutions made tournament-friendly with direct level or stone
// 64 (Kadabra -> Alakazam at 15), 67 (Machoke -> Machamp at 16), 75 (Graveler -> Golem at 15), 93 (Haunter -> Gengar at 15)

const RAW_151 = `Bulbasaur,GrPo,45,49,49,65,65,45,9
Ivysaur,GrPo,60,62,63,80,80,60,15
Venusaur,GrPo,80,82,83,100,100,80,0
Charmander,Fi,39,52,43,60,50,65,9
Charmeleon,Fi,58,64,58,80,65,80,15
Charizard,FiFl,78,84,78,109,85,100,0
Squirtle,Wa,44,48,65,50,64,43,9
Wartortle,Wa,59,63,80,65,80,58,15
Blastoise,Wa,79,83,100,85,105,78,0
Caterpie,Bu,45,30,35,20,20,45,6
Metapod,Bu,50,20,55,25,25,30,9
Butterfree,BuFl,60,45,50,90,80,70,0
Weedle,BuPo,40,35,30,20,20,50,6
Kakuna,BuPo,45,25,50,25,25,35,9
Beedrill,BuPo,65,90,40,45,80,75,0
Pidgey,NoFl,40,45,40,35,35,56,8
Pidgeotto,NoFl,63,60,55,50,50,71,15
Pidgeot,NoFl,83,80,75,70,70,101,0
Rattata,No,30,56,35,25,35,72,9
Raticate,No,55,81,60,50,70,97,0
Spearow,NoFl,40,60,30,31,31,70,9
Fearow,NoFl,65,90,65,61,61,100,0
Ekans,Po,35,60,44,40,54,55,10
Arbok,Po,60,95,69,65,79,80,0
Pikachu,El,42,55,45,55,50,90,15
Raichu,El,60,90,55,90,80,110,0
Sandshrew,Gd,50,75,85,20,30,40,10
Sandslash,Gd,75,100,110,45,55,65,0
Nidoran-F,Po,55,47,52,40,40,41,8
Nidorina,Po,70,62,67,55,55,56,14
Nidoqueen,PoGd,90,92,87,75,85,76,0
Nidoran-M,Po,46,57,40,40,40,50,8
Nidorino,Po,61,72,57,55,55,65,14
Nidoking,PoGd,81,102,77,85,75,85,0
Clefairy,No,70,45,48,60,65,35,12
Clefable,No,95,70,73,95,90,60,0
Vulpix,Fi,38,41,40,50,65,65,12
Ninetales,Fi,73,76,75,81,100,100,0
Jigglypuff,No,115,45,20,45,25,20,12
Wigglytuff,No,140,70,45,85,50,45,0
Zubat,PoFl,40,45,35,30,40,55,10
Golbat,PoFl,75,80,70,65,75,90,0
Oddish,GrPo,45,50,55,75,65,30,9
Gloom,GrPo,60,65,70,85,75,40,15
Vileplume,GrPo,75,80,85,110,90,50,0
Paras,BuGr,35,70,55,45,55,25,10
Parasect,BuGr,60,95,80,60,80,30,0
Venonat,BuPo,60,55,50,40,55,45,12
Venomoth,BuPo,70,65,60,90,75,90,0
Diglett,Gd,10,55,25,35,45,95,11
Dugtrio,Gd,35,100,50,50,70,120,0
Meowth,No,40,45,35,40,40,90,11
Persian,No,65,70,60,65,65,115,0
Psyduck,Wa,50,52,48,65,50,55,12
Golduck,Wa,80,82,78,95,80,85,0
Mankey,Fg,40,80,35,35,45,70,11
Primeape,Fg,65,105,60,60,70,95,0
Growlithe,Fi,55,70,45,70,50,60,12
Arcanine,Fi,90,110,80,100,80,95,0
Poliwag,Wa,40,50,40,40,40,90,10
Poliwhirl,Wa,65,65,65,50,50,90,15
Poliwrath,WaFg,90,95,95,70,90,70,0
Abra,Ps,25,20,15,105,55,90,8
Kadabra,Ps,40,35,30,120,70,105,15
Alakazam,Ps,55,50,45,135,95,120,0
Machop,Fg,70,80,50,35,35,35,10
Machoke,Fg,80,100,70,50,60,45,16
Machamp,Fg,90,130,80,65,85,55,0
Bellsprout,GrPo,50,75,35,70,30,40,9
Weepinbell,GrPo,65,90,50,85,45,55,15
Victreebel,GrPo,80,105,65,100,70,70,0
Tentacool,WaPo,40,40,35,50,100,70,12
Tentacruel,WaPo,80,70,65,80,120,100,0
Geodude,RoGd,40,80,100,30,30,20,9
Graveler,RoGd,55,95,115,45,45,35,15
Golem,RoGd,80,120,130,55,65,45,0
Ponyta,Fi,50,85,55,65,65,90,14
Rapidash,Fi,65,100,70,80,80,105,0
Slowpoke,WaPs,90,65,65,40,40,15,14
Slowbro,WaPs,95,75,110,100,80,30,0
Magnemite,El,25,35,70,95,55,45,12
Magneton,El,50,60,95,120,70,70,0
Farfetch'd,NoFl,52,90,55,58,62,60,0
Doduo,NoFl,35,85,45,35,35,75,12
Dodrio,NoFl,60,110,70,60,60,110,0
Seel,Wa,65,45,55,45,70,45,13
Dewgong,WaIc,90,70,80,70,95,70,0
Grimer,Po,80,80,50,40,50,25,14
Muk,Po,105,105,75,65,100,50,0
Shellder,Wa,30,65,100,45,25,40,12
Cloyster,WaIc,50,95,180,85,45,70,0
Gastly,GhPo,30,35,30,100,35,80,9
Haunter,GhPo,45,50,45,115,55,95,15
Gengar,GhPo,60,65,60,130,75,110,0
Onix,RoGd,35,45,160,30,45,70,0
Drowzee,Ps,60,48,45,43,90,42,11
Hypno,Ps,85,73,70,73,115,67,0
Krabby,Wa,30,105,90,25,25,50,11
Kingler,Wa,55,130,115,50,50,75,0
Voltorb,El,40,30,50,55,55,100,12
Electrode,El,60,50,70,80,80,150,0
Exeggcute,GrPs,60,40,80,60,45,40,12
Exeggutor,GrPs,95,95,85,125,75,55,0
Cubone,Gd,50,50,95,40,50,35,11
Marowak,Gd,60,80,110,50,80,45,0
Hitmonlee,Fg,50,120,53,35,110,87,0
Hitmonchan,Fg,50,105,79,35,110,76,0
Lickitung,No,90,55,75,60,75,30,0
Koffing,Po,40,65,95,60,45,35,13
Weezing,Po,65,90,120,85,70,60,0
Rhyhorn,GdRo,80,85,95,30,30,25,16
Rhydon,GdRo,105,130,120,45,45,40,0
Chansey,No,250,5,5,35,105,50,0
Tangela,Gr,65,55,115,100,40,60,0
Kangaskhan,No,105,95,80,40,80,90,0
Horsea,Wa,30,40,70,70,25,60,12
Seadra,Wa,55,65,95,95,45,85,0
Goldeen,Wa,45,67,60,35,50,63,12
Seaking,Wa,80,92,65,65,80,68,0
Staryu,Wa,30,45,55,70,55,85,12
Starmie,WaPs,60,75,85,100,85,115,0
Mr. Mime,Ps,40,45,65,100,120,90,0
Scyther,BuFl,70,110,80,55,80,105,0
Jynx,IcPs,65,50,35,115,95,95,0
Electabuzz,El,65,83,57,95,85,105,0
Magmar,Fi,65,95,57,100,85,93,0
Pinsir,Bu,65,125,100,55,70,85,0
Tauros,No,75,100,95,40,70,110,0
Magikarp,Wa,20,10,55,15,20,80,10
Gyarados,WaFl,95,125,79,60,100,81,0
Lapras,WaIc,130,85,80,85,95,60,0
Ditto,No,48,48,48,48,48,48,0
Eevee,No,55,55,50,45,65,55,15
Vaporeon,Wa,130,65,60,110,95,65,0
Jolteon,El,65,65,60,110,95,130,0
Flareon,Fi,65,130,60,95,110,65,0
Porygon,No,65,60,70,85,75,40,0
Omanyte,RoWa,35,40,100,90,55,35,14
Omastar,RoWa,70,60,125,115,70,55,0
Kabuto,RoWa,30,80,90,55,45,55,14
Kabutops,RoWa,60,115,105,65,70,80,0
Aerodactyl,RoFl,80,105,65,60,75,130,0
Snorlax,No,160,110,65,65,110,30,0
Articuno,IcFl,90,85,100,95,125,85,0
Zapdos,ElFl,90,90,85,125,90,100,0
Moltres,FiFl,90,100,90,125,85,90,0
Dratini,Dr,41,64,45,50,50,50,12
Dragonair,Dr,61,84,65,70,70,70,18
Dragonite,DrFl,91,134,95,100,100,80,0
Mewtwo,Ps,106,110,90,154,90,130,0
Mew,Ps,100,100,100,100,100,100,0`;

const ALL_SPECIES: Record<number, PokemonSpecies> = {};

RAW_151.trim().split('\n').forEach((line, index) => {
  const parts = line.split(',');
  const id = index + 1;
  const name = parts[0];
  const typeStr = parts[1];
  const typesShort = (typeStr.match(/../g) || ['No']) as TypeShort[];
  const type1 = TYPE_NAMES[typesShort[0]] || 'Normal';
  const type2 = typesShort[1] ? TYPE_NAMES[typesShort[1]] : undefined;

  const [baseHP, baseAttack, baseDefense, baseSpAttack, baseSpDefense, baseSpeed] = parts.slice(2, 8).map(Number);
  const evolutionLevel = Number(parts[8]) || 0;
  const evolvesTo = evolutionLevel > 0 ? id + 1 : undefined;

  // Collect move names for this species from type mappings
  const possibleMovesSet = new Set<string>();
  const typesToCheck: TypeShort[] = [...typesShort, 'No'];
  for (const t of typesToCheck) {
    const moves = TYPE_MOVE_MAP[t] || [];
    for (const m of moves) {
      possibleMovesSet.add(m);
    }
  }

  ALL_SPECIES[id] = {
    id,
    name,
    type1,
    type2,
    typesShort,
    baseHP,
    baseAttack,
    baseDefense,
    baseSpAttack,
    baseSpDefense,
    baseSpeed,
    evolutionLevel,
    evolvesTo,
    stoneEvolutions: STONE_EVOLUTIONS[id],
    possibleMoves: Array.from(possibleMovesSet),
  };
});

export const POKEMON_SPECIES_MAP = ALL_SPECIES;

export function getPokemonSpecies(id: number): PokemonSpecies {
  return POKEMON_SPECIES_MAP[id] || POKEMON_SPECIES_MAP[1];
}

export function calculateBaseStatTotal(species: PokemonSpecies): number {
  return (
    species.baseHP +
    species.baseAttack +
    species.baseDefense +
    species.baseSpAttack +
    species.baseSpDefense +
    species.baseSpeed
  );
}

export function calculateStats(species: PokemonSpecies, level: number, iv: number): PokemonStats {
  const calcHP = (base: number) => Math.floor(((2 * base + iv) * level) / 100) + level + 10;
  const calcStat = (base: number) => Math.floor(((2 * base + iv) * level) / 100) + 5;

  return {
    maxHP: calcHP(species.baseHP),
    attack: calcStat(species.baseAttack),
    defense: calcStat(species.baseDefense),
    spAttack: calcStat(species.baseSpAttack),
    spDefense: calcStat(species.baseSpDefense),
    speed: calcStat(species.baseSpeed),
  };
}

export function getExpNeededForLevel(level: number): number {
  return Math.floor(level * level * 2.2);
}

export function isEvolutionLine(id: number): boolean {
  return (id > 1 && (POKEMON_SPECIES_MAP[id - 1]?.evolutionLevel || 0) > 0) || id in STONE_EVOLUTIONS;
}

export const STARTER_IDS = [1, 4, 7, 25, 133]; // Bulbasaur, Charmander, Squirtle, Pikachu, Eevee
