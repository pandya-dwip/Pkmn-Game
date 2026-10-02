import Phaser from 'phaser';
import { MoveData } from '../types';
import { ASSETS } from '../utils/AssetLoader';
import { audioManager } from '../systems/AudioManager';

export class AttackAnimationManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Main entry point for playing an attack animation based on move.animationType.
   */
  public async playAttackAnimation(
    attackerSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container,
    targetSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container,
    move: MoveData,
    isPlayerAttacker: boolean
  ): Promise<void> {
    const startX = attackerSprite.x;
    const startY = attackerSprite.y;
    const targetX = targetSprite.x;
    const targetY = targetSprite.y;

    // 1. Charge Sound & Attacker Anticipation
    audioManager.playAttackSound(move.type, 'charge', move.power);
    await this.playLungeAnticipation(attackerSprite, isPlayerAttacker);

    // 2. Play Move-Specific Visual Animation
    switch (move.animationType) {
      case 'RAZOR_LEAF':
        await this.playRazorLeaf(startX, startY, targetX, targetY);
        break;
      case 'VINE_WHIP':
        await this.playVineWhip(startX, startY, targetX, targetY);
        break;
      case 'WATER_GUN':
        await this.playWaterGun(startX, startY, targetX, targetY);
        break;
      case 'HYDRO_PUMP':
        await this.playHydroPump(startX, startY, targetX, targetY);
        break;
      case 'EMBER':
        await this.playEmber(startX, startY, targetX, targetY);
        break;
      case 'FLAMETHROWER':
        await this.playFlamethrower(startX, startY, targetX, targetY);
        break;
      case 'FIRE_BLAST':
        await this.playFireBlast(startX, startY, targetX, targetY);
        break;
      case 'THUNDER_SHOCK':
        await this.playThunderShock(startX, startY, targetX, targetY);
        break;
      case 'SPARK':
        await this.playSpark(attackerSprite, targetX, targetY, isPlayerAttacker);
        break;
      case 'THUNDERBOLT':
        await this.playThunderbolt(startX, startY, targetX, targetY);
        break;
      case 'THUNDER':
        await this.playThunder(targetX, targetY);
        break;
      case 'ICE_BEAM':
        await this.playIceBeam(startX, startY, targetX, targetY);
        break;
      case 'ROCK_THROW':
        await this.playRockThrow(startX, startY, targetX, targetY);
        break;
      case 'PSYCHIC':
        await this.playPsychic(targetSprite);
        break;
      case 'SHADOW_BALL':
        await this.playShadowBall(startX, startY, targetX, targetY);
        break;
      case 'BITE':
        await this.playBite(attackerSprite, targetX, targetY, isPlayerAttacker);
        break;
      case 'QUICK_ATTACK':
        await this.playQuickAttack(attackerSprite, targetX, targetY, isPlayerAttacker);
        break;
      case 'SCRATCH':
        await this.playScratch(targetX, targetY);
        break;
      case 'SLAM':
        await this.playSlam(attackerSprite, targetX, targetY, isPlayerAttacker);
        break;
      case 'EARTHQUAKE':
        await this.playEarthquake(targetX, targetY);
        break;
      case 'BEAM':
        await this.playEnergyBeam(startX, startY, targetX, targetY);
        break;
      case 'GUST':
        await this.playGust(startX, startY, targetX, targetY);
        break;
      default:
        await this.playGenericProjectile(startX, startY, targetX, targetY);
        break;
    }

    // 3. Impact Sound
    audioManager.playAttackSound(move.type, 'impact', move.power);
  }

  // --- Anticipation Tween ---
  private playLungeAnticipation(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container, isPlayer: boolean): Promise<void> {
    return new Promise(resolve => {
      const origX = sprite.x;
      const origY = sprite.y;
      const dirX = isPlayer ? 1 : -1;
      const dirY = isPlayer ? -1 : 1;

      this.scene.tweens.add({
        targets: sprite,
        x: origX - dirX * 12,
        y: origY - dirY * 8,
        scaleX: sprite.scaleX * 1.05,
        scaleY: sprite.scaleY * 0.95,
        duration: 160,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          sprite.x = origX;
          sprite.y = origY;
          resolve();
        },
      });
    });
  }

  // 1. RAZOR LEAF
  private async playRazorLeaf(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    const leafCount = 8;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < leafCount; i++) {
      const delay = i * 45;
      promises.push(
        new Promise(resolve => {
          this.scene.time.delayedCall(delay, () => {
            const leaf = this.scene.add.image(x1 + (Math.random() - 0.5) * 30, y1 + (Math.random() - 0.5) * 20, ASSETS.particles.leaf);
            leaf.setScale(0.8 + Math.random() * 0.4);
            leaf.setDepth(100);

            // Rotate and fly to target
            this.scene.tweens.add({
              targets: leaf,
              x: x2 + (Math.random() - 0.5) * 40,
              y: y2 + (Math.random() - 0.5) * 40,
              angle: 720,
              duration: 380,
              ease: 'Power2',
              onComplete: () => {
                // Scatter/burst
                this.scene.tweens.add({
                  targets: leaf,
                  alpha: 0,
                  scale: 0.2,
                  y: leaf.y + 20,
                  duration: 200,
                  onComplete: () => {
                    leaf.destroy();
                    resolve();
                  },
                });
              },
            });
          });
        })
      );
    }

    await Promise.all(promises);
  }

  // 2. VINE WHIP
  private playVineWhip(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      const graphics = this.scene.add.graphics();
      graphics.setDepth(100);

      const whipState = { t: 0 };
      this.scene.tweens.add({
        targets: whipState,
        t: 1,
        duration: 360,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          graphics.clear();
          graphics.lineStyle(6, 0x2fa84a, 0.95);
          const cpX = (x1 + x2) / 2 + Math.sin(whipState.t * Math.PI) * 60;
          const cpY = (y1 + y2) / 2 - Math.sin(whipState.t * Math.PI) * 50;

          const endX = Phaser.Math.Linear(x1, x2, whipState.t);
          const endY = Phaser.Math.Linear(y1, y2, whipState.t);

          graphics.beginPath();
          graphics.moveTo(x1, y1);
          for (let step = 1; step <= 8; step++) {
            const st = step / 8;
            const px = (1 - st) * (1 - st) * x1 + 2 * (1 - st) * st * cpX + st * st * endX;
            const py = (1 - st) * (1 - st) * y1 + 2 * (1 - st) * st * cpY + st * st * endY;
            graphics.lineTo(px, py);
          }
          graphics.strokePath();

          // Flower / leaf tip
          graphics.fillStyle(0x78e05a, 1);
          graphics.fillCircle(endX, endY, 6);
        },
        onComplete: () => {
          graphics.destroy();
          resolve();
        },
      });
    });
  }

  // 3. WATER GUN
  private async playWaterGun(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    const drops = 12;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < drops; i++) {
      promises.push(
        new Promise(resolve => {
          this.scene.time.delayedCall(i * 30, () => {
            const drop = this.scene.add.image(x1, y1, ASSETS.particles.waterDrop);
            drop.setScale(0.8 + Math.random() * 0.4);
            drop.setDepth(100);

            this.scene.tweens.add({
              targets: drop,
              x: x2 + (Math.random() - 0.5) * 30,
              y: y2 + (Math.random() - 0.5) * 30,
              scale: 1.5,
              duration: 280,
              ease: 'Quad.easeIn',
              onComplete: () => {
                this.scene.tweens.add({
                  targets: drop,
                  scale: 0.1,
                  alpha: 0,
                  duration: 100,
                  onComplete: () => {
                    drop.destroy();
                    resolve();
                  },
                });
              },
            });
          });
        })
      );
    }

    await Promise.all(promises);
  }

  // 4. HYDRO PUMP
  private playHydroPump(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      // Big camera shake for Hydro Pump
      this.scene.cameras.main.shake(300, 0.015);

      const stream = this.scene.add.graphics();
      stream.setDepth(100);

      const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
      const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);

      const anim = { width: 4, alpha: 0.9 };
      this.scene.tweens.add({
        targets: anim,
        width: 38,
        duration: 400,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onUpdate: () => {
          stream.clear();
          stream.lineStyle(anim.width, 0x3a9bff, anim.alpha);
          stream.beginPath();
          stream.moveTo(x1, y1);
          stream.lineTo(x2, y2);
          stream.strokePath();

          // Outer white core
          stream.lineStyle(anim.width * 0.4, 0xffffff, 1);
          stream.beginPath();
          stream.moveTo(x1, y1);
          stream.lineTo(x2, y2);
          stream.strokePath();
        },
        onComplete: () => {
          stream.destroy();
          resolve();
        },
      });
    });
  }

  // 5. EMBER
  private async playEmber(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    const count = 7;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        new Promise(resolve => {
          this.scene.time.delayedCall(i * 35, () => {
            const flame = this.scene.add.image(x1 + (Math.random() - 0.5) * 15, y1, ASSETS.particles.flame);
            flame.setScale(0.7);
            flame.setDepth(100);

            this.scene.tweens.add({
              targets: flame,
              x: x2 + (Math.random() - 0.5) * 30,
              y: y2 + (Math.random() - 0.5) * 30,
              duration: 320,
              ease: 'Quad.easeOut',
              onComplete: () => {
                this.scene.tweens.add({
                  targets: flame,
                  scale: 1.4,
                  alpha: 0,
                  duration: 120,
                  onComplete: () => {
                    flame.destroy();
                    resolve();
                  },
                });
              },
            });
          });
        })
      );
    }

    await Promise.all(promises);
  }

  // 6. FLAMETHROWER
  private playFlamethrower(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      let spawned = 0;
      const timer = this.scene.time.addEvent({
        delay: 25,
        repeat: 18,
        callback: () => {
          spawned++;
          const flame = this.scene.add.image(x1, y1, ASSETS.particles.flame);
          flame.setScale(0.6 + Math.random() * 0.6);
          flame.setDepth(100);

          this.scene.tweens.add({
            targets: flame,
            x: x2 + (Math.random() - 0.5) * 45,
            y: y2 + (Math.random() - 0.5) * 45,
            scale: 2.2,
            duration: 340,
            ease: 'Quad.easeIn',
            onComplete: () => {
              flame.destroy();
              if (spawned >= 18) resolve();
            },
          });
        },
      });
    });
  }

  // 7. FIRE BLAST
  private playFireBlast(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.cameras.main.shake(250, 0.012);

      // Large fireball traveling
      const fireball = this.scene.add.circle(x1, y1, 28, 0xff501a, 0.95);
      fireball.setStrokeStyle(4, 0xffd54a);
      fireball.setDepth(100);

      this.scene.tweens.add({
        targets: fireball,
        x: x2,
        y: y2,
        duration: 350,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // Explode into 5-point star explosion
          fireball.destroy();
          const burst = this.scene.add.circle(x2, y2, 60, 0xff3b00, 0.85);
          burst.setDepth(101);

          this.scene.tweens.add({
            targets: burst,
            scale: 1.8,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeOut',
            onComplete: () => {
              burst.destroy();
              resolve();
            },
          });
        },
      });
    });
  }

  // 8. THUNDER SHOCK
  private playThunderShock(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      const bolt = this.scene.add.graphics();
      bolt.setDepth(100);

      let step = 0;
      const interval = this.scene.time.addEvent({
        delay: 45,
        repeat: 5,
        callback: () => {
          step++;
          bolt.clear();
          bolt.lineStyle(3, 0xffe800, 1);
          bolt.beginPath();
          bolt.moveTo(x1, y1);

          const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 35;
          const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 35;
          bolt.lineTo(midX, midY);
          bolt.lineTo(x2 + (Math.random() - 0.5) * 15, y2 + (Math.random() - 0.5) * 15);
          bolt.strokePath();

          if (step >= 5) {
            bolt.destroy();
            resolve();
          }
        },
      });
    });
  }

  // 9. SPARK
  private playSpark(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container, targetX: number, targetY: number, isPlayer: boolean): Promise<void> {
    return new Promise(resolve => {
      const origX = sprite.x;
      const origY = sprite.y;

      // Charge forward electrifying
      this.scene.tweens.add({
        targets: sprite,
        x: Phaser.Math.Linear(origX, targetX, 0.75),
        y: Phaser.Math.Linear(origY, targetY, 0.75),
        duration: 200,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onYoyo: () => {
          const spark = this.scene.add.image(targetX, targetY, ASSETS.particles.spark);
          spark.setScale(1.5);
          spark.setDepth(101);
          this.scene.tweens.add({
            targets: spark,
            scale: 0.2,
            alpha: 0,
            duration: 150,
            onComplete: () => spark.destroy(),
          });
        },
        onComplete: () => {
          sprite.x = origX;
          sprite.y = origY;
          resolve();
        },
      });
    });
  }

  // 10. THUNDERBOLT
  private playThunderbolt(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.cameras.main.shake(200, 0.01);
      const bolt = this.scene.add.graphics();
      bolt.setDepth(100);

      let flashes = 0;
      this.scene.time.addEvent({
        delay: 50,
        repeat: 6,
        callback: () => {
          flashes++;
          bolt.clear();

          // Outer glow
          bolt.lineStyle(6, 0xffd54a, 0.9);
          bolt.beginPath();
          bolt.moveTo(x1, y1);

          const segments = 4;
          for (let s = 1; s < segments; s++) {
            const sx = Phaser.Math.Linear(x1, x2, s / segments) + (Math.random() - 0.5) * 50;
            const sy = Phaser.Math.Linear(y1, y2, s / segments) + (Math.random() - 0.5) * 50;
            bolt.lineTo(sx, sy);
          }
          bolt.lineTo(x2, y2);
          bolt.strokePath();

          // Inner white core
          bolt.lineStyle(2.5, 0xffffff, 1);
          bolt.strokePath();

          if (flashes >= 6) {
            bolt.destroy();
            resolve();
          }
        },
      });
    });
  }

  // 11. THUNDER
  private playThunder(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.cameras.main.shake(350, 0.02);

      const bolt = this.scene.add.graphics();
      bolt.setDepth(100);

      const topY = 0;
      let count = 0;

      this.scene.time.addEvent({
        delay: 40,
        repeat: 7,
        callback: () => {
          count++;
          bolt.clear();

          bolt.lineStyle(10, 0xffe600, 0.9);
          bolt.beginPath();
          bolt.moveTo(targetX + (Math.random() - 0.5) * 20, topY);
          bolt.lineTo(targetX + (Math.random() - 0.5) * 60, targetY * 0.4);
          bolt.lineTo(targetX + (Math.random() - 0.5) * 50, targetY * 0.75);
          bolt.lineTo(targetX, targetY);
          bolt.strokePath();

          bolt.lineStyle(4, 0xffffff, 1);
          bolt.strokePath();

          if (count >= 7) {
            bolt.destroy();
            resolve();
          }
        },
      });
    });
  }

  // 12. ICE BEAM
  private playIceBeam(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      const beam = this.scene.add.graphics();
      beam.setDepth(100);

      const beamAnim = { t: 0 };
      this.scene.tweens.add({
        targets: beamAnim,
        t: 1,
        duration: 380,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          beam.clear();
          beam.lineStyle(12, 0x2ac8e0, 0.85);
          beam.beginPath();
          beam.moveTo(x1, y1);
          beam.lineTo(Phaser.Math.Linear(x1, x2, beamAnim.t), Phaser.Math.Linear(y1, y2, beamAnim.t));
          beam.strokePath();

          beam.lineStyle(4, 0xffffff, 1);
          beam.strokePath();
        },
        onComplete: () => {
          // Freeze crystals at target
          for (let i = 0; i < 5; i++) {
            const crystal = this.scene.add.image(targetX(i), targetY(i), ASSETS.particles.spark);
            crystal.setTint(0x7fe8ff);
            crystal.setScale(1.2);
            crystal.setDepth(101);
            this.scene.tweens.add({
              targets: crystal,
              scale: 0.1,
              alpha: 0,
              duration: 250,
              onComplete: () => crystal.destroy(),
            });
          }
          beam.destroy();
          resolve();
        },
      });

      function targetX(i: number) { return x2 + (Math.random() - 0.5) * 35; }
      function targetY(i: number) { return y2 + (Math.random() - 0.5) * 35; }
    });
  }

  // 13. ROCK THROW
  private async playRockThrow(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    const rocks = 3;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < rocks; i++) {
      promises.push(
        new Promise(resolve => {
          this.scene.time.delayedCall(i * 90, () => {
            const rock = this.scene.add.image(x1, y1, ASSETS.particles.rock);
            rock.setScale(0.8 + Math.random() * 0.4);
            rock.setDepth(100);

            this.scene.tweens.add({
              targets: rock,
              x: x2 + (Math.random() - 0.5) * 30,
              y: y2 + (Math.random() - 0.5) * 30,
              angle: 540,
              duration: 340,
              ease: 'Quad.easeIn',
              onComplete: () => {
                this.scene.tweens.add({
                  targets: rock,
                  scale: 0.2,
                  alpha: 0,
                  duration: 100,
                  onComplete: () => {
                    rock.destroy();
                    resolve();
                  },
                });
              },
            });
          });
        })
      );
    }

    await Promise.all(promises);
  }

  // 14. PSYCHIC
  private playPsychic(targetSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      const origX = targetSprite.x;

      // Psychic distortion and wave ring
      const ring = this.scene.add.circle(targetSprite.x, targetSprite.y, 10, 0xff5fa8, 0);
      ring.setStrokeStyle(4, 0xff5fa8, 0.9);
      ring.setDepth(100);

      this.scene.tweens.add({
        targets: ring,
        scale: 6,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });

      this.scene.tweens.add({
        targets: targetSprite,
        x: origX + 12,
        duration: 50,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          targetSprite.x = origX;
          resolve();
        },
      });
    });
  }

  // 15. SHADOW BALL
  private playShadowBall(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      const ball = this.scene.add.circle(x1, y1, 18, 0x3a1a6a, 0.95);
      ball.setStrokeStyle(3, 0x8a5ad8);
      ball.setDepth(100);

      this.scene.tweens.add({
        targets: ball,
        x: x2,
        y: y2,
        scale: 1.4,
        duration: 350,
        ease: 'Quad.easeIn',
        onComplete: () => {
          ball.destroy();
          const burst = this.scene.add.circle(x2, y2, 40, 0x7a4aff, 0.8);
          burst.setDepth(101);

          this.scene.tweens.add({
            targets: burst,
            scale: 2.2,
            alpha: 0,
            duration: 250,
            onComplete: () => {
              burst.destroy();
              resolve();
            },
          });
        },
      });
    });
  }

  // 16. BITE
  private playBite(attacker: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container, targetX: number, targetY: number, isPlayer: boolean): Promise<void> {
    return new Promise(resolve => {
      const origX = attacker.x;
      const origY = attacker.y;

      this.scene.tweens.add({
        targets: attacker,
        x: Phaser.Math.Linear(origX, targetX, 0.7),
        y: Phaser.Math.Linear(origY, targetY, 0.7),
        duration: 180,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onYoyo: () => {
          // Snap teeth visual
          const g = this.scene.add.graphics();
          g.setDepth(102);
          g.fillStyle(0xffffff, 1);
          g.fillTriangle(targetX - 20, targetY - 25, targetX + 20, targetY - 25, targetX, targetY);
          g.fillTriangle(targetX - 20, targetY + 25, targetX + 20, targetY + 25, targetX, targetY);

          this.scene.time.delayedCall(120, () => g.destroy());
        },
        onComplete: () => {
          attacker.x = origX;
          attacker.y = origY;
          resolve();
        },
      });
    });
  }

  // 17. QUICK ATTACK
  private playQuickAttack(attacker: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container, targetX: number, targetY: number, isPlayer: boolean): Promise<void> {
    return new Promise(resolve => {
      const origX = attacker.x;
      const origY = attacker.y;

      // Speed blur dash
      this.scene.tweens.add({
        targets: attacker,
        x: Phaser.Math.Linear(origX, targetX, 0.85),
        y: Phaser.Math.Linear(origY, targetY, 0.85),
        alpha: 0.6,
        duration: 140,
        yoyo: true,
        ease: 'Linear',
        onComplete: () => {
          attacker.x = origX;
          attacker.y = origY;
          attacker.alpha = 1;
          resolve();
        },
      });
    });
  }

  // 18. SCRATCH
  private playScratch(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      const g = this.scene.add.graphics();
      g.setDepth(101);
      g.lineStyle(3, 0xffffff, 1);

      g.beginPath();
      g.moveTo(targetX - 25, targetY - 20);
      g.lineTo(targetX + 15, targetY + 20);

      g.moveTo(targetX - 15, targetY - 25);
      g.lineTo(targetX + 25, targetY + 15);

      g.moveTo(targetX - 35, targetY - 15);
      g.lineTo(targetX + 5, targetY + 25);
      g.strokePath();

      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        scaleX: 1.2,
        duration: 220,
        onComplete: () => {
          g.destroy();
          resolve();
        },
      });
    });
  }

  // 19. SLAM
  private playSlam(attacker: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container, targetX: number, targetY: number, isPlayer: boolean): Promise<void> {
    return new Promise(resolve => {
      const origX = attacker.x;
      const origY = attacker.y;

      this.scene.tweens.add({
        targets: attacker,
        x: Phaser.Math.Linear(origX, targetX, 0.8),
        y: Phaser.Math.Linear(origY, targetY, 0.8),
        duration: 180,
        yoyo: true,
        ease: 'Quad.easeIn',
        onYoyo: () => {
          this.scene.cameras.main.shake(150, 0.008);
        },
        onComplete: () => {
          attacker.x = origX;
          attacker.y = origY;
          resolve();
        },
      });
    });
  }

  // 20. EARTHQUAKE
  private playEarthquake(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.cameras.main.shake(400, 0.02);

      // Cracks in earth
      const crack = this.scene.add.graphics();
      crack.setDepth(99);
      crack.lineStyle(4, 0x4a3220, 0.9);
      crack.beginPath();
      crack.moveTo(targetX - 50, targetY + 40);
      crack.lineTo(targetX - 15, targetY + 45);
      crack.lineTo(targetX + 20, targetY + 38);
      crack.lineTo(targetX + 60, targetY + 42);
      crack.strokePath();

      this.scene.tweens.add({
        targets: crack,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          crack.destroy();
          resolve();
        },
      });
    });
  }

  // 21. BEAM
  private playEnergyBeam(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.cameras.main.shake(300, 0.015);
      const beam = this.scene.add.graphics();
      beam.setDepth(100);

      const anim = { width: 6 };
      this.scene.tweens.add({
        targets: anim,
        width: 32,
        duration: 400,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onUpdate: () => {
          beam.clear();
          beam.lineStyle(anim.width, 0xffd54a, 0.9);
          beam.beginPath();
          beam.moveTo(x1, y1);
          beam.lineTo(x2, y2);
          beam.strokePath();

          beam.lineStyle(anim.width * 0.45, 0xffffff, 1);
          beam.strokePath();
        },
        onComplete: () => {
          beam.destroy();
          resolve();
        },
      });
    });
  }

  // 22. GUST
  private playGust(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      const g = this.scene.add.graphics();
      g.setDepth(100);

      const progress = { t: 0 };
      this.scene.tweens.add({
        targets: progress,
        t: 1,
        duration: 350,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          g.clear();
          g.lineStyle(4, 0xffffff, 0.7);
          const cx = Phaser.Math.Linear(x1, x2, progress.t);
          const cy = Phaser.Math.Linear(y1, y2, progress.t);
          g.strokeCircle(cx, cy, 24 * progress.t);
        },
        onComplete: () => {
          g.destroy();
          resolve();
        },
      });
    });
  }

  // Fallback generic projectile
  private playGenericProjectile(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return new Promise(resolve => {
      const orb = this.scene.add.circle(x1, y1, 14, 0xffffff, 0.9);
      orb.setDepth(100);

      this.scene.tweens.add({
        targets: orb,
        x: x2,
        y: y2,
        duration: 280,
        ease: 'Quad.easeIn',
        onComplete: () => {
          orb.destroy();
          resolve();
        },
      });
    });
  }
}
