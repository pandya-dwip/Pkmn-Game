/**
 * gyms.ts
 * Complete 8 Kanto Gym Leaders Definition & Configuration
 * Provides teams, dialogues, badges, levels, and gym arena themes.
 */

export interface GymLeaderDefinition {
  id: number;              // 0 to 7
  city: string;            // Pewter, Cerulean, Vermilion, Celadon, Fuchsia, Saffron, Cinnabar, Viridian
  leader: string;          // Brock, Misty, Lt. Surge, Erika, Koga, Sabrina, Blaine, Giovanni
  title: string;           // The Rock-Solid Pokémon Trainer, etc.
  type: string;            // Rock, Water, Electric, Grass, Poison, Psychic, Fire, Ground
  typeShort: string;       // Ro, Wa, El, Gr, Po, Ps, Fi, Gd
  badgeName: string;       // Boulder Badge, Cascade Badge, etc.
  badgeIcon: string;       // 🪨, 💧, ⚡, 🌈, ☠️, 🔮, 🔥, 🌍
  environment: 'rock' | 'water' | 'electric' | 'grass' | 'poison' | 'psychic' | 'fire' | 'ground';
  rewardMoney: number;
  dialogue: {
    intro: string;
    victory: string;
    defeat: string;
  };
  team: { id: number; lv: number }[];
}

export const KANTO_GYMS: GymLeaderDefinition[] = [
  {
    id: 0,
    city: 'Pewter City',
    leader: 'Brock',
    title: 'The Rock-Solid Pokémon Trainer',
    type: 'ROCK',
    typeShort: 'Ro',
    badgeName: 'Boulder Badge',
    badgeIcon: '🪨',
    environment: 'rock',
    rewardMoney: 1500,
    dialogue: {
      intro: "I'm Brock, the Pewter Gym Leader! My rock-hard willpower will test your strength. Let's see if you can break through my stone defenses!",
      victory: "You have proven your skill and bond with your Pokémon. Take the official Pokémon League Boulder Badge!",
      defeat: "Your rock-hard determination shattered our defenses. Train harder and challenge me again!",
    },
    team: [
      { id: 74, lv: 10 }, // Geodude
      { id: 95, lv: 12 }, // Onix
    ],
  },
  {
    id: 1,
    city: 'Cerulean City',
    leader: 'Misty',
    title: 'The Tomboyish Mermaid',
    type: 'WATER',
    typeShort: 'Wa',
    badgeName: 'Cascade Badge',
    badgeIcon: '💧',
    environment: 'water',
    rewardMoney: 2200,
    dialogue: {
      intro: "Hi! I'm Misty, the Cerulean Gym Leader! My policy is an all-out offensive with graceful Water-type Pokémon! Don't expect me to go easy on you!",
      victory: "Wow, you really are a talented trainer! You've earned the Cascade Badge. Keep making waves!",
      defeat: "You need more than just dry land tactics to overcome the Cerulean tides. Come back when you're ready!",
    },
    team: [
      { id: 120, lv: 16 }, // Staryu
      { id: 121, lv: 19 }, // Starmie
    ],
  },
  {
    id: 2,
    city: 'Vermilion City',
    leader: 'Lt. Surge',
    title: 'The Lightning American',
    type: 'ELECTRIC',
    typeShort: 'El',
    badgeName: 'Thunder Badge',
    badgeIcon: '⚡',
    environment: 'electric',
    rewardMoney: 3000,
    dialogue: {
      intro: "Ten-hut! I'm Lt. Surge! My electric Pokémon zapped my enemies in battle. Let's see if you've got the guts to survive high voltage!",
      victory: "Whoa, that was a shocking battle! You took the full blast and stood tall. Here is the Thunder Badge!",
      defeat: "Not enough voltage, rookie! You need more juice in your squad to stand against my lightning!",
    },
    team: [
      { id: 100, lv: 21 }, // Voltorb
      { id: 25, lv: 22 },  // Pikachu
      { id: 26, lv: 25 },  // Raichu
    ],
  },
  {
    id: 3,
    city: 'Celadon City',
    leader: 'Erika',
    title: 'The Nature-Loving Princess',
    type: 'GRASS',
    typeShort: 'Gr',
    badgeName: 'Rainbow Badge',
    badgeIcon: '🌈',
    environment: 'grass',
    rewardMoney: 4000,
    dialogue: {
      intro: "Hello, wanderer. I am Erika of the Celadon Gym. I practice the gentle art of flower arranging and Grass-type battles. Shall we begin?",
      victory: "Such a beautiful and vibrant display of harmony! I proudly confer upon you the Rainbow Badge.",
      defeat: "Nature's tranquility requires deep roots and patience. Tend to your Pokémon and visit our garden again.",
    },
    team: [
      { id: 114, lv: 28 }, // Tangela
      { id: 70, lv: 29 },  // Weepinbell
      { id: 45, lv: 32 },  // Vileplume
    ],
  },
  {
    id: 4,
    city: 'Fuchsia City',
    leader: 'Koga',
    title: 'The Poisonous Ninja Master',
    type: 'POISON',
    typeShort: 'Po',
    badgeName: 'Soul Badge',
    badgeIcon: '☠️',
    environment: 'poison',
    rewardMoney: 5500,
    dialogue: {
      intro: "Fwahahaha! A mere challenger dares step into the Fuchsia ninja dojo? Face the toxic illusions and venom of my Pokémon!",
      victory: "Incredible technique! You cut through my shadows and poisonous mist. You have earned the Soul Badge!",
      defeat: "You were consumed by the venomous traps of the ninja. Sharpen your senses before returning!",
    },
    team: [
      { id: 109, lv: 35 }, // Koffing
      { id: 89, lv: 36 },  // Muk
      { id: 110, lv: 39 }, // Weezing
    ],
  },
  {
    id: 5,
    city: 'Saffron City',
    leader: 'Sabrina',
    title: 'The Master of Psychic Power',
    type: 'PSYCHIC',
    typeShort: 'Ps',
    badgeName: 'Marsh Badge',
    badgeIcon: '🔮',
    environment: 'psychic',
    rewardMoney: 7000,
    dialogue: {
      intro: "I foresaw your arrival. I am Sabrina, master of telekinesis and psychic energy. Can your mind endure the unseen forces?",
      victory: "Your psychic connection with your team surpassed even my precognitive visions. Take the Marsh Badge.",
      defeat: "Your thoughts were disjointed and easily read. Cleanse your mind and try once more.",
    },
    team: [
      { id: 64, lv: 40 },  // Kadabra
      { id: 122, lv: 41 }, // Mr. Mime
      { id: 65, lv: 44 },  // Alakazam
    ],
  },
  {
    id: 6,
    city: 'Cinnabar Island',
    leader: 'Blaine',
    title: 'The Hot-Headed Quiz Master',
    type: 'FIRE',
    typeShort: 'Fi',
    badgeName: 'Volcano Badge',
    badgeIcon: '🔥',
    environment: 'fire',
    rewardMoney: 8500,
    dialogue: {
      intro: "Hah! I am Blaine, the red-hot leader of Cinnabar! My fierce fire Pokémon burn hotter than volcanic magma! Do you have Burn Heal ready?",
      victory: "You extinguished my scorching flames! What an incandescent victory! Accept the Volcano Badge!",
      defeat: "Burned to a crisp! My flames are too hot for unprepared trainers. Cool off and challenge me again!",
    },
    team: [
      { id: 58, lv: 45 }, // Growlithe
      { id: 77, lv: 46 }, // Ponyta
      { id: 78, lv: 47 }, // Rapidash
      { id: 59, lv: 50 }, // Arcanine
    ],
  },
  {
    id: 7,
    city: 'Viridian City',
    leader: 'Giovanni',
    title: 'The Ground-Breaking Titan',
    type: 'GROUND',
    typeShort: 'Gd',
    badgeName: 'Earth Badge',
    badgeIcon: '🌍',
    environment: 'ground',
    rewardMoney: 10000,
    dialogue: {
      intro: "Welcome to my final Gym. I am Giovanni. Many have tried to stand before my crushing earth power, and all have crumbled. Show me your true strength!",
      victory: "Splendid... You withstood the raw power of the earth itself. You now hold all eight Kanto Badges. Enter the Championship!",
      defeat: "You lack the ruthless resolve required to conquer the earth. Come back when you are ready to face true power.",
    },
    team: [
      { id: 111, lv: 48 }, // Rhyhorn
      { id: 51, lv: 49 },  // Dugtrio
      { id: 31, lv: 51 },  // Nidoqueen
      { id: 34, lv: 53 },  // Nidoking
    ],
  },
];
