/**
 * SaveMigration.ts
 * Brings any older save up to the current schema without losing progress.
 *
 * v1 (original game): no saveVersion, none of the expansion fields.
 * v2 (this expansion): companion, quests, flags, key items, visited areas,
 *    collected world items, cosmetics, pending-evolution journal.
 *
 * The caller backs up the raw v1 string before calling this, and only writes
 * the migrated object back after this returns successfully.
 */

export const CURRENT_SAVE_VERSION = 2;

interface MonLike {
  uid: string;
  id: number;
  lv: number;
  hp: number;
  moves: string[];
}

export interface MigratableSave {
  saveVersion?: number;
  team: MonLike[];
  pcBox?: MonLike[];
  companion?: { uid: string | null; following: boolean };
  quests?: Record<string, unknown>;
  trackedQuest?: string | null;
  flags?: Record<string, boolean>;
  keyItems?: string[];
  visitedAreas?: number[];
  collected?: string[];
  appearance?: Record<string, string>;
  unlockedCosmetics?: string[];
  pendingEvolution?: { uid: string; from: number; to: number; stone?: string | null } | null;
  savedRoutePos?: { routeId: number; x: number; y: number } | null;
  currentRouteId?: number;
}

export interface MigrationReport {
  fromVersion: number;
  notes: string[];
}

export function migrateSave(g: MigratableSave, knownLocationIds: (id: number) => boolean, newUid: () => string): MigrationReport {
  const fromVersion = g.saveVersion ?? 1;
  const notes: string[] = [];

  // --- Pokémon instance integrity ------------------------------------------
  g.pcBox = Array.isArray(g.pcBox) ? g.pcBox : [];
  g.team = (Array.isArray(g.team) ? g.team : []).filter(m => m && typeof m.id === 'number');
  g.pcBox = g.pcBox.filter(m => m && typeof m.id === 'number');
  const seen = new Map<string, MonLike>();
  const dedupe = (list: MonLike[], label: string): MonLike[] =>
    list.filter(m => {
      if (!m.uid) m.uid = newUid();
      const prev = seen.get(m.uid);
      if (!prev) {
        seen.set(m.uid, m);
        return true;
      }
      if (prev === m || JSON.stringify(prev) === JSON.stringify(m)) {
        notes.push(`Removed duplicated ${label} entry ${m.uid}`);
        return false; // exact duplicate of the same instance
      }
      m.uid = newUid(); // distinct Pokémon that collided on uid: keep both
      seen.set(m.uid, m);
      notes.push(`Re-identified colliding Pokémon uid in ${label}`);
      return true;
    });
  g.team = dedupe(g.team, 'party');
  g.pcBox = dedupe(g.pcBox, 'PC');
  for (const m of [...g.team, ...g.pcBox]) {
    if (!Array.isArray(m.moves) || m.moves.length === 0) m.moves = ['Tackle'];
    if (typeof m.hp !== 'number' || Number.isNaN(m.hp)) m.hp = 1;
  }

  // --- New expansion fields with safe defaults ------------------------------
  g.flags = g.flags && typeof g.flags === 'object' ? g.flags : {};
  g.keyItems = Array.isArray(g.keyItems) ? g.keyItems : [];
  g.visitedAreas = Array.isArray(g.visitedAreas) ? g.visitedAreas.filter(n => typeof n === 'number') : [];
  g.collected = Array.isArray(g.collected) ? g.collected : [];
  g.quests = g.quests && typeof g.quests === 'object' ? g.quests : {};
  g.trackedQuest = typeof g.trackedQuest === 'string' && g.trackedQuest in g.quests ? g.trackedQuest : null;
  g.appearance = g.appearance && typeof g.appearance === 'object' ? g.appearance : {};
  g.unlockedCosmetics = Array.isArray(g.unlockedCosmetics) ? g.unlockedCosmetics : [];
  if (g.pendingEvolution && (typeof g.pendingEvolution.uid !== 'string' || typeof g.pendingEvolution.to !== 'number')) g.pendingEvolution = null;
  g.pendingEvolution = g.pendingEvolution ?? null;

  // Companion: defaults to the lead Pokémon; must reference a real party member.
  if (!g.companion || typeof g.companion !== 'object') {
    g.companion = { uid: g.team[0]?.uid ?? null, following: true };
    if (fromVersion < 2) notes.push('Your lead Pokémon now walks with you (change it from the menu).');
  }
  if (g.companion.uid && !g.team.some(m => m.uid === g.companion!.uid)) {
    g.companion.uid = g.team[0]?.uid ?? null;
  }
  g.companion.following = g.companion.following !== false;

  // Location references must point at a place that exists
  if (g.savedRoutePos && !knownLocationIds(g.savedRoutePos.routeId)) {
    notes.push('Moved you back to a known location.');
    g.savedRoutePos = null;
  }
  if (g.currentRouteId !== undefined && !knownLocationIds(g.currentRouteId)) g.currentRouteId = undefined;

  g.saveVersion = CURRENT_SAVE_VERSION;
  return { fromVersion, notes };
}
