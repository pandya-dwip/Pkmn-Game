import Phaser from 'phaser';
import { BattleAction, MoveData, PokemonInstance } from '../types';
import { MOVES_DATA } from '../data/moves';
import { TYPE_COLORS, calculateTypeEffectiveness } from '../data/types';
import { getPokemonSpecies } from '../data/pokemon';
import { audioManager } from '../systems/AudioManager';

export class BattleMenu extends Phaser.GameObjects.Container {
  private onActionSelected: (action: BattleAction) => void;
  private onMoveHover?: (move: MoveData | null) => void;

  private mainControlsContainer: Phaser.GameObjects.Container;
  private movesContainer: Phaser.GameObjects.Container;
  private currentMon: PokemonInstance | null = null;
  private opponentMon: PokemonInstance | null = null;

  private isLocked = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    onActionSelected: (action: BattleAction) => void
  ) {
    super(scene, x, y);
    this.onActionSelected = onActionSelected;

    this.mainControlsContainer = scene.add.container(0, 0);
    this.movesContainer = scene.add.container(0, 0);
    this.movesContainer.setVisible(false);

    this.add(this.mainControlsContainer);
    this.add(this.movesContainer);

    this.createMainControls(width);
    scene.add.existing(this);
  }

  public setPokemon(playerMon: PokemonInstance, oppMon: PokemonInstance): void {
    this.currentMon = playerMon;
    this.opponentMon = oppMon;
  }

  public lockControls(locked: boolean): void {
    this.isLocked = locked;
  }

  public showMain(): void {
    this.movesContainer.setVisible(false);
    this.mainControlsContainer.setVisible(true);
  }

  public showMoves(): void {
    if (!this.currentMon || !this.opponentMon) return;
    this.mainControlsContainer.setVisible(false);
    this.movesContainer.removeAll(true);
    this.movesContainer.setVisible(true);

    const width = 340;
    const btnW = 162;
    const btnH = 46;
    const oppSpecies = getPokemonSpecies(this.opponentMon.speciesId);

    // 4 Move Buttons
    this.currentMon.moves.forEach((moveName, index) => {
      const move = MOVES_DATA[moveName] || MOVES_DATA['Tackle'];
      const col = index % 2;
      const row = Math.floor(index / 2);
      const bx = col * (btnW + 12);
      const by = row * (btnH + 8);

      const eff = calculateTypeEffectiveness(move.typeShort, oppSpecies.typesShort);
      const typeColor = TYPE_COLORS[move.typeShort]?.num || 0x4a90e2;

      const btn = this.scene.add.container(bx, by);
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x131a30, 0.95);
      bg.fillRoundedRect(0, 0, btnW, btnH, 8);
      bg.lineStyle(2, typeColor, 1);
      bg.strokeRoundedRect(0, 0, btnW, btnH, 8);
      btn.add(bg);

      // Move name
      const name = this.scene.add.text(8, 6, move.name, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      btn.add(name);

      // Power & Type
      const detail = this.scene.add.text(8, 25, `${move.type.toUpperCase()} · PWR ${move.power}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        color: '#94a3b8',
      });
      btn.add(detail);

      // Effectiveness Tag
      let effTag = '';
      let effColor = '#cbd5e1';
      if (eff > 1.5) {
        effTag = 'SUPER';
        effColor = '#4cd05a';
      } else if (eff < 1.0 && eff > 0) {
        effTag = 'WEAK';
        effColor = '#ff8a4a';
      } else if (eff === 0) {
        effTag = 'IMMUNE';
        effColor = '#ef4444';
      }

      if (effTag) {
        const tag = this.scene.add.text(btnW - 8, 8, effTag, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: effColor,
        });
        tag.setOrigin(1, 0);
        btn.add(tag);
      }

      // Interactive
      bg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );

      bg.on('pointerdown', () => {
        if (this.isLocked) return;
        audioManager.playButtonClick();
        btn.setScale(0.96);
      });

      bg.on('pointerup', () => {
        btn.setScale(1);
        if (this.isLocked) return;
        this.onActionSelected({ type: 'FIGHT', move });
      });

      bg.on('pointerout', () => btn.setScale(1));

      this.movesContainer.add(btn);
    });

    // Back Button
    const backBtn = this.scene.add.container(0, 110);
    const backBg = this.scene.add.graphics();
    backBg.fillStyle(0x1e293b, 0.9);
    backBg.fillRoundedRect(0, 0, width, 32, 6);
    backBtn.add(backBg);

    const backLabel = this.scene.add.text(width / 2, 16, '← BACK', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#cbd5e1',
    });
    backLabel.setOrigin(0.5, 0.5);
    backBtn.add(backLabel);

    backBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, 32),
      Phaser.Geom.Rectangle.Contains
    );
    backBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      this.showMain();
    });

    this.movesContainer.add(backBtn);
  }

  private createMainControls(width: number): void {
    const btnW = 162;
    const btnH = 46;

    const buttonsConfig = [
      {
        action: 'FIGHT',
        label: '⚔ FIGHT',
        bgColor: 0xe63946,
        strokeColor: 0xff6b6b,
        col: 0,
        row: 0,
      },
      {
        action: 'POKEMON',
        label: '◓ POKÉMON',
        bgColor: 0x2a9d8f,
        strokeColor: 0x48cae4,
        col: 1,
        row: 0,
      },
      {
        action: 'BAG',
        label: '🎒 BAG',
        bgColor: 0xe76f51,
        strokeColor: 0xf4a261,
        col: 0,
        row: 1,
      },
      {
        action: 'RUN',
        label: '👟 RUN',
        bgColor: 0x6a4c93,
        strokeColor: 0x9b5de5,
        col: 1,
        row: 1,
      },
    ];

    buttonsConfig.forEach(btnConf => {
      const bx = btnConf.col * (btnW + 12);
      const by = btnConf.row * (btnH + 8);

      const btn = this.scene.add.container(bx, by);
      const bg = this.scene.add.graphics();

      // Modern rounded button with glass highlight
      bg.fillStyle(btnConf.bgColor, 0.95);
      bg.fillRoundedRect(0, 0, btnW, btnH, 12);
      bg.lineStyle(2, btnConf.strokeColor, 0.9);
      bg.strokeRoundedRect(0, 0, btnW, btnH, 12);
      btn.add(bg);

      const label = this.scene.add.text(btnW / 2, btnH / 2, btnConf.label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5, 0.5);
      btn.add(label);

      bg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );

      bg.on('pointerdown', () => {
        if (this.isLocked) return;
        audioManager.playButtonClick();
        btn.setScale(0.96);
      });

      bg.on('pointerup', () => {
        btn.setScale(1);
        if (this.isLocked) return;

        if (btnConf.action === 'FIGHT') {
          this.showMoves();
        } else if (btnConf.action === 'POKEMON') {
          this.onActionSelected({ type: 'POKEMON' });
        } else if (btnConf.action === 'BAG') {
          this.onActionSelected({ type: 'BAG' });
        } else if (btnConf.action === 'RUN') {
          this.onActionSelected({ type: 'RUN' });
        }
      });

      bg.on('pointerout', () => btn.setScale(1));

      this.mainControlsContainer.add(btn);
    });
  }
}
