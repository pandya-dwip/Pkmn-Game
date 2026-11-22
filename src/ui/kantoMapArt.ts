/**
 * Illustrated, cartographic artwork for the Kanto world map (viewBox 0 0 1000 750).
 *
 * Everything here is static scenery: coastline with depth bands, textured terrain,
 * shaded mountain ranges, tree-cluster forests, rivers, lakes and town footprints.
 * It is generated procedurally from a fixed seed, so it is identical every time,
 * and cached as a string after the first build.
 */

type Pt = [number, number];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);

/** Closed Catmull-Rom spline through the points, as an SVG path. */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  let d = `M ${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + ' Z';
}

/** Open Catmull-Rom spline (for rivers). */
function smoothOpen(pts: Pt[]): string {
  let d = `M ${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

/** Adds small perpendicular wobbles between control points for a natural shoreline. */
function roughen(pts: Pt[], amp: number, seed: number): Pt[] {
  const r = rng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const steps = Math.max(1, Math.round(len / 28));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const off = (r() - 0.5) * 2 * amp;
      out.push([a[0] + dx * t - (dy / len) * off, a[1] + dy * t + (dx / len) * off]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- geography

const MAINLAND: Pt[] = [
  [62, 96], [150, 72], [262, 84], [336, 62], [424, 80], [520, 64], [612, 82], [700, 56],
  [772, 66], [806, 92], [792, 128], [862, 140], [920, 190], [952, 262], [934, 330],
  [960, 402], [930, 470], [882, 522], [826, 560], [800, 604], [758, 626], [718, 600],
  [692, 570], [656, 598], [632, 656], [570, 690], [502, 672], [470, 622], [420, 602],
  [360, 612], [300, 584], [258, 600], [214, 588], [164, 594], [110, 562], [72, 502],
  [50, 420], [66, 340], [42, 262], [54, 172],
];

const CINNABAR: Pt[] = [[168, 646], [214, 632], [262, 652], [270, 700], [240, 732], [186, 730], [156, 696]];
const SEAFOAM_A: Pt[] = [[350, 676], [384, 664], [416, 678], [410, 704], [372, 712], [346, 698]];
const SEAFOAM_B: Pt[] = [[418, 694], [446, 688], [462, 704], [446, 720], [420, 716]];
const CORAL: Pt[] = [[846, 650], [878, 640], [904, 654], [898, 678], [864, 684], [842, 670]];
const ISLETS: Pt[][] = [
  [[968, 548], [982, 556], [976, 570], [962, 566]],
  [[300, 690], [314, 684], [320, 698], [306, 704]],
  [[24, 600], [40, 594], [46, 610], [30, 616]],
  [[540, 726], [556, 720], [562, 734], [546, 740]],
];

const LAKES: Pt[][] = [
  [[602, 176], [628, 164], [650, 178], [646, 204], [618, 212], [598, 198]], // Cerulean lake
  [[566, 410], [588, 402], [604, 416], [596, 434], [572, 436]], // Saffron reservoir
  [[118, 380], [134, 372], [146, 384], [138, 398], [120, 396]], // Viridian tarn
];

const RIVERS: { pts: Pt[]; w: number }[] = [
  // Cerulean river: north coast -> lake -> east of Saffron -> Vermilion harbour
  { pts: [[640, 60], [636, 100], [626, 140], [624, 168]], w: 5 },
  { pts: [[648, 196], [700, 228], [742, 280], [748, 350], [732, 420], [712, 480], [700, 540], [694, 574]], w: 7 },
  // Mt. Moon meltwater south past Celadon to the southern coast
  { pts: [[440, 238], [452, 280], [432, 330], [412, 390], [404, 450], [392, 520], [380, 606]], w: 5.5 },
  // Western stream from the Indigo highlands down past Viridian
  { pts: [[150, 170], [140, 230], [126, 300], [128, 376]], w: 3.5 },
  { pts: [[136, 396], [150, 460], [136, 520], [112, 560]], w: 4 },
  // Eastern brook off the Rock Tunnel ridge
  { pts: [[870, 282], [882, 360], [900, 430], [910, 476]], w: 3.5 },
];

interface Range { cx: number; cy: number; rx: number; ry: number; n: number; size: number; seed: number; snow: boolean }
const RANGES: Range[] = [
  { cx: 108, cy: 128, rx: 62, ry: 46, n: 15, size: 1.15, seed: 11, snow: true }, // Indigo / Victory Road
  { cx: 432, cy: 198, rx: 104, ry: 36, n: 20, size: 1.05, seed: 23, snow: true }, // Mt. Moon massif
  { cx: 852, cy: 238, rx: 52, ry: 44, n: 12, size: 0.95, seed: 37, snow: false }, // Rock Tunnel ridge
  { cx: 262, cy: 132, rx: 36, ry: 22, n: 6, size: 0.7, seed: 41, snow: false }, // Pewter foothills
  { cx: 780, cy: 100, rx: 22, ry: 14, n: 4, size: 0.6, seed: 43, snow: false }, // Cerulean cape bluffs
  { cx: 216, cy: 688, rx: 14, ry: 10, n: 1, size: 1.0, seed: 47, snow: false }, // Cinnabar volcano (drawn separately)
];

interface Woods { cx: number; cy: number; rx: number; ry: number; n: number; seed: number; tone: 'deep' | 'mid' | 'light' }
const FORESTS: Woods[] = [
  { cx: 208, cy: 338, rx: 62, ry: 44, n: 80, seed: 101, tone: 'deep' }, // Viridian Forest
  { cx: 150, cy: 296, rx: 30, ry: 22, n: 22, seed: 102, tone: 'deep' }, // Whispering Thicket
  { cx: 560, cy: 566, rx: 62, ry: 36, n: 70, seed: 103, tone: 'mid' }, // Safari Zone
  { cx: 444, cy: 548, rx: 30, ry: 22, n: 22, seed: 104, tone: 'deep' }, // Mossveil Grove
  { cx: 318, cy: 270, rx: 34, ry: 24, n: 22, seed: 105, tone: 'mid' },
  { cx: 560, cy: 250, rx: 44, ry: 26, n: 28, seed: 106, tone: 'light' },
  { cx: 820, cy: 400, rx: 44, ry: 34, n: 30, seed: 107, tone: 'mid' },
  { cx: 300, cy: 470, rx: 34, ry: 26, n: 22, seed: 108, tone: 'light' },
  { cx: 860, cy: 180, rx: 30, ry: 16, n: 14, seed: 109, tone: 'deep' },
  { cx: 540, cy: 120, rx: 40, ry: 18, n: 20, seed: 110, tone: 'mid' },
  { cx: 92, cy: 470, rx: 24, ry: 34, n: 18, seed: 111, tone: 'mid' },
  { cx: 620, cy: 470, rx: 28, ry: 20, n: 14, seed: 112, tone: 'light' },
];

/** Town footprints drawn beneath the city pins so settlements read as real places. */
const TOWNS: { x: number; y: number; r: number; n: number; seed: number; roof: string }[] = [
  { x: 210, y: 530, r: 30, n: 16, seed: 201, roof: '#b45309' },
  { x: 210, y: 210, r: 28, n: 16, seed: 202, roof: '#78716c' },
  { x: 680, y: 175, r: 32, n: 18, seed: 203, roof: '#2563eb' },
  { x: 680, y: 520, r: 34, n: 20, seed: 204, roof: '#c2410c' },
  { x: 470, y: 345, r: 36, n: 22, seed: 205, roof: '#15803d' },
  { x: 560, y: 630, r: 30, n: 16, seed: 206, roof: '#be185d' },
  { x: 680, y: 345, r: 40, n: 28, seed: 207, roof: '#a16207' },
  { x: 210, y: 676, r: 18, n: 9, seed: 208, roof: '#b91c1c' },
  { x: 210, y: 440, r: 22, n: 10, seed: 209, roof: '#4d7c0f' },
  { x: 110, y: 140, r: 24, n: 10, seed: 210, roof: '#4338ca' },
];

// ---------------------------------------------------------------- builders

function islandPaths(): { d: string; volcanic?: boolean }[] {
  return [
    { d: smoothClosed(roughen(MAINLAND, 6, 7)) },
    { d: smoothClosed(roughen(CINNABAR, 3, 8)), volcanic: true },
    { d: smoothClosed(roughen(SEAFOAM_A, 2.5, 9)) },
    { d: smoothClosed(roughen(SEAFOAM_B, 2, 10)) },
    { d: smoothClosed(roughen(CORAL, 2.5, 12)) },
    ...ISLETS.map((p, i) => ({ d: smoothClosed(roughen(p, 1, 20 + i)) })),
  ];
}

function mountainRange(rg: Range): string {
  const r = rng(rg.seed);
  const peaks: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < rg.n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = rg.cx + Math.cos(a) * rg.rx * d;
    const y = rg.cy + Math.sin(a) * rg.ry * d;
    const centre = 1 - d * 0.55; // tallest peaks in the middle of the range
    const h = (18 + r() * 18) * rg.size * centre + 8;
    peaks.push({ x, y, w: h * (1.25 + r() * 0.45), h });
  }
  peaks.sort((p, q) => p.y - q.y);
  let s = '';
  for (const p of peaks) {
    const bl = p.x - p.w / 2;
    const br = p.x + p.w / 2;
    const tx = p.x + (r() - 0.5) * p.w * 0.18;
    const ty = p.y - p.h;
    const midL: Pt = [bl + (tx - bl) * 0.55, p.y - p.h * 0.52 + (r() - 0.5) * 4];
    const midR: Pt = [tx + (br - tx) * 0.45, p.y - p.h * 0.5 + (r() - 0.5) * 4];
    // Ground shadow, then lit west face and shaded east face (light from the north-west).
    s += `<ellipse cx="${f1(p.x + 4)}" cy="${f1(p.y + 1)}" rx="${f1(p.w * 0.55)}" ry="${f1(p.h * 0.14)}" fill="#1f2a1a" opacity="0.22"/>`;
    s += `<path d="M${f1(bl)} ${f1(p.y)} L${f1(midL[0])} ${f1(midL[1])} L${f1(tx)} ${f1(ty)} L${f1(tx + p.w * 0.04)} ${f1(p.y)} Z" fill="url(#kmRockLit)"/>`;
    s += `<path d="M${f1(tx)} ${f1(ty)} L${f1(midR[0])} ${f1(midR[1])} L${f1(br)} ${f1(p.y)} L${f1(tx + p.w * 0.04)} ${f1(p.y)} Z" fill="url(#kmRockShade)"/>`;
    s += `<path d="M${f1(tx)} ${f1(ty)} L${f1(tx + p.w * 0.04)} ${f1(p.y)}" stroke="#3b2f22" stroke-width="0.6" opacity="0.45"/>`;
    if (rg.snow && p.h > 26) {
      const k = 0.3;
      const sl: Pt = [tx + (bl - tx) * k, ty + p.h * k];
      const sr: Pt = [tx + (br - tx) * k, ty + p.h * k];
      s += `<path d="M${f1(tx)} ${f1(ty)} L${f1(sl[0])} ${f1(sl[1])} L${f1(sl[0] + (tx - sl[0]) * 0.4)} ${f1(sl[1] - 2)} L${f1(tx)} ${f1(sl[1] + 1.5)} L${f1(sr[0] - (sr[0] - tx) * 0.35)} ${f1(sr[1] - 2.5)} L${f1(sr[0])} ${f1(sr[1])} Z" fill="#f8fafc" opacity="0.95"/>`;
    }
  }
  return s;
}

function forest(w: Woods): string {
  const r = rng(w.seed);
  const pal = {
    deep: ['#1f4d2b', '#24582f', '#2a6235', '#1b4426'],
    mid: ['#2f6b34', '#367a3a', '#3e8540', '#2c6331'],
    light: ['#4a8a3d', '#559645', '#5fa04c', '#47823b'],
  }[w.tone];
  const trees: { x: number; y: number; s: number; c: string }[] = [];
  for (let i = 0; i < w.n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    trees.push({
      x: w.cx + Math.cos(a) * w.rx * d,
      y: w.cy + Math.sin(a) * w.ry * d,
      s: 3.6 + r() * 3.2,
      c: pal[Math.floor(r() * pal.length)],
    });
  }
  trees.sort((p, q) => p.y - q.y);
  let shadows = '';
  let crowns = '';
  for (const t of trees) {
    shadows += `<circle cx="${f1(t.x + 1.8)}" cy="${f1(t.y + 2)}" r="${f1(t.s)}"/>`;
    crowns += `<circle cx="${f1(t.x)}" cy="${f1(t.y)}" r="${f1(t.s)}" fill="${t.c}"/>`;
    crowns += `<circle cx="${f1(t.x - t.s * 0.32)}" cy="${f1(t.y - t.s * 0.34)}" r="${f1(t.s * 0.42)}" fill="#ffffff" opacity="0.13"/>`;
  }
  // Soft understorey so the canopy reads as one continuous wood.
  const floor = `<ellipse cx="${w.cx}" cy="${w.cy}" rx="${w.rx * 1.05}" ry="${w.ry * 1.05}" fill="${pal[0]}" opacity="0.35" filter="url(#kmSoft)"/>`;
  return `${floor}<g fill="#10240f" opacity="0.35">${shadows}</g>${crowns}`;
}

function town(t: (typeof TOWNS)[number]): string {
  const r = rng(t.seed);
  let s = `<circle cx="${t.x}" cy="${t.y}" r="${t.r}" fill="#d9cfb4" opacity="0.55" filter="url(#kmSoft)"/>`;
  for (let i = 0; i < t.n; i++) {
    const a = r() * Math.PI * 2;
    const d = t.r * (0.45 + r() * 0.5);
    const x = t.x + Math.cos(a) * d;
    const y = t.y + Math.sin(a) * d * 0.8;
    const w = 4 + r() * 4;
    const h = 3 + r() * 3;
    s += `<rect x="${f1(x - w / 2 + 0.8)}" y="${f1(y - h / 2 + 0.9)}" width="${f1(w)}" height="${f1(h)}" fill="#000" opacity="0.18"/>`;
    s += `<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="0.6" fill="${r() < 0.6 ? t.roof : '#e7e5e4'}" stroke="#44403c" stroke-width="0.35"/>`;
  }
  return s;
}

function graticule(): string {
  let s = '';
  for (let x = 125; x < 1000; x += 125) s += `<line x1="${x}" y1="0" x2="${x}" y2="750"/>`;
  for (let y = 125; y < 750; y += 125) s += `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`;
  return `<g stroke="#e0f2fe" stroke-width="0.6" opacity="0.12" stroke-dasharray="2 5">${s}</g>`;
}

function waves(): string {
  const r = rng(301);
  let s = '';
  for (let i = 0; i < 46; i++) {
    const x = r() * 1000;
    const y = r() * 750;
    const w = 6 + r() * 8;
    s += `<path d="M${f1(x)} ${f1(y)} q${f1(w / 2)} -${f1(w / 3)} ${f1(w)} 0 q${f1(w / 2)} -${f1(w / 3)} ${f1(w)} 0"/>`;
  }
  return `<g fill="none" stroke="#dbeafe" stroke-width="0.9" opacity="0.22" stroke-linecap="round">${s}</g>`;
}

let cachedTerrain: string | null = null;

/** Static terrain SVG (defs + all scenery), built once. Roads are drawn on top by the caller. */
export function renderKantoTerrainSVG(): string {
  if (cachedTerrain) return cachedTerrain;

  const isles = islandPaths();
  const mainland = isles[0].d;
  const allLand = isles.map(i => i.d).join(' ');

  const lakeDs = LAKES.map((l, i) => smoothClosed(roughen(l, 1.5, 60 + i)));
  const rivers = RIVERS.map(rv => {
    const d = smoothOpen(rv.pts);
    return `<path d="${d}" stroke="#d6e6c8" stroke-width="${rv.w + 3.5}" opacity="0.55"/>` +
      `<path d="${d}" stroke="url(#kmRiver)" stroke-width="${rv.w}"/>` +
      `<path d="${d}" stroke="#bde0fe" stroke-width="${f1(rv.w * 0.28)}" opacity="0.6" stroke-dasharray="6 10"/>`;
  }).join('');

  const ranges = RANGES.slice(0, 5).map(mountainRange).join('');
  const forests = FORESTS.map(forest).join('');
  const towns = TOWNS.map(town).join('');

  cachedTerrain = `
    <defs>
      <radialGradient id="kmOcean" cx="45%" cy="40%" r="75%">
        <stop offset="0%" stop-color="#2a7fb0"/>
        <stop offset="55%" stop-color="#1c6496"/>
        <stop offset="100%" stop-color="#0f3f6b"/>
      </radialGradient>
      <linearGradient id="kmLand" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stop-color="#7fa65a"/>
        <stop offset="45%" stop-color="#8fb563"/>
        <stop offset="100%" stop-color="#9cbd6b"/>
      </linearGradient>
      <linearGradient id="kmRockLit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8b48f"/>
        <stop offset="100%" stop-color="#9a8462"/>
      </linearGradient>
      <linearGradient id="kmRockShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7b6a52"/>
        <stop offset="100%" stop-color="#5a4c3a"/>
      </linearGradient>
      <linearGradient id="kmRiver" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4f9fd0"/>
        <stop offset="100%" stop-color="#2f80bd"/>
      </linearGradient>
      <radialGradient id="kmHighland">
        <stop offset="0%" stop-color="#b59a66" stop-opacity="0.75"/>
        <stop offset="60%" stop-color="#a68d5c" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#a68d5c" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="kmMeadow">
        <stop offset="0%" stop-color="#b7cf7d" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#b7cf7d" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="kmLowland">
        <stop offset="0%" stop-color="#5f8f48" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#5f8f48" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="kmLava">
        <stop offset="0%" stop-color="#fb923c"/>
        <stop offset="55%" stop-color="#b91c1c"/>
        <stop offset="100%" stop-color="#57534e"/>
      </radialGradient>
      <radialGradient id="kmVignette" cx="50%" cy="50%" r="72%">
        <stop offset="70%" stop-color="#04111f" stop-opacity="0"/>
        <stop offset="100%" stop-color="#04111f" stop-opacity="0.55"/>
      </radialGradient>
      <filter id="kmGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.30  0 0 0 0 0.12  0 0 0 1.4 -0.55"/>
      </filter>
      <filter id="kmSeaNoise" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="9" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.75  0 0 0 0 0.9  0 0 0 0 1  0 0 0 0.9 -0.42"/>
      </filter>
      <filter id="kmSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="kmBlur2"><feGaussianBlur stdDeviation="2"/></filter>
      <filter id="kmLandShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#06233d" flood-opacity="0.55"/>
      </filter>
      <clipPath id="kmLandClip"><path d="${allLand}"/></clipPath>
    </defs>

    <!-- Ocean -->
    <rect width="1000" height="750" fill="url(#kmOcean)"/>
    <rect width="1000" height="750" filter="url(#kmSeaNoise)" opacity="0.5"/>
    ${graticule()}
    ${waves()}

    <!-- Continental shelf: shallows fade out from every coast -->
    <g fill="none" stroke-linejoin="round">
      <path d="${allLand}" stroke="#2d8fbf" stroke-width="88" opacity="0.35"/>
      <path d="${allLand}" stroke="#3ea3cc" stroke-width="54" opacity="0.4"/>
      <path d="${allLand}" stroke="#5cc0da" stroke-width="28" opacity="0.45"/>
      <path d="${allLand}" stroke="#8fdbe6" stroke-width="12" opacity="0.6"/>
      <path d="${allLand}" stroke="#ffffff" stroke-width="16" opacity="0.18" stroke-dasharray="1 9" stroke-linecap="round"/>
    </g>

    <!-- Beaches, then land -->
    <path d="${allLand}" fill="#e6d3a3" stroke="#e9d9ad" stroke-width="6" stroke-linejoin="round" filter="url(#kmLandShadow)"/>
    <path d="${mainland}" fill="url(#kmLand)"/>
    ${isles.slice(1).map(i => `<path d="${i.d}" fill="${i.volcanic ? '#8a8f63' : '#93b867'}"/>`).join('')}

    <!-- Terrain relief, all clipped to the land -->
    <g clip-path="url(#kmLandClip)">
      <ellipse cx="110" cy="140" rx="120" ry="95" fill="url(#kmHighland)"/>
      <ellipse cx="432" cy="190" rx="170" ry="80" fill="url(#kmHighland)"/>
      <ellipse cx="855" cy="235" rx="95" ry="85" fill="url(#kmHighland)"/>
      <ellipse cx="270" cy="130" rx="70" ry="45" fill="url(#kmHighland)"/>
      <ellipse cx="360" cy="410" rx="120" ry="70" fill="url(#kmMeadow)"/>
      <ellipse cx="760" cy="470" rx="110" ry="60" fill="url(#kmMeadow)"/>
      <ellipse cx="540" cy="460" rx="90" ry="60" fill="url(#kmMeadow)"/>
      <ellipse cx="560" cy="600" rx="120" ry="70" fill="url(#kmLowland)"/>
      <ellipse cx="190" cy="350" rx="110" ry="80" fill="url(#kmLowland)"/>
      <rect width="1000" height="750" filter="url(#kmGrain)" opacity="0.55"/>
      <!-- Inland coastal edge: darker rim just inside the beach -->
      <path d="${allLand}" fill="none" stroke="#6d8f47" stroke-width="10" opacity="0.35" filter="url(#kmBlur2)"/>
    </g>

    <!-- Lakes -->
    ${lakeDs.map(d => `<path d="${d}" fill="#3a8fc4" stroke="#d6e6c8" stroke-width="2.5" opacity="0.95"/>`).join('')}

    <!-- Rivers -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">${rivers}</g>

    <!-- Forests -->
    ${forests}

    <!-- Mountain ranges -->
    ${ranges}

    <!-- Cinnabar volcano -->
    <ellipse cx="216" cy="690" rx="30" ry="9" fill="#2b2620" opacity="0.25"/>
    <path d="M186 690 L206 664 L226 664 L246 690 Z" fill="#6b5b4b"/>
    <path d="M216 664 L226 664 L246 690 L222 690 Z" fill="#4a3f35"/>
    <ellipse cx="216" cy="664" rx="10" ry="3.2" fill="url(#kmLava)"/>
    <path d="M214 662 q-6 -10 2 -18 q6 -6 1 -14" fill="none" stroke="#e7e5e4" stroke-width="3" opacity="0.35" stroke-linecap="round" filter="url(#kmBlur2)"/>

    <!-- Seafoam ice -->
    <g fill="#f0fdff" opacity="0.8">
      <path d="M368 684 l6 -8 l6 8 z"/><path d="M386 690 l7 -10 l7 10 z"/><path d="M434 702 l5 -7 l5 7 z"/>
    </g>

    <!-- Coral Isle lighthouse -->
    <rect x="871" y="648" width="4" height="12" fill="#f8fafc" stroke="#7f1d1d" stroke-width="0.6"/>
    <rect x="871" y="652" width="4" height="2.5" fill="#dc2626"/>
    <circle cx="873" cy="647" r="3" fill="#fde68a" opacity="0.9"/>

    <!-- Towns -->
    ${towns}

    <!-- Sea names -->
    <g font-family="Georgia, 'Times New Roman', serif" font-style="italic" fill="#dbeafe" text-anchor="middle" opacity="0.6">
      <text x="700" y="728" font-size="17" letter-spacing="9">KANTO SEA</text>
      <text x="972" y="140" font-size="10" letter-spacing="3" transform="rotate(90 972 140)">Eastern Gulf</text>
      <text x="460" y="30" font-size="11" letter-spacing="6">NORTHERN STRAIT</text>
    </g>

    <!-- Vignette -->
    <rect width="1000" height="750" fill="url(#kmVignette)" pointer-events="none"/>
  `;
  return cachedTerrain;
}

/** Gently curved road between two map points; the bend direction is stable per pair. */
export function routeCurve(x1: number, y1: number, x2: number, y2: number, key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const bend = (h & 1 ? 1 : -1) * Math.min(38, len * 0.12);
  const cx = (x1 + x2) / 2 - (dy / len) * bend;
  const cy = (y1 + y2) / 2 + (dx / len) * bend;
  return `M ${f1(x1)} ${f1(y1)} Q ${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}`;
}
