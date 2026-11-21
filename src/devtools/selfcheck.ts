/**
 * selfcheck.ts
 * Assertion-based checks for the expansion's core logic. Runs in the browser
 * (dev builds expose it as window.__selfcheck) so it uses the real modules.
 */

import { acceptQuest, completeQuest, recordQuestEvent, questStatus, QuestLog, QuestWorld } from '../systems/QuestSystem';
import { getQuestDef } from '../data/quests';
import { migrateSave } from '../systems/SaveMigration';
import { Camera25D } from '../world/Camera25D';
import { getRouteDefinition, SPECIAL_AREAS } from '../data/specialAreas';
import { resolveAppearance } from '../data/cosmetics';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('selfcheck failed: ' + msg);
}

export function runSelfChecks(): string[] {
  const passed: string[] = [];
  const world = (over: Partial<QuestWorld> = {}): QuestWorld => ({ badges: 8, flags: {}, keyItems: [], visited: [], party: [], bag: {}, ...over });

  // Quest lifecycle: available -> active -> ready -> completed, rewards once
  {
    const log: QuestLog = {};
    const def = getQuestDef('q_bug_survey')!;
    assert(questStatus(def, log, world()) === 'available', 'bug survey available');
    assert(acceptQuest(log, 'q_bug_survey'), 'accept');
    assert(!acceptQuest(log, 'q_bug_survey'), 'cannot accept twice');
    recordQuestEvent(log, { kind: 'catch', speciesId: 16, types: ['No', 'Fl'], areaId: 0 });
    assert(log.q_bug_survey.counts[0] === 0, 'non-bug catch ignored');
    for (let i = 0; i < 5; i++) recordQuestEvent(log, { kind: 'catch', speciesId: 10, types: ['Bu'], areaId: 1 });
    assert(log.q_bug_survey.counts[0] === 3, 'count capped at target');
    assert(questStatus(def, log, world()) === 'ready', 'ready');
    const r1 = completeQuest(log, 'q_bug_survey', world());
    const r2 = completeQuest(log, 'q_bug_survey', world());
    assert(r1 && r1.money === 600, 'reward returned once');
    assert(r2 === null, 'duplicate reward prevented');
    assert(questStatus(def, log, world()) === 'completed', 'completed');
    passed.push('quest lifecycle + duplicate reward guard');
  }

  // Area-restricted objectives and distinct trainer counting
  {
    const log: QuestLog = {};
    acceptQuest(log, 'q_trainer_gauntlet');
    recordQuestEvent(log, { kind: 'defeat_trainer', trainerId: 'marlo' });
    recordQuestEvent(log, { kind: 'defeat_trainer', trainerId: 'marlo' });
    assert(log.q_trainer_gauntlet.counts[0] === 1, 'same trainer counts once');
    acceptQuest(log, 'q_wild_streak');
    recordQuestEvent(log, { kind: 'wild_win', areaId: 5 });
    assert(log.q_wild_streak.counts[0] === 0, 'wild win outside area ignored');
    recordQuestEvent(log, { kind: 'wild_win', areaId: 102 });
    assert(log.q_wild_streak.counts[0] === 1, 'wild win in area counted');
    const chain = getQuestDef('q_glimmer_deeper')!;
    assert(questStatus(chain, {}, world()) === 'locked', 'chain quest locked before prerequisite');
    passed.push('area filters, trainer dedupe, quest chains');
  }

  // Save migration from a v1 save
  {
    const mon = (uid: string, id: number) => ({ uid, id, lv: 10, iv: 5, exp: 0, hp: 20, moves: ['Tackle'] });
    const v1: any = { team: [mon('a', 4), mon('b', 7)], pcBox: [mon('a', 4), mon('b', 25)], savedRoutePos: { routeId: 999, x: 1, y: 1 } };
    let n = 0;
    const rep = migrateSave(v1, id => id >= 0 && id <= 8, () => 'new' + n++);
    assert(rep.fromVersion === 1 && v1.saveVersion === 2, 'version bumped');
    assert(v1.pcBox.length === 1 && v1.pcBox[0].id === 25 && v1.pcBox[0].uid !== 'b', 'exact duplicate removed, colliding uid re-identified');
    assert(v1.companion.uid === 'a' && v1.companion.following, 'companion defaults to lead');
    assert(v1.savedRoutePos === null, 'unknown location dropped');
    assert(Array.isArray(v1.keyItems) && typeof v1.quests === 'object', 'defaults applied');
    const again = JSON.stringify(v1);
    migrateSave(v1, id => id >= 0 && id <= 8, () => 'x');
    assert(JSON.stringify(v1) === again, 'migration idempotent');
    passed.push('save migration v1 -> v2');
  }

  // Camera projection round-trip
  {
    const cam = new Camera25D();
    cam.setViewport(800, 480);
    cam.fx = 1200;
    cam.fy = 500;
    for (const [x, y] of [[1200, 500], [1000, 300], [1500, 700]]) {
      const p = cam.project(x, y);
      const w = cam.unproject(p.x, p.y)!;
      assert(Math.abs(w.x - x) < 0.5 && Math.abs(w.y - y) < 0.5, `unproject(${x},${y})`);
    }
    assert(cam.scaleAt(300) < cam.scaleAt(700), 'far is smaller than near');
    passed.push('camera projection round-trip');
  }

  // World data integrity: every portal target exists and lands on walkable ground (checked in harness)
  {
    for (const a of SPECIAL_AREAS) {
      for (const p of a.portals || []) assert(getRouteDefinition(p.target).id === p.target, `portal ${p.id} target ${p.target}`);
    }
    for (let i = 0; i <= 8; i++) for (const p of getRouteDefinition(i).portals || []) assert(getRouteDefinition(p.target).id === p.target, `route ${i} portal ${p.id}`);
    passed.push('portal graph targets resolve');
  }

  // Cosmetics: locked items fall back, resolution is memoised
  {
    const ctx = { badges: 0, champion: false, rewards: [] };
    const a = resolveAppearance('male_red', { outfit: 'outfit_champion' }, ctx);
    const b = resolveAppearance('male_red', {}, ctx);
    assert(a === b, 'locked cosmetic falls back to base');
    const c = resolveAppearance('male_red', { outfit: 'outfit_trail' }, ctx);
    assert(c !== b && c.palette.topMain === '#0d9488', 'unlocked cosmetic applies');
    passed.push('cosmetic unlock + resolution');
  }

  return passed;
}
