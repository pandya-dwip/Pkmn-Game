// Exact combat animations, Web Animations API and particle effects matching kanto-cup.html

export const FXE: Record<string, string> = {
  No: '💥',
  Fi: '🔥',
  Wa: '💧',
  El: '⚡',
  Gr: '🍃',
  Ic: '❄️',
  Fg: '👊',
  Po: '☠️',
  Gd: '🪨',
  Fl: '💨',
  Ps: '🔮',
  Bu: '🐛',
  Ro: '🪨',
  Gh: '👻',
  Dr: '🐉',
};

export const COL: Record<string, string> = {
  No: '#ffffff',
  Fi: '#ff6a2a',
  Wa: '#3a9bff',
  El: '#ffe34a',
  Gr: '#4cd05a',
  Ic: '#7fe8ff',
  Fg: '#d04a3a',
  Po: '#b24ad0',
  Gd: '#c9a14a',
  Fl: '#a79bff',
  Ps: '#ff5fa8',
  Bu: '#9bc23a',
  Ro: '#a58d4a',
  Gh: '#7a5fc0',
  Dr: '#6a4aff',
};

const MKL: Record<string, string> = {
  spark: 'Ember|Powder Snow|Poison Sting|Mud Slap|Gust|Acid|Dragon Rage',
  stream: 'Flamethrower|Water Gun|Bubble Beam|Sludge',
  blast: 'Fire Blast|Hydro Pump|Surf|Sludge Bomb|Sky Attack|Outrage|Blizzard',
  bolt: 'Thunder Shock|Spark|Thunderbolt|Thunder',
  leaf: 'Razor Leaf',
  vine: 'Vine Whip|Giga Drain',
  shard: 'Ice Shard|Pin Missile|Rock Tomb',
  rock: 'Rock Throw|Rock Slide|Stone Edge',
  beam: 'Ice Beam|Psybeam|Hyper Beam|Solar Beam|Dragon Pulse',
  wave: 'Psychic|Confusion|Future Sight',
  orb: 'Shadow Ball|Hex',
  bite: 'Fire Fang|Bug Bite',
  claw: 'Scratch|Dragon Claw|X-Scissor',
  punch: 'Karate Chop|Cross Chop|Dynamic Punch|Low Kick',
  dash: 'Quick Attack|Aerial Ace|Shadow Sneak|Lick|Wing Attack',
  slam: 'Tackle|Body Slam|Headbutt|Megahorn',
  quake: 'Bulldoze|Dig|Earthquake',
};

export const MK: Record<string, string> = {};
for (const k in MKL) {
  MKL[k].split('|').forEach(n => (MK[n] = k));
}

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const R = Math.random;
const hash = (n: string) => [...n].reduce((a, c) => a + c.charCodeAt(0), 0);
const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const ctr = (e: HTMLElement): { x: number; y: number } => ({
  x: e.offsetLeft + e.offsetWidth / 2,
  y: e.offsetTop + e.offsetHeight / 2,
});

export const el = (c: string, css?: Partial<CSSStyleDeclaration>, t?: string): HTMLElement => {
  const d = document.createElement('div');
  d.className = c;
  if (css) Object.assign(d.style, css);
  if (t) d.textContent = t;
  const world = $('#world');
  if (world) world.appendChild(d);
  return d;
};

export const fly = (d: HTMLElement, k: Keyframe[], o: KeyframeAnimationOptions, rm: boolean = true): Promise<Animation> => {
  const a = d.animate(k, o);
  if (rm) {
    a.finished.then(
      () => d.remove(),
      () => {}
    );
  }
  return a.finished;
};

export const tr = (p: { x: number; y: number }, sc: number, rot?: number) =>
  `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${sc})${rot ? ` rotate(${rot}deg)` : ''}`;

export const pt = (c: string, z: number, css?: Partial<CSSStyleDeclaration>): HTMLElement =>
  el('pt', {
    width: z + 'cqw',
    height: z + 'cqw',
    background: `radial-gradient(#fff9,${c} 35%,transparent 70%)`,
    ...css,
  });

export const flash = () =>
  fly(el('glow', { background: '#fff' }), [{ opacity: '0.9' }, { opacity: '0' }], { duration: 350 });

export const shk = (t?: boolean) => {
  const world = $('#world');
  if (!world) return;
  world.animate(
    [
      { transform: 'none' },
      { transform: `translate(${t ? -12 : -5}px,${t ? 6 : 3}px)` },
      { transform: `translate(${t ? 12 : 5}px,${t ? -6 : -3}px)` },
      { transform: 'none' },
    ],
    { duration: t ? 420 : 260 }
  );
};

export const puff = (x: number, y: number, e: string, n: number, sp: number, dur: number): void => {
  const world = $('#world');
  if (!world) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'fx';
    p.textContent = e;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    world.appendChild(p);

    const a = R() * 6.28;
    const d = sp * (0.4 + R() * 0.6);
    p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.5)', opacity: '1' },
        {
          transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) scale(1.6)`,
          opacity: '0',
        },
      ],
      { duration: dur, easing: 'ease-out' }
    ).finished.then(() => p.remove());
  }
};

export const rush = (s: 'p' | 'f', f: number = 0.7, d: number = 360): Promise<Animation> => {
  const o = s === 'p' ? 'f' : 'p';
  const A = ctr($('#' + s + 'w'));
  const T = ctr($('#' + o + 'w'));
  return $('#' + s + 'w').animate(
    [
      { translate: '0 0' },
      { translate: `${(T.x - A.x) * f}px ${(T.y - A.y) * f}px`, offset: 0.55 },
      { translate: '0 0' },
    ],
    { duration: d, easing: 'ease-in-out' }
  ).finished;
};

export const ring = (p: { x: number; y: number }, c: string, z: number = 3, d: number = 500) =>
  fly(el('ring', { left: '0', top: '0', borderColor: c }), [
    { transform: tr(p, 0.3), opacity: '1' },
    { transform: tr(p, z), opacity: '0' },
  ], { duration: d });

export const KIND: Record<string, (X: any) => Promise<void>> = {
  async spark(X) {
    const { A, T, c } = X;
    X.snd('l');
    for (let i = 0; i < 8; i++) {
      fly(pt(c, 3), [
        { transform: tr(lerp(A, T, i / 12), 1), opacity: '0.8' },
        { transform: tr(lerp(A, T, i / 12), 0.2), opacity: '0' },
      ], { duration: 300, delay: i * 32, fill: 'backwards' });
    }
    await fly(pt(c, 6), [{ transform: tr(A, 0.5) }, { transform: tr(T, 1) }], { duration: 380, easing: 'ease-in' });
  },

  async stream(X) {
    const { A, T, c } = X;
    const n = X.big ? 34 : 26;
    X.snd('l');
    for (let i = 0; i < n; i++) {
      const j = { x: T.x + (R() - 0.5) * 30, y: T.y + (R() - 0.5) * 30 };
      fly(pt(c, 4 + R() * 3), [
        { transform: tr(A, 0.4), opacity: '0.9' },
        { transform: tr(j, 1.6), opacity: '0.2' },
      ], { duration: 420 + R() * 120, delay: i * 28, fill: 'backwards', easing: 'ease-in' });
    }
    await new Promise(r => setTimeout(r, n * 28 + 300));
  },

  async blast(X) {
    const { A, T, c } = X;
    const o = pt(c, 6);
    await fly(o, [{ transform: tr(A, 0.2), opacity: '0.4' }, { transform: tr(A, 3), opacity: '1' }], {
      duration: 750,
      fill: 'forwards',
    }, false);
    X.snd('l');
    await fly(o, [{ transform: tr(A, 3) }, { transform: tr(T, 4) }], { duration: 420, easing: 'ease-in' });
    ring(T, c, 5, 600);
  },

  async bolt(X) {
    const { A, T, c } = X;
    const world = $('#world');
    for (let k = 0; k < (X.big ? 5 : 3); k++) {
      X.snd('l');
      const p: [number, number][] = [[A.x, A.y]];
      for (let i = 1; i < 8; i++) {
        p.push([A.x + ((T.x - A.x) * i) / 8 + (R() - 0.5) * 60, A.y + ((T.y - A.y) * i) / 8 + (R() - 0.5) * 60]);
      }
      p.push([T.x, T.y]);
      const q = (z: [number, number][]) => z.map(y => y.join(',')).join(' ');
      const m = p[4];
      const br: [number, number][] = [m, [m[0] + (R() - 0.5) * 120, m[1] + 60 + R() * 40]];
      const v = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      v.setAttribute('class', 'bolt');
      v.innerHTML = `<polyline points="${q(p)}" fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round"/><polyline points="${q(p)}" fill="none" stroke="#fff" stroke-width="3"/><polyline points="${q(br)}" fill="none" stroke="${c}" stroke-width="4"/>`;
      if (world) world.appendChild(v);
      fly(v as unknown as HTMLElement, [{ opacity: '1' }, { opacity: '0' }], { duration: 260 });
      await new Promise(r => setTimeout(r, 170));
    }
  },

  async leaf(X) {
    const { A, T } = X;
    const L: HTMLElement[] = [];
    const P = (a: number, r: number) => ({
      x: A.x + Math.cos(a / 57.3) * r,
      y: A.y + Math.sin(a / 57.3) * r,
    });
    for (let i = 0; i < 10; i++) {
      const l = el('leaf', { left: '0', top: '0' });
      const a = i * 36;
      L.push(l);
      fly(l, [{ transform: tr(P(a, 40), 0.4, a), opacity: '0' }, { transform: tr(P(a + 180, 58), 1, a + 360), opacity: '1' }], {
        duration: 600,
        fill: 'forwards',
      }, false);
    }
    await new Promise(r => setTimeout(r, 640));
    X.snd('l');
    L.forEach((l, i) => {
      const d = { x: T.x + (R() - 0.5) * 70, y: T.y + (R() - 0.5) * 70 };
      fly(l, [{ transform: tr(A, 1, 0) }, { transform: tr(d, 1, 720) }], {
        duration: 380,
        delay: i * 45,
        fill: 'both',
        easing: 'ease-in',
      }, false).then(() => {
        puff(d.x, d.y, '🍃', 2, 40, 500);
        fly(l, [{ transform: tr(d, 1, 720) }, { transform: tr({ x: d.x + (R() - 0.5) * 40, y: d.y + 60 }, 0.6, 900), opacity: '0' }], {
          duration: 600,
        });
      });
    });
    await new Promise(r => setTimeout(r, 380 + L.length * 45 + 100));
  },

  async vine(X) {
    const { A, T } = X;
    for (let k = 0; k < 3; k++) {
      const dx = T.x - A.x;
      const dy = T.y - A.y;
      const a = Math.atan2(dy, dx) * 57.3;
      const v = el('vine', {
        left: A.x + 'px',
        top: A.y + 'px',
        width: Math.hypot(dx, dy) + 'px',
        transform: `rotate(${a + (k - 1) * 14}deg)`,
        transformOrigin: '0 50%',
      });
      X.snd('l');
      await fly(v, [
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0 0 0)', offset: 0.5 },
        { clipPath: 'inset(0 0 0 100%)' },
      ], { duration: 480 });
      puff(T.x, T.y, '🌿', 2, 40, 400);
    }
  },

  async shard(X) {
    const { A, T, c } = X;
    X.snd('l');
    for (let i = 0; i < 7; i++) {
      fly(el('shd', { left: '0', top: '0', background: `linear-gradient(135deg,#fff,${c})` }), [
        { transform: tr({ x: A.x, y: A.y + (i - 3) * 10 }, 0.8, 0) },
        { transform: tr({ x: T.x, y: T.y + (i - 3) * 16 }, 1.2, 540) },
      ], { duration: 320, delay: i * 55, fill: 'backwards', easing: 'ease-in' });
    }
    await new Promise(r => setTimeout(r, 700));
  },

  async rock(X) {
    const { A, T } = X;
    const n = X.big ? 3 : 1;
    const Rs: HTMLElement[] = [];
    const cr = el('crack', { left: A.x + 'px', top: A.y + 60 + 'px' });
    fly(cr, [
      { opacity: '0', transform: 'translate(-50%,0) scaleX(.2)' },
      { opacity: '1', transform: 'translate(-50%,0) scaleX(1)' },
    ], { duration: 350, fill: 'forwards' }, false);

    for (let i = 0; i < n; i++) {
      const r = el('rk', { left: '0', top: '0' });
      Rs.push(r);
      fly(r, [
        { transform: tr({ x: A.x + (i - 1) * 40, y: A.y + 60 }, 0.3, 0), opacity: '0' },
        { transform: tr({ x: A.x + (i - 1) * 40, y: A.y - 50 }, 1, 160), opacity: '1' },
      ], { duration: 420, delay: i * 120, fill: 'forwards' }, false);
    }
    await new Promise(r => setTimeout(r, 520 + n * 120));
    X.snd('l');
    Rs.forEach((r, i) =>
      fly(r, [
        { transform: tr({ x: A.x + (i - 1) * 40, y: A.y - 50 }, 1, 160) },
        { transform: tr({ x: T.x + (R() - 0.5) * 30, y: T.y }, 1.1, 720) },
      ], { duration: 380, delay: i * 90, fill: 'backwards', easing: 'ease-in' })
    );
    cr.remove();
    await new Promise(r => setTimeout(r, 380 + n * 90));
  },

  async beam(X) {
    const { A, T, c } = X;
    const dx = T.x - A.x;
    const dy = T.y - A.y;
    const b = el('beam', {
      left: A.x + 'px',
      top: A.y + 'px',
      width: Math.hypot(dx, dy) + 'px',
      transform: `rotate(${Math.atan2(dy, dx) * 57.3}deg)`,
      transformOrigin: '0 50%',
      background: `linear-gradient(90deg,#fff,${c} 30%,#fff 60%,${c})`,
      boxShadow: `0 0 14px ${c}`,
    });
    X.snd('l');
    await fly(b, [
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0 0 0)', offset: 0.3 },
      { clipPath: 'inset(0 0 0 0)', offset: 0.8 },
      { clipPath: 'inset(0 0 0 100%)' },
    ], { duration: 850 });
  },

  async wave(X) {
    const { T, c } = X;
    X.snd('l');
    const targetSprite = $('#' + (X.s === 'p' ? 'f' : 'p') + 's');
    if (targetSprite) {
      targetSprite.animate([
        { filter: 'hue-rotate(0)', transform: 'skewX(0)' },
        { filter: 'hue-rotate(90deg) blur(2px)', transform: 'skewX(12deg) scale(1.05)' },
        { filter: 'hue-rotate(0)', transform: 'skewX(0)' },
      ], { duration: 900 });
    }
    for (let i = 0; i < 4; i++) {
      ring(T, c, 2, 700);
      for (let j = 0; j < 3; j++) {
        fly(pt(c, 2.5), [
          { transform: tr({ x: T.x + (R() - 0.5) * 90, y: T.y + 50 }, 0.6), opacity: '0.9' },
          { transform: tr({ x: T.x + (R() - 0.5) * 90, y: T.y - 70 }, 1), opacity: '0' },
        ], { duration: 800, delay: i * 140 + j * 60, fill: 'backwards' });
      }
      await new Promise(r => setTimeout(r, 160));
    }
    await new Promise(r => setTimeout(r, 500));
  },

  async orb(X) {
    const { A, T } = X;
    const o = el('orb', {
      left: '0',
      top: '0',
      background: 'radial-gradient(circle at 35% 30%,#b58cff,#3a1a6a 55%,#12051f)',
      boxShadow: '0 0 20px #7a4aff',
    });
    await fly(o, [{ transform: tr(A, 0.1), opacity: '0.3' }, { transform: tr(A, 1.3), opacity: '1' }], {
      duration: 600,
      fill: 'forwards',
    }, false);
    X.snd('l');
    await fly(o, [{ transform: tr(A, 1.3) }, { transform: tr(T, 1.6) }], { duration: 420, easing: 'ease-in' });
    ring(T, '#7a4aff', 3);
  },

  async bite(X) {
    const { T } = X;
    X.snd('l');
    const p = rush(X.s, 0.75, 560);
    await new Promise(r => setTimeout(r, 270));
    X.snd('h');
    const u = el('jaw', { left: T.x + 'px', top: T.y + 'px' });
    const d = el('jaw', { left: T.x + 'px', top: T.y + 'px' });
    fly(u, [{ transform: 'translate(-50%,-260%)', opacity: '1' }, { transform: 'translate(-50%,-60%)' }, { transform: 'translate(-50%,-60%)', opacity: '0' }], { duration: 300 });
    fly(d, [{ transform: 'translate(-50%,160%) scaleY(-1)', opacity: '1' }, { transform: 'translate(-50%,-40%) scaleY(-1)' }, { transform: 'translate(-50%,-40%) scaleY(-1)', opacity: '0' }], { duration: 300 });
    await p;
  },

  async claw(X) {
    const { T } = X;
    X.snd('l');
    const p = rush(X.s, 0.65, 480);
    await new Promise(r => setTimeout(r, 230));
    X.snd('h');
    for (let i = 0; i < 3; i++) {
      fly(el('slash', { left: T.x + 'px', top: T.y + (i - 1) * 22 + 'px' }), [
        { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(0)', opacity: '1' },
        { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: '1', offset: 0.5 },
        { transform: 'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity: '0' },
      ], { duration: 320, delay: i * 70, fill: 'backwards' });
    }
    await p;
  },

  async punch(X) {
    const { T } = X;
    X.snd('l');
    const p = rush(X.s, 0.85, 360);
    await new Promise(r => setTimeout(r, 190));
    X.snd('h');
    ring(T, '#fff', 2.4, 400);
    puff(T.x, T.y, '💢', 5, 70, 400);
    await p;
  },

  async dash(X) {
    const { A, T, s } = X;
    const w = $('#' + s + 'w');
    const im = $('#' + s + 's') as HTMLImageElement;
    const W = w.offsetWidth;
    const H = w.offsetHeight;
    const m = s === 'p' ? ' scaleX(-1)' : '';
    X.snd('l');
    for (let i = 0; i < 5; i++) {
      fly(el('gh', {
        left: '0',
        top: '0',
        width: W + 'px',
        height: H + 'px',
        backgroundImage: `url(${im.src})`,
      }), [
        { transform: `translate(${A.x - W / 2}px,${A.y - H / 2}px)${m}`, opacity: '0.5' },
        { transform: `translate(${T.x - W / 2}px,${T.y - H / 2}px)${m}`, opacity: '0' },
      ], { duration: 330, delay: i * 45, fill: 'backwards', easing: 'ease-in' });
    }
    const p = rush(s, 0.9, 300);
    await new Promise(r => setTimeout(r, 160));
    X.snd('h');
    await p;
  },

  async slam(X) {
    const { T } = X;
    X.snd('l');
    const p = rush(X.s, 0.9, 460);
    await new Promise(r => setTimeout(r, 250));
    X.snd('h');
    const g = { x: T.x, y: T.y + 50 };
    ring(g, '#ffd', 3);
    puff(g.x, g.y, '💨', 6, 80, 500);
    shk(true);
    await p;
  },

  async quake(X) {
    const { T } = X;
    X.snd('c');
    for (let i = 0; i < 5; i++) {
      shk(true);
      puff(T.x + (R() - 0.5) * 200, T.y + 60, '🪨', 3, 60, 500);
      X.snd('h');
      await new Promise(r => setTimeout(r, 160));
    }
  },
};

import { moveAnimationSystem } from './MoveAnimationSystem';

export async function playMoveEffect(
  s: 'p' | 'f',
  moveName: string,
  moveType: string,
  movePower: number,
  effMultiplier: number,
  _sndHelper?: (st: string, mv: any, kind: string, i: number, k: number, crit?: boolean) => void,
  cryHelper?: (s: 'p' | 'f', k: string) => void,
  isCritical: boolean = false
): Promise<void> {
  if (cryHelper) {
    cryHelper(s, 'atk');
  }
  await moveAnimationSystem.playMove(s, moveName, moveType, movePower, effMultiplier, isCritical);
}
