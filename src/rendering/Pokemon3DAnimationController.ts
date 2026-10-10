/**
 * Pokemon3DAnimationController.ts
 * Discovers and controls embedded GLTF animations (idle, attack, hit, faint)
 * with robust procedural animation fallbacks for models without embedded clips.
 */

import * as THREE from 'three';

export interface DiscoveredAnimations {
  idle: THREE.AnimationClip | null;
  attack: THREE.AnimationClip | null;
  hit: THREE.AnimationClip | null;
  faint: THREE.AnimationClip | null;
  jump: THREE.AnimationClip | null;
}

export class Pokemon3DAnimationController {
  private model: THREE.Group;
  private mixer: THREE.AnimationMixer;
  private discovered: DiscoveredAnimations;
  private currentAction: THREE.AnimationAction | null = null;

  // Transform baselines
  public basePosition = new THREE.Vector3();
  public baseRotation = new THREE.Euler();
  public baseScale = new THREE.Vector3(1, 1, 1);

  // Procedural animation states
  private time = Math.random() * 10;
  private isHit = false;
  private hitTimer = 0;
  private isAttacking = false;
  private attackTimer = 0;
  private attackDuration = 0.5;
  private attackLungeDirection = new THREE.Vector3(1, 0, 0);
  private isFainting = false;
  private faintTimer = 0;
  private originalOpacities: Map<THREE.Material, number> = new Map();

  // Rigged bone tracking and T-Pose relaxation
  private bones = {
    leftArm: null as THREE.Bone | null,
    rightArm: null as THREE.Bone | null,
    leftForearm: null as THREE.Bone | null,
    rightForearm: null as THREE.Bone | null,
    head: null as THREE.Bone | null,
    spine: null as THREE.Bone | null,
    tail: null as THREE.Bone | null,
  };
  private boneBaselines: Map<THREE.Bone, THREE.Euler> = new Map();

  constructor(model: THREE.Group, clips: THREE.AnimationClip[]) {
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.discovered = this.discoverClips(clips);

    // Save material opacities for fading
    this.model.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (mat) {
            this.originalOpacities.set(mat, mat.opacity !== undefined ? mat.opacity : 1.0);
          }
        }
      }
    });

    // Discover skeletal bones for procedural animation & T-pose relaxation
    this.discoverBones();

    // Start with idle animation
    this.playIdle();
  }

  /**
   * Dynamically inspects available clips to find appropriate animations.
   */
  private discoverClips(clips: THREE.AnimationClip[]): DiscoveredAnimations {
    const discovered: DiscoveredAnimations = {
      idle: null,
      attack: null,
      hit: null,
      faint: null,
      jump: null,
    };

    if (!clips || clips.length === 0) return discovered;

    for (const clip of clips) {
      const name = clip.name.toLowerCase();

      if (!discovered.idle && (name.includes('idle') || name.includes('wait') || name.includes('001aidle'))) {
        discovered.idle = clip;
      } else if (!discovered.attack && (name.includes('fight_b') || name.includes('attack') || name.includes('fight') || name.includes('action'))) {
        discovered.attack = clip;
      } else if (!discovered.hit && (name.includes('fight_d') || name.includes('damage') || name.includes('hit') || name.includes('hurt'))) {
        discovered.hit = clip;
      } else if (!discovered.faint && (name.includes('ko') || name.includes('faint') || name.includes('die') || name.includes('down'))) {
        discovered.faint = clip;
      } else if (!discovered.jump && name.includes('jump')) {
        discovered.jump = clip;
      }
    }

    // Fallback: if no idle found but clips exist, use the first clip as idle
    if (!discovered.idle && clips.length > 0) {
      discovered.idle = clips[0];
    }

    return discovered;
  }

  /**
   * Discovers skeletal bones and saves their rest rotations.
   * If the model has no idle animation track, relaxes bind T-pose arms into combat guard stance.
   */
  private discoverBones(): void {
    if (this.discovered.idle) return;

    this.model.traverse(child => {
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        const name = bone.name.toLowerCase();
        this.boneBaselines.set(bone, bone.rotation.clone());

        if (
          !this.bones.leftArm &&
          (name.includes('larm') ||
            name.includes('arm_l') ||
            name.includes('arm1_l') ||
            name.includes('leftarm') ||
            name.includes('l_arm') ||
            name.includes('lupperarm'))
        ) {
          this.bones.leftArm = bone;
        } else if (
          !this.bones.rightArm &&
          (name.includes('rarm') ||
            name.includes('arm_r') ||
            name.includes('arm1_r') ||
            name.includes('rightarm') ||
            name.includes('r_arm') ||
            name.includes('rupperarm'))
        ) {
          this.bones.rightArm = bone;
        } else if (
          !this.bones.leftForearm &&
          (name.includes('lforearm') ||
            name.includes('forearm_l') ||
            name.includes('arm2_l') ||
            name.includes('leftforearm') ||
            name.includes('l_forearm'))
        ) {
          this.bones.leftForearm = bone;
        } else if (
          !this.bones.rightForearm &&
          (name.includes('rforearm') ||
            name.includes('forearm_r') ||
            name.includes('arm2_r') ||
            name.includes('rightforearm') ||
            name.includes('r_forearm'))
        ) {
          this.bones.rightForearm = bone;
        } else if (!this.bones.head && (name.includes('head') || name.includes('neck'))) {
          this.bones.head = bone;
        } else if (
          !this.bones.spine &&
          (name.includes('spine2') ||
            name.includes('spine1') ||
            name.includes('spine') ||
            name.includes('chest') ||
            name.includes('torso'))
        ) {
          this.bones.spine = bone;
        } else if (!this.bones.tail && name.includes('tail')) {
          this.bones.tail = bone;
        }
      }
    });

    this.relaxTPose();
  }

  /**
   * Poses upper arms naturally down and bends elbows forward to eliminate T-pose.
   */
  private relaxTPose(): void {
    if (this.discovered.idle) return;

    if (this.bones.leftArm) {
      this.bones.leftArm.rotation.z -= 0.75;
      this.bones.leftArm.rotation.y += 0.35;
    }
    if (this.bones.rightArm) {
      this.bones.rightArm.rotation.z += 0.75;
      this.bones.rightArm.rotation.y -= 0.35;
    }
    if (this.bones.leftForearm) {
      this.bones.leftForearm.rotation.z -= 0.35;
    }
    if (this.bones.rightForearm) {
      this.bones.rightForearm.rotation.z += 0.35;
    }
  }

  /**
   * Sets the baseline transform that procedural animations modify.
   */
  public setBaseTransform(position: THREE.Vector3, rotationY: number, scale: THREE.Vector3): void {
    this.basePosition.copy(position);
    this.baseRotation.set(0, rotationY, 0);
    this.baseScale.copy(scale);

    this.model.position.copy(this.basePosition);
    this.model.rotation.copy(this.baseRotation);
    this.model.scale.copy(this.baseScale);
  }

  /**
   * Starts playing the idle animation (or sets procedural idle).
   */
  public playIdle(): void {
    if (this.isFainting) return;

    if (this.discovered.idle) {
      const action = this.mixer.clipAction(this.discovered.idle);
      action.reset();
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.fadeIn(0.2);
      action.play();
      this.currentAction = action;
    }
  }

  /**
   * Plays an attack animation (clip or procedural lunge).
   */
  public async playAttack(lungeVector: THREE.Vector3 = new THREE.Vector3(1, 0, 0), duration: number = 0.32): Promise<void> {
    if (this.isFainting) return;

    this.isAttacking = true;
    this.attackTimer = 0;
    this.attackDuration = duration;
    this.attackLungeDirection.copy(lungeVector).normalize();

    if (this.discovered.attack) {
      const action = this.mixer.clipAction(this.discovered.attack);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.play();
    }

    return new Promise(resolve => {
      setTimeout(() => {
        this.isAttacking = false;
        this.playIdle();
        resolve();
      }, duration * 1000);
    });
  }

  /**
   * Plays a hit reaction (clip or procedural recoil + material flash).
   */
  public async playHit(isCritical: boolean = false): Promise<void> {
    if (this.isFainting) return;

    this.isHit = true;
    this.hitTimer = isCritical ? 0.28 : 0.18;

    // Flash materials to white / emissive
    this.setEmissiveFlash(true, isCritical ? 0xff4444 : 0xffffff);

    if (this.discovered.hit) {
      const action = this.mixer.clipAction(this.discovered.hit);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.play();
    }

    return new Promise(resolve => {
      setTimeout(() => {
        this.setEmissiveFlash(false);
        this.isHit = false;
        this.playIdle();
        resolve();
      }, (isCritical ? 280 : 180));
    });
  }

  /**
   * Plays faint animation (clip or procedural stagger and dissolve).
   */
  public async playFaint(): Promise<void> {
    this.isFainting = true;
    this.faintTimer = 0;

    if (this.discovered.faint) {
      const action = this.mixer.clipAction(this.discovered.faint);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
    }

    return new Promise(resolve => {
      const duration = 1200;
      const startTime = performance.now();

      const animateFaint = () => {
        const elapsed = (performance.now() - startTime) / duration;
        const progress = Math.min(1, elapsed);

        // Lower model down into ground
        this.model.position.y = this.basePosition.y - progress * 0.9;
        this.model.rotation.z = this.baseRotation.z + progress * 0.4;

        // Fade opacity
        this.model.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
              if (mat) {
                const orig = this.originalOpacities.get(mat) || 1.0;
                mat.opacity = Math.max(0, orig * (1 - progress));
              }
            }
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animateFaint);
        } else {
          this.model.visible = false;
          resolve();
        }
      };

      requestAnimationFrame(animateFaint);
    });
  }

  /**
   * Plays entrance animation: scales up from 0 with slight spin and bounce.
   */
  public async playEntrance(): Promise<void> {
    this.isFainting = false;
    this.model.visible = true;

    // Reset material opacities
    this.model.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (mat) {
            mat.opacity = this.originalOpacities.get(mat) || 1.0;
          }
        }
      }
    });

    return new Promise(resolve => {
      const duration = 500;
      const startTime = performance.now();

      const animateEntrance = () => {
        const elapsed = (performance.now() - startTime) / duration;
        const p = Math.min(1, elapsed);

        // Elastic overshoot bounce curve
        const scaleFactor = p === 1 ? 1 : Math.sin(p * Math.PI * 1.5) * 1.1;

        this.model.scale.set(
          this.baseScale.x * Math.max(0.01, scaleFactor),
          this.baseScale.y * Math.max(0.01, scaleFactor),
          this.baseScale.z * Math.max(0.01, scaleFactor)
        );

        // Slight landing bob
        this.model.position.y = this.basePosition.y + (1 - p) * 1.2;

        if (p < 1) {
          requestAnimationFrame(animateEntrance);
        } else {
          this.model.scale.copy(this.baseScale);
          this.model.position.copy(this.basePosition);
          this.playIdle();
          resolve();
        }
      };

      requestAnimationFrame(animateEntrance);
    });
  }

  /**
   * Plays recall animation: shrinks into Pokeball beam.
   */
  public async playRecall(): Promise<void> {
    return new Promise(resolve => {
      const duration = 400;
      const startTime = performance.now();

      const animateRecall = () => {
        const elapsed = (performance.now() - startTime) / duration;
        const p = Math.min(1, elapsed);

        const s = 1 - p;
        this.model.scale.set(
          this.baseScale.x * Math.max(0.01, s),
          this.baseScale.y * Math.max(0.01, s * 1.3),
          this.baseScale.z * Math.max(0.01, s)
        );
        this.model.position.y = this.basePosition.y + p * 0.5;

        if (p < 1) {
          requestAnimationFrame(animateRecall);
        } else {
          this.model.visible = false;
          resolve();
        }
      };

      requestAnimationFrame(animateRecall);
    });
  }

  private setEmissiveFlash(on: boolean, colorHex: number = 0xffffff): void {
    this.model.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (mat && 'emissive' in mat) {
            const stdMat = mat as THREE.MeshStandardMaterial;
            if (on) {
              stdMat.emissive.setHex(colorHex);
              stdMat.emissiveIntensity = 0.8;
            } else {
              stdMat.emissive.setHex(0x000000);
              stdMat.emissiveIntensity = 0;
            }
          }
        }
      }
    });
  }

  /**
   * Updates animations every frame.
   */
  public update(delta: number): void {
    this.time += delta;

    // 1. Advance mixer (embedded GLTF animations)
    this.mixer.update(delta);

    if (this.isFainting) return;

    // 2. Procedural hit recoil
    if (this.isHit) {
      this.hitTimer -= delta;
      const progress = Math.max(0, this.hitTimer / 0.3);
      const shake = Math.sin(this.time * 40) * 0.12 * progress;
      this.model.position.x = this.basePosition.x - (this.attackLungeDirection.x * 0.25 * progress) + shake;
      this.model.position.z = this.basePosition.z - (this.attackLungeDirection.z * 0.25 * progress);
      this.model.scale.y = this.baseScale.y * (1 - 0.15 * progress);
      return;
    }

    // 3. Procedural attack lunge
    if (this.isAttacking) {
      this.attackTimer += delta;
      const p = Math.min(1, this.attackTimer / this.attackDuration);
      // Lunge curve: quick thrust forward (0 to 0.4), hold/strike (0.4 to 0.6), return (0.6 to 1.0)
      let lungeDist = 0;
      if (p < 0.4) {
        lungeDist = (p / 0.4) * 0.5;
      } else if (p < 0.6) {
        lungeDist = 0.5;
      } else {
        lungeDist = 0.5 * (1 - (p - 0.6) / 0.4);
      }

      this.model.position.x = this.basePosition.x + this.attackLungeDirection.x * lungeDist;
      this.model.position.z = this.basePosition.z + this.attackLungeDirection.z * lungeDist;
      this.model.position.y = this.basePosition.y + Math.sin(p * Math.PI) * 0.18;
      return;
    }

    // 4. Procedural idle animation for living, animated Pokémon
    if (!this.discovered.idle) {
      // A. Skeleton bone animation (for rigged models without embedded animation clips)
      if (this.bones.spine) {
        const sb = this.boneBaselines.get(this.bones.spine);
        if (sb) this.bones.spine.rotation.x = sb.x + Math.sin(this.time * 2.6) * 0.04;
      }

      if (this.bones.head) {
        const hb = this.boneBaselines.get(this.bones.head);
        if (hb) {
          this.bones.head.rotation.y = hb.y + Math.sin(this.time * 1.3) * 0.08;
          this.bones.head.rotation.x = hb.x + Math.sin(this.time * 2.2) * 0.04;
        }
      }

      if (this.bones.leftArm) {
        const ab = this.boneBaselines.get(this.bones.leftArm);
        if (ab) {
          this.bones.leftArm.rotation.z = ab.z - 0.75 + Math.sin(this.time * 2.6) * 0.04;
          this.bones.leftArm.rotation.y = ab.y + 0.35 + Math.sin(this.time * 1.8) * 0.03;
        }
      }

      if (this.bones.rightArm) {
        const ab = this.boneBaselines.get(this.bones.rightArm);
        if (ab) {
          this.bones.rightArm.rotation.z = ab.z + 0.75 - Math.sin(this.time * 2.6) * 0.04;
          this.bones.rightArm.rotation.y = ab.y - 0.35 - Math.sin(this.time * 1.8) * 0.03;
        }
      }

      if (this.bones.leftForearm) {
        const fb = this.boneBaselines.get(this.bones.leftForearm);
        if (fb) this.bones.leftForearm.rotation.z = fb.z - 0.35 + Math.sin(this.time * 2.6 + 0.5) * 0.03;
      }

      if (this.bones.rightForearm) {
        const fb = this.boneBaselines.get(this.bones.rightForearm);
        if (fb) this.bones.rightForearm.rotation.z = fb.z + 0.35 - Math.sin(this.time * 2.6 + 0.5) * 0.03;
      }

      if (this.bones.tail) {
        const tb = this.boneBaselines.get(this.bones.tail);
        if (tb) this.bones.tail.rotation.y = tb.y + Math.sin(this.time * 3.2) * 0.15;
      }

      // B. Whole-model dynamic martial/boxer bounce & living stance
      // Gives all models (including unrigged meshes like Hitmonlee) energetic fighting idle motion
      const bounce = Math.abs(Math.sin(this.time * 3.2)) * 0.06;
      const weightShift = Math.sin(this.time * 1.6) * 0.035;
      const swayZ = Math.sin(this.time * 1.6) * 0.025;
      const swayY = Math.sin(this.time * 1.6) * 0.035;

      const breatheY = 1 + Math.sin(this.time * 3.2) * 0.03;
      const breatheXZ = 1 - Math.sin(this.time * 3.2) * 0.015;

      this.model.scale.set(
        this.baseScale.x * breatheXZ,
        this.baseScale.y * breatheY,
        this.baseScale.z * breatheXZ
      );

      this.model.rotation.y = this.baseRotation.y + swayY;
      this.model.rotation.z = this.baseRotation.z + swayZ;
      this.model.position.x = this.basePosition.x + weightShift;
      this.model.position.y = this.basePosition.y + bounce;
    } else {
      this.model.position.copy(this.basePosition);
      this.model.rotation.copy(this.baseRotation);
    }
  }

  public dispose(): void {
    this.mixer.stopAllAction();
  }
}
