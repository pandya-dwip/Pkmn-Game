/**
 * EvolutionCinematic.ts
 * Focused evolution presentation: notification -> energy gathering ->
 * silhouette transformation -> reveal -> stats summary -> continue.
 *
 * Accessibility: no full-screen strobing. Silhouette swaps stay at or below
 * ~2.5 Hz, the single reveal flash is soft and short, and reduced-motion
 * users get a shorter, calmer sequence.
 *
 * Data safety: the caller passes `applyEvolution`, which is invoked exactly
 * once at the reveal (or immediately if the cinematic cannot run). The caller
 * journals the pending evolution in the save beforehand so a refresh mid-way
 * can be recovered.
 */

import { sound } from '../audio/SoundSynthesizer';
import { esc } from './Sheet';

export interface EvolutionCinematicOptions {
  fromId: number;
  toId: number;
  fromName: string;
  toName: string;
  artUrl: (id: number) => string;
  typesHtml: (id: number) => string;
  /** Mutates game data and returns before/after stats for the summary. */
  applyEvolution: () => { before: Record<string, number>; after: Record<string, number> };
}

const STAT_LABELS: Record<string, string> = { max: 'HP', atk: 'ATK', def: 'DEF', spa: 'SP.ATK', spd: 'SP.DEF', spe: 'SPEED' };
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function playEvolutionCinematic(o: EvolutionCinematicOptions): Promise<void> {
  const host = document.getElementById('g') || document.body;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = 'evo-cine';
  root.innerHTML = `
    <canvas class="evo-fx"></canvas>
    <div class="evo-stage">
      <div class="evo-caption">Something is happening...</div>
      <div class="evo-mon">
        <div class="evo-glow"></div>
        <img class="evo-img from" alt="" />
        <img class="evo-img to" alt="" />
      </div>
      <div class="evo-panel" hidden></div>
    </div>
    <div class="evo-flash"></div>`;
  host.appendChild(root);
  const fromImg = root.querySelector('.evo-img.from') as HTMLImageElement;
  const toImg = root.querySelector('.evo-img.to') as HTMLImageElement;
  fromImg.src = o.artUrl(o.fromId);
  toImg.src = o.artUrl(o.toId);
  const caption = root.querySelector('.evo-caption') as HTMLElement;
  const panel = root.querySelector('.evo-panel') as HTMLElement;
  const flash = root.querySelector('.evo-flash') as HTMLElement;
  const canvas = root.querySelector('.evo-fx') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  // Particle field: energy converging on the Pokémon, later bursting outward
  type P = { a: number; r: number; v: number; s: number; hue: number; out: boolean };
  const parts: P[] = [];
  let phase: 'gather' | 'burst' | 'calm' = 'gather';
  let raf = 0;
  const resize = () => {
    const r = root.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const center = () => {
    const r = root.getBoundingClientRect();
    const m = (root.querySelector('.evo-mon') as HTMLElement).getBoundingClientRect();
    return { x: m.left - r.left + m.width / 2, y: m.top - r.top + m.height / 2, w: r.width, h: r.height };
  };
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const c = center();
    ctx.clearRect(0, 0, c.w, c.h);
    if (phase === 'gather' && parts.length < (reduced ? 40 : 110)) {
      for (let i = 0; i < 3; i++) parts.push({ a: Math.random() * Math.PI * 2, r: 160 + Math.random() * 140, v: 90 + Math.random() * 90, s: 1 + Math.random() * 2.5, hue: 40 + Math.random() * 30, out: false });
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.out) p.r += p.v * 2.2 * dt;
      else {
        p.r -= p.v * dt;
        p.a += dt * 1.4;
      }
      if ((!p.out && p.r < 18) || p.r > 420) {
        parts.splice(i, 1);
        continue;
      }
      const x = c.x + Math.cos(p.a) * p.r;
      const y = c.y + Math.sin(p.a) * p.r * 0.8;
      const alpha = p.out ? Math.max(0, 1 - p.r / 420) : Math.min(1, (300 - p.r) / 120);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  let applied = false;
  let result: { before: Record<string, number>; after: Record<string, number> } | null = null;
  const apply = () => {
    if (applied) return;
    applied = true;
    result = o.applyEvolution();
  };

  try {
    root.classList.add('open');
    await wait(reduced ? 300 : 900);
    caption.textContent = `${o.fromName} is evolving!`;
    sound.cry(o.fromId, 'in');
    await wait(reduced ? 400 : 900);

    // Energy gathers; the Pokémon turns to a glowing silhouette
    root.classList.add('charging');
    sound.evolutionCharge(reduced ? 2 : 4.2);
    await wait(reduced ? 600 : 1400);

    // Silhouette alternation, accelerating but capped at ~2.5 Hz
    const swaps = reduced ? 2 : 9;
    for (let i = 0; i < swaps; i++) {
      root.classList.toggle('show-to');
      await wait(Math.max(200, 520 - i * 40));
    }

    // Reveal
    phase = 'burst';
    for (const p of parts) p.out = true;
    for (let i = 0; i < (reduced ? 20 : 70); i++) parts.push({ a: Math.random() * Math.PI * 2, r: 20, v: 120 + Math.random() * 160, s: 1.5 + Math.random() * 3, hue: 35 + Math.random() * 40, out: true });
    flash.classList.add('go');
    apply();
    root.classList.add('show-to', 'revealed');
    root.classList.remove('charging');
    sound.evolutionReveal();
    setTimeout(() => sound.cry(o.toId, 'win'), 500);
    caption.textContent = `${o.fromName} evolved into ${o.toName}!`;
    await wait(reduced ? 500 : 1200);
    phase = 'calm';

    // Summary
    const r = result as { before: Record<string, number>; after: Record<string, number> } | null;
    const rows = r
      ? Object.keys(STAT_LABELS)
          .map(k => {
            const d = (r.after[k] ?? 0) - (r.before[k] ?? 0);
            return `<div class="evo-stat"><span>${STAT_LABELS[k]}</span><b>${r.after[k] ?? '-'}</b><em>${d > 0 ? '+' + d : d === 0 ? '' : d}</em></div>`;
          })
          .join('')
      : '';
    panel.innerHTML = `
      <div class="evo-name">${esc(o.toName)}</div>
      <div class="evo-types">${o.typesHtml(o.toId)}</div>
      <div class="evo-stats">${rows}</div>
      <button class="xp-btn primary evo-continue">Continue</button>`;
    panel.hidden = false;
    root.classList.add('summary');
    await new Promise<void>(res => {
      const btn = panel.querySelector('.evo-continue') as HTMLButtonElement;
      btn.focus();
      btn.onclick = () => res();
      // Safety: never trap the game if the button is somehow unreachable
      setTimeout(res, 20000);
    });
  } finally {
    apply(); // guarantees the data change even if something above threw
    cancelAnimationFrame(raf);
    root.classList.add('closing');
    await wait(220);
    root.remove();
  }
}
