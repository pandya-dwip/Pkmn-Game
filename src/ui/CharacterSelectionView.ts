/**
 * CharacterSelectionView.ts
 * Interactive Character Customization and Selection Screen.
 * Provides Male & Female categories with live animated previews,
 * custom naming, character traits, and responsive controls.
 */

import { TRAINER_CHARACTERS, TrainerCustomization, drawCustomTrainerSprite } from '../data/characters';
import { sound } from '../audio/SoundSynthesizer';

export class CharacterSelectionView {
  private container: HTMLElement | null = null;
  private previewCanvas: HTMLCanvasElement | null = null;
  private previewCtx: CanvasRenderingContext2D | null = null;
  private animId: number | null = null;
  private currentGender: 'male' | 'female' = 'male';
  private selectedTrainerId: string = 'male_red';
  private trainerName: string = 'DWIP';
  private animTimer: number = 0;
  private animFrame: number = 0;
  private previewDir: 'down' | 'left' | 'right' | 'up' = 'down';
  private onConfirmCallback: ((trainerId: string, trainerName: string) => void) | null = null;

  public render(container: HTMLElement, initialName: string = 'DWIP', onConfirm: (trainerId: string, trainerName: string) => void): void {
    this.container = container;
    this.trainerName = initialName || 'DWIP';
    this.onConfirmCallback = onConfirm;

    this.buildHTML();
    this.attachEvents();
    this.startPreviewAnimation();
  }

  private getFilteredCharacters(): TrainerCustomization[] {
    return TRAINER_CHARACTERS.filter(t => t.gender === this.currentGender);
  }

  private getSelectedTrainer(): TrainerCustomization {
    return TRAINER_CHARACTERS.find(t => t.id === this.selectedTrainerId) || TRAINER_CHARACTERS[0];
  }

  private buildHTML(): void {
    if (!this.container) return;

    const currentTrainer = this.getSelectedTrainer();
    const characters = this.getFilteredCharacters();

    this.container.innerHTML = `
      <div class="char-select-screen">
        <div class="char-select-header">
          <span class="char-select-badge">TRAINER CUSTOMIZATION</span>
          <h1 class="char-select-title">CHOOSE YOUR TRAINER</h1>
          <p class="char-select-subtitle">Select your avatar and personalize your trainer identity for the Kanto journey.</p>
        </div>

        <div class="char-select-layout">
          <!-- Left: Live Animated 2.5D Sprite Stage -->
          <div class="char-preview-card">
            <div class="char-preview-stage">
              <canvas id="char-preview-canvas" width="180" height="200"></canvas>
              <div class="char-dir-controls">
                <button class="char-dir-btn ${this.previewDir === 'down' ? 'active' : ''}" data-dir="down" title="Face Front">⬇</button>
                <button class="char-dir-btn ${this.previewDir === 'left' ? 'active' : ''}" data-dir="left" title="Face Left">⬅</button>
                <button class="char-dir-btn ${this.previewDir === 'right' ? 'active' : ''}" data-dir="right" title="Face Right">➡</button>
                <button class="char-dir-btn ${this.previewDir === 'up' ? 'active' : ''}" data-dir="up" title="Face Back">⬆</button>
              </div>
            </div>

            <div class="char-info-box">
              <div class="char-info-name">${currentTrainer.name.toUpperCase()}</div>
              <div class="char-info-title">${currentTrainer.title}</div>
              <div class="char-info-tagline"><span class="tag-pill">${currentTrainer.tagline}</span></div>
              <p class="char-info-desc">${currentTrainer.description}</p>
            </div>
          </div>

          <!-- Right: Category Selection, Character Tiles & Naming -->
          <div class="char-config-card">
            <!-- Gender Selector Tabs -->
            <div class="char-gender-tabs">
              <button class="char-gender-btn ${this.currentGender === 'male' ? 'active' : ''}" data-gender="male">
                <span>♂ MALE TRAINERS</span>
              </button>
              <button class="char-gender-btn ${this.currentGender === 'female' ? 'active' : ''}" data-gender="female">
                <span>♀ FEMALE TRAINERS</span>
              </button>
            </div>

            <!-- Trainer Roster Cards -->
            <div class="char-roster-grid">
              ${characters.map((t, idx) => `
                <button class="char-roster-btn ${t.id === this.selectedTrainerId ? 'selected' : ''}" data-id="${t.id}">
                  <span class="roster-number">0${idx + 1}</span>
                  <div class="roster-name">${t.name}</div>
                  <div class="roster-tagline">${t.tagline}</div>
                </button>
              `).join('')}
            </div>

            <!-- Name Input Field -->
            <div class="char-name-group">
              <label for="char-name-input" class="char-name-label">TRAINER NAME</label>
              <div class="char-name-input-wrap">
                <input
                  type="text"
                  id="char-name-input"
                  class="char-name-input"
                  maxlength="12"
                  value="${this.trainerName}"
                  placeholder="TRAINER NAME"
                  autocomplete="off"
                />
                <button id="char-name-random" class="char-name-rnd" title="Default Name">↺</button>
              </div>
              <span class="char-name-hint">Max 12 characters. Displayed on League ID & Tournament Bracket.</span>
            </div>

            <!-- Confirmation Action -->
            <button id="btn-char-confirm" class="char-confirm-btn">
              <span>CONFIRM TRAINER & CONTINUE ➔</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.previewCanvas = this.container.querySelector('#char-preview-canvas') as HTMLCanvasElement;
    if (this.previewCanvas) {
      this.previewCtx = this.previewCanvas.getContext('2d');
    }
  }

  private attachEvents(): void {
    if (!this.container) return;

    // Gender Tabs
    this.container.querySelectorAll<HTMLButtonElement>('.char-gender-btn').forEach(btn => {
      btn.onclick = () => {
        const gender = btn.dataset.gender as 'male' | 'female';
        if (gender !== this.currentGender) {
          this.currentGender = gender;
          sound.beep(659, 0.1, 'sine');
          const firstOfGender = this.getFilteredCharacters()[0];
          if (firstOfGender) {
            this.selectedTrainerId = firstOfGender.id;
          }
          this.buildHTML();
          this.attachEvents();
        }
      };
    });

    // Character Roster Selection
    this.container.querySelectorAll<HTMLButtonElement>('.char-roster-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (id && id !== this.selectedTrainerId) {
          this.selectedTrainerId = id;
          sound.beep(880, 0.1, 'triangle');
          this.buildHTML();
          this.attachEvents();
        }
      };
    });

    // Direction Preview Controls
    this.container.querySelectorAll<HTMLButtonElement>('.char-dir-btn').forEach(btn => {
      btn.onclick = () => {
        const dir = btn.dataset.dir as 'down' | 'left' | 'right' | 'up';
        if (dir) {
          this.previewDir = dir;
          sound.beep(523, 0.08, 'sine');
          this.container?.querySelectorAll('.char-dir-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      };
    });

    // Name Input Change
    const nameInput = this.container.querySelector('#char-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.oninput = () => {
        this.trainerName = nameInput.value;
      };
      nameInput.onkeydown = e => {
        if (e.key === 'Enter') {
          this.confirmSelection();
        }
      };
    }

    // Default Name Button
    const rndBtn = this.container.querySelector('#char-name-random') as HTMLButtonElement;
    if (rndBtn && nameInput) {
      rndBtn.onclick = () => {
        const current = this.getSelectedTrainer();
        this.trainerName = current.name.toUpperCase();
        nameInput.value = this.trainerName;
        sound.beep(784, 0.1, 'sine');
      };
    }

    // Confirm Button
    const confirmBtn = this.container.querySelector('#btn-char-confirm') as HTMLButtonElement;
    if (confirmBtn) {
      confirmBtn.onclick = () => this.confirmSelection();
    }
  }

  private confirmSelection(): void {
    const raw = this.trainerName.trim();
    if (!raw || raw.length < 1 || raw.length > 12) {
      sound.beep(180, 0.25, 'sawtooth');
      alert('Please enter a valid trainer name between 1 and 12 characters.');
      return;
    }

    sound.beep(659, 0.15, 'sine');
    sound.beep(880, 0.25, 'sine', 0.1, 0.15);
    this.stopPreviewAnimation();
    if (this.onConfirmCallback) {
      this.onConfirmCallback(this.selectedTrainerId, raw);
    }
  }

  private startPreviewAnimation(): void {
    this.stopPreviewAnimation();
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      this.animTimer += dt;

      // Animate walk cycle every 0.2s
      if (this.animTimer > 0.22) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }

      this.renderPreviewFrame(now / 1000);
      this.animId = requestAnimationFrame(loop);
    };

    this.animId = requestAnimationFrame(loop);
  }

  private stopPreviewAnimation(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private renderPreviewFrame(timeSec: number): void {
    if (!this.previewCanvas || !this.previewCtx) return;
    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Subtle radial pedestal spotlight
    const grad = ctx.createRadialGradient(w / 2, h / 2 + 35, 10, w / 2, h / 2 + 35, 75);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.35)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 38, 65, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pedestal ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 38, 55, 18, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Render scaled up 2.5D trainer sprite (2.6x scale for crisp showcase)
    drawCustomTrainerSprite(
      ctx,
      w / 2,
      h / 2 + 10,
      this.previewDir,
      this.animFrame,
      this.selectedTrainerId,
      false,
      timeSec,
      2.6
    );
  }

  public destroy(): void {
    this.stopPreviewAnimation();
  }
}

export const characterSelectionView = new CharacterSelectionView();
