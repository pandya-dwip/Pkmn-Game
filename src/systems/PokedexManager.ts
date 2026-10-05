/**
 * PokedexManager.ts
 * Modern Digital Field Research Device
 * Implements:
 * - Real-time Seen/Caught tracking across all 151 Kanto Pokémon
 * - Dashboard with progress stats, recently discovered cards, and search
 * - Type filtering, caught/seen filtering, and sorting
 * - Clean detail view with 3D/2D switchable preview, height/weight,
 *   stat bars, and evolution chain diagrams
 */

import { POKEMON_SPECIES_MAP, calculateBaseStatTotal, STONE_EVOLUTIONS } from '../data/pokemon';
import { TYPE_NAMES } from '../data/types';
import { sound } from '../audio/SoundSynthesizer';
import { pokemon3DManager } from './Pokemon3DManager';

// Official Gen 1 Height (meters) and Weight (kg) references
const SPECIES_PHYSICAL: Record<number, { h: number; w: number }> = {
  1: { h: 0.7, w: 6.9 },   // Bulbasaur
  2: { h: 1.0, w: 13.0 },  // Ivysaur
  3: { h: 2.0, w: 100.0 }, // Venusaur
  4: { h: 0.6, w: 8.5 },   // Charmander
  5: { h: 1.1, w: 19.0 },  // Charmeleon
  6: { h: 1.7, w: 90.5 },  // Charizard
  7: { h: 0.5, w: 9.0 },   // Squirtle
  8: { h: 1.0, w: 22.5 },  // Wartortle
  9: { h: 1.6, w: 85.5 },  // Blastoise
  10: { h: 0.3, w: 2.9 },  // Caterpie
  11: { h: 0.7, w: 9.9 },  // Metapod
  12: { h: 1.1, w: 32.0 }, // Butterfree
  13: { h: 0.3, w: 3.2 },  // Weedle
  14: { h: 0.6, w: 10.0 }, // Kakuna
  15: { h: 1.0, w: 29.5 }, // Beedrill
  16: { h: 0.3, w: 1.8 },  // Pidgey
  17: { h: 1.1, w: 30.0 }, // Pidgeotto
  18: { h: 1.5, w: 39.5 }, // Pidgeot
  19: { h: 0.3, w: 3.5 },  // Rattata
  20: { h: 0.7, w: 18.5 }, // Raticate
  25: { h: 0.4, w: 6.0 },   // Pikachu
  26: { h: 0.8, w: 30.0 },  // Raichu
  133: { h: 0.3, w: 6.5 },  // Eevee
  143: { h: 2.1, w: 460.0 },// Snorlax
  150: { h: 2.0, w: 122.0 },// Mewtwo
  151: { h: 0.4, w: 4.0 },  // Mew
};

// Evolution chains lookup: [monId] -> [chainMonIds...]
export function getEvolutionChain(monId: number): number[] {
  // Common 3-stage starters & families
  const chains: number[][] = [
    [1, 2, 3],       // Bulbasaur line
    [4, 5, 6],       // Charmander line
    [7, 8, 9],       // Squirtle line
    [10, 11, 12],    // Caterpie line
    [13, 14, 15],    // Weedle line
    [16, 17, 18],    // Pidgey line
    [19, 20],        // Rattata line
    [21, 22],        // Spearow line
    [23, 24],        // Ekans line
    [25, 26],        // Pikachu line
    [27, 28],        // Sandshrew line
    [29, 30, 31],    // Nidoran-F line
    [32, 33, 34],    // Nidoran-M line
    [35, 36],        // Clefairy line
    [37, 38],        // Vulpix line
    [39, 40],        // Jigglypuff line
    [41, 42],        // Zubat line
    [43, 44, 45],    // Oddish line
    [46, 47],        // Paras line
    [48, 49],        // Venonat line
    [50, 51],        // Diglett line
    [52, 53],        // Meowth line
    [54, 55],        // Psyduck line
    [56, 57],        // Mankey line
    [58, 59],        // Growlithe line
    [60, 61, 62],    // Poliwag line
    [63, 64, 65],    // Abra line
    [66, 67, 68],    // Machop line
    [69, 70, 71],    // Bellsprout line
    [72, 73],        // Tentacool line
    [74, 75, 76],    // Geodude line
    [77, 78],        // Ponyta line
    [79, 80],        // Slowpoke line
    [81, 82],        // Magnemite line
    [84, 85],        // Doduo line
    [86, 87],        // Seel line
    [88, 89],        // Grimer line
    [90, 91],        // Shellder line
    [92, 93, 94],    // Gastly line
    [96, 97],        // Drowzee line
    [98, 99],        // Krabby line
    [100, 101],      // Voltorb line
    [102, 103],      // Exeggcute line
    [104, 105],      // Cubone line
    [109, 110],      // Koffing line
    [111, 112],      // Rhyhorn line
    [116, 117],      // Horsea line
    [118, 119],      // Goldeen line
    [120, 121],      // Staryu line
    [129, 130],      // Magikarp line
    [133, 134, 135, 136], // Eevee branches
    [138, 139],      // Omanyte line
    [140, 141],      // Kabuto line
    [147, 148, 149],  // Dratini line
  ];

  for (const c of chains) {
    if (c.includes(monId)) return c;
  }
  return [monId];
}

class PokedexManager {
  private seenSet: Set<number> = new Set();
  private caughtSet: Set<number> = new Set();
  private recentList: number[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const s = localStorage.getItem('pkmn_pokedex_seen');
      const c = localStorage.getItem('pkmn_pokedex_caught');
      const r = localStorage.getItem('pkmn_pokedex_recent');
      if (s) this.seenSet = new Set(JSON.parse(s));
      if (c) this.caughtSet = new Set(JSON.parse(c));
      if (r) this.recentList = JSON.parse(r);
    } catch { }

    // Seed starters as seen by default
    if (this.seenSet.size === 0) {
      [1, 4, 7, 25, 133].forEach(id => this.seenSet.add(id));
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('pkmn_pokedex_seen', JSON.stringify(Array.from(this.seenSet)));
      localStorage.setItem('pkmn_pokedex_caught', JSON.stringify(Array.from(this.caughtSet)));
      localStorage.setItem('pkmn_pokedex_recent', JSON.stringify(this.recentList.slice(0, 12)));
    } catch { }
  }

  public recordSeen(id: number): void {
    if (id < 1 || id > 151) return;
    this.seenSet.add(id);
    this.addRecent(id);
    this.saveToStorage();
  }

  public recordCaught(id: number): void {
    if (id < 1 || id > 151) return;
    this.seenSet.add(id);
    this.caughtSet.add(id);
    this.addRecent(id);
    this.saveToStorage();
  }

  private addRecent(id: number): void {
    this.recentList = [id, ...this.recentList.filter(x => x !== id)].slice(0, 8);
  }

  public isSeen(id: number): boolean {
    return this.seenSet.has(id);
  }

  public isCaught(id: number): boolean {
    return this.caughtSet.has(id);
  }

  public getStats(): { seen: number; caught: number; total: number; percent: number } {
    const total = 151;
    const seen = Math.min(total, Math.max(this.seenSet.size, this.caughtSet.size));
    const caught = Math.min(total, this.caughtSet.size);
    const percent = Math.round((caught / total) * 100);
    return { seen, caught, total, percent };
  }

  public getRecent(): number[] {
    if (this.recentList.length > 0) return this.recentList;
    return [1, 4, 7, 25, 133];
  }

  /**
   * Sync with player team & PC Box
   */
  public syncWithTeamAndBox(team: Array<{ id: number }>, pcBox: Array<{ id: number }>): void {
    for (const m of team) {
      this.recordCaught(m.id);
    }
    for (const m of pcBox) {
      this.recordCaught(m.id);
    }
  }

  public getPhysical(id: number): { height: string; weight: string } {
    const spec = POKEMON_SPECIES_MAP[id];
    if (SPECIES_PHYSICAL[id]) {
      return {
        height: `${SPECIES_PHYSICAL[id].h} m`,
        weight: `${SPECIES_PHYSICAL[id].w} kg`,
      };
    }
    // Estimated proportional to base stats
    const bst = spec ? calculateBaseStatTotal(spec) : 300;
    const h = (0.4 + (bst / 600) * 1.5).toFixed(1);
    const w = (5.0 + Math.pow(bst / 300, 2.5) * 25).toFixed(1);
    return { height: `${h} m`, weight: `${w} kg` };
  }
}

export const pokedexManager = new PokedexManager();
