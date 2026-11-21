/**
 * QuestJournalView.ts
 * Active / Available / Completed quests with objectives, progress, rewards,
 * locations and one tracked quest (shown on the exploration HUD).
 */

import { QUESTS, QuestDef, QuestReward } from '../data/quests';
import { QuestLog, QuestWorld, questStatus, objectiveProgress } from '../systems/QuestSystem';
import { getCosmetic } from '../data/cosmetics';
import { openSheet, UI_ICONS, esc } from './Sheet';

const CATEGORY_LABEL: Record<QuestDef['category'], string> = {
  collection: 'Collection',
  exploration: 'Exploration',
  trainer: 'Trainer',
  assistance: 'Assistance',
  pokemon: 'Pokémon',
};

const STONE_NAMES: Record<string, string> = { El: 'Thunder Stone', Fi: 'Fire Stone', Wa: 'Water Stone', Gr: 'Leaf Stone', Mo: 'Moon Stone' };

export function rewardChips(r: QuestReward): string[] {
  const out: string[] = [];
  if (r.money) out.push(`₽${r.money.toLocaleString()}`);
  if (r.balls) out.push(`Poké Ball ×${r.balls}`);
  if (r.greatBalls) out.push(`Great Ball ×${r.greatBalls}`);
  if (r.ultraBalls) out.push(`Ultra Ball ×${r.ultraBalls}`);
  if (r.oran) out.push(`Oran Berry ×${r.oran}`);
  if (r.sitrus) out.push(`Sitrus Berry ×${r.sitrus}`);
  if (r.revives) out.push(`Revive ×${r.revives}`);
  for (const [k, v] of Object.entries(r.stones || {})) out.push(`${STONE_NAMES[k] || k} ×${v}`);
  for (const c of r.cosmetics || []) {
    const def = getCosmetic(c);
    if (def && !(r.notes || []).some(n => n.includes(def.name))) out.push(def.name);
  }
  for (const n of r.notes || []) out.push(n);
  return out;
}

export interface JournalOptions {
  log: QuestLog;
  world: QuestWorld;
  tracked: string | null;
  onTrack: (id: string | null) => void;
  onClose?: () => void;
}

type Tab = 'active' | 'available' | 'completed';

export function openQuestJournal(opts: JournalOptions): void {
  const sheet = openSheet({ title: 'Quest Journal', icon: UI_ICONS.quest, className: 'xp-journal', onClose: opts.onClose });
  let tab: Tab = 'active';
  let tracked = opts.tracked;

  const visibleAvailable = (d: QuestDef) => d.giver.routeId < 100 || opts.world.visited.includes(d.giver.routeId);
  const lists = () => {
    const active: QuestDef[] = [];
    const available: QuestDef[] = [];
    const completed: QuestDef[] = [];
    for (const d of QUESTS) {
      const s = questStatus(d, opts.log, opts.world);
      if (s === 'active' || s === 'ready') active.push(d);
      else if (s === 'available' && visibleAvailable(d)) available.push(d);
      else if (s === 'completed') completed.push(d);
    }
    // Ready-to-turn-in quests first
    active.sort((a, b) => Number(questStatus(b, opts.log, opts.world) === 'ready') - Number(questStatus(a, opts.log, opts.world) === 'ready'));
    return { active, available, completed };
  };

  const card = (d: QuestDef): string => {
    const status = questStatus(d, opts.log, opts.world);
    const st = opts.log[d.id];
    const objectives = d.objectives
      .map((o, i) => {
        const p = objectiveProgress(d, i, st, opts.world);
        const pct = Math.round((p.cur / Math.max(1, p.need)) * 100);
        const showCount = status !== 'available' && p.need > 1;
        return `<li class="${status === 'completed' || (status !== 'available' && p.done) ? 'done' : ''}">
          <span class="qj-check">${UI_ICONS.check}</span>
          <span class="qj-obj-label">${esc(o.label)}</span>
          ${showCount ? `<span class="qj-count">${p.cur}/${p.need}</span>` : ''}
          ${showCount ? `<span class="qj-bar"><i style="width:${pct}%"></i></span>` : ''}
        </li>`;
      })
      .join('');
    const turnIn = d.turnIn || d.giver;
    const statusPill =
      status === 'ready'
        ? `<span class="qj-pill ready">Return to ${esc(turnIn.name)}</span>`
        : status === 'completed'
          ? '<span class="qj-pill done">Completed</span>'
          : status === 'available'
            ? '<span class="qj-pill avail">Not started</span>'
            : '';
    const trackBtn =
      status === 'active' || status === 'ready'
        ? `<button class="qj-track ${tracked === d.id ? 'on' : ''}" data-track="${d.id}" aria-pressed="${tracked === d.id}">${UI_ICONS.target}<span>${tracked === d.id ? 'Tracking' : 'Track'}</span></button>`
        : '';
    return `<article class="qj-card ${status}">
      <header class="qj-card-head">
        <span class="qj-cat cat-${d.category}">${CATEGORY_LABEL[d.category]}</span>
        ${statusPill}
        ${trackBtn}
      </header>
      <h3 class="qj-title">${esc(d.title)}</h3>
      <p class="qj-summary">${esc(d.summary)}</p>
      <ul class="qj-objectives">${objectives}</ul>
      <div class="qj-meta">
        <span>${UI_ICONS.pin}${esc(d.location)}</span>
        <span>${UI_ICONS.person}${esc(d.giver.name)}</span>
      </div>
      <div class="qj-rewards">${rewardChips(d.rewards).map(r => `<span>${esc(r)}</span>`).join('')}</div>
    </article>`;
  };

  const render = () => {
    const l = lists();
    const counts = { active: l.active.length, available: l.available.length, completed: l.completed.length };
    const items = l[tab];
    const empty =
      tab === 'active'
        ? 'No active quests. Look for people with a <b>!</b> above their heads, or check town notice boards.'
        : tab === 'available'
          ? 'No new requests right now. Explore further and earn badges to meet more people.'
          : 'Completed quests will be recorded here.';
    sheet.body.innerHTML = `
      <div class="xp-tabs" role="tablist">
        ${(['active', 'available', 'completed'] as Tab[])
          .map(t => `<button role="tab" class="xp-tab ${t === tab ? 'on' : ''}" data-tab="${t}" aria-selected="${t === tab}">${t[0].toUpperCase() + t.slice(1)}<span class="xp-tab-count">${counts[t]}</span></button>`)
          .join('')}
      </div>
      <div class="qj-list">${items.length ? items.map(card).join('') : `<p class="xp-empty">${empty}</p>`}</div>`;
    sheet.body.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b => (b.onclick = () => {
      tab = b.dataset.tab as Tab;
      render();
    }));
    sheet.body.querySelectorAll<HTMLButtonElement>('[data-track]').forEach(b => (b.onclick = () => {
      const id = b.dataset.track!;
      tracked = tracked === id ? null : id;
      opts.onTrack(tracked);
      render();
    }));
  };
  render();
}
