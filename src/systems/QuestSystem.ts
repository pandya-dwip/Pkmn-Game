/**
 * QuestSystem.ts
 * Pure quest logic over plain save data: AVAILABLE -> ACTIVE -> COMPLETED.
 *
 * Counted objectives (catch / wild wins / trainers) are event-driven and stored
 * in the quest's state. Everything else (areas visited, landmarks, flags, key
 * items, party checks) is evaluated live from progress state, so it can never
 * double count and stays correct across save/load.
 */

import { QUESTS, QuestDef, QuestObjective, QuestReward, getQuestDef } from '../data/quests';

export interface QuestState {
  status: 'active' | 'completed';
  counts: number[];
  trainers?: string[];
  acceptedAt: number;
  completedAt?: number;
  rewarded?: boolean;
}

export type QuestLog = Record<string, QuestState>;

/** Snapshot of the player's progress used for availability and live objectives. */
export interface QuestWorld {
  badges: number;
  flags: Record<string, boolean>;
  keyItems: string[];
  visited: number[];
  party: { id: number; lv: number; types: string[] }[];
  bag: Record<string, number>;
}

export type QuestEvent =
  | { kind: 'catch'; speciesId: number; types: string[]; areaId: number }
  | { kind: 'wild_win'; areaId: number }
  | { kind: 'defeat_trainer'; trainerId: string };

export type QuestStatus = 'locked' | 'available' | 'active' | 'ready' | 'completed';

export function isUnlocked(def: QuestDef, log: QuestLog, world: QuestWorld): boolean {
  const r = def.requires;
  if (!r) return true;
  if (r.minBadges !== undefined && world.badges < r.minBadges) return false;
  if (r.questsCompleted && !r.questsCompleted.every(q => log[q]?.status === 'completed')) return false;
  if (r.flags && !r.flags.every(f => world.flags[f])) return false;
  return true;
}

export function objectiveProgress(def: QuestDef, i: number, st: QuestState | undefined, world: QuestWorld): { cur: number; need: number; done: boolean } {
  const o = def.objectives[i];
  const counted = (need: number) => {
    const cur = Math.min(need, st?.counts[i] ?? 0);
    return { cur, need, done: cur >= need };
  };
  const bool = (v: boolean) => ({ cur: v ? 1 : 0, need: 1, done: v });
  switch (o.kind) {
    case 'catch':
    case 'wild_win':
      return counted(o.count);
    case 'defeat_trainer':
      return counted(o.count);
    case 'visit_area':
      return bool(world.visited.includes(o.areaId));
    case 'landmark':
      return bool(!!world.flags['landmark:' + o.landmarkId]);
    case 'flag':
      return bool(!!world.flags[o.flag]);
    case 'talk':
      return bool(!!world.flags['talk:' + def.id + ':' + o.npcId]);
    case 'key_item':
      return bool(world.keyItems.includes(o.item));
    case 'show_type':
      return bool(world.party.some(m => m.lv >= o.minLevel && m.types.includes(o.type)));
    case 'have_item': {
      const cur = Math.min(o.count, world.bag[o.item] ?? 0);
      return { cur, need: o.count, done: cur >= o.count };
    }
  }
}

export function isReady(def: QuestDef, st: QuestState | undefined, world: QuestWorld): boolean {
  return !!st && st.status === 'active' && def.objectives.every((_, i) => objectiveProgress(def, i, st, world).done);
}

export function questStatus(def: QuestDef, log: QuestLog, world: QuestWorld): QuestStatus {
  const st = log[def.id];
  if (st?.status === 'completed') return 'completed';
  if (st?.status === 'active') return isReady(def, st, world) ? 'ready' : 'active';
  return isUnlocked(def, log, world) ? 'available' : 'locked';
}

export function acceptQuest(log: QuestLog, id: string): boolean {
  const def = getQuestDef(id);
  if (!def || log[id]) return false;
  log[id] = { status: 'active', counts: def.objectives.map(() => 0), trainers: [], acceptedAt: Date.now() };
  return true;
}

/**
 * Apply a gameplay event to every active quest. Returns the titles of quests
 * whose objectives progressed (for HUD notifications).
 */
export function recordQuestEvent(log: QuestLog, ev: QuestEvent): string[] {
  const touched: string[] = [];
  for (const def of QUESTS) {
    const st = log[def.id];
    if (!st || st.status !== 'active') continue;
    let changed = false;
    def.objectives.forEach((o: QuestObjective, i) => {
      if (o.kind === 'catch' && ev.kind === 'catch') {
        if (o.type && !ev.types.includes(o.type)) return;
        if (o.areaIds && !o.areaIds.includes(ev.areaId)) return;
        if ((st.counts[i] ?? 0) < o.count) {
          st.counts[i] = (st.counts[i] ?? 0) + 1;
          changed = true;
        }
      } else if (o.kind === 'wild_win' && ev.kind === 'wild_win') {
        if (o.areaIds && !o.areaIds.includes(ev.areaId)) return;
        if ((st.counts[i] ?? 0) < o.count) {
          st.counts[i] = (st.counts[i] ?? 0) + 1;
          changed = true;
        }
      } else if (o.kind === 'defeat_trainer' && ev.kind === 'defeat_trainer') {
        if (!o.trainerIds.includes(ev.trainerId)) return;
        st.trainers = st.trainers || [];
        if (st.trainers.includes(ev.trainerId)) return; // each trainer counts once
        st.trainers.push(ev.trainerId);
        st.counts[i] = Math.min(o.count, st.trainers.filter(t => o.trainerIds.includes(t)).length);
        changed = true;
      }
    });
    if (changed) touched.push(def.title);
  }
  return touched;
}

/**
 * Mark a ready quest completed and return its rewards exactly once.
 * Returns null if the quest is not ready or has already been rewarded, which
 * makes duplicate rewards impossible even if the turn-in is triggered twice.
 */
export function completeQuest(log: QuestLog, id: string, world: QuestWorld): QuestReward | null {
  const def = getQuestDef(id);
  const st = log[id];
  if (!def || !st || st.rewarded || !isReady(def, st, world)) return null;
  st.status = 'completed';
  st.completedAt = Date.now();
  st.rewarded = true;
  return def.rewards;
}

/** Quests an NPC / board is involved in, with their current status. */
export function questsForSource(kind: 'npc' | 'board', id: string, log: QuestLog, world: QuestWorld): { def: QuestDef; status: QuestStatus; role: 'giver' | 'turnin' | 'talk' }[] {
  const out: { def: QuestDef; status: QuestStatus; role: 'giver' | 'turnin' | 'talk' }[] = [];
  for (const def of QUESTS) {
    const status = questStatus(def, log, world);
    const turnIn = def.turnIn || def.giver;
    if (def.giver.kind === kind && def.giver.id === id) out.push({ def, status, role: 'giver' });
    else if (turnIn.kind === kind && turnIn.id === id) out.push({ def, status, role: 'turnin' });
    if (kind === 'npc' && status === 'active' && def.objectives.some(o => o.kind === 'talk' && o.npcId === id)) out.push({ def, status, role: 'talk' });
  }
  return out;
}

/** Marker shown above an NPC/board: '!' new quest, '?' ready to turn in. */
export function markerForSource(kind: 'npc' | 'board', id: string, log: QuestLog, world: QuestWorld): 'quest' | 'turnin' | null {
  const qs = questsForSource(kind, id, log, world);
  if (qs.some(q => (q.role !== 'talk' && q.status === 'ready') || (q.role === 'talk' && !world.flags['talk:' + q.def.id + ':' + id]))) return 'turnin';
  if (qs.some(q => q.role === 'giver' && q.status === 'available')) return 'quest';
  return null;
}
