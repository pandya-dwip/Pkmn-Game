/**
 * icons.ts
 * Modern Vector Icon Registry (Material & Adventure RPG Style)
 * Replaces all emoji icons with crisp, scalable, high-contrast SVG vector graphics.
 */

export const ICONS = {
  // --- KANTO GYM BADGES ---
  badgeBoulder: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-boulder">
      <defs>
        <linearGradient id="grad-boulder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="50%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <polygon points="12,2 21,7 18,19 6,19 3,7" fill="url(#grad-boulder)" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="12,2 18,19 12,22 6,19" fill="#475569" opacity="0.35"/>
      <polyline points="3,7 12,12 21,7" fill="none" stroke="#f1f5f9" stroke-width="1.2" opacity="0.75"/>
    </svg>`,

  badgeCascade: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-cascade">
      <defs>
        <linearGradient id="grad-cascade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="60%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <path d="M12 2.5 C12 2.5, 4 12, 4 16.5 A8 8 0 0 0 20 16.5 C20 12, 12 2.5, 12 2.5 Z" fill="url(#grad-cascade)" stroke="#e0f2fe" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M9 13 A4 4 0 0 0 14 19" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
    </svg>`,

  badgeThunder: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-thunder">
      <defs>
        <linearGradient id="grad-thunder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#ca8a04"/>
        </linearGradient>
      </defs>
      <polygon points="13,2 4,13 11,13 9,22 20,10 13,10" fill="url(#grad-thunder)" stroke="#fef9c3" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,

  badgeRainbow: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-rainbow">
      <defs>
        <linearGradient id="grad-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e"/>
          <stop offset="25%" stop-color="#fb923c"/>
          <stop offset="50%" stop-color="#facc15"/>
          <stop offset="75%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#grad-rainbow)" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <circle cx="12" cy="12" r="2" fill="#0f172a"/>
    </svg>`,

  badgeSoul: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-soul">
      <defs>
        <linearGradient id="grad-soul" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e879f9"/>
          <stop offset="60%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#6b21a8"/>
        </linearGradient>
      </defs>
      <path d="M12 21 C12 21, 3 14, 3 8 A5 5 0 0 1 12 5 A5 5 0 0 1 21 8 C21 14, 12 21, 12 21 Z" fill="url(#grad-soul)" stroke="#f5d0fe" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="2.5" fill="#ffffff" opacity="0.9"/>
    </svg>`,

  badgeMarsh: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-marsh">
      <defs>
        <linearGradient id="grad-marsh" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="60%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#92400e"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.5" fill="url(#grad-marsh)" stroke="#fef3c7" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.85"/>
      <circle cx="12" cy="12" r="2.8" fill="#ffffff"/>
    </svg>`,

  badgeVolcano: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-volcano">
      <defs>
        <linearGradient id="grad-volcano" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185"/>
          <stop offset="50%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#b91c1c"/>
        </linearGradient>
      </defs>
      <polygon points="12,2 21,18 17,21 7,21 3,18" fill="url(#grad-volcano)" stroke="#fecdd3" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="12,7 17,17 7,17" fill="#fbbf24" opacity="0.9"/>
      <polygon points="12,11 15,17 9,17" fill="#ffffff"/>
    </svg>`,

  badgeEarth: (size = 20) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="badge-svg badge-svg-earth">
      <defs>
        <linearGradient id="grad-earth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ade80"/>
          <stop offset="50%" stop-color="#16a34a"/>
          <stop offset="100%" stop-color="#14532d"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="url(#grad-earth)" stroke="#bbf7d0" stroke-width="1.5"/>
      <path d="M12 6 L12 18 M7 11 L12 6 L17 11" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  // --- RESOURCE & INVENTORY ICONS ---
  money: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-money">
      <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.5"/>
      <path d="M8 8h6a3 3 0 0 1 0 6H8v4M7 11h7M7 14h7" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

  pokeBall: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-pokeball">
      <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>
      <path d="M2.5 12 A9.5 9.5 0 0 1 21.5 12 Z" fill="#ef4444"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke="#1e293b" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="3.5" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="1.4" fill="#1e293b"/>
    </svg>`,

  greatBall: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-greatball">
      <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <path d="M2.5 12 A9.5 9.5 0 0 1 21.5 12 Z" fill="#0284c7"/>
      <path d="M6 7 L9 11 M18 7 L15 11" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke="#1e293b" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="3.5" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="1.4" fill="#1e293b"/>
    </svg>`,

  ultraBall: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-ultraball">
      <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#1e293b" stroke-width="1.5"/>
      <path d="M2.5 12 A9.5 9.5 0 0 1 21.5 12 Z" fill="#1e293b"/>
      <path d="M7 5 A8 8 0 0 1 17 5 L15 11 L9 11 Z" fill="#f59e0b"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke="#1e293b" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="3.5" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="1.4" fill="#1e293b"/>
    </svg>`,

  oranBerry: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-oran">
      <path d="M12 4 C8 4, 5 7, 5 12 C5 17, 8 20, 12 20 C16 20, 19 17, 19 12 C19 7, 16 4, 12 4 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
      <path d="M12 4 C11 2, 13 1, 14 1 C14 2, 13 3, 12 4 Z" fill="#22c55e" stroke="#15803d" stroke-width="1"/>
      <circle cx="10" cy="10" r="1.5" fill="#ffffff" opacity="0.75"/>
    </svg>`,

  sitrusBerry: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-sitrus">
      <ellipse cx="12" cy="13" rx="7.5" ry="8.5" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
      <path d="M12 4.5 C12 2.5, 14 1.5, 15 1.5 C15 3, 13.5 4, 12 4.5 Z" fill="#16a34a" stroke="#15803d" stroke-width="1"/>
      <circle cx="9.5" cy="10.5" r="1.8" fill="#ffffff" opacity="0.8"/>
    </svg>`,

  fullHeal: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-fullheal">
      <path d="M10 2 L14 2 L14 5 L10 5 Z" fill="#64748b"/>
      <path d="M8 6 L16 6 L19 20 A2 2 0 0 1 17 22 L7 22 A2 2 0 0 1 5 20 Z" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5"/>
      <path d="M12 10 L12 18 M8 14 L16 14" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  revive: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-revive">
      <polygon points="12,2 21,12 12,22 3,12" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="12,6 18,12 12,18 6,12" fill="#fef08a"/>
      <circle cx="12" cy="12" r="2" fill="#ca8a04"/>
    </svg>`,

  // --- CORE UI & ACTION ICONS ---
  trophy: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-trophy" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
      <path d="M4 3h16v6a8 8 0 0 1-16 0V3z"/>
      <path d="M12 17v4"/>
      <path d="M8 21h8"/>
    </svg>`,

  swords: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-swords" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M19 13l2 2-5 5-2-2"/>
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5M11 19l-6-6M5 13l-2 2 5 5 2-2"/>
    </svg>`,

  train: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-train" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 7v10M18 7v10M2 10h4M18 10h4M6 12h12M2 14h4M18 14h4"/>
      <rect x="6" y="9" width="12" height="6" rx="1" fill="currentColor" opacity="0.15"/>
    </svg>`,

  bag: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-bag" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a4 4 0 0 1 8 0v2"/>
      <rect x="4" y="8" width="16" height="13" rx="3"/>
      <path d="M9 13h6M12 13v3"/>
    </svg>`,

  team: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-team" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="8" r="4"/>
      <path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <circle cx="17" cy="9" r="3"/>
      <path d="M19 20v-1.5a3 3 0 0 0-2-2.8"/>
    </svg>`,

  bracket: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-bracket" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 5h4v5h5v4h7"/>
      <path d="M4 19h4v-5h5"/>
      <path d="M4 11h3"/>
      <circle cx="20" cy="14" r="2" fill="currentColor"/>
    </svg>`,

  city: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-city" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21h18M5 21V7l8-4v18M13 11l6-2v12"/>
      <line x1="9" y1="9" x2="9" y2="9.01"/>
      <line x1="9" y1="13" x2="9" y2="13.01"/>
      <line x1="9" y1="17" x2="9" y2="17.01"/>
    </svg>`,

  star: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-star" fill="#eab308" stroke="#ca8a04" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,

  heal: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-heal" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>`,

  shop: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-shop" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>`,

  center: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-center" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      <path d="M12 8v6M9 11h6"/>
    </svg>`,

  arrowRight: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-arrow" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>`,

  pokedex: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-pokedex" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="3"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
      <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
    </svg>`,

  box: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-box" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>`,

  manage: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-manage" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,

  plus: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-plus" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`,

  swap: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-swap" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
    </svg>`,

  back: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-back" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>`,

  check: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-check" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`,

  lightning: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-lightning" fill="#facc15" stroke="#ca8a04" stroke-width="1.2">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
    </svg>`,

  crown: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-crown" fill="#facc15" stroke="#ca8a04" stroke-width="1.5">
      <path d="M2 19h20v2H2zM3 17l3-9 6 6 6-6 3 9H3z"/>
    </svg>`,

  sparkle: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-sparkle" fill="#38bdf8" stroke="#0284c7" stroke-width="1">
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>
    </svg>`,

  skull: (size = 18) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-skull" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
      <path d="M8 20v-2h8v2M12 17v-1M4 11a8 8 0 0 1 16 0c0 3-1.5 5.5-3.5 7h-9C5.5 16.5 4 14 4 11z"/>
    </svg>`,

  compass: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-compass" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#ef4444"/>
    </svg>`,

  gate: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-gate" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M9 21v-8a3 3 0 0 1 6 0v8"/>
    </svg>`,

  tree: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ui-svg ui-svg-tree" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 4 15 9 15 5 20 19 20 15 15 20 15 12 2" fill="#22c55e" opacity="0.3"/>
      <line x1="12" y1="20" x2="12" y2="24" stroke="#78350f" stroke-width="2.5"/>
    </svg>`,

  // --- ELEMENTAL STONES ---
  fireStone: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-firestone">
      <polygon points="12,2 21,8 18,21 6,21 3,8" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5"/>
      <path d="M12 7 C14 10, 16 12, 14 16 C13 18, 11 18, 10 16 C9 14, 11 12, 12 7 Z" fill="#facc15"/>
    </svg>`,

  waterStone: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-waterstone">
      <polygon points="12,2 21,8 18,21 6,21 3,8" fill="#0284c7" stroke="#7dd3fc" stroke-width="1.5"/>
      <path d="M12 6 C12 6, 8 12, 8 15 A4 4 0 0 0 16 15 C16 12, 12 6, 12 6 Z" fill="#ffffff" opacity="0.85"/>
    </svg>`,

  thunderStone: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-thunderstone">
      <polygon points="12,2 21,8 18,21 6,21 3,8" fill="#eab308" stroke="#fef08a" stroke-width="1.5"/>
      <polygon points="13,7 8,13 12,13 11,18 16,11 12,11" fill="#ffffff"/>
    </svg>`,

  moonStone: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-moonstone">
      <polygon points="12,2 21,8 18,21 6,21 3,8" fill="#6366f1" stroke="#c7d2fe" stroke-width="1.5"/>
      <path d="M15 8 A5 5 0 0 0 11 16 A5 5 0 1 1 15 8 Z" fill="#ffffff" opacity="0.9"/>
    </svg>`,

  leafStone: (size = 16) => `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" class="res-svg res-svg-leafstone">
      <polygon points="12,2 21,8 18,21 6,21 3,8" fill="#16a34a" stroke="#86efac" stroke-width="1.5"/>
      <path d="M12 6 C8 10, 8 16, 12 18 C16 16, 16 10, 12 6 Z" fill="#ffffff" opacity="0.8"/>
    </svg>`,
};
