import Phaser from 'phaser';

export class DialogBox extends Phaser.GameObjects.Container {
  private bgBox: Phaser.GameObjects.Graphics;
  private messageText: Phaser.GameObjects.Text;
  private isTyping = false;
  private textQueue: { text: string; resolve: () => void }[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number = 54) {
    super(scene, x, y);

    this.bgBox = scene.add.graphics();
    this.bgBox.fillStyle(0x070b19, 0.92);
    this.bgBox.fillRoundedRect(0, 0, width, height, 12);
    this.bgBox.lineStyle(1.5, 0xffffff, 0.2);
    this.bgBox.strokeRoundedRect(0, 0, width, height, 12);
    this.add(this.bgBox);

    this.messageText = scene.add.text(14, 10, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      color: '#f8fafc',
      wordWrap: { width: width - 28 },
      lineSpacing: 4,
    });
    this.add(this.messageText);

    scene.add.existing(this);
  }

  public showMessage(text: string, durationMs: number = 800): Promise<void> {
    return new Promise(resolve => {
      this.textQueue.push({ text, resolve });
      if (!this.isTyping) {
        this.processQueue(durationMs);
      }
    });
  }

  private processQueue(durationMs: number): void {
    if (this.textQueue.length === 0) {
      this.isTyping = false;
      return;
    }

    this.isTyping = true;
    const item = this.textQueue.shift()!;
    this.messageText.setText(item.text);

    // Smooth subtle entry fade
    this.scene.tweens.add({
      targets: this.messageText,
      alpha: { from: 0.4, to: 1 },
      duration: 120,
    });

    this.scene.time.delayedCall(durationMs, () => {
      item.resolve();
      this.processQueue(durationMs);
    });
  }

  public clear(): void {
    this.messageText.setText('');
    this.textQueue = [];
    this.isTyping = false;
  }
}
