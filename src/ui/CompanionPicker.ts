/**
 * CompanionPicker.ts
 * Choose which party Pokémon walks with the trainer, or pause following.
 * The companion is a reference to a real party instance (by uid), never a copy.
 */

import { openSheet, UI_ICONS, esc } from './Sheet';

export interface CompanionPickerOptions {
  party: { uid: string; id: number; lv: number; name: string; fainted: boolean }[];
  currentUid: string | null;
  following: boolean;
  spriteUrl: (id: number) => string;
  onSelect: (uid: string) => void;
  onToggleFollow: (follow: boolean) => void;
  onClose?: () => void;
}

export function openCompanionPicker(opts: CompanionPickerOptions): void {
  const sheet = openSheet({ title: 'Walking Partner', icon: UI_ICONS.paw, className: 'xp-companion', onClose: opts.onClose });
  let current = opts.currentUid;
  let following = opts.following;

  const render = () => {
    sheet.body.innerHTML = `
      <p class="xp-lead">Choose a party Pokémon to walk beside you. It still battles normally.</p>
      <div class="cp-grid">
        ${opts.party
          .map(
            m => `<button class="cp-card ${m.uid === current ? 'on' : ''}" data-uid="${m.uid}" aria-pressed="${m.uid === current}">
              <img src="${opts.spriteUrl(m.id)}" alt="" loading="lazy" />
              <span class="cp-name">${esc(m.name)}</span>
              <span class="cp-lv">Lv ${m.lv}${m.fainted ? ' · resting' : ''}</span>
              ${m.uid === current ? `<span class="cp-badge">${following ? 'Following' : 'Paused'}</span>` : ''}
            </button>`
          )
          .join('')}
      </div>`;
    sheet.footer.innerHTML = current
      ? `<button class="xp-btn ghost" data-act="toggle">${following ? 'Stop Following' : 'Resume Following'}</button>`
      : '<span class="xp-hint">Tap a Pokémon to set it as your partner.</span>';
    sheet.body.querySelectorAll<HTMLButtonElement>('[data-uid]').forEach(b => (b.onclick = () => {
      current = b.dataset.uid!;
      following = true;
      opts.onSelect(current);
      render();
    }));
    const t = sheet.footer.querySelector('[data-act="toggle"]') as HTMLElement | null;
    if (t) t.onclick = () => {
      following = !following;
      opts.onToggleFollow(following);
      render();
    };
  };
  render();
}
