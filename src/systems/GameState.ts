import {
  GameSaveData,
  PokemonInstance,
  Inventory,
  TournamentBracket,
  GameSettings,
  ChampionshipRecord,
} from '../types';
import { saveSystem } from './SaveSystem';
import { generateTournamentBracket } from '../data/trainers';

export class GameState {
  private static instance: GameState;

  public currentRound: number = 0; // 0 to 5
  public currentPhase: string = 'MENU';
  public playerCollection: PokemonInstance[] = [];
  public playerTeamIds: string[] = [];
  public activePokemonId: string = '';
  public inventory: Inventory = {
    healthBerries: 3,
    fullHealBerries: 2,
    revives: 2,
    stones: {},
  };
  public trainingSessionsRemaining: number = 5;
  public maxTrainingSessions: number = 5;
  public specialEvolutionCount: number = 0;
  public tournamentBracket: TournamentBracket = generateTournamentBracket();
  public settings: GameSettings = {
    musicOn: true,
    sfxOn: true,
    pokemonSoundsOn: true,
    musicVolume: 0.6,
    sfxVolume: 0.7,
    pokemonVolume: 0.6,
  };
  public championshipHistory: ChampionshipRecord[] = [];
  public lastBattleRewards?: {
    exp: number;
    items: string[];
  };

  private constructor() {
    this.championshipHistory = saveSystem.loadChampionshipHistory();
  }

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public getPlayerTeam(): PokemonInstance[] {
    const team = this.playerTeamIds
      .map(id => this.playerCollection.find(m => m.instanceId === id))
      .filter((m): m is PokemonInstance => m !== undefined);

    if (team.length === 0 && this.playerCollection.length > 0) {
      // Default to first collection mon
      this.playerTeamIds = [this.playerCollection[0].instanceId];
      this.activePokemonId = this.playerCollection[0].instanceId;
      return [this.playerCollection[0]];
    }

    return team;
  }

  public getActivePokemon(): PokemonInstance {
    const team = this.getPlayerTeam();
    const active = team.find(m => m.instanceId === this.activePokemonId);
    if (active) return active;
    if (team[0]) {
      this.activePokemonId = team[0].instanceId;
      return team[0];
    }
    return this.playerCollection[0];
  }

  public addPokemonToCollection(mon: PokemonInstance): void {
    this.playerCollection.push(mon);
    // If team has fewer than 6, auto-add
    if (this.playerTeamIds.length < 6) {
      this.playerTeamIds.push(mon.instanceId);
    }
    if (!this.activePokemonId) {
      this.activePokemonId = mon.instanceId;
    }
    this.persist();
  }

  public initNewGame(starterMon: PokemonInstance): void {
    this.currentRound = 0;
    this.currentPhase = 'BRACKET';
    this.playerCollection = [starterMon];
    this.playerTeamIds = [starterMon.instanceId];
    this.activePokemonId = starterMon.instanceId;
    this.inventory = {
      healthBerries: 3,
      fullHealBerries: 2,
      revives: 2,
      stones: {},
    };
    this.trainingSessionsRemaining = 5;
    this.maxTrainingSessions = 5;
    this.specialEvolutionCount = 0;
    this.tournamentBracket = generateTournamentBracket();
    this.persist();
  }

  public loadSavedGame(): boolean {
    const data = saveSystem.loadGame();
    if (!data) return false;

    this.currentRound = data.currentRound;
    this.currentPhase = data.currentPhase;
    this.playerCollection = data.playerCollection;
    this.playerTeamIds = data.playerTeamIds;
    this.activePokemonId = data.activePokemonId;
    this.inventory = data.inventory;
    this.trainingSessionsRemaining = data.trainingSessionsRemaining;
    this.maxTrainingSessions = data.maxTrainingSessions;
    this.specialEvolutionCount = data.specialEvolutionCount;
    this.tournamentBracket = data.tournamentBracket || generateTournamentBracket();
    this.settings = data.settings;
    this.championshipHistory = data.championshipHistory || [];
    return true;
  }

  public persist(): void {
    const saveData: GameSaveData = {
      version: 1,
      savedAt: new Date().toISOString(),
      currentRound: this.currentRound,
      currentPhase: this.currentPhase,
      playerCollection: this.playerCollection,
      playerTeamIds: this.playerTeamIds,
      activePokemonId: this.activePokemonId,
      inventory: this.inventory,
      trainingSessionsRemaining: this.trainingSessionsRemaining,
      maxTrainingSessions: this.maxTrainingSessions,
      specialEvolutionCount: this.specialEvolutionCount,
      tournamentBracket: this.tournamentBracket,
      settings: this.settings,
      championshipHistory: this.championshipHistory,
      lastBattleStats: this.lastBattleRewards
        ? {
            expEarned: this.lastBattleRewards.exp,
            itemsEarned: this.lastBattleRewards.items,
          }
        : undefined,
    };
    saveSystem.saveGame(saveData);
  }
}

export const gameState = GameState.getInstance();
