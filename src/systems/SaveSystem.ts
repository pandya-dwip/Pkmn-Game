import { GameSaveData, ChampionshipRecord, GameSettings, PokemonInstance, Inventory, TournamentBracket } from '../types';

const SAVE_KEY = 'kanto_tournament_save_v1';
const CHAMPIONSHIP_KEY = 'kanto_championship_records';

export class SaveSystem {
  private static instance: SaveSystem;

  private constructor() {}

  public static getInstance(): SaveSystem {
    if (!SaveSystem.instance) {
      SaveSystem.instance = new SaveSystem();
    }
    return SaveSystem.instance;
  }

  public hasSave(): boolean {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return false;
      const parsed = JSON.parse(data);
      return !!(parsed && parsed.version && parsed.playerCollection && parsed.playerCollection.length > 0);
    } catch {
      return false;
    }
  }

  public saveGame(data: Partial<GameSaveData>): boolean {
    try {
      const existing = this.loadGame();
      const payload: GameSaveData = {
        version: 1,
        savedAt: new Date().toISOString(),
        currentRound: data.currentRound ?? existing?.currentRound ?? 0,
        currentPhase: data.currentPhase ?? existing?.currentPhase ?? 'BRACKET',
        playerCollection: data.playerCollection ?? existing?.playerCollection ?? [],
        playerTeamIds: data.playerTeamIds ?? existing?.playerTeamIds ?? [],
        activePokemonId: data.activePokemonId ?? existing?.activePokemonId ?? '',
        inventory: data.inventory ?? existing?.inventory ?? {
          healthBerries: 2,
          sitrusBerries: 2,
          enigmaBerries: 1,
          fullHealBerries: 2,
          revives: 2,
          stones: {},
        },
        trainingSessionsRemaining: data.trainingSessionsRemaining ?? existing?.trainingSessionsRemaining ?? 5,
        maxTrainingSessions: data.maxTrainingSessions ?? existing?.maxTrainingSessions ?? 5,
        specialEvolutionCount: data.specialEvolutionCount ?? existing?.specialEvolutionCount ?? 0,
        tournamentBracket: data.tournamentBracket ?? existing?.tournamentBracket ?? ({} as TournamentBracket),
        settings: data.settings ?? existing?.settings ?? {
          musicOn: true,
          sfxOn: true,
          pokemonSoundsOn: true,
          musicVolume: 0.6,
          sfxVolume: 0.7,
          pokemonVolume: 0.6,
        },
        championshipHistory: data.championshipHistory ?? existing?.championshipHistory ?? this.loadChampionshipHistory(),
        lastBattleStats: data.lastBattleStats ?? existing?.lastBattleStats,
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('SaveSystem: Failed to save game', e);
      return false;
    }
  }

  public loadGame(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed: GameSaveData = JSON.parse(raw);
      if (!parsed || !parsed.playerCollection || !Array.isArray(parsed.playerCollection)) {
        return null;
      }
      return parsed;
    } catch (e) {
      console.warn('SaveSystem: Corrupted save data detected. Recovering gracefully.', e);
      return null;
    }
  }

  public deleteSave(): boolean {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  public saveChampionshipRecord(record: ChampionshipRecord): void {
    try {
      const history = this.loadChampionshipHistory();
      history.unshift(record);
      localStorage.setItem(CHAMPIONSHIP_KEY, JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.warn('SaveSystem: Failed to save championship record', e);
    }
  }

  public loadChampionshipHistory(): ChampionshipRecord[] {
    try {
      const raw = localStorage.getItem(CHAMPIONSHIP_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export const saveSystem = SaveSystem.getInstance();
