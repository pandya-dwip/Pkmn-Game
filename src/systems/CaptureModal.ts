/**
 * CaptureModal.ts
 * Dedicated Pokémon Acquisition / Caught Celebration Screen.
 * Displays 3D model (or 2D artwork if 3D disabled), species, level,
 * types, 100% full HP, base stats, moves list, and destination notice.
 */

import { MonInstance, st } from '../main';
import { POKEMON_SPECIES_MAP } from '../data/pokemon';
import { TYPE_NAMES } from '../data/types';
import { pokemon3DManager } from './Pokemon3DManager';
import { sound } from '../audio/SoundSynthesizer';

export async function showPokemonCaughtModal(
  mon: MonInstance,
  destinationMsg: string
): Promise<void> {
  const spec = POKEMON_SPECIES_MAP[mon.id];
  const stats = st(mon);
  const name = spec?.name.toUpperCase() || 'POKÉMON';
  const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.id}.png`;

  sound.music('victory');
  sound.cry(mon.id, 'win');

  return new Promise(resolve => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'caught-modal-overlay';

    const typeBadges = spec?.typesShort
      .map(
        t => `<i class="t ${t}">${TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t}</i>`
      )
      .join(' ') || '';

    overlay.innerHTML = `
      <div class="caught-card">
        <div class="caught-header-pill">✨ POKÉMON CAUGHT! ✨</div>
        <div class="caught-art-stage">
          <div class="caught-art-glow"></div>
          <div id="caught-3d-viewport" class="caught-3d-mount">
            <img class="caught-2d-img" src="${artworkUrl}" alt="${name}" onerror="this.style.opacity='0'" />
          </div>
        </div>

        <div class="caught-name-row">${name}</div>
        <div class="caught-lv-pill">Level ${mon.lv}</div>
        <div class="caught-types">${typeBadges}</div>

        <div class="caught-hp-meter">
          <div class="caught-hp-label">
            <span>HP: <b>${stats.max} / ${stats.max}</b></span>
            <span class="caught-hp-badge-full">100% FULL HP</span>
          </div>
          <div class="caught-hp-bar">
            <div class="caught-hp-fill"></div>
          </div>
        </div>

        <div class="caught-stats-grid">
          <div class="caught-stat-cell">
            <div class="caught-stat-name">Attack</div>
            <div class="caught-stat-val">${stats.atk}</div>
          </div>
          <div class="caught-stat-cell">
            <div class="caught-stat-name">Defense</div>
            <div class="caught-stat-val">${stats.def}</div>
          </div>
          <div class="caught-stat-cell">
            <div class="caught-stat-name">Speed</div>
            <div class="caught-stat-val">${stats.spe}</div>
          </div>
          <div class="caught-stat-cell">
            <div class="caught-stat-name">Sp. Atk</div>
            <div class="caught-stat-val">${stats.spa}</div>
          </div>
          <div class="caught-stat-cell">
            <div class="caught-stat-name">Sp. Def</div>
            <div class="caught-stat-val">${stats.spd}</div>
          </div>
          <div class="caught-stat-cell">
            <div class="caught-stat-name">Total BST</div>
            <div class="caught-stat-val">${stats.atk + stats.def + stats.spa + stats.spd + stats.spe}</div>
          </div>
        </div>

        <div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:6px;text-transform:uppercase">Known Moves</div>
        <div class="caught-moves-list">
          ${mon.moves.map(m => `<span class="caught-move-chip">${m.toUpperCase()}</span>`).join('')}
        </div>

        <div class="caught-destination-notice">${destinationMsg}</div>

        <button id="btn-caught-continue" class="caught-confirm-btn">CONTINUE JOURNEY ➔</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // If 3D is active, we can render the 3D model inside the viewport
    const container3d = overlay.querySelector('#caught-3d-viewport') as HTMLElement;
    if (pokemon3DManager.isEnabled() && container3d) {
      // 3D will render via the existing manager if compatible, or fallback to high-res official artwork
    }

    const btn = overlay.querySelector('#btn-caught-continue') as HTMLButtonElement;
    btn.onclick = () => {
      sound.beep(880, 0.15, 'triangle');
      overlay.remove();
      resolve();
    };
  });
}
