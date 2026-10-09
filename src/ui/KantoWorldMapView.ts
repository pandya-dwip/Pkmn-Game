/**
 * KantoWorldMapView.ts
 * Fully Redesigned Regional Illustrated World Map for Mobile & Desktop.
 * 
 * Features:
 * - High-definition illustrated Kanto regional geography (coastlines, bays, islands, mountain ranges, forests, rivers)
 * - Major cities, routes (1 to 23), and special exploration areas (Viridian Forest, Mt. Moon, Power Plant, Safari Zone, Seafoam Islands)
 * - Complete touch and mouse Pan & Zoom engine (drag-to-pan, pinch-to-zoom, wheel zoom, zoom controls, recenter)
 * - Desktop layout: 72% interactive map + 28% dedicated location intelligence sidebar
 * - Mobile layout: Fullscreen touch-optimized map + floating controls + compact docked bottom sheet
 * - Fast-travel validation matching gameplay progression rules (getFurthestUnlockedCityIndex)
 * - Current location indicators, unlocked vs locked route states, and seamless save compatibility
 */

import { KANTO_CITIES, KantoCityInfo, getFurthestUnlockedCityIndex } from '../data/cities';
import { KANTO_GYMS, GymLeaderDefinition } from '../data/gyms';
import { sound } from '../audio/SoundSynthesizer';

export interface WorldMapCityNode {
  cityIndex: number;
  id: string;
  name: string;
  shortName: string;
  badgeName: string;
  badgeIcon: string;
  type: string;
  mapX: number; // 0-1000 coordinate space
  mapY: number; // 0-750 coordinate space
  routeId: number;
  gymIndex?: number;
  connectedRoutes: string[];
  connections: string[];
  landmarkDesc: string;
}

export interface WorldMapLandmark {
  id: string;
  name: string;
  icon: string;
  mapX: number;
  mapY: number;
  subtitle: string;
  desc: string;
  requiredRoute: number;
}

export const KANTO_MAP_CITIES: WorldMapCityNode[] = [
  {
    cityIndex: 0,
    id: 'pallet_viridian',
    name: 'Pallet Town & Viridian City',
    shortName: 'Pallet & Viridian',
    badgeName: 'Starter Haven',
    badgeIcon: '🌿',
    type: 'Grass / Normal',
    mapX: 210,
    mapY: 530,
    routeId: 0,
    connectedRoutes: ['Route 1 (North/South)', 'Route 22 (West to League)', 'Route 21 (South to Cinnabar)'],
    connections: ['pewter', 'cinnabar', 'viridian_gym'],
    landmarkDesc: 'Hometown of Pokémon Trainers, Professor Oak\'s Research Laboratory, and the gateway to Route 1.',
  },
  {
    cityIndex: 1,
    id: 'pewter',
    name: 'Pewter City',
    shortName: 'Pewter City',
    badgeName: 'Boulder Badge',
    badgeIcon: '🪨',
    type: 'Rock',
    mapX: 210,
    mapY: 210,
    routeId: 1,
    gymIndex: 0,
    connectedRoutes: ['Route 2 (South through Viridian Forest)', 'Route 3 (East to Mt. Moon)'],
    connections: ['pallet_viridian', 'cerulean'],
    landmarkDesc: 'The ancient stone city nestled high on rocky foothills between Viridian Forest and Mt. Moon.',
  },
  {
    cityIndex: 2,
    id: 'cerulean',
    name: 'Cerulean City',
    shortName: 'Cerulean City',
    badgeName: 'Cascade Badge',
    badgeIcon: '💧',
    type: 'Water',
    mapX: 680,
    mapY: 175,
    routeId: 2,
    gymIndex: 1,
    connectedRoutes: ['Route 4 (West from Mt. Moon)', 'Route 24/25 (North Cape)', 'Route 5 (South to Saffron)', 'Route 9 (East)'],
    connections: ['pewter', 'saffron', 'vermilion'],
    landmarkDesc: 'A floral seaside city surrounded by rushing waterways, Cerulean Cape, and Misty\'s Water Gym.',
  },
  {
    cityIndex: 3,
    id: 'vermilion',
    name: 'Vermilion City',
    shortName: 'Vermilion City',
    badgeName: 'Thunder Badge',
    badgeIcon: '⚡',
    type: 'Electric',
    mapX: 680,
    mapY: 520,
    routeId: 3,
    gymIndex: 2,
    connectedRoutes: ['Route 6 (North from Saffron)', 'Route 11 (East)', 'Southern Sea Channel'],
    connections: ['cerulean', 'saffron', 'celadon', 'fuchsia'],
    landmarkDesc: 'The Port of Exquisite Sunsets, hosting the international luxury liner S.S. Anne and Lt. Surge\'s Gym.',
  },
  {
    cityIndex: 4,
    id: 'celadon',
    name: 'Celadon City',
    shortName: 'Celadon City',
    badgeName: 'Rainbow Badge',
    badgeIcon: '🌈',
    type: 'Grass',
    mapX: 470,
    mapY: 345,
    routeId: 4,
    gymIndex: 3,
    connectedRoutes: ['Route 7 (East to Saffron)', 'Route 16 (West to Cycling Road)'],
    connections: ['saffron', 'fuchsia', 'vermilion'],
    landmarkDesc: 'The City of Rainbow Dreams, famed for its grand Department Store, game corner, and botanic garden Gym.',
  },
  {
    cityIndex: 5,
    id: 'fuchsia',
    name: 'Fuchsia City',
    shortName: 'Fuchsia City',
    badgeName: 'Soul Badge',
    badgeIcon: '☠️',
    type: 'Poison',
    mapX: 560,
    mapY: 630,
    routeId: 5,
    gymIndex: 4,
    connectedRoutes: ['Route 15 (East)', 'Route 18/Cycling Road (North)', 'Route 19 (South Ocean)'],
    connections: ['celadon', 'vermilion', 'cinnabar'],
    landmarkDesc: 'The historic southern ninja settlement bordering the famed Safari Zone wildlife sanctuary.',
  },
  {
    cityIndex: 6,
    id: 'saffron',
    name: 'Saffron City',
    shortName: 'Saffron City',
    badgeName: 'Marsh Badge',
    badgeIcon: '🔮',
    type: 'Psychic',
    mapX: 680,
    mapY: 345,
    routeId: 6,
    gymIndex: 5,
    connectedRoutes: ['Route 5 (North)', 'Route 6 (South)', 'Route 7 (West)', 'Route 8 (East)'],
    connections: ['cerulean', 'celadon', 'vermilion'],
    landmarkDesc: 'The shining golden metropolis and commercial heart of Kanto, headquarters of Silph Co. and Sabrina\'s Gym.',
  },
  {
    cityIndex: 7,
    id: 'cinnabar',
    name: 'Cinnabar Island',
    shortName: 'Cinnabar Island',
    badgeName: 'Volcano Badge',
    badgeIcon: '🔥',
    type: 'Fire',
    mapX: 210,
    mapY: 675,
    routeId: 7,
    gymIndex: 6,
    connectedRoutes: ['Route 21 (North Sea to Pallet)', 'Route 20 (East Sea to Seafoam)'],
    connections: ['pallet_viridian', 'fuchsia'],
    landmarkDesc: 'The volcanic island laboratory home to passionate researchers, hot springs, and Blaine\'s Fire Gym.',
  },
  {
    cityIndex: 8,
    id: 'viridian_gym',
    name: 'Viridian City Gym',
    shortName: 'Viridian Gym',
    badgeName: 'Earth Badge',
    badgeIcon: '🌍',
    type: 'Ground',
    mapX: 210,
    mapY: 440,
    routeId: 8,
    gymIndex: 7,
    connectedRoutes: ['Route 1 (South)', 'Route 2 (North)', 'Route 22 (West to Victory Road)'],
    connections: ['pallet_viridian', 'indigo'],
    landmarkDesc: 'The final gym test before the Pokémon League Championship, led by Gym Leader Giovanni.',
  },
  {
    cityIndex: 9,
    id: 'indigo',
    name: 'Indigo Plateau',
    shortName: 'Indigo Plateau',
    badgeName: 'League Trophy',
    badgeIcon: '🏆',
    type: 'Championship',
    mapX: 110,
    mapY: 140,
    routeId: 8,
    connectedRoutes: ['Route 23 & Victory Road (South)'],
    connections: ['viridian_gym'],
    landmarkDesc: 'The pinnacle of Pokémon mastery — home of the 16-Trainer Tournament and the legendary Elite Four.',
  },
];

export const KANTO_MAP_LANDMARKS: WorldMapLandmark[] = [
  {
    id: 'viridian_forest',
    name: 'Viridian Forest',
    icon: '🌲',
    mapX: 210,
    mapY: 340,
    subtitle: 'Deep Natural Canopy',
    desc: 'Dense labyrinth of ancient evergreen boughs teeming with Bug and Electric Pokémon.',
    requiredRoute: 1,
  },
  {
    id: 'mt_moon',
    name: 'Mt. Moon',
    icon: '⛰️',
    mapX: 430,
    mapY: 195,
    subtitle: 'Moon Stone Caverns',
    desc: 'Mystical mountain range renowned for prehistoric fossils, meteorites, and rare Clefairy dances.',
    requiredRoute: 2,
  },
  {
    id: 'bill_cottage',
    name: 'Cerulean Cape',
    icon: '🌊',
    mapX: 740,
    mapY: 105,
    subtitle: 'Sea Cottage & Bay',
    desc: 'Scenic northern promontory overlooking the ocean, where researchers study rare maritime species.',
    requiredRoute: 2,
  },
  {
    id: 'rock_tunnel',
    name: 'Rock Tunnel',
    icon: '🪨',
    mapX: 840,
    mapY: 250,
    subtitle: 'Dark Granite Pass',
    desc: 'Subterranean passage cutting through eastern Kanto\'s jagged granite mountains.',
    requiredRoute: 3,
  },
  {
    id: 'safari_zone',
    name: 'Safari Zone',
    icon: '🦁',
    mapX: 560,
    mapY: 570,
    subtitle: 'Ecological Sanctuary',
    desc: 'Vast protected wilderness preserve featuring rare Pokémon habitats and Warden\'s rest houses.',
    requiredRoute: 5,
  },
  {
    id: 'seafoam',
    name: 'Seafoam Islands',
    icon: '❄️',
    mapX: 380,
    mapY: 685,
    subtitle: 'Glacial Cavern Strait',
    desc: 'Twin freezing islands situated along the southern sea route, whispered to house legendary Ice Pokémon.',
    requiredRoute: 7,
  },
];

export class KantoWorldMapView {
  private overlayEl: HTMLElement | null = null;
  private selectedId: string = 'pallet_viridian';
  private selectedType: 'city' | 'landmark' = 'city';
  private currentLocationIndex: number = 0;
  private furthestUnlockedIndex: number = 1;
  private onTravelCallback: ((cityIndex: number) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  // Pan & Zoom Engine State
  private zoomLevel: number = 1.0;
  private minZoom: number = 0.9;
  private maxZoom: number = 2.8;
  private panX: number = 0;
  private panY: number = 0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private initialPanX: number = 0;
  private initialPanY: number = 0;
  private activeTouchDist: number = 0;

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
    const currNode = KANTO_MAP_CITIES.find(n => n.cityIndex === this.currentLocationIndex);
    this.selectedId = currNode ? currNode.id : KANTO_MAP_CITIES[0].id;
    this.selectedType = 'city';

    // Reset pan & zoom to center
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;

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

  private isCityUnlocked(city: WorldMapCityNode): boolean {
    return city.cityIndex <= this.furthestUnlockedIndex;
  }

  private isLandmarkUnlocked(landmark: WorldMapLandmark): boolean {
    return landmark.requiredRoute <= this.furthestUnlockedIndex;
  }

  private render(): void {
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
    }

    const overlay = document.createElement('div');
    overlay.className = 'kanto-map-modal-overlay';
    this.overlayEl = overlay;

    const currentCity = KANTO_MAP_CITIES.find(c => c.cityIndex === this.currentLocationIndex) || KANTO_MAP_CITIES[0];

    overlay.innerHTML = `
      <div class="kanto-map-modal-card">
        <!-- Top Title Navigation Bar -->
        <header class="kanto-map-header">
          <div class="kanto-map-header-brand">
            <span class="kanto-map-emblem">🧭</span>
            <div class="kanto-map-title-group">
              <h1 class="kanto-map-title">KANTO REGIONAL WORLD MAP</h1>
              <span class="kanto-map-subtitle">Topographic Navigator & Fast Travel Relay</span>
            </div>
          </div>
          
          <div class="kanto-map-header-meta">
            <div class="kanto-map-current-pill" title="Your current location">
              <span class="pulse-dot"></span>
              <span class="pill-label">Location:</span>
              <strong class="pill-name">${currentCity.shortName}</strong>
            </div>
            <button id="btn-kanto-map-close" class="kanto-map-close-btn" aria-label="Close Map" title="Close (Esc)">✕</button>
          </div>
        </header>

        <!-- Main Workspace (Desktop Split / Mobile Stack) -->
        <div class="kanto-map-workspace">
          <!-- Interactive Map Viewport -->
          <div class="kanto-map-viewport" id="kanto-map-viewport">
            <!-- Zoom & Viewport Controls -->
            <div class="kanto-map-hud-controls">
              <button class="kanto-hud-btn" id="btn-zoom-in" title="Zoom In (+)">＋</button>
              <button class="kanto-hud-btn" id="btn-zoom-out" title="Zoom Out (-)">－</button>
              <button class="kanto-hud-btn" id="btn-recenter" title="Recenter (⌖)">⌖</button>
            </div>

            <!-- Compass Rose / Scale Legend -->
            <div class="kanto-map-compass-hud">
              <div class="compass-needle">N</div>
              <div class="compass-sub">KANTO</div>
            </div>

            <!-- Pannable / Zoomable Stage -->
            <div class="kanto-map-stage" id="kanto-map-stage" style="transform: translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel});">
              <!-- Geographic Illustrated Vector Canvas -->
              <svg class="kanto-geo-svg" viewBox="0 0 1000 750" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <!-- Ocean Deep Coastal Gradient -->
                  <linearGradient id="kantoOceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#023e8a" />
                    <stop offset="40%" stop-color="#0077b6" />
                    <stop offset="80%" stop-color="#0096c7" />
                    <stop offset="100%" stop-color="#03045e" />
                  </linearGradient>

                  <!-- Mainland Lush Grassland Gradient -->
                  <linearGradient id="kantoLandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#2d6a4f" />
                    <stop offset="45%" stop-color="#40916c" />
                    <stop offset="85%" stop-color="#52b788" />
                    <stop offset="100%" stop-color="#1b4332" />
                  </linearGradient>

                  <!-- Mountain Ridge Shading -->
                  <linearGradient id="kantoMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#64748b" />
                    <stop offset="50%" stop-color="#475569" />
                    <stop offset="100%" stop-color="#334155" />
                  </linearGradient>

                  <!-- Volcanic Island Gradient -->
                  <linearGradient id="kantoVolcanoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#dc2626" />
                    <stop offset="60%" stop-color="#991b1b" />
                    <stop offset="100%" stop-color="#450a0a" />
                  </linearGradient>

                  <!-- Shading Filter for Land Relief -->
                  <filter id="kantoShadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="3" dy="5" stdDeviation="6" flood-color="#03045e" flood-opacity="0.65" />
                  </filter>
                  <filter id="kantoGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <!-- 1. OCEAN WATER SURFACE -->
                <rect width="1000" height="750" fill="url(#kantoOceanGrad)" />

                <!-- Water Shorelines & Current Ribbons -->
                <path d="M 0 280 Q 220 250 480 300 T 1000 270 L 1000 750 L 0 750 Z" fill="rgba(72, 202, 228, 0.12)" />
                <path d="M 0 460 Q 320 420 640 480 T 1000 450 L 1000 750 L 0 750 Z" fill="rgba(0, 150, 199, 0.16)" />
                <path d="M 0 600 Q 260 560 580 620 T 1000 590 L 1000 750 L 0 750 Z" fill="rgba(3, 4, 94, 0.24)" />

                <!-- 2. MAINLAND KANTO CONTINENTAL LANDMASS -->
                <!-- Natural Organic Peninsula Shape -->
                <path d="
                  M 70 120
                  L 360 90
                  Q 520 75 740 100
                  Q 890 120 940 250
                  Q 960 380 910 490
                  Q 840 590 680 595
                  Q 570 600 520 540
                  Q 480 470 380 460
                  L 340 510
                  Q 310 590 170 600
                  Q 70 560 60 410
                  L 50 200
                  Z
                " fill="url(#kantoLandGrad)" stroke="#74c69d" stroke-width="5" filter="url(#kantoShadow)" />

                <!-- Coastal Sandy Beach Fringe -->
                <path d="
                  M 68 122
                  L 358 92
                  Q 518 77 738 102
                  Q 888 122 938 252
                  Q 958 382 908 492
                  Q 838 592 678 597
                  Q 568 602 518 542
                  Q 478 472 378 462
                  L 338 512
                  Q 308 592 168 602
                  Q 68 562 58 412
                  L 48 202
                  Z
                " fill="none" stroke="#d8f3dc" stroke-width="2" opacity="0.6" />

                <!-- 3. ISLANDS & REEFS -->
                <!-- Cinnabar Island -->
                <path d="
                  M 160 640
                  Q 260 625 270 705
                  Q 245 745 170 735
                  Q 140 700 160 640
                  Z
                " fill="url(#kantoVolcanoGrad)" stroke="#f87171" stroke-width="3" filter="url(#kantoShadow)" />
                <!-- Cinnabar Caldera Peak -->
                <circle cx="215" cy="685" r="16" fill="#7f1d1d" stroke="#fca5a5" stroke-width="2" />
                <circle cx="215" cy="685" r="6" fill="#450a0a" />

                <!-- Seafoam Islands -->
                <ellipse cx="380" cy="690" rx="36" ry="24" fill="#67e8f9" stroke="#06b6d4" stroke-width="3" filter="url(#kantoShadow)" />
                <ellipse cx="430" cy="700" rx="28" ry="18" fill="#a5f3fc" stroke="#0891b2" stroke-width="2" />

                <!-- 4. MOUNTAIN RANGES & ELEVATIONS -->
                <!-- Mt. Moon Massif -->
                <path d="
                  M 330 210
                  L 380 150
                  L 430 215
                  L 480 160
                  L 535 220
                  L 490 250
                  L 420 240
                  Z
                " fill="url(#kantoMountainGrad)" stroke="#94a3b8" stroke-width="3" />
                <polygon points="380,150 365,185 395,185" fill="#f1f5f9" opacity="0.8" />
                <polygon points="480,160 465,195 495,195" fill="#f1f5f9" opacity="0.8" />

                <!-- Victory Road / Indigo Plateau Ridge -->
                <path d="
                  M 50 170
                  L 110 95
                  L 165 170
                  L 120 200
                  Z
                " fill="url(#kantoMountainGrad)" stroke="#94a3b8" stroke-width="3" />
                <polygon points="110,95 95,130 125,130" fill="#f1f5f9" opacity="0.85" />

                <!-- Eastern Mountain Escarpment (Rock Tunnel) -->
                <path d="
                  M 810 230
                  L 850 180
                  L 890 240
                  L 840 270
                  Z
                " fill="url(#kantoMountainGrad)" stroke="#94a3b8" stroke-width="2.5" />

                <!-- 5. FOREST REGIONS -->
                <!-- Viridian Forest Canopy -->
                <circle cx="210" cy="340" r="42" fill="#1b4332" opacity="0.85" />
                <circle cx="235" cy="325" r="34" fill="#2d6a4f" opacity="0.85" />
                <circle cx="185" cy="350" r="30" fill="#1b4332" opacity="0.85" />
                <text x="210" y="345" font-size="11" font-weight="900" fill="#b7e4c7" text-anchor="middle" letter-spacing="0.5">VIRIDIAN FOREST</text>

                <!-- Fuchsia Safari Woodlands -->
                <circle cx="560" cy="570" r="45" fill="#14532d" opacity="0.85" />
                <circle cx="590" cy="555" r="32" fill="#166534" opacity="0.85" />
                <text x="560" y="575" font-size="11" font-weight="900" fill="#bbf7d0" text-anchor="middle" letter-spacing="0.5">SAFARI ZONE</text>

                <!-- 6. RIVERS, ESTUARIES & WATERWAYS -->
                <!-- Cerulean River / Route 24 Channel -->
                <path d="M 680 100 Q 690 145 680 175" fill="none" stroke="#0077b6" stroke-width="10" stroke-linecap="round" />
                <!-- Water Channel to Vermilion Port -->
                <path d="M 680 185 Q 730 290 730 400 L 730 480 Q 730 535 680 545" fill="none" stroke="#0077b6" stroke-width="12" stroke-linecap="round" />
                <!-- Vermilion Harbor Bay Mouth -->
                <path d="M 660 545 Q 680 620 730 650" fill="none" stroke="#0096c7" stroke-width="16" stroke-linecap="round" opacity="0.7" />

                <!-- 7. ROUTE HIGHWAY NETWORKS (Dynamic SVG Roads) -->
                ${this.renderRouteHighwaysSVG()}
              </svg>

              <!-- Interactive Landmarks Layer -->
              <div class="kanto-map-landmarks-layer">
                ${KANTO_MAP_LANDMARKS.map(l => {
                  const isUnlocked = this.isLandmarkUnlocked(l);
                  const isSelected = this.selectedId === l.id;
                  return `
                    <div
                      class="kanto-landmark-marker ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}"
                      style="left:${(l.mapX / 1000) * 100}%; top:${(l.mapY / 750) * 100}%"
                      data-id="${l.id}"
                      data-type="landmark"
                      title="${l.name}"
                    >
                      <div class="landmark-badge">
                        <span class="landmark-icon">${l.icon}</span>
                      </div>
                      <div class="landmark-name-tag">${l.name}</div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Interactive City Pins Layer -->
              <div class="kanto-map-cities-layer">
                ${KANTO_MAP_CITIES.map(city => {
                  const unlocked = this.isCityUnlocked(city);
                  const isSelected = this.selectedId === city.id;
                  const isCurrent = city.cityIndex === this.currentLocationIndex;

                  return `
                    <div
                      class="kanto-city-pin ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}"
                      style="left:${(city.mapX / 1000) * 100}%; top:${(city.mapY / 750) * 100}%"
                      data-id="${city.id}"
                      data-type="city"
                    >
                      <div class="city-pin-anchor">
                        ${isCurrent ? '<div class="pin-radar-ping"></div>' : ''}
                        <div class="city-pin-bubble">
                          <span class="city-pin-icon">${city.badgeIcon}</span>
                        </div>
                      </div>
                      <div class="city-pin-label">
                        <span class="city-pin-name">${city.shortName}</span>
                        ${!unlocked ? '<span class="city-lock-indicator">🔒</span>' : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Desktop Location Details Sidebar (also serves as source for mobile sheet) -->
          <aside class="kanto-map-sidebar" id="kanto-map-sidebar">
            ${this.renderDetailPanelHTML()}
          </aside>
        </div>

        <!-- Mobile Dedicated Bottom Drawer Card -->
        <div class="kanto-map-mobile-drawer" id="kanto-map-mobile-drawer">
          ${this.renderMobileDrawerHTML()}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.attachEvents();
  }

  private renderRouteHighwaysSVG(): string {
    const lines: string[] = [];
    const drawn = new Set<string>();

    for (const city of KANTO_MAP_CITIES) {
      for (const targetId of city.connections) {
        const key = [city.id, targetId].sort().join('--');
        if (drawn.has(key)) continue;
        drawn.add(key);

        const target = KANTO_MAP_CITIES.find(c => c.id === targetId);
        if (!target) continue;

        const isBothUnlocked = this.isCityUnlocked(city) && this.isCityUnlocked(target);
        const strokeColor = isBothUnlocked ? '#facc15' : '#475569';
        const strokeDash = isBothUnlocked ? 'none' : '6 6';
        const strokeWidth = isBothUnlocked ? '5' : '3.5';
        const opacity = isBothUnlocked ? '0.9' : '0.4';

        lines.push(`
          <!-- Road Underlay / Shading -->
          <line
            x1="${city.mapX}" y1="${city.mapY}"
            x2="${target.mapX}" y2="${target.mapY}"
            stroke="#0f172a"
            stroke-width="${isBothUnlocked ? '8' : '5'}"
            stroke-linecap="round"
            opacity="0.75"
          />
          <!-- Highway Surface -->
          <line
            x1="${city.mapX}" y1="${city.mapY}"
            x2="${target.mapX}" y2="${target.mapY}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${strokeDash}"
            stroke-linecap="round"
            opacity="${opacity}"
          />
        `);
      }
    }

    return lines.join('');
  }

  private renderDetailPanelHTML(): string {
    if (this.selectedType === 'landmark') {
      const landmark = KANTO_MAP_LANDMARKS.find(l => l.id === this.selectedId) || KANTO_MAP_LANDMARKS[0];
      const isUnlocked = this.isLandmarkUnlocked(landmark);

      return `
        <div class="detail-card">
          <div class="detail-header">
            <div class="detail-badge-box landmark-theme">
              <span class="detail-badge-icon">${landmark.icon}</span>
            </div>
            <div class="detail-title-box">
              <span class="detail-region-tag">SPECIAL LANDMARK</span>
              <h2 class="detail-location-name">${landmark.name}</h2>
              <span class="detail-location-subtitle">${landmark.subtitle}</span>
            </div>
          </div>

          <div class="detail-status-banner ${isUnlocked ? 'status-unlocked' : 'status-locked'}">
            <span class="status-icon">${isUnlocked ? '✅' : '🔒'}</span>
            <div class="status-texts">
              <div class="status-headline">${isUnlocked ? 'DISCOVERED REGION' : 'UNDISCOVERED WILDERNESS'}</div>
              <div class="status-subtext">${isUnlocked ? 'Explored on journey route' : `Accessible after reaching Route ${landmark.requiredRoute}`}</div>
            </div>
          </div>

          <div class="detail-body">
            <h3 class="detail-section-title">EXPEDITION NOTES</h3>
            <p class="detail-description">${landmark.desc}</p>
          </div>

          <div class="detail-footer">
            <button class="kanto-action-btn disabled" disabled>
              <span>🧭 SPECIAL FIELD ENCOUNTER AREA</span>
            </button>
            <p class="detail-hint">Accessible through on-foot exploration along connecting routes.</p>
          </div>
        </div>
      `;
    }

    // City Selection
    const city = KANTO_MAP_CITIES.find(c => c.id === this.selectedId) || KANTO_MAP_CITIES[0];
    const isUnlocked = this.isCityUnlocked(city);
    const isCurrent = city.cityIndex === this.currentLocationIndex;
    const gymDef = city.gymIndex !== undefined ? KANTO_GYMS[city.gymIndex] : null;

    return `
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-badge-box city-theme">
            <span class="detail-badge-icon">${city.badgeIcon}</span>
          </div>
          <div class="detail-title-box">
            <span class="detail-region-tag">CITY & GYM HUB</span>
            <h2 class="detail-location-name">${city.name}</h2>
            <span class="detail-location-subtitle">Specialization: ${city.type}</span>
          </div>
        </div>

        <div class="detail-status-banner ${isCurrent ? 'status-current' : isUnlocked ? 'status-unlocked' : 'status-locked'}">
          <span class="status-icon">${isCurrent ? '📍' : isUnlocked ? '✅' : '🔒'}</span>
          <div class="status-texts">
            <div class="status-headline">
              ${isCurrent ? 'YOU ARE HERE' : isUnlocked ? 'VISITED & UNLOCKED' : 'LOCKED — NOT REACHED YET'}
            </div>
            <div class="status-subtext">
              ${isCurrent ? 'Current active exploration hub' : isUnlocked ? 'Available for instant Fast Travel' : 'Advance journey storyline to unlock'}
            </div>
          </div>
        </div>

        <div class="detail-body">
          <h3 class="detail-section-title">ABOUT THIS LOCATION</h3>
          <p class="detail-description">${city.landmarkDesc}</p>

          ${gymDef ? `
            <div class="gym-feature-card">
              <div class="gym-badge-preview">
                <span class="gym-icon">${city.badgeIcon}</span>
              </div>
              <div class="gym-info-texts">
                <div class="gym-name">${gymDef.city} Gym</div>
                <div class="gym-leader-line">Leader: <strong>${gymDef.leader}</strong> (${gymDef.type} Specialist)</div>
                <div class="gym-badge-name">Award: <strong>${gymDef.badgeName}</strong></div>
              </div>
            </div>
          ` : city.cityIndex === 0 ? `
            <div class="gym-feature-card oak-lab">
              <div class="gym-badge-preview"><span>🔬</span></div>
              <div class="gym-info-texts">
                <div class="gym-name">Professor Oak's Lab</div>
                <div class="gym-leader-line">Starter Pokémon distribution & Pokédex Field Analysis</div>
              </div>
            </div>
          ` : `
            <div class="gym-feature-card league-hq">
              <div class="gym-badge-preview"><span>🏆</span></div>
              <div class="gym-info-texts">
                <div class="gym-name">Pokémon League Headquarters</div>
                <div class="gym-leader-line">16-Trainer Regional Championship & Elite Four Citadel</div>
              </div>
            </div>
          `}

          <h3 class="detail-section-title">CONNECTED HIGHWAYS</h3>
          <ul class="connected-routes-list">
            ${city.connectedRoutes.map(r => `<li><span class="route-bullet">➔</span> ${r}</li>`).join('')}
          </ul>
        </div>

        <div class="detail-footer">
          ${isCurrent ? `
            <button class="kanto-action-btn current" disabled>
              <span>📍 CURRENT LOCATION</span>
            </button>
          ` : isUnlocked ? `
            <button id="btn-desktop-fast-travel" class="kanto-action-btn travel active">
              <span>FAST TRAVEL TO ${city.shortName.toUpperCase()} ➔</span>
            </button>
          ` : `
            <button class="kanto-action-btn disabled" disabled title="Advance storyline to unlock">
              <span>🔒 EXPLORE ROUTE TO UNLOCK</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  private renderMobileDrawerHTML(): string {
    if (this.selectedType === 'landmark') {
      const landmark = KANTO_MAP_LANDMARKS.find(l => l.id === this.selectedId) || KANTO_MAP_LANDMARKS[0];
      const isUnlocked = this.isLandmarkUnlocked(landmark);

      return `
        <div class="mobile-drawer-inner">
          <div class="mobile-drawer-header">
            <span class="mobile-loc-icon">${landmark.icon}</span>
            <div class="mobile-loc-titles">
              <div class="mobile-loc-name">${landmark.name}</div>
              <div class="mobile-loc-status ${isUnlocked ? 'text-green' : 'text-amber'}">
                ${isUnlocked ? '✓ Discovered Special Area' : `🔒 Reach Route ${landmark.requiredRoute} to discover`}
              </div>
            </div>
          </div>
          <p class="mobile-loc-desc">${landmark.desc}</p>
        </div>
      `;
    }

    const city = KANTO_MAP_CITIES.find(c => c.id === this.selectedId) || KANTO_MAP_CITIES[0];
    const isUnlocked = this.isCityUnlocked(city);
    const isCurrent = city.cityIndex === this.currentLocationIndex;

    return `
      <div class="mobile-drawer-inner">
        <div class="mobile-drawer-header">
          <span class="mobile-loc-icon">${city.badgeIcon}</span>
          <div class="mobile-loc-titles">
            <div class="mobile-loc-name">${city.name}</div>
            <div class="mobile-loc-status ${isCurrent ? 'text-blue' : isUnlocked ? 'text-green' : 'text-amber'}">
              ${isCurrent ? '📍 Current Location' : isUnlocked ? '✓ Visited · Ready for Travel' : '🔒 Not Visited Yet'}
            </div>
          </div>
        </div>

        <div class="mobile-drawer-action">
          ${isCurrent ? `
            <button class="mobile-travel-btn disabled" disabled>
              <span>📍 CURRENT LOCATION</span>
            </button>
          ` : isUnlocked ? `
            <button id="btn-mobile-fast-travel" class="mobile-travel-btn active">
              <span>FAST TRAVEL ➔</span>
            </button>
          ` : `
            <button class="mobile-travel-btn disabled" disabled>
              <span>🔒 EXPLORE ROUTE FIRST</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  private updateSidebarAndDrawer(): void {
    if (!this.overlayEl) return;
    const sidebar = this.overlayEl.querySelector('#kanto-map-sidebar');
    if (sidebar) {
      sidebar.innerHTML = this.renderDetailPanelHTML();
    }
    const mobileDrawer = this.overlayEl.querySelector('#kanto-map-mobile-drawer');
    if (mobileDrawer) {
      mobileDrawer.innerHTML = this.renderMobileDrawerHTML();
    }
    this.attachTravelTriggers();
  }

  private applyStageTransform(): void {
    if (!this.overlayEl) return;
    const stage = this.overlayEl.querySelector('#kanto-map-stage') as HTMLElement;
    if (stage) {
      stage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
  }

  private clampPan(): void {
    if (!this.overlayEl) return;
    const viewport = this.overlayEl.querySelector('#kanto-map-viewport') as HTMLElement;
    if (!viewport) return;

    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    const maxPanX = (1000 * this.zoomLevel - vpW) / 2 + 150;
    const maxPanY = (750 * this.zoomLevel - vpH) / 2 + 150;

    const limitX = Math.max(80, maxPanX);
    const limitY = Math.max(80, maxPanY);

    this.panX = Math.max(-limitX, Math.min(limitX, this.panX));
    this.panY = Math.max(-limitY, Math.min(limitY, this.panY));
  }

  private attachEvents(): void {
    if (!this.overlayEl) return;

    // 1. Close Button
    const closeBtn = this.overlayEl.querySelector('#btn-kanto-map-close') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    // 2. Zoom In / Out / Recenter Controls
    const zoomInBtn = this.overlayEl.querySelector('#btn-zoom-in') as HTMLButtonElement;
    if (zoomInBtn) {
      zoomInBtn.onclick = (e) => {
        e.stopPropagation();
        this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + 0.25);
        this.clampPan();
        this.applyStageTransform();
        sound.beep(880, 0.05, 'sine');
      };
    }

    const zoomOutBtn = this.overlayEl.querySelector('#btn-zoom-out') as HTMLButtonElement;
    if (zoomOutBtn) {
      zoomOutBtn.onclick = (e) => {
        e.stopPropagation();
        this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - 0.25);
        this.clampPan();
        this.applyStageTransform();
        sound.beep(660, 0.05, 'sine');
      };
    }

    const recenterBtn = this.overlayEl.querySelector('#btn-recenter') as HTMLButtonElement;
    if (recenterBtn) {
      recenterBtn.onclick = (e) => {
        e.stopPropagation();
        this.zoomLevel = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyStageTransform();
        sound.beep(740, 0.08, 'sine');
      };
    }

    // 3. Selection of City Pins
    this.overlayEl.querySelectorAll<HTMLElement>('.kanto-city-pin').forEach(pin => {
      pin.onclick = (e) => {
        e.stopPropagation();
        const id = pin.dataset.id;
        if (id) {
          this.selectedId = id;
          this.selectedType = 'city';
          sound.beep(784, 0.06, 'sine');

          // Highlight selection
          this.overlayEl?.querySelectorAll('.kanto-city-pin, .kanto-landmark-marker').forEach(el => el.classList.remove('selected'));
          pin.classList.add('selected');

          this.updateSidebarAndDrawer();
        }
      };
    });

    // 4. Selection of Landmark Pins
    this.overlayEl.querySelectorAll<HTMLElement>('.kanto-landmark-marker').forEach(marker => {
      marker.onclick = (e) => {
        e.stopPropagation();
        const id = marker.dataset.id;
        if (id) {
          this.selectedId = id;
          this.selectedType = 'landmark';
          sound.beep(659, 0.06, 'sine');

          this.overlayEl?.querySelectorAll('.kanto-city-pin, .kanto-landmark-marker').forEach(el => el.classList.remove('selected'));
          marker.classList.add('selected');

          this.updateSidebarAndDrawer();
        }
      };
    });

    // 5. Pan & Zoom Pointer / Dragging Handlers
    const viewport = this.overlayEl.querySelector('#kanto-map-viewport') as HTMLElement;
    if (viewport) {
      // Wheel Zoom
      viewport.onwheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + zoomDelta));
        if (newZoom !== this.zoomLevel) {
          this.zoomLevel = newZoom;
          this.clampPan();
          this.applyStageTransform();
        }
      };

      // Pointer Down
      viewport.onpointerdown = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('.kanto-hud-btn, .kanto-city-pin, .kanto-landmark-marker')) {
          return;
        }
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.initialPanX = this.panX;
        this.initialPanY = this.panY;
        viewport.setPointerCapture(e.pointerId);
      };

      // Pointer Move
      viewport.onpointermove = (e: PointerEvent) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.panX = this.initialPanX + dx;
        this.panY = this.initialPanY + dy;
        this.clampPan();
        this.applyStageTransform();
      };

      // Pointer Up / Cancel
      const endDrag = (e: PointerEvent) => {
        if (this.isDragging) {
          this.isDragging = false;
          try {
            viewport.releasePointerCapture(e.pointerId);
          } catch {}
        }
      };
      viewport.onpointerup = endDrag;
      viewport.onpointercancel = endDrag;

      // Touch Pinch to Zoom Support
      viewport.ontouchstart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          this.activeTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        }
      };

      viewport.ontouchmove = (e: TouchEvent) => {
        if (e.touches.length === 2 && this.activeTouchDist > 0) {
          e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const factor = dist / this.activeTouchDist;
          this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * (factor > 1 ? 1.03 : 0.97)));
          this.activeTouchDist = dist;
          this.clampPan();
          this.applyStageTransform();
        }
      };

      viewport.ontouchend = () => {
        this.activeTouchDist = 0;
      };
    }

    // 6. Fast Travel Buttons
    this.attachTravelTriggers();

    // 7. Keyboard Navigation & Close
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        window.removeEventListener('keydown', handleKey);
        this.close();
      }
    };
    window.addEventListener('keydown', handleKey);
  }

  private attachTravelTriggers(): void {
    if (!this.overlayEl) return;

    const executeTravel = () => {
      if (this.selectedType !== 'city') return;
      const selectedCity = KANTO_MAP_CITIES.find(c => c.id === this.selectedId);
      if (selectedCity && this.isCityUnlocked(selectedCity)) {
        sound.beep(523, 0.12, 'sine');
        sound.beep(659, 0.15, 'sine', 0.08, 0.1);
        sound.beep(784, 0.25, 'sine', 0.15, 0.2);
        const cityIdx = selectedCity.cityIndex;
        this.close();
        if (this.onTravelCallback) {
          this.onTravelCallback(cityIdx);
        }
      }
    };

    const desktopBtn = this.overlayEl.querySelector('#btn-desktop-fast-travel') as HTMLButtonElement;
    if (desktopBtn) {
      desktopBtn.onclick = executeTravel;
    }

    const mobileBtn = this.overlayEl.querySelector('#btn-mobile-fast-travel') as HTMLButtonElement;
    if (mobileBtn) {
      mobileBtn.onclick = executeTravel;
    }
  }
}

export const kantoWorldMapView = new KantoWorldMapView();
