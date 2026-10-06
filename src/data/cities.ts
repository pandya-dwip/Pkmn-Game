/**
 * cities.ts
 * Definition and metadata for all Kanto cities and destinations.
 * Enables Town Map navigation, fast travel, and returning to previous cities.
 */

export interface KantoCityInfo {
  index: number;
  name: string;
  shortName: string;
  icon: string;
  routeId: number;
  gymIndex?: number;
  leaderName?: string;
  badgeName?: string;
  badgeIcon?: string;
  region: string;
  desc: string;
}

export const KANTO_CITIES: KantoCityInfo[] = [
  {
    index: 0,
    name: 'Pallet Town & Viridian City',
    shortName: 'Pallet & Viridian',
    icon: '🌿',
    routeId: 0,
    region: 'South-West Kanto',
    desc: 'Hometown of Pokémon Trainers and the City of Evergreen Blossoms.',
  },
  {
    index: 1,
    name: 'Pewter City',
    shortName: 'Pewter City',
    icon: '🪨',
    routeId: 1,
    gymIndex: 0,
    leaderName: 'Brock',
    badgeName: 'Boulder Badge',
    badgeIcon: '🪨',
    region: 'North-West Kanto',
    desc: 'The Stone City nestled between Viridian Forest and Mt. Moon.',
  },
  {
    index: 2,
    name: 'Cerulean City',
    shortName: 'Cerulean City',
    icon: '💧',
    routeId: 2,
    gymIndex: 1,
    leaderName: 'Misty',
    badgeName: 'Cascade Badge',
    badgeIcon: '💧',
    region: 'North Kanto',
    desc: 'A floral seaside city surrounded by flowing blue waterways.',
  },
  {
    index: 3,
    name: 'Vermilion City',
    shortName: 'Vermilion City',
    icon: '⚡',
    routeId: 3,
    gymIndex: 2,
    leaderName: 'Lt. Surge',
    badgeName: 'Thunder Badge',
    badgeIcon: '⚡',
    region: 'South Kanto Coast',
    desc: 'The Port of Exquisite Sunsets with bustling harbor docks.',
  },
  {
    index: 4,
    name: 'Celadon City',
    shortName: 'Celadon City',
    icon: '🌈',
    routeId: 4,
    gymIndex: 3,
    leaderName: 'Erika',
    badgeName: 'Rainbow Badge',
    badgeIcon: '🌈',
    region: 'Central Kanto',
    desc: 'The City of Rainbow Dreams with the grand Department Store.',
  },
  {
    index: 5,
    name: 'Fuchsia City',
    shortName: 'Fuchsia City',
    icon: '☠️',
    routeId: 5,
    gymIndex: 4,
    leaderName: 'Koga',
    badgeName: 'Soul Badge',
    badgeIcon: '☠️',
    region: 'South Kanto',
    desc: 'The historic ninja settlement bordering the famed Safari Zone.',
  },
  {
    index: 6,
    name: 'Saffron City',
    shortName: 'Saffron City',
    icon: '🔮',
    routeId: 6,
    gymIndex: 5,
    leaderName: 'Sabrina',
    badgeName: 'Marsh Badge',
    badgeIcon: '🔮',
    region: 'Central Metropolis',
    desc: 'The shining golden metropolis and commercial heart of Kanto.',
  },
  {
    index: 7,
    name: 'Cinnabar Island',
    shortName: 'Cinnabar Island',
    icon: '🔥',
    routeId: 7,
    gymIndex: 6,
    leaderName: 'Blaine',
    badgeName: 'Volcano Badge',
    badgeIcon: '🔥',
    region: 'Southern Island',
    desc: 'The fiery volcanic island laboratory home to passionate researchers.',
  },
  {
    index: 8,
    name: 'Viridian City Gym',
    shortName: 'Viridian Gym',
    icon: '🌍',
    routeId: 8,
    gymIndex: 7,
    leaderName: 'Giovanni',
    badgeName: 'Earth Badge',
    badgeIcon: '🌍',
    region: 'Western Kanto',
    desc: 'The final test before the Pokémon League Championship.',
  },
  {
    index: 9,
    name: 'Indigo Plateau',
    shortName: 'Indigo Plateau',
    icon: '🏆',
    routeId: 8,
    region: 'League Headquarters',
    desc: 'The pinnacle of Pokémon competition — Championship & Elite Four.',
  },
];

export function getFurthestUnlockedCityIndex(gymIndex: number = 0, has8Badges: boolean = false): number {
  if (has8Badges || gymIndex >= 8) {
    return 9; // Indigo Plateau
  }
  return Math.min(8, Math.max(1, gymIndex + 1));
}
