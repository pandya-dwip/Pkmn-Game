/**
 * InputManager.ts
 * Unified Input System supporting Desktop (WASD, Arrow Keys)
 * and Mobile Touch / Drag Virtual Joystick with velocity scaling.
 * Prevents accidental browser scrolling, zooming, or gestures.
 */

export interface MovementVector {
  dx: number;        // Normalized -1 to 1
  dy: number;        // Normalized -1 to 1
  magnitude: number; // 0 to 1
  isMoving: boolean;
  dir: 'up' | 'down' | 'left' | 'right';
}

export class InputManager {
  private keys: Record<string, boolean> = {};
  private activePointerId: number | null = null;
  private touchOriginX = 0;
  private touchOriginY = 0;
  private touchCurrentX = 0;
  private touchCurrentY = 0;
  private joystickActive = false;
  private maxRadius = 48; // Max thumb displacement in pixels
  private deadZone = 6;   // Ignore small micro-jitters

  private joystickEl: HTMLElement | null = null;
  private stickEl: HTMLElement | null = null;
  private containerEl: HTMLElement | null = null;

  public onInteract: (() => void) | null = null;
  public onOpenMenu: (() => void) | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
  }

  public init(viewport: HTMLElement, joystickElement: HTMLElement, stickElement: HTMLElement): void {
    this.containerEl = viewport;
    this.joystickEl = joystickElement;
    this.stickEl = stickElement;

    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);

    // Pointer events on the game world viewport
    viewport.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerCancel);

    // Prevent default context menus and scrolling
    viewport.style.touchAction = 'none';
    viewport.style.userSelect = 'none';
    (viewport.style as any).webkitUserSelect = 'none';
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.containerEl) {
      this.containerEl.removeEventListener('pointerdown', this.handlePointerDown);
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerCancel);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const isControlKey = [
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      'w', 'a', 's', 'd', ' ', 'enter', 'e', 'z', 'escape'
    ].includes(key);

    if (isControlKey) {
      // Don't prevent default for text inputs
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    }

    if (key === 'arrowup' || key === 'w') this.keys['up'] = true;
    if (key === 'arrowdown' || key === 's') this.keys['down'] = true;
    if (key === 'arrowleft' || key === 'a') this.keys['left'] = true;
    if (key === 'arrowright' || key === 'd') this.keys['right'] = true;

    if (key === ' ' || key === 'enter' || key === 'e' || key === 'z') {
      if (this.onInteract) this.onInteract();
    }

    if (key === 'escape') {
      if (this.onOpenMenu) this.onOpenMenu();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.keys['up'] = false;
    if (key === 'arrowdown' || key === 's') this.keys['down'] = false;
    if (key === 'arrowleft' || key === 'a') this.keys['left'] = false;
    if (key === 'arrowright' || key === 'd') this.keys['right'] = false;
  }

  private handlePointerDown(e: PointerEvent): void {
    // If clicking an interactive button inside viewport, ignore joystick
    const target = e.target as HTMLElement;
    if (target && target.closest('button, .hud-btn, .route-prompt, #btn-interact')) {
      return;
    }

    e.preventDefault();
    this.activePointerId = e.pointerId;

    if (this.containerEl) {
      const rect = this.containerEl.getBoundingClientRect();
      this.touchOriginX = e.clientX - rect.left;
      this.touchOriginY = e.clientY - rect.top;
      this.touchCurrentX = this.touchOriginX;
      this.touchCurrentY = this.touchOriginY;
      this.joystickActive = true;

      // Position the dynamic virtual joystick base at initial touch
      if (this.joystickEl) {
        this.joystickEl.style.left = `${this.touchOriginX}px`;
        this.joystickEl.style.top = `${this.touchOriginY}px`;
        this.joystickEl.classList.remove('hidden');
        this.joystickEl.classList.add('active');
      }
      if (this.stickEl) {
        this.stickEl.style.transform = `translate(0px, 0px)`;
      }

      try {
        this.containerEl.setPointerCapture(e.pointerId);
      } catch { }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.joystickActive || e.pointerId !== this.activePointerId || !this.containerEl) return;
    e.preventDefault();

    const rect = this.containerEl.getBoundingClientRect();
    this.touchCurrentX = e.clientX - rect.left;
    this.touchCurrentY = e.clientY - rect.top;

    const rawDx = this.touchCurrentX - this.touchOriginX;
    const rawDy = this.touchCurrentY - this.touchOriginY;
    const dist = Math.hypot(rawDx, rawDy);

    // Clamp stick visual displacement to maxRadius
    let stickX = rawDx;
    let stickY = rawDy;
    if (dist > this.maxRadius) {
      stickX = (rawDx / dist) * this.maxRadius;
      stickY = (rawDy / dist) * this.maxRadius;
    }

    if (this.stickEl) {
      this.stickEl.style.transform = `translate(${stickX}px, ${stickY}px)`;
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (e.pointerId === this.activePointerId) {
      this.resetTouch();
    }
  }

  private handlePointerCancel(e: PointerEvent): void {
    if (e.pointerId === this.activePointerId) {
      this.resetTouch();
    }
  }

  public resetTouch(): void {
    this.activePointerId = null;
    this.joystickActive = false;
    this.touchCurrentX = this.touchOriginX;
    this.touchCurrentY = this.touchOriginY;

    if (this.joystickEl) {
      this.joystickEl.classList.remove('active');
      this.joystickEl.classList.add('hidden');
    }
    if (this.stickEl) {
      this.stickEl.style.transform = `translate(0px, 0px)`;
    }
  }

  /**
   * Returns current unified movement vector from Keyboard or Touch
   */
  public getMovement(): MovementVector {
    let dx = 0;
    let dy = 0;
    let magnitude = 0;

    // 1. Touch Joystick input
    if (this.joystickActive) {
      const rawDx = this.touchCurrentX - this.touchOriginX;
      const rawDy = this.touchCurrentY - this.touchOriginY;
      const dist = Math.hypot(rawDx, rawDy);

      if (dist >= this.deadZone) {
        magnitude = Math.min(1.0, dist / this.maxRadius);
        dx = (rawDx / dist) * magnitude;
        dy = (rawDy / dist) * magnitude;
      }
    }

    // 2. Keyboard Input overrides/combines with touch
    let kx = 0;
    let ky = 0;
    if (this.keys['left']) kx -= 1;
    if (this.keys['right']) kx += 1;
    if (this.keys['up']) ky -= 1;
    if (this.keys['down']) ky += 1;

    if (kx !== 0 || ky !== 0) {
      // Normalize diagonal keyboard input
      const len = Math.hypot(kx, ky);
      dx = kx / len;
      dy = ky / len;
      magnitude = 1.0;
    }

    // Determine facing direction based on dominant component
    let dir: 'up' | 'down' | 'left' | 'right' = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 0) {
      dir = dy > 0 ? 'down' : 'up';
    }

    return {
      dx,
      dy,
      magnitude,
      isMoving: magnitude > 0.05,
      dir,
    };
  }
}

export const inputManager = new InputManager();
