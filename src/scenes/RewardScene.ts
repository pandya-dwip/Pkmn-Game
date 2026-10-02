import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { generateRewardChoices, simulateTournamentRound } from '../data/trainers';
import { getPokemonSpecies } from '../data/pokemon';
import { audioManager } from '../systems/AudioManager';
import { ASSETS } from '../utils/AssetLoader';
import { PokemonInstance } from '../types';

export class RewardScene extends Phaser.Scene {
  private roundIndex = 0;
  private choices: PokemonInstance[] = [];

  constructor() {
    super('RewardScene');
  }

  public init(data: { roundIndex?: number }): void {
    this.roundIndex = data.roundIndex ?? 0;
  }

  public create(): void {
    const { width, height } = this.scale;
    audioManager.playMusic('tournament');

    // Simulate other AI matches in the 64-trainer bracket
    simulateTournamentRound(gameState.tournamentBracket);
    gameState.persist();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x111c38, 0x111c38, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(width / 2, 34, 'VICTORY REWARDS! ★', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const sub = this.add.text(width / 2, 60, 'Choose ONE Pokémon to recruit to your team:', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
    });
    sub.setOrigin(0.5);

    // Reward Items granted
    const itemsGranted = [
      { name: 'Health Berry', icon: '🍓', qty: 2 },
      { name: 'Full Heal Berry', icon: '✨', qty: 1 },
    ];
    if (this.roundIndex >= 2) {
      itemsGranted.push({ name: 'Revive', icon: '💊', qty: 1 });
    }

    // Apply items
    gameState.inventory.healthBerries += 2;
    gameState.inventory.fullHealBerries += 1;
    if (this.roundIndex >= 2) gameState.inventory.revives += 1;
    gameState.persist();

    // Item notification badge
    const itemMsg = this.add.text(
      width / 2,
      85,
      `+ Items Received: 🍓×2  ✨×1 ${this.roundIndex >= 2 ? ' 💊×1' : ''}`,
      {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        color: '#4ade80',
      }
    );
    itemMsg.setOrigin(0.5);

    // Generate 3 Pokémon choices
    const ownedIds = gameState.playerCollection.map(m => m.speciesId);
    this.choices = generateRewardChoices(this.roundIndex, ownedIds);

    const cardW = width - 48;
    const cardH = 88;
    const startY = 120;
    const spacing = 96;

    this.choices.forEach((mon, index) => {
      const species = getPokemonSpecies(mon.speciesId);
      const cardY = startY + index * spacing;

      const card = this.add.container(width / 2, cardY);
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x131a30, 0.95);
      cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      cardBg.lineStyle(1.5, 0x3a86ff, 0.8);
      cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      card.add(cardBg);

      // Mon Sprite
      const sprite = this.add.image(-cardW / 2 + 50, 0, ASSETS.pokemon(mon.speciesId));
      sprite.setDisplaySize(64, 64);
      card.add(sprite);

      // Name & Level
      const name = this.add.text(-cardW / 2 + 95, -24, `${species.name} (Lv. ${mon.level})`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      card.add(name);

      // Types & Stats
      const types = species.typesShort.join(' / ');
      const desc = this.add.text(
        -cardW / 2 + 95,
        0,
        `Type: ${types}   •   HP: ${mon.maxHP}   ATK: ${mon.stats.attack}`,
        {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '11px',
          color: '#94a3b8',
        }
      );
      card.add(desc);

      // Recruit Button
      const recruitBg = this.add.graphics();
      recruitBg.fillStyle(0x22c55e, 1);
      recruitBg.fillRoundedRect(-cardW / 2 + 95, 18, 90, 22, 6);
      card.add(recruitBg);

      const recruitText = this.add.text(-cardW / 2 + 140, 29, 'RECRUIT', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      recruitText.setOrigin(0.5);
      card.add(recruitText);

      cardBg.setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains
      );

      cardBg.on('pointerdown', () => {
        audioManager.playSelect();
        this.claimReward(mon);
      });
    });

    // Skip / Continue without picking
    const skipBtn = this.add.container(width / 2, height - 36);
    const skipText = this.add.text(0, 0, 'SKIP POKÉMON SELECTION →', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      color: '#64748b',
    });
    skipText.setOrigin(0.5);
    skipBtn.add(skipText);

    skipText.setInteractive();
    skipText.on('pointerdown', () => {
      audioManager.playButtonClick();
      this.scene.start('TournamentScene');
    });
  }

  private claimReward(mon: PokemonInstance): void {
    audioManager.playPokemonCry(mon.speciesId, 'win');
    gameState.addPokemonToCollection(mon);

    this.scene.start('TournamentScene');
  }
}
