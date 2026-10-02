import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { saveSystem } from '../systems/SaveSystem';
import { audioManager } from '../systems/AudioManager';
import { getPokemonSpecies } from '../data/pokemon';
import { ASSETS } from '../utils/AssetLoader';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  public create(): void {
    const { width, height } = this.scale;
    audioManager.playMusic('victory');

    // Save Championship Record
    const team = gameState.getPlayerTeam();
    const starterSpecies = getPokemonSpecies(gameState.playerCollection[0]?.speciesId || 1);
    const record = {
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      starterName: starterSpecies.name,
      finalTeam: team.map(m => ({ speciesId: m.speciesId, name: getPokemonSpecies(m.speciesId).name, level: m.level })),
      finalOpponent: 'Champion Rival',
      finalOpponentTeam: team.map(m => ({ speciesId: m.speciesId, name: getPokemonSpecies(m.speciesId).name, level: m.level + 2 })),
      tournamentResult: 'CHAMPION',
      playerStats: {
        battlesWon: 6,
        totalExpGained: team.reduce((acc, m) => acc + m.experience, 0),
      },
    };
    saveSystem.saveChampionshipRecord(record);

    // Cosmic celebratory background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0f30, 0x1a0f30, 0x070b18, 0x070b18, 1);
    bg.fillRect(0, 0, width, height);

    // Floating Confetti particles
    const confettiColors = [0xffd54a, 0xff4a4a, 0x3a86ff, 0x22c55e, 0x9b5de5, 0xffffff];
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(10, width - 10);
      const conf = this.add.rectangle(
        x,
        Phaser.Math.Between(-50, height),
        Phaser.Math.Between(6, 12),
        Phaser.Math.Between(10, 18),
        confettiColors[i % confettiColors.length]
      );

      this.tweens.add({
        targets: conf,
        y: height + 50,
        angle: Phaser.Math.Between(360, 1080),
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        ease: 'Linear',
      });
    }

    // Trophy Graphic
    const trophy = this.add.text(width / 2, 70, '🏆', { fontSize: '64px' });
    trophy.setOrigin(0.5);

    this.tweens.add({
      targets: trophy,
      scale: 1.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Championship Titles
    const title = this.add.text(width / 2, 125, 'KANTO TOURNAMENT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const champ = this.add.text(width / 2, 155, '★ CHAMPION ★', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    champ.setOrigin(0.5);

    const sub = this.add.text(width / 2, 185, 'HALL OF FAME INDUCTEE', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      color: '#cbd5e1',
    });
    sub.setOrigin(0.5);

    // Grid of Final Champion Team
    const gridY = 220;
    const cardW = 90;
    const cardH = 95;

    team.forEach((m, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const cx = width / 2 - cardW + col * cardW;
      const cy = gridY + row * (cardH + 12) + cardH / 2;

      const card = this.add.container(cx, cy);
      const cBg = this.add.graphics();
      cBg.fillStyle(0x131a30, 0.95);
      cBg.fillRoundedRect(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH, 8);
      cBg.lineStyle(1.5, 0xffd54a, 0.8);
      cBg.strokeRoundedRect(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH, 8);
      card.add(cBg);

      const monSprite = this.add.image(0, -12, ASSETS.pokemon(m.speciesId));
      monSprite.setDisplaySize(48, 48);
      card.add(monSprite);

      const name = this.add.text(0, 18, getPokemonSpecies(m.speciesId).name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      name.setOrigin(0.5);
      card.add(name);

      const lv = this.add.text(0, 30, `Lv.${m.level}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        color: '#ffd54a',
      });
      lv.setOrigin(0.5);
      card.add(lv);
    });

    // Return to Main Menu / Play Again Button
    const returnBtn = this.add.container(width / 2, height - 60);
    const rBg = this.add.graphics();
    rBg.fillStyle(0xffd54a, 1);
    rBg.fillRoundedRect(-100, -22, 200, 44, 12);
    returnBtn.add(rBg);

    const rText = this.add.text(0, 0, 'MAIN MENU', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#070b18',
    });
    rText.setOrigin(0.5);
    returnBtn.add(rText);

    rBg.setInteractive(new Phaser.Geom.Rectangle(-100, -22, 200, 44), Phaser.Geom.Rectangle.Contains);
    rBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      this.scene.start('MainMenuScene');
    });
  }
}
