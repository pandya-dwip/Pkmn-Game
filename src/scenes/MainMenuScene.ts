import Phaser from 'phaser';
import { saveSystem } from '../systems/SaveSystem';
import { gameState } from '../systems/GameState';
import { audioManager } from '../systems/AudioManager';
import { ASSETS } from '../utils/AssetLoader';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  public create(): void {
    const { width, height } = this.scale;
    audioManager.playMusic('menu');

    // 1. Animated gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b19, 0x070b19, 0x1a2656, 0x1a2656, 1);
    bg.fillRect(0, 0, width, height);

    // Floating subtle particle ambiance
    for (let i = 0; i < 15; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(20, width - 20),
        Phaser.Math.Between(20, height - 20),
        Phaser.Math.Between(2, 5),
        0xffd54a,
        Phaser.Math.FloatBetween(0.2, 0.6)
      );

      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(30, 80),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    // 2. Showcase Starters Floating in Center
    const starterContainer = this.add.container(width / 2, height * 0.28);
    const starterIds = [1, 4, 7];
    const offsets = [-80, 0, 80];

    starterIds.forEach((id, idx) => {
      const monSprite = this.add.image(offsets[idx], 0, ASSETS.pokemon(id));
      monSprite.setDisplaySize(75, 75);
      starterContainer.add(monSprite);

      this.tweens.add({
        targets: monSprite,
        y: (idx % 2 === 0 ? -6 : 6),
        duration: 1800 + idx * 300,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });

    // 3. Game Title & Subtitle
    const trophy = this.add.text(width / 2, height * 0.12, '🏆', { fontSize: '42px' });
    trophy.setOrigin(0.5);
    this.tweens.add({
      targets: trophy,
      scale: 1.1,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const title = this.add.text(width / 2, height * 0.18, 'KANTO TOURNAMENT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height * 0.38, 'Championship Roguelite RPG', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#94a3b8',
    });
    subtitle.setOrigin(0.5);

    // 4. Menu Buttons
    const hasSave = saveSystem.hasSave();
    const btnW = Math.min(280, width * 0.78);
    const btnH = 46;
    const startY = height * 0.44;
    const spacing = 52;

    const buttons = [
      {
        label: 'START TOURNAMENT',
        color: 0xffd54a,
        textColor: '#070b18',
        enabled: true,
        onClick: () => {
          this.scene.start('StarterScene');
        },
      },
      {
        label: 'CONTINUE',
        color: 0x3a86ff,
        textColor: '#ffffff',
        enabled: hasSave,
        onClick: () => {
          if (gameState.loadSavedGame()) {
            this.scene.start('TournamentScene');
          }
        },
      },
      {
        label: 'POKÉMON COLLECTION',
        color: 0x2a9d8f,
        textColor: '#ffffff',
        enabled: hasSave,
        onClick: () => {
          if (gameState.loadSavedGame()) {
            this.scene.start('TrainingScene', { viewOnly: true });
          }
        },
      },
      {
        label: 'SETTINGS',
        color: 0x475569,
        textColor: '#ffffff',
        enabled: true,
        onClick: () => {
          this.scene.start('SettingsScene');
        },
      },
      {
        label: 'HOW TO PLAY',
        color: 0x334155,
        textColor: '#ffffff',
        enabled: true,
        onClick: () => {
          this.scene.start('HelpScene');
        },
      },
    ];

    buttons.forEach((b, index) => {
      const by = startY + index * spacing;
      const btn = this.add.container(width / 2, by);

      const bg = this.add.graphics();
      if (b.enabled) {
        bg.fillStyle(b.color, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        bg.lineStyle(1.5, 0xffffff, 0.4);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      } else {
        bg.fillStyle(0x1e293b, 0.6);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        bg.lineStyle(1, 0x475569, 0.4);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      }
      btn.add(bg);

      const label = this.add.text(0, 0, b.label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: b.enabled ? b.textColor : '#64748b',
      });
      label.setOrigin(0.5);
      btn.add(label);

      if (b.enabled) {
        bg.setInteractive(
          new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
          Phaser.Geom.Rectangle.Contains
        );

        bg.on('pointerdown', () => {
          audioManager.playButtonClick();
          btn.setScale(0.96);
        });

        bg.on('pointerup', () => {
          btn.setScale(1);
          b.onClick();
        });

        bg.on('pointerout', () => btn.setScale(1));
      }
    });

    // Version label
    const ver = this.add.text(width / 2, height - 20, 'v1.0.0 · Complete 151 Pokémon Roguelite', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      color: '#475569',
    });
    ver.setOrigin(0.5);
  }
}
