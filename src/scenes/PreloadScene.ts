import Phaser from 'phaser';
import { ASSETS, createPokemonFallbackTexture, getPokemonArtworkUrl } from '../utils/AssetLoader';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  public preload(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x070b18);

    // Title
    const title = this.add.text(width / 2, height * 0.38, 'KANTO TOURNAMENT', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const sub = this.add.text(width / 2, height * 0.44, 'A Gen 1 Championship RPG', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      color: '#94a3b8',
    });
    sub.setOrigin(0.5);

    // Progress Bar Track
    const barW = Math.min(280, width * 0.75);
    const barH = 12;
    const barX = width / 2 - barW / 2;
    const barY = height * 0.55;

    const track = this.add.graphics();
    track.fillStyle(0x1e293b, 1);
    track.fillRoundedRect(barX, barY, barW, barH, 6);

    const bar = this.add.graphics();

    const percentText = this.add.text(width / 2, barY + 28, 'Loading... 0%', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      color: '#cbd5e1',
    });
    percentText.setOrigin(0.5);

    this.load.on('progress', (val: number) => {
      bar.clear();
      bar.fillStyle(0xffd54a, 1);
      bar.fillRoundedRect(barX, barY, barW * val, barH, 6);
      percentText.setText(`Loading... ${Math.round(val * 100)}%`);
    });

    // Preload primary starter artworks and common icons
    const startersAndRivals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 25, 26, 16, 19, 133, 143, 149, 150];
    startersAndRivals.forEach(id => {
      const key = ASSETS.pokemon(id);
      this.load.image(key, getPokemonArtworkUrl(id));
    });

    // In case any asset fails to load, gracefully add fallback
    this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
      if (fileObj.key.startsWith('pkmn_')) {
        const id = parseInt(fileObj.key.replace('pkmn_', ''), 10);
        createPokemonFallbackTexture(this, id, fileObj.key);
      }
    });
  }

  public create(): void {
    // Ensure all 151 have a registered texture fallback
    for (let id = 1; id <= 151; id++) {
      const key = ASSETS.pokemon(id);
      if (!this.textures.exists(key)) {
        createPokemonFallbackTexture(this, id, key);
      }
    }

    this.time.delayedCall(200, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
