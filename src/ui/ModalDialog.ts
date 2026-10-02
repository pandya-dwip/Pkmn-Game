import Phaser from 'phaser';
import { audioManager } from '../systems/AudioManager';

export class ModalDialog extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private card: Phaser.GameObjects.Container;
  private dialogWidth: number;
  private dialogHeight: number;

  constructor(scene: Phaser.Scene, width: number = 340, height: number = 420) {
    super(scene, 0, 0);
    this.dialogWidth = width;
    this.dialogHeight = height;

    const { width: sceneW, height: sceneH } = scene.scale;

    // Dark blurred backdrop
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(0x050814, 0.85);
    this.overlay.fillRect(0, 0, sceneW, sceneH);
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, sceneW, sceneH), Phaser.Geom.Rectangle.Contains);
    this.add(this.overlay);

    // Modal Card
    this.card = scene.add.container(sceneW / 2, sceneH / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(0x0e172e, 0.98);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    bg.lineStyle(2, 0xffd54a, 0.8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
    this.card.add(bg);

    this.add(this.card);
    this.setDepth(200);
    this.setVisible(false);
    scene.add.existing(this);
  }

  public getCard(): Phaser.GameObjects.Container {
    return this.card;
  }

  public show(): void {
    this.setVisible(true);
    this.card.setScale(0.9);
    this.card.setAlpha(0);

    this.scene.tweens.add({
      targets: this.card,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  public hide(): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.card,
        scale: 0.9,
        alpha: 0,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.setVisible(false);
          resolve();
        },
      });
    });
  }
}
