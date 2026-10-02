import Phaser from 'phaser';
import { audioManager } from '../systems/AudioManager';

export class HelpScene extends Phaser.Scene {
  constructor() {
    super('HelpScene');
  }

  public create(): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x111c38, 0x111c38, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(width / 2, 28, 'HOW TO PLAY', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    // Guide Sections Container
    const guideW = width - 40;
    const startY = 64;
    const guides = [
      {
        header: '⚔ BATTLE TURNS & CONTROLS',
        text: 'Every player action (Fight, Switch, or Item) takes 1 turn. Then your opponent takes exactly 1 turn. Speed and move priority determine who attacks first.',
      },
      {
        header: '⚡ TYPE EFFECTIVENESS',
        text: 'Fire beats Grass & Ice. Water douses Fire & Ground. Electric shocks Water & Flying. Grass absorbs Water & Ground. Normal moves cannot hit Ghost Pokémon.',
      },
      {
        header: '🎒 ITEMS & RECOVERY',
        text: 'Health Berries heal 30% HP. Full Heal Berries restore 100% HP. Revives bring back a fainted teammate with 50% HP.',
      },
      {
        header: '💪 TRAINING & EVOLUTION',
        text: 'Use 5 training sessions between rounds (10 for Semi-Finals) to raise stats and EXP. Qualify for the Semi-Final to trigger a Special 2-Pokémon Evolution!',
      },
      {
        header: '🏆 TOURNAMENT PROGRESSION',
        text: 'Battle through 64 trainers from Round 1 to the Championship. Winning matches rewards you with recruitment choices and championship history.',
      },
    ];

    guides.forEach((g, idx) => {
      const gy = startY + idx * 72;
      const box = this.add.graphics();
      box.fillStyle(0x0e172e, 0.95);
      box.fillRoundedRect(20, gy, guideW, 64, 8);
      box.lineStyle(1, 0x334155, 0.8);
      box.strokeRoundedRect(20, gy, guideW, 64, 8);

      this.add.text(32, gy + 8, g.header, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffd54a',
      });

      this.add.text(32, gy + 25, g.text, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        color: '#cbd5e1',
        wordWrap: { width: guideW - 24 },
        lineSpacing: 2,
      });
    });

    // Back Button
    const backBtn = this.add.container(width / 2, height - 36);
    const bBg = this.add.graphics();
    bBg.fillStyle(0x334155, 1);
    bBg.fillRoundedRect(-80, -18, 160, 36, 8);
    backBtn.add(bBg);

    const bText = this.add.text(0, 0, '← MAIN MENU', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    bText.setOrigin(0.5);
    backBtn.add(bText);

    bBg.setInteractive(new Phaser.Geom.Rectangle(-80, -18, 160, 36), Phaser.Geom.Rectangle.Contains);
    bBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      this.scene.start('MainMenuScene');
    });
  }
}
