/**
 * Chat-style conversation card: a messenger-like panel docked over the world view.
 * The other person's lines arrive as bubbles (with a short typing indicator),
 * the player answers with quick-reply chips, and their choice appears as their own bubble.
 */

export interface ChatCardOptions {
  name: string;
  subtitle?: string;
  avatar: string; // emoji or short text
  accent?: string; // CSS colour for the avatar ring / header
  status?: { text: string; tone: 'info' | 'good' | 'warn' | 'muted' };
  playerName?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export class ChatCard {
  private root: HTMLElement;
  private log: HTMLElement;
  private replies: HTMLElement;
  private closed = false;
  private pendingPick: ((i: number) => void) | null = null;
  private pendingCount = 0;
  private keyHandler: (e: KeyboardEvent) => void;
  private skipTyping = false;

  constructor(private opts: ChatCardOptions) {
    const root = document.createElement('div');
    root.className = 'chat-card-layer';
    root.innerHTML = `
      <div class="chat-card" role="dialog" aria-label="Conversation with ${esc(opts.name)}" style="--chat-accent:${opts.accent || '#dc2626'}">
        <div class="chat-head">
          <div class="chat-avatar">${esc(opts.avatar)}</div>
          <div class="chat-who">
            <div class="chat-name">${esc(opts.name)}</div>
            ${opts.subtitle ? `<div class="chat-sub">${esc(opts.subtitle)}</div>` : ''}
          </div>
          ${opts.status ? `<span class="chat-status tone-${opts.status.tone}">${esc(opts.status.text)}</span>` : ''}
          <button class="chat-close" aria-label="End conversation" title="End conversation (Esc)">✕</button>
        </div>
        <div class="chat-log" aria-live="polite"></div>
        <div class="chat-replies"></div>
      </div>`;
    document.body.appendChild(root);
    this.root = root;
    this.log = root.querySelector('.chat-log')!;
    this.replies = root.querySelector('.chat-replies')!;
    requestAnimationFrame(() => root.classList.add('in'));

    // Esc / ✕ choose the last reply (by convention "Goodbye"); 1-9 pick replies; tap log to skip typing.
    root.querySelector('.chat-close')!.addEventListener('click', () => this.resolvePick(this.pendingCount - 1));
    this.log.addEventListener('click', () => (this.skipTyping = true));
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.closed) return;
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); this.resolvePick(this.pendingCount - 1); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= this.pendingCount) { e.preventDefault(); this.resolvePick(n - 1); return; }
      if (e.key === ' ' || e.key === 'Enter') { this.skipTyping = true; if (this.pendingCount === 1) this.resolvePick(0); }
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  private scroll(): void {
    this.log.scrollTop = this.log.scrollHeight;
  }

  private append(el: HTMLElement): void {
    this.log.appendChild(el);
    this.scroll();
  }

  /** The other person says one or more lines (plain text), each after a brief typing pause. */
  async say(lines: string | string[]): Promise<void> {
    for (const line of Array.isArray(lines) ? lines : [lines]) {
      await this.typing(line.length);
      this.bubble('them', `<p>${esc(line)}</p>`);
    }
  }

  /** The other person sends rich content (already-escaped HTML), e.g. a team card. */
  async sayHTML(html: string): Promise<void> {
    await this.typing(60);
    this.bubble('them', html, 'rich');
  }

  /** A centred system notice (rewards, events). */
  system(html: string): void {
    const el = document.createElement('div');
    el.className = 'chat-system';
    el.innerHTML = html;
    this.append(el);
  }

  private bubble(side: 'them' | 'me', html: string, extra = ''): void {
    const row = document.createElement('div');
    row.className = `chat-row ${side}`;
    row.innerHTML = side === 'them'
      ? `<div class="chat-mini">${esc(this.opts.avatar)}</div><div class="chat-bubble ${extra}">${html}</div>`
      : `<div class="chat-bubble ${extra}">${html}</div>`;
    this.append(row);
  }

  private async typing(chars: number): Promise<void> {
    if (this.closed) return;
    const row = document.createElement('div');
    row.className = 'chat-row them typing';
    row.innerHTML = `<div class="chat-mini">${esc(this.opts.avatar)}</div><div class="chat-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    this.append(row);
    const ms = Math.min(1100, 350 + chars * 9);
    for (let t = 0; t < ms && !this.skipTyping && !this.closed; t += 50) await wait(50);
    this.skipTyping = false;
    row.remove();
  }

  /** Shows quick replies; resolves with the chosen index and echoes the choice as the player's bubble. */
  choose(options: string[], echo = true): Promise<number> {
    this.replies.innerHTML = options
      .map((o, i) => `<button class="chat-chip ${i === options.length - 1 && options.length > 1 ? 'ghost' : ''}" data-i="${i}"><kbd>${i + 1}</kbd>${esc(o)}</button>`)
      .join('');
    this.pendingCount = options.length;
    this.replies.querySelectorAll<HTMLButtonElement>('.chat-chip').forEach(b => {
      b.onclick = () => this.resolvePick(Number(b.dataset.i));
    });
    this.scroll();
    return new Promise(resolve => {
      this.pendingPick = (i: number) => {
        if (echo) this.bubble('me', `<p>${esc(options[i])}</p>`);
        resolve(i);
      };
    });
  }

  private resolvePick(i: number): void {
    if (!this.pendingPick || i < 0) return;
    const fn = this.pendingPick;
    this.pendingPick = null;
    this.pendingCount = 0;
    this.replies.innerHTML = '';
    fn(i);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    window.removeEventListener('keydown', this.keyHandler, true);
    this.root.classList.remove('in');
    await wait(220);
    this.root.remove();
  }
}
