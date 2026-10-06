import { POKEMON_SPECIES_MAP, STONE_EVOLUTIONS, getPokemonSpecies, calculateBaseStatTotal, isEvolutionLine, STARTER_IDS } from './data/pokemon';
import { MOVES_DATA, TYPE_MOVE_MAP, MOVE_ICONS, getMoveData, formatMovePower } from './data/moves';
import { MoveData } from './types';
import { TYPE_NAMES, TYPE_CHART, calculateTypeEffectiveness } from './data/types';
import { sound } from './audio/SoundSynthesizer';
import { playMoveEffect, shk, puff, fly, el, ctr, flash, rush, ring } from './animations/CombatEffects';
import { pokemon3DManager } from './systems/Pokemon3DManager';
import { Pokemon3DApiService } from './services/Pokemon3DApiService';
import { ECONOMY } from './config/economy';
import { KANTO_GYMS, GymLeaderDefinition } from './data/gyms';
import {
  CHAMPIONSHIP_OPPONENTS,
  Championship16State,
  createChampionship16,
  simulateChampionshipRound16,
  ROUND_NAMES_16,
} from './data/championship16';
import {
  EncounterMon,
  InteractionEvent,
  generateEncounterMon,
  calculateCatchSuccess,
  generatePostGymInteraction,
} from './systems/EncounterSystem';
import { KANTO_JOURNEY_ROUTES } from './data/routes';
import { routeExplorationEngine } from './systems/RouteExplorationEngine';
import { showPokemonCaughtModal } from './systems/CaptureModal';
import { modernPokedexView } from './ui/ModernPokedexView';
import { pokedexManager } from './systems/PokedexManager';
import { ICONS } from './ui/icons';

// ============================================================================
// GLOBAL CONFIGURATION & TYPES
// ============================================================================
const KEY = 'kantoCupSave_v1';
const MAX_ACTIVE_TEAM = 6;
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

export type GamePhase =
  | 'INTRO'
  | 'NAMING'
  | 'STARTER_SELECTION'
  | 'JOURNEY_HUB'
  | 'ROUTE_ENCOUNTER'
  | 'TRAINING'
  | 'GYM_PREVIEW'
  | 'GYM_BATTLE'
  | 'GYM_VICTORY'
  | 'POST_GYM_INTERACTION'
  | 'SHOP'
  | 'CHAMPIONSHIP_BRACKET'
  | 'CHAMPIONSHIP_BATTLE'
  | 'CHAMPIONSHIP_VICTORY'
  | 'ELITE_FOUR_HUB'
  | 'ELITE_FOUR_BATTLE'
  | 'HALL_OF_FAME'
  | 'DEFEATED';

export const BALL_CONFIG = {
  ball: {
    id: 'ball',
    name: 'Poké Ball',
    icon: ICONS.pokeBall(18),
    multiplier: 1.0,
    price: 200,
    catchDesc: 'Standard (1.0×)',
    desc: 'Standard capsule for capturing wild Pokémon.',
    topGrad: ['#ff4d4d', '#dc2626', '#881337'],
    accent: '#dc2626',
  },
  greatBall: {
    id: 'greatBall',
    name: 'Great Ball',
    icon: ICONS.greatBall(18),
    multiplier: 1.5,
    price: 600,
    catchDesc: 'Better (1.5×)',
    desc: 'High-performance capsule with higher success rate than a Poké Ball.',
    topGrad: ['#38bdf8', '#0284c7', '#0369a1'],
    accent: '#0284c7',
  },
  ultraBall: {
    id: 'ultraBall',
    name: 'Ultra Ball',
    icon: ICONS.ultraBall(18),
    multiplier: 2.0,
    price: 1200,
    catchDesc: 'Best (2.0×)',
    desc: 'Ultra-performance capsule with excellent catch rate for tough Pokémon.',
    topGrad: ['#facc15', '#eab308', '#854d0e'],
    accent: '#eab308',
  },
} as const;

export interface GameSaveState {
  trainerName: string;
  starterId: number;
  phase: GamePhase;
  gymIndex: number;            // 0 to 7 (Gyms 1 to 8), 8 = Qualified for Championship
  badges: string[];            // Names of earned badges: e.g. ['Boulder Badge', 'Cascade Badge', ...]
  money: number;               // Poké Dollars
  balls: number;               // Poké Balls
  greatBalls?: number;         // Great Balls (1.5× catch rate)
  ultraBalls?: number;         // Ultra Balls (2.0× catch rate)
  b: number;                   // Oran Berry (30% HP)
  b50: number;                 // Sitrus Berry (50% HP)
  b75: number;                 // Enigma Berry (75% HP)
  fh: number;                  // Full Heal Berry (100% HP)
  rv: number;                  // Revive (50% HP)
  st: Record<string, number>;  // Evolution Stones: { El: 0, Fi: 0, Wa: 0, Gr: 0, Mo: 0 }
  team: MonInstance[];         // Active team (up to 6)
  pcBox: MonInstance[];        // Stored reserve Pokémon
  routeEncountersDone: number; // 0 to 5 for Route 1 initial journey
  interactionsDone: number;    // 0 to 5 for route between gyms
  tk: number;                  // Training sessions left (0 to 5)
  tmax: number;                // 5
  lastReward?: string;
  tournament?: Championship16State;
  tournamentRound?: number;    // 0: Ro16, 1: QF, 2: SF, 3: Final
  eliteFour?: {
    defeated: string[];
    activeMember?: string | null;
    powerUpsRemaining?: number; // 3 direct level-ups
  };
  defeated?: boolean;
  savedRoutePos?: { routeId: number; x: number; y: number } | null;
  currentRouteId?: number;
  wildBattlesCount?: number;
}

export function getTrainingXpMultiplier(state?: GameSaveState | null): number {
  if (!state) return 1.0;
  // Qualified for Championship (8 badges or in tournament / endgame): 2× XP boost
  if (
    state.gymIndex >= 8 ||
    state.phase === 'CHAMPIONSHIP_BRACKET' ||
    state.phase === 'CHAMPIONSHIP_BATTLE' ||
    state.phase === 'CHAMPIONSHIP_VICTORY' ||
    state.phase === 'ELITE_FOUR_HUB' ||
    state.phase === 'ELITE_FOUR_BATTLE' ||
    state.phase === 'HALL_OF_FAME' ||
    state.tournament != null
  ) {
    return 2.0;
  }
  return 1.0;
}

export function returnToCurrentHub(): void {
  if (G.phase === 'CHAMPIONSHIP_BRACKET' || (G.tournament && G.phase !== 'JOURNEY_HUB')) {
    championshipScr();
  } else if (G.phase === 'ELITE_FOUR_HUB') {
    eliteFourHub();
  } else {
    journeyHubScr();
  }
}

export let G: GameSaveState;
export let B: any = null;
export let HUB: string[] | null = null;
export const S = { phase: 'PLAYER_TURN' };

// Active Encounter Mon being engaged during a route encounter / interaction
let currentEncounterMon: EncounterMon | null = null;

// ============================================================================
// STATS, EXP & MOVE HELPERS
// ============================================================================
export const st = (m: MonInstance) => {
  const f = (b: number, i: number) => Math.floor(((2 * b + m.iv) * m.lv) / 100) + (i ? 5 : m.lv + 10);
  const spec = POKEMON_SPECIES_MAP[m.id];
  const [h, atk, def, spa, spd, spe] = [
    spec.baseHP,
    spec.baseAttack,
    spec.baseDefense,
    spec.baseSpAttack,
    spec.baseSpDefense,
    spec.baseSpeed,
  ].map(f);
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
export const nu = () => 'm' + Date.now().toString(36) + (UID++).toString(36);

export const mk = (id: number, lv: number): MonInstance => {
  const m: MonInstance = { uid: nu(), id, lv, iv: ri(0, 15), exp: 0, hp: 1, moves: [] };
  m.moves = pool(m).slice(0, 4).map(x => x.name);
  if (!m.moves.length) m.moves = ['Tackle'];
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

// ============================================================================
// STARTERS DEFINITION (5 Starters: Bulbasaur, Charmander, Squirtle, Pikachu, Eevee)
// ============================================================================
export const STARTER_OPTIONS = [
  {
    id: 1,
    name: 'Bulbasaur',
    type: 'Grass / Poison',
    typesShort: ['Gr', 'Po'],
    badgeClass: 'starter-bulba',
    desc: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
    stats: 'HP 45 · ATK 49 · DEF 49 · SP.ATK 65 · SP.DEF 65 · SPE 45',
    moves: ['Tackle', 'Growl', 'Vine Whip'],
  },
  {
    id: 4,
    name: 'Charmander',
    type: 'Fire',
    typesShort: ['Fi'],
    badgeClass: 'starter-charm',
    desc: 'The flame on its tail indicates its life force. If healthy, the flame burns brightly.',
    stats: 'HP 39 · ATK 52 · DEF 43 · SP.ATK 60 · SP.DEF 50 · SPE 65',
    moves: ['Scratch', 'Growl', 'Ember'],
  },
  {
    id: 7,
    name: 'Squirtle',
    type: 'Water',
    typesShort: ['Wa'],
    badgeClass: 'starter-squirt',
    desc: 'After birth, its back swells and hardens into a protective shell. It sprays foam from its mouth.',
    stats: 'HP 44 · ATK 48 · DEF 65 · SP.ATK 50 · SP.DEF 64 · SPE 43',
    moves: ['Tackle', 'Tail Whip', 'Water Gun'],
  },
  {
    id: 25,
    name: 'Pikachu',
    type: 'Electric',
    typesShort: ['El'],
    badgeClass: 'starter-pika',
    desc: 'Stores electricity in the red sacs of its cheeks. When threatened, it releases crackling jolts.',
    stats: 'HP 42 · ATK 55 · DEF 45 · SP.ATK 55 · SP.DEF 50 · SPE 85',
    moves: ['Thunder Shock', 'Quick Attack', 'Growl', 'Tail Whip'],
  },
  {
    id: 133,
    name: 'Eevee',
    type: 'Normal',
    typesShort: ['No'],
    badgeClass: 'starter-eevee',
    desc: 'An adaptable Pokémon with irregular genetics allowing it to evolve into various unique elemental forms.',
    stats: 'HP 55 · ATK 55 · DEF 50 · SP.ATK 50 · SP.DEF 65 · SPE 55',
    moves: ['Tackle', 'Quick Attack', 'Tail Whip', 'Sand Attack'],
  },
];

// ============================================================================
// SAVE / LOAD SYSTEM
// ============================================================================
export const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(G));
  } catch { }
};

export const load = (): GameSaveState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g: GameSaveState = JSON.parse(raw);
    if (g && !g.defeated && g.team && g.team.length > 0) {
      g.trainerName = g.trainerName || 'TRAINER';
      g.gymIndex = g.gymIndex ?? 0;
      g.badges = g.badges || [];
      g.money = g.money ?? 1000;
      g.balls = g.balls ?? 5;
      g.greatBalls = g.greatBalls ?? 0;
      g.ultraBalls = g.ultraBalls ?? 0;
      g.b = g.b ?? 3;
      g.b50 = g.b50 ?? 1;
      g.b75 = g.b75 ?? 0;
      g.fh = g.fh ?? 2;
      g.rv = g.rv ?? 2;
      g.st = g.st || {};
      g.pcBox = g.pcBox || [];
      g.routeEncountersDone = g.routeEncountersDone ?? 5;
      g.interactionsDone = g.interactionsDone ?? 0;
      g.tk = g.tk ?? 5;
      g.tmax = g.tmax ?? 5;
      g.eliteFour = g.eliteFour || { defeated: [], activeMember: null };
      if (g.eliteFour) {
        g.eliteFour.powerUpsRemaining = g.eliteFour.powerUpsRemaining ?? 3;
      }
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

// ============================================================================
// UI RENDERING HELPERS
// ============================================================================
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

export const mvh = (v: any, e: number = 1) => {
  const mv = v && v.typeShort ? v : getMoveData(typeof v === 'string' ? v : (v?.name || 'Tackle'));
  const effTag =
    e > 1
      ? `<span class="mv-eff es">2×</span>`
      : e < 1 && e > 0
        ? `<span class="mv-eff ew">½×</span>`
        : e === 0
          ? `<span class="mv-eff en">0×</span>`
          : '';

  const accStr = mv.accuracy ? `${mv.accuracy}%` : '—';
  const pwrStr = formatMovePower(mv.power, mv.category);

  return `
    <div class="mv-row-top">
      <span class="mn">${mv.name.toUpperCase()}</span>
      <span class="t-badge t-${mv.typeShort.toLowerCase()}">${mv.type.toUpperCase()}</span>
    </div>
    <div class="mv-row-sub">
      <span class="mv-meta">PWR ${pwrStr}</span>
      <span class="mv-meta">ACC ${accStr}</span>
      ${effTag}
    </div>
  `;
};

export const show = (id: string) => {
  document.querySelectorAll('.scr').forEach(e => e.classList.toggle('on', e.id === id));
  if (id !== 'bat') {
    pokemon3DManager.stop();
  }
};

export function pick(title: string, items: { d?: boolean; h: string }[], cancel?: boolean, cls: string = ''): Promise<number> {
  return new Promise(res => {
    const o = $('#ov');
    const isSingle = items.length === 1;
    o.innerHTML = `<div class="box">
      <div class="modal-title">${title}</div>
      <div class="grid ${cls} ${isSingle ? 'single-btn-grid' : ''}">${items
        .map((x, i) => `<button data-i="${i}" class="modal-btn ${isSingle ? 'single-btn' : ''}" ${x.d ? 'disabled' : ''}>${x.h}</button>`)
        .join('')}</div>
      ${cancel ? '<div class="modal-cancel-row"><button data-i="-1" class="modal-btn modal-back-btn">BACK</button></div>' : ''}
    </div>`;
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

export const renderBadgesBar = (badges: string[]): string => {
  const BADGES_LIST = [
    { n: 'Boulder Badge', s: 'Boulder', ic: ICONS.badgeBoulder(22) },
    { n: 'Cascade Badge', s: 'Cascade', ic: ICONS.badgeCascade(22) },
    { n: 'Thunder Badge', s: 'Thunder', ic: ICONS.badgeThunder(22) },
    { n: 'Rainbow Badge', s: 'Rainbow', ic: ICONS.badgeRainbow(22) },
    { n: 'Soul Badge', s: 'Soul', ic: ICONS.badgeSoul(22) },
    { n: 'Marsh Badge', s: 'Marsh', ic: ICONS.badgeMarsh(22) },
    { n: 'Volcano Badge', s: 'Volcano', ic: ICONS.badgeVolcano(22) },
    { n: 'Earth Badge', s: 'Earth', ic: ICONS.badgeEarth(22) },
  ];

  const earnedCount = BADGES_LIST.filter(b => (badges || []).includes(b.n) || (badges || []).includes(b.s)).length;

  return `
    <div class="badges-strip-container">
      <div class="badges-strip-header">
        <span class="badges-strip-title">${ICONS.trophy(16)} KANTO GYM BADGES</span>
        <span class="badges-strip-count">${earnedCount} / 8 EARNED</span>
      </div>
      <div class="badges-strip">
        ${BADGES_LIST.map(b => {
    const earned = (badges || []).includes(b.n) || (badges || []).includes(b.s);
    return `
            <div class="badge-slot ${earned ? 'earned' : 'locked'}" title="${b.n} ${earned ? '(Earned)' : '(Locked)'}">
              <div class="badge-slot-icon">${b.ic}</div>
              <div class="badge-slot-name">${b.s}</div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
};

export const renderResourcesBar = (): string => {
  return `
    <div class="resources-bar">
      <div class="wallet-badge">${ICONS.money(16)} ₽${(G?.money || 0).toLocaleString()}</div>
      <div class="inventory-pills">
        <span title="Poké Balls (1.0× Catch)">${ICONS.pokeBall(15)} ×${G?.balls || 0}</span>
        <span title="Great Balls (1.5× Catch)">${ICONS.greatBall(15)} ×${G?.greatBalls || 0}</span>
        <span title="Ultra Balls (2.0× Catch)">${ICONS.ultraBall(15)} ×${G?.ultraBalls || 0}</span>
        <span title="Oran Berries (30% HP)">${ICONS.oranBerry(15)} ×${G?.b || 0}</span>
        <span title="Sitrus Berries (50% HP)">${ICONS.sitrusBerry(15)} ×${G?.b50 || 0}</span>
        <span title="Full Heal Berries (100% HP)">${ICONS.fullHeal(15)} ×${G?.fh || 0}</span>
        <span title="Revives">${ICONS.revive(15)} ×${G?.rv || 0}</span>
      </div>
    </div>
  `;
};

// ============================================================================
// SCREEN 1: TITLE SCREEN
// ============================================================================
export function titleScr(): void {
  sound.music('menu');
  show('title');
  // Preload starter models
  [1, 4, 7, 25].forEach(id => Pokemon3DApiService.getInstance().preloadPokemon(id));

  const hasActiveSave = !!load();
  const hasHistory = !!localStorage.getItem('kantoChampionshipRecords') || !!localStorage.getItem('kantoChampion');
  const hasE4History = !!localStorage.getItem('kantoEliteFourRecord');

  const saveDetails = hasActiveSave
    ? `${load()!.trainerName} · ${load()!.badges.length} Badges · ₽${load()!.money.toLocaleString()}`
    : '';

  $('#title').innerHTML = `
    <h1>POKÉMON: KANTO CUP</h1>
    <p style="text-align:center">A Complete Kanto Journey RPG</p>
    <div class="col">
      <button id="bc" ${hasActiveSave ? '' : 'disabled'}>
        ${hasActiveSave ? `CONTINUE JOURNEY<br><small style="color:#facc15">${saveDetails}</small>` : 'CONTINUE'}
      </button>
      <button id="bn">NEW ADVENTURE</button>
      ${hasHistory ? '<button id="bh">CHAMPIONSHIP RECORDS</button>' : ''}
      ${hasE4History ? '<button id="be4">ELITE FOUR RECORDS</button>' : ''}
      <button id="br" class="btn-secondary">RESET SAVE DATA</button>
    </div>
  `;

  $('#bc').onclick = () => {
    G = load()!;
    if (G.phase === 'INTRO' || G.phase === 'NAMING') namingScr();
    else if (G.phase === 'STARTER_SELECTION') starterScr();
    else if (G.phase === 'ROUTE_ENCOUNTER') routeEncounterScr();
    else if (G.phase === 'POST_GYM_INTERACTION') postGymInteractionScr();
    else if (G.phase === 'CHAMPIONSHIP_BRACKET') championshipScr();
    else if (G.phase === 'ELITE_FOUR_HUB') eliteFourHub();
    else journeyHubScr();
  };

  $('#bn').onclick = () => introScr();

  $('#br').onclick = () => {
    try {
      localStorage.removeItem(KEY);
    } catch { }
    titleScr();
  };

  if ($('#bh')) {
    $('#bh').onclick = () => {
      const records = JSON.parse(localStorage.getItem('kantoChampionshipRecords') || '[]');
      const legacy = JSON.parse(localStorage.getItem('kantoChampion') || '{}');
      const all = records.length ? records : legacy.date ? [legacy] : [];
      if (!all.length) {
        note(['No Championship records saved yet. Defeat the Kanto Championship to earn your place in history!']);
        return;
      }
      note([
        '<h1>KANTO CHAMPIONSHIP HISTORY</h1>',
        ...all.slice(0, 5).map((r: any, idx: number) => `
          <b>#${idx + 1} ${r.trainerName || r.playerTeam?.[0] || 'CHAMPION'}</b> · ${r.date || ''}<br>
          <small>Team: ${(r.playerTeam || []).join(', ')}</small><br>
        `),
      ]);
    };
  }

  if ($('#be4')) {
    $('#be4').onclick = () => {
      const r = JSON.parse(localStorage.getItem('kantoEliteFourRecord') || '{}');
      note([
        '<h1>ELITE FOUR GRAND CHAMPIONS</h1>' + (r.date || ''),
        `<b>Trainer:</b> ${r.trainerName || 'Champion'}<br>`,
        '<b>Conquest Order:</b> ' + (r.orderDisplay || (r.order || []).join(' ➔ ')),
        '<br><b>Grand Champion Team:</b><br>' + ((r.playerTeam || []).join(', ') || ''),
      ]);
    };
  }
}

// ============================================================================
// SCREEN 2: CINEMATIC INTRO SEQUENCE
// ============================================================================
export async function introScr(): Promise<void> {
  sound.music('menu');
  show('map');

  $('#map').innerHTML = `
    <div class="intro-container" style="text-align:center;padding:24px 12px;color:#f8fafc">
      <h1 style="letter-spacing:2px;margin-bottom:4px">KANTO</h1>
      <h3 style="color:#38bdf8;margin-top:0;font-weight:800">A NEW JOURNEY</h3>
      <p style="max-width:440px;margin:20px auto;line-height:1.6;font-size:14px;color:#cbd5e1">
        Across the Kanto region, Pokémon and humans have formed a bond that has lasted for generations.<br><br>
        Trainers travel the region, build their teams, and challenge eight powerful Gym Leaders.<br><br>
        Only those who earn all eight Gym Badges can enter the prestigious Kanto Championship.<br><br>
        And today... your journey begins.
      </p>
      <div class="col" style="max-width:320px;margin:0 auto">
        <button id="intro-step1" style="text-align:center">ENTER THE WORLD ➔</button>
      </div>
    </div>
  `;

  $('#intro-step1').onclick = () => {
    sound.beep(659, 0.2, 'sine');
    $('#map').innerHTML = `
      <div class="intro-container" style="text-align:center;padding:20px 12px;color:#f8fafc">
        <h1>PROFESSOR OAK</h1>
        <div style="display:flex;align-items:center;gap:14px;background:#1e293b;border:2px solid #334155;border-radius:18px;padding:16px;margin:16px 0;text-align:left">
          <div style="width:52px;height:52px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid #64748b">
            ${ICONS.pokedex(26)}
          </div>
          <p style="margin:0;line-height:1.5;font-size:13.5px;color:#f8fafc">
            "Welcome to the world of Pokémon! My name is Professor Oak.<br><br>
            This world is inhabited far and wide by creatures called Pokémon. For some people, Pokémon are pets. Others use them for battles.<br><br>
            Before you set out on your quest across Kanto, please tell me your name."
          </p>
        </div>
        <div class="col" style="max-width:320px;margin:0 auto">
          <button id="intro-step2" style="text-align:center">TELL PROFESSOR YOUR NAME ➔</button>
        </div>
      </div>
    `;

    $('#intro-step2').onclick = () => namingScr();
  };
}

// ============================================================================
// SCREEN 3: CHARACTER NAMING
// ============================================================================
export function namingScr(): void {
  sound.music('menu');
  show('map');

  $('#map').innerHTML = `
    <div class="naming-container">
      <div class="naming-box">
        <div class="naming-title">WHAT IS YOUR NAME?</div>
        <div class="naming-subtitle">Enter your trainer name (1–12 characters):</div>
        <input type="text" id="dex-name" class="dex-name-input" maxlength="12" placeholder="TRAINER" autofocus autocomplete="off" />
        <div class="naming-char-limit">Letters, numbers, and spaces allowed.</div>
        <button id="name-submit" class="naming-confirm-btn">CONFIRM NAME</button>
      </div>
    </div>
  `;

  const input = $('#dex-name') as HTMLInputElement;
  input.focus();

  const handleConfirm = () => {
    const raw = input.value.trim();
    if (!raw || raw.length < 1 || raw.length > 12) {
      sound.beep(180, 0.25, 'sawtooth');
      alert('Please enter a valid trainer name between 1 and 12 characters.');
      return;
    }
    sound.beep(880, 0.15, 'triangle');
    starterScr(raw);
  };

  $('#name-submit').onclick = handleConfirm;
  input.onkeydown = e => {
    if (e.key === 'Enter') handleConfirm();
  };
}

// ============================================================================
// SCREEN 4: STARTER SELECTION (5 Starters: Bulbasaur, Charmander, Squirtle, Pikachu, Eevee)
// ============================================================================
export function starterScr(trainerName: string = 'DWIP'): void {
  sound.music('select');
  show('map');

  let selectedIdx = 0;

  const renderStarterView = () => {
    const chosen = STARTER_OPTIONS[selectedIdx];
    const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${chosen.id}.png`;

    $('#map').innerHTML = `
      <div class="starter-modern-screen">
        <div class="starter-header-group">
          <span class="starter-subtitle">BEGIN YOUR KANTO JOURNEY</span>
          <h1 class="starter-title">CHOOSE YOUR PARTNER</h1>
          <p class="starter-caption">Welcome, <b>${trainerName.toUpperCase()}</b>! Select your first Pokémon companion (Lv.5):</p>
        </div>

        <div class="starter-stage-card">
          <div class="starter-stage-art">
            <img class="starter-large-img" src="${artwork}" alt="${chosen.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${chosen.id}.png'">
          </div>
          <div class="starter-stage-info">
            <div class="starter-stage-name">${chosen.name.toUpperCase()}</div>
            <div class="starter-stage-types">
              ${chosen.typesShort.map(t => `<span class="t-badge t-${t.toLowerCase()}">${TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t}</span>`).join(' ')}
            </div>
            <div class="starter-stage-stats">${chosen.stats}</div>
          </div>
          <button id="btn-choose-starter" class="starter-choose-btn">
            <span>CHOOSE ${chosen.name.toUpperCase()}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div class="starter-carousel-indicators">
          ${STARTER_OPTIONS.map((s, idx) => `
            <button class="starter-thumb-btn ${idx === selectedIdx ? 'active' : ''}" data-idx="${idx}" title="${s.name}">
              <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.id}.png" alt="${s.name}" />
              <span class="thumb-number">${idx + 1}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Bind indicator clicks
    $('#map').querySelectorAll<HTMLButtonElement>('.starter-thumb-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx || '0', 10);
        if (idx !== selectedIdx) {
          selectedIdx = idx;
          sound.cry(STARTER_OPTIONS[selectedIdx].id, 'battle');
          renderStarterView();
        }
      };
    });

    // Confirm choice
    const chooseBtn = $('#btn-choose-starter');
    if (chooseBtn) {
      chooseBtn.onclick = async () => {
        sound.cry(chosen.id, 'win');

        const starterMon = mk(chosen.id, 5);
        starterMon.moves = [...chosen.moves];

        G = {
          trainerName: trainerName.trim() || 'TRAINER',
          starterId: chosen.id,
          phase: 'ROUTE_ENCOUNTER',
          gymIndex: 0,
          badges: [],
          money: ECONOMY.startingMoney,
          balls: ECONOMY.startingBalls,
          b: ECONOMY.startingBerries.oran,
          b50: 1,
          b75: 0,
          fh: ECONOMY.startingBerries.fullHeal,
          rv: ECONOMY.startingBerries.revive,
          st: {},
          team: [starterMon],
          pcBox: [],
          routeEncountersDone: 0,
          interactionsDone: 0,
          tk: 5,
          tmax: 5,
          tournament: createChampionship16(trainerName),
          eliteFour: { defeated: [], activeMember: null },
          defeated: false,
        };

        pokedexManager.recordCaught(chosen.id);
        save();

        await note([
          `<h1>YOUR JOURNEY BEGINS</h1>`,
          `Welcome, <b>${trainerName.toUpperCase()}</b>!`,
          `You and <b>${chosen.name.toUpperCase()}</b> (Lv.5) are ready to conquer the Kanto region.`,
          `<br><b>Starter Adventurer Supplies:</b>`,
          `• 5× Poké Balls`,
          `• 3× Oran Berries (30% HP)`,
          `• 2× Full Heal Berries (100% HP)`,
          `• 2× Revives`,
          `• ₽1,000 Starting Funds`,
          `<br>Explore Route 1 toward Pewter City to catch wild partners and train for your first Gym battle.`,
        ]);

        enterRouteExploration(0);
      };
    }
  };

  renderStarterView();
}

// ============================================================================
// SCREEN 5: ROUTE EXPLORATION LAYER (Interactive Kanto Travel)
// ============================================================================
export function saveCurrentRoutePosition(): void {
  if (routeExplorationEngine.currentRoute && G) {
    G.currentRouteId = routeExplorationEngine.currentRoute.id;
    G.savedRoutePos = {
      routeId: routeExplorationEngine.currentRoute.id,
      x: Math.round(routeExplorationEngine.player.x),
      y: Math.round(routeExplorationEngine.player.y),
    };
    save();
  }
}

export async function visitPokemonCenter(): Promise<void> {
  const choice = await pick(
    'POKÉMON CENTER<br>Nurse Joy: "Welcome to the Pokémon Center!<br>Would you like me to heal your Pokémon to full health?"',
    [
      { h: 'YES, HEAL PARTY (100% HP)' },
      { h: 'NO, THANK YOU' },
    ],
    false
  );
  if (choice === 0) {
    G.team.forEach(m => {
      m.hp = st(m).max;
    });
    save();
    sound.beep(659, 0.2, 'sine');
    sound.beep(880, 0.35, 'sine', 0.1, 0.15);
    await note([
      '<h3>NURSE JOY</h3>',
      'Restoring your Pokémon team...',
      'Your Pokémon are fully healed to 100% HP! We hope to see you again!',
    ]);
  }
}

export function enterRouteExploration(routeId?: number, resumeX?: number, resumeY?: number): void {
  // Determine active route: explicit param > G.savedRoutePos.routeId > G.currentRouteId > G.gymIndex
  const rId =
    routeId !== undefined
      ? routeId
      : (G?.savedRoutePos?.routeId !== undefined
        ? G.savedRoutePos.routeId
        : (G?.currentRouteId !== undefined
          ? G.currentRouteId
          : Math.min(KANTO_JOURNEY_ROUTES.length - 1, G?.gymIndex || 0)));

  if (G) {
    G.currentRouteId = rId;
  }

  const routeDef = KANTO_JOURNEY_ROUTES[rId] || KANTO_JOURNEY_ROUTES[0];

  // Resume saved position if returning to route without explicit coordinates
  if (resumeX === undefined && resumeY === undefined && G?.savedRoutePos && G.savedRoutePos.routeId === rId) {
    resumeX = G.savedRoutePos.x;
    resumeY = G.savedRoutePos.y;
  }

  sound.music('menu');
  show('route');

  // Update HUD elements
  const locEl = $('#hud-location');
  const destEl = $('#hud-destination');
  const ballsVal = $('#hud-balls-val');
  const moneyVal = $('#hud-money-val');
  const encDots = $('#hud-enc-dots');

  if (locEl) locEl.textContent = routeDef.name;
  if (destEl) destEl.textContent = `➔ ${routeDef.destinationLabel}`;
  if (ballsVal) ballsVal.textContent = String(G?.balls || 0);
  if (moneyVal) moneyVal.textContent = (G?.money || 0).toLocaleString();

  if (encDots) {
    const doneCount = Math.min(5, G?.routeEncountersDone || 0);
    encDots.innerHTML = Array.from({ length: 5 })
      .map((_, i) => `<i class="h-dot ${i < doneCount ? 'done' : ''}"></i>`)
      .join('');
  }

  const canvas = $('#route-canvas') as HTMLCanvasElement;
  if (canvas) {
    routeExplorationEngine.init(canvas);
    routeExplorationEngine.loadRoute(routeDef, resumeX, resumeY);
    routeExplorationEngine.start();
  }

  // Connect engine callbacks
  routeExplorationEngine.onTriggerEncounter = (wildMon, x, y) => {
    saveCurrentRoutePosition();
    routeExplorationEngine.stop();
    battleWild(wildMon, { routeId: rId, x, y });
  };

  routeExplorationEngine.onEnterGym = (gymIndex) => {
    saveCurrentRoutePosition();
    routeExplorationEngine.stop();
    gymBattleScr(gymIndex);
  };

  routeExplorationEngine.onEnterCenter = async () => {
    routeExplorationEngine.isPaused = true;
    await visitPokemonCenter();
    routeExplorationEngine.isPaused = false;
  };

  routeExplorationEngine.onEnterMart = () => {
    saveCurrentRoutePosition();
    routeExplorationEngine.stop();
    shopScr();
  };

  routeExplorationEngine.onEnterHouse = async (building) => {
    routeExplorationEngine.isPaused = true;
    sound.beep(659, 0.15, 'sine');
    sound.beep(880, 0.2, 'sine', 0.08, 0.1);
    await note([
      `<h3>🏡 ${building.label}</h3>`,
      building.occupant ? `<p style="font-weight:700;color:#38bdf8;margin:6px 0;">Resident: ${building.occupant}</p>` : '',
      building.dialogue
        ? `<p style="font-style:italic;line-height:1.5;margin-top:10px;">"${building.dialogue}"</p>`
        : `<p style="line-height:1.5;margin-top:10px;">A cozy Kanto home with a warm hearth, bookshelf filled with Pokémon field guides, and fresh tea.</p>`,
    ].filter(Boolean));
    routeExplorationEngine.isPaused = false;
  };

  routeExplorationEngine.onEnterGate = async (building) => {
    routeExplorationEngine.isPaused = true;
    sound.beep(880, 0.15, 'sine');
    const nextRouteIdx = routeExplorationEngine.currentRoute ? routeExplorationEngine.currentRoute.id + 1 : 1;
    const nextRouteDef = KANTO_JOURNEY_ROUTES[nextRouteIdx];
    const destination = nextRouteDef ? nextRouteDef.name : 'the next area';
    const choice = await pick(
      `<b>${building.label}</b><br><br>Officer Jenny: "Halt, Trainer! This checkpoint gate connects to <b>${destination}</b>.<br>Would you like to pass through the gatehouse?"`,
      [
        { h: `PROCEED TO ${destination.toUpperCase()} ➔` },
        { h: `RETURN TO CITY HUB` },
        { h: `CANCEL (Stay on current route)` },
      ],
      false
    );
    if (choice === 0) {
      if (G) {
        G.currentRouteId = nextRouteIdx;
        G.savedRoutePos = {
          routeId: nextRouteIdx,
          x: nextRouteDef ? nextRouteDef.startX : 70,
          y: nextRouteDef ? nextRouteDef.startY : 230,
        };
        // Award 5 fresh training sessions for reaching a new area/city!
        G.tk = (G.tk || 0) + 5;
        G.tmax = Math.max(G.tmax || 5, G.tk);
        save();
      }
      routeExplorationEngine.stop();
      sound.beep(659, 0.15, 'sine');
      sound.beep(880, 0.25, 'sine', 0.1, 0.12);
      await note([
        `<h1>ARRIVED AT ${destination.toUpperCase()}!</h1>`,
        `You have successfully passed through the gatehouse and arrived at <b>${destination}</b>!`,
        `<b>+5 fresh training sessions have been granted for reaching a new area!</b> (Total: ${G?.tk || 5})`,
        `Explore the city, visit the Pokémon Center and Poké Mart, and prepare for the Gym challenge!`,
      ]);
      if (nextRouteIdx < KANTO_JOURNEY_ROUTES.length) {
        enterRouteExploration(nextRouteIdx);
      } else {
        journeyHubScr();
      }
    } else if (choice === 1) {
      saveCurrentRoutePosition();
      routeExplorationEngine.stop();
      journeyHubScr();
    } else {
      routeExplorationEngine.isPaused = false;
    }
  };

  routeExplorationEngine.onPickItem = async (it) => {
    if (it.type === 'ball') G.balls = (G.balls || 0) + it.amount;
    else if (it.type === 'berry') G.b = (G.b || 0) + it.amount;
    else if (it.type === 'money') G.money = (G.money || 0) + it.amount;
    save();

    const ballsVal = $('#hud-balls-val');
    const moneyVal = $('#hud-money-val');
    if (ballsVal) ballsVal.textContent = String(G.balls || 0);
    if (moneyVal) moneyVal.textContent = (G.money || 0).toLocaleString();

    await note([`Found <b>${it.name}</b> (×${it.amount}) on the route!`]);
  };

  routeExplorationEngine.onTalkNPC = async (npc) => {
    routeExplorationEngine.isPaused = true;
    await note([
      `<h3>${npc.avatar} ${npc.name}</h3>`,
      `<p style="font-style:italic">"${npc.dialogue}"</p>`,
      ...(npc.gift && !npc.given
        ? [`<b>${npc.name} handed you a gift: ${npc.gift.name} ×${npc.gift.amount}!</b>`]
        : []),
    ]);

    if (npc.gift && !npc.given) {
      npc.given = true;
      if (npc.gift.type === 'ball') G.balls = (G.balls || 0) + npc.gift.amount;
      else if (npc.gift.type === 'berry') G.b = (G.b || 0) + npc.gift.amount;
      else if (npc.gift.type === 'money') G.money = (G.money || 0) + npc.gift.amount;
      save();
      const ballsVal = $('#hud-balls-val');
      const moneyVal = $('#hud-money-val');
      if (ballsVal) ballsVal.textContent = String(G.balls || 0);
      if (moneyVal) moneyVal.textContent = (G.money || 0).toLocaleString();
    }
    routeExplorationEngine.isPaused = false;
  };

  routeExplorationEngine.onReadSignpost = async (sp) => {
    routeExplorationEngine.isPaused = true;
    await note([
      `<h3>📋 ${sp.title}</h3>`,
      ...sp.lines.map((l) => `<p style="font-weight:600;margin:6px 0;line-height:1.4;">${l}</p>`),
    ]);
    routeExplorationEngine.isPaused = false;
  };

  routeExplorationEngine.onRouteExit = async (nextRouteId) => {
    if (nextRouteId < KANTO_JOURNEY_ROUTES.length) {
      const nextRouteDef = KANTO_JOURNEY_ROUTES[nextRouteId];
      if (G) {
        G.currentRouteId = nextRouteId;
        G.savedRoutePos = {
          routeId: nextRouteId,
          x: nextRouteDef.startX,
          y: nextRouteDef.startY,
        };
        G.tk = (G.tk || 0) + 5;
        G.tmax = Math.max(G.tmax || 5, G.tk);
        save();
      }
      routeExplorationEngine.stop();
      sound.beep(659, 0.15, 'sine');
      sound.beep(880, 0.25, 'sine', 0.1, 0.12);
      await note([
        `<h1>ARRIVED AT ${nextRouteDef.name.toUpperCase()}!</h1>`,
        `You have arrived at <b>${nextRouteDef.name}</b>!`,
        `<b>+5 fresh training sessions have been granted!</b> (Total: ${G?.tk || 5})`,
      ]);
      enterRouteExploration(nextRouteId);
    } else {
      routeExplorationEngine.stop();
      journeyHubScr();
    }
  };

  routeExplorationEngine.onOpenMenu = () => {
    saveCurrentRoutePosition();
    routeExplorationEngine.stop();
    journeyHubScr();
  };
}

export function routeEncounterScr(): void {
  enterRouteExploration(G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? G.gymIndex);
}

export function postGymInteractionScr(): void {
  enterRouteExploration(G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? G.gymIndex);
}

// ============================================================================
// SCREEN 6: THE CENTRAL JOURNEY HUB (Connects City, Gyms, Routes, Shop, Training, Team)
// ============================================================================
export function journeyHubScr(): void {
  sound.music('menu');
  show('map');

  const gymIdx = G.gymIndex;
  const currentGym = gymIdx < 8 ? KANTO_GYMS[gymIdx] : null;
  const activeRouteId = G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? gymIdx;
  const currentRouteDef = KANTO_JOURNEY_ROUTES[activeRouteId] || KANTO_JOURNEY_ROUTES[gymIdx];
  const cityName = currentGym ? currentGym.city : 'Indigo Plateau';

  let heroCardHTML = '';

  if (gymIdx < 8) {
    heroCardHTML = `
      <div class="journey-main-card">
        <div class="journey-card-header">
          <span class="journey-step-badge">KANTO ROUTE EXPLORATION</span>
          <span style="font-size:12px;font-weight:800;color:var(--md-sys-color-accent-gold)">GYM ${gymIdx + 1} OF 8 · ${currentGym!.city.toUpperCase()}</span>
        </div>
        <div class="journey-card-title">${currentRouteDef?.name || 'Route'} ➔ ${currentRouteDef?.destinationLabel || currentGym!.city}</div>
        <div class="journey-card-desc">
          Travel through expansive Kanto routes, explore diverse tall grass zones, discover hidden items, and challenge Gym Leader ${currentGym!.leader}.
        </div>
        <div class="col" style="gap:8px">
          <button id="btn-explore-route" class="btn-primary" style="width:100%;text-align:center;font-size:14px;font-weight:900">
            EXPLORE ROUTE & TRAVEL ➔
          </button>
          <button id="btn-gym-battle" class="btn-accent" style="width:100%;text-align:center;font-size:13px;font-weight:900">
            CHALLENGE GYM LEADER ${currentGym!.leader.toUpperCase()} (${currentGym!.city} Gym)
          </button>
        </div>
      </div>
    `;
  } else if (gymIdx === 8) {
    // All 8 Badges Obtained -> Championship!
    const roundIdx = G.tournament?.currentRoundIndex ?? 0;
    const roundName = ROUND_NAMES_16[roundIdx] || 'CHAMPIONSHIP';
    const oppId = G.tournament?.activeIds?.[1];
    const oppName = (oppId && G.tournament?.trainers?.[oppId]?.name) || 'Championship Contender';
    const isStarted = !!G.tournament && (G.tournament.currentRoundIndex > 0 || (G.tournament.history && G.tournament.history.length > 0));

    heroCardHTML = `
      <div class="journey-main-card">
        <div class="journey-card-header">
          <span class="journey-step-badge">ALL 8 BADGES OBTAINED</span>
          <span style="font-size:12px;font-weight:800;color:var(--md-sys-color-accent-gold)">16-TRAINER TOURNAMENT</span>
        </div>
        <div class="journey-card-title">KANTO CHAMPIONSHIP TOURNAMENT</div>
        <div class="journey-card-desc">
          ${isStarted
        ? `Tournament in progress! <b>${roundName}</b> is ready.<br>Next Opponent: <b>${oppName}</b>. Prepare your team and enter the arena.`
        : `All eight Kanto Gym Badges earned! 15 elite trainers await you in the Kanto Championship.`}
        </div>
        <button id="btn-enter-championship" class="btn-accent" style="width:100%;text-align:center;font-size:14px;font-weight:900">
          ${isStarted ? `RETURN TO TOURNAMENT (${roundName.toUpperCase()}) ➔` : 'ENTER 16-PLAYER CHAMPIONSHIP ➔'}
        </button>
      </div>
    `;
  } else {
    // Champion -> Elite Four
    heroCardHTML = `
      <div class="journey-main-card">
        <div class="journey-card-header">
          <span class="journey-step-badge">KANTO CHAMPION</span>
          <span style="font-size:12px;font-weight:800;color:var(--md-sys-color-accent-blue)">THE ENDGAME</span>
        </div>
        <div class="journey-card-title">THE ELITE FOUR CHAMBERS</div>
        <div class="journey-card-desc">
          Challenge Lorelei, Bruno, Agatha, and Lance in any chosen order! Complete team healing after each victory.
        </div>
        <button id="btn-enter-elitefour" class="btn-primary" style="width:100%;text-align:center;font-size:14px;font-weight:900">
          CHALLENGE THE ELITE FOUR ➔
        </button>
      </div>
    `;
  }

  $('#map').innerHTML = `
    <h1>${cityName.toUpperCase()}</h1>
    <p style="text-align:center">Trainer: <b>${G.trainerName.toUpperCase()}</b> · Party: ${G.team.length}/6</p>
    ${renderBadgesBar(G.badges)}
    ${renderResourcesBar()}

    ${heroCardHTML}

    <div class="quick-actions-bar" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button id="qh-pokedex" class="qpm-btn" style="flex:1;min-width:130px;background:var(--md-sys-color-primary);color:#fff;border-color:var(--md-sys-color-primary-hover);display:flex;align-items:center;justify-content:center;gap:6px" title="Field research guide">
        ${ICONS.pokedex(16)} POKÉDEX
      </button>
      <button id="qh-center" class="qpm-btn" style="flex:1;min-width:130px;background:#be185d;color:#fff;border-color:#9d174d;display:flex;align-items:center;justify-content:center;gap:6px" title="Full Heal team">
        ${ICONS.center(16)} POKÉMON CENTER
      </button>
      <button id="qh-shop" class="qpm-btn" style="flex:1;min-width:130px;background:#0369a1;color:#fff;border-color:#075985;display:flex;align-items:center;justify-content:center;gap:6px" title="Buy supplies">
        ${ICONS.shop(16)} POKÉ MART
      </button>
      <button id="qh-train" class="qpm-btn qpm-train" style="flex:1;min-width:130px;display:flex;align-items:center;justify-content:center;gap:6px" title="Select a Pokémon to train">
        ${ICONS.train(16)} TRAIN (${G.tk || 0}/${G.tmax || 5})${getTrainingXpMultiplier(G) > 1.0 ? ' <span class="boost-badge">2× XP</span>' : ''}
      </button>
    </div>

    <div class="party-list-container">
      ${G.team.map((m, idx) => trow(m, idx)).join('')}
    </div>

    <div class="col" style="margin-top:12px;gap:8px">
      <button id="btn-open-bag" style="display:flex;align-items:center;justify-content:center;gap:6px">${ICONS.bag(16)} BAG & MEDICINES</button>
      <button id="btn-open-team" style="display:flex;align-items:center;justify-content:center;gap:6px">${ICONS.team(16)} TEAM & PC STORAGE (${G.pcBox.length} stored)</button>
    </div>
  `;

  // Attach event handlers
  if ($('#btn-explore-route')) {
    $('#btn-explore-route').onclick = () => enterRouteExploration(G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? G.gymIndex);
  }

  if ($('#btn-gym-battle')) {
    $('#btn-gym-battle').onclick = () => gymBattleScr(G.gymIndex);
  }

  if ($('#btn-continue-journey')) {
    $('#btn-continue-journey').onclick = () => enterRouteExploration(G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? G.gymIndex);
  }

  if ($('#btn-enter-championship')) {
    $('#btn-enter-championship').onclick = () => championshipScr();
  }

  if ($('#btn-enter-elitefour')) {
    $('#btn-enter-elitefour').onclick = () => eliteFourHub();
  }

  const qhPokedex = $('#qh-pokedex');
  if (qhPokedex) {
    qhPokedex.onclick = () => pokedexScr('hub');
  }

  const qhCenter = $('#qh-center');
  if (qhCenter) {
    qhCenter.onclick = async () => {
      await visitPokemonCenter();
      journeyHubScr();
    };
  }

  $('#qh-train').onclick = () => trainScr();
  $('#qh-shop').onclick = () => shopScr();

  $('#btn-open-bag').onclick = async () => {
    const r = await bagUI(G.team, 0);
    if (!r) return;
    HUB = [];
    if (r.i && r.i.length === 2) await stone(G.team[r.j], r.i);
    else await useItem(r, G.team);
    const l = HUB;
    HUB = null;
    save();
    await note(l);
    journeyHubScr();
  };

  $('#btn-open-team').onclick = () => teamScr();

  // Individual Pokémon Row Action Buttons
  document.querySelectorAll<HTMLButtonElement>('.ind-train').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      trainSingleMon(idx);
    };
  });

  document.querySelectorAll<HTMLButtonElement>('.ind-heal').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      healSingleMon(idx);
    };
  });
}

// ============================================================================
// SCREEN 7: MODERN DIGITAL POKÉDEX FIELD RESEARCH DEVICE
// ============================================================================
export function pokedexScr(returnTo: 'route' | 'hub' = 'hub'): void {
  sound.music('menu');
  show('pokedex');
  modernPokedexView.onClose = () => {
    if (returnTo === 'route') {
      enterRouteExploration(G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? G.gymIndex);
    } else {
      journeyHubScr();
    }
  };
  const pokedexEl = $('#pokedex');
  if (pokedexEl) {
    modernPokedexView.render(pokedexEl);
  }
}


// ============================================================================
// SCREEN 8: POKÉ MART (SHOP SYSTEM)
// ============================================================================
export function shopScr(): void {
  sound.music('menu');
  show('map');

  const currentGym = G.gymIndex < 8 ? KANTO_GYMS[G.gymIndex] : null;
  const city = currentGym ? currentGym.city : 'Indigo Plateau';

  $('#map').innerHTML = `
    <h1>POKÉ MART</h1>
    <p style="text-align:center">${city} Branch · Stock up on supplies for your journey!</p>
    ${renderBadgesBar(G.badges)}
    ${renderResourcesBar()}

    <div class="shop-grid">
      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.pokeBall(24)}</span>
          <div>
            <div class="shop-item-title">Poké Ball</div>
            <div class="shop-item-desc">Standard capsule for wild Pokémon (Catch Rate: 1.0×).</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="ball" ${G.money < ECONOMY.shop.pokeball ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.pokeball})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.greatBall(24)}</span>
          <div>
            <div class="shop-item-title">Great Ball</div>
            <div class="shop-item-desc">High-performance capsule with higher success (Catch Rate: 1.5×).</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="greatBall" ${G.money < ECONOMY.shop.greatBall ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.greatBall})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.ultraBall(24)}</span>
          <div>
            <div class="shop-item-title">Ultra Ball</div>
            <div class="shop-item-desc">Ultra-performance capsule with maximum effectiveness (Catch Rate: 2.0×).</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="ultraBall" ${G.money < ECONOMY.shop.ultraBall ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.ultraBall})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.oranBerry(24)}</span>
          <div>
            <div class="shop-item-title">Oran Berry</div>
            <div class="shop-item-desc">Restores +30% of a Pokémon's maximum HP.</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="b" ${G.money < ECONOMY.shop.healthBerry ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.healthBerry})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.sitrusBerry(24)}</span>
          <div>
            <div class="shop-item-title">Sitrus Berry</div>
            <div class="shop-item-desc">Restores +50% of a Pokémon's maximum HP.</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="b50" ${G.money < ECONOMY.shop.sitrusBerry ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.sitrusBerry})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.fullHeal(24)}</span>
          <div>
            <div class="shop-item-title">Full Heal Berry</div>
            <div class="shop-item-desc">Completely restores HP to 100% full capacity.</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="fh" ${G.money < ECONOMY.shop.fullHealBerry ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.fullHealBerry})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.revive(24)}</span>
          <div>
            <div class="shop-item-title">Revive</div>
            <div class="shop-item-desc">Revives a fainted Pokémon with 50% HP.</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="rv" ${G.money < ECONOMY.shop.revive ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.revive})
        </button>
      </div>

      <div class="shop-item-card">
        <div class="shop-item-left">
          <span class="shop-item-icon">${ICONS.thunderStone(24)}</span>
          <div>
            <div class="shop-item-title">Evolution Stone Pack</div>
            <div class="shop-item-desc">Mystery evolution catalyst (Thunder, Fire, Water, Leaf, or Moon).</div>
          </div>
        </div>
        <button class="shop-item-buy" data-item="stone" ${G.money < ECONOMY.shop.evolutionStone ? 'disabled' : ''}>
          BUY (₽${ECONOMY.shop.evolutionStone})
        </button>
      </div>
    </div>

    <div class="col" style="margin-top:14px">
      <button id="shop-back" style="display:flex;align-items:center;justify-content:center;gap:6px">${ICONS.city(16)} RETURN TO CITY</button>
    </div>
  `;

  document.querySelectorAll<HTMLButtonElement>('.shop-item-buy').forEach(btn => {
    btn.onclick = () => {
      const it = btn.dataset.item;
      if (it === 'ball' && G.money >= ECONOMY.shop.pokeball) {
        G.money -= ECONOMY.shop.pokeball;
        G.balls = (G.balls || 0) + 1;
        sound.beep(880, 0.1, 'sine');
      } else if (it === 'greatBall' && G.money >= ECONOMY.shop.greatBall) {
        G.money -= ECONOMY.shop.greatBall;
        G.greatBalls = (G.greatBalls || 0) + 1;
        sound.beep(920, 0.12, 'sine');
      } else if (it === 'ultraBall' && G.money >= ECONOMY.shop.ultraBall) {
        G.money -= ECONOMY.shop.ultraBall;
        G.ultraBalls = (G.ultraBalls || 0) + 1;
        sound.beep(980, 0.14, 'sine');
      } else if (it === 'b' && G.money >= ECONOMY.shop.healthBerry) {
        G.money -= ECONOMY.shop.healthBerry;
        G.b = (G.b || 0) + 1;
        sound.beep(880, 0.1, 'sine');
      } else if (it === 'b50' && G.money >= ECONOMY.shop.sitrusBerry) {
        G.money -= ECONOMY.shop.sitrusBerry;
        G.b50 = (G.b50 || 0) + 1;
        sound.beep(880, 0.1, 'sine');
      } else if (it === 'fh' && G.money >= ECONOMY.shop.fullHealBerry) {
        G.money -= ECONOMY.shop.fullHealBerry;
        G.fh = (G.fh || 0) + 1;
        sound.beep(880, 0.1, 'sine');
      } else if (it === 'rv' && G.money >= ECONOMY.shop.revive) {
        G.money -= ECONOMY.shop.revive;
        G.rv = (G.rv || 0) + 1;
        sound.beep(880, 0.1, 'sine');
      } else if (it === 'stone' && G.money >= ECONOMY.shop.evolutionStone) {
        G.money -= ECONOMY.shop.evolutionStone;
        const stones = ['El', 'Fi', 'Wa', 'Gr', 'Mo'];
        const chosen = stones[Math.floor(Math.random() * stones.length)];
        G.st[chosen] = (G.st[chosen] || 0) + 1;
        sound.beep(980, 0.15, 'sine');
      }
      save();
      shopScr();
    };
  });

  $('#shop-back').onclick = () => {
    if (G.gymIndex >= 8 || G.phase === 'CHAMPIONSHIP_BRACKET' || G.phase === 'ELITE_FOUR_HUB') {
      returnToCurrentHub();
    } else {
      enterRouteExploration(G?.savedRoutePos?.routeId ?? G?.currentRouteId ?? G.gymIndex);
    }
  };
}

// ============================================================================
// SCREEN 9: TEAM & PC BOX STORAGE (RESPONSIVE GRID & BOX PAGINATION)
// ============================================================================
export async function teamScr(activeBoxPage: number = 0): Promise<void> {
  sound.music('menu');
  show('map');

  const BOX_SIZE = 18;
  const totalBoxes = Math.max(1, Math.ceil(G.pcBox.length / BOX_SIZE));
  const safeBoxPage = Math.max(0, Math.min(activeBoxPage, totalBoxes - 1));

  // 1. Render Active Party (Slots 1 to 6)
  const partyCardsHTML = Array.from({ length: MAX_ACTIVE_TEAM }, (_, idx) => {
    const m = G.team[idx];
    if (!m) {
      return `
        <div class="mon-card-empty">
          <span style="display:inline-flex;margin-bottom:4px">${ICONS.plus(22)}</span>
          <span>EMPTY SLOT #${idx + 1}</span>
          <small style="margin-top:4px">Select a PC Pokémon to add</small>
        </div>
      `;
    }

    const spec = POKEMON_SPECIES_MAP[m.id];
    const name = spec ? spec.name : 'Pokémon';
    const maxHp = st(m).max;
    const hpPct = Math.max(0, Math.min(100, Math.round((m.hp / maxHp) * 100)));
    const isLead = idx === 0;
    const isFainted = m.hp <= 0;

    return `
      <div class="mon-card-compact ${isLead ? 'lead' : ''} ${isFainted ? 'fainted' : ''}" data-party-idx="${idx}">
        <span class="mon-card-slot-badge">#${idx + 1}</span>
        ${isLead ? `<span class="mon-card-lead-star" title="Lead Pokémon">${ICONS.star(14)}</span>` : ''}
        <img class="mon-card-img" src="${U(m.id)}" alt="${name}" onerror="fb(this)">
        <div class="mon-card-name" title="${name}">${name}</div>
        <div class="mon-card-lv">Lv. ${m.lv}</div>
        <div class="mon-card-types">${spec.typesShort.map(tb).join('')}</div>
        <div class="mon-card-hp-info">
          <div class="mon-card-hp-text">
            <span>HP</span>
            <span style="color:${isFainted ? '#ef4444' : '#f8fafc'}">${m.hp}/${maxHp}${isFainted ? ' (FAINT)' : ''}</span>
          </div>
          <div class="mon-card-hp-bar">
            <div class="mon-card-hp-fill" style="width:${hpPct}%;background:${isFainted ? '#ef4444' : hpPct > 50 ? '#22c55e' : hpPct > 20 ? '#eab308' : '#ef4444'}"></div>
          </div>
        </div>
        <button class="mon-card-action-btn btn-party-manage" data-idx="${idx}" style="display:flex;align-items:center;justify-content:center;gap:5px">
          ${ICONS.manage(14)} MANAGE
        </button>
      </div>
    `;
  }).join('');

  // 2. Render PC Box Pagination Tabs
  let pcTabsHTML = '';
  if (totalBoxes > 1) {
    pcTabsHTML = `
      <div class="pc-tabs-bar">
        ${Array.from({ length: totalBoxes }, (_, bIdx) => {
      const startNum = bIdx * BOX_SIZE + 1;
      const endNum = Math.min((bIdx + 1) * BOX_SIZE, G.pcBox.length);
      const isActive = bIdx === safeBoxPage;
      return `
            <button class="pc-tab-btn ${isActive ? 'active' : ''}" data-page="${bIdx}">
              BOX ${bIdx + 1} (${startNum}-${endNum})
            </button>
          `;
    }).join('')}
      </div>
    `;
  }

  // 3. Render PC Box Members for safeBoxPage
  const currentBoxMons = G.pcBox.slice(safeBoxPage * BOX_SIZE, (safeBoxPage + 1) * BOX_SIZE);
  let pcGridHTML = '';

  if (G.pcBox.length === 0) {
    pcGridHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #94a3b8; background: #1e293b; border-radius: 12px; border: 1px dashed #334155">
        No Pokémon currently stored in PC Box.<br>
        When your active party of 6 is full, wild Pokémon caught will be safely stored here!
      </div>
    `;
  } else {
    pcGridHTML = currentBoxMons.map((m, relativeIdx) => {
      const globalIdx = safeBoxPage * BOX_SIZE + relativeIdx;
      const spec = POKEMON_SPECIES_MAP[m.id];
      const name = spec ? spec.name : 'Pokémon';
      const maxHp = st(m).max;
      const isFainted = m.hp <= 0;

      return `
        <div class="mon-card-compact ${isFainted ? 'fainted' : ''}" data-pc-idx="${globalIdx}">
          <img class="mon-card-img" src="${U(m.id)}" alt="${name}" onerror="fb(this)">
          <div class="mon-card-name" title="${name}">${name}</div>
          <div class="mon-card-lv">Lv. ${m.lv}</div>
          <div class="mon-card-types">${spec.typesShort.map(tb).join('')}</div>
          <div class="mon-card-hp-info">
            <div class="mon-card-hp-text">
              <span>HP</span>
              <span style="color:${isFainted ? '#ef4444' : '#94a3b8'}">${m.hp}/${maxHp}</span>
            </div>
          </div>
          <button class="mon-card-action-btn btn-pc-withdraw" data-pcidx="${globalIdx}" style="${G.team.length < MAX_ACTIVE_TEAM ? 'background:#16a34a;border-color:#22c55e' : 'background:#2563eb;border-color:#3b82f6'};display:flex;align-items:center;justify-content:center;gap:4px">
            ${G.team.length < MAX_ACTIVE_TEAM ? 'WITHDRAW' : 'SWAP'}
          </button>
        </div>
      `;
    }).join('');
  }

  $('#map').innerHTML = `
    <div class="team-pc-container">
      <h1>TEAM & PC STORAGE</h1>
      <p style="text-align:center">Active Party: <b>${G.team.length} / 6</b> · Stored in PC: <b>${G.pcBox.length}</b></p>
      ${renderBadgesBar(G.badges)}
      ${renderResourcesBar()}

      <!-- ACTIVE PARTY SECTION -->
      <div class="section-title-bar">
        <span class="section-title-text">${ICONS.team(16)} ACTIVE PARTY</span>
        <span class="section-title-count">${G.team.length} / 6 SLOTS</span>
      </div>

      <div class="party-grid">
        ${partyCardsHTML}
      </div>

      <!-- PC BOX STORAGE SECTION -->
      <div class="section-title-bar" style="border-left-color:#38bdf8;margin-top:14px">
        <span class="section-title-text">${ICONS.box(16)} PC BOX STORAGE</span>
        <span class="section-title-count">${G.pcBox.length} TOTAL STORED</span>
      </div>

      ${pcTabsHTML}

      <div class="pc-box-grid">
        ${pcGridHTML}
      </div>

      <div class="col" style="margin-top:16px">
        <button id="btn-team-close" style="width:100%;text-align:center;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:6px">
          ${ICONS.back(16)} RETURN
        </button>
      </div>
    </div>
  `;

  // Attach Event Handlers:

  // Return Button
  $('#btn-team-close').onclick = () => returnToCurrentHub();

  // Tab Switchers
  document.querySelectorAll<HTMLButtonElement>('.pc-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const page = parseInt(btn.dataset.page || '0', 10);
      teamScr(page);
    };
  });

  // Active Party Member Management
  document.querySelectorAll<HTMLButtonElement>('.btn-party-manage').forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      const m = G.team[idx];
      if (!m) return;
      const spec = POKEMON_SPECIES_MAP[m.id];
      const name = spec ? spec.name.toUpperCase() : 'POKÉMON';

      const actions = [
        { h: 'TRAIN INDIVIDUALLY' },
        { h: 'HEAL WITH MEDICINE' },
        ...(idx > 0 ? [{ h: 'SET AS LEAD POKÉMON' }] : []),
        ...(G.team.length > 1 ? [{ h: 'DEPOSIT TO PC BOX' }] : []),
      ];

      const actIdx = await pick(
        `<b>${name} (Lv. ${m.lv})</b><br>HP: ${m.hp}/${st(m).max}<br>Select action:`,
        actions,
        true
      );

      if (actIdx === 0) {
        trainSingleMon(idx);
      } else if (actIdx === 1) {
        healSingleMon(idx);
      } else if (actIdx === 2 && idx > 0) {
        G.team.splice(idx, 1);
        G.team.unshift(m);
        save();
        sound.beep(880, 0.15, 'sine');
        teamScr(safeBoxPage);
      } else if (actIdx === 3 && G.team.length > 1) {
        G.team.splice(idx, 1);
        G.pcBox.push(m);
        save();
        sound.beep(620, 0.15, 'sine');
        teamScr(safeBoxPage);
      }
    };
  });

  // PC Box Member Withdraw / Swap
  document.querySelectorAll<HTMLButtonElement>('.btn-pc-withdraw').forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const pcIdx = parseInt(btn.dataset.pcidx || '0', 10);
      const m = G.pcBox[pcIdx];
      if (!m) return;
      const spec = POKEMON_SPECIES_MAP[m.id];
      const name = spec ? spec.name.toUpperCase() : 'POKÉMON';

      if (G.team.length < MAX_ACTIVE_TEAM) {
        // Withdraw directly
        G.pcBox.splice(pcIdx, 1);
        G.team.push(m);
        save();
        sound.beep(880, 0.2, 'triangle');
        await note([`<b>${name} (Lv. ${m.lv})</b> moved from PC Box into your active party!`]);
        teamScr(safeBoxPage);
      } else {
        // Party is full -> Choose party member to swap
        const swapChoices = G.team.map((tm, tIdx) => ({
          h: `<b>PARTY #${tIdx + 1}:</b> ${mh(tm)}`,
        }));

        const swapIdx = await pick(
          `PARTY IS FULL (6/6)<br>Select a party member to swap with <b>${name} (Lv. ${m.lv})</b>:`,
          swapChoices,
          true,
          'l'
        );

        if (swapIdx >= 0) {
          const outMon = G.team[swapIdx];
          const outName = POKEMON_SPECIES_MAP[outMon.id]?.name.toUpperCase() || 'POKÉMON';
          G.team[swapIdx] = m;
          G.pcBox[pcIdx] = outMon;
          save();
          sound.beep(880, 0.25, 'triangle');
          await note([`Swapped <b>${outName} (Lv. ${outMon.lv})</b> into PC Box and took <b>${name} (Lv. ${m.lv})</b> into your active party!`]);
          teamScr(safeBoxPage);
        }
      }
    };
  });
}

// ============================================================================
// GYM BATTLES & PRESENTATION
// ============================================================================
export async function gymBattleScr(gymIndex: number): Promise<void> {
  const gym = KANTO_GYMS[gymIndex];
  if (!gym) return;

  await note([
    `<h1>${gym.badgeIcon} ${gym.city.toUpperCase()} GYM</h1>`,
    `<b>Leader ${gym.leader} (${gym.title})</b>`,
    `<p style="margin:10px 0;font-style:italic">"${gym.dialogue.intro}"</p>`,
    `<b>Gym Type:</b> ${gym.type} · <b>Reward:</b> ₽${gym.rewardMoney.toLocaleString()} + ${gym.badgeName}`,
  ]);

  await battleGym(gymIndex);
}

export async function battleGym(gymIndex: number): Promise<void> {
  const gym = KANTO_GYMS[gymIndex];
  const slots = Math.min(6, G.team.filter(m => m.hp > 0).length);
  let pl = G.team.filter(m => m.hp > 0);
  let sq: MonInstance[] = [];

  sound.music(gymIndex >= 6 ? 'intense' : 'battle');
  show('bat');
  $('#ctl').innerHTML = '';
  $('#msg').textContent = '';
  $('#fld').className = 'env-' + gym.environment;

  pokemon3DManager.init($('#world'));
  pokemon3DManager.start();

  if (pl.length <= slots) sq = pl;
  else {
    while (sq.length < slots) {
      const i = await pick(`Choose your team (${sq.length + 1}/${slots})`, pl.map(m => ({ h: mh(m) })), false, 'l');
      sq.push(pl.splice(i, 1)[0]);
    }
  }

  const foeSquad = gym.team.map(m => mk(m.id, m.lv));

  B = {
    r: gymIndex,
    tn: `Leader ${gym.leader}`,
    ai: Math.min(3, Math.floor(gymIndex / 2.5) + 1),
    fb: Math.floor(gymIndex / 3),
    foe: foeSquad,
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

  await say(`Leader ${gym.leader} of ${gym.city} wants to battle!`);
  await say(`Leader ${gym.leader} sent out ${POKEMON_SPECIES_MAP[F().id]?.name.toUpperCase()}!`);
  await say(`Go! ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()}!`);

  let res: string | null = null;
  while (!res) {
    res = await turn(await menu());
  }

  pokemon3DManager.stop();

  if (res === 'lose') {
    return showGymDefeat(gymIndex, gym);
  }

  // Victory!
  await gymVictoryScr(gymIndex);
}

export async function gymVictoryScr(gymIndex: number): Promise<void> {
  const gym = KANTO_GYMS[gymIndex];
  sound.music('victory');
  sound.cry(P().id, 'win');

  // Add badge if not yet possessed
  if (!G.badges.includes(gym.badgeName)) {
    G.badges.push(gym.badgeName);
  }

  // Award prize money
  G.money = (G.money || 0) + gym.rewardMoney;

  // Award berries
  G.b = (G.b || 0) + 2;
  G.b50 = (G.b50 || 0) + 1;
  G.rv = (G.rv || 0) + 1;

  // Refill training
  G.tk = 5;
  G.tmax = 5;

  let progressionNotice = '';
  if (gymIndex < 7) {
    G.gymIndex++;
    G.interactionsDone = 0;
    G.phase = 'POST_GYM_INTERACTION';
    const nextGym = KANTO_GYMS[G.gymIndex];
    progressionNotice = `The route toward ${nextGym.city} is now open!<br>5 journey interactions await you before challenging ${nextGym.leader}!`;
  } else {
    // 8th Gym defeated!
    G.gymIndex = 8;
    G.phase = 'CHAMPIONSHIP_BRACKET';
    progressionNotice = `<b>ALL 8 KANTO BADGES OBTAINED!</b><br>You have proven yourself worthy of entering the Kanto Championship Tournament at the Indigo Plateau!`;
  }

  save();

  await note([
    `<h1>GYM LEADER DEFEATED!</h1>`,
    `<p style="font-style:italic">"${gym.dialogue.defeat}"</p>`,
    `<b>Congratulations, ${G.trainerName.toUpperCase()}!</b>`,
    `<br>You received:`,
    `<div style="font-size:20px;font-weight:900;color:#facc15;margin:8px 0">${gym.badgeIcon} ${gym.badgeName.toUpperCase()}</div>`,
    `Money earned: <b>+₽${gym.rewardMoney.toLocaleString()}</b> (Total: ₽${G.money.toLocaleString()})`,
    `Items earned: +2 Oran Berries, +1 Sitrus Berry, +1 Revive`,
    `<br>${progressionNotice}`,
  ]);

  journeyHubScr();
}

// ============================================================================
// WILD POKÉMON BATTLE (Standard Full Battle Engine Integration)
// ============================================================================
export async function battleWild(
  wildMon: EncounterMon,
  returnCoords?: { routeId: number; x: number; y: number }
): Promise<void> {
  const pl = G.team.filter(m => m.hp > 0);
  if (!pl.length) {
    await note(['All your Pokémon have fainted! Visit the Pokémon Center to heal.']);
    if (returnCoords) enterRouteExploration(returnCoords.routeId, returnCoords.x, returnCoords.y);
    else journeyHubScr();
    return;
  }

  sound.music('battle');
  show('bat');
  $('#ctl').innerHTML = '';
  $('#msg').textContent = '';
  $('#fld').className = 'env-grass';

  pokemon3DManager.init($('#world'));
  pokemon3DManager.start();

  const sq = [...pl];
  const foeSquad = [mk(wildMon.id, wildMon.lv)];

  B = {
    isWild: true,
    wildMon,
    returnCoords,
    r: returnCoords ? returnCoords.routeId : (G.gymIndex || 0),
    tn: 'Wild ' + wildMon.name,
    ai: 0,
    fb: 0,
    foe: foeSquad,
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
    part: new Set<number>([0]),
  };
  B.fi = 0;
  B.pi = 0;
  ['p', 'f'].forEach(s => ($('#' + s + 's').dataset.k = ''));
  ui();

  await say(`A wild ${wildMon.name.toUpperCase()} appeared!`);
  await say(`Go! ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()}!`);

  let res: string | null = null;
  while (!res) {
    res = await turn(await menu());
  }

  pokemon3DManager.stop();

  if (res === 'lose') {
    return showWildDefeat(wildMon, returnCoords);
  }

  if (res === 'win') {
    const rewardMoney = Math.floor(wildMon.lv * 35 + ri(35, 75));
    G.money = (G.money || 0) + rewardMoney;
    save();

    const ballsVal = $('#hud-balls-val');
    const moneyVal = $('#hud-money-val');
    if (ballsVal) ballsVal.textContent = String(G.balls || 0);
    if (moneyVal) moneyVal.textContent = (G.money || 0).toLocaleString();

    sound.beep(880, 0.15, 'sine');
    await note([
      `<h1>WILD BATTLE VICTORY!</h1>`,
      `Defeated wild <b>${wildMon.name.toUpperCase()}</b>!`,
      `Earned <b>+₽${rewardMoney.toLocaleString()}</b> in prize money! (Total: ₽${(G.money || 0).toLocaleString()})`,
      `Your team gained valuable battle experience.`,
    ]);
  }

  // Count wild battles
  G.routeEncountersDone = (G.routeEncountersDone || 0) + 1;
  G.wildBattlesCount = (G.wildBattlesCount || 0) + 1;
  save();

  // Every 5 wild battles grant 5 fresh training sessions!
  if (G.wildBattlesCount % 5 === 0) {
    G.tk = (G.tk || 0) + 5;
    G.tmax = Math.max(G.tmax || 5, G.tk);
    save();
    sound.beep(659, 0.15, 'sine');
    sound.beep(880, 0.25, 'sine', 0.1, 0.12);
    await note([
      `<h1>BATTLE TRAINING REWARD</h1>`,
      `You have completed <b>5 wild Pokémon battles</b>!`,
      `<b>+5 fresh training sessions have been granted!</b>`,
      `<p style="font-size:15px;color:#16a34a;font-weight:800;margin-top:8px">Total Training Sessions Available: ${G.tk}</p>`,
      `Use your training sessions in the City Hub or Menu to power up your team!`,
    ]);
  }

  // Preserve exact route position upon returning
  if (returnCoords) {
    enterRouteExploration(returnCoords.routeId, returnCoords.x, returnCoords.y);
  } else {
    journeyHubScr();
  }
}

// ============================================================================
// SCREEN 10: 16-PLAYER KANTO CHAMPIONSHIP
// ============================================================================
export const championshipBracketHTML = (state: Championship16State): string => {
  const { trainers, activeIds, history, currentRoundIndex } = state;
  const ROUNDS = ['ROUND OF 16', 'QUARTER FINALS', 'SEMI FINALS', 'THE FINAL', 'CHAMPION'];

  let html = '<div class="bk16-wrapper"><div class="bk16">';
  for (let round = 0; round < 5; round++) {
    const numMatches = round === 4 ? 1 : 8 >> round;
    html += `<div class="bk16-col"><div class="bk16-header">${ROUNDS[round]}</div><div class="bk16-body">`;
    for (let m = 0; m < numMatches; m++) {
      if (round === 4) {
        // Champion slot
        const winnerId = history[3] ? history[3][0]?.winnerId : -1;
        const name = winnerId >= 0 ? trainers[winnerId].name : 'CHAMPION';
        html += `<div class="bk16-slot ${winnerId === 0 ? 'me' : 'winner'}" style="text-align:center;padding:12px 8px"><b>${name}</b></div>`;
      } else {
        const match = history[round] ? history[round][m] : null;
        let tAId: number;
        let tBId: number;
        if (round === 0) {
          tAId = m * 2;
          tBId = m * 2 + 1;
        } else if (match) {
          tAId = match.trainerAId;
          tBId = match.trainerBId;
        } else {
          tAId = -1;
          tBId = -1;
        }

        const renderSlot = (id: number) => {
          if (id < 0) return '<div class="bk16-slot elim">???</div>';
          const t = trainers[id];
          const isPlayer = id === 0;
          const isOpp = round === currentRoundIndex && id === activeIds[1];
          const isElim = match && match.winnerId !== id;
          const isWinner = match && match.winnerId === id;
          const cls = isPlayer ? 'me' : isOpp ? 'opp' : isWinner ? 'winner' : isElim ? 'elim' : '';
          return `<div class="bk16-slot ${cls}"><b>${t.avatar} ${t.name}</b><br><small>${t.style || ''}</small></div>`;
        };

        html += `<div class="bk16-match" style="margin-bottom:6px">${renderSlot(tAId)}${renderSlot(tBId)}</div>`;
      }
    }
    html += '</div></div>';
  }
  html += '</div></div>';
  return html;
};

export function championshipScr(): void {
  sound.music('menu');
  show('map');

  G.phase = 'CHAMPIONSHIP_BRACKET';
  save();

  if (!G.tournament) {
    G.tournament = createChampionship16(G.trainerName);
    G.tournamentRound = 0;
  }

  const roundIdx = G.tournament.currentRoundIndex;
  const oppId = G.tournament.activeIds[1];
  const opp = G.tournament.trainers[oppId] || CHAMPIONSHIP_OPPONENTS[0];
  const roundName = ROUND_NAMES_16[roundIdx] || 'THE FINAL';

  $('#map').innerHTML = `
    <h1>KANTO CHAMPIONSHIP</h1>
    <p style="text-align:center">16 Elite Trainers · ${roundName}</p>
    ${renderBadgesBar(G.badges)}
    ${renderResourcesBar()}

    <!-- Next Opponent Card -->
    <div class="journey-main-card" style="border-color:#facc15">
      <div class="journey-card-header">
        <span class="journey-step-badge" style="background:#eab308;color:#0f172a">${roundName} MATCH</span>
        <span style="font-size:12px;font-weight:800;color:#facc15">${G.tournament.activeIds.length} TRAINERS REMAIN</span>
      </div>
      <div class="journey-card-title">${ICONS.star(18)} ${opp.name} (${opp.title})</div>
      <div class="journey-card-desc">
        Style: <b>${opp.style}</b> · Team: <b>${opp.team.length} Pokémon</b><br>
        "${opp.dialogue?.intro || "I've come too far to lose now!"}"
      </div>
      <button id="btn-champ-fight" style="width:100%;text-align:center;background:linear-gradient(180deg,#eab308,#ca8a04);color:#0f172a;border-color:#a16207;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px">
        ${ICONS.swords(18)} START BATTLE VS ${opp.name.toUpperCase()}
      </button>
    </div>

    <!-- Preparation Bar: ALL BUTTONS IMMEDIATELY VISIBLE -->
    <div class="champ-prep-actions">
      <div class="champ-prep-grid">
        <button id="btn-champ-train" class="champ-prep-btn" title="Train a Pokémon with 2x boosted XP">
          ${ICONS.train(16)} TRAIN (${G.tk || 0}/${G.tmax || 5})<span class="boost-badge">2× XP</span>
        </button>
        <button id="btn-champ-bag" class="champ-prep-btn" title="Open bag to use berries, stones, or revives">
          ${ICONS.bag(16)} BAG / MEDICINE
        </button>
        <button id="btn-champ-team" class="champ-prep-btn" title="Manage party and PC box Pokémon">
          ${ICONS.team(16)} TEAM & PC BOX
        </button>
        <button id="btn-champ-bracket" class="champ-prep-btn" title="Scroll down to view tournament bracket">
          ${ICONS.bracket(16)} VIEW BRACKET
        </button>
        <button id="btn-champ-city" class="champ-prep-btn" style="grid-column: 1 / -1; background: linear-gradient(180deg,#0284c7,#0369a1); border-color: #075985; color: #fff" title="Take a break in the city to heal, shop, or manage team">
          ${ICONS.city(16)} RETURN TO CITY (Pokémon Center / Poké Mart)
        </button>
      </div>
    </div>

    <!-- Active Party Preview Table -->
    <div class="section-title-bar" style="margin-top:12px">
      <span class="section-title-text">${ICONS.swords(16)} ACTIVE BATTLE SQUAD</span>
      <span class="section-title-count">${G.team.length}/6 READY</span>
    </div>
    <table>
      ${G.team.map((m, idx) => trow(m, idx)).join('')}
    </table>

    <!-- Bracket Section -->
    <div id="champ-bracket-section" style="margin-top:16px">
      <div class="section-title-bar" style="border-left-color:#facc15">
        <span class="section-title-text">${ICONS.bracket(16)} 16-PLAYER TOURNAMENT BRACKET</span>
        <span class="section-title-count">${roundName}</span>
      </div>
      ${championshipBracketHTML(G.tournament)}
    </div>
  `;

  // Start Battle
  $('#btn-champ-fight').onclick = () => battleChampionship(roundIdx);

  // Train (with 2x XP)
  $('#btn-champ-train').onclick = () => trainScr();

  // Bag & Medicine
  $('#btn-champ-bag').onclick = async () => {
    const r = await bagUI(G.team, 0);
    if (!r) return championshipScr();
    HUB = [];
    if (r.i && r.i.length === 2) await stone(G.team[r.j], r.i);
    else await useItem(r, G.team);
    const l = HUB;
    HUB = null;
    save();
    if (l && l.length) await note(l);
    championshipScr();
  };

  // Team & PC Box
  $('#btn-champ-team').onclick = () => teamScr();

  // View Bracket (smooth scroll)
  $('#btn-champ-bracket').onclick = () => {
    const sec = document.getElementById('champ-bracket-section');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
  };

  // Return to City
  $('#btn-champ-city').onclick = () => {
    G.phase = 'JOURNEY_HUB';
    save();
    journeyHubScr();
  };

  // Individual Pokémon Row Action Buttons
  document.querySelectorAll<HTMLButtonElement>('.ind-train').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      trainSingleMon(idx);
    };
  });

  document.querySelectorAll<HTMLButtonElement>('.ind-heal').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      healSingleMon(idx);
    };
  });
}

export async function battleChampionship(roundIndex: number): Promise<void> {
  const roundName = ROUND_NAMES_16[roundIndex] || 'THE FINAL';
  const oppId = G.tournament!.activeIds[1];
  const opp = G.tournament!.trainers[oppId];

  const slots = Math.min(6, G.team.filter(m => m.hp > 0).length);
  let pl = G.team.filter(m => m.hp > 0);
  let sq: MonInstance[] = [];

  sound.music(roundIndex === 3 ? 'final' : roundIndex === 2 ? 'semi' : 'battle');
  show('bat');
  $('#ctl').innerHTML = '';
  $('#msg').textContent = '';
  $('#fld').className = 'final';

  pokemon3DManager.init($('#world'));
  pokemon3DManager.start();

  if (pl.length <= slots) sq = pl;
  else {
    while (sq.length < slots) {
      const i = await pick(`Choose your team (${sq.length + 1}/${slots})`, pl.map(m => ({ h: mh(m) })), false, 'l');
      sq.push(pl.splice(i, 1)[0]);
    }
  }

  const foeSquad = opp.team.map(m => mk(m.id, m.lv));

  B = {
    r: roundIndex,
    tn: opp.name,
    ai: 3,
    fb: 2,
    foe: foeSquad,
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

  await say(`${opp.name} (${opp.title}) wants to battle!`);
  await say(`${opp.name} sent out ${POKEMON_SPECIES_MAP[F().id]?.name.toUpperCase()}!`);
  await say(`Go! ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()}!`);

  let res: string | null = null;
  while (!res) {
    res = await turn(await menu());
  }

  pokemon3DManager.stop();

  if (res === 'lose') {
    return showDefeat(false, `Kanto Championship (${roundName} vs ${opp.name})`);
  }

  // Won Match!
  sound.music('victory');
  sound.cry(P().id, 'win');

  if (roundIndex < 3) {
    // Advance bracket and simulate others
    const simResult = simulateChampionshipRound16(G.tournament!);

    // Refill training
    G.tk = 5;
    G.tmax = 5;
    G.b = (G.b || 0) + 2;
    G.fh = (G.fh || 0) + 1;
    G.rv = (G.rv || 0) + 1;

    // Draft 1 Pokémon reward
    const draftCandidates = [
      mk(ri(1, 140), Math.max(48, Math.min(55, pl[0]?.lv || 50))),
      mk(ri(1, 140), Math.max(48, Math.min(55, pl[0]?.lv || 50))),
      mk(ri(1, 140), Math.max(48, Math.min(55, pl[0]?.lv || 50))),
    ];

    const pickIdx = await pick(
      `<h1>VICTORY! ${roundName}</h1>You advanced!<br>Choose 1 recruit to bolster your team:`,
      draftCandidates.map(m => ({
        h: `${img(m.id)}<span><b>${POKEMON_SPECIES_MAP[m.id]?.name}</b> Lv.${m.lv}<br><small>${POKEMON_SPECIES_MAP[m.id]?.typesShort.map(tb).join('')}</small></span>`,
      }))
    );

    const recruited = draftCandidates[pickIdx];
    if (G.team.length < MAX_ACTIVE_TEAM) G.team.push(recruited);
    else G.pcBox.push(recruited);

    save();

    await note([
      `<h1>MATCH RESULTS</h1>`,
      ...simResult.roundMatches
        .filter(m => m.a.id !== 0 && m.b.id !== 0)
        .map(m => `<b>${m.winner.name}</b> defeated ${m.winner.id === m.a.id ? m.b.name : m.a.name} and advanced!`),
    ]);

    championshipScr();
  } else {
    // FINAL WON -> CHAMPION!
    G.tournament!.history.push([{ trainerAId: 0, trainerBId: oppId, winnerId: 0, resolved: true }]);
    G.money = (G.money || 0) + ECONOMY.tournamentReward;
    G.phase = 'ELITE_FOUR_HUB';
    save();

    confetti();

    // Save record to championship history
    try {
      const records = JSON.parse(localStorage.getItem('kantoChampionshipRecords') || '[]');
      records.unshift({
        trainerName: G.trainerName,
        date: new Date().toLocaleDateString(),
        finalOpponent: opp.name,
        playerTeam: G.team.map(m => POKEMON_SPECIES_MAP[m.id]?.name || 'Mon'),
      });
      localStorage.setItem('kantoChampionshipRecords', JSON.stringify(records));
      localStorage.setItem(
        'kantoChampion',
        JSON.stringify({
          trainerName: G.trainerName,
          date: new Date().toLocaleDateString(),
          finalOpponent: opp.name,
          playerTeam: G.team.map(m => POKEMON_SPECIES_MAP[m.id]?.name || 'Mon'),
        })
      );
    } catch { }

    await note([
      `<h1>KANTO CHAMPION!</h1>`,
      `<b>Congratulations, ${G.trainerName.toUpperCase()}!</b>`,
      `You defeated ${opp.name} and conquered the Kanto Championship Tournament!`,
      `Championship Prize: <b>+₽${ECONOMY.tournamentReward.toLocaleString()}</b>`,
      `<br><b>THE ULTIMATE CHALLENGE AWAITS:</b>`,
      `The legendary Elite Four have acknowledged your title. Challenge Lorelei, Bruno, Agatha, and Lance!`,
    ]);

    eliteFourHub();
  }
}

// ============================================================================
// SCREEN 11: POST-CHAMPIONSHIP ELITE FOUR SYSTEM
// ============================================================================
export interface EliteFourMember {
  id: string;
  name: string;
  avatar: string;
  title: string;
  type: string;
  badgeClass: string;
  intro: string;
  team: { id: number; lv: number }[];
}

export const ELITE_FOUR_MEMBERS: Record<string, EliteFourMember> = {
  lorelei: {
    id: 'lorelei',
    name: 'Lorelei',
    avatar: 'L',
    title: 'Elite Four Master of Ice & Water',
    type: 'ICE / WATER',
    badgeClass: 'e4-type-ice',
    intro: 'Welcome to the Pokémon League! No one can withstand my freezing ice combinations. Show me what you’ve got!',
    team: [
      { id: 87, lv: 54 },  // Dewgong
      { id: 91, lv: 53 },  // Cloyster
      { id: 80, lv: 54 },  // Slowbro
      { id: 124, lv: 56 }, // Jynx
      { id: 131, lv: 56 }, // Lapras
    ],
  },
  bruno: {
    id: 'bruno',
    name: 'Bruno',
    avatar: 'B',
    title: 'Elite Four Master of Fighting & Rock',
    type: 'FIGHTING / ROCK',
    badgeClass: 'e4-type-fighting',
    intro: 'We have trained day and night! My Pokémon will crush you with pure disciplined power. Prepare yourself!',
    team: [
      { id: 95, lv: 53 },  // Onix
      { id: 107, lv: 55 }, // Hitmonchan
      { id: 106, lv: 55 }, // Hitmonlee
      { id: 95, lv: 56 },  // Onix
      { id: 68, lv: 58 },  // Machamp
    ],
  },
  agatha: {
    id: 'agatha',
    name: 'Agatha',
    avatar: 'A',
    title: 'Elite Four Master of Ghost & Poison',
    type: 'GHOST / POISON',
    badgeClass: 'e4-type-ghost',
    intro: 'I hear Oak gave you your Pokédex! He was once tough and handsome, but now he just studies! Let me show you how a real trainer fights!',
    team: [
      { id: 94, lv: 56 },  // Gengar
      { id: 42, lv: 56 },  // Golbat
      { id: 93, lv: 55 },  // Haunter
      { id: 24, lv: 58 },  // Arbok
      { id: 94, lv: 60 },  // Gengar
    ],
  },
  lance: {
    id: 'lance',
    name: 'Lance',
    avatar: 'L',
    title: 'Elite Four Dragon Master',
    type: 'DRAGON / FLYING',
    badgeClass: 'e4-type-dragon',
    intro: 'I am Lance, dragon master! You likely know that dragons are mythical Pokémon! They are hard to catch and raise, but their powers are superior! Prepare to face the apex!',
    team: [
      { id: 130, lv: 58 }, // Gyarados
      { id: 148, lv: 56 }, // Dragonair
      { id: 148, lv: 56 }, // Dragonair
      { id: 142, lv: 60 }, // Aerodactyl
      { id: 149, lv: 62 }, // Dragonite
    ],
  },
};

export async function directLevelUp(m: MonInstance): Promise<void> {
  const name = POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase() || 'POKÉMON';
  const oldMax = st(m).max;
  m.lv++;
  m.exp = 0;
  const newMax = st(m).max;
  m.hp += Math.max(1, newMax - oldMax);
  ui();
  sound.beep(880, 0.35, 'triangle', 0.2);
  await say(`POWER-UP ACTIVATED!<br><b>${name}</b> gained a direct level-up to <b>Level ${m.lv}</b>!`, 300);
  await evo(m);
  await learn(m);
  save();
}

export async function eliteFourPowerUpModal(): Promise<void> {
  if (!G.eliteFour) G.eliteFour = { defeated: [], activeMember: null, powerUpsRemaining: 3 };
  G.eliteFour.powerUpsRemaining = G.eliteFour.powerUpsRemaining ?? 3;

  const remaining = G.eliteFour.powerUpsRemaining;

  const choices = G.team.map((m) => {
    const spec = POKEMON_SPECIES_MAP[m.id];
    const name = spec ? spec.name : 'Pokémon';
    return {
      d: remaining <= 0,
      h: `<b>${name}</b> (Lv.${m.lv} ➔ Lv.${m.lv + 1}) · HP ${m.hp}/${st(m).max}<br><small>${spec?.typesShort.map(tb).join('') || ''}</small>`,
    };
  });

  const pickIdx = await pick(
    `<b>ELITE FOUR POWER-UP BLESSING</b><br>
     Remaining Level-Ups: <b>${remaining} / 3</b><br>
     Select a Pokémon to bestow an immediate +1 level:`,
    choices,
    true,
    'l'
  );

  if (pickIdx >= 0 && remaining > 0) {
    G.eliteFour.powerUpsRemaining--;
    const chosenMon = G.team[pickIdx];
    await directLevelUp(chosenMon);
    if ((G.eliteFour.powerUpsRemaining || 0) > 0) {
      eliteFourPowerUpModal();
    } else {
      await note([
        `<b>ALL ELITE FOUR POWER-UPS USED!</b>`,
        `All 3 preparation level-ups have been applied to your team.`,
        `Your squad is fully primed for the Elite Four battles!`,
      ]);
      eliteFourHub();
    }
  } else {
    eliteFourHub();
  }
}

export async function eliteFourHub(): Promise<void> {
  sound.music('menu');
  show('map');

  G.phase = 'ELITE_FOUR_HUB';
  if (!G.eliteFour) {
    G.eliteFour = { defeated: [], activeMember: null, powerUpsRemaining: 3 };
  }
  G.eliteFour.powerUpsRemaining = G.eliteFour.powerUpsRemaining ?? 3;
  save();

  const defCount = G.eliteFour.defeated.length;
  if (defCount >= 4) {
    return hallOfFameScr();
  }

  const memberKeys = ['lorelei', 'bruno', 'agatha', 'lance'];

  $('#map').innerHTML = `
    <h1>THE ELITE FOUR</h1>
    <p style="text-align:center">Indigo Plateau · Defeated: <b>${defCount} / 4 Members</b></p>
    ${renderBadgesBar(G.badges)}
    ${renderResourcesBar()}

    <!-- Elite Four 3x Level-Up Power-Up Banner -->
    <div class="e4-powerup-banner">
      <div>
        <div style="font-weight:900;font-size:15px;color:#facc15;display:flex;align-items:center;gap:6px">${ICONS.lightning(18)} ELITE FOUR POWER-UP BLESSING</div>
        <div style="font-size:12.5px;color:#cbd5e1;margin-top:2px">
          Champion Preparation: <b>${G.eliteFour.powerUpsRemaining || 0} of 3 Uses Remaining</b> (+1 Level Each)
        </div>
      </div>
      <button id="btn-e4-powerup" class="powerup-btn" ${(G.eliteFour.powerUpsRemaining || 0) <= 0 ? 'disabled' : ''}>
        ${(G.eliteFour.powerUpsRemaining || 0) > 0 ? `USE POWER-UP (${G.eliteFour.powerUpsRemaining} LEFT)` : 'ALL 3 USED'}
      </button>
    </div>

    <!-- Quick Actions Bar for Elite Four Preparation -->
    <div class="champ-prep-actions" style="margin-bottom:12px">
      <div class="champ-prep-grid">
        <button id="btn-e4-bag" class="champ-prep-btn" title="Open bag to use berries, revives, or stones">
          ${ICONS.bag(16)} BAG / MEDICINE
        </button>
        <button id="btn-e4-team" class="champ-prep-btn" title="Manage active party and PC storage">
          ${ICONS.team(16)} TEAM & PC BOX
        </button>
        <button id="btn-e4-shop" class="champ-prep-btn" title="Visit Indigo Plateau Poké Mart branch">
          ${ICONS.shop(16)} POKÉ MART
        </button>
        <button id="btn-e4-heal" class="champ-prep-btn" title="Heal party Pokémon with berries">
          ${ICONS.heal(16)} HEAL POKÉMON
        </button>
      </div>
    </div>

    <div class="e4-grid">
      ${memberKeys
      .map(k => {
        const m = ELITE_FOUR_MEMBERS[k];
        const isDef = G.eliteFour!.defeated.includes(k);
        return `
            <div class="e4-card ${isDef ? 'defeated' : ''}" data-key="${k}">
              <div class="e4-avatar">${m.name.slice(0, 1)}</div>
              <div class="e4-name">${m.name}</div>
              <div class="e4-type-badge ${m.badgeClass}">${m.type}</div>
              <div class="e4-status-badge ${isDef ? 'e4-status-done' : 'e4-status-available'}">
                ${isDef ? 'DEFEATED' : 'CHALLENGE'}
              </div>
            </div>
          `;
      })
      .join('')}
    </div>

    <div class="section-title-bar" style="margin-top:14px">
      <span class="section-title-text">${ICONS.swords(16)} ACTIVE BATTLE SQUAD</span>
      <span class="section-title-count">${G.team.length}/6 READY</span>
    </div>
    <table>
      ${G.team.map((m, idx) => trow(m, idx)).join('')}
    </table>

    <div class="col" style="margin-top:14px;gap:8px">
      <button id="btn-e4-hub-return" style="display:flex;align-items:center;justify-content:center;gap:6px">${ICONS.city(16)} RETURN TO CITY</button>
    </div>
  `;

  // Power Up Modal
  const powerUpBtn = $('#btn-e4-powerup') as HTMLButtonElement;
  if (powerUpBtn) {
    powerUpBtn.onclick = () => {
      if ((G.eliteFour?.powerUpsRemaining || 0) > 0) {
        eliteFourPowerUpModal();
      }
    };
  }

  // Quick prep controls
  $('#btn-e4-bag').onclick = async () => {
    const r = await bagUI(G.team, 0);
    if (!r) return eliteFourHub();
    HUB = [];
    if (r.i && r.i.length === 2) await stone(G.team[r.j], r.i);
    else await useItem(r, G.team);
    const l = HUB;
    HUB = null;
    save();
    if (l && l.length) await note(l);
    eliteFourHub();
  };

  $('#btn-e4-team').onclick = () => teamScr();
  $('#btn-e4-shop').onclick = () => shopScr();
  $('#btn-e4-heal').onclick = () => healScr();

  document.querySelectorAll<HTMLElement>('.e4-card').forEach(card => {
    card.onclick = async () => {
      const key = card.dataset.key;
      if (!key || G.eliteFour!.defeated.includes(key)) return;

      const member = ELITE_FOUR_MEMBERS[key];
      await note([
        `<h1>${member.avatar} ${member.name}</h1>`,
        `<b>${member.title}</b>`,
        `<p style="margin-top:8px;font-style:italic">"${member.intro}"</p>`,
      ]);

      await battleEliteFour(key);
    };
  });

  // Individual Pokémon Row Action Buttons
  document.querySelectorAll<HTMLButtonElement>('.ind-train').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      trainSingleMon(idx);
    };
  });

  document.querySelectorAll<HTMLButtonElement>('.ind-heal').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx || '0', 10);
      healSingleMon(idx);
    };
  });

  $('#btn-e4-hub-return').onclick = () => {
    G.phase = 'JOURNEY_HUB';
    save();
    journeyHubScr();
  };
}

export async function battleEliteFour(memberId: string): Promise<void> {
  const member = ELITE_FOUR_MEMBERS[memberId];
  if (!member) return;

  const slots = Math.min(6, G.team.filter(m => m.hp > 0).length);
  let pl = G.team.filter(m => m.hp > 0);
  let sq: MonInstance[] = [];

  sound.music('eliteFour');
  show('bat');
  $('#ctl').innerHTML = '';
  $('#msg').textContent = '';
  $('#fld').className = 'final ' + member.id;

  pokemon3DManager.init($('#world'));
  pokemon3DManager.start();

  if (pl.length <= slots) sq = pl;
  else {
    while (sq.length < slots) {
      const i = await pick(`Choose your team (${sq.length + 1}/${slots})`, pl.map(m => ({ h: mh(m) })), false, 'l');
      sq.push(pl.splice(i, 1)[0]);
    }
  }

  const foeSquad = member.team.map(m => mk(m.id, m.lv));

  B = {
    r: 6,
    tn: member.name,
    ai: 3,
    fb: 2,
    foe: foeSquad,
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

  await say(`${member.name} (${member.title}) wants to battle!`);
  await say(`${member.name} sent out ${POKEMON_SPECIES_MAP[F().id]?.name.toUpperCase()}!`);
  await say(`Go! ${POKEMON_SPECIES_MAP[P().id]?.name.toUpperCase()}!`);

  let res: string | null = null;
  while (!res) {
    res = await turn(await menu());
  }

  pokemon3DManager.stop();

  if (res === 'lose') {
    sound.music('menu');
    sound.beep(160, 0.4, 'sawtooth');

    // Fully restore team HP (Nurse Joy Indigo Plateau treatment)
    G.team.forEach(m => {
      m.hp = st(m).max;
    });
    save();

    const defCount = G.eliteFour?.defeated?.length || 0;
    await note([
      `<h1>DEFEATED BY ${member.name.toUpperCase()}</h1>`,
      `<b>${member.title}</b>`,
      `<p style="margin:8px 0;font-style:italic">"Train harder and challenge me again when you are truly prepared!"</p>`,
      `Your team whited out and rushed to the <b>Indigo Plateau Pokémon Center</b>.<br>Nurse Joy has fully restored all your Pokémon to 100% full health!`,
      `<br><b>PROGRESSION CHECKPOINT SAVED:</b>`,
      `<b>${defCount} of 4</b> Elite Four Members remain completed!`,
      ...(defCount > 0 ? [`Defeated: <b>${G.eliteFour!.defeated.map(k => ELITE_FOUR_MEMBERS[k]?.name || k).join(', ')}</b>`] : []),
      `<br>You can challenge <b>${member.name}</b> again immediately or prepare your team!`,
    ]);

    return eliteFourHub();
  }

  // Defeated Elite Four Member!
  if (!G.eliteFour) G.eliteFour = { defeated: [], activeMember: null };
  if (!G.eliteFour.defeated.includes(memberId)) {
    G.eliteFour.defeated.push(memberId);
  }

  // STRICT FULL HEAL REQUIREMENT
  G.team.forEach(m => {
    m.hp = st(m).max;
  });

  save();

  sound.music('victory');
  sound.cry(P().id, 'win');

  const healRows = G.team
    .map(
      m => `
      <div class="heal-mon-row">
        <div class="heal-mon-info">
          ${img(m.id)}
          <div>
            <div class="heal-mon-name">${POKEMON_SPECIES_MAP[m.id]?.name}</div>
            <div class="heal-mon-lv">Lv.${m.lv}</div>
          </div>
        </div>
        <span class="heal-hp-badge">100% FULL HP</span>
      </div>
    `
    )
    .join('');

  await note([
    `<h1>${member.name.toUpperCase()} DEFEATED!</h1>`,
    `<b>Member ${G.eliteFour.defeated.length} of 4 vanquished!</b>`,
    `<div class="heal-screen">
      <div class="heal-header-icon">${ICONS.heal(36)}</div>
      <div class="heal-title">TEAM FULLY RESTORED</div>
      <div class="heal-desc">All HP restored. All fainted Pokémon revived to full strength.</div>
      <div class="heal-team-list">${healRows}</div>
    </div>`,
  ]);

  if (G.eliteFour.defeated.length >= 4) {
    hallOfFameScr();
  } else {
    eliteFourHub();
  }
}

// ============================================================================
// SCREEN 12: GRAND HALL OF FAME CEREMONY
// ============================================================================
export async function hallOfFameScr(): Promise<void> {
  sound.music('victory');
  confetti();
  show('map');

  const dateStr = new Date().toLocaleDateString();
  const starter = POKEMON_SPECIES_MAP[G.starterId]?.name || 'Starter';

  try {
    const record = {
      trainerName: G.trainerName,
      date: dateStr,
      starter,
      order: G.eliteFour?.defeated || [],
      orderDisplay: (G.eliteFour?.defeated || []).map(k => ELITE_FOUR_MEMBERS[k]?.name || k).join(' ➔ '),
      playerTeam: G.team.map(m => `${POKEMON_SPECIES_MAP[m.id]?.name} (Lv.${m.lv})`),
    };
    localStorage.setItem('kantoEliteFourRecord', JSON.stringify(record));
  } catch { }

  $('#map').innerHTML = `
    <div class="hof-container">
      <div class="hof-trophy">${ICONS.crown(44)}</div>
      <div class="hof-header">HALL OF FAME</div>
      <div class="hof-trainer-title">GRAND CHAMPION: <b>${G.trainerName.toUpperCase()}</b></div>
      <p style="font-size:12.5px;color:#cbd5e1;line-height:1.5;max-width:440px;margin:0 auto 12px">
        Having conquered all eight Kanto Gyms, emerged victorious from the 16-Player Championship, and vanquished the Elite Four, your name is permanently inscribed in the Pokémon League Hall of Fame!
      </p>

      ${renderBadgesBar(G.badges)}

      <div class="hof-team-grid">
        ${G.team
      .map(
        m => `
          <div class="hof-mon-card">
            <img src="${U(m.id)}" alt="${POKEMON_SPECIES_MAP[m.id]?.name}" onerror="fb(this)">
            <div class="hof-mon-name">${POKEMON_SPECIES_MAP[m.id]?.name}</div>
            <div class="hof-mon-lv">Lv.${m.lv} · HP ${st(m).max}</div>
          </div>
        `
      )
      .join('')}
      </div>

      <div class="col" style="margin-top:18px">
        <button id="btn-hof-finish" style="text-align:center">RETURN TO MAIN MENU</button>
      </div>
    </div>
  `;

  $('#btn-hof-finish').onclick = () => titleScr();
}

// ============================================================================
// GYM & WILD DEFEAT HANDLERS (CONTINUE FROM CURRENT GYM / ROUTE)
// ============================================================================
export async function showGymDefeat(gymIndex: number, gym: GymLeaderDefinition): Promise<void> {
  pokemon3DManager.stop();
  sound.music('menu');
  sound.beep(160, 0.4, 'sawtooth');

  // Fully restore all Pokémon on the team (Nurse Joy Pokémon Center treatment)
  G.team.forEach(m => {
    m.hp = st(m).max;
  });

  // Small loss fee: 10% of cash or max 250 (classic Pokémon white-out fee)
  const lossFee = Math.min(250, Math.floor(G.money * 0.1));
  G.money = Math.max(0, G.money - lossFee);

  // Grant 3 fresh training sessions so the player can train to defeat the leader
  G.tk = Math.max(G.tk || 0, 3);
  save();

  const choice = await pick(
    `<div class="defeat-screen gym-recovery">
      <div class="defeat-badge" style="font-size:36px;margin-bottom:6px">${gym.badgeIcon}</div>
      <div class="defeat-title" style="color:#ef4444;font-size:22px;font-weight:900">DEFEATED AT ${gym.city.toUpperCase()} GYM</div>
      <div class="defeat-dialogue" style="font-style:italic;color:#64748b;margin:10px 0;background:#f8fafc;padding:8px 12px;border-radius:10px;border-left:3px solid #ef4444">
        "${gym.dialogue.defeat}"<br><small style="font-weight:700;color:#0f172a">— Leader ${gym.leader}</small>
      </div>
      <div class="defeat-subtitle" style="font-size:13px;line-height:1.45;color:#1e293b">
        You whited out and rushed to the <b>${gym.city} Pokémon Center</b>.<br>
        Nurse Joy has fully restored all your Pokémon to full health!<br>
        <span style="color:#16a34a;font-weight:800">+3 Training sessions granted to power up your team!</span>
        ${lossFee > 0 ? `<br><small style="color:#ef4444">Dropped ₽${lossFee.toLocaleString()} in prize money to the Gym.</small>` : ''}
      </div>
    </div>`,
    [
      { h: '<b>RETRY GYM BATTLE</b>' },
      { h: '<b>EXPLORE ROUTE & TRAIN</b>' },
      { h: '<b>VISIT POKÉ MART</b>' },
      { h: '<b>TEAM MANAGEMENT & HUB</b>' },
    ],
    false,
    'defeat-actions'
  );

  if (choice === 0) {
    await gymBattleScr(gymIndex);
  } else if (choice === 1) {
    enterRouteExploration(gymIndex);
  } else if (choice === 2) {
    shopScr();
  } else {
    journeyHubScr();
  }
}

export async function showWildDefeat(wildMon: EncounterMon, returnCoords?: { routeId: number; x: number; y: number }): Promise<void> {
  pokemon3DManager.stop();
  sound.music('menu');
  sound.beep(160, 0.3, 'sawtooth');

  // Fully restore team
  G.team.forEach(m => {
    m.hp = st(m).max;
  });
  save();

  await note([
    `<h1>WILD BATTLE DEFEAT</h1>`,
    `All your Pokémon fainted against wild <b>${wildMon.name.toUpperCase()}</b>!`,
    `You scurried back to safety and rested your team.`,
    `<b>All your Pokémon have been fully healed and restored!</b>`,
  ]);

  const routeId = returnCoords ? returnCoords.routeId : G.gymIndex;
  enterRouteExploration(routeId);
}

// ============================================================================
// SCREEN 13: TOURNAMENT & ELITE FOUR DEFEAT (PROGRESSION & CHECKPOINTS PRESERVED)
// ============================================================================
export async function showDefeat(isEliteFour: boolean = false, foeName: string = ''): Promise<void> {
  pokemon3DManager.stop();

  // Restore team HP so the player can recover and prepare
  G.team.forEach(m => {
    m.hp = st(m).max;
  });
  save();

  sound.music('menu');
  sound.beep(140, 0.6, 'sawtooth');

  const titleText = isEliteFour ? 'ELITE FOUR DEFEAT' : 'TOURNAMENT MATCH DEFEAT';
  const subText = isEliteFour
    ? `Defeated by Elite Four member: <b>${foeName || 'Opponent'}</b>`
    : `Defeated by Championship opponent: <b>${foeName || 'Tournament Opponent'}</b>`;

  const choice = await pick(
    `<div class="defeat-screen">
      <div class="defeat-skull">${ICONS.skull(36)}</div>
      <div class="defeat-title">${titleText}</div>
      <div class="defeat-subtitle">All your Pokémon fainted in battle!</div>
      <div class="defeat-stats">
        ${subText}<br>
        Your team was rushed to the Pokémon Center and fully restored to 100% health.<br>
        <b>Your tournament progression and completed matches are preserved!</b>
      </div>
    </div>`,
    [
      { h: '<b>RETRY MATCH</b>' },
      { h: 'RETURN TO CITY / PREPARATION' },
      { h: 'MAIN MENU' },
    ],
    false,
    'defeat-actions'
  );

  if (choice === 0) {
    if (isEliteFour && G.eliteFour?.activeMember) {
      await battleEliteFour(G.eliteFour.activeMember);
    } else if (G.tournament) {
      await battleChampionship(G.tournament.currentRoundIndex);
    } else {
      returnToCurrentHub();
    }
  } else if (choice === 1) {
    returnToCurrentHub();
  } else {
    titleScr();
  }
}

// ============================================================================
// TRAINING & HEALING SUBSYSTEM
// ============================================================================
export const trow = (m: MonInstance, idx?: number) => {
  const maxHp = st(m).max;
  const isFull = m.hp >= maxHp;
  const isFainted = m.hp <= 0;
  const hasSessions = (G.tk || 0) > 0;
  const idxAttr = idx !== undefined ? `data-idx="${idx}"` : '';
  const spec = POKEMON_SPECIES_MAP[m.id];
  const hpPct = Math.min(100, Math.max(0, (m.hp / maxHp) * 100));
  const hpColorClass = hpPct > 50 ? 'hp-high' : hpPct > 20 ? 'hp-mid' : 'hp-low';
  const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`;

  return `
    <div class="party-member-card ${isFainted ? 'fainted' : ''}">
      <div class="party-art">
        <img src="${artwork}" alt="${spec?.name || 'Mon'}" onerror="fb(this)">
      </div>
      <div class="party-info">
        <div class="party-name-row">
          <span class="party-name">${spec?.name || 'Pokémon'}</span>
          <span class="party-lv">Lv. ${m.lv}</span>
        </div>
        <div class="party-hp-meter">
          <div class="party-hp-track">
            <div class="party-hp-bar ${hpColorClass}" style="width: ${hpPct}%"></div>
          </div>
          <span class="party-hp-text">${m.hp}/${maxHp} HP</span>
        </div>
      </div>
      ${idx !== undefined
      ? `<div class="party-actions">
             <button class="party-mini-btn ind-train" ${idxAttr} ${!hasSessions ? 'disabled' : ''} title="Train Pokémon">Train</button>
             <button class="party-mini-btn ind-heal" ${idxAttr} ${isFull ? 'disabled' : ''} title="Heal Pokémon">Heal</button>
           </div>`
      : ''
    }
    </div>
  `;
};

export async function trainSingleMon(idx: number): Promise<void> {
  if ((G.tk || 0) < 1) {
    await note(['No training sessions remaining for this stage!']);
    return;
  }
  const m = G.team[idx];
  if (!m) return;
  const spec = POKEMON_SPECIES_MAP[m.id];
  const n = spec ? spec.name.toUpperCase() : 'POKÉMON';

  G.tk = (G.tk || 1) - 1;
  const baseExp = 30 + G.gymIndex * 15;
  const mult = getTrainingXpMultiplier(G);
  const e = Math.round(baseExp * (1.1 + R() * 0.3) * mult);
  const h = Math.min(st(m).max - m.hp, Math.ceil(st(m).max * 0.15));
  m.hp += h;
  m.exp += e;

  const notes = ['TRAINING COMPLETE!', `${n} gained +${e} EXP!`];
  if (mult > 1.0) {
    notes.push('<b>Championship Training Bonus</b>: 2× XP Boost applied!');
  }
  HUB = notes;
  await lvls(m);
  if (h > 0) HUB.push(`${n} recovered +${h} HP (${m.hp}/${st(m).max} HP).`);
  sound.beep(880, 0.35, 'triangle', 0.15);
  const l = HUB;
  HUB = null;
  save();
  await note(l);
  returnToCurrentHub();
}

export async function healSingleMon(idx: number): Promise<void> {
  const m = G.team[idx];
  if (!m) return;
  const spec = POKEMON_SPECIES_MAP[m.id];
  const n = spec ? spec.name.toUpperCase() : 'POKÉMON';
  const maxHp = st(m).max;

  if (m.hp >= maxHp) {
    await note([`${n} is already at full HP (${maxHp}/${maxHp})!`]);
    return;
  }

  const items: { k: string; label: string; count: number; desc: string; apply: () => void }[] = [];

  if (m.hp <= 0 && (G.rv || 0) > 0) {
    items.push({
      k: 'r',
      label: `Revive (×${G.rv})`,
      count: G.rv || 0,
      desc: 'Revives fainted Pokémon to 50% HP',
      apply: () => {
        G.rv = Math.max(0, (G.rv || 1) - 1);
        m.hp = Math.ceil(maxHp * 0.5);
      },
    });
  }

  if ((G.b || 0) > 0 && m.hp > 0) {
    items.push({
      k: 'b',
      label: `Oran Berry (×${G.b})`,
      count: G.b || 0,
      desc: `Restores +30% HP (+${Math.ceil(maxHp * 0.3)} HP)`,
      apply: () => {
        G.b = Math.max(0, (G.b || 1) - 1);
        m.hp = Math.min(maxHp, m.hp + Math.ceil(maxHp * 0.3));
      },
    });
  }

  if ((G.b50 || 0) > 0 && m.hp > 0) {
    items.push({
      k: 'b50',
      label: `Sitrus Berry (×${G.b50})`,
      count: G.b50 || 0,
      desc: `Restores +50% HP (+${Math.ceil(maxHp * 0.5)} HP)`,
      apply: () => {
        G.b50 = Math.max(0, (G.b50 || 1) - 1);
        m.hp = Math.min(maxHp, m.hp + Math.ceil(maxHp * 0.5));
      },
    });
  }

  if ((G.fh || 0) > 0) {
    items.push({
      k: 'fh',
      label: `Full Heal Berry (×${G.fh})`,
      count: G.fh || 0,
      desc: 'Completely restores HP to 100% full',
      apply: () => {
        G.fh = Math.max(0, (G.fh || 1) - 1);
        m.hp = maxHp;
      },
    });
  }

  if (items.length === 0) {
    if (m.hp <= 0) {
      await note([`${n} has fainted!`, 'You need a Revive to restore a fainted Pokémon.']);
      return;
    }
    await note(['No healing berries remaining in your bag!', 'Purchase berries at the Poké Mart.']);
    return;
  }

  const choice = await pick(
    `HEAL ${n}<br>Current HP: ${m.hp}/${maxHp}<br>Choose healing item:`,
    items.map(it => ({
      h: `<b>${it.label}</b><br><small>${it.desc}</small>`,
    })),
    true,
    'l'
  );

  if (choice < 0) return;

  const itemUsed = items[choice];
  itemUsed.apply();

  sound.beep(659, 0.15, 'sine');
  sound.beep(880, 0.25, 'sine', 0.1, 0.12);
  save();

  await note([
    `HEAL COMPLETE!`,
    `Used ${itemUsed.label.split('(')[0].trim()} on ${n}.`,
    `${n} HP: <b>${m.hp}/${maxHp}</b>`,
  ]);
  returnToCurrentHub();
}

export async function healScr(): Promise<void> {
  const i = await pick(
    'SELECT POKÉMON TO HEAL',
    G.team.map(m => {
      const maxHp = st(m).max;
      const isFainted = m.hp <= 0;
      const isFull = m.hp >= maxHp;
      return {
        d: isFull,
        h: `${mh(m)}<small>${isFainted
          ? '<b style="color:#ef4444">FAINTED</b>'
          : isFull
            ? '<span style="color:#22c55e">FULL HP</span>'
            : `${m.hp}/${maxHp} HP`
          }</small>`,
      };
    }),
    true,
    'l'
  );
  if (i < 0) return returnToCurrentHub();
  await healSingleMon(i);
}

export async function trainScr(): Promise<void> {
  const mult = getTrainingXpMultiplier(G);
  const i = await pick(
    `TRAINING SESSIONS ${mult > 1.0 ? '<span class="boost-badge">2× XP BOOST</span>' : ''}<br><b>${G.tk || 0} / ${G.tmax || 5} Available</b><br>Select a Pokémon to train (${mult > 1.0 ? '+2× EXP' : '+EXP'}, +15% HP):`,
    G.team.map(m => ({
      d: (G.tk || 0) < 1,
      h: `${mh(m)}<small>EXP ${m.exp}/${need(m)}</small>`,
    })),
    true,
    'l'
  );
  if (i < 0) return returnToCurrentHub();
  await trainSingleMon(i);
}

// ============================================================================
// LEVELING, EVOLUTION & MOVE LEARNING
// ============================================================================
export async function evo(m: MonInstance): Promise<void> {
  // Branching Evolution for Eevee (ID 133) at Level 15
  if (m.id === 133 && m.lv >= 15) {
    const choice = await pick(
      `<h1>EEVEE IS EVOLVING!</h1>Choose Eevee's evolution form:`,
      [
        { h: `${img(134)}<span><b>VAPOREON</b><small>Water Type</small></span>` },
        { h: `${img(135)}<span><b>JOLTEON</b><small>Electric Type</small></span>` },
        { h: `${img(136)}<span><b>FLAREON</b><small>Fire Type</small></span>` },
      ]
    );
    const evoId = choice === 0 ? 134 : choice === 1 ? 135 : 136;
    m.id = evoId;
    m.hp = st(m).max;
    ui();
    sound.beep(880, 0.3);
    await say(`Eevee evolved into ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()}!`);
    return;
  }

  const d = POKEMON_SPECIES_MAP[m.id];
  if (!(d.evolutionLevel && m.lv >= d.evolutionLevel && d.evolvesTo)) return;

  await say(`${d.name.toUpperCase()} is evolving!`, 300);
  if (!HUB && B && B.tm && B.tm[B.pi] === m) {
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
  m.hp = st(m).max;
  ui();
  sound.beep(880, 0.3);
  await say(`It evolved into ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()}!`);
}

export function showMoveLearnComparisonModal(m: MonInstance, newMove: MoveData): Promise<number> {
  return new Promise(res => {
    const o = $('#ov');
    const spec = POKEMON_SPECIES_MAP[m.id];
    const monName = spec ? spec.name.toUpperCase() : 'POKÉMON';
    const newPwr = formatMovePower(newMove.power, newMove.category);
    const newAcc = newMove.accuracy ? `${newMove.accuracy}%` : '—';
    const catClass =
      newMove.category === 'Physical'
        ? 'category-physical'
        : newMove.category === 'Special'
          ? 'category-special'
          : 'category-status';

    const currentMovesHTML = m.moves
      .map((mvName, idx) => {
        const cMove = getMoveData(mvName);
        const cPwr = formatMovePower(cMove.power, cMove.category);
        const cAcc = cMove.accuracy ? `${cMove.accuracy}%` : '—';
        const cCatClass =
          cMove.category === 'Physical'
            ? 'category-physical'
            : cMove.category === 'Special'
              ? 'category-special'
              : 'category-status';

        return `
        <div class="move-compare-card">
          <div class="move-compare-top">
            <span class="move-compare-name">${idx + 1}. ${cMove.name.toUpperCase()}</span>
            <span class="t ${cMove.typeShort}">${cMove.type.toUpperCase()}</span>
          </div>
          <div class="move-compare-stats">
            <span class="move-stat-badge ${cCatClass}">${cMove.category.toUpperCase()}</span>
            <span class="move-stat-badge">PWR: <b>${cPwr}</b></span>
            <span class="move-stat-badge">ACC: <b>${cAcc}</b></span>
          </div>
          <button class="btn-replace-move" data-replace-idx="${idx}">
            REPLACE WITH ${newMove.name.toUpperCase()} ➔
          </button>
        </div>
      `;
      })
      .join('');

    o.innerHTML = `
      <div class="move-learn-box">
        <div class="move-learn-header">
          <div class="move-learn-title">NEW MOVE LEARNED!</div>
          <div class="move-learn-subtitle"><b>${monName} (Lv. ${m.lv})</b> wants to learn a new technique!</div>
        </div>

        <!-- NEW MOVE BANNER -->
        <div class="new-move-banner">
          <div class="new-move-top">
            <span class="new-move-name">${newMove.name.toUpperCase()}</span>
            <span class="t ${newMove.typeShort}">${newMove.type.toUpperCase()}</span>
          </div>
          <div class="move-compare-stats">
            <span class="move-stat-badge ${catClass}">${newMove.category.toUpperCase()}</span>
            <span class="move-stat-badge highlight">PWR: <b>${newPwr}</b></span>
            <span class="move-stat-badge">ACC: <b>${newAcc}</b></span>
          </div>
          <div class="new-move-desc">${newMove.description || ''}</div>
        </div>

        <div class="move-replace-prompt">
          ${monName} already knows 4 moves.<br>Choose a move to replace:
        </div>

        <div class="current-moves-grid">
          ${currentMovesHTML}
        </div>

        <button class="btn-cancel-learn" id="btn-cancel-move-learn">
          DO NOT LEARN (Keep Current 4 Moves)
        </button>
      </div>
    `;

    o.style.display = 'flex';

    o.onclick = e => {
      const target = e.target as HTMLElement;
      const replaceBtn = target.closest<HTMLButtonElement>('.btn-replace-move');
      if (replaceBtn && replaceBtn.dataset.replaceIdx !== undefined) {
        const replaceIdx = parseInt(replaceBtn.dataset.replaceIdx, 10);
        o.style.display = 'none';
        res(replaceIdx);
        return;
      }

      const cancelBtn = target.closest<HTMLButtonElement>('#btn-cancel-move-learn');
      if (cancelBtn) {
        o.style.display = 'none';
        res(-1);
        return;
      }
    };
  });
}

export async function learn(m: MonInstance): Promise<void> {
  for (const mv of pool(m).filter(x => x.unlockLevel === m.lv && !m.moves.includes(x.name))) {
    const n = POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase() || 'POKÉMON';
    const moveData = getMoveData(mv.name);

    if (m.moves.length < 4) {
      m.moves.push(mv.name);
      sound.beep(880, 0.25, 'triangle');
      await say(`${n} learned ${mv.name.toUpperCase()}!`);
    } else {
      const replaceIdx = await showMoveLearnComparisonModal(m, moveData);
      if (replaceIdx >= 0 && replaceIdx < m.moves.length) {
        const old = m.moves[replaceIdx];
        m.moves[replaceIdx] = mv.name;
        sound.beep(880, 0.3, 'sine');
        await say(`${n} forgot ${old.toUpperCase()} and learned ${mv.name.toUpperCase()}!`);
      } else {
        await say(`${n} did not learn ${mv.name.toUpperCase()}.`);
      }
    }
  }
}

export async function lvls(m: MonInstance): Promise<void> {
  while (m.exp >= need(m) && m.lv < 65) {
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

export async function stone(m: MonInstance, k: string): Promise<void> {
  const e = (STONE_EVOLUTIONS[m.id] || []).find(x => x.stoneType === k);
  if (!e) return;
  const o = POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase();
  G.st[k]--;
  await say(`${o} is evolving!`, 200);
  m.id = e.evolvesTo;
  m.hp = st(m).max;
  await say(`It evolved into ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()}!`);
}

// ============================================================================
// BATTLE ENGINE CORE (1 PLAYER ACTION = 1 OPPONENT ACTION)
// ============================================================================
export const P = (): MonInstance => B.tm[B.pi];
export const F = (): MonInstance => B.foe[B.fi];
export const M = (s: 'p' | 'f'): MonInstance => (s === 'p' ? P() : F());
export const NM = (s: 'p' | 'f'): string => (s === 'f' ? 'Foe ' : '') + POKEMON_SPECIES_MAP[M(s).id]?.name.toUpperCase();

export const spr = (im: HTMLImageElement, id: number, _back?: boolean) => {
  const spec = POKEMON_SPECIES_MAP[id];
  (im.parentNode as HTMLElement).dataset.t = spec.typesShort.includes('Fl') ? 'f' : spec.baseHP <= 45 ? 's' : 'n';
  im.getAnimations().forEach(a => a.cancel());
  im.alt = spec.name;
  im.onerror = () => fb(im);
  im.src = U(id);
};

export async function say(t: string, p: number = 550): Promise<void> {
  if (HUB) {
    HUB.push(t);
    return;
  }
  const b = $('#msg');
  if (!b) return;
  b.textContent = '';
  for (const c of t) {
    b.textContent += c;
    await sleep(14);
  }
  await sleep(p);
}

export function ui(): void {
  if (HUB || !B) return;
  for (const s of ['p', 'f'] as const) {
    const m = M(s);
    if (!m) continue;
    const x = st(m);
    const pc = (m.hp / x.max) * 100;
    const b = $('#' + s + 'b');
    $('#' + s + 'n').textContent = POKEMON_SPECIES_MAP[m.id]?.name;
    $('#' + s + 'l').textContent = 'Lv' + m.lv;
    if (b) {
      b.style.width = pc + '%';
      b.className = pc <= 20 ? 'lo' : pc <= 50 ? 'md' : '';
    }
    $('#' + s + 'h').textContent = `HP: ${m.hp} / ${x.max}`;
    $('#' + s + 't').innerHTML = POKEMON_SPECIES_MAP[m.id]?.typesShort.map(tb).join('');
    const im = $('#' + s + 's') as HTMLImageElement;
    if (im) {
      const k = s + m.uid + m.id;
      if (im.dataset.k !== k) {
        im.dataset.k = k;
        spr(im, m.id, s === 'p');
      }
      if (pokemon3DManager.is3DActive(s)) {
        im.style.opacity = '0';
      }
    }
  }

  if (B && B.tm && B.foe) {
    if (B.tm[B.pi]) pokemon3DManager.setPokemon('p', P().id);
    if (B.foe[B.fi]) pokemon3DManager.setPokemon('f', F().id);

    for (const [s, l] of [
      ['p', B.tm],
      ['f', B.foe],
    ] as const) {
      const el = $('#' + s + 'd');
      if (el) {
        el.innerHTML =
          l
            .map(
              (x: MonInstance) =>
                `<i class="${x.hp <= 0 ? 'x' : 'a'}${x.uid === (s === 'p' ? B.pu : B.fu) ? ' on' : ''}"></i>`
            )
            .join('') + `<b>${l.filter((x: MonInstance) => x.hp > 0).length} / ${l.length}</b>`;
      }
    }
  }
}

export async function hit(s: 'p' | 'f', dm: number, k: number = 1): Promise<void> {
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

  if (pokemon3DManager.is3DActive(s)) {
    if (e) e.style.opacity = '0';
    await sleep(450);
    return;
  }

  if (e) {
    await e.animate(
      [
        { transform: 'translateX(0)', filter: 'brightness(3)' },
        { transform: 'translateX(-10px)', opacity: '0.3' },
        { transform: 'translateX(10px)', opacity: '1' },
        { transform: 'none', filter: 'none' },
      ],
      { duration: 450 }
    ).finished;
  }
}

export const faint = async (s: 'p' | 'f') => {
  sound.beep(200, 0.5, 'triangle');
  sound.cry(M(s).id, 'faint');
  const anim3d = pokemon3DManager.playFaintAnimation(s);
  const e = $('#' + s + 's');
  const h = $('#' + s + 'sh');

  if (pokemon3DManager.is3DActive(s)) {
    if (e) e.style.opacity = '0';
    if (h) {
      h.style.transition = 'opacity .7s';
      h.style.opacity = '0';
    }
    await anim3d;
    return;
  }

  if (e) {
    await e.animate(
      [
        { transform: 'none' },
        { transform: 'translateX(-6%) rotate(-4deg)' },
        { transform: 'translateX(6%) rotate(4deg)' },
        { transform: 'translateX(-4%)' },
      ],
      { duration: 500 }
    ).finished;
  }
  if (h) {
    h.style.transition = 'opacity .7s';
    h.style.opacity = '0';
  }
  if (e) {
    await e.animate(
      [
        { transform: 'translateY(0) scale(1)', opacity: '1' },
        { transform: 'translateY(30%) scale(.9)', opacity: '0.8', offset: 0.5 },
        { transform: 'translateY(55%) scale(.55)', opacity: '0' },
      ],
      { duration: 800, easing: 'ease-in', fill: 'forwards' }
    ).finished;
  }
  await anim3d;
};

export const recall = async (s: 'p' | 'f') => {
  const anim3d = pokemon3DManager.playRecallAnimation(s);
  const c = ctr($('#' + s + 'w'));
  fly(
    el('ball', { left: c.x + 'px', top: c.y + 'px' }),
    [
      { transform: 'translate(-50%,-50%) scale(0)' },
      { transform: 'translate(-50%,-50%) scale(1.3)' },
      { transform: 'translate(-50%,-50%) scale(1)' },
    ],
    { duration: 450, delay: 150, fill: 'backwards' }
  );

  if (pokemon3DManager.is3DActive(s)) {
    $('#' + s + 's').style.opacity = '0';
    await anim3d;
    return;
  }

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

  if (pokemon3DManager.is3DActive(s)) {
    $('#' + s + 's').style.opacity = '0';
    await anim3d;
    return;
  }

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
  const cr = R() < 0.0625;
  const attack3d = pokemon3DManager.playAttackAction(s, mv.name, ph);

  await playMoveEffect(
    s,
    mv.name,
    mv.typeShort,
    mv.power,
    e,
    (st, m, kind, i, k, crit) => sound.sfxA(st, m, kind, i, k, crit),
    (side, mood) => sound.cry(M(side).id, mood),
    cr
  );
  await attack3d;

  const A = st(a)[ph ? 'atk' : 'spa'];
  const Df = st(d)[ph ? 'def' : 'spd'];

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

export function aiMove(): any {
  const f = F();
  const p = P();
  const ms = f.moves.map(n => getMoveData(n)).filter(Boolean);
  if (!ms.length) ms.push(getMoveData('Tackle'));
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

export async function berry(m: MonInstance, who: 'p' | 'f', pct: number = 0.3, bname: string = 'Health Berry'): Promise<void> {
  const x = st(m);
  const h = Math.min(x.max - m.hp, Math.ceil(x.max * pct));
  m.hp += h;
  ui();
  await say(
    who === 'p'
      ? `You used a ${bname.toUpperCase()}! ${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()} restored ${h} HP!`
      : `${B.tn} used a ${bname.toUpperCase()}!`
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

export const ITEMS: Record<string, { ic: string; n: string; d: string; pct: number; t: (m: MonInstance) => boolean; k: keyof GameSaveState }> = {
  ball: { ic: ICONS.pokeBall(18), n: 'Poké Ball', d: 'Catch Rate: Standard (1.0×)', pct: 0, t: () => !!(B && B.isWild), k: 'balls' },
  greatBall: { ic: ICONS.greatBall(18), n: 'Great Ball', d: 'Catch Rate: Better (1.5×)', pct: 0, t: () => !!(B && B.isWild), k: 'greatBalls' },
  ultraBall: { ic: ICONS.ultraBall(18), n: 'Ultra Ball', d: 'Catch Rate: Best (2.0×)', pct: 0, t: () => !!(B && B.isWild), k: 'ultraBalls' },
  b: { ic: ICONS.oranBerry(18), n: 'Oran Berry (30%)', d: 'Restores 30% of max HP.', pct: 0.3, t: m => m.hp > 0 && m.hp < st(m).max, k: 'b' },
  s: { ic: ICONS.sitrusBerry(18), n: 'Sitrus Berry (50%)', d: 'Restores 50% of max HP.', pct: 0.5, t: m => m.hp > 0 && m.hp < st(m).max, k: 'b50' },
  h: { ic: ICONS.oranBerry(18), n: 'Enigma Berry (75%)', d: 'Restores 75% of max HP.', pct: 0.75, t: m => m.hp > 0 && m.hp < st(m).max, k: 'b75' },
  f: { ic: ICONS.fullHeal(18), n: 'Full Heal Berry (100%)', d: 'Restores 100% of max HP.', pct: 1.0, t: m => m.hp > 0 && m.hp < st(m).max, k: 'fh' },
  r: { ic: ICONS.revive(18), n: 'Revive', d: 'Revives a fainted Pokémon with 50% HP.', pct: 0.5, t: m => m.hp <= 0, k: 'rv' },
};

export const STN: Record<string, [string, string]> = {
  El: [ICONS.thunderStone(18), 'Thunder Stone'],
  Fi: [ICONS.fireStone(18), 'Fire Stone'],
  Wa: [ICONS.waterStone(18), 'Water Stone'],
  Gr: [ICONS.leafStone(18), 'Leaf Stone'],
  Mo: [ICONS.moonStone(18), 'Moon Stone'],
};

export const qty = (k: string) => {
  if (k === 'ball') return (G.balls as number) || 0;
  if (k === 'greatBall') return (G.greatBalls as number) || 0;
  if (k === 'ultraBall') return (G.ultraBalls as number) || 0;
  if (ITEMS[k]) return (G[ITEMS[k].k] as number) || 0;
  return G.st[k] || 0;
};

export const elig = (k: string, m: MonInstance) => {
  if (k === 'ball' || k === 'greatBall' || k === 'ultraBall') return !!(B && B.isWild);
  if (ITEMS[k]) return ITEMS[k].t(m);
  return (STONE_EVOLUTIONS[m.id] || []).some(e => e.stoneType === k);
};

export async function bagUI(tm: MonInstance[], bt?: number): Promise<any> {
  for (; ;) {
    const it = (Object.keys(ITEMS) as (keyof typeof ITEMS)[])
      .filter(key => {
        if (key === 'ball' || key === 'greatBall' || key === 'ultraBall') return !!(B && B.isWild);
        return true;
      })
      .map(key => ({
        ...ITEMS[key],
        k: key,
        c: ((G[ITEMS[key].k] as number) || 0),
      }));
    const st = Object.keys(STN).map(k => ({
      k,
      ic: STN[k][0],
      n: STN[k][1],
      d: 'Evolves specific Pokémon.',
      c: G.st[k] || 0,
      pct: 0,
    }));
    const all = [...it, ...st].filter(x => x.c > 0);

    if (!all.length) {
      await note(['Your Bag is empty!', 'Purchase items from the Poké Mart.']);
      return null;
    }

    const i = await pick(
      'BAG',
      all.map(x => ({
        h: `<div style="display:flex;align-items:center;gap:10px">${x.ic}<span><b>${x.n}</b> ×${x.c}<br><small>${x.d}</small></span></div>`,
      })),
      true
    );
    if (i < 0) return null;

    const chosen = all[i];
    if (chosen.k === 'ball' || chosen.k === 'greatBall' || chosen.k === 'ultraBall') {
      return { k: chosen.k };
    }

    const j = await pick(
      `Use ${chosen.n} on:`,
      tm.map(m => ({ d: !elig(chosen.k, m), h: mh(m) })),
      true,
      'l'
    );
    if (j >= 0) return { k: 'i', i: chosen.k, j };
  }
}

export async function useItem(x: any, tm: MonInstance[]): Promise<void> {
  const t = tm[x.j];
  if (x.i === 'r') {
    G.rv--;
    t.hp = Math.ceil(st(t).max * 0.5);
    ui();
    await say(`You used a REVIVE! ${POKEMON_SPECIES_MAP[t.id]?.name.toUpperCase()} was revived!`);
  } else if (x.i === 'f') {
    G.fh--;
    t.hp = st(t).max;
    ui();
    await say(`You used a FULL HEAL BERRY! ${POKEMON_SPECIES_MAP[t.id]?.name.toUpperCase()} was fully healed!`);
  } else if (x.i === 'h') {
    G.b75--;
    await berry(t, 'p', 0.75, 'Enigma Berry (75%)');
  } else if (x.i === 's') {
    G.b50--;
    await berry(t, 'p', 0.50, 'Sitrus Berry (50%)');
  } else if (x.i === 'b') {
    G.b--;
    await berry(t, 'p', 0.30, 'Oran Berry (30%)');
  }
}

export async function resolve(): Promise<string | null> {
  if (F().hp <= 0) {
    const L = F().lv;
    await faint('f');
    await say(`${NM('f')} fainted!`);
    B.gain += L * 12;
    for (const i of B.part) {
      const m = B.tm[i];
      if (m && m.hp > 0) {
        m.exp += L * 12;
        await say(`${POKEMON_SPECIES_MAP[m.id]?.name.toUpperCase()} gained ${L * 12} EXP! (${m.exp}/${need(m)})`, 250);
        await lvls(m);
      }
    }
    const al = B.foe.map((m: MonInstance, i: number) => i).filter((i: number) => B.foe[i].hp > 0);
    if (!al.length) {
      if (B.isWild) {
        G.routeEncountersDone = (G.routeEncountersDone || 0) + 1;
        save();
      }
      return 'win';
    }
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

  const oppAction = aiAct();

  // 1. RUN ACTION CHECK (Only valid in wild battles)
  if (pa.k === 'run') {
    if (B && B.isWild) {
      const pSpe = st(P()).spe;
      const fSpe = st(F()).spe;
      const runSuccess = pSpe >= fSpe || Math.random() < 0.75;
      if (runSuccess) {
        sound.beep(550, 0.2, 'sine');
        await say('You got away safely!', 500);
        G.routeEncountersDone = (G.routeEncountersDone || 0) + 1;
        save();
        S.phase = 'BATTLE_OVER';
        return 'run';
      } else {
        sound.beep(220, 0.2, 'sawtooth');
        await say("Couldn't escape!", 500);
        S.phase = 'OPPONENT_TURN';
        await act('f', oppAction);
        const r = await resolve();
        if (r) {
          S.phase = 'BATTLE_OVER';
          return r;
        }
        S.phase = 'PLAYER_TURN';
        return null;
      }
    }
  }

  // 2. POKÉ BALL / GREAT BALL / ULTRA BALL THROW & CAPTURE SEQUENCE
  if (pa.k === 'ball' || pa.k === 'greatBall' || pa.k === 'ultraBall') {
    if (B && B.isWild) {
      const ballKey = pa.k as 'ball' | 'greatBall' | 'ultraBall';
      const ballCfg = BALL_CONFIG[ballKey];
      if (ballKey === 'ball') G.balls = Math.max(0, (G.balls || 1) - 1);
      else if (ballKey === 'greatBall') G.greatBalls = Math.max(0, (G.greatBalls || 1) - 1);
      else if (ballKey === 'ultraBall') G.ultraBalls = Math.max(0, (G.ultraBalls || 1) - 1);
      save();
      await say(`${G.trainerName.toUpperCase()} threw a ${ballCfg.name.toUpperCase()}!`, 200);

      // Poké Ball flight animation across battlefield
      const pw = $('#pw');
      const fw = $('#fw');
      const pRect = pw ? ctr(pw) : { x: 250, y: 750 };
      const fRect = fw ? ctr(fw) : { x: 730, y: 520 };

      // Create high-detail realistic SVG Ball projectile
      const ballContainer = document.createElement('div');
      ballContainer.className = 'pokeball-projectile';
      ballContainer.style.left = pRect.x + 'px';
      ballContainer.style.top = pRect.y + 'px';
      ballContainer.innerHTML = `
        <div class="pkb-shadow"></div>
        <div class="pkb-rotator">
          <svg class="pkb-svg" viewBox="0 0 100 100" width="46" height="46">
            <defs>
              <radialGradient id="pkb-top-grad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="${ballCfg.topGrad[0]}"/>
                <stop offset="60%" stop-color="${ballCfg.topGrad[1]}"/>
                <stop offset="100%" stop-color="${ballCfg.topGrad[2]}"/>
              </radialGradient>
              <radialGradient id="pkb-white-grad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="70%" stop-color="#e2e8f0"/>
                <stop offset="100%" stop-color="#94a3b8"/>
              </radialGradient>
              <linearGradient id="pkb-metal-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f8fafc"/>
                <stop offset="50%" stop-color="#94a3b8"/>
                <stop offset="100%" stop-color="#475569"/>
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#0f172a" />
            <path d="M 4 50 A 46 46 0 0 1 96 50 Z" fill="url(#pkb-top-grad)" />
            ${ballKey === 'greatBall' ? '<rect x="18" y="16" width="14" height="6" fill="#ef4444" rx="2" transform="rotate(-25 25 19)"/><rect x="68" y="16" width="14" height="6" fill="#ef4444" rx="2" transform="rotate(25 75 19)"/>' : ''}
            ${ballKey === 'ultraBall' ? '<path d="M 22 10 L 32 46 L 24 46 Z" fill="#facc15"/><path d="M 78 10 L 68 46 L 76 46 Z" fill="#facc15"/>' : ''}
            <ellipse cx="36" cy="24" rx="14" ry="7" fill="rgba(255,255,255,0.4)" transform="rotate(-15 36 24)" />
            <path d="M 4 50 A 46 46 0 0 0 96 50 Z" fill="url(#pkb-white-grad)" />
            <rect x="3" y="46" width="94" height="8" fill="#0f172a" />
            <circle cx="50" cy="50" r="14" fill="#0f172a" />
            <circle cx="50" cy="50" r="10" fill="url(#pkb-metal-grad)" />
            <circle class="pkb-center-led" cx="50" cy="50" r="6" fill="#f8fafc" stroke="#475569" stroke-width="1" />
          </svg>
        </div>
      `;
      const world = $('#world') || document.body;
      world.appendChild(ballContainer);

      const rotator = ballContainer.querySelector('.pkb-rotator') as HTMLElement;
      const ledEl = ballContainer.querySelector('.pkb-center-led') as SVGElement;

      // 1. High Parabolic Throw Arc with 3D Rotation
      sound.swp(350, 800, 0.22, 'sine', 0.15);
      sound.beep(620, 0.12, 'triangle');

      const dx = fRect.x - pRect.x;
      const dy = fRect.y - pRect.y - 70; // Hover above wild Pokémon

      rotator.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(720deg)' },
        ],
        { duration: 680, easing: 'ease-out', fill: 'forwards' }
      );

      await ballContainer.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.6)' },
          { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45 - 130}px)) scale(1.15)`, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.0)` },
        ],
        { duration: 680, easing: 'cubic-bezier(0.22, 0.9, 0.36, 1)', fill: 'forwards' }
      ).finished;

      // 2. Open Ball & Capture Beam
      sound.swp(880, 260, 0.32, 'sawtooth', 0.15);
      puff(fRect.x, fRect.y, '✨', 12, 70, 500);

      // Expanding Crimson Energy Wave
      fly(
        el('ring', {
          borderColor: '#ef4444',
          left: fRect.x + 'px',
          top: (fRect.y - 30) + 'px',
          width: '40px',
          height: '40px',
        }),
        [
          { transform: 'translate(-50%,-50%) scale(0.5)', opacity: '1' },
          { transform: 'translate(-50%,-50%) scale(2.8)', opacity: '0' },
        ],
        { duration: 420 }
      );

      // Suck wild Pokémon into ball
      await recall('f');
      sound.beep(650, 0.1, 'square'); // Click shut
      await sleep(200);

      // 3. Ground Fall & Physics Bounces
      const groundDy = fRect.y - pRect.y + 40; // Ground turf level under foe

      // Drop down
      await ballContainer.animate(
        [
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.0)` },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy}px)) scale(1.0)` },
        ],
        { duration: 240, easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)', fill: 'forwards' }
      ).finished;

      // Bounce 1
      sound.beep(150, 0.08, 'triangle');
      puff(fRect.x, fRect.y + 50, '💨', 4, 30, 250);
      await ballContainer.animate(
        [
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy}px)) scale(1.0)` },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy - 32}px)) scale(1.0)`, offset: 0.5 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy}px)) scale(1.0)` },
        ],
        { duration: 280, easing: 'ease-out', fill: 'forwards' }
      ).finished;

      // Bounce 2
      sound.beep(180, 0.06, 'triangle');
      await ballContainer.animate(
        [
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy}px)) scale(1.0)` },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy - 12}px)) scale(1.0)`, offset: 0.5 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${groundDy}px)) scale(1.0)` },
        ],
        { duration: 180, easing: 'ease-out', fill: 'forwards' }
      ).finished;

      // 4. Suspenseful Wobble Sequence with Ball-Specific Multiplier
      const catchResult = calculateCatchSuccess(F(), ballCfg.multiplier);
      const success = catchResult.success;
      const shakeCount = catchResult.shakeCount;
      const maxShakes = success ? 3 : Math.max(1, shakeCount);

      await sleep(450);

      for (let s = 1; s <= maxShakes; s++) {
        // LED Glows Red + Rattle Sound
        if (ledEl) {
          ledEl.style.fill = '#ef4444';
          ledEl.style.filter = 'drop-shadow(0 0 6px #ef4444)';
        }
        sound.swp(460, 320, 0.14, 'sine', 0.12);
        sound.beep(380, 0.12, 'triangle');

        // Tilt left, tilt right, settle
        await rotator.animate(
          [
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(-28deg)', offset: 0.25 },
            { transform: 'rotate(24deg)', offset: 0.65 },
            { transform: 'rotate(0deg)' },
          ],
          { duration: 380, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' }
        ).finished;

        if (ledEl) {
          ledEl.style.fill = '#f8fafc';
          ledEl.style.filter = 'none';
        }

        await sleep(420);
      }

      // 5. Catch Resolution
      if (success) {
        // Final click & victory fanfare
        if (ledEl) {
          ledEl.style.fill = '#facc15';
          ledEl.style.filter = 'drop-shadow(0 0 10px #facc15)';
        }
        sound.beep(1046.5, 0.18, 'sine');
        sound.beep(1318.5, 0.35, 'sine', 0.2, 0.12);
        puff(fRect.x, fRect.y + 40, '⭐', 16, 95, 700);

        fly(
          el('ring', {
            borderColor: '#facc15',
            left: fRect.x + 'px',
            top: (fRect.y + 40) + 'px',
            width: '40px',
            height: '40px',
          }),
          [
            { transform: 'translate(-50%,-50%) scale(0.5)', opacity: '1' },
            { transform: 'translate(-50%,-50%) scale(3)', opacity: '0' },
          ],
          { duration: 600 }
        );

        sound.music('victory');
        await sleep(500);
        ballContainer.remove();

        const captured = mk(F().id, F().lv);
        captured.hp = st(captured).max;
        captured.se = undefined;

        let destinationMsg = '';
        if (G.team.length < MAX_ACTIVE_TEAM) {
          G.team.push(captured);
          destinationMsg = `Added to your active party (${G.team.length}/6)!`;
        } else {
          G.pcBox.push(captured);
          destinationMsg = `Party is full (6/6). Safely sent to PC Box Storage!`;
        }

        G.routeEncountersDone = (G.routeEncountersDone || 0) + 1;
        save();

        await say(`Gotcha! ${POKEMON_SPECIES_MAP[captured.id]?.name.toUpperCase()} was caught!`);
        await showPokemonCaughtModal(captured, destinationMsg);

        S.phase = 'BATTLE_OVER';
        return 'caught';
      } else {
        ballContainer.remove();
        sound.swp(180, 480, 0.25, 'sawtooth', 0.18);
        puff(fRect.x, fRect.y + 40, '💥', 10, 80, 450);
        await release('f');
        await say(`Oh no! The wild ${NM('f')} broke free!`, 500);

        // Wild mon strikes back!
        S.phase = 'OPPONENT_TURN';
        await act('f', oppAction);
        const r = await resolve();
        if (r) {
          S.phase = 'BATTLE_OVER';
          return r;
        }
        S.phase = 'PLAYER_TURN';
        return null;
      }
    }
  }

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
      c.className = 'main battle-actions-grid';
      const canRun = !!(B && B.isWild);
      c.innerHTML = `
        <button class="battle-act-btn act-fight" data-a="f" title="Choose a move to attack">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M19 13l2 2-5 5-2-2"/></svg>
          <span>FIGHT</span>
        </button>
        <button class="battle-act-btn act-bag" data-a="b" title="Use items or Poké Balls">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3"><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
          <span>BAG</span>
        </button>
        <button class="battle-act-btn act-pokemon" data-a="p" title="Switch party Pokémon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
          <span>POKÉMON</span>
        </button>
        <button class="battle-act-btn act-run" data-a="r" ${canRun ? '' : 'disabled title="Cannot flee from an official trainer battle!"'}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M13 4v6m0 0l4-2m-4 2l-3 4-3-1M13 10l-2 5 4 4"/></svg>
          <span>RUN</span>
        </button>
      `;
    };

    c.onclick = async e => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b || (b as HTMLButtonElement).disabled || lk || S.phase !== 'PLAYER_TURN') return;
      const a = b.dataset.a;
      if (a === 'r' && B && B.isWild) {
        lk = 1;
        done({ k: 'run' });
      } else if (a === 'f') {
        c.className = 'mvs';
        const oppMon = F();
        const defenderTypes = (oppMon && POKEMON_SPECIES_MAP[oppMon.id]?.typesShort) || ['No'];
        c.innerHTML =
          m.moves
            .map((k: string, i: number) => {
              const mv = getMoveData(k);
              const eff = calculateTypeEffectiveness(mv.typeShort, defenderTypes);
              return `<button class="mv ${mv.typeShort}" data-a="m" data-i="${i}">${mvh(mv, eff)}</button>`;
            })
            .join('') + '<button class="w" data-a="x">BACK</button>';
      } else if (a === 'x') {
        root();
      } else if (a === 'm') {
        lk = 1;
        const chosen = m.moves[+b.dataset.i!];
        done({ k: 'm', mv: getMoveData(chosen) });
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

// ============================================================================
// CONFETTI CELEBRATION
// ============================================================================
export function confetti(): void {
  const C = ['#ffd54a', '#ff4a4a', '#4a8aff', '#4adf6a', '#ffffff', '#b04aff'];
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

// ============================================================================
// SYSTEM INITIALIZATION & EVENT LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const q = (id: string) => document.getElementById(id);
  const son = q('son') as HTMLInputElement;
  const sv = q('sv') as HTMLInputElement;
  const sb = q('sb');
  const sbIcon = q('sb-icon');
  const setOv = q('set-ov');
  const btnCloseSettings = q('btn-close-settings');

  try {
    const raw = localStorage.getItem('kantoSnd');
    if (raw) Object.assign(sound.SND, JSON.parse(raw));
  } catch { }

  const updateSoundVisuals = () => {
    try {
      localStorage.setItem('kantoSnd', JSON.stringify(sound.SND));
    } catch { }
    const icon = sound.SND.on && sound.SND.v > 0 ? '🔊' : '🔇';
    if (sbIcon) sbIcon.textContent = icon;
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

  const sbFooter = q('sb-footer');
  if (sb && setOv) {
    sb.onclick = () => {
      setOv.style.display = 'flex';
    };
  }
  if (sbFooter && setOv) {
    sbFooter.onclick = () => {
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
        '<br>Pokémon, Pokémon character names, and Pokémon models are trademarks and copyrights of Nintendo, Creatures Inc., and GAME FREAK.',
      ]);
    };
  }

  // Route Exploration Virtual D-Pad & Controls (Continuous Drag & Touch Auto-Move)
  const dpad = q('v-dpad');
  if (dpad) {
    let activePointerId: number | null = null;
    const buttons = dpad.querySelectorAll<HTMLButtonElement>('.dpad-btn');

    const setActiveDir = (dir: 'up' | 'down' | 'left' | 'right' | null) => {
      routeExplorationEngine.setDirection(dir);
      buttons.forEach(btn => {
        if (dir && btn.dataset.dir === dir) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    };

    const handlePointerCoord = (clientX: number, clientY: number) => {
      const rect = dpad.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < 12) {
        setActiveDir(null);
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        setActiveDir(dx > 0 ? 'right' : 'left');
      } else {
        setActiveDir(dy > 0 ? 'down' : 'up');
      }
    };

    dpad.addEventListener('pointerdown', e => {
      e.preventDefault();
      activePointerId = e.pointerId;
      try {
        dpad.setPointerCapture(e.pointerId);
      } catch { }
      handlePointerCoord(e.clientX, e.clientY);
    });

    dpad.addEventListener('pointermove', e => {
      if (activePointerId !== null && e.pointerId === activePointerId) {
        e.preventDefault();
        handlePointerCoord(e.clientX, e.clientY);
      }
    });

    const endPointer = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId === activePointerId) {
        activePointerId = null;
        try {
          dpad.releasePointerCapture(e.pointerId);
        } catch { }
        setActiveDir(null);
      }
    };

    dpad.addEventListener('pointerup', endPointer);
    dpad.addEventListener('pointercancel', endPointer);
    dpad.addEventListener('lostpointercapture', () => setActiveDir(null));

    // Touch events fallback for mobile browsers
    dpad.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handlePointerCoord(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    dpad.addEventListener('touchend', e => {
      e.preventDefault();
      setActiveDir(null);
    });
  }

  const doInteract = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    routeExplorationEngine.interact();
  };

  const btnInteract = q('btn-interact');
  if (btnInteract) {
    btnInteract.addEventListener('pointerdown', doInteract);
    btnInteract.addEventListener('touchstart', doInteract, { passive: false });
    btnInteract.addEventListener('click', doInteract);
  }

  const promptEl = q('route-prompt');
  if (promptEl) {
    promptEl.addEventListener('pointerdown', doInteract);
    promptEl.addEventListener('touchstart', doInteract, { passive: false });
    promptEl.addEventListener('click', doInteract);
  }

  const hudMenuBtn = q('hud-menu-btn');
  if (hudMenuBtn) {
    hudMenuBtn.onclick = () => {
      saveCurrentRoutePosition();
      routeExplorationEngine.stop();
      journeyHubScr();
    };
  }

  const btnQuickPokedex = q('btn-quick-pokedex');
  if (btnQuickPokedex) {
    btnQuickPokedex.onclick = () => {
      const isRoute = document.getElementById('route')?.classList.contains('on');
      if (isRoute) {
        saveCurrentRoutePosition();
        routeExplorationEngine.stop();
        pokedexScr('route');
      } else {
        pokedexScr('hub');
      }
    };
  }

  titleScr();
});
