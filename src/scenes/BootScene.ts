import Phaser from 'phaser';
import { generateProceduralTextures } from '../utils/AssetLoader';
import { audioManager } from '../systems/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    // Generate base procedural textures
    generateProceduralTextures(this);
  }

  public create(): void {
    // Setup audio unlock overlay for mobile browsers
    const overlay = document.getElementById('audio-unlock-overlay');
    if (overlay) {
      const unlockHandler = () => {
        audioManager.unlockAudio();
        overlay.classList.remove('active');
        window.removeEventListener('pointerdown', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
      };

      // Show overlay if audio context is suspended or on first visit
      window.addEventListener('pointerdown', unlockHandler, { once: true });
      window.addEventListener('keydown', unlockHandler, { once: true });
    }

    this.scene.start('PreloadScene');
  }
}
