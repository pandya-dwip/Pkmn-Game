/**
 * KantoWorldMapView.ts
 * Stylized Modern Kanto Region World Map Component.
 * Features:
 * - Interactive geographic map layout (landmass, coastlines, water channels, mountains, routes)
 * - Major Kanto cities and landmarks with connection routes
 * - Visual indicators for Current Location, Unlocked Cities, and Locked Locations
 * - Interactive location cards with Gym details, badge status, and Fast Travel triggers
 * - Fully responsive for mobile and desktop screens
 */

import { KANTO_CITIES, KantoCityInfo, getFurthestUnlockedCityIndex } from '../data/cities';
import { KANTO_GYMS } from '../data/gyms';
import { sound } from '../audio/SoundSynthesizer';

export interface WorldMapNode {
  cityIndex: number;
  id: string;
  name: string;
  shortName: string;
  icon: string;
  mapX: number; // percentage 0-100
  mapY: number; // percentage 0-100
  routeId: number;
  gymIndex?: number;
  connections: string[];
}

export const KANTO_MAP_NODES: WorldMapNode[] = [
  {
    cityIndex: 0,
    id: 'pallet_viridian',
    name: 'Pallet Town & Viridian City',
    shortName: 'Pallet & Viridian',
    icon: '🌿',
    mapX: 22,
    mapY: 74,
    routeId: 0,
    connections: ['pewter', 'cinnabar'],
  },
  {
    cityIndex: 1,
    id: 'pewter',
    name: 'Pewter City',
    shortName: 'Pewter City',
    icon: '🪨',
    mapX: 22,
    mapY: 26,
    routeId: 1,
    gymIndex: 0,
    connections: ['pallet_viridian', 'cerulean'],
  },
  {
    cityIndex: 2,
    id: 'cerulean',
    name: 'Cerulean City',
    shortName: 'Cerulean City',
    icon: '💧',
    mapX: 68,
    mapY: 22,
    routeId: 2,
    gymIndex: 1,
    connections: ['pewter', 'saffron', 'vermilion'],
  },
  {
    cityIndex: 3,
    id: 'vermilion',
    name: 'Vermilion City',
    shortName: 'Vermilion City',
    icon: '⚡',
    mapX: 68,
    mapY: 66,
    routeId: 3,
    gymIndex: 2,
    connections: ['cerulean', 'saffron', 'celadon', 'fuchsia'],
  },
  {
    cityIndex: 4,
    id: 'celadon',
    name: 'Celadon City',
    shortName: 'Celadon City',
    icon: '🌈',
    mapX: 48,
    mapY: 44,
    routeId: 4,
    gymIndex: 3,
    connections: ['saffron', 'fuchsia', 'vermilion'],
  },
  {
    cityIndex: 5,
    id: 'fuchsia',
    name: 'Fuchsia City',
    shortName: 'Fuchsia City',
    icon: '☠️',
    mapX: 54,
    mapY: 82,
    routeId: 5,
    gymIndex: 4,
    connections: ['celadon', 'vermilion', 'cinnabar'],
  },
  {
    cityIndex: 6,
    id: 'saffron',
    name: 'Saffron City',
    shortName: 'Saffron City',
    icon: '🔮',
    mapX: 68,
    mapY: 44,
    routeId: 6,
    gymIndex: 5,
    connections: ['cerulean', 'celadon', 'vermilion'],
  },
  {
    cityIndex: 7,
    id: 'cinnabar',
    name: 'Cinnabar Island',
    shortName: 'Cinnabar Island',
    icon: '🔥',
    mapX: 22,
    mapY: 90,
    routeId: 7,
    gymIndex: 6,
    connections: ['pallet_viridian', 'fuchsia'],
  },
  {
    cityIndex: 8,
    id: 'viridian_gym',
    name: 'Viridian City Gym',
    shortName: 'Viridian Gym',
    icon: '🌍',
    mapX: 22,
    mapY: 58,
    routeId: 8,
    gymIndex: 7,
    connections: ['pallet_viridian', 'indigo'],
  },
  {
    cityIndex: 9,
    id: 'indigo',
    name: 'Indigo Plateau',
    shortName: 'Indigo Plateau',
    icon: '🏆',
    mapX: 12,
    mapY: 18,
    routeId: 8,
    connections: ['viridian_gym'],
  },
];

export class KantoWorldMapView {
  private overlayEl: HTMLElement | null = null;
  private selectedNodeId: string = 'pallet_viridian';
  private currentLocationIndex: number = 0;
  private furthestUnlockedIndex: number = 1;
  private onTravelCallback: ((cityIndex: number) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  public open(options: {
    currentCityIndex: number;
    gymIndex: number;
    has8Badges: boolean;
    onTravel: (cityIndex: number) => void;
    onClose: () => void;
  }): void {
    this.currentLocationIndex = options.currentCityIndex;
    this.furthestUnlockedIndex = getFurthestUnlockedCityIndex(options.gymIndex, options.has8Badges);
    this.onTravelCallback = options.onTravel;
    this.onCloseCallback = options.onClose;

    // Default selection to current city
    const currNode = KANTO_MAP_NODES.find(n => n.cityIndex === this.currentLocationIndex);
    this.selectedNodeId = currNode ? currNode.id : KANTO_MAP_NODES[0].id;

    sound.beep(523, 0.12, 'sine');
    sound.beep(659, 0.15, 'sine', 0.08, 0.1);
    this.render();
  }

  public close(): void {
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
      this.overlayEl = null;
    }
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  private isNodeUnlocked(node: WorldMapNode): boolean {
    return node.cityIndex <= this.furthestUnlockedIndex;
  }

  private render(): void {
    // Remove existing if any
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }

    const overlay = document.createElement('div');
    overlay.className = 'world-map-modal-overlay';
    this.overlayEl = overlay;

    const selectedNode = KANTO_MAP_NODES.find(n => n.id === this.selectedNodeId) || KANTO_MAP_NODES[0];
    const selectedCity = KANTO_CITIES[selectedNode.cityIndex];
    const isUnlocked = this.isNodeUnlocked(selectedNode);
    const isCurrent = selectedNode.cityIndex === this.currentLocationIndex;

    const gymDef = selectedNode.gymIndex !== undefined ? KANTO_GYMS[selectedNode.gymIndex] : null;

    overlay.innerHTML = `
      <div class="world-map-container">
        <!-- Map Top Navigation Bar -->
        <div class="world-map-header">
          <div class="world-map-header-left">
            <span class="world-map-icon">🗺️</span>
            <div>
              <div class="world-map-title">KANTO REGION WORLD MAP</div>
              <div class="world-map-sub">Interactive Exploration & Fast Travel Navigator</div>
            </div>
          </div>
          <button id="btn-close-world-map" class="world-map-close-btn" title="Close Map">✕</button>
        </div>

        <!-- Central Graphic Map Area -->
        <div class="world-map-viewport">
          <!-- Stylized Geographic Background Canvas/SVG -->
          <svg class="world-map-geo" viewBox="0 0 1000 700" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mapOcean" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#075985" />
                <stop offset="50%" stop-color="#0369a1" />
                <stop offset="100%" stop-color="#0284c7" />
              </linearGradient>
              <linearGradient id="mapLand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#14532d" />
                <stop offset="50%" stop-color="#15803d" />
                <stop offset="100%" stop-color="#166534" />
              </linearGradient>
              <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Ocean Base -->
            <rect width="1000" height="700" fill="url(#mapOcean)" />

            <!-- Ocean Wave Contours -->
            <path d="M 0 350 Q 250 320 500 360 T 1000 340 L 1000 700 L 0 700 Z" fill="rgba(2, 132, 199, 0.25)" />
            <path d="M 0 520 Q 300 490 600 530 T 1000 510 L 1000 700 L 0 700 Z" fill="rgba(3, 105, 161, 0.35)" />

            <!-- Mainland Kanto Landmass -->
            <path d="
              M 80 120
              L 380 100
              Q 520 80 720 110
              Q 880 130 920 280
              Q 940 420 860 520
              Q 780 620 620 620
              Q 500 620 460 540
              Q 420 460 340 450
              L 300 500
              Q 260 580 140 580
              Q 60 520 70 380
              L 60 220
              Z
            " fill="url(#mapLand)" stroke="#16a34a" stroke-width="6" />

            <!-- Cinnabar Island -->
            <path d="
              M 170 590
              Q 260 580 270 650
              Q 250 690 180 680
              Q 150 650 170 590
              Z
            " fill="#b91c1c" stroke="#dc2626" stroke-width="4" />
            <text x="220" y="640" font-size="14" font-weight="900" fill="#fef08a" text-anchor="middle">🌋</text>

            <!-- Mt. Moon Mountain Range -->
            <path d="
              M 340 180
              L 390 130
              L 440 190
              L 490 140
              L 540 200
              L 480 230
              L 410 220
              Z
            " fill="#475569" stroke="#64748b" stroke-width="3" />
            <text x="440" y="175" font-size="12" font-weight="800" fill="#cbd5e1" text-anchor="middle">MT. MOON</text>

            <!-- Viridian Forest Canopy -->
            <circle cx="220" cy="400" r="45" fill="#052e16" opacity="0.75" />
            <circle cx="240" cy="380" r="35" fill="#052e16" opacity="0.75" />
            <text x="230" y="405" font-size="11" font-weight="800" fill="#86efac" text-anchor="middle">VIRIDIAN FOREST</text>

            <!-- Water Channels / Cerulean Cape & Vermilion Harbor -->
            <path d="M 680 150 Q 720 220 720 300 L 720 480 Q 720 540 680 580" fill="none" stroke="#0284c7" stroke-width="12" stroke-linecap="round" />

            <!-- Route Interconnection Highways -->
            ${this.renderMapRoutesSVG()}
          </svg>

          <!-- Interactive City Pins Layer -->
          <div class="world-map-pins-layer">
            ${KANTO_MAP_NODES.map(node => {
              const unlocked = this.isNodeUnlocked(node);
              const isSelected = node.id === this.selectedNodeId;
              const isCurrentLoc = node.cityIndex === this.currentLocationIndex;

              return `
                <div
                  class="world-map-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''} ${isCurrentLoc ? 'current-loc' : ''}"
                  style="left:${node.mapX}%;top:${node.mapY}%"
                  data-id="${node.id}"
                >
                  <div class="pin-marker">
                    <span class="pin-icon">${node.icon}</span>
                    ${isCurrentLoc ? '<span class="pin-current-pulse"></span>' : ''}
                  </div>
                  <div class="pin-label">
                    <span>${node.shortName}</span>
                    ${!unlocked ? '<span class="pin-lock-tag">🔒</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Bottom Details & Fast Travel Action Bar -->
        <div class="world-map-drawer">
          <div class="drawer-left">
            <div class="drawer-icon-box">
              <span class="drawer-city-icon">${selectedNode.icon}</span>
            </div>
            <div class="drawer-city-info">
              <div class="drawer-city-header">
                <span class="drawer-city-name">${selectedCity.name.toUpperCase()}</span>
                ${isCurrent ? '<span class="status-badge current">📍 YOU ARE HERE</span>' : ''}
                ${!isUnlocked ? '<span class="status-badge locked">🔒 NOT VISITED YET</span>' : '<span class="status-badge unlocked">✓ ACCESSIBLE</span>'}
              </div>
              <div class="drawer-city-region">${selectedCity.region}</div>
              <div class="drawer-city-desc">${selectedCity.desc}</div>
              ${gymDef ? `
                <div class="drawer-gym-status">
                  <span class="gym-badge-icon">${selectedCity.badgeIcon || '⚔️'}</span>
                  <span><b>${gymDef.city} Gym</b> · Leader: <b>${gymDef.leader}</b> (${gymDef.type} Type) · <b>${gymDef.badgeName}</b></span>
                </div>
              ` : selectedNode.cityIndex === 0 ? `
                <div class="drawer-gym-status">
                  <span>🌿 <b>Professor Oak's Research Lab</b> · Starter Pokémon & Field Research Gateway</span>
                </div>
              ` : `
                <div class="drawer-gym-status">
                  <span>🏆 <b>Indigo Plateau Headquarters</b> · 16-Trainer Championship & Elite Four</span>
                </div>
              `}
            </div>
          </div>

          <div class="drawer-right">
            ${isCurrent ? `
              <button class="travel-btn disabled" disabled>
                <span>📍 CURRENT LOCATION</span>
              </button>
            ` : isUnlocked ? `
              <button id="btn-fast-travel" class="travel-btn active">
                <span>FAST TRAVEL TO ${selectedNode.shortName.toUpperCase()} ➔</span>
              </button>
            ` : `
              <button class="travel-btn disabled" disabled title="Advance storyline to unlock">
                <span>🔒 EXPLORE ROUTE TO REACH</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.attachEvents();
  }

  private renderMapRoutesSVG(): string {
    const lines: string[] = [];
    const drawn = new Set<string>();

    for (const node of KANTO_MAP_NODES) {
      for (const targetId of node.connections) {
        const key = [node.id, targetId].sort().join('--');
        if (drawn.has(key)) continue;
        drawn.add(key);

        const target = KANTO_MAP_NODES.find(n => n.id === targetId);
        if (!target) continue;

        const x1 = (node.mapX / 100) * 1000;
        const y1 = (node.mapY / 100) * 700;
        const x2 = (target.mapX / 100) * 1000;
        const y2 = (target.mapY / 100) * 700;

        const isBothUnlocked = this.isNodeUnlocked(node) && this.isNodeUnlocked(target);
        const strokeColor = isBothUnlocked ? '#facc15' : '#475569';
        const strokeDash = isBothUnlocked ? 'none' : '6 6';

        lines.push(`
          <line
            x1="${x1}" y1="${y1}"
            x2="${x2}" y2="${y2}"
            stroke="${strokeColor}"
            stroke-width="5"
            stroke-dasharray="${strokeDash}"
            stroke-linecap="round"
            opacity="${isBothUnlocked ? '0.85' : '0.45'}"
          />
        `);
      }
    }

    return lines.join('');
  }

  private attachEvents(): void {
    if (!this.overlayEl) return;

    // Close button
    const closeBtn = this.overlayEl.querySelector('#btn-close-world-map') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    // Pin clicks
    this.overlayEl.querySelectorAll<HTMLElement>('.world-map-pin').forEach(pin => {
      pin.onclick = () => {
        const id = pin.dataset.id;
        if (id && id !== this.selectedNodeId) {
          this.selectedNodeId = id;
          sound.beep(784, 0.08, 'sine');
          this.render();
        }
      };
    });

    // Fast travel button
    const travelBtn = this.overlayEl.querySelector('#btn-fast-travel') as HTMLButtonElement;
    if (travelBtn) {
      travelBtn.onclick = () => {
        const selectedNode = KANTO_MAP_NODES.find(n => n.id === this.selectedNodeId);
        if (selectedNode && this.isNodeUnlocked(selectedNode)) {
          sound.beep(523, 0.12, 'sine');
          sound.beep(659, 0.15, 'sine', 0.08, 0.1);
          sound.beep(784, 0.25, 'sine', 0.15, 0.2);
          const targetCityIdx = selectedNode.cityIndex;
          this.close();
          if (this.onTravelCallback) {
            this.onTravelCallback(targetCityIdx);
          }
        }
      };
    }

    // Escape key
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        window.removeEventListener('keydown', handleKey);
        this.close();
      }
    };
    window.addEventListener('keydown', handleKey);
  }
}

export const kantoWorldMapView = new KantoWorldMapView();
