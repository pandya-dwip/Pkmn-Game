/**
 * cosmetics.ts
 * A small, curated cosmetic catalogue layered on top of the 8 base trainers.
 * Cosmetics are purely visual (no stat effects). A player's appearance is the
 * base trainer plus one choice per slot; 'default' keeps the base look.
 */

import { TrainerCustomization, getTrainerById } from './characters';

export type CosmeticSlot = 'outfit' | 'hat' | 'hairStyle' | 'hairColor' | 'backpack' | 'accessory';

export type CosmeticUnlock =
  | { kind: 'default' }
  | { kind: 'badges'; count: number }
  | { kind: 'champion' }
  | { kind: 'reward'; source: string }; // granted by a quest / discovery

export interface CosmeticDef {
  id: string;
  slot: CosmeticSlot;
  name: string;
  swatch: string; // preview colour chip
  unlock: CosmeticUnlock;
  apply: (t: TrainerCustomization) => void;
}

export type PlayerAppearance = Partial<Record<CosmeticSlot, string>>;

export interface UnlockContext {
  badges: number;
  champion: boolean;
  rewards: string[]; // cosmetic ids granted by quests / exploration
}

const free: CosmeticUnlock = { kind: 'default' };
const keep = () => {};

const outfit = (top: string, sec: string, bottom: string, bottomSec: string, shoes: string, bottomType?: TrainerCustomization['style']['bottomType']) =>
  (t: TrainerCustomization) => {
    t.palette.topMain = top;
    t.palette.topSec = sec;
    t.palette.bottomMain = bottom;
    t.palette.bottomSec = bottomSec;
    t.palette.shoesMain = shoes;
    if (bottomType) t.style.bottomType = bottomType;
  };

const hat = (type: TrainerCustomization['style']['hatType'], main?: string, sec?: string) => (t: TrainerCustomization) => {
  t.style.hatType = type;
  if (main) t.palette.hatMain = main;
  if (sec) t.palette.hatSec = sec;
};

const hair = (style: TrainerCustomization['style']['hairStyle']) => (t: TrainerCustomization) => {
  t.style.hairStyle = style;
};

const hairColor = (c: string, hi: string) => (t: TrainerCustomization) => {
  t.palette.hair = c;
  t.palette.hairHighlight = hi;
};

const pack = (main: string, sec: string) => (t: TrainerCustomization) => {
  t.palette.backpackMain = main;
  t.palette.backpackSec = sec;
};

const clearAccessories = (t: TrainerCustomization) => {
  t.style.hasGlasses = false;
  t.style.hasScarf = false;
  t.style.hasRibbon = false;
  t.style.hasSatchel = false;
};

export const COSMETICS: CosmeticDef[] = [
  // Outfits
  { id: 'outfit_default', slot: 'outfit', name: 'Signature', swatch: '#64748b', unlock: free, apply: keep },
  { id: 'outfit_trail', slot: 'outfit', name: 'Trail Runner', swatch: '#0d9488', unlock: free, apply: outfit('#0d9488', '#f0fdfa', '#334155', '#475569', '#f97316', 'shorts') },
  { id: 'outfit_ranger', slot: 'outfit', name: 'Field Ranger', swatch: '#4d7c0f', unlock: free, apply: outfit('#4d7c0f', '#fef3c7', '#57534e', '#78716c', '#78350f', 'jeans') },
  { id: 'outfit_coastal', slot: 'outfit', name: 'Harbour Stripe', swatch: '#1d4ed8', unlock: { kind: 'badges', count: 3 }, apply: outfit('#1d4ed8', '#f8fafc', '#f8fafc', '#cbd5e1', '#1e3a8a', 'shorts') },
  { id: 'outfit_caver', slot: 'outfit', name: 'Cavern Explorer', swatch: '#92400e', unlock: { kind: 'reward', source: 'quest' }, apply: outfit('#92400e', '#fde68a', '#44403c', '#57534e', '#1c1917', 'overalls') },
  { id: 'outfit_summit', slot: 'outfit', name: 'Summit Parka', swatch: '#ea580c', unlock: { kind: 'reward', source: 'quest' }, apply: outfit('#ea580c', '#fff7ed', '#1e293b', '#334155', '#0f172a', 'jeans') },
  { id: 'outfit_champion', slot: 'outfit', name: 'Champion Coat', swatch: '#b91c1c', unlock: { kind: 'champion' }, apply: outfit('#7f1d1d', '#facc15', '#0f172a', '#1e293b', '#facc15', 'jeans') },

  // Hats
  { id: 'hat_default', slot: 'hat', name: 'Signature', swatch: '#64748b', unlock: free, apply: keep },
  { id: 'hat_none', slot: 'hat', name: 'No Hat', swatch: '#1e293b', unlock: free, apply: hat('none') },
  { id: 'hat_cap', slot: 'hat', name: 'Trainer Cap', swatch: '#dc2626', unlock: free, apply: hat('baseball_cap', '#dc2626', '#ffffff') },
  { id: 'hat_beanie', slot: 'hat', name: 'Knit Beanie', swatch: '#059669', unlock: free, apply: hat('beanie', '#059669', '#ecfdf5') },
  { id: 'hat_sun', slot: 'hat', name: 'Sun Hat', swatch: '#fef3c7', unlock: free, apply: hat('sunhat', '#fefce8', '#0ea5e9') },
  { id: 'hat_sailor', slot: 'hat', name: 'Sailor Cap', swatch: '#f8fafc', unlock: { kind: 'reward', source: 'quest' }, apply: hat('sailor_cap', '#f8fafc', '#1e3a8a') },
  { id: 'hat_helmet', slot: 'hat', name: 'Headlamp Helmet', swatch: '#f59e0b', unlock: { kind: 'reward', source: 'quest' }, apply: hat('helmet', '#f59e0b') },
  { id: 'hat_gold', slot: 'hat', name: 'Gold-Trim Cap', swatch: '#facc15', unlock: { kind: 'badges', count: 8 }, apply: hat('baseball_cap', '#0f172a', '#facc15') },

  // Hairstyles
  { id: 'hair_default', slot: 'hairStyle', name: 'Signature', swatch: '#64748b', unlock: free, apply: keep },
  { id: 'hair_spiky', slot: 'hairStyle', name: 'Spiky', swatch: '#292524', unlock: free, apply: hair('spiky') },
  { id: 'hair_short', slot: 'hairStyle', name: 'Short Trim', swatch: '#292524', unlock: free, apply: hair('short_trim') },
  { id: 'hair_shaggy', slot: 'hairStyle', name: 'Shaggy', swatch: '#292524', unlock: free, apply: hair('wavy_shaggy') },
  { id: 'hair_long', slot: 'hairStyle', name: 'Long Fringe', swatch: '#292524', unlock: free, apply: hair('long_fringe') },
  { id: 'hair_ponytail', slot: 'hairStyle', name: 'Ponytail', swatch: '#292524', unlock: free, apply: hair('ponytail') },
  { id: 'hair_twin', slot: 'hairStyle', name: 'Twin Tails', swatch: '#292524', unlock: free, apply: hair('twin_tails') },
  { id: 'hair_buns', slot: 'hairStyle', name: 'Buns', swatch: '#292524', unlock: free, apply: hair('buns_curls') },

  // Hair colours
  { id: 'hc_default', slot: 'hairColor', name: 'Signature', swatch: '#64748b', unlock: free, apply: keep },
  { id: 'hc_black', slot: 'hairColor', name: 'Ink Black', swatch: '#1c1917', unlock: free, apply: hairColor('#1c1917', '#44403c') },
  { id: 'hc_brown', slot: 'hairColor', name: 'Chestnut', swatch: '#78350f', unlock: free, apply: hairColor('#78350f', '#92400e') },
  { id: 'hc_blonde', slot: 'hairColor', name: 'Honey Blonde', swatch: '#ca8a04', unlock: free, apply: hairColor('#ca8a04', '#eab308') },
  { id: 'hc_auburn', slot: 'hairColor', name: 'Auburn', swatch: '#9a3412', unlock: free, apply: hairColor('#9a3412', '#c2410c') },
  { id: 'hc_navy', slot: 'hairColor', name: 'Midnight', swatch: '#1e3a8a', unlock: free, apply: hairColor('#1e3a8a', '#2563eb') },
  { id: 'hc_silver', slot: 'hairColor', name: 'Silver', swatch: '#cbd5e1', unlock: { kind: 'champion' }, apply: hairColor('#cbd5e1', '#f1f5f9') },

  // Backpacks
  { id: 'bp_default', slot: 'backpack', name: 'Signature', swatch: '#64748b', unlock: free, apply: keep },
  { id: 'bp_forest', slot: 'backpack', name: 'Forest', swatch: '#15803d', unlock: free, apply: pack('#15803d', '#facc15') },
  { id: 'bp_crimson', slot: 'backpack', name: 'Crimson', swatch: '#b91c1c', unlock: free, apply: pack('#b91c1c', '#fecaca') },
  { id: 'bp_navy', slot: 'backpack', name: 'Navy', swatch: '#1e3a8a', unlock: free, apply: pack('#1e3a8a', '#93c5fd') },
  { id: 'bp_explorer', slot: 'backpack', name: 'Leather Explorer', swatch: '#78350f', unlock: { kind: 'reward', source: 'quest' }, apply: pack('#78350f', '#d97706') },
  { id: 'bp_league', slot: 'backpack', name: 'League Gold', swatch: '#eab308', unlock: { kind: 'badges', count: 8 }, apply: pack('#eab308', '#0f172a') },

  // Accessories
  { id: 'acc_default', slot: 'accessory', name: 'Signature', swatch: '#64748b', unlock: free, apply: keep },
  { id: 'acc_none', slot: 'accessory', name: 'None', swatch: '#1e293b', unlock: free, apply: clearAccessories },
  { id: 'acc_glasses', slot: 'accessory', name: 'Glasses', swatch: '#0f172a', unlock: free, apply: t => { clearAccessories(t); t.style.hasGlasses = true; } },
  { id: 'acc_scarf', slot: 'accessory', name: 'Scarf', swatch: '#ef4444', unlock: free, apply: t => { clearAccessories(t); t.style.hasScarf = true; t.palette.accessoryMain = '#ef4444'; } },
  { id: 'acc_ribbon', slot: 'accessory', name: 'Hair Ribbon', swatch: '#ec4899', unlock: free, apply: t => { clearAccessories(t); t.style.hasRibbon = true; t.palette.accessoryMain = '#ec4899'; } },
  { id: 'acc_satchel', slot: 'accessory', name: 'Satchel', swatch: '#a16207', unlock: { kind: 'badges', count: 2 }, apply: t => { clearAccessories(t); t.style.hasSatchel = true; } },
];

export const SLOT_ORDER: { slot: CosmeticSlot; label: string }[] = [
  { slot: 'outfit', label: 'Outfit' },
  { slot: 'hat', label: 'Hat' },
  { slot: 'hairStyle', label: 'Hairstyle' },
  { slot: 'hairColor', label: 'Hair Colour' },
  { slot: 'backpack', label: 'Backpack' },
  { slot: 'accessory', label: 'Accessory' },
];

export function getCosmetic(id?: string): CosmeticDef | undefined {
  return id ? COSMETICS.find(c => c.id === id) : undefined;
}

export function isCosmeticUnlocked(c: CosmeticDef, ctx: UnlockContext): boolean {
  switch (c.unlock.kind) {
    case 'default':
      return true;
    case 'badges':
      return ctx.badges >= c.unlock.count;
    case 'champion':
      return ctx.champion;
    case 'reward':
      return ctx.rewards.includes(c.id);
  }
}

export function describeUnlock(c: CosmeticDef): string {
  switch (c.unlock.kind) {
    case 'default':
      return '';
    case 'badges':
      return `Earn ${c.unlock.count} badges`;
    case 'champion':
      return 'Become Champion';
    case 'reward':
      return 'Side-quest reward';
  }
}

/**
 * Resolve the full drawable appearance. Results are memoised per
 * (base, appearance) so renderers can rely on object identity for caching.
 */
const resolved = new Map<string, TrainerCustomization>();
export function resolveAppearance(baseId: string | undefined, appearance?: PlayerAppearance | null, ctx?: UnlockContext): TrainerCustomization {
  const base = getTrainerById(baseId);
  const slots = SLOT_ORDER.map(s => {
    const c = getCosmetic(appearance?.[s.slot]);
    // Locked or unknown ids silently fall back to the base look.
    return c && c.slot === s.slot && (!ctx || isCosmeticUnlocked(c, ctx)) ? c : undefined;
  });
  const key = base.id + '|' + slots.map(c => c?.id ?? '-').join('|');
  const hit = resolved.get(key);
  if (hit) return hit;
  const t: TrainerCustomization = {
    ...base,
    palette: { ...base.palette },
    style: { ...base.style },
  };
  for (const c of slots) c?.apply(t);
  resolved.set(key, t);
  return t;
}
