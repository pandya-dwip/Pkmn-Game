import Phaser from 'phaser';
import { STARTER_IDS, getPokemonSpecies, POKEMON_SPECIES_MAP } from '../data/pokemon';
import { createPokemonInstance } from '../entities/PokemonInstance';
import { gameState } from '../systems/GameState';
import { audioManager } from '../systems/AudioManager';
import { ASSETS } from '../utils/AssetLoader';
import { TYPE_COLORS } from '../data/types';

export class StarterScene extends Phaser.Scene {
  private selectedIndex = 0;
  private previewContainer!: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('StarterScene');
  }

  public create(): void {
    const { width, height } = this.scale;
    audioManager.playMusic('select');

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x111c38, 0x111c38, 1);
    bg.fillRect(0, 0, width, height);

    // Header Title
    const title = this.add.text(width / 2, 34, 'CHOOSE YOUR STARTER', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const sub = this.add.text(width / 2, 60, 'Select your companion for the Kanto Tournament', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    });
    sub.setOrigin(0.5);

    // Three starter mini-cards horizontally
    const cardY = 115;
    const cardW = (width - 48) / 3;
    const cardH = 90;

    STARTER_IDS.forEach((id, index) => {
      const species = getPokemonSpecies(id);
      const cardX = 24 + index * cardW + cardW / 2;

      const container = this.add.container(cardX, cardY);
      const cardBg = this.add.graphics();
      container.add(cardBg);

      const monSprite = this.add.image(0, -12, ASSETS.pokemon(id));
      monSprite.setDisplaySize(50, 50);
      container.add(monSprite);

      const nameText = this.add.text(0, 24, species.name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      nameText.setOrigin(0.5);
      container.add(nameText);

      cardBg.setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH),
        Phaser.Geom.Rectangle.Contains
      );

      cardBg.on('pointerdown', () => {
        audioManager.playSelect();
        this.selectStarter(index);
      });

      this.cards.push(container);
    });

    // Preview Detail Container
    this.previewContainer = this.add.container(width / 2, height * 0.52);

    // Confirm / Select Button
    const btnW = Math.min(280, width * 0.78);
    const btnH = 48;
    const selectBtn = this.add.container(width / 2, height - 70);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffd54a, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(2, 0xffffff, 0.9);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    selectBtn.add(btnBg);

    const btnText = this.add.text(0, 0, 'SELECT THIS POKÉMON', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#070b18',
    });
    btnText.setOrigin(0.5);
    selectBtn.add(btnText);

    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    btnBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      selectBtn.setScale(0.96);
    });

    btnBg.on('pointerup', () => {
      selectBtn.setScale(1);
      this.confirmSelection();
    });

    btnBg.on('pointerout', () => selectBtn.setScale(1));

    // Initial render
    this.selectStarter(0);
  }

  private selectStarter(index: number): void {
    this.selectedIndex = index;
    const cardW = (this.scale.width - 48) / 3;
    const cardH = 90;

    // Highlight selected card
    this.cards.forEach((card, idx) => {
      const bg = card.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear();
      if (idx === index) {
        bg.fillStyle(0x1e293b, 1);
        bg.fillRoundedRect(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH, 10);
        bg.lineStyle(2, 0xffd54a, 1);
        bg.strokeRoundedRect(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH, 10);
      } else {
        bg.fillStyle(0x0f172a, 0.7);
        bg.fillRoundedRect(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH, 10);
        bg.lineStyle(1, 0x334155, 0.6);
        bg.strokeRoundedRect(-cardW / 2 + 4, -cardH / 2, cardW - 8, cardH, 10);
      }
    });

    this.renderPreviewDetail();
  }

  private renderPreviewDetail(): void {
    this.previewContainer.removeAll(true);
    const id = STARTER_IDS[this.selectedIndex];
    const species = getPokemonSpecies(id);

    // Large Pokémon Artwork with subtle breath
    const shadow = this.add.ellipse(0, 75, 120, 26, 0x000000, 0.45);
    this.previewContainer.add(shadow);

    const monSprite = this.add.image(0, 0, ASSETS.pokemon(id));
    monSprite.setDisplaySize(140, 140);
    this.previewContainer.add(monSprite);

    this.tweens.add({
      targets: monSprite,
      y: -6,
      scaleY: 1.03,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Species Title & Starting Level
    const nameText = this.add.text(0, 95, `${species.name} (Lv. 5)`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    nameText.setOrigin(0.5);
    this.previewContainer.add(nameText);

    // Type Badge
    const typeShort = species.typesShort[0] || 'No';
    const typeColor = TYPE_COLORS[typeShort]?.num || 0x4a90e2;

    const typeBadge = this.add.graphics();
    typeBadge.fillStyle(typeColor, 1);
    typeBadge.fillRoundedRect(-40, 114, 80, 20, 6);
    this.previewContainer.add(typeBadge);

    const typeText = this.add.text(0, 124, species.type1.toUpperCase(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    typeText.setOrigin(0.5);
    this.previewContainer.add(typeText);

    // Base Stats Summary Panel
    const statsBox = this.add.graphics();
    statsBox.fillStyle(0x0e172e, 0.95);
    statsBox.fillRoundedRect(-140, 145, 280, 78, 10);
    statsBox.lineStyle(1, 0x334155, 0.8);
    statsBox.strokeRoundedRect(-140, 145, 280, 78, 10);
    this.previewContainer.add(statsBox);

    const statsInfo = [
      `HP: ${species.baseHP}   ATK: ${species.baseAttack}   DEF: ${species.baseDefense}`,
      `SPA: ${species.baseSpAttack}   SPD: ${species.baseSpDefense}   SPE: ${species.baseSpeed}`,
      `Evolves into ${POKEMON_SPECIES_MAP[species.evolvesTo || 1]?.name || 'Next Stage'} at Lv. ${species.evolutionLevel}`,
    ];

    statsInfo.forEach((line, idx) => {
      const text = this.add.text(0, 160 + idx * 20, line, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        color: idx === 2 ? '#ffd54a' : '#cbd5e1',
      });
      text.setOrigin(0.5);
      this.previewContainer.add(text);
    });

    audioManager.playPokemonCry(id, 'intro');
  }

  private confirmSelection(): void {
    const chosenId = STARTER_IDS[this.selectedIndex];
    const starterInstance = createPokemonInstance(chosenId, 5);

    gameState.initNewGame(starterInstance);
    audioManager.playPokemonCry(chosenId, 'win');

    this.scene.start('TournamentScene');
  }
}
