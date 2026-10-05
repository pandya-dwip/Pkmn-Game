/**
 * ModernPokedexView.ts
 * Modern Digital Field Research Pokédex Interface
 * Implements:
 * - Field research dashboard with seen/caught metrics and progress
 * - Real-time search and type filtering
 * - High-res 3D/2D switchable Pokémon preview
 * - Metric height, weight, animated base stat bars, and evolution trees
 */

import { POKEMON_SPECIES_MAP, calculateBaseStatTotal, STONE_EVOLUTIONS } from '../data/pokemon';
import { TYPE_NAMES } from '../data/types';
import { sound } from '../audio/SoundSynthesizer';
import { pokedexManager, getEvolutionChain } from '../systems/PokedexManager';
import { pokemon3DManager } from '../systems/Pokemon3DManager';

const TYPE_LIST = [
  'ALL',
  'No', 'Fi', 'Wa', 'Gr', 'El', 'Ic', 'Fg', 'Po',
  'Gd', 'Fl', 'Ps', 'Bu', 'Ro', 'Gh', 'Dr'
];

export class ModernPokedexView {
  private activeFilterType: string = 'ALL';
  private activeFilterStatus: 'all' | 'caught' | 'seen' = 'all';
  private searchQuery: string = '';
  private currentDetailId: number | null = null;
  private containerEl: HTMLElement | null = null;
  public onClose: (() => void) | null = null;

  public render(container: HTMLElement): void {
    this.containerEl = container;
    this.currentDetailId = null;
    this.renderHome();
  }

  private renderHome(): void {
    if (!this.containerEl) return;
    const stats = pokedexManager.getStats();
    const recent = pokedexManager.getRecent();

    this.containerEl.innerHTML = `
      <div class="dex-modern-view">
        <!-- Header Top Navigation -->
        <div class="dex-top-bar">
          <div class="dex-title-group">
            <span class="dex-main-title">FIELD POKÉDEX</span>
            <span class="dex-sub-title">KANTO REGION · 151 SPECIES</span>
          </div>
          <button id="btn-dex-close" class="dex-close-icon-btn" title="Return to Journey">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Metric Dashboard -->
        <div class="dex-stats-card">
          <div class="dex-stats-row">
            <div class="dex-stat-item">
              <div class="stat-number">${stats.seen}</div>
              <div class="stat-caption">SEEN</div>
            </div>
            <div class="dex-stat-divider"></div>
            <div class="dex-stat-item">
              <div class="stat-number stat-highlight">${stats.caught}</div>
              <div class="stat-caption">CAUGHT</div>
            </div>
            <div class="dex-stat-divider"></div>
            <div class="dex-stat-item">
              <div class="stat-number">${stats.percent}%</div>
              <div class="stat-caption">COMPLETION</div>
            </div>
          </div>
          <div class="dex-progress-track">
            <div class="dex-progress-fill" style="width: ${Math.max(2, stats.percent)}%"></div>
          </div>
        </div>

        <!-- Recently Discovered Carousel -->
        <div class="dex-section-label">RECENT DISCOVERIES</div>
        <div class="dex-recent-row">
          ${recent.map(id => {
            const spec = POKEMON_SPECIES_MAP[id];
            const isCaught = pokedexManager.isCaught(id);
            const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
            return `
              <div class="dex-recent-card" data-id="${id}">
                <img src="${artwork}" alt="${spec?.name || 'Mon'}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png'"/>
                <div class="recent-card-name">${spec?.name || '???'}</div>
                <div class="recent-card-tag">${isCaught ? 'CAUGHT' : 'SEEN'}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Search & Filter Controls -->
        <div class="dex-search-wrapper">
          <svg class="dex-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" id="dex-search-input" class="dex-search-field" placeholder="Search by name or # number..." value="${this.searchQuery}" />
          ${this.searchQuery ? `<button id="btn-clear-search" class="dex-search-clear">✕</button>` : ''}
        </div>

        <!-- Type Filter Chips -->
        <div class="dex-filter-chips">
          ${TYPE_LIST.map(t => {
            const label = t === 'ALL' ? 'ALL' : (TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t);
            const active = this.activeFilterType === t ? 'active' : '';
            return `<button class="dex-chip ${active}" data-type="${t}">${label}</button>`;
          }).join('')}
        </div>

        <!-- Pokémon Grid -->
        <div class="dex-grid" id="dex-grid">
          ${this.renderGridItems()}
        </div>
      </div>
    `;

    this.bindHomeEvents();
  }

  private renderGridItems(): string {
    const items: string[] = [];
    for (let id = 1; id <= 151; id++) {
      const spec = POKEMON_SPECIES_MAP[id];
      if (!spec) continue;

      // Filter by Search
      const numStr = id.toString().padStart(3, '0');
      const matchesSearch =
        !this.searchQuery ||
        spec.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        numStr.includes(this.searchQuery) ||
        id.toString() === this.searchQuery;

      if (!matchesSearch) continue;

      // Filter by Type
      if (this.activeFilterType !== 'ALL') {
        if (!spec.typesShort.includes(this.activeFilterType as any)) continue;
      }

      // Filter by Status
      const isCaught = pokedexManager.isCaught(id);
      const isSeen = pokedexManager.isSeen(id) || isCaught;

      if (this.activeFilterStatus === 'caught' && !isCaught) continue;
      if (this.activeFilterStatus === 'seen' && !isSeen) continue;

      const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
      const fallback = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

      items.push(`
        <div class="dex-grid-card ${isCaught ? 'caught' : isSeen ? 'seen' : 'unseen'}" data-id="${id}">
          <div class="grid-card-id">#${numStr}</div>
          <div class="grid-card-art">
            <img class="${!isSeen ? 'silhouette' : ''}" src="${artwork}" alt="${spec.name}" onerror="this.src='${fallback}'"/>
          </div>
          <div class="dex-card-info">
            <div class="grid-card-title">${isSeen ? spec.name : '???'}</div>
            <div class="grid-card-types">
              ${isSeen ? spec.typesShort.map(t => `<span class="t-badge t-${t.toLowerCase()}">${TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t}</span>`).join('') : '<span class="t-badge-unknown">???</span>'}
            </div>
          </div>
          <div class="grid-card-status">
            ${isCaught ? '<span class="status-pill caught">CAUGHT</span>' : isSeen ? '<span class="status-pill seen">SEEN</span>' : '<span class="status-pill none">UNKNOWN</span>'}
          </div>
        </div>
      `);
    }

    if (items.length === 0) {
      return `
        <div class="dex-empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">No Pokémon Found</div>
          <div class="empty-desc">Try clearing your search query or choosing a different type filter.</div>
        </div>
      `;
    }

    return items.join('');
  }

  private bindHomeEvents(): void {
    if (!this.containerEl) return;

    // Close button
    const btnClose = this.containerEl.querySelector('#btn-dex-close') as HTMLButtonElement;
    if (btnClose) {
      btnClose.onclick = () => {
        sound.beep(660, 0.1, 'sine');
        if (this.onClose) this.onClose();
      };
    }

    // Search input
    const searchInput = this.containerEl.querySelector('#dex-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.oninput = () => {
        this.searchQuery = searchInput.value.trim();
        const grid = this.containerEl?.querySelector('#dex-grid');
        if (grid) grid.innerHTML = this.renderGridItems();
        this.bindCardClicks();
      };
    }

    const btnClear = this.containerEl.querySelector('#btn-clear-search') as HTMLButtonElement;
    if (btnClear) {
      btnClear.onclick = () => {
        this.searchQuery = '';
        this.renderHome();
      };
    }

    // Type filter chips
    this.containerEl.querySelectorAll<HTMLButtonElement>('.dex-chip').forEach(btn => {
      btn.onclick = () => {
        sound.beep(880, 0.08, 'triangle');
        this.activeFilterType = btn.dataset.type || 'ALL';
        this.containerEl?.querySelectorAll('.dex-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const grid = this.containerEl?.querySelector('#dex-grid');
        if (grid) grid.innerHTML = this.renderGridItems();
        this.bindCardClicks();
      };
    });

    this.bindCardClicks();
  }

  private bindCardClicks(): void {
    if (!this.containerEl) return;

    this.containerEl.querySelectorAll<HTMLElement>('.dex-grid-card, .dex-recent-card').forEach(card => {
      card.onclick = () => {
        const id = parseInt(card.dataset.id || '0', 10);
        if (id >= 1 && id <= 151) {
          sound.beep(780, 0.1, 'sine');
          this.renderDetail(id);
        }
      };
    });
  }

  /**
   * Render Modern Pokédex Detail View
   */
  public renderDetail(monId: number): void {
    if (!this.containerEl) return;
    this.currentDetailId = monId;

    const spec = POKEMON_SPECIES_MAP[monId];
    if (!spec) return;

    pokedexManager.recordSeen(monId);
    const isCaught = pokedexManager.isCaught(monId);
    const numStr = monId.toString().padStart(3, '0');
    const physical = pokedexManager.getPhysical(monId);
    const bst = calculateBaseStatTotal(spec);
    const evolutionChain = getEvolutionChain(monId);

    const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${monId}.png`;
    const fallback = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${monId}.png`;

    sound.cry(monId, 'battle');

    this.containerEl.innerHTML = `
      <div class="dex-modern-view dex-detail-mode">
        <!-- Top App Bar with Back Action -->
        <div class="dex-top-bar">
          <button id="btn-detail-back" class="dex-back-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Pokédex</span>
          </button>
          <div class="dex-detail-number">#${numStr}</div>
        </div>

        <!-- Showcase Stage: 3D Mount / 2D High-Res Artwork -->
        <div class="dex-showcase-stage">
          <div id="dex-3d-stage" class="dex-3d-viewport">
            <img class="dex-showcase-img" src="${artwork}" alt="${spec.name}" onerror="this.src='${fallback}'"/>
          </div>
          <div class="dex-showcase-info">
            <div class="dex-mon-name">${spec.name.toUpperCase()}</div>
            <div class="dex-mon-types">
              ${spec.typesShort.map(t => `<span class="t-badge t-${t.toLowerCase()}">${TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Height & Weight Surface -->
        <div class="dex-physical-grid">
          <div class="physical-cell">
            <div class="phys-label">HEIGHT</div>
            <div class="phys-val">${physical.height}</div>
          </div>
          <div class="phys-divider"></div>
          <div class="physical-cell">
            <div class="phys-label">WEIGHT</div>
            <div class="phys-val">${physical.weight}</div>
          </div>
          <div class="phys-divider"></div>
          <div class="physical-cell">
            <div class="phys-label">STATUS</div>
            <div class="phys-val ${isCaught ? 'text-green' : 'text-blue'}">${isCaught ? 'Caught' : 'Discovered'}</div>
          </div>
        </div>

        <!-- Animated Base Stats Bars -->
        <div class="dex-section-card">
          <div class="card-section-title">BASE STATS · TOTAL ${bst}</div>
          <div class="stat-bar-group">
            ${this.renderStatBar('HP', spec.baseHP, 160)}
            ${this.renderStatBar('Attack', spec.baseAttack, 160)}
            ${this.renderStatBar('Defense', spec.baseDefense, 160)}
            ${this.renderStatBar('Sp. Atk', spec.baseSpAttack, 160)}
            ${this.renderStatBar('Sp. Def', spec.baseSpDefense, 160)}
            ${this.renderStatBar('Speed', spec.baseSpeed, 160)}
          </div>
        </div>

        <!-- Evolution Line Diagram -->
        <div class="dex-section-card">
          <div class="card-section-title">EVOLUTION PROGRESSION</div>
          <div class="evolution-row">
            ${evolutionChain.map((evId, idx) => {
              const evSpec = POKEMON_SPECIES_MAP[evId];
              const isCurrent = evId === monId;
              const evArt = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evId}.png`;
              const isEvCaught = pokedexManager.isCaught(evId);

              return `
                ${idx > 0 ? '<div class="evo-arrow">➔</div>' : ''}
                <div class="evo-card ${isCurrent ? 'current' : ''}" data-id="${evId}">
                  <img src="${evArt}" alt="${evSpec?.name || 'Mon'}"/>
                  <span class="evo-name">${evSpec?.name || 'Mon'}</span>
                  <span class="evo-meta">#${evId.toString().padStart(3, '0')}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Quick Cry Audio Action Button -->
        <button id="btn-play-cry" class="dex-action-pill-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <span>PLAY CRY</span>
        </button>
      </div>
    `;

    // Bind back action
    const btnBack = this.containerEl.querySelector('#btn-detail-back') as HTMLButtonElement;
    if (btnBack) {
      btnBack.onclick = () => {
        sound.beep(660, 0.1, 'sine');
        this.renderHome();
      };
    }

    // Play cry
    const btnCry = this.containerEl.querySelector('#btn-play-cry') as HTMLButtonElement;
    if (btnCry) {
      btnCry.onclick = () => {
        sound.cry(monId, 'win');
      };
    }

    // Evolution card navigation
    this.containerEl.querySelectorAll<HTMLElement>('.evo-card').forEach(card => {
      card.onclick = () => {
        const targetId = parseInt(card.dataset.id || '0', 10);
        if (targetId && targetId !== monId) {
          this.renderDetail(targetId);
        }
      };
    });
  }

  private renderStatBar(name: string, value: number, max: number): string {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return `
      <div class="stat-bar-row">
        <span class="stat-name">${name}</span>
        <span class="stat-val">${value}</span>
        <div class="stat-track">
          <div class="stat-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }
}

export const modernPokedexView = new ModernPokedexView();
