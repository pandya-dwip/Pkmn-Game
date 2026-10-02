import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { TrainingSystem, TrainingType } from '../systems/TrainingSystem';
import { audioManager } from '../systems/AudioManager';
import { getPokemonSpecies } from '../data/pokemon';
import { ASSETS } from '../utils/AssetLoader';
import { PokemonInstance } from '../types';

export class TrainingScene extends Phaser.Scene {
  private viewOnly = false;
  private selectedMonIndex = 0;
  private monCardsContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;
  private sessionsText!: Phaser.GameObjects.Text;

  constructor() {
    super('TrainingScene');
  }

  public init(data: { viewOnly?: boolean }): void {
    this.viewOnly = data.viewOnly ?? false;
  }

  public create(): void {
    const { width, height } = this.scale;
    audioManager.playMusic('tournament');

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x111c38, 0x111c38, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const titleText = this.viewOnly ? 'POKÉMON COLLECTION' : 'TRAINING GROUNDS';
    const title = this.add.text(width / 2, 28, titleText, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    // Sessions Remaining Indicator
    this.sessionsText = this.add.text(
      width / 2,
      50,
      this.viewOnly
        ? `Owned: ${gameState.playerCollection.length} Pokémon`
        : `Training Sessions: ${gameState.trainingSessionsRemaining} / ${gameState.maxTrainingSessions}`,
      {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        color: '#94a3b8',
      }
    );
    this.sessionsText.setOrigin(0.5);

    // Horizontal Scroll / List of Pokémon Cards
    this.monCardsContainer = this.add.container(0, 72);
    this.renderMonList();

    // Detail & Training Actions Container
    this.detailContainer = this.add.container(width / 2, 220);
    this.renderSelectedMonDetail();

    // Footer Return / Back Button
    const backBtn = this.add.container(width / 2, height - 40);
    const backBg = this.add.graphics();
    backBg.fillStyle(0x334155, 1);
    backBg.fillRoundedRect(-100, -18, 200, 36, 10);
    backBtn.add(backBg);

    const backText = this.add.text(0, 0, '← BACK TO BRACKET', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    backText.setOrigin(0.5);
    backBtn.add(backText);

    backBg.setInteractive(new Phaser.Geom.Rectangle(-100, -18, 200, 36), Phaser.Geom.Rectangle.Contains);
    backBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      this.scene.start('TournamentScene');
    });
  }

  private renderMonList(): void {
    this.monCardsContainer.removeAll(true);
    const collection = gameState.playerCollection;
    const cardW = 76;
    const cardH = 88;
    const spacing = 84;

    const startX = Math.max(20, (this.scale.width - collection.length * spacing) / 2 + 38);

    collection.forEach((mon, index) => {
      const cardX = startX + index * spacing;
      const card = this.add.container(cardX, cardH / 2);

      const bg = this.add.graphics();
      const isSelected = index === this.selectedMonIndex;
      const isTeam = gameState.playerTeamIds.includes(mon.instanceId);

      bg.fillStyle(isSelected ? 0x1e293b : 0x0f172a, 0.95);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      bg.lineStyle(2, isSelected ? 0xffd54a : isTeam ? 0x22c55e : 0x334155, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      card.add(bg);

      const sprite = this.add.image(0, -12, ASSETS.pokemon(mon.speciesId));
      sprite.setDisplaySize(44, 44);
      card.add(sprite);

      const name = this.add.text(0, 16, getPokemonSpecies(mon.speciesId).name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      name.setOrigin(0.5);
      card.add(name);

      const lv = this.add.text(0, 28, `Lv.${mon.level}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        color: '#ffd54a',
      });
      lv.setOrigin(0.5);
      card.add(lv);

      bg.setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains
      );
      bg.on('pointerdown', () => {
        audioManager.playSelect();
        this.selectedMonIndex = index;
        this.renderMonList();
        this.renderSelectedMonDetail();
      });

      this.monCardsContainer.add(card);
    });
  }

  private renderSelectedMonDetail(): void {
    this.detailContainer.removeAll(true);
    const mon = gameState.playerCollection[this.selectedMonIndex];
    if (!mon) return;

    const species = getPokemonSpecies(mon.speciesId);
    const cardW = this.scale.width - 40;

    // Background Card
    const bg = this.add.graphics();
    bg.fillStyle(0x0e172e, 0.95);
    bg.fillRoundedRect(-cardW / 2, 0, cardW, 280, 12);
    bg.lineStyle(1.5, 0x334155, 1);
    bg.strokeRoundedRect(-cardW / 2, 0, cardW, 280, 12);
    this.detailContainer.add(bg);

    // Pokémon Big Sprite & Shadow
    const shadow = this.add.ellipse(0, 68, 90, 20, 0x000000, 0.4);
    this.detailContainer.add(shadow);

    const monSprite = this.add.image(0, 20, ASSETS.pokemon(mon.speciesId));
    monSprite.setDisplaySize(90, 90);
    this.detailContainer.add(monSprite);

    // Name & Stats Bar
    const nameText = this.add.text(0, 78, `${species.name} · Level ${mon.level}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    nameText.setOrigin(0.5);
    this.detailContainer.add(nameText);

    const statsLine = `HP: ${mon.currentHP}/${mon.maxHP}  ATK: ${mon.stats.attack}  DEF: ${mon.stats.defense}  SPE: ${mon.stats.speed}`;
    const statsText = this.add.text(0, 100, statsLine, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      color: '#cbd5e1',
    });
    statsText.setOrigin(0.5);
    this.detailContainer.add(statsText);

    // Team Toggle Button
    const isTeam = gameState.playerTeamIds.includes(mon.instanceId);
    const teamBtn = this.add.container(0, 126);
    const teamBg = this.add.graphics();
    teamBg.fillStyle(isTeam ? 0xd0281a : 0x22c55e, 0.9);
    teamBg.fillRoundedRect(-80, -12, 160, 26, 6);
    teamBtn.add(teamBg);

    const teamLabel = this.add.text(0, 0, isTeam ? 'REMOVE FROM TEAM' : '+ ADD TO BATTLE TEAM', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    teamLabel.setOrigin(0.5);
    teamBtn.add(teamLabel);

    teamBg.setInteractive(new Phaser.Geom.Rectangle(-80, -12, 160, 26), Phaser.Geom.Rectangle.Contains);
    teamBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      if (isTeam) {
        if (gameState.playerTeamIds.length > 1) {
          gameState.playerTeamIds = gameState.playerTeamIds.filter(id => id !== mon.instanceId);
        }
      } else {
        if (gameState.playerTeamIds.length < 6) {
          gameState.playerTeamIds.push(mon.instanceId);
        }
      }
      gameState.persist();
      this.renderMonList();
      this.renderSelectedMonDetail();
    });
    this.detailContainer.add(teamBtn);

    // 5 Training Action Buttons
    if (!this.viewOnly) {
      const trainY = 160;
      const trainingTypes: { type: TrainingType; label: string; color: number }[] = [
        { type: 'Strength', label: '⚔ STRENGTH (+ATK)', color: 0xe63946 },
        { type: 'Defense', label: '🛡 DEFENSE (+DEF)', color: 0x3a86ff },
        { type: 'Speed', label: '⚡ SPEED (+SPE)', color: 0xe0a800 },
        { type: 'HP', label: '❤️ HP (+MAX & HEAL)', color: 0x2a9d8f },
        { type: 'Technique', label: '✨ TECHNIQUE (+BONUS XP)', color: 0x9b5de5 },
      ];

      trainingTypes.forEach((tConf, idx) => {
        const by = trainY + idx * 22;
        const btn = this.add.container(0, by);

        const btnBg = this.add.graphics();
        const canTrain = gameState.trainingSessionsRemaining > 0;

        btnBg.fillStyle(canTrain ? tConf.color : 0x334155, 0.9);
        btnBg.fillRoundedRect(-cardW / 2 + 16, -9, cardW - 32, 18, 4);
        btn.add(btnBg);

        const label = this.add.text(0, 0, tConf.label, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#ffffff',
        });
        label.setOrigin(0.5);
        btn.add(label);

        if (canTrain) {
          btnBg.setInteractive(
            new Phaser.Geom.Rectangle(-cardW / 2 + 16, -9, cardW - 32, 18),
            Phaser.Geom.Rectangle.Contains
          );
          btnBg.on('pointerdown', () => {
            this.handleTraining(mon, tConf.type);
          });
        }

        this.detailContainer.add(btn);
      });
    }

    // Special Evolution Button (if qualifying for semi-final and opportunities left)
    if (gameState.specialEvolutionCount > 0 && gameState.currentRound >= 4) {
      const evoBtn = this.add.container(0, 255);
      const evoBg = this.add.graphics();
      evoBg.fillStyle(0xffd54a, 1);
      evoBg.fillRoundedRect(-110, -12, 220, 24, 6);
      evoBtn.add(evoBg);

      const evoText = this.add.text(0, 0, `✨ SPECIAL EVOLUTION (${gameState.specialEvolutionCount} LEFT)`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#070b18',
      });
      evoText.setOrigin(0.5);
      evoBtn.add(evoText);

      evoBg.setInteractive(new Phaser.Geom.Rectangle(-110, -12, 220, 24), Phaser.Geom.Rectangle.Contains);
      evoBg.on('pointerdown', () => {
        this.scene.start('EvolutionScene', { mon, isSpecial: true });
      });

      this.detailContainer.add(evoBtn);
    }
  }

  private handleTraining(mon: PokemonInstance, type: TrainingType): void {
    if (gameState.trainingSessionsRemaining <= 0) return;
    gameState.trainingSessionsRemaining--;
    audioManager.playSelect();

    const res = TrainingSystem.executeTraining(mon, type, gameState.currentRound);
    gameState.persist();

    this.sessionsText.setText(`Training Sessions: ${gameState.trainingSessionsRemaining} / ${gameState.maxTrainingSessions}`);

    if (res.levelUpResult) {
      audioManager.playLevelUp();
      this.showMessageDialog(
        `LEVEL UP!\n\n${mon.stats.maxHP > 0 ? getPokemonSpecies(mon.speciesId).name : ''} reached Lv. ${mon.level}!\n${res.statGain}`
      );
    } else {
      this.showMessageDialog(`TRAINING COMPLETE!\n\n${res.statGain}\n+${res.expGained} EXP gained.`);
    }

    this.renderMonList();
    this.renderSelectedMonDetail();
  }

  private showMessageDialog(message: string): void {
    const { width, height } = this.scale;
    const dialog = this.add.container(width / 2, height / 2);
    dialog.setDepth(300);

    const bg = this.add.graphics();
    bg.fillStyle(0x070b19, 0.95);
    bg.fillRoundedRect(-140, -60, 280, 120, 12);
    bg.lineStyle(2, 0xffd54a, 1);
    bg.strokeRoundedRect(-140, -60, 280, 120, 12);
    dialog.add(bg);

    const txt = this.add.text(0, -15, message, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 250 },
    });
    txt.setOrigin(0.5);
    dialog.add(txt);

    const okBtn = this.add.container(0, 36);
    const okBg = this.add.graphics();
    okBg.fillStyle(0xffd54a, 1);
    okBg.fillRoundedRect(-40, -12, 80, 24, 6);
    okBtn.add(okBg);

    const okLabel = this.add.text(0, 0, 'OK', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#070b18',
    });
    okLabel.setOrigin(0.5);
    okBtn.add(okLabel);

    okBg.setInteractive(new Phaser.Geom.Rectangle(-40, -12, 80, 24), Phaser.Geom.Rectangle.Contains);
    okBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      dialog.destroy();
    });
  }
}
