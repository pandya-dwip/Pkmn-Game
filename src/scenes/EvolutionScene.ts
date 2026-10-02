import Phaser from 'phaser';
import { PokemonInstance } from '../types';
import { getPokemonSpecies } from '../data/pokemon';
import { getEligibleEvolutions, executeEvolution } from '../data/evolution';
import { audioManager } from '../systems/AudioManager';
import { gameState } from '../systems/GameState';
import { ASSETS } from '../utils/AssetLoader';

export class EvolutionScene extends Phaser.Scene {
  private mon!: PokemonInstance;
  private isSpecial = false;

  constructor() {
    super('EvolutionScene');
  }

  public init(data: { mon: PokemonInstance; isSpecial?: boolean }): void {
    this.mon = data.mon;
    this.isSpecial = data.isSpecial ?? false;
  }

  public create(): void {
    const { width, height } = this.scale;
    const oldSpecies = getPokemonSpecies(this.mon.speciesId);
    const options = getEligibleEvolutions(this.mon);
    const targetSpeciesId = options[0]?.targetSpeciesId || this.mon.speciesId + 1;
    const newSpecies = getPokemonSpecies(targetSpeciesId);

    // Deep cosmic background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050714, 0x050714, 0x1a1236, 0x1a1236, 1);
    bg.fillRect(0, 0, width, height);

    // Header message
    const announcement = this.add.text(width / 2, 45, 'WHAT? POKÉMON IS EVOLVING!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    announcement.setOrigin(0.5);

    // Center Stage Shadow & Sprite
    const shadow = this.add.ellipse(width / 2, height * 0.52 + 75, 140, 30, 0x000000, 0.5);
    const sprite = this.add.image(width / 2, height * 0.52, ASSETS.pokemon(this.mon.speciesId));
    sprite.setDisplaySize(160, 160);

    // Particle swirl effect
    const particles = this.add.particles(width / 2, height * 0.52, ASSETS.particles.spark, {
      speed: { min: 40, max: 120 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      frequency: 60,
    });

    // Evolution Sequence
    audioManager.playPokemonCry(this.mon.speciesId, 'attack');

    this.time.delayedCall(1000, () => {
      // Glow and silhouette pulsing
      this.tweens.add({
        targets: sprite,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 400,
        yoyo: true,
        repeat: 4,
        ease: 'Quad.easeInOut',
        onRepeat: () => {
          sprite.setTint(sprite.isTinted ? 0xffffff : 0xffd54a);
        },
        onComplete: () => {
          // White flash & transformation
          const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff);
          flash.setDepth(200);

          this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 600,
            onComplete: () => flash.destroy(),
          });

          // Execute stat and ID upgrade
          executeEvolution(this.mon, targetSpeciesId, this.isSpecial);
          if (this.isSpecial && gameState.specialEvolutionCount > 0) {
            gameState.specialEvolutionCount--;
          }
          gameState.persist();

          // Swap artwork to new evolved Pokémon
          sprite.setTexture(ASSETS.pokemon(targetSpeciesId));
          sprite.clearTint();
          sprite.setScale(1.4);

          this.tweens.add({
            targets: sprite,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
          });

          audioManager.playEvolution();
          audioManager.playPokemonCry(targetSpeciesId, 'win');

          announcement.setText(`CONGRATULATIONS!\n${oldSpecies.name} evolved into ${newSpecies.name}!`);

          // Continue button
          const continueBtn = this.add.container(width / 2, height - 70);
          const cBg = this.add.graphics();
          cBg.fillStyle(0xffd54a, 1);
          cBg.fillRoundedRect(-90, -22, 180, 44, 10);
          continueBtn.add(cBg);

          const cText = this.add.text(0, 0, 'CONTINUE', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#070b18',
          });
          cText.setOrigin(0.5);
          continueBtn.add(cText);

          cBg.setInteractive(new Phaser.Geom.Rectangle(-90, -22, 180, 44), Phaser.Geom.Rectangle.Contains);
          cBg.on('pointerdown', () => {
            audioManager.playButtonClick();
            this.scene.start('TrainingScene');
          });
        },
      });
    });
  }
}
