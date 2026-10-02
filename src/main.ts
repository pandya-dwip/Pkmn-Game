import { POKEMON_SPECIES_MAP, STONE_EVOLUTIONS, getPokemonSpecies, calculateBaseStatTotal, isEvolutionLine } from './data/pokemon';
import { MOVES_DATA, TYPE_MOVE_MAP, MOVE_ICONS } from './data/moves';
import { TYPE_NAMES, TYPE_CHART, calculateTypeEffectiveness } from './data/types';
import { sound } from './audio/SoundSynthesizer';
import { playMoveEffect, shk, puff, fly, el, ctr, flash, rush, ring } from './animations/CombatEffects';
import { pokemon3DManager } from './systems/Pokemon3DManager';
import { Pokemon3DApiService } from './services/Pokemon3DApiService';

// Global Game Configuration and State
const KEY = 'kantoCupSave_v1';
const MAX_TEAM = 10;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const R = Math.random;
const ri = (a: number, b: number) => a + Math.floor(R() * (b - a + 1));
const $ = (s: string) => document.querySelector(s) as HTMLElement;

export interface MonInstance {
  uid: string;
  id: number;
  lv: number;
  iv: number;
  exp: number;
  hp: number;
  moves: string[];
  se?: number;
}

export interface TournamentRoundConfig {
  n: string;
  l: number;
  w: number;
  cap: number;
  ai: number;
  fb: number;
  rb: number;
}

export const RD: TournamentRoundConfig[] = [
  { n: 'Round 1', l: 5, w: 1, cap: 320, ai: 0, fb: 0, rb: 1 },
  { n: 'Round 2', l: 7, w: 1, cap: 360, ai: 1, fb: 0, rb: 1 },
  { n: 'Round 3', l: 9, w: 2, cap: 400, ai: 1, fb: 0, rb: 2 },
  { n: 'Quarter Final', l: 12, w: 3, cap: 450, ai: 2, fb: 1, rb: 2 },
  { n: 'Semi Final', l: 16, w: 4, cap: 500, ai: 2, fb: 1, rb: 3 },
  { n: 'Final', l: 21, w: 4, cap: 560, ai: 3, fb: 2, rb: 0 },
];

export const STARTERS = [1, 4, 7, 10, 13, 16, 19, 25, 27, 41, 63, 74];
const LEG = [144, 145, 146, 150, 151];

// Stats and Move Pool Helpers
export const st = (m: MonInstance) => {
  const f = (b: number, i: number) => Math.floor(((2 * b + m.iv) * m.lv) / 100) + (i ? 5 : m.lv + 10);
  const spec = POKEMON_SPECIES_MAP[m.id];
  const [h, atk, def, spa, spd, spe] = [spec.baseHP, spec.baseAttack, spec.baseDefense, spec.baseSpAttack, spec.baseSpDefense, spec.baseSpeed].map(f);
  return { max: h, atk, def, spa, spd, spe };
};

export const pool = (m: MonInstance) => {
  const spec = POKEMON_SPECIES_MAP[m.id];
  const typesToCheck = [...spec.typesShort, 'No'];
  const moveNames: string[] = [];
  for (const t of typesToCheck) {
    const list = TYPE_MOVE_MAP[t as keyof typeof TYPE_MOVE_MAP] || [];
    for (const name of list) {
      if (!moveNames.includes(name)) moveNames.push(name);
    }
  }
  return moveNames
    .map(n => MOVES_DATA[n])
    .filter(x => x && x.unlockLevel <= m.lv)
    .sort((a, b) => b.power - a.power);
};

let UID = 0;
export const nu = () => 'm' + Date.now().toString(36) + UID++;

export const mk = (id: number, lv: number): MonInstance => {
  const m: MonInstance = { uid: nu(), id, lv, iv: ri(0, 15), exp: 0, hp: 1, moves: [] };
  m.moves = pool(m).slice(0, 4).map(x => x.name);
  m.hp = st(m).max;
  return m;
};

export const need = (m: MonInstance) => Math.floor(m.lv * m.lv * 1.5);

export const minLv = (i: number) => {
  if (isEvolutionLine(i)) {
    const prev = POKEMON_SPECIES_MAP[i - 1];
    return prev?.evolutionLevel || 14;
  }
  return 1;
};

export const bst = (i: number) => calculateBaseStatTotal(POKEMON_SPECIES_MAP[i]);

// Opponent Generation
export function foeTeam(r: number, av: number): MonInstance[] {
  const c = RD[r];
  const p = Object.keys(POKEMON_SPECIES_MAP)
    .map(Number)
    .filter(i => i && !isEvolutionLine(i) && !LEG.includes(i) && bst(i) <= c.cap);

  const t: MonInstance[] = [];
  while (t.length < r + 1) {
    let id = p.splice(ri(0, p.length - 1), 1)[0] || 1;
    const lv = Math.min(c.l + ri(0, c.w), Math.max(av + 1, 5));
    let spec = POKEMON_SPECIES_MAP[id];
    while (spec && spec.evolutionLevel && lv >= spec.evolutionLevel) {
      id++;
      spec = POKEMON_SPECIES_MAP[id];
    }
    t.push(mk(id, lv));
  }
  return t;
}

// 64-Trainer Bracket System
export interface BracketTrainer {
  nm: string;
  av: string;
  st: string;
  s: number;
}

export interface BracketData {
  T: BracketTrainer[];
  al: number[];
  H: [number, number, number][][];
}

export function genBracket(): BracketData {
  const C = [
    ['Youngster', '🧢'],
    ['Lass', '🎀'],
    ['Bug Catcher', '🦋'],
    ['Hiker', '⛰️'],
    ['Ace Trainer', '⭐'],
    ['Swimmer', '🏊'],
    ['Rocker', '🎸'],
    ['Sailor', '⚓'],
  ];
  const N = 'Jake Mia Leo Ron Maya Kai Alex Zoe Finn Ivy Gus Nora Sam Tess Omar Lena'.split(' ');
  const S = ['Aggressive', 'Defensive', 'Balanced', 'Tricky'];
  const all: [string[], string][] = [];
  C.forEach(c => N.forEach(n => all.push([c, n])));
  all.sort(() => R() - 0.5);

  return {
    T: [{ nm: 'YOU', av: '★', s: 1, st: '' }].concat(
      all.slice(0, 63).map(([c, n]) => ({ nm: c[0] + ' ' + n, av: c[1], st: S[ri(0, 3)], s: 0.6 + R() }))
    ),
    al: [...Array(64).keys()],
    H: [],
  };
}

export function simulateRound(): void {
  const { T, al } = G.br;
  const h: [number, number, number][] = [];
  const nx: number[] = [];
  for (let k = 0; k < al.length; k += 2) {
    const a = al[k];
    const b = al[k + 1];
    const w = a === 0 ? 0 : R() < T[a].s / (T[a].s + T[b].s) ? a : b;
    h.push([a, b, w]);
    nx.push(w);
  }
  G.br.H.push(h);
  G.br.al = nx;
}

// Rewards
export function rewards(r: number): MonInstance[] {
  const L = RD[r + 1]?.l || 22;
  const cap = [400, 450, 500, 540, 580, 600][r] || 580;
  const own = G.team.map(m => m.id);
  let c = Object.keys(POKEMON_SPECIES_MAP)
    .map(Number)
    .filter(i => i && !LEG.includes(i) && bst(i) <= cap && minLv(i) <= L + 4);

  if (r >= 3 && R() < 0.25) c.push(144 + ri(0, 2));
  if (r >= 3 && R() < 0.1) c.push(150);
  if (r === 4 && R() < 0.08) c.push(151);

  const w = (i: number) => (own.includes(i) ? 0.15 : 1) * (bst(i) > cap - 120 ? 3 : 1) * (LEG.includes(i) ? 0.5 : 1);
  const o: MonInstance[] = [];
  while (o.length < 3 && c.length) {
    let s = c.reduce((a, i) => a + w(i), 0) * R();
    let k = 0;
    for (; k < c.length - 1; k++) {
      s -= w(c[k]);
      if (s <= 0) break;
    }
    const id = c.splice(k, 1)[0];
    o.push(mk(id, Math.max(L - 1, minLv(id))));
  }
  return o;
}

// Global Game State and Battle State
export interface GameSaveState {
  r: number;
  team: MonInstance[];
  b: number; // Health Berry
  fh: number; // Full Heal Berry
  rv: number; // Revive
  st: Record<string, number>; // Evolution Stones
  ph: string;
  br: BracketData;
  tk?: number;
  tmax?: number;
  ev?: number;
  last?: { e: number; it: string };
}

export let G: GameSaveState;
export let B: any = null;
export let HUB: string[] | null = null;
export const S = { phase: 'PLAYER_TURN' };

export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(G));
  } catch {}
};

export const load = (): GameSaveState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g: GameSaveState = JSON.parse(raw);
    if (g && g.br) {
      g.tmax = g.tmax || 5;
      g.ev = g.ev || 0;
      g.team.forEach(m => {
        m.uid = m.uid || nu();
      });
      return g;
    }
    return null;
  } catch {
    return null;
  }
};

// UI Rendering Helpers
export const U = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const fb = (i: HTMLImageElement) => {
  i.onerror = null;
  i.src =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" fill="#2b3a6e"/><text x="30" y="36" font-size="16" text-anchor="middle" fill="#ffffff">${(
        i.alt || '?'
      ).slice(0, 4)}</text></svg>`
    );
};

export const tb = (t: string) => `<i class="t ${t}">${TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t}</i>`;
export const img = (id: number) =>
  `<img src="${U(id)}" alt="${POKEMON_SPECIES_MAP[id]?.name || 'Mon'}" onerror="fb(this)">`;
export const mh = (m: MonInstance) =>
  `${img(m.id)}<span><b>${POKEMON_SPECIES_MAP[m.id]?.name}</b> Lv.${m.lv}<small>HP ${m.hp}/${st(m).max}</small></span>`;

export const mvh = (v: any, e: number = 1) =>
  `<span class="mn">${MOVE_ICONS[v.typeShort as keyof typeof MOVE_ICONS] || ''} ${v.name.toUpperCase()}</span><small>${v.type.toUpperCase()} · POWER ${v.power}</small><small>${'●'.repeat(
    Math.max(1, Math.round(v.accuracy / 25))
  )} ACC ${v.accuracy}</small>` +
  (e === 1
    ? ''
    : `<small><b class="e${e > 1 ? 's' : e ? 'w' : 'n'}">${
        e > 1 ? 'SUPER EFFECTIVE' : e ? 'NOT VERY EFFECTIVE' : 'NO EFFECT'
      }</b></small>`);

export const show = (id: string) => {
  document.querySelectorAll('.scr').forEach(e => e.classList.toggle('on', e.id === id));
  if (id !== 'bat') {
    pokemon3DManager.stop();
  }
};

export function pick(title: string, items: { d?: boolean; h: string }[], cancel?: boolean, cls: string = ''): Promise<number> {
  return new Promise(res => {
    const o = $('#ov');
    o.innerHTML = `<div class="box"><div>${title}</div><div class="grid ${cls}">${items
      .map((x, i) => `<button data-i="${i}" ${x.d ? 'disabled' : ''}>${x.h}</button>`)
      .join('')}</div>${cancel ? '<button data-i="-1">BACK</button>' : ''}</div>`;
    o.style.display = 'flex';
    o.onclick = e => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b || (b as HTMLButtonElement).disabled) return;
      o.style.display = 'none';
      res(+b.dataset.i!);
    };
  });
}

export const pickTeam = (t: string, c?: boolean) =>
  pick(t, B.tm.map((m: MonInstance, i: number) => ({ d: m.hp <= 0 || (c && i === B.pi), h: mh(m) })), c, 'l');

export const note = (l: string[]) => pick(l.join('<br>'), [{ h: 'OK' }]);

// Screen 1: Title Screen
export function titleScr(): void {
  sound.music('menu');
  show('title');
  // Lazy pre-warm starters in background
  [1, 4, 7, 25].forEach(id => Pokemon3DApiService.getInstance().preloadPokemon(id));
  const has = !!load();
  $('#title').innerHTML = `<h1>KANTO CUP</h1><p style="text-align:center">A Gen 1 tournament roguelite</p><div class="col"><button id="bc" ${
    has ? '' : 'disabled'
  }>CONTINUE</button><button id="bn">NEW GAME</button><button id="br">RESET SAVE</button>${
    localStorage.getItem('kantoChampion') ? '<button id="bh">🏆 CHAMPIONSHIP HISTORY</button>' : ''
  }</div>`;

  $('#bc').onclick = () => {
    G = load()!;
    if (G.ph === 'hub') hubScr();
    else mapScr();
  };

  $('#br').onclick = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    titleScr();
  };

  if ($('#bh')) {
    $('#bh').onclick = () => {
      const r = JSON.parse(localStorage.getItem('kantoChampion') || '{}');
      note([
        '<h1>🏆 KANTO CHAMPION</h1>' + r.date,
        'Final opponent: ' + r.finalOpponent,
        'Defeated: ' + r.finalOpponentTeam.join(', '),
        'Your team: ' + r.playerTeam.join(', '),
      ]);
    };
  }

  $('#bn').onclick = async () => {
    sound.music('select');
    const i = await pick(
      'CHOOSE YOUR FIRST POKÉMON<br>(Lv.5)',
      STARTERS.map(id => ({
        h: `${img(id)}<span><b>${POKEMON_SPECIES_MAP[id]?.name}</b><small>${POKEMON_SPECIES_MAP[id]?.typesShort
          .map(tb)
          .join('')}</small></span>`,
      }))
    );
    G = {
      r: 0,
      team: [mk(STARTERS[i], 5)],
      b: 3,
      fh: 2,
      rv: 2,
      st: {},
      ph: 'br',
      br: genBracket(),
      tk: 5,
      tmax: 5,
      ev: 0,
    };
    save();
    mapScr();
  };
}

// Screen 2: Tournament Bracket Screen
export function bracketHTML(fresh?: boolean): string {
  const { T, H } = G.br;
  const r = G.r;
  const lead = Math.max(...G.team.map(m => m.lv));
  const N = ['ROUND 1', 'ROUND 2', 'ROUND 3', 'QUARTER FINAL', 'SEMI FINAL', 'FINAL', 'CHAMPION 🏆'];

  const sid = (c: number, k: number) => (c === 0 ? k : H[c - 1] ? H[c - 1][k][2] : -1);
  const vis = (c: number, id: number) => id >= 0 && (id === 0 || (c === 0 ? H[0] || (r === 0 && id === G.br.al[1]) : H[c - 1]));

  const slot = (c: number, k: number) => {
    const id = sid(c, k);
    let cl = 'u';
    let a = '???';
    let b = '';

    if (c === 6) {
      cl = 'tro';
      a = id >= 0 ? '🏆 ' + (id ? T[id].nm : '★ YOU') : '🏆 ???';
    } else if (id === 0) {
      cl = 'me' + (fresh && c === r - 1 ? ' fresh' : '');
      a = '★ YOU';
      b = H[c] ? '✓ ADVANCED' : 'Lv.' + lead;
    } else if (c === r && k === 1 && vis(c, id)) {
      cl = 'opp';
      a = '⚔ ' + T[id].nm;
      b = 'NEXT OPPONENT';
    } else if (vis(c, id)) {
      const w = H[c] ? H[c][k >> 1][2] : -2;
      cl = 'n' + (w === -2 ? '' : id === w ? ' adv' : ' elim') + (fresh && c === r - 1 ? ' fresh' : '');
      a = T[id].nm;
      b = w === -2 ? '' : id === w ? '✓ ADVANCED' : '✕ ELIMINATED';
    }
    return `<div class="sl ${cl}">${a}<br><small>${b}</small></div>`;
  };

  let h = '<div class="bk">';
  for (let c = 0; c < 7; c++) {
    const n = 64 >> c;
    const per = c === 6 ? 1 : 2;
    h += `<div class="bc"><div class="bh">${N[c]}</div><div class="bb">`;
    for (let p = 0; p < n / per; p++) {
      let ids: number[] = [];
      let q = '';
      for (let j = 0; j < per; j++) {
        ids.push(sid(c, p * per + j));
        q += slot(c, p * per + j);
      }
      h += `<div class="pr${c === 6 ? ' one' : ''}${ids.includes(0) ? ' hot' : ''}">${q}</div>`;
    }
    h += '</div></div>';
  }
  return h + '</div>';
}

export async function mapScr(fresh?: boolean): Promise<void> {
  sound.music('menu');
  show('map');
  const el = $('#map');

  if (fresh) {
    el.innerHTML = '<h1>KANTO CUP 🏆</h1><p style="text-align:center">Other matches are being completed...</p>';
    await sleep(1300);
  }

  const o = G.br.T[G.br.al[1]] || { nm: 'Trainer Rival', av: '⭐', st: 'Balanced' };
  const sl = Math.min(6, G.r + 1);

  el.innerHTML = `<h1>KANTO CUP 🏆</h1><p style="text-align:center">${G.br.al.length} trainers remain · ${RD[G.r].n}</p><div class="bkw">${bracketHTML(
    fresh
  )}</div>
  <div class="leg">GOLD = you · RED = next opponent · GREEN = advanced · GRAY = eliminated · ??? = unknown. Scroll the bracket sideways and down.</div>
  <p>${fresh ? 'Your next opponent is revealed!<br>' : ''}NEXT OPPONENT: ${o.av} ${o.nm}<small>Style: ${o.st} · Team: ??? · ${
    G.r + 1
  } Pokémon</small></p>
  <p>TEAM SLOTS: ${sl} · OWNED: ${G.team.length} · 🍓${G.b} ✨${G.fh} 💊${G.rv}</p><div class="col"><button id="go">${
    G.r ? 'CONTINUE TO MATCH' : 'START BATTLE'
  }</button></div>`;

  $('#go').onclick = () => battle(G.r);
}

// Screen 3: Hub Screen (Preparation, Team, Bag, Training)
export const trow = (m: MonInstance) =>
  `<tr><td><div class="row">${mh(m)}</div></td><td>${POKEMON_SPECIES_MAP[m.id]?.typesShort
    .map(tb)
    .join('')}<small>EXP <span class="eb"><i style="width:${Math.min(100, (m.exp / need(m)) * 100)}%"></i></span> ${
    m.exp
  }/${need(m)}</small></td></tr>`;

export function hubScr(): void {
  sound.music('menu');
  show('map');
  $('#map').innerHTML = `<h1>${
    G.r === 4 ? 'SEMIFINAL PREPARATION' : G.r === 5 ? 'FINAL PREPARATION' : 'MATCH COMPLETE'
  }</h1><p style="text-align:center">★ YOU ADVANCED ★<br><br>REWARDS<br>+ ${G.last?.e || 0} EXP<br>+ ${
    G.last?.it || 'None'
  }<br>+ Pokémon Choice</p><table>${G.team.map(trow).join('')}</table>
  <p>TRAINING SESSIONS<br>${'★'.repeat(G.tk || 0)}${'☆'.repeat((G.tmax || 5) - (G.tk || 0))}<br>${G.tk || 0} / ${
    G.tmax || 5
  } remaining<br> · 🍓${G.b} ✨${G.fh} 💊${G.rv}</p><div class="col"><button id="h1">TRAINING</button><button id="h2">TEAM</button><button id="h3">BAG</button><button id="h4">TOURNAMENT</button>${
    (G.ev || 0) > 0 && G.r >= 4 ? `<button id="h5">✨ SPECIAL EVOLUTION ×${G.ev}</button>` : ''
  }</div><p style="text-align:center">NEXT MATCH: TBD</p>`;

  $('#h1').onclick = trainScr;
  $('#h2').onclick = async () => {
    await pick(`YOUR TEAM<table>${G.team.map(trow).join('')}</table>`, [{ h: 'BACK' }]);
  };
  $('#h3').onclick = async () => {
    const r = await bagUI(G.team, 0);
    if (!r) return;
    HUB = [];
    if (r.i.length === 2) await stone(G.team[r.j], r.i);
    else await useItem(r, G.team);
    const l = HUB;
    HUB = null;
    save();
    await note(l);
    hubScr();
  };
  $('#h4').onclick = () => {
    simulateRound();
    G.ph = 'br';
    save();
    mapScr(true);
  };
  if ($('#h5')) $('#h5').onclick = specialEvo;
}

// Evolution Helpers
export const evoOf = (m: MonInstance) => {
  const spec = POKEMON_SPECIES_MAP[m.id];
  if (spec.evolutionLevel > 0) return [[m.id + 1]];
  return (STONE_EVOLUTIONS[m.id] || []).map(e => [e.evolvesTo]);
};

export async function evoShow(m: MonInstance, nid: number): Promise<void> {
  const o = $('#ov');
  const old = st(m);
  const oi = m.id;
  const pc = m.hp / old.max;
  o.style.display = 'flex';
  o.onclick = null;
  o.innerHTML = `<div class="box"><h1 style="animation:none">EVOLUTION</h1><div class="evw"><img id="evi" src="${U(
    oi
  )}"></div><div id="evt">${POKEMON_SPECIES_MAP[oi]?.name} is evolving!</div></div>`;
  const im = $('#evi') as HTMLImageElement;

  [0, 0.2, 0.4, 0.6].forEach(d => sound.swp(300 + d * 900, 600 + d * 1500, 0.3, 'sine', 0.1, d));
  await im.animate([{ filter: 'none' }, { filter: 'brightness(0) drop-shadow(0 0 24px #fff)' }], {
    duration: 900,
    fill: 'forwards',
  }).finished;

  await im.animate(
    [
      { transform: 'scale(1)', filter: 'brightness(0) drop-shadow(0 0 24px #fff)' },
      { transform: 'scale(1.35)', filter: 'brightness(9)' },
      { transform: 'scale(.9)', filter: 'brightness(9)' },
      { transform: 'scale(1.4)', filter: 'brightness(12)' },
    ],
    { duration: 1500, fill: 'forwards' }
  ).finished;

  m.id = nid;
  m.hp = Math.max(1, Math.round(st(m).max * pc));
  im.src = U(nid);
  sound.beep(880, 0.4, 'triangle', 0.12);
  [0, 0.12, 0.24].forEach((d, j) => sound.beep(660 + j * 220, 0.25, 'square', 0.06, d));

  await im.animate([{ transform: 'scale(1.4)', filter: 'brightness(12)' }, { transform: 'scale(1)', filter: 'none' }], {
    duration: 900,
    fill: 'forwards',
  }).finished;

  const nw = st(m);
  $('#evt').innerHTML = `✨ EVOLUTION COMPLETE! ✨<br>${POKEMON_SPECIES_MAP[oi]?.name} → ${
    POKEMON_SPECIES_MAP[nid]?.name
  }<br>Level: ${m.lv} → ${m.lv}<br>HP +${nw.max - old.max} · ATK +${nw.atk - old.atk} · DEF +${nw.def - old.def}<br><br><button id="evok">OK</button>`;

  await new Promise<void>(r => {
    $('#evok').onclick = () => {
      o.style.display = 'none';
      r();
    };
  });
}

export async function specialEvo(): Promise<void> {
  while ((G.ev || 0) > 0) {
    const L = G.team.map(m => ({ m, o: m.se ? [] : evoOf(m) }));
    if (!L.some(x => x.o.length)) {
      await note(['No Pokémon can evolve right now.']);
      break;
    }

    const i = await pick(
      `<h1>SPECIAL EVOLUTION</h1>Opportunities left: ${G.ev}<br>Choose a Pokémon:`,
      L.map(x => ({
        d: !x.o.length,
        h: `${mh(x.m)}<small>${
          x.o.length ? '→ ' + x.o.map(e => POKEMON_SPECIES_MAP[e[0]]?.name).join(' / ') : x.m.se ? 'Already used' : 'No evolution'
        }</small>`,
      })),
      true,
      'l'
    );
    if (i < 0) break;

    const m = G.team[i];
    const o = L[i].o;
    let t = o[0][0];
    if (o.length > 1) {
      const j = await pick(
        'Evolve into:',
        o.map(e => ({ h: `${img(e[0])}<span>${POKEMON_SPECIES_MAP[e[0]]?.name}</span>` })),
        true
      );
      if (j < 0) continue;
      t = o[j][0];
    }

    await evoShow(m, t);
    m.se = 1;
    G.ev = (G.ev || 1) - 1;
    save();
  }
  hubScr();
}

// Training Mode
export async function trainScr(): Promise<void> {
  for (;;) {
    const e = Math.round(
      [25, 35, 45, 55, 65][Math.min(4, G.r - 1)] * [1, 1, 1.2, 1.2, 1.4][Math.min(4, (G.tmax || 5) - (G.tk || 0))]
    );
    const i = await pick(
      `TRAINING<br>${'★'.repeat(G.tk || 0)}${'☆'.repeat((G.tmax || 5) - (G.tk || 0))}<br>${G.tk || 0} / ${
        G.tmax || 5
      } remaining<br>Each session: +${e} EXP, +10% HP`,
      G.team.map(m => ({
        d: (G.tk || 0) < 1,
        h: `${mh(m)}<small>EXP <span class="eb"><i style="width:${Math.min(100, (m.exp / need(m)) * 100)}%"></i></span> ${
          m.exp
        }/${need(m)}</small>`,
      })),
      true,
      'l'
    );
    if (i < 0) return hubScr();
    G.tk = (G.tk || 1) - 1;
    const m = G.team[i];
    const h = Math.min(st(m).max - m.hp, Math.ceil(st(m).max * 0.1));
    const n = POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase();
    m.hp += h;
    m.exp += e;
    HUB = ['TRAINING COMPLETE!', `${n} gained ${e} EXP!`];
    await lvls(m);
    HUB.push(`${n} recovered ${h} HP.`);
    const l = HUB;
    HUB = null;
    save();
    await note(l);
  }
}

// Dialogue Say
export async function say(t: string, p: number = 600): Promise<void> {
  if (HUB) {
    HUB.push(t);
    return;
  }
  const b = $('#msg');
  b.textContent = '';
  for (const c of t) {
    b.textContent += c;
    await sleep(14);
  }
  await sleep(p);
}

// Battlefield Elements
export const spr = (im: HTMLImageElement, id: number, back?: boolean) => {
  const spec = POKEMON_SPECIES_MAP[id];
  (im.parentNode as HTMLElement).dataset.t = spec.typesShort.includes('Fl') ? 'f' : spec.baseHP <= 45 ? 's' : 'n';
  im.getAnimations().forEach(a => a.cancel());
  im.alt = spec.name;
  im.onerror = () => fb(im);
  im.src = U(id);
};

export function hit(s: 'p' | 'f', dm: number, k: number = 1): Promise<Animation> {
  pokemon3DManager.playHitReaction(s, dm, k >= 2);
  const e = $('#' + s + 's');
  const f = document.createElement('div');
  f.className = 'dmg';
  f.textContent = '-' + dm;
  f.style.fontSize = [16, 24, 34, 46][k] + 'px';
  f.style.left = $('#' + s + 'w').offsetLeft + $('#' + s + 'w').offsetWidth / 3 + 'px';
  f.style.top = $('#' + s + 'w').offsetTop + 'px';
  $('#fld').appendChild(f);
  setTimeout(() => f.remove(), 1000);
  sound.beep(110, 0.2, 'sawtooth');

  return e.animate(
    [
      { transform: 'translateX(0)', filter: 'brightness(3)' },
      { transform: 'translateX(-10px)', opacity: '0.3' },
      { transform: 'translateX(10px)', opacity: '1' },
      { transform: 'none', filter: 'none' },
    ],
    { duration: 450 }
  ).finished;
}

export const faint = async (s: 'p' | 'f') => {
  sound.beep(200, 0.5, 'triangle');
  sound.cry(M(s).id, 'faint');
  const anim3d = pokemon3DManager.playFaintAnimation(s);
  const e = $('#' + s + 's');
  const h = $('#' + s + 'sh');
  await e.animate(
    [
      { transform: 'none' },
      { transform: 'translateX(-6%) rotate(-4deg)' },
      { transform: 'translateX(6%) rotate(4deg)' },
      { transform: 'translateX(-4%)' },
    ],
    { duration: 500 }
  ).finished;
  h.style.transition = 'opacity .7s';
  h.style.opacity = '0';
  await e.animate(
    [
      { transform: 'translateY(0) scale(1)', opacity: '1' },
      { transform: 'translateY(30%) scale(.9)', opacity: '0.8', offset: 0.5 },
      { transform: 'translateY(55%) scale(.55)', opacity: '0' },
    ],
    { duration: 800, easing: 'ease-in', fill: 'forwards' }
  ).finished;
  await anim3d;
};

export const recall = async (s: 'p' | 'f') => {
  const anim3d = pokemon3DManager.playRecallAnimation(s);
  const c = ctr($('#' + s + 'w'));
  fly(el('ball', { left: c.x + 'px', top: c.y + 'px' }), [
    { transform: 'translate(-50%,-50%) scale(0)' },
    { transform: 'translate(-50%,-50%) scale(1.3)' },
    { transform: 'translate(-50%,-50%) scale(1)' },
  ], { duration: 450, delay: 150, fill: 'backwards' });
  await $('#' + s + 's').animate(
    [
      { transform: 'scale(1)', filter: 'none', opacity: '1' },
      { transform: 'scale(.1)', filter: 'brightness(4) sepia(1) hue-rotate(-50deg)', opacity: '0' },
    ],
    { duration: 420, fill: 'forwards' }
  ).finished;
  await anim3d;
};

export const release = async (s: 'p' | 'f') => {
  const c = ctr($('#' + s + 'w'));
  sound.cry(M(s).id, 'in');
  $('#' + s + 'sh').style.opacity = '';
  puff(c.x, c.y, '✨', 8, 80, 500);
  const anim3d = pokemon3DManager.playEntranceAnimation(s, M(s).id);
  await $('#' + s + 's').animate(
    [
      { transform: 'scale(.1)', filter: 'brightness(4)', opacity: '0' },
      { transform: 'scale(1.15)', filter: 'brightness(2)', opacity: '1' },
      { transform: 'scale(1)', filter: 'none', opacity: '1' },
    ],
    { duration: 520 }
  ).finished;
  await anim3d;
};

// Battle Turn and UI Engine
export const P = (): MonInstance => B.tm[B.pi];
export const F = (): MonInstance => B.foe[B.fi];
export const M = (s: 'p' | 'f'): MonInstance => (s === 'p' ? P() : F());
export const NM = (s: 'p' | 'f'): string => (s === 'f' ? 'Foe ' : '') + POKEMON_SPECIES_MAP[M(s).id]?.name.toUpperCase();

export function ui(): void {
  if (HUB) return;
  for (const s of ['p', 'f'] as const) {
    const m = M(s);
    const x = st(m);
    const pc = (m.hp / x.max) * 100;
    const b = $('#' + s + 'b');
    $('#' + s + 'n').textContent = POKEMON_SPECIES_MAP[m.id]?.name;
    $('#' + s + 'l').textContent = 'Lv' + m.lv;
    b.style.width = pc + '%';
    b.className = pc <= 20 ? 'lo' : pc <= 50 ? 'md' : '';
    $('#' + s + 'h').textContent = `HP: ${m.hp} / ${x.max}`;
    $('#' + s + 't').innerHTML = POKEMON_SPECIES_MAP[m.id]?.typesShort.map(tb).join('');
    const im = $('#' + s + 's') as HTMLImageElement;
    const k = s + m.uid + m.id;
    if (im.dataset.k !== k) {
      im.dataset.k = k;
      spr(im, m.id, s === 'p');
    }
  }

  if (B && B.tm && B.foe) {
    if (B.tm[B.pi]) pokemon3DManager.setPokemon('p', P().id);
    if (B.foe[B.fi]) pokemon3DManager.setPokemon('f', F().id);

    for (const [s, l] of [
      ['p', B.tm],
      ['f', B.foe],
    ] as const) {
      $('#' + s + 'd').innerHTML =
        l
          .map(
            (x: MonInstance) =>
              `<i class="${x.hp <= 0 ? 'x' : 'a'}${x.uid === (s === 'p' ? B.pu : B.fu) ? ' on' : ''}"></i>`
          )
          .join('') + `<b>${l.filter((x: MonInstance) => x.hp > 0).length} / ${l.length}</b>`;
    }
  }
}

// Damage and Attack
export async function attack(s: 'p' | 'f', mv: any): Promise<void> {
  const o = s === 'p' ? 'f' : 'p';
  const a = M(s);
  const d = M(o);
  await say(`${NM(s)} used ${mv.name.toUpperCase()}!`, 300);

  if (R() * 100 >= mv.accuracy) {
    await say('The attack missed!');
    return;
  }

  const e = calculateTypeEffectiveness(mv.typeShort, POKEMON_SPECIES_MAP[d.id]?.typesShort || ['No']);
  const ph = mv.category === 'Physical';
  const attack3d = pokemon3DManager.playAttackAction(s, mv.name, ph);

  await playMoveEffect(
    s,
    mv.name,
    mv.typeShort,
    mv.power,
    e,
    (st, m, kind, i, k, crit) => sound.sfxA(st, m, kind, i, k, crit),
    (side, mood) => sound.cry(M(side).id, mood)
  );
  await attack3d;

  const A = st(a)[ph ? 'atk' : 'spa'];
  const Df = st(d)[ph ? 'def' : 'spd'];
  const cr = R() < 0.0625;

  if (!e) {
    await say(`It doesn't affect ${NM(o)}!`);
    return;
  }

  let dm = Math.max(
    1,
    Math.floor(
      (((2 * a.lv) / 5 + 2) * mv.power * (A / Df) / 50 + 2) *
        (POKEMON_SPECIES_MAP[a.id]?.typesShort.includes(mv.typeShort) ? 1.5 : 1) *
        e *
        (cr ? 1.5 : 1) *
        (0.85 + R() * 0.15)
    )
  );
  dm = Math.min(dm, d.hp);
  d.hp -= dm;
  ui();
  sound.cry(d.id, 'hit');

  if (o === 'p' && d.hp > 0 && d.hp < st(d).max * 0.2) {
    [0, 0.15, 0.3].forEach(t => sound.beep(880, 0.08, 'square', 0.04, t));
  }
  if (cr) {
    flash();
    sound.swp(1200, 2400, 0.2, 'square', 0.3);
    sound.swp(1600, 3200, 0.25, 'square', 0.3, 0.1);
  }
  shk(cr || e > 1 || mv.power >= 85);
  await hit(o, dm, cr ? 3 : e > 1 ? 2 : e < 1 ? 0 : 1);

  if (e > 1) await say(`It's SUPER EFFECTIVE! ×${e} damage`, 500);
  else if (e < 1) await say(`It's not very effective... ×${e} damage`, 500);
  if (cr) await say('CRITICAL HIT!', 400);
  await say(`${NM(o)} took ${dm} damage!`, 400);
}

// AI
export function aiMove(): any {
  const f = F();
  const p = P();
  const ms = f.moves.map(n => MOVES_DATA[n]).filter(Boolean);
  if (B.ai === 0 || R() < 0.2) return ms[ri(0, ms.length - 1)];

  return ms
    .map(m => [
      m,
      (m.power * m.accuracy) /
        100 *
        calculateTypeEffectiveness(m.typeShort, POKEMON_SPECIES_MAP[p.id]?.typesShort || ['No']) *
        (POKEMON_SPECIES_MAP[f.id]?.typesShort.includes(m.typeShort) ? 1.5 : 1) *
        (0.7 + R() * 0.6),
    ])
    .sort((x: any, y: any) => y[1] - x[1])[0][0];
}

export function aiAct(): any {
  const f = F();
  const p = P();
  const al = B.foe.map((m: MonInstance, i: number) => i).filter((i: number) => i !== B.fi && B.foe[i].hp > 0);

  if (B.ai >= 3 && B.fb > 0 && f.hp < st(f).max * 0.3 && R() < 0.6) return { k: 'b' };
  if (B.ai >= 2 && al.length && R() < 0.35) {
    return { k: 's', j: al[ri(0, al.length - 1)] };
  }
  return { k: 'm', mv: aiMove() };
}

// Items and Switching
export async function berry(m: MonInstance, who: 'p' | 'f'): Promise<void> {
  const x = st(m);
  const h = Math.min(x.max - m.hp, Math.ceil(x.max * 0.3));
  m.hp += h;
  ui();
  await say(
    who === 'p'
      ? `You used a HEALTH BERRY! ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()} restored ${h} HP!`
      : `${B.tn} used a HEALTH BERRY!`
  );
}

export async function sw(s: 'p' | 'f', j: number): Promise<void> {
  const n = (m: MonInstance) => POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase();
  if (s === 'p') {
    await say(`Come back, ${n(P())}!`, 200);
    await recall('p');
    B.pi = j;
    B.part.add(j);
    ui();
    await release('p');
    await say(`Go! ${n(P())}!`);
  } else {
    await say(`${B.tn} withdrew ${n(F())}!`, 200);
    await recall('f');
    B.fi = j;
    ui();
    await release('f');
    await say(`${B.tn} sent out ${n(F())}!`);
  }
}

export const ITEMS: Record<string, { ic: string; n: string; d: string; t: (m: MonInstance) => boolean; k: keyof GameSaveState }> = {
  b: { ic: '🍓', n: 'Health Berry', d: 'Restores 30% of max HP.', t: m => m.hp > 0 && m.hp < st(m).max, k: 'b' },
  f: { ic: '✨', n: 'Full Heal Berry', d: 'Restores 100% HP.', t: m => m.hp > 0 && m.hp < st(m).max, k: 'fh' },
  r: { ic: '💊', n: 'Revive', d: 'Revives a fainted Pokémon with 50% HP.', t: m => m.hp <= 0, k: 'rv' },
};

export const STN: Record<string, [string, string]> = {
  El: ['⚡', 'Thunder Stone'],
  Fi: ['🔥', 'Fire Stone'],
  Wa: ['💧', 'Water Stone'],
  Gr: ['🌿', 'Leaf Stone'],
  Mo: ['🌙', 'Moon Stone'],
};

export const IR = [{ b: 1 }, { b: 1 }, { b: 1, f: 1 }, { b: 1, f: 1 }, { f: 1, r: 1, b: 1 }, {}];

export const qty = (k: string) => (k.length === 1 ? (G[ITEMS[k].k] as number) : G.st[k] || 0);
export const elig = (k: string, m: MonInstance) =>
  k.length === 1 ? ITEMS[k].t(m) : (STONE_EVOLUTIONS[m.id] || []).some(e => e.stoneType === k);

export async function bagUI(tm: MonInstance[], bt?: number): Promise<any> {
  for (;;) {
    const ks = Object.keys(ITEMS).concat(bt ? [] : Object.keys(STN).filter(k => G.st[k] > 0));
    const ok = (k: string) => qty(k) > 0 && tm.some(m => elig(k, m));
    const i = await pick(
      'BAG',
      ks.map(k => {
        const o = k.length === 1 ? ITEMS[k] : { ic: STN[k][0], n: STN[k][1], d: 'Evolves certain Pokémon.' };
        return {
          d: !ok(k),
          h: `<span class="itm"><span class="ic">${o.ic}</span><b>${o.n.toUpperCase()} ×${qty(k)}</b><small>${
            o.d
          }</small><small>${ok(k) ? '[ USE ]' : 'Cannot be used now'}</small></span>`,
        };
      }),
      true
    );
    if (i < 0) return null;
    const k = ks[i];
    const j = await pick('Use on which Pokémon?', tm.map(m => ({ d: !elig(k, m), h: mh(m) })), true, 'l');
    if (j < 0) continue;
    if (k === 'r' && (await pick(`Use Revive?<br>${POKEMON_SPECIES_MAP[tm[j].id]?.name.toUpperCase()} fainted.`, [{ h: 'YES' }, { h: 'NO' }])) !== 0)
      continue;
    return { k: 'b', i: k, j };
  }
}

export async function useItem(x: any, tm: MonInstance[]): Promise<void> {
  const t = tm[x.j];
  const n = POKEMON_SPECIES_MAP[t.id]?.name.toUpperCase();
  const i = x.i;
  if (i === 'r') {
    G.rv--;
    t.hp = Math.ceil(st(t).max * 0.5);
    ui();
    await say('You used a Revive!');
    await say(`${n} was revived!`);
  } else if (i === 'f') {
    G.fh--;
    t.hp = st(t).max;
    ui();
    await say('You used a Full Heal Berry!');
    await say(`${n}'s HP was fully restored!`);
  } else {
    G.b--;
    await berry(t, 'p');
  }
}

export async function stone(m: MonInstance, k: string): Promise<void> {
  const e = (STONE_EVOLUTIONS[m.id] || []).find(x => x.stoneType === k);
  if (!e) return;
  const pc = m.hp / st(m).max;
  const o = POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase();
  G.st[k]--;
  await say(`${o} is evolving!`, 200);
  m.id = e.evolvesTo;
  m.hp = Math.max(1, Math.round(st(m).max * pc));
  await say(`It evolved into ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()}!`);
}

// Leveling and Evolution
export async function evo(m: MonInstance): Promise<void> {
  const d = POKEMON_SPECIES_MAP[m.id];
  if (!(d.evolutionLevel && m.lv >= d.evolutionLevel && d.evolvesTo)) return;
  const pc = m.hp / st(m).max;
  await say(`${d.name.toUpperCase()} is evolving!`, 300);
  if (!HUB && B.tm[B.pi] === m) {
    await $('#ps').animate(
      [
        { filter: 'brightness(0)' },
        { filter: 'brightness(5)' },
        { filter: 'brightness(0)' },
        { filter: 'brightness(5)' },
        { filter: 'none' },
      ],
      { duration: 1200 }
    ).finished;
  }
  m.id = d.evolvesTo;
  m.hp = Math.max(1, Math.round(st(m).max * pc));
  ui();
  sound.beep(880, 0.3);
  await say(`It evolved into ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()}!`);
}

export async function learn(m: MonInstance): Promise<void> {
  for (const mv of pool(m).filter(x => x.unlockLevel === m.lv && !m.moves.includes(x.name))) {
    const n = POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase();
    if (m.moves.length < 4) {
      m.moves.push(mv.name);
      await say(`${n} learned ${mv.name.toUpperCase()}!`);
    } else {
      const i = await pick(
        `${n} wants to learn ${mv.name.toUpperCase()}.<br>It already knows 4 moves. Replace which?`,
        m.moves.map(k => ({ h: mvh(MOVES_DATA[k]) })),
        true
      );
      if (i >= 0) {
        const old = m.moves[i];
        m.moves[i] = mv.name;
        await say(`${n} forgot ${old.toUpperCase()} and learned ${mv.name.toUpperCase()}!`);
      } else {
        await say(`${n} did not learn ${mv.name.toUpperCase()}.`);
      }
    }
  }
}

export async function lvls(m: MonInstance): Promise<void> {
  while (m.exp >= need(m) && m.lv < 60) {
    m.exp -= need(m);
    const o = st(m).max;
    m.lv++;
    m.hp += st(m).max - o;
    ui();
    await say(`${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()} reached Level ${m.lv}!`);
    await evo(m);
    await learn(m);
  }
}

// Turn Controller (Strictly 1 Player Action = 1 Opponent Action)
export async function resolve(): Promise<string | null> {
  if (F().hp <= 0) {
    const L = F().lv;
    await faint('f');
    await say(`${NM('f')} fainted!`);
    B.gain += L * 10;
    for (const i of B.part) {
      const m = B.tm[i];
      if (m.hp > 0) {
        m.exp += L * 10;
        await say(`${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()} gained ${L * 10} EXP! (${m.exp}/${need(m)})`, 300);
        await lvls(m);
      }
    }
    const al = B.foe.map((m: MonInstance, i: number) => i).filter((i: number) => B.foe[i].hp > 0);
    if (!al.length) return 'win';
    B.fi = al[0];
    B.part = new Set([B.pi]);
    B.sent = 1;
    ui();
    await release('f');
    await say(`${B.tn} sent out ${POKEMON_SPECIES_MAP[F().id]?.name.toUpperCase()}!`);
  }

  if (P().hp <= 0) {
    await faint('p');
    await say(`${NM('p')} fainted!`);
    if (!B.tm.some((m: MonInstance) => m.hp > 0)) return 'lose';
    B.pi = await pickTeam('Choose your next Pokémon', false);
    B.part.add(B.pi);
    ui();
    await release('p');
    await say(`Go! ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()}!`);
  }

  return null;
}

export async function act(s: 'p' | 'f', x: any): Promise<void> {
  const m = M(s);
  if (m.hp <= 0) return;
  if (x.k === 'm') await attack(s, x.mv);
  else if (x.k === 's') await sw(s, x.j);
  else if (s === 'p') await useItem(x, B.tm);
  else {
    B.fb--;
    await berry(m, 'f');
  }
}

export async function turn(pa: any): Promise<string | null> {
  if (S.phase !== 'PLAYER_ACTION') return null;

  // Determine order if both are moving
  const oppAction = aiAct();
  let playerFirst = true;

  if (pa.k === 'm' && oppAction.k === 'm') {
    const pSpe = st(P()).spe;
    const fSpe = st(F()).spe;
    const pPrio = pa.mv.priority || 0;
    const fPrio = oppAction.mv.priority || 0;
    if (pPrio !== fPrio) playerFirst = pPrio > fPrio;
    else playerFirst = pSpe >= fSpe;
  } else if (pa.k !== 'm') {
    playerFirst = true;
  } else if (oppAction.k !== 'm') {
    playerFirst = false;
  }

  if (playerFirst) {
    await act('p', pa);
    let r = await resolve();
    if (r) {
      S.phase = 'BATTLE_OVER';
      return r;
    }
    if (B.sent) {
      B.sent = 0;
    } else {
      S.phase = 'OPPONENT_TURN';
      await act('f', oppAction);
      r = await resolve();
      if (r) {
        S.phase = 'BATTLE_OVER';
        return r;
      }
      B.sent = 0;
    }
  } else {
    S.phase = 'OPPONENT_TURN';
    await act('f', oppAction);
    let r = await resolve();
    if (r) {
      S.phase = 'BATTLE_OVER';
      return r;
    }
    if (B.sent) {
      B.sent = 0;
    } else {
      S.phase = 'PLAYER_ACTION';
      await act('p', pa);
      r = await resolve();
      if (r) {
        S.phase = 'BATTLE_OVER';
        return r;
      }
      B.sent = 0;
    }
  }

  S.phase = 'PLAYER_TURN';
  return null;
}

export async function menu(): Promise<any> {
  await say(`What will ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()} do?`, 0);
  S.phase = 'PLAYER_TURN';
  return new Promise(res => {
    const c = $('#ctl');
    const m = P();
    let lk = 0;

    const done = (a: any) => {
      if (S.phase !== 'PLAYER_TURN') return;
      S.phase = 'PLAYER_ACTION';
      c.onclick = null;
      c.innerHTML = '';
      res(a);
    };

    const root = () => {
      c.className = 'main';
      c.innerHTML = `<button data-a="f"><i>⚔</i>FIGHT</button><button data-a="p"><i>◓</i>POKÉMON</button><button data-a="b"><i>🎒</i>BAG</button><button data-a="r" disabled title="You can't run from a tournament battle!"><i>👟</i>RUN</button>`;
    };

    c.onclick = async e => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b || (b as HTMLButtonElement).disabled || lk || S.phase !== 'PLAYER_TURN') return;
      const a = b.dataset.a;
      if (a === 'f') {
        c.className = 'mvs';
        c.innerHTML =
          m.moves
            .map((k: string, i: number) => {
              const mv = MOVES_DATA[k];
              const eff = calculateTypeEffectiveness(mv.typeShort, POKEMON_SPECIES_MAP[F().id]?.typesShort || ['No']);
              return `<button class="mv ${mv.typeShort}" data-a="m" data-i="${i}">${mvh(mv, eff)}</button>`;
            })
            .join('') + '<button class="w" data-a="x">BACK</button>';
      } else if (a === 'x') {
        root();
      } else if (a === 'm') {
        lk = 1;
        done({ k: 'm', mv: MOVES_DATA[m.moves[+b.dataset.i!]] });
      } else if (a === 'p') {
        lk = 1;
        const j = await pickTeam('POKÉMON', true);
        if (j >= 0) done({ k: 's', j });
        else lk = 0;
      } else if (a === 'b') {
        lk = 1;
        const r = await bagUI(B.tm, 1);
        if (r) done(r);
        else lk = 0;
      }
    };
    root();
  });
}

// Battle Flow
export async function battle(r: number): Promise<void> {
  const c = { ...RD[r], t: G.br.T[G.br.al[1]]?.nm || 'Trainer Rival' };
  const slots = Math.min(6, r + 1);
  let pl = G.team.filter(m => m.hp > 0);
  let sq: MonInstance[] = [];

  if (r === 5) {
    await pick(
      '<h1>THE FINAL</h1>KANTO CHAMPIONSHIP<br><br><span style="font-size:60px">🏆</span><br><br>FINAL BATTLE',
      [{ h: 'ENTER THE STADIUM' }]
    );
  }

  sound.music(r === 5 ? 'final' : r === 4 ? 'semi' : r === 3 ? 'intense' : 'battle');
  show('bat');
  $('#ctl').innerHTML = '';
  $('#msg').textContent = '';
  $('#fld').className = r === 5 ? 'final' : '';

  pokemon3DManager.init($('#world'));
  pokemon3DManager.start();

  if (pl.length <= slots) sq = pl;
  else {
    while (sq.length < slots) {
      const i = await pick(`Choose your team (${sq.length + 1}/${slots})`, pl.map(m => ({ h: mh(m) })), false, 'l');
      sq.push(pl.splice(i, 1)[0]);
    }
  }

  B = {
    r,
    tn: c.t,
    ai: c.ai,
    fb: c.fb,
    foe: foeTeam(r, Math.round(sq.reduce((a, m) => a + m.lv, 0) / sq.length)),
    tm: sq,
    fu: null,
    pu: null,
    get fi() {
      return this.foe.findIndex((m: MonInstance) => m.uid === this.fu);
    },
    set fi(v: number) {
      this.fu = this.foe[v].uid;
    },
    get pi() {
      return this.tm.findIndex((m: MonInstance) => m.uid === this.pu);
    },
    set pi(v: number) {
      this.pu = this.tm[v].uid;
    },
    gain: 0,
    sent: 0,
    part: new Set<number>(),
  };
  B.fi = 0;
  B.pi = 0;
  ['p', 'f'].forEach(s => ($('#' + s + 's').dataset.k = ''));
  ui();

  if (sq.length > 1) {
    B.pi = await pickTeam('Choose your lead Pokémon', false);
    ui();
  }
  B.part.add(B.pi);

  await say(`${c.t} wants to battle!`);
  await say(`${c.t} sent out ${POKEMON_SPECIES_MAP[F().id]?.name.toUpperCase()}!`);
  await say(`Go! ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()}!`);

  let res: string | null = null;
  while (!res) {
    res = await turn(await menu());
  }

  if (res === 'lose') {
    pokemon3DManager.stop();
    await pick('<h1>TOURNAMENT OVER</h1>Your entire team has fainted.', [{ h: 'TRY AGAIN' }]);
    return titleScr();
  }

  if (r === 5) {
    pokemon3DManager.stop();
    return champion();
  }

  const ir: any = IR[r] || {};
  const gt: string[] = [];
  for (const k in ir) {
    (G as any)[ITEMS[k].k] += ir[k];
    gt.push(`${ir[k]} ${ITEMS[k].n}`);
  }
  if (r >= 1 && R() < 0.3) {
    const k = Object.keys(STN)[ri(0, 4)];
    G.st[k] = (G.st[k] || 0) + 1;
    gt.push('1 ' + STN[k][1]);
  }

  pokemon3DManager.stop();
  const o = rewards(r);
  const i = await pick(
    `<h1>YOU WON!</h1>+ ${gt.join('<br>+ ')}<br>Choose ONE Pokémon:`,
    o.map(m => ({
      h: `${img(m.id)}<span>${POKEMON_SPECIES_MAP[m.id]?.name}<br>Lv.${m.lv}<small>${POKEMON_SPECIES_MAP[m.id]?.typesShort
        .map(tb)
        .join('')}</small></span>`,
    }))
  );

  if (G.team.length < MAX_TEAM) G.team.push(o[i]);
  else {
    const k = await pick(
      `TEAM FULL<br>Release one for ${POKEMON_SPECIES_MAP[o[i].id]?.name}?`,
      G.team.map(m => ({ h: mh(m) })),
      true,
      'l'
    );
    if (k >= 0) G.team[k] = o[i];
  }

  G.r++;
  G.ph = 'hub';
  G.tmax = G.tk = G.r >= 4 ? 10 : 5;
  if (G.r >= 4) G.ev = 2;
  G.last = { e: B.gain, it: gt.join('<br>+ ') || '—' };
  save();
  hubScr();
}

// Confetti and Championship
export function confetti(): void {
  const C = ['#ffd54a', '#ff4a4a', '#4a8aff', '#4adf6a', '#fff', '#b04aff'];
  for (let i = 0; i < 110; i++) {
    const d = document.createElement('div');
    d.className = 'cf';
    d.style.left = R() * 100 + '%';
    d.style.background = C[i % 6];
    $('#g').appendChild(d);
    d.animate(
      [
        { transform: 'translateY(0) rotate(0)', opacity: '1' },
        { transform: `translateY(${window.innerHeight + 60}px) rotate(${ri(300, 900)}deg)`, opacity: '0.9' },
      ],
      { duration: ri(2500, 5500), delay: R() * 2500, fill: 'backwards' }
    ).finished.then(() => d.remove());
  }
}

export async function champion(): Promise<void> {
  try {
    localStorage.removeItem(KEY);
  } catch {}

  const T = G.br.T[G.br.al[1]] || { nm: 'Trainer Rival', av: '⭐' };
  const fo = B.foe;
  const pl = G.team;
  const L = (m: MonInstance) => `${POKEMON_SPECIES_MAP[m.id]?.name} Lv.${m.lv}`;
  const cards = (l: MonInstance[]) =>
    `<div class="grid">${l
      .map(m => `<div class="itm">${img(m.id)}<b>${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()}</b><small>Lv.${m.lv}</small></div>`)
      .join('')}</div>`;

  const rec = {
    champion: true,
    tournament: 'Kanto Cup',
    finalOpponent: T.nm,
    finalOpponentTeam: fo.map(L),
    playerTeam: pl.map(L),
    date: new Date().toLocaleString(),
  };
  try {
    localStorage.setItem('kantoChampion', JSON.stringify(rec));
  } catch {}

  sound.music('victory');
  sound.cry(P().id, 'win');
  await sleep(1200);
  [523, 659, 784, 1046, 784, 1046].forEach((f, i) => setTimeout(() => sound.beep(f, 0.25), i * 180));

  await pick('<h1>YOU WON!</h1>The championship is yours!', [{ h: 'CONTINUE' }]);
  await pick(`<h1>CHAMPION DEFEATED</h1>${T.av} ${T.nm}<br>You defeated:${cards(fo)}`, [{ h: 'CONTINUE' }]);
  confetti();
  await pick(
    `<div class="trophy">🏆</div><h1>KANTO CHAMPION</h1>★ ★ ★ ★ ★<br>CONGRATULATIONS!<br><small>${rec.date}</small>`,
    [{ h: 'CONTINUE' }]
  );
  confetti();
  await pick(`<h1>🏆 CHAMPION 🏆</h1>KANTO CUP<br><br>FINAL TEAM${cards(pl)}FINAL OPPONENT: ${T.nm}${cards(fo)}`, [
    { h: 'PLAY AGAIN' },
  ]);
  titleScr();
}

// Event Listeners & Audio Panel Initialization
window.addEventListener('DOMContentLoaded', () => {
  const q = (id: string) => document.getElementById(id) as HTMLElement;
  const son = q('son') as HTMLInputElement;
  const sv = q('sv') as HTMLInputElement;
  const sb = q('sb');
  const sbIcon = q('sb-icon');
  const setOv = q('set-ov');
  const btnCloseSettings = q('btn-close-settings');

  const updateSoundVisuals = () => {
    try {
      localStorage.setItem('kantoSnd', JSON.stringify(sound.SND));
    } catch {}
    const icon = sound.SND.on && sound.SND.v > 0 ? '🔊' : '🔇';
    if (sbIcon) sbIcon.textContent = icon;
    else if (sb) sb.textContent = icon;
  };

  if (son) {
    son.checked = sound.SND.on;
    son.onchange = e => {
      sound.SND.on = (e.target as HTMLInputElement).checked;
      updateSoundVisuals();
      if (sound.SND.on) sound.beep(660, 0.1);
    };
  }

  if (sv) {
    sv.value = String(sound.SND.v * 100);
    sv.oninput = e => {
      sound.SND.v = +(e.target as HTMLInputElement).value / 100;
      updateSoundVisuals();
    };
  }

  if (sb && setOv) {
    sb.onclick = () => {
      setOv.style.display = 'flex';
    };
  }

  if (btnCloseSettings && setOv) {
    btnCloseSettings.onclick = () => {
      setOv.style.display = 'none';
    };
  }

  if (setOv) {
    setOv.onclick = e => {
      if (e.target === setOv) {
        setOv.style.display = 'none';
      }
    };
  }

  for (const [k, id] of [
    ['m', 'vm'],
    ['s', 'vs'],
    ['p', 'vp'],
  ] as const) {
    const r = q(id) as HTMLInputElement;
    if (r) {
      r.value = String((sound.AU as any)[k] * 100);
      r.oninput = () => {
        (sound.AU as any)[k] = +r.value / 100;
        sound.applyVol();
      };
    }
  }

  const m3d = q('m3d') as HTMLInputElement;
  if (m3d) {
    m3d.checked = pokemon3DManager.isEnabled();
    m3d.onchange = e => {
      pokemon3DManager.setEnabled((e.target as HTMLInputElement).checked);
    };
  }

  const m3q = q('m3q') as HTMLSelectElement;
  if (m3q) {
    m3q.value = pokemon3DManager.getQuality();
    m3q.onchange = e => {
      pokemon3DManager.setQuality((e.target as HTMLSelectElement).value as any);
    };
  }

  const btnCredits = q('btn-credits');
  if (btnCredits) {
    btnCredits.onclick = () => {
      note([
        '<h1>CREDITS & ATTRIBUTION</h1>',
        '<b>3D Pokémon Models</b><br>Powered by the open-source Pokémon 3D API ecosystem:<br><a href="https://github.com/Pokemon-3D-api" target="_blank" style="color:#60a5fa">github.com/Pokemon-3D-api</a><br><a href="https://pokemon-3d-api.onrender.com" target="_blank" style="color:#60a5fa">pokemon-3d-api.onrender.com</a>',
        '<br><b>Legal Notice & Disclaimer</b><br>This game is an unofficial, non-commercial fan project created for educational and entertainment purposes. It is not affiliated with, endorsed by, or sponsored by Nintendo, GAME FREAK, or The Pokémon Company.',
        '<br>Pokémon, Pokémon character names, and Pokémon models are trademarks and copyrights of Nintendo, Creatures Inc., and GAME FREAK.'
      ]);
    };
  }

  window.addEventListener(
    'pointerdown',
    () => {
      sound.unlock();
    },
    { passive: true }
  );

  titleScr();
});
