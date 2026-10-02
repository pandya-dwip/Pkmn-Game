import { Inventory, PokemonInstance } from '../types';
import { healPokemon, revivePokemon } from '../entities/PokemonInstance';
import { getPokemonSpecies } from '../data/pokemon';
import { executeEvolution } from '../data/evolution';

export interface ItemUseResult {
  success: boolean;
  message: string;
  consumed: boolean;
  restoredHP?: number;
}

export class InventorySystem {
  public static canUseItemOnPokemon(
    inventory: Inventory,
    itemKey: string,
    mon: PokemonInstance
  ): boolean {
    if (itemKey === 'healthBerry') {
      return inventory.healthBerries > 0 && mon.currentHP > 0 && mon.currentHP < mon.maxHP;
    }
    if (itemKey === 'fullHealBerry') {
      return inventory.fullHealBerries > 0 && mon.currentHP > 0 && mon.currentHP < mon.maxHP;
    }
    if (itemKey === 'revive') {
      return inventory.revives > 0 && mon.currentHP <= 0;
    }

    // Evolution Stones
    if (inventory.stones[itemKey] && inventory.stones[itemKey] > 0) {
      const species = getPokemonSpecies(mon.speciesId);
      const stones = species.stoneEvolutions || [];
      return stones.some(s => s.stoneType === itemKey);
    }

    return false;
  }

  public static useItem(
    inventory: Inventory,
    itemKey: string,
    mon: PokemonInstance
  ): ItemUseResult {
    const species = getPokemonSpecies(mon.speciesId);
    const monName = species.name;

    if (itemKey === 'healthBerry') {
      if (inventory.healthBerries <= 0) return { success: false, message: 'No Health Berries remaining!', consumed: false };
      if (mon.currentHP <= 0) return { success: false, message: 'Cannot use berry on a fainted Pokémon!', consumed: false };
      if (mon.currentHP >= mon.maxHP) return { success: false, message: `${monName} is already at full health!`, consumed: false };

      inventory.healthBerries--;
      const gained = healPokemon(mon, 30);
      return {
        success: true,
        message: `Used Health Berry! ${monName} restored ${gained} HP.`,
        consumed: true,
        restoredHP: gained,
      };
    }

    if (itemKey === 'fullHealBerry') {
      if (inventory.fullHealBerries <= 0) return { success: false, message: 'No Full Heal Berries remaining!', consumed: false };
      if (mon.currentHP <= 0) return { success: false, message: 'Cannot use berry on a fainted Pokémon!', consumed: false };
      if (mon.currentHP >= mon.maxHP) return { success: false, message: `${monName} is already at full health!`, consumed: false };

      inventory.fullHealBerries--;
      const gained = healPokemon(mon, 100);
      return {
        success: true,
        message: `Used Full Heal Berry! ${monName} was fully healed (+${gained} HP).`,
        consumed: true,
        restoredHP: gained,
      };
    }

    if (itemKey === 'revive') {
      if (inventory.revives <= 0) return { success: false, message: 'No Revives remaining!', consumed: false };
      if (mon.currentHP > 0) return { success: false, message: `${monName} is not fainted!`, consumed: false };

      inventory.revives--;
      const revivedHP = revivePokemon(mon, 50);
      return {
        success: true,
        message: `Used Revive! ${monName} was revived with ${revivedHP} HP.`,
        consumed: true,
        restoredHP: revivedHP,
      };
    }

    // Evolution Stones
    if (inventory.stones[itemKey] && inventory.stones[itemKey] > 0) {
      const stones = species.stoneEvolutions || [];
      const match = stones.find(s => s.stoneType === itemKey);
      if (match) {
        inventory.stones[itemKey]--;
        const { newSpecies } = executeEvolution(mon, match.evolvesTo);
        return {
          success: true,
          message: `${monName} evolved into ${newSpecies.name} using the stone!`,
          consumed: true,
        };
      }
    }

    return { success: false, message: 'Item could not be used.', consumed: false };
  }
}
