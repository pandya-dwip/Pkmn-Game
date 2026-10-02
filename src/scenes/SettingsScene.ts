import Phaser from 'phaser';
import { audioManager } from '../systems/AudioManager';
import { saveSystem } from '../systems/SaveSystem';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  public create(): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b18, 0x070b18, 0x111c38, 0x111c38, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(width / 2, 34, 'SETTINGS', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);

    const cardW = width - 40;
    const startY = 80;

    // 1. Audio Toggles Container
    const settings = audioManager.getSettings();

    const audioOptions = [
      {
        label: 'Music',
        getState: () => audioManager.getSettings().musicOn,
        toggle: () => audioManager.toggleMusic(),
      },
      {
        label: 'Sound Effects (SFX)',
        getState: () => audioManager.getSettings().sfxOn,
        toggle: () => audioManager.toggleSFX(),
      },
      {
        label: 'Pokémon Cries',
        getState: () => audioManager.getSettings().pokemonSoundsOn,
        toggle: () => audioManager.togglePokemonSounds(),
      },
    ];

    audioOptions.forEach((opt, idx) => {
      const rowY = startY + idx * 56;
      const row = this.add.container(width / 2, rowY);

      const rBg = this.add.graphics();
      rBg.fillStyle(0x0e172e, 0.95);
      rBg.fillRoundedRect(-cardW / 2, -22, cardW, 46, 10);
      rBg.lineStyle(1, 0x334155, 1);
      rBg.strokeRoundedRect(-cardW / 2, -22, cardW, 46, 10);
      row.add(rBg);

      const label = this.add.text(-cardW / 2 + 16, 0, opt.label, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
      });
      label.setOrigin(0, 0.5);
      row.add(label);

      // Toggle switch button
      const toggleBtn = this.add.container(cardW / 2 - 45, 0);
      const tBg = this.add.graphics();
      toggleBtn.add(tBg);

      const tText = this.add.text(0, 0, '', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      tText.setOrigin(0.5);
      toggleBtn.add(tText);

      const updateToggleVisual = () => {
        const isOn = opt.getState();
        tBg.clear();
        tBg.fillStyle(isOn ? 0x22c55e : 0x475569, 1);
        tBg.fillRoundedRect(-32, -13, 64, 26, 13);
        tText.setText(isOn ? 'ON' : 'OFF');
      };

      updateToggleVisual();

      tBg.setInteractive(new Phaser.Geom.Rectangle(-32, -13, 64, 26), Phaser.Geom.Rectangle.Contains);
      tBg.on('pointerdown', () => {
        opt.toggle();
        audioManager.playButtonClick();
        updateToggleVisual();
      });

      row.add(toggleBtn);
    });

    // 2. Reset Save Data Section
    const resetY = startY + 200;
    const resetContainer = this.add.container(width / 2, resetY);

    const resetCard = this.add.graphics();
    resetCard.fillStyle(0x1a0f18, 0.95);
    resetCard.fillRoundedRect(-cardW / 2, -24, cardW, 90, 10);
    resetCard.lineStyle(1.5, 0xef4444, 0.8);
    resetCard.strokeRoundedRect(-cardW / 2, -24, cardW, 90, 10);
    resetContainer.add(resetCard);

    const warnTitle = this.add.text(0, -8, 'RESET SAVE DATA', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ef4444',
    });
    warnTitle.setOrigin(0.5);
    resetContainer.add(warnTitle);

    const warnDesc = this.add.text(0, 10, 'Permanently erase all tournament progression', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      color: '#94a3b8',
    });
    warnDesc.setOrigin(0.5);
    resetContainer.add(warnDesc);

    const resetBtn = this.add.container(0, 42);
    const rbBg = this.add.graphics();
    rbBg.fillStyle(0xef4444, 1);
    rbBg.fillRoundedRect(-70, -12, 140, 26, 6);
    resetBtn.add(rbBg);

    const rbText = this.add.text(0, 0, 'DELETE SAVE', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    rbText.setOrigin(0.5);
    resetBtn.add(rbText);

    rbBg.setInteractive(new Phaser.Geom.Rectangle(-70, -12, 140, 26), Phaser.Geom.Rectangle.Contains);
    rbBg.on('pointerdown', () => {
      this.promptResetConfirmation();
    });
    resetContainer.add(resetBtn);

    // 3. Back Button
    const backBtn = this.add.container(width / 2, height - 50);
    const bBg = this.add.graphics();
    bBg.fillStyle(0x334155, 1);
    bBg.fillRoundedRect(-80, -20, 160, 40, 10);
    backBtn.add(bBg);

    const bText = this.add.text(0, 0, '← BACK', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    bText.setOrigin(0.5);
    backBtn.add(bText);

    bBg.setInteractive(new Phaser.Geom.Rectangle(-80, -20, 160, 40), Phaser.Geom.Rectangle.Contains);
    bBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      this.scene.start('MainMenuScene');
    });
  }

  private promptResetConfirmation(): void {
    const { width, height } = this.scale;
    const modal = this.add.container(width / 2, height / 2);
    modal.setDepth(300);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    overlay.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    modal.add(overlay);

    const box = this.add.graphics();
    box.fillStyle(0x0e172e, 0.98);
    box.fillRoundedRect(-140, -80, 280, 160, 14);
    box.lineStyle(2, 0xef4444, 1);
    box.strokeRoundedRect(-140, -80, 280, 160, 14);
    modal.add(box);

    const msg = this.add.text(
      0,
      -35,
      'Are you sure?\nThis will permanently delete your\ntournament progress.',
      {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 4,
      }
    );
    msg.setOrigin(0.5);
    modal.add(msg);

    // Cancel Button
    const cancelBtn = this.add.container(-60, 35);
    const cBg = this.add.graphics();
    cBg.fillStyle(0x334155, 1);
    cBg.fillRoundedRect(-45, -16, 90, 32, 6);
    cancelBtn.add(cBg);

    const cText = this.add.text(0, 0, 'CANCEL', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    cText.setOrigin(0.5);
    cancelBtn.add(cText);

    cBg.setInteractive(new Phaser.Geom.Rectangle(-45, -16, 90, 32), Phaser.Geom.Rectangle.Contains);
    cBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      modal.destroy();
    });
    modal.add(cancelBtn);

    // Reset Confirm Button
    const confirmBtn = this.add.container(60, 35);
    const rBg = this.add.graphics();
    rBg.fillStyle(0xef4444, 1);
    rBg.fillRoundedRect(-45, -16, 90, 32, 6);
    confirmBtn.add(rBg);

    const rText = this.add.text(0, 0, 'RESET', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    rText.setOrigin(0.5);
    confirmBtn.add(rText);

    rBg.setInteractive(new Phaser.Geom.Rectangle(-45, -16, 90, 32), Phaser.Geom.Rectangle.Contains);
    rBg.on('pointerdown', () => {
      audioManager.playButtonClick();
      saveSystem.deleteSave();
      modal.destroy();
      this.scene.start('MainMenuScene');
    });
    modal.add(confirmBtn);
  }
}
