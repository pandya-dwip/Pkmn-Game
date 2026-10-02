import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { TOURNAMENT_ROUNDS } from '../data/trainers';
import { audioManager } from '../systems/AudioManager';
import { ASSETS } from '../utils/AssetLoader';

export class TournamentScene extends Phaser.Scene {
  constructor() {
    super('TournamentScene');
  }

  public create(): void {
    const { width, height } = this.scale;
    audioManager.playMusic('tournament');

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x111c38, 0x111c38, 1);
    bg.fillRect(0, 0, width, height);

    const roundIndex = gameState.currentRound;
    const roundConfig = TOURNAMENT_ROUNDS[roundIndex] || TOURNAMENT_ROUNDS[0];

    // Header Title
    const title = this.add.text(width / 2, 28, 'KANTO TOURNAMENT 🏆', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const trainersLeft = gameState.tournamentBracket.activeList.length;
    const stageSub = this.add.text(width / 2, 52, `${roundConfig.name.toUpperCase()} · ${trainersLeft} Trainers Remain`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    });
    stageSub.setOrigin(0.5);

    // 1. Next Opponent Card
    this.createOpponentCard(width, 76, roundConfig);

    // 2. Bracket Visualization Panel
    this.createBracketPanel(width, 180, height - 310);

    // 3. Player Stats & Inventory Footer Bar
    this.createPlayerStatusBar(width, height - 120);

    // 4. Action Buttons (TRAIN / BATTLE)
    this.createActionButtons(width, height - 55);
  }

  private createOpponentCard(width: number, y: number, roundConfig: (typeof TOURNAMENT_ROUNDS)[0]): void {
    const cardW = width - 36;
    const cardH = 88;
    const cardX = 18;

    const bg = this.add.graphics();
    bg.fillStyle(0x0e172e, 0.95);
    bg.fillRoundedRect(cardX, y, cardW, cardH, 12);
    bg.lineStyle(1.5, 0xff5030, 0.9);
    bg.strokeRoundedRect(cardX, y, cardW, cardH, 12);

    // Opponent Details from Bracket
    const activeList = gameState.tournamentBracket.activeList;
    const opponentId = activeList.find(id => id !== 0) ?? 1;
    const oppTrainer = gameState.tournamentBracket.trainers[opponentId] || {
      name: 'Trainer Rival',
      avatar: '⭐',
      style: 'Aggressive',
    };

    const header = this.add.text(cardX + 14, y + 10, '⚔ NEXT OPPONENT REVEALED', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ff7a50',
    });

    const nameText = this.add.text(cardX + 14, y + 30, `${oppTrainer.avatar} ${oppTrainer.name}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
    });

    const detailText = this.add.text(
      cardX + 14,
      y + 56,
      `Style: ${oppTrainer.style}   •   Team Size: ${roundConfig.teamSize} Pokémon   •   Avg Lv.${roundConfig.baseLevel}`,
      {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        color: '#94a3b8',
      }
    );
  }

  private createBracketPanel(width: number, y: number, height: number): void {
    const cardW = width - 36;
    const cardX = 18;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1022, 0.9);
    bg.fillRoundedRect(cardX, y, cardW, height, 12);
    bg.lineStyle(1, 0x1e293b, 1);
    bg.strokeRoundedRect(cardX, y, cardW, height, 12);

    const bracketHeader = this.add.text(cardX + 14, y + 10, 'TOURNAMENT BRACKET PROGRESSION', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });

    // Vertical visual bracket ladder
    const roundsList = ['Round 1 (64)', 'Round 2 (32)', 'Round 3 (16)', 'Quarter Final (8)', 'Semi Final (4)', 'Championship (2)'];
    const curRound = gameState.currentRound;

    const slotH = (height - 40) / roundsList.length;

    roundsList.forEach((rName, idx) => {
      const slotY = y + 34 + idx * slotH;
      const isPast = idx < curRound;
      const isCurrent = idx === curRound;
      const isFuture = idx > curRound;

      const slotBg = this.add.graphics();
      let fillColor = 0x131a30;
      let strokeColor = 0x334155;
      let statusText = '???';
      let textColor = '#64748b';

      if (isPast) {
        fillColor = 0x0f291e;
        strokeColor = 0x22c55e;
        statusText = '✓ ADVANCED';
        textColor = '#4ade80';
      } else if (isCurrent) {
        fillColor = 0x3d2708;
        strokeColor = 0xf59e0b;
        statusText = '★ YOUR MATCH';
        textColor = '#fbbf24';
      }

      slotBg.fillStyle(fillColor, 0.9);
      slotBg.fillRoundedRect(cardX + 12, slotY, cardW - 24, slotH - 6, 8);
      slotBg.lineStyle(1.5, strokeColor, 0.9);
      slotBg.strokeRoundedRect(cardX + 12, slotY, cardW - 24, slotH - 6, 8);

      this.add.text(cardX + 22, slotY + (slotH - 6) / 2, rName, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontStyle: isCurrent ? 'bold' : 'normal',
        color: isCurrent ? '#ffffff' : textColor,
      }).setOrigin(0, 0.5);

      this.add.text(cardX + cardW - 24, slotY + (slotH - 6) / 2, statusText, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: textColor,
      }).setOrigin(1, 0.5);
    });
  }

  private createPlayerStatusBar(width: number, y: number): void {
    const cardW = width - 36;
    const cardX = 18;

    const bg = this.add.graphics();
    bg.fillStyle(0x0e172e, 0.95);
    bg.fillRoundedRect(cardX, y, cardW, 52, 10);
    bg.lineStyle(1, 0x334155, 0.8);
    bg.strokeRoundedRect(cardX, y, cardW, 52, 10);

    const team = gameState.getPlayerTeam();
    const inv = gameState.inventory;

    const info1 = `Team: ${team.length} Pokémon   •   Owned: ${gameState.playerCollection.length}`;
    const info2 = `Training: ${gameState.trainingSessionsRemaining}/${gameState.maxTrainingSessions}   •   🍓${inv.healthBerries}  ✨${inv.fullHealBerries}  💊${inv.revives}`;

    this.add.text(cardX + 14, y + 10, info1, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });

    this.add.text(cardX + 14, y + 28, info2, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      color: '#94a3b8',
    });
  }

  private createActionButtons(width: number, y: number): void {
    const btnW = (width - 48) / 2;
    const btnH = 46;

    // 1. Train / Manage Button
    const trainBtn = this.add.container(24 + btnW / 2, y);
    const trainBg = this.add.graphics();
    trainBg.fillStyle(0x2a9d8f, 1);
    trainBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    trainBg.lineStyle(1.5, 0xffffff, 0.7);
    trainBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    trainBtn.add(trainBg);

    const trainText = this.add.text(0, 0, '⚡ TRAINING', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    trainText.setOrigin(0.5);
    trainBtn.add(trainText);

    trainBg.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );
    trainBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      trainBtn.setScale(0.96);
    });
    trainBg.on('pointerup', () => {
      trainBtn.setScale(1);
      this.scene.start('TrainingScene', { viewOnly: false });
    });
    trainBg.on('pointerout', () => trainBtn.setScale(1));

    // 2. Start Battle Button
    const battleBtn = this.add.container(24 + btnW + 12 + btnW / 2, y);
    const battleBg = this.add.graphics();
    battleBg.fillStyle(0xe63946, 1);
    battleBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    battleBg.lineStyle(1.5, 0xffd54a, 0.9);
    battleBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    battleBtn.add(battleBg);

    const battleText = this.add.text(0, 0, '⚔ TO BATTLE!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    battleText.setOrigin(0.5);
    battleBtn.add(battleText);

    battleBg.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );
    battleBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      battleBtn.setScale(0.96);
    });
    battleBg.on('pointerup', () => {
      battleBtn.setScale(1);
      this.scene.start('BattleScene');
    });
    battleBg.on('pointerout', () => battleBtn.setScale(1));
  }
}
