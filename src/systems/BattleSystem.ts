import { BattleAction, Inventory, MoveData, PokemonInstance } from '../types';
import { MOVES_DATA } from '../data/moves';
import { calculateDamage, DamageCalculation } from '../utils/DamageCalculator';
import { getPokemonSpecies } from '../data/pokemon';
import { calculateTypeEffectiveness } from '../data/types';
import { addExperience, LevelUpResult } from '../entities/PokemonInstance';
import { InventorySystem } from './InventorySystem';

export interface BattleTurnStep {
  actor: 'player' | 'opponent';
  actionType: 'MOVE' | 'SWITCH' | 'ITEM';
  move?: MoveData;
  damageResult?: DamageCalculation;
  targetFainted?: boolean;
  switchTargetId?: string;
  itemResult?: { message: string; restoredHP?: number };
  message: string;
}

export interface BattleTurnResult {
  steps: BattleTurnStep[];
  battleOver: boolean;
  winner?: 'player' | 'opponent';
  expGains?: { pokemon: PokemonInstance; exp: number; levelUp?: LevelUpResult }[];
}

export class BattleSystem {
  public playerTeam: PokemonInstance[];
  public opponentTeam: PokemonInstance[];
  public activePlayerMonId: string;
  public activeOpponentMonId: string;
  public opponentTrainerName: string;
  public opponentAILevel: number;
  public opponentBerries: number;
  public participants: Set<string> = new Set();
  public inventory: Inventory;

  constructor(
    playerTeam: PokemonInstance[],
    opponentTeam: PokemonInstance[],
    initialPlayerMonId: string,
    opponentTrainerName: string,
    opponentAILevel: number,
    opponentBerries: number,
    inventory: Inventory
  ) {
    this.playerTeam = playerTeam;
    this.opponentTeam = opponentTeam;
    this.activePlayerMonId = initialPlayerMonId;
    this.activeOpponentMonId = opponentTeam[0]?.instanceId || '';
    this.opponentTrainerName = opponentTrainerName;
    this.opponentAILevel = opponentAILevel;
    this.opponentBerries = opponentBerries;
    this.inventory = inventory;

    this.participants.add(this.activePlayerMonId);
  }

  public getActivePlayerMon(): PokemonInstance {
    return this.playerTeam.find(m => m.instanceId === this.activePlayerMonId) || this.playerTeam[0];
  }

  public getActiveOpponentMon(): PokemonInstance {
    return this.opponentTeam.find(m => m.instanceId === this.activeOpponentMonId) || this.opponentTeam[0];
  }

  public isPlayerTeamDefeated(): boolean {
    return this.playerTeam.every(m => m.currentHP <= 0);
  }

  public isOpponentTeamDefeated(): boolean {
    return this.opponentTeam.every(m => m.currentHP <= 0);
  }

  public getAvailablePlayerSwitches(): PokemonInstance[] {
    return this.playerTeam.filter(m => m.instanceId !== this.activePlayerMonId && m.currentHP > 0);
  }

  public switchPlayerMon(newInstanceId: string): void {
    this.activePlayerMonId = newInstanceId;
    this.participants.add(newInstanceId);
  }

  public switchOpponentMon(newInstanceId: string): void {
    this.activeOpponentMonId = newInstanceId;
  }

  /**
   * Generates AI action for the opponent based on difficulty level, moves, and health.
   */
  public selectOpponentAction(): { action: 'MOVE' | 'SWITCH' | 'BERRY'; move?: MoveData; switchTargetId?: string } {
    const opp = this.getActiveOpponentMon();
    const player = this.getActivePlayerMon();
    const oppSpecies = getPokemonSpecies(opp.speciesId);
    const playerSpecies = getPokemonSpecies(player.speciesId);

    // 1. Berry check (if below 30% HP and berries available)
    if (this.opponentBerries > 0 && opp.currentHP < opp.maxHP * 0.3 && Math.random() < 0.7) {
      return { action: 'BERRY' };
    }

    // 2. Intelligent switching check if severely disadvantaged
    if (this.opponentAILevel >= 2) {
      const aliveOtherMons = this.opponentTeam.filter(m => m.instanceId !== opp.instanceId && m.currentHP > 0);
      const isWeakAgainstPlayer = playerSpecies.typesShort.some(
        pt => calculateTypeEffectiveness(pt, oppSpecies.typesShort) > 1.5
      );

      if (aliveOtherMons.length > 0 && isWeakAgainstPlayer && Math.random() < 0.35) {
        // Find best counter in team
        const bestCounter = aliveOtherMons.reduce((best, candidate) => {
          const candidateSpecies = getPokemonSpecies(candidate.speciesId);
          const candidateOffense = candidateSpecies.typesShort.reduce(
            (max, ct) => Math.max(max, calculateTypeEffectiveness(ct, playerSpecies.typesShort)),
            1
          );
          return candidateOffense > best.score ? { mon: candidate, score: candidateOffense } : best;
        }, { mon: aliveOtherMons[0], score: 0 });

        if (bestCounter.score > 1) {
          return { action: 'SWITCH', switchTargetId: bestCounter.mon.instanceId };
        }
      }
    }

    // 3. Move selection: Evaluate best move based on effectiveness & power
    const moves = opp.moves.map(name => MOVES_DATA[name]).filter(Boolean);
    if (moves.length === 0) {
      return { action: 'MOVE', move: MOVES_DATA['Tackle'] };
    }

    if (this.opponentAILevel === 0 || Math.random() < 0.2) {
      // Random move
      const chosen = moves[Math.floor(Math.random() * moves.length)];
      return { action: 'MOVE', move: chosen };
    }

    // Score moves
    let bestMove = moves[0];
    let bestScore = -1;

    for (const move of moves) {
      const eff = calculateTypeEffectiveness(move.typeShort, playerSpecies.typesShort);
      const isStab = oppSpecies.typesShort.includes(move.typeShort) ? 1.5 : 1.0;
      const score = move.power * (move.accuracy / 100) * eff * isStab * (0.8 + Math.random() * 0.4);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return { action: 'MOVE', move: bestMove };
  }

  /**
   * Executes a complete turn: exactly ONE player action and ONE opponent action.
   */
  public executeTurn(playerAction: BattleAction): BattleTurnResult {
    const steps: BattleTurnStep[] = [];
    const playerMon = this.getActivePlayerMon();
    const oppMon = this.getActiveOpponentMon();
    const playerSpecies = getPokemonSpecies(playerMon.speciesId);
    const oppSpecies = getPokemonSpecies(oppMon.speciesId);

    // Determine opponent's action
    const opponentAI = this.selectOpponentAction();

    // Determine priority / order
    // Non-move actions (switch, item) happen first
    const isPlayerPriorityAction = playerAction.type !== 'FIGHT';
    const isOpponentPriorityAction = opponentAI.action !== 'MOVE';

    let playerGoesFirst = true;

    if (isPlayerPriorityAction && !isOpponentPriorityAction) {
      playerGoesFirst = true;
    } else if (!isPlayerPriorityAction && isOpponentPriorityAction) {
      playerGoesFirst = false;
    } else if (playerAction.type === 'FIGHT' && opponentAI.action === 'MOVE') {
      const pMove = playerAction.move || MOVES_DATA[playerMon.moves[0]] || MOVES_DATA['Tackle'];
      const oMove = opponentAI.move || MOVES_DATA[oppMon.moves[0]] || MOVES_DATA['Tackle'];

      if (pMove.priority !== oMove.priority) {
        playerGoesFirst = pMove.priority > oMove.priority;
      } else {
        // Speed check (tie goes random)
        playerGoesFirst = playerMon.stats.speed === oppMon.stats.speed
          ? Math.random() < 0.5
          : playerMon.stats.speed > oppMon.stats.speed;
      }
    }

    const executePlayerAction = (): boolean => {
      const activeP = this.getActivePlayerMon();
      const activeO = this.getActiveOpponentMon();

      if (activeP.currentHP <= 0) return false;

      if (playerAction.type === 'POKEMON' && playerAction.switchIndex !== undefined) {
        const targetMon = this.playerTeam[playerAction.switchIndex];
        if (targetMon && targetMon.currentHP > 0 && targetMon.instanceId !== activeP.instanceId) {
          const oldName = getPokemonSpecies(activeP.speciesId).name;
          this.switchPlayerMon(targetMon.instanceId);
          const newName = getPokemonSpecies(targetMon.speciesId).name;
          steps.push({
            actor: 'player',
            actionType: 'SWITCH',
            switchTargetId: targetMon.instanceId,
            message: `Come back, ${oldName}! Go, ${newName}!`,
          });
          return true;
        }
      }

      if (playerAction.type === 'BAG' && playerAction.itemKey) {
        const targetMon = playerAction.targetPokemonIndex !== undefined
          ? this.playerTeam[playerAction.targetPokemonIndex]
          : activeP;

        if (targetMon) {
          const res = InventorySystem.useItem(this.inventory, playerAction.itemKey, targetMon);
          steps.push({
            actor: 'player',
            actionType: 'ITEM',
            itemResult: { message: res.message, restoredHP: res.restoredHP },
            message: res.message,
          });
          return true;
        }
      }

      if (playerAction.type === 'FIGHT') {
        const move = playerAction.move || MOVES_DATA[activeP.moves[0]] || MOVES_DATA['Tackle'];
        const dmg = calculateDamage(activeP, activeO, move);
        if (dmg.isHit && dmg.effectiveness > 0) {
          activeO.currentHP = Math.max(0, activeO.currentHP - dmg.damage);
        }

        const targetFainted = activeO.currentHP <= 0;
        if (targetFainted) {
          activeO.status = 'FAINTED';
        }

        let effMsg = '';
        if (!dmg.isHit) effMsg = 'The attack missed!';
        else if (dmg.effectiveness === 0) effMsg = 'It had no effect!';
        else if (dmg.effectiveness > 1.5) effMsg = "It's super effective!";
        else if (dmg.effectiveness < 1.0) effMsg = "It's not very effective...";

        steps.push({
          actor: 'player',
          actionType: 'MOVE',
          move,
          damageResult: dmg,
          targetFainted,
          message: `${getPokemonSpecies(activeP.speciesId).name} used ${move.name}! ${effMsg}${dmg.isCritical ? ' Critical hit!' : ''}`,
        });

        return !targetFainted; // Returns true if opponent is still alive to act
      }

      return true;
    };

    const executeOpponentAction = (): boolean => {
      const activeP = this.getActivePlayerMon();
      const activeO = this.getActiveOpponentMon();

      if (activeO.currentHP <= 0) return false;

      if (opponentAI.action === 'BERRY') {
        this.opponentBerries--;
        const healAmt = Math.min(activeO.maxHP - activeO.currentHP, Math.ceil(activeO.maxHP * 0.3));
        activeO.currentHP += healAmt;
        steps.push({
          actor: 'opponent',
          actionType: 'ITEM',
          itemResult: { message: `${this.opponentTrainerName} used a Health Berry!`, restoredHP: healAmt },
          message: `${this.opponentTrainerName} used a Health Berry! ${getPokemonSpecies(activeO.speciesId).name} restored ${healAmt} HP.`,
        });
        return true;
      }

      if (opponentAI.action === 'SWITCH' && opponentAI.switchTargetId) {
        const oldName = getPokemonSpecies(activeO.speciesId).name;
        this.switchOpponentMon(opponentAI.switchTargetId);
        const newMon = this.getActiveOpponentMon();
        const newName = getPokemonSpecies(newMon.speciesId).name;
        steps.push({
          actor: 'opponent',
          actionType: 'SWITCH',
          switchTargetId: newMon.instanceId,
          message: `${this.opponentTrainerName} withdrew ${oldName} and sent out ${newName}!`,
        });
        return true;
      }

      if (opponentAI.action === 'MOVE') {
        const move = opponentAI.move || MOVES_DATA[activeO.moves[0]] || MOVES_DATA['Tackle'];
        const dmg = calculateDamage(activeO, activeP, move);
        if (dmg.isHit && dmg.effectiveness > 0) {
          activeP.currentHP = Math.max(0, activeP.currentHP - dmg.damage);
        }

        const targetFainted = activeP.currentHP <= 0;
        if (targetFainted) {
          activeP.status = 'FAINTED';
        }

        let effMsg = '';
        if (!dmg.isHit) effMsg = 'The attack missed!';
        else if (dmg.effectiveness === 0) effMsg = 'It had no effect!';
        else if (dmg.effectiveness > 1.5) effMsg = "It's super effective!";
        else if (dmg.effectiveness < 1.0) effMsg = "It's not very effective...";

        steps.push({
          actor: 'opponent',
          actionType: 'MOVE',
          move,
          damageResult: dmg,
          targetFainted,
          message: `Foe ${getPokemonSpecies(activeO.speciesId).name} used ${move.name}! ${effMsg}${dmg.isCritical ? ' Critical hit!' : ''}`,
        });

        return !targetFainted;
      }

      return true;
    };

    // Execute in verified order: Exactly one opponent action per player action!
    if (playerGoesFirst) {
      const oppCanStillAct = executePlayerAction();
      if (oppCanStillAct && this.getActiveOpponentMon().currentHP > 0) {
        executeOpponentAction();
      }
    } else {
      const playerCanStillAct = executeOpponentAction();
      if (playerCanStillAct && this.getActivePlayerMon().currentHP > 0) {
        executePlayerAction();
      }
    }

    // Check for battle termination
    const playerDefeated = this.isPlayerTeamDefeated();
    const opponentDefeated = this.isOpponentTeamDefeated();

    if (playerDefeated || opponentDefeated) {
      const winner = opponentDefeated ? 'player' : 'opponent';
      let expGains: { pokemon: PokemonInstance; exp: number; levelUp?: LevelUpResult }[] | undefined;

      if (winner === 'player') {
        // Distribute EXP to all player Pokémon that participated in this battle
        expGains = [];
        const totalOpponentLevels = this.opponentTeam.reduce((acc, m) => acc + m.level, 0);
        const expPerParticipant = Math.round((totalOpponentLevels * 18) / Math.max(1, this.participants.size));

        for (const monId of this.participants) {
          const mon = this.playerTeam.find(m => m.instanceId === monId);
          if (mon && mon.currentHP > 0) {
            const levelUpResult = addExperience(mon, expPerParticipant);
            expGains.push({
              pokemon: mon,
              exp: expPerParticipant,
              levelUp: levelUpResult.leveledUp ? levelUpResult : undefined,
            });
          }
        }
      }

      return {
        steps,
        battleOver: true,
        winner,
        expGains,
      };
    }

    return {
      steps,
      battleOver: false,
    };
  }

  /**
   * Automatically brings in the opponent's next alive Pokémon after one faints.
   */
  public autoDeployNextOpponentMon(): PokemonInstance | null {
    const next = this.opponentTeam.find(m => m.currentHP > 0);
    if (next) {
      this.activeOpponentMonId = next.instanceId;
      return next;
    }
    return null;
  }
}
