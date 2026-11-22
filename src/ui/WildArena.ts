/**
 * WildArena.ts
 * Location-aware backdrops for wild Pokemon battles. Trainer, Gym,
 * Championship and Elite Four battles keep the League stadium; a wild battle
 * now happens where the encounter happened: a forest clearing, a mountain
 * pass, a beach, a lake (when fishing), a crystal cave, a snowfield, a
 * volcanic island, the savannah, a city park...
 *
 * The biome is derived from the location's 3D environment config (the same
 * zones that pick its trees and ground), so a battle on Route 1 looks like
 * Route 1 and a battle in Glimmerstone Cavern looks like a cave. Each backdrop
 * is a layered SVG (sky, far scenery, tree line, ground, two battle platforms
 * lined up with the Pokemon, foreground framing and a gentle ambient effect)
 * drawn into the existing #bg element, so the battle engine, 3D Pokemon and
 * sprites are untouched.
 */

import { getRouteDefinition } from '../data/specialAreas';
import { environmentFor, zoneAt } from '../world/LocationEnvironment';

export type WildBiome = 'meadow' | 'forest' | 'grove' | 'mountain' | 'beach' | 'water' | 'cave' | 'grotto' | 'snow' | 'volcanic' | 'savanna' | 'city';

interface ArenaLook {
  sky: [string, string, string];
  far: 'hills' | 'mountains' | 'sea' | 'cavewall' | 'skyline' | 'volcano' | 'dunes' | 'peaks';
  farColor: [string, string];
  mid: 'roundtrees' | 'pines' | 'palms' | 'deadtrees' | 'acacia' | 'stalagmites' | 'buildings' | 'bamboo' | 'none';
  midColor: string;
  trunk: string;
  ground: [string, string];
  water?: boolean;
  platform: [string, string, string]; // top, rim, shadow edge
  details: 'grass' | 'flowers' | 'pebbles' | 'snow' | 'embers' | 'shells' | 'crystals' | 'lilies';
  detailColors: string[];
  fx: 'sunrays' | 'mist' | 'snowfall' | 'embers' | 'caveshafts' | 'sparkle' | 'none';
  dark?: number;
}

const LOOKS: Record<WildBiome, ArenaLook> = {
  meadow: {
    sky: ['#3b8fe0', '#8ec9f2', '#e6f5ff'], far: 'hills', farColor: ['#7cb56a', '#5e9a52'], mid: 'roundtrees', midColor: '#3f7f3a', trunk: '#6b4a2e',
    ground: ['#7cc462', '#4f9a3c'], platform: ['#9bd47e', '#6aa84f', '#3f7a2f'], details: 'flowers', detailColors: ['#fde047', '#f9a8d4', '#ffffff'], fx: 'sunrays',
  },
  forest: {
    sky: ['#2f6f8f', '#7fb4b8', '#cfe6d6'], far: 'hills', farColor: ['#3d6b45', '#2c5236'], mid: 'pines', midColor: '#1f4d2e', trunk: '#4a3220',
    ground: ['#4f8a3a', '#2f5e24'], platform: ['#6e9f4f', '#4d7a36', '#2c4d1f'], details: 'grass', detailColors: ['#3f7a2c', '#6bb046', '#b45309'], fx: 'sunrays', dark: 0.12,
  },
  grove: {
    sky: ['#2c5f58', '#6e9a8a', '#bcd6c6'], far: 'hills', farColor: ['#2f5a48', '#244638'], mid: 'roundtrees', midColor: '#1d4535', trunk: '#3d2a1c',
    ground: ['#3f7a4f', '#24503a'], platform: ['#5f9a68', '#3f7a4c', '#24503a'], details: 'flowers', detailColors: ['#a5f3fc', '#c4b5fd', '#86efac'], fx: 'mist', dark: 0.22,
  },
  mountain: {
    sky: ['#3d7fd0', '#9cc6ec', '#edf3f7'], far: 'mountains', farColor: ['#8a93a5', '#6b7486'], mid: 'pines', midColor: '#2f5a3a', trunk: '#4a3220',
    ground: ['#9c9478', '#6f6a55'], platform: ['#b5ad90', '#8a8268', '#5d5847'], details: 'pebbles', detailColors: ['#7b7666', '#a8a493', '#5f7a45'], fx: 'none',
  },
  beach: {
    sky: ['#2f9be8', '#93d5f7', '#f2fbff'], far: 'sea', farColor: ['#1f78b4', '#2a9bd1'], mid: 'palms', midColor: '#2f8a3e', trunk: '#8a5a32',
    ground: ['#f1dca5', '#d9bd7c'], platform: ['#f7e7bd', '#dcc28a', '#b89a5e'], details: 'shells', detailColors: ['#fbcfe8', '#ffffff', '#fdba74'], fx: 'sunrays',
  },
  water: {
    sky: ['#3c93dc', '#9dd2f3', '#effaff'], far: 'hills', farColor: ['#6fa86a', '#4f8a4c'], mid: 'roundtrees', midColor: '#3a7a3c', trunk: '#5c4028',
    ground: ['#3a9fd1', '#1f6f9e'], water: true, platform: ['#7bbf5a', '#4f8f3a', '#2f6a2a'], details: 'lilies', detailColors: ['#4ade80', '#f9a8d4'], fx: 'sparkle',
  },
  cave: {
    sky: ['#07080c', '#121521', '#1d2232'], far: 'cavewall', farColor: ['#2a2622', '#3a342e'], mid: 'stalagmites', midColor: '#3d3630', trunk: '#2a2622',
    ground: ['#4a4038', '#2a241f'], platform: ['#6b5f53', '#4d443b', '#2f2a24'], details: 'crystals', detailColors: ['#93c5fd', '#c4b5fd', '#5eead4'], fx: 'caveshafts', dark: 0.35,
  },
  grotto: {
    sky: ['#04141c', '#0a2733', '#123a48'], far: 'cavewall', farColor: ['#1d3a44', '#2a4d58'], mid: 'stalagmites', midColor: '#24464f', trunk: '#1d3a44',
    ground: ['#2a7f9a', '#145a70'], water: true, platform: ['#5c7f86', '#3f6168', '#24454c'], details: 'crystals', detailColors: ['#67e8f9', '#a5f3fc'], fx: 'caveshafts', dark: 0.3,
  },
  snow: {
    sky: ['#6aa6d8', '#bcd8ee', '#f5f9fc'], far: 'peaks', farColor: ['#dfe8f0', '#b9c8d6'], mid: 'pines', midColor: '#2c4f3e', trunk: '#4a3220',
    ground: ['#f3f7fa', '#d3dfe8'], platform: ['#ffffff', '#d5e1ea', '#a9b9c6'], details: 'snow', detailColors: ['#ffffff', '#cbd5e1'], fx: 'snowfall',
  },
  volcanic: {
    sky: ['#6b3a35', '#c4785a', '#f3c79a'], far: 'volcano', farColor: ['#4a3a36', '#33282a'], mid: 'deadtrees', midColor: '#3a2f2a', trunk: '#3a2f2a',
    ground: ['#6a625a', '#403a35'], platform: ['#8a7f73', '#5f564d', '#3a332d'], details: 'embers', detailColors: ['#f97316', '#fbbf24'], fx: 'embers', dark: 0.08,
  },
  savanna: {
    sky: ['#4a98d8', '#a9d3ee', '#fbeccc'], far: 'dunes', farColor: ['#c9b26a', '#b0984f'], mid: 'acacia', midColor: '#6b7d33', trunk: '#5c4028',
    ground: ['#c8b765', '#9f8f45'], platform: ['#d6c67a', '#ad9c52', '#7d6f37'], details: 'grass', detailColors: ['#a3a050', '#c2b46a', '#7d8a3c'], fx: 'sunrays',
  },
  city: {
    sky: ['#3d8ee0', '#9ccff2', '#f5f0e2'], far: 'skyline', farColor: ['#9aa7b8', '#7d8a9c'], mid: 'roundtrees', midColor: '#3f7f3a', trunk: '#6b4a2e',
    ground: ['#86c06a', '#5a9a46'], platform: ['#d8d2c4', '#b5ad9c', '#8a8372'], details: 'flowers', detailColors: ['#fde047', '#fb7185', '#ffffff'], fx: 'none',
  },
};

/** Which landscape a wild battle at (routeId, x) takes place in. */
export function biomeAt(routeId: number, x: number, fishing = false): WildBiome {
  const route = getRouteDefinition(routeId);
  const env = environmentFor(route);
  if (env.underground) return route.theme === 'water' ? 'grotto' : 'cave';
  if (fishing) return 'water';
  const z = zoneAt(env, x);
  const ground = z.ground || env.baseGround;
  const label = z.label.toLowerCase();
  if (ground === 'snow' || /summit/.test(label)) return 'snow';
  if (ground === 'ash' || /cinnabar|volcan/.test(label)) return 'volcanic';
  if (/savannah|savanna/.test(label) || ground === 'dry') return 'savanna';
  if (/mossveil|grove/.test(label)) return 'grove';
  if (/forest|thicket|sanctuary/.test(label)) return 'forest';
  if (env.ring === 'sea' || /coast|shore|sea route|isle|vermilion|beach/.test(label)) return 'beach';
  if (ground === 'rock' || env.ring === 'cliffs' || /moon|victory|mountain|pewter|skyreach/.test(label)) return 'mountain';
  if (/city|metropolis|plaza|quarter|garden|hall|stadium|outskirts|suburb/.test(label)) return 'city';
  return 'meadow';
}

// ---------------------------------------------------------------------------
// SVG generation
// ---------------------------------------------------------------------------
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HORIZON = 430;

function farLayer(L: ArenaLook, r: () => number): string {
  const [c1, c2] = L.farColor;
  switch (L.far) {
    case 'mountains':
    case 'peaks': {
      let d = `M0 ${HORIZON} `;
      for (let x = 0; x <= 1000; x += 90) d += `L${x + 45} ${HORIZON - 120 - r() * 170} L${x + 90} ${HORIZON - 40 - r() * 60} `;
      d += `L1000 ${HORIZON} Z`;
      const caps = L.far === 'peaks' || L.farColor[0] !== '#8a93a5' ? '' : '';
      return `<path d="${d}" fill="${c2}"/><path d="${d}" fill="url(#wa-farshade)" opacity="0.5"/>${caps}` +
        (L.far === 'mountains' ? `<path d="${d}" fill="none" stroke="#eef2f7" stroke-width="6" stroke-dasharray="30 400" opacity="0.8"/>` : '');
    }
    case 'sea':
      return `<rect x="0" y="${HORIZON - 70}" width="1000" height="80" fill="${c1}"/><rect x="0" y="${HORIZON - 70}" width="1000" height="6" fill="#ffffff" opacity="0.35"/>` +
        `<path d="M0 ${HORIZON - 40} Q 250 ${HORIZON - 52} 500 ${HORIZON - 40} T 1000 ${HORIZON - 40}" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.35"><animate attributeName="d" dur="6s" repeatCount="indefinite" values="M0 ${HORIZON - 40} Q 250 ${HORIZON - 52} 500 ${HORIZON - 40} T 1000 ${HORIZON - 40};M0 ${HORIZON - 40} Q 250 ${HORIZON - 30} 500 ${HORIZON - 40} T 1000 ${HORIZON - 40};M0 ${HORIZON - 40} Q 250 ${HORIZON - 52} 500 ${HORIZON - 40} T 1000 ${HORIZON - 40}"/></path>` +
        `<path d="M780 ${HORIZON - 70} L 800 ${HORIZON - 96} L 840 ${HORIZON - 96} L 850 ${HORIZON - 70} Z" fill="#f8fafc" opacity="0.8"/>`;
    case 'cavewall': {
      let d = 'M0 0 L1000 0 L1000 ';
      d += `${HORIZON - 40} `;
      for (let x = 1000; x >= 0; x -= 60) d += `L${x} ${HORIZON - 60 - r() * 120} `;
      d += 'Z';
      return `<path d="${d}" fill="${c2}"/><path d="${d}" fill="url(#wa-farshade)" opacity="0.6"/>` +
        Array.from({ length: 10 }, () => `<path d="M${r() * 1000} 0 l${8 + r() * 10} ${60 + r() * 120} l${8 + r() * 10} -${60 + r() * 120} Z" fill="${c1}"/>`).join('');
    }
    case 'skyline': {
      let s = '';
      for (let x = -20; x < 1020; x += 50 + r() * 40) {
        const h = 60 + r() * 150;
        const w = 40 + r() * 50;
        s += `<rect x="${x}" y="${HORIZON - h}" width="${w}" height="${h}" fill="${r() < 0.5 ? c1 : c2}"/>`;
        for (let wy = HORIZON - h + 10; wy < HORIZON - 10; wy += 16) s += `<rect x="${x + 6}" y="${wy}" width="${w - 12}" height="5" fill="#dbeafe" opacity="0.35"/>`;
      }
      return s;
    }
    case 'volcano':
      return `<path d="M120 ${HORIZON} L 420 ${HORIZON - 250} L 520 ${HORIZON - 250} L 860 ${HORIZON} Z" fill="${c1}"/>` +
        `<path d="M420 ${HORIZON - 250} L 470 ${HORIZON - 190} L 520 ${HORIZON - 250} Z" fill="#f97316"/>` +
        `<path d="M462 ${HORIZON - 200} Q 450 ${HORIZON - 120} 470 ${HORIZON - 40} L 490 ${HORIZON - 40} Q 478 ${HORIZON - 120} 488 ${HORIZON - 200} Z" fill="#fb923c" opacity="0.85"/>` +
        `<g opacity="0.55" fill="#57534e"><circle cx="470" cy="${HORIZON - 285}" r="34"><animate attributeName="cy" dur="7s" repeatCount="indefinite" values="${HORIZON - 285};${HORIZON - 330};${HORIZON - 285}"/></circle><circle cx="505" cy="${HORIZON - 320}" r="26"/><circle cx="440" cy="${HORIZON - 330}" r="22"/></g>`;
    case 'dunes':
      return `<path d="M0 ${HORIZON} Q 200 ${HORIZON - 70} 420 ${HORIZON - 20} T 1000 ${HORIZON - 40} L1000 ${HORIZON} Z" fill="${c1}"/>` +
        `<path d="M0 ${HORIZON} Q 300 ${HORIZON - 40} 600 ${HORIZON - 10} T 1000 ${HORIZON - 10} L1000 ${HORIZON} Z" fill="${c2}"/>`;
    default: {
      let d = `M0 ${HORIZON} `;
      for (let x = 0; x <= 1000; x += 125) d += `Q ${x + 62} ${HORIZON - 70 - r() * 80} ${x + 125} ${HORIZON - 20 - r() * 30} `;
      d += `L1000 ${HORIZON} Z`;
      return `<path d="${d}" fill="${c1}"/><path d="${d.replace(/ (\d+(\.\d+)?) /g, ' $1 ')}" fill="${c2}" opacity="0.45" transform="translate(0 18)"/>`;
    }
  }
}

function midLayer(L: ArenaLook, r: () => number): string {
  const c = L.midColor;
  const t = L.trunk;
  let s = '';
  const base = HORIZON + 6;
  switch (L.mid) {
    case 'pines':
      for (let x = -20; x < 1030; x += 34 + r() * 26) {
        const h = 90 + r() * 90;
        s += `<rect x="${x - 3}" y="${base - 18}" width="6" height="20" fill="${t}"/><path d="M${x - h * 0.24} ${base - 10} L${x} ${base - h} L${x + h * 0.24} ${base - 10} Z" fill="${c}"/>` +
          (L.details === 'snow' ? `<path d="M${x - h * 0.1} ${base - h * 0.62} L${x} ${base - h} L${x + h * 0.1} ${base - h * 0.62} Z" fill="#f8fafc"/>` : '');
      }
      return s;
    case 'palms':
      for (const x of [60, 170, 820, 930]) {
        const h = 160 + r() * 60;
        s += `<path d="M${x} ${base} Q ${x + 18} ${base - h * 0.5} ${x + 8} ${base - h}" stroke="${t}" stroke-width="12" fill="none"/>`;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          s += `<path d="M${x + 8} ${base - h} q ${Math.cos(a) * 50} ${Math.sin(a) * 18 - 14} ${Math.cos(a) * 90} ${Math.sin(a) * 30 + 22}" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
        }
      }
      return s;
    case 'deadtrees':
      for (let x = 30; x < 1000; x += 90 + r() * 80) {
        const h = 80 + r() * 70;
        s += `<path d="M${x} ${base} L${x} ${base - h} M${x} ${base - h * 0.6} L${x - 26} ${base - h * 0.85} M${x} ${base - h * 0.75} L${x + 30} ${base - h * 0.98} M${x} ${base - h * 0.4} L${x + 20} ${base - h * 0.55}" stroke="${t}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
      }
      return s;
    case 'acacia':
      for (let x = 40; x < 1000; x += 160 + r() * 140) {
        const h = 90 + r() * 50;
        s += `<path d="M${x} ${base} L${x + 4} ${base - h}" stroke="${t}" stroke-width="7"/><ellipse cx="${x + 4}" cy="${base - h}" rx="${60 + r() * 20}" ry="14" fill="${c}"/>`;
      }
      return s;
    case 'stalagmites':
      for (let x = 0; x < 1000; x += 40 + r() * 60) {
        const h = 40 + r() * 110;
        s += `<path d="M${x - 14 - r() * 10} ${base} L${x} ${base - h} L${x + 14 + r() * 10} ${base} Z" fill="${c}"/>`;
      }
      return s;
    case 'bamboo':
      for (let x = 0; x < 1000; x += 18 + r() * 14) s += `<rect x="${x}" y="${base - 160 - r() * 60}" width="8" height="220" fill="${c}" opacity="${0.7 + r() * 0.3}"/>`;
      return s;
    case 'buildings':
      return '';
    case 'roundtrees':
      for (let x = -20; x < 1030; x += 46 + r() * 40) {
        const h = 70 + r() * 70;
        const rad = 28 + r() * 26;
        s += `<rect x="${x - 4}" y="${base - h * 0.5}" width="8" height="${h * 0.5}" fill="${t}"/><circle cx="${x}" cy="${base - h * 0.6}" r="${rad}" fill="${c}"/><circle cx="${x - rad * 0.4}" cy="${base - h * 0.6 - rad * 0.4}" r="${rad * 0.55}" fill="#ffffff" opacity="0.08"/>`;
      }
      return s;
    default:
      return '';
  }
}

function details(L: ArenaLook, r: () => number): string {
  let s = '';
  const cols = L.detailColors;
  for (let i = 0; i < 70; i++) {
    const x = r() * 1000;
    const y = HORIZON + 40 + r() * 520;
    const k = (y - HORIZON) / 560; // perspective: bigger near the bottom
    const sz = 3 + k * 9;
    const c = cols[Math.floor(r() * cols.length)];
    switch (L.details) {
      case 'grass':
        s += `<path d="M${x} ${y} l${-sz * 0.4} ${-sz * 1.6} M${x} ${y} l0 ${-sz * 2} M${x} ${y} l${sz * 0.4} ${-sz * 1.6}" stroke="${c}" stroke-width="${1 + k * 1.5}" stroke-linecap="round"/>`;
        break;
      case 'flowers':
        s += `<path d="M${x} ${y} l0 ${-sz * 1.6}" stroke="#3f7a2c" stroke-width="${1 + k}"/><circle cx="${x}" cy="${y - sz * 1.7}" r="${sz * 0.45}" fill="${c}"/>`;
        break;
      case 'pebbles':
        s += `<ellipse cx="${x}" cy="${y}" rx="${sz}" ry="${sz * 0.55}" fill="${c}"/>`;
        break;
      case 'snow':
        s += `<ellipse cx="${x}" cy="${y}" rx="${sz * 1.6}" ry="${sz * 0.5}" fill="${c}" opacity="0.8"/>`;
        break;
      case 'embers':
        s += `<ellipse cx="${x}" cy="${y}" rx="${sz * 0.9}" ry="${sz * 0.45}" fill="${i % 3 ? '#57534e' : c}" opacity="${i % 3 ? 0.8 : 0.9}"/>`;
        break;
      case 'shells':
        s += `<path d="M${x - sz} ${y} a ${sz} ${sz} 0 0 1 ${sz * 2} 0 Z" fill="${c}"/>`;
        break;
      case 'crystals':
        if (i % 3 === 0) s += `<path d="M${x - sz * 0.6} ${y} L${x} ${y - sz * 3} L${x + sz * 0.6} ${y} Z" fill="${c}" opacity="0.9"/>`;
        else s += `<ellipse cx="${x}" cy="${y}" rx="${sz}" ry="${sz * 0.5}" fill="#3d3630"/>`;
        break;
      case 'lilies':
        if (i % 2 === 0) s += `<ellipse cx="${x}" cy="${y}" rx="${sz * 1.8}" ry="${sz * 0.7}" fill="${cols[0]}" opacity="0.85"/>`;
        else s += `<path d="M${x - sz * 2} ${y} q ${sz * 2} ${-sz * 0.6} ${sz * 4} 0" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.4"/>`;
        break;
    }
  }
  return s;
}

function platform(cx: number, cy: number, rx: number, ry: number, L: ArenaLook): string {
  const [top, rim, edge] = L.platform;
  return `<ellipse cx="${cx}" cy="${cy + ry * 0.35}" rx="${rx * 1.04}" ry="${ry * 1.1}" fill="${edge}" opacity="0.9"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${rim}"/>` +
    `<ellipse cx="${cx}" cy="${cy - ry * 0.12}" rx="${rx * 0.92}" ry="${ry * 0.8}" fill="${top}"/>` +
    `<ellipse cx="${cx - rx * 0.25}" cy="${cy - ry * 0.3}" rx="${rx * 0.4}" ry="${ry * 0.25}" fill="#ffffff" opacity="0.18"/>`;
}

function foreground(L: ArenaLook, r: () => number): string {
  if (L.water) return '';
  const c = L.mid === 'stalagmites' ? L.midColor : L.details === 'snow' ? '#e2e8f0' : L.details === 'embers' ? '#3a332d' : L.details === 'shells' ? '#c9a868' : L.midColor;
  let s = '';
  for (const [x0, flip] of [[0, 1], [1000, -1]] as const) {
    for (let i = 0; i < 6; i++) {
      const x = x0 + flip * (r() * 160);
      const y = 900 + r() * 60;
      const rad = 50 + r() * 50;
      s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${c}" opacity="0.92"/>`;
    }
  }
  return s;
}

function effects(L: ArenaLook, r: () => number): string {
  switch (L.fx) {
    case 'sunrays':
      return `<path d="M1000 0 L 620 0 L 300 900 L 520 900 Z" fill="url(#wa-ray)" opacity="0.5"/><path d="M1000 120 L 800 0 L 520 900 L 640 900 Z" fill="url(#wa-ray)" opacity="0.35"/>`;
    case 'mist':
      return `<rect x="0" y="${HORIZON - 60}" width="1000" height="160" fill="url(#wa-mist)"><animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="0.6;0.9;0.6"/></rect>`;
    case 'snowfall':
      return Array.from({ length: 50 }, () => {
        const x = r() * 1000;
        const d = 6 + r() * 8;
        return `<circle cx="${x}" cy="-10" r="${1.5 + r() * 3}" fill="#ffffff" opacity="0.85"><animate attributeName="cy" dur="${d}s" begin="-${r() * d}s" repeatCount="indefinite" values="-10;1010"/><animate attributeName="cx" dur="${d}s" begin="-${r() * d}s" repeatCount="indefinite" values="${x};${x + 40};${x}"/></circle>`;
      }).join('');
    case 'embers':
      return Array.from({ length: 30 }, () => {
        const x = r() * 1000;
        const d = 5 + r() * 6;
        return `<circle cx="${x}" cy="1010" r="${1.5 + r() * 2.5}" fill="${r() < 0.5 ? '#fb923c' : '#fde047'}"><animate attributeName="cy" dur="${d}s" begin="-${r() * d}s" repeatCount="indefinite" values="1010;200"/><animate attributeName="opacity" dur="${d}s" begin="-${r() * d}s" repeatCount="indefinite" values="0;1;0"/></circle>`;
      }).join('');
    case 'caveshafts':
      return `<path d="M380 0 L 460 0 L 620 900 L 420 900 Z" fill="url(#wa-shaft)" opacity="0.5"/><path d="M680 0 L 720 0 L 820 900 L 700 900 Z" fill="url(#wa-shaft)" opacity="0.3"/>` +
        Array.from({ length: 20 }, () => `<circle cx="${r() * 1000}" cy="${r() * 900}" r="${1 + r() * 2}" fill="#e0f2fe" opacity="0.5"><animate attributeName="opacity" dur="${2 + r() * 3}s" repeatCount="indefinite" values="0.1;0.7;0.1"/></circle>`).join('');
    case 'sparkle':
      return Array.from({ length: 24 }, () => `<circle cx="${r() * 1000}" cy="${HORIZON + 40 + r() * 500}" r="${1.5 + r() * 2}" fill="#ffffff"><animate attributeName="opacity" dur="${1.5 + r() * 2}s" begin="-${r() * 2}s" repeatCount="indefinite" values="0;1;0"/></circle>`).join('');
    default:
      return '';
  }
}

/** Full <svg> inner markup for a biome (same 1000x1000 viewBox as the stadium). */
export function wildArenaMarkup(biome: WildBiome, seed = 7): string {
  const L = LOOKS[biome];
  const r = rng(seed * 101 + biome.length * 7);
  const defs = `<defs>
    <linearGradient id="wa-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.sky[0]}"/><stop offset="0.6" stop-color="${L.sky[1]}"/><stop offset="1" stop-color="${L.sky[2]}"/></linearGradient>
    <linearGradient id="wa-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.ground[0]}"/><stop offset="1" stop-color="${L.ground[1]}"/></linearGradient>
    <linearGradient id="wa-farshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/><stop offset="1" stop-color="#000000" stop-opacity="0.25"/></linearGradient>
    <linearGradient id="wa-ray" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbeb" stop-opacity="0.7"/><stop offset="1" stop-color="#fffbeb" stop-opacity="0"/></linearGradient>
    <linearGradient id="wa-shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd" stop-opacity="0.6"/><stop offset="1" stop-color="#bae6fd" stop-opacity="0"/></linearGradient>
    <linearGradient id="wa-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0f2f1" stop-opacity="0"/><stop offset="0.5" stop-color="#e0f2f1" stop-opacity="0.55"/><stop offset="1" stop-color="#e0f2f1" stop-opacity="0"/></linearGradient>
    <radialGradient id="wa-vig" cx="50%" cy="55%" r="70%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#020617" stop-opacity="${0.45 + (L.dark || 0)}"/></radialGradient>
  </defs>`;
  const clouds = L.far === 'cavewall' ? '' : `<g fill="#ffffff" opacity="0.5">${Array.from({ length: 5 }, () => `<ellipse cx="${r() * 1000}" cy="${130 + r() * 150}" rx="${70 + r() * 90}" ry="${14 + r() * 12}"/>`).join('')}</g>`;
  const water = L.water
    ? Array.from({ length: 14 }, (_, i) => {
        const y = HORIZON + 30 + i * 40;
        return `<path d="M0 ${y} Q 250 ${y - 6} 500 ${y} T 1000 ${y}" stroke="#ffffff" stroke-width="${1 + i * 0.15}" fill="none" opacity="0.22"><animate attributeName="opacity" dur="${3 + (i % 3)}s" repeatCount="indefinite" values="0.1;0.3;0.1"/></path>`;
      }).join('')
    : '';
  return (
    defs +
    `<rect width="1000" height="${HORIZON + 10}" fill="url(#wa-sky)"/>` +
    clouds +
    farLayer(L, r) +
    `<rect y="${HORIZON}" width="1000" height="${1000 - HORIZON}" fill="url(#wa-ground)"/>` +
    midLayer(L, r) +
    water +
    details(L, r) +
    platform(728, 532, 150, 38, L) +
    platform(250, 774, 215, 54, L) +
    foreground(L, r) +
    effects(L, r) +
    (L.dark ? `<rect width="1000" height="1000" fill="#000814" opacity="${L.dark}"/>` : '') +
    `<rect width="1000" height="1000" fill="url(#wa-vig)"/>`
  );
}

let stadiumMarkup: string | null = null;

/** Swap the battle backdrop: 'stadium' for trainer / Gym / League battles, a biome for wild battles. */
export function setBattleArena(kind: 'stadium' | WildBiome, seed?: number): void {
  const bg = document.getElementById('bg');
  if (!bg) return;
  if (stadiumMarkup === null) stadiumMarkup = bg.innerHTML;
  if (kind === 'stadium') {
    if (bg.dataset.arena !== 'stadium') bg.innerHTML = stadiumMarkup;
    bg.dataset.arena = 'stadium';
    return;
  }
  bg.innerHTML = wildArenaMarkup(kind, seed);
  bg.dataset.arena = kind;
}
