/**
 * Sheet.ts
 * Shared panel for the new menus (Quest Journal, Companion, Customisation).
 * Desktop: centred card. Mobile: bottom sheet that respects safe areas.
 * Escape / backdrop / close button all dismiss it.
 */

export const UI_ICONS = {
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  quest: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M6 3h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h6"/></svg>',
  paw: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><ellipse cx="7" cy="9" rx="2" ry="2.6"/><ellipse cx="12" cy="6.5" rx="2" ry="2.6"/><ellipse cx="17" cy="9" rx="2" ry="2.6"/><path d="M12 11c-3 0-6 3.5-6 6 0 1.7 1.4 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.6 0 3-.8 3-2.5 0-2.5-3-6-6-6z"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  person: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  target: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
};

export interface SheetHandle {
  root: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  close: () => void;
  setTitle: (t: string) => void;
}

export function openSheet(opts: { title: string; icon?: string; className?: string; onClose?: () => void }): SheetHandle {
  const host = document.getElementById('g') || document.body;
  const root = document.createElement('div');
  root.className = 'xp-sheet ' + (opts.className || '');
  root.innerHTML = `
    <div class="xp-panel" role="dialog" aria-modal="true" aria-label="${opts.title}">
      <div class="xp-head">
        <span class="xp-head-icon">${opts.icon || ''}</span>
        <h2 class="xp-title"></h2>
        <button class="xp-close" aria-label="Close">${UI_ICONS.close}</button>
      </div>
      <div class="xp-body"></div>
      <div class="xp-footer"></div>
    </div>`;
  host.appendChild(root);
  const title = root.querySelector('.xp-title') as HTMLElement;
  title.textContent = opts.title;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    setTimeout(() => root.remove(), 160);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);
  root.addEventListener('pointerdown', e => {
    if (e.target === root) close();
  });
  (root.querySelector('.xp-close') as HTMLElement).onclick = close;
  requestAnimationFrame(() => root.classList.add('open'));
  return {
    root,
    body: root.querySelector('.xp-body') as HTMLElement,
    footer: root.querySelector('.xp-footer') as HTMLElement,
    close,
    setTitle: (t: string) => (title.textContent = t),
  };
}

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
