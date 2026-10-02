import Phaser from 'phaser';
import { PokemonInstance } from '../types';
import { getPokemonSpecies } from '../data/pokemon';
import { TYPE_COLORS } from '../data/types';

export class HealthBar extends Phaser.GameObjects.Container {
  private mon: PokemonInstance;
  private isPlayer: boolean;

  private bgBox: Phaser.GameObjects.Graphics;
  private delayedBar: Phaser.GameObjects.Graphics;
  private currentBar: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private typeContainer: Phaser.GameObjects.Container;
  private teamDotsContainer: Phaser.GameObjects.Container;

  private barWidth = 140;
  private barHeight = 8;
  private currentRatio = 1;
  private delayedRatio = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, mon: PokemonInstance, isPlayer: boolean) {
    super(scene, x, y);
    this.mon = mon;
    this.isPlayer = isPlayer;

    const width = 200;
    const height = 66;

    // 1. Sleek glassmorphism backdrop panel
    this.bgBox = scene.add.graphics();
    this.bgBox.fillStyle(0x0a1024, 0.88);
    this.bgBox.fillRoundedRect(0, 0, width, height, 10);
    this.bgBox.lineStyle(2, isPlayer ? 0x29d0ff : 0xff6a2a, 0.9);
    this.bgBox.strokeRoundedRect(0, 0, width, height, 10);
    this.add(this.bgBox);

    // 2. Name & Level text
    const species = getPokemonSpecies(mon.speciesId);
    this.nameText = scene.add.text(10, 8, species.name, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.add(this.nameText);

    this.levelText = scene.add.text(width - 10, 9, `Lv.${mon.level}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    this.levelText.setOrigin(1, 0);
    this.add(this.levelText);

    // 3. Types badges
    this.typeContainer = scene.add.container(10, 26);
    this.add(this.typeContainer);
    this.renderTypeBadges();

    // 4. HP Bar Background Track
    const trackY = 46;
    const track = scene.add.graphics();
    track.fillStyle(0x1a233a, 1);
    track.fillRoundedRect(10, trackY, this.barWidth, this.barHeight, 4);
    this.add(track);

    // 5. Delayed Damage Bar (orange/white drain effect)
    this.delayedBar = scene.add.graphics();
    this.add(this.delayedBar);

    // 6. Current HP Bar (green -> yellow -> red)
    this.currentBar = scene.add.graphics();
    this.add(this.currentBar);

    // 7. HP numeric text
    this.hpText = scene.add.text(width - 10, trackY - 1, `${mon.currentHP}/${mon.maxHP}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#cbd5e1',
    });
    this.hpText.setOrigin(1, 0);
    this.add(this.hpText);

    // 8. Team Pokéball dots container
    this.teamDotsContainer = scene.add.container(10, height + 4);
    this.add(this.teamDotsContainer);

    this.updateBarGraphics(true);
    scene.add.existing(this);
  }

  public updatePokemon(mon: PokemonInstance): void {
    this.mon = mon;
    const species = getPokemonSpecies(mon.speciesId);
    this.nameText.setText(species.name);
    this.levelText.setText(`Lv.${mon.level}`);
    this.renderTypeBadges();
    this.updateBarGraphics(false);
  }

  public updateTeamDots(team: PokemonInstance[], activeMonId: string): void {
    this.teamDotsContainer.removeAll(true);
    team.forEach((m, index) => {
      const dot = this.scene.add.graphics();
      const dotX = index * 14;
      const isFainted = m.currentHP <= 0;
      const isActive = m.instanceId === activeMonId;

      if (isFainted) {
        dot.fillStyle(0x475569, 0.6);
        dot.fillCircle(dotX + 5, 5, 4);
      } else {
        dot.fillStyle(isActive ? 0xffd54a : 0xe63946, 1);
        dot.fillCircle(dotX + 5, 5, isActive ? 5 : 4);
        if (isActive) {
          dot.lineStyle(1.5, 0xffffff, 1);
          dot.strokeCircle(dotX + 5, 5, 5);
        }
      }
      this.teamDotsContainer.add(dot);
    });
  }

  private renderTypeBadges(): void {
    this.typeContainer.removeAll(true);
    const species = getPokemonSpecies(this.mon.speciesId);
    let curX = 0;

    species.typesShort.forEach(t => {
      const color = TYPE_COLORS[t]?.num || 0x4a90e2;
      const badge = this.scene.add.graphics();
      badge.fillStyle(color, 1);
      badge.fillRoundedRect(curX, 0, 36, 14, 4);
      this.typeContainer.add(badge);

      const label = this.scene.add.text(curX + 18, 7, t.toUpperCase(), {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5, 0.5);
      this.typeContainer.add(label);

      curX += 40;
    });
  }

  public animateHP(newHP: number, maxHP: number): Promise<void> {
    return new Promise(resolve => {
      const targetRatio = Math.max(0, Math.min(1, newHP / Math.max(1, maxHP)));
      this.hpText.setText(`${Math.max(0, newHP)}/${maxHP}`);

      // Smooth tween for primary green bar
      this.scene.tweens.add({
        targets: this,
        currentRatio: targetRatio,
        duration: 400,
        ease: 'Quad.easeOut',
        onUpdate: () => this.drawBars(),
        onComplete: () => {
          // Delayed tween for underlying drain bar
          this.scene.tweens.add({
            targets: this,
            delayedRatio: targetRatio,
            duration: 500,
            delay: 150,
            ease: 'Quad.easeInOut',
            onUpdate: () => this.drawBars(),
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  private updateBarGraphics(instant: boolean): void {
    const targetRatio = Math.max(0, Math.min(1, this.mon.currentHP / Math.max(1, this.mon.maxHP)));
    this.hpText.setText(`${Math.max(0, this.mon.currentHP)}/${this.mon.maxHP}`);

    if (instant) {
      this.currentRatio = targetRatio;
      this.delayedRatio = targetRatio;
      this.drawBars();
    } else {
      this.animateHP(this.mon.currentHP, this.mon.maxHP);
    }
  }

  private drawBars(): void {
    const trackY = 46;
    const trackX = 10;

    // 1. Draw Delayed Bar
    this.delayedBar.clear();
    if (this.delayedRatio > this.currentRatio) {
      this.delayedBar.fillStyle(0xff8c00, 0.9);
      this.delayedBar.fillRoundedRect(
        trackX,
        trackY,
        Math.max(4, this.barWidth * this.delayedRatio),
        this.barHeight,
        4
      );
    }

    // 2. Determine color for current HP
    let color = 0x2fa84a; // Green (> 50%)
    if (this.currentRatio <= 0.2) {
      color = 0xd0281a; // Red (<= 20%)
    } else if (this.currentRatio <= 0.5) {
      color = 0xe0a800; // Yellow (<= 50%)
    }

    // 3. Draw Current Bar
    this.currentBar.clear();
    if (this.currentRatio > 0) {
      this.currentBar.fillStyle(color, 1);
      this.currentBar.fillRoundedRect(
        trackX,
        trackY,
        Math.max(4, this.barWidth * this.currentRatio),
        this.barHeight,
        4
      );
    }
  }
}
