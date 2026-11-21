/**
 * CustomizationView.ts
 * Lightweight trainer customisation: pick a base trainer, then one option per
 * cosmetic slot. A live, animated preview turns through all four directions.
 */

import { TRAINER_CHARACTERS, drawCustomTrainerSprite } from '../data/characters';
import { COSMETICS, SLOT_ORDER, CosmeticSlot, PlayerAppearance, UnlockContext, isCosmeticUnlocked, describeUnlock, resolveAppearance } from '../data/cosmetics';
import { openSheet, UI_ICONS, esc } from './Sheet';

export interface CustomizationOptions {
  baseId: string;
  appearance: PlayerAppearance;
  unlock: UnlockContext;
  onConfirm: (baseId: string, appearance: PlayerAppearance) => void;
  onClose?: () => void;
}

export function openCustomization(opts: CustomizationOptions): void {
  let baseId = opts.baseId;
  const appearance: PlayerAppearance = { ...opts.appearance };
  let slot: CosmeticSlot | 'trainer' = 'outfit';
  let raf = 0;
  const sheet = openSheet({
    title: 'Trainer Style',
    icon: UI_ICONS.shirt,
    className: 'xp-custom',
    onClose: () => {
      cancelAnimationFrame(raf);
      opts.onClose?.();
    },
  });

  sheet.body.innerHTML = `
    <div class="cz-layout">
      <div class="cz-preview">
        <canvas class="cz-canvas" width="200" height="220" aria-label="Trainer preview"></canvas>
        <div class="cz-name"></div>
      </div>
      <div class="cz-controls">
        <div class="xp-tabs cz-slots" role="tablist"></div>
        <div class="cz-options"></div>
      </div>
    </div>`;
  sheet.footer.innerHTML = `<button class="xp-btn ghost" data-act="reset">Reset</button><button class="xp-btn primary" data-act="ok">Confirm Style</button>`;

  const canvas = sheet.body.querySelector('.cz-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const slotsEl = sheet.body.querySelector('.cz-slots') as HTMLElement;
  const optionsEl = sheet.body.querySelector('.cz-options') as HTMLElement;
  const nameEl = sheet.body.querySelector('.cz-name') as HTMLElement;

  const dirs: ('down' | 'right' | 'up' | 'left')[] = ['down', 'right', 'up', 'left'];
  const start = performance.now();
  const draw = (now: number) => {
    const t = (now - start) / 1000;
    const look = resolveAppearance(baseId, appearance, opts.unlock);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(100, 170, 10, 100, 150, 120);
    g.addColorStop(0, '#e0f2fe');
    g.addColorStop(1, '#f8fafc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(100, 182, 62, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    const dir = dirs[Math.floor(t / 1.6) % 4];
    const frame = Math.floor(t * 7) % 4;
    ctx.imageSmoothingEnabled = false;
    drawCustomTrainerSprite(ctx, 100, 128, dir, frame, look, false, t, 4.2);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const renderSlots = () => {
    const tabs: { key: CosmeticSlot | 'trainer'; label: string }[] = [{ key: 'trainer', label: 'Trainer' }, ...SLOT_ORDER.map(s => ({ key: s.slot, label: s.label }))];
    slotsEl.innerHTML = tabs.map(s => `<button class="xp-tab ${s.key === slot ? 'on' : ''}" data-slot="${s.key}">${s.label}</button>`).join('');
    slotsEl.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b => (b.onclick = () => {
      slot = b.dataset.slot as CosmeticSlot | 'trainer';
      renderSlots();
      renderOptions();
    }));
  };

  const renderOptions = () => {
    const base = TRAINER_CHARACTERS.find(t => t.id === baseId) || TRAINER_CHARACTERS[0];
    nameEl.innerHTML = `<b>${esc(base.name)}</b><span>${esc(base.tagline)}</span>`;
    if (slot === 'trainer') {
      optionsEl.innerHTML = TRAINER_CHARACTERS.map(
        t => `<button class="cz-opt ${t.id === baseId ? 'on' : ''}" data-base="${t.id}">
          <span class="cz-swatch" style="background:linear-gradient(135deg, ${t.palette.topMain} 50%, ${t.palette.hatMain || t.palette.hair} 50%)"></span>
          <span class="cz-opt-name">${esc(t.name)}</span>
        </button>`
      ).join('');
      optionsEl.querySelectorAll<HTMLButtonElement>('[data-base]').forEach(b => (b.onclick = () => {
        baseId = b.dataset.base!;
        renderOptions();
      }));
      return;
    }
    const current = appearance[slot] || COSMETICS.find(c => c.slot === slot)!.id;
    optionsEl.innerHTML = COSMETICS.filter(c => c.slot === slot)
      .map(c => {
        const unlocked = isCosmeticUnlocked(c, opts.unlock);
        return `<button class="cz-opt ${c.id === current ? 'on' : ''} ${unlocked ? '' : 'locked'}" data-cos="${c.id}" ${unlocked ? '' : 'aria-disabled="true"'} title="${esc(unlocked ? c.name : describeUnlock(c))}">
          <span class="cz-swatch" style="background:${c.swatch}">${unlocked ? '' : UI_ICONS.lock}</span>
          <span class="cz-opt-name">${esc(c.name)}</span>
          ${unlocked ? '' : `<span class="cz-opt-hint">${esc(describeUnlock(c))}</span>`}
        </button>`;
      })
      .join('');
    optionsEl.querySelectorAll<HTMLButtonElement>('[data-cos]').forEach(b => (b.onclick = () => {
      const c = COSMETICS.find(x => x.id === b.dataset.cos);
      if (!c || !isCosmeticUnlocked(c, opts.unlock)) return;
      appearance[c.slot] = c.id;
      renderOptions();
    }));
  };

  (sheet.footer.querySelector('[data-act="reset"]') as HTMLElement).onclick = () => {
    for (const s of SLOT_ORDER) delete appearance[s.slot];
    renderOptions();
  };
  (sheet.footer.querySelector('[data-act="ok"]') as HTMLElement).onclick = () => {
    opts.onConfirm(baseId, { ...appearance });
    sheet.close();
  };

  renderSlots();
  renderOptions();
}
