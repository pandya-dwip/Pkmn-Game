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
      .map(t => `<span class="t-badge t-${t.toLowerCase()}">${TYPE_NAMES[t as keyof typeof TYPE_NAMES] || t}</span>`)
      .join(' ') || '';

    overlay.innerHTML = `
      <div class="caught-card modern-caught-card">
        <div class="caught-header-label">CAPTURED!</div>
        <div class="caught-art-stage">
          <div id="caught-3d-viewport" class="caught-3d-mount">
            <img class="caught-2d-img" src="${artworkUrl}" alt="${name}" onerror="this.style.opacity='0'" />
          </div>
        </div>

        <div class="caught-name-row">${name}</div>
        <div class="caught-meta-row">
          <span class="caught-lv-chip">Lv. ${mon.lv}</span>
          <div class="caught-types">${typeBadges}</div>
        </div>

        <div class="caught-stats-sheet">
          <div class="stat-line">
            <span class="stat-k">HP</span>
            <span class="stat-v">${stats.max} / ${stats.max}</span>
          </div>
          <div class="stat-line">
            <span class="stat-k">Attack</span>
            <span class="stat-v">${stats.atk}</span>
          </div>
          <div class="stat-line">
            <span class="stat-k">Defense</span>
            <span class="stat-v">${stats.def}</span>
          </div>
          <div class="stat-line">
            <span class="stat-k">Speed</span>
            <span class="stat-v">${stats.spe}</span>
          </div>
        </div>

        ${destinationMsg ? `<div class="caught-dest-hint">${destinationMsg}</div>` : ''}

        <button id="btn-caught-continue" class="caught-continue-btn">
          <span>Continue</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#btn-caught-continue') as HTMLButtonElement;
    btn.onclick = () => {
      sound.beep(880, 0.15, 'triangle');
      overlay.remove();
      resolve();
    };
  });
}
