import { sound } from '../audio/SoundSynthesizer';
import { GameSettings } from '../types';

export class AudioManager {
  private static instance: AudioManager;
  private settings: GameSettings = {
    musicOn: true,
    sfxOn: true,
    pokemonSoundsOn: true,
    musicVolume: 0.6,
    sfxVolume: 0.7,
    pokemonVolume: 0.6,
  };

  private constructor() {
    this.loadAudioSettings();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public unlockAudio(): void {
    sound.unlock();
  }

  public playMusic(theme: string): void {
    sound.music(theme);
  }

  public stopMusic(): void {
    // handled via music switches
  }

  public playButtonClick(): void {
    sound.beep(660, 0.08);
  }

  public playSelect(): void {
    sound.beep(880, 0.1);
  }

  public playAttackSound(moveType: string, stage: 'charge' | 'launch' | 'impact', power: number = 60): void {
    sound.sfxA(stage === 'charge' ? 'c' : stage === 'launch' ? 'l' : 'i', { t: moveType, p: power }, 'spark', 0.5, 1);
  }

  public playHitSound(effectiveness: number, critical: boolean): void {
    if (critical) sound.swp(900, 300, 0.3, 'square', 0.1);
  }

  public playPokemonCry(speciesId: number, mood: 'intro' | 'attack' | 'hit' | 'faint' | 'win' = 'intro'): void {
    const k = mood === 'intro' ? 'in' : mood === 'attack' ? 'atk' : mood === 'hit' ? 'hit' : mood === 'faint' ? 'faint' : 'win';
    sound.cry(speciesId, k);
  }

  public playLevelUp(): void {
    [0, 0.12, 0.24].forEach((d, j) => sound.beep(660 + j * 220, 0.25, 'square', 0.06, d));
  }

  public playEvolution(): void {
    sound.beep(880, 0.4, 'triangle', 0.12);
  }

  public playItemUse(): void {
    sound.swp(400, 800, 0.2, 'sine', 0.1);
  }

  public setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    sound.AU.m = this.settings.musicVolume;
    sound.applyVol();
    this.saveAudioSettings();
  }

  public setSFXVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    sound.AU.s = this.settings.sfxVolume;
    sound.applyVol();
    this.saveAudioSettings();
  }

  public setPokemonVolume(volume: number): void {
    this.settings.pokemonVolume = Math.max(0, Math.min(1, volume));
    sound.AU.p = this.settings.pokemonVolume;
    sound.applyVol();
    this.saveAudioSettings();
  }

  public toggleMusic(enabled?: boolean): boolean {
    this.settings.musicOn = enabled !== undefined ? enabled : !this.settings.musicOn;
    this.saveAudioSettings();
    return this.settings.musicOn;
  }

  public toggleSFX(enabled?: boolean): boolean {
    this.settings.sfxOn = enabled !== undefined ? enabled : !this.settings.sfxOn;
    this.saveAudioSettings();
    return this.settings.sfxOn;
  }

  public togglePokemonSounds(enabled?: boolean): boolean {
    this.settings.pokemonSoundsOn = enabled !== undefined ? enabled : !this.settings.pokemonSoundsOn;
    this.saveAudioSettings();
    return this.settings.pokemonSoundsOn;
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    sound.AU.m = settings.musicVolume;
    sound.AU.s = settings.sfxVolume;
    sound.AU.p = settings.pokemonVolume;
    sound.applyVol();
    this.saveAudioSettings();
  }

  private saveAudioSettings(): void {
    try {
      localStorage.setItem('kanto_audio_settings', JSON.stringify(this.settings));
    } catch {}
  }

  private loadAudioSettings(): void {
    try {
      const data = localStorage.getItem('kanto_audio_settings');
      if (data) {
        const parsed = JSON.parse(data);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch {}
  }
}

export const audioManager = AudioManager.getInstance();
