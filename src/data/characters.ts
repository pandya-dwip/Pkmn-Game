/**
 * characters.ts
 * Character customization definitions and canvas renderer for Kanto Cup RPG.
 * Provides 8 distinct trainers (4 Male, 4 Female) with unique silhouettes,
 * hairstyles, color palettes, hats, outfits, and accessories.
 */

export interface TrainerCustomization {
  id: string;
  name: string;
  gender: 'male' | 'female';
  title: string;
  description: string;
  tagline: string;
  palette: {
    skin: string;
    skinShadow: string;
    hair: string;
    hairHighlight?: string;
    hatMain?: string;
    hatSec?: string;
    topMain: string;
    topSec: string;
    bottomMain: string;
    bottomSec?: string;
    shoesMain: string;
    shoesSec: string;
    accessoryMain?: string;
    backpackMain: string;
    backpackSec?: string;
    eyeColor: string;
  };
  style: {
    hairStyle: 'spiky' | 'wavy_shaggy' | 'short_trim' | 'beret_neat' | 'long_fringe' | 'pigtails' | 'buns_curls' | 'twin_tails';
    hatType: 'baseball_cap' | 'backwards_cap' | 'beanie' | 'beret' | 'sunhat' | 'straw_hat' | 'bandana' | 'coordinator_beanie' | 'none';
    bottomType: 'jeans' | 'shorts' | 'skirt' | 'overalls';
    hasGlasses?: boolean;
    hasRibbon?: boolean;
    hasSatchel?: boolean;
  };
}

export const TRAINER_CHARACTERS: TrainerCustomization[] = [
  // ==========================================================================
  // MALE TRAINERS (4 Options)
  // ==========================================================================
  {
    id: 'male_red',
    name: 'Red',
    gender: 'male',
    title: 'The Champion of Pallet',
    description: 'The iconic trainer from Pallet Town. Spirited, resolute, and equipped with his classic crimson cap and blue vest.',
    tagline: 'Classic & Passionate',
    palette: {
      skin: '#fed7aa',
      skinShadow: '#fdba74',
      hair: '#292524',
      hairHighlight: '#44403c',
      hatMain: '#dc2626',
      hatSec: '#ffffff',
      topMain: '#dc2626',
      topSec: '#ffffff',
      bottomMain: '#1e3a8a',
      bottomSec: '#2563eb',
      shoesMain: '#dc2626',
      shoesSec: '#ffffff',
      backpackMain: '#15803d',
      backpackSec: '#facc15',
      eyeColor: '#0f172a',
    },
    style: {
      hairStyle: 'spiky',
      hatType: 'baseball_cap',
      bottomType: 'jeans',
    },
  },
  {
    id: 'male_ethan',
    name: 'Ethan',
    gender: 'male',
    title: 'The Golden Striker',
    description: 'An athletic and energetic explorer. Wears a backwards amber cap, sporty charcoal zip-hoodie, and adventure pack.',
    tagline: 'Athletic & Spirited',
    palette: {
      skin: '#fde047',
      skinShadow: '#eab308',
      hair: '#78350f',
      hairHighlight: '#92400e',
      hatMain: '#f59e0b',
      hatSec: '#1e293b',
      topMain: '#0f172a',
      topSec: '#f59e0b',
      bottomMain: '#334155',
      bottomSec: '#64748b',
      shoesMain: '#f59e0b',
      shoesSec: '#0f172a',
      backpackMain: '#eab308',
      backpackSec: '#ca8a04',
      eyeColor: '#1e293b',
    },
    style: {
      hairStyle: 'wavy_shaggy',
      hatType: 'backwards_cap',
      bottomType: 'shorts',
    },
  },
  {
    id: 'male_brendan',
    name: 'Brendan',
    gender: 'male',
    title: 'The Frontier Scout',
    description: 'A wilderness pathfinder equipped for mountain trails. Sports an emerald knit beanie, expedition windbreaker, and hiking boots.',
    tagline: 'Tactical & Hardy',
    palette: {
      skin: '#fed7aa',
      skinShadow: '#fb923c',
      hair: '#451a03',
      hairHighlight: '#78350f',
      hatMain: '#059669',
      hatSec: '#f8fafc',
      topMain: '#047857',
      topSec: '#0284c7',
      bottomMain: '#1e293b',
      bottomSec: '#334155',
      shoesMain: '#047857',
      shoesSec: '#334155',
      backpackMain: '#065f46',
      backpackSec: '#34d399',
      eyeColor: '#064e3b',
    },
    style: {
      hairStyle: 'short_trim',
      hatType: 'beanie',
      bottomType: 'jeans',
      hasSatchel: true,
    },
  },
  {
    id: 'male_lucas',
    name: 'Lucas',
    gender: 'male',
    title: 'The Urban Ace',
    description: 'A stylish researcher from the city. Dons a sharp white beret with an azure crest, navy cardigan vest, and crimson neckerchief.',
    tagline: 'Scholarly & Elegant',
    palette: {
      skin: '#fef08a',
      skinShadow: '#facc15',
      hair: '#1e293b',
      hairHighlight: '#334155',
      hatMain: '#f8fafc',
      hatSec: '#0284c7',
      topMain: '#1e3a8a',
      topSec: '#ef4444',
      bottomMain: '#475569',
      bottomSec: '#64748b',
      shoesMain: '#0f172a',
      shoesSec: '#94a3b8',
      backpackMain: '#0284c7',
      backpackSec: '#38bdf8',
      eyeColor: '#1d4ed8',
    },
    style: {
      hairStyle: 'beret_neat',
      hatType: 'beret',
      bottomType: 'jeans',
    },
  },

  // ==========================================================================
  // FEMALE TRAINERS (4 Options)
  // ==========================================================================
  {
    id: 'female_leaf',
    name: 'Leaf',
    gender: 'female',
    title: 'The Verdant Voyager',
    description: 'The cheerful and inquisitive adventurer of Kanto. Known for her wide-brim sunhat with crimson ribbon and aqua explorer tunic.',
    tagline: 'Vibrant & Inquisitive',
    palette: {
      skin: '#fed7aa',
      skinShadow: '#fdba74',
      hair: '#78350f',
      hairHighlight: '#92400e',
      hatMain: '#f8fafc',
      hatSec: '#ef4444',
      topMain: '#06b6d4',
      topSec: '#ffffff',
      bottomMain: '#0284c7',
      bottomSec: '#38bdf8',
      shoesMain: '#f8fafc',
      shoesSec: '#ef4444',
      backpackMain: '#facc15',
      backpackSec: '#eab308',
      eyeColor: '#047857',
    },
    style: {
      hairStyle: 'long_fringe',
      hatType: 'sunhat',
      bottomType: 'skirt',
      hasRibbon: true,
    },
  },
  {
    id: 'female_lyra',
    name: 'Lyra',
    gender: 'female',
    title: 'The Meadow Ranger',
    description: 'A lively countryside ranger with chestnut twin tails, a sunny straw boater hat, denim overalls, and red adventurer bow.',
    tagline: 'Playful & Nature-Loving',
    palette: {
      skin: '#fef3c7',
      skinShadow: '#fde68a',
      hair: '#854d0e',
      hairHighlight: '#a16207',
      hatMain: '#fef08a',
      hatSec: '#1e3a8a',
      topMain: '#dc2626',
      topSec: '#ffffff',
      bottomMain: '#2563eb',
      bottomSec: '#1d4ed8',
      shoesMain: '#78350f',
      shoesSec: '#ffffff',
      backpackMain: '#ea580c',
      backpackSec: '#f97316',
      eyeColor: '#78350f',
    },
    style: {
      hairStyle: 'pigtails',
      hatType: 'straw_hat',
      bottomType: 'overalls',
    },
  },
  {
    id: 'female_may',
    name: 'May',
    gender: 'female',
    title: 'The Dynamic Striker',
    description: 'A fiery, sports-loving trainer. Wears a bold scarlet bandana headband, athletic vermilion top, biker shorts, and utility satchel.',
    tagline: 'Bold & High-Energy',
    palette: {
      skin: '#fed7aa',
      skinShadow: '#fb923c',
      hair: '#713f12',
      hairHighlight: '#854d0e',
      hatMain: '#dc2626',
      hatSec: '#ffffff',
      topMain: '#ef4444',
      topSec: '#1e293b',
      bottomMain: '#0f172a',
      bottomSec: '#334155',
      shoesMain: '#10b981',
      shoesSec: '#ffffff',
      backpackMain: '#eab308',
      backpackSec: '#ca8a04',
      eyeColor: '#0284c7',
    },
    style: {
      hairStyle: 'buns_curls',
      hatType: 'bandana',
      bottomType: 'shorts',
      hasSatchel: true,
    },
  },
  {
    id: 'female_dawn',
    name: 'Dawn',
    gender: 'female',
    title: 'The Chic Coordinator',
    description: 'A confident, trendsetting trainer and coordinator. Features twin midnight tails, a platinum coordinator knit beanie, and pink scarf.',
    tagline: 'Graceful & Confident',
    palette: {
      skin: '#fef08a',
      skinShadow: '#fde047',
      hair: '#1e3a8a',
      hairHighlight: '#2563eb',
      hatMain: '#f8fafc',
      hatSec: '#ec4899',
      topMain: '#0f172a',
      topSec: '#f472b6',
      bottomMain: '#db2777',
      bottomSec: '#be185d',
      shoesMain: '#ec4899',
      shoesSec: '#f8fafc',
      backpackMain: '#f43f5e',
      backpackSec: '#fb7185',
      eyeColor: '#1e40af',
    },
    style: {
      hairStyle: 'twin_tails',
      hatType: 'coordinator_beanie',
      bottomType: 'skirt',
    },
  },
];

export function getTrainerById(id?: string): TrainerCustomization {
  const found = TRAINER_CHARACTERS.find(t => t.id === id);
  return found || TRAINER_CHARACTERS[0];
}

/**
 * Draws a customized 2.5D trainer sprite on an arbitrary HTML Canvas context.
 * Used for exploration in RouteExplorationEngine as well as Character Preview UI!
 */
export function drawCustomTrainerSprite(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: 'down' | 'up' | 'left' | 'right',
  animFrame: number,
  trainerId: string = 'male_red',
  inGrass: boolean = false,
  time: number = 0,
  scaleFactor: number = 1.0
): void {
  const trainer = getTrainerById(trainerId);
  const p = trainer.palette;
  const s = trainer.style;

  ctx.save();
  ctx.translate(px, py);
  if (scaleFactor !== 1.0) {
    ctx.scale(scaleFactor, scaleFactor);
  }

  // Animation bobs
  const bob = animFrame === 1 ? -2 : animFrame === 3 ? 2 : 0;
  const legSwing = animFrame === 1 ? -3.5 : animFrame === 3 ? 3.5 : 0;
  const isWalking = animFrame !== 0;

  // Idle subtle breathing
  const breathing = isWalking ? 0 : Math.sin(time * 3.5) * 0.7;

  // 1. Soft Elliptical Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
  ctx.beginPath();
  ctx.ellipse(0, 13, 12, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Legs / Bottom Outfit
  if (s.bottomType === 'skirt') {
    // Legs (Skin + Socks)
    ctx.fillStyle = p.skin;
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(-5, 4 + bob, 4, 7);
      ctx.fillRect(1, 4 + bob, 4, 7);
      // Tall socks
      ctx.fillStyle = p.shoesSec || '#ffffff';
      ctx.fillRect(-5, 7 + bob, 4, 4);
      ctx.fillRect(1, 7 + bob, 4, 4);
    } else {
      ctx.fillRect(-4 + legSwing, 4 + bob, 8, 7);
      ctx.fillStyle = p.shoesSec || '#ffffff';
      ctx.fillRect(-4 + legSwing, 7 + bob, 8, 4);
    }

    // Pleated Skirt
    ctx.fillStyle = p.bottomMain;
    const skirtW = dir === 'left' || dir === 'right' ? 12 : 14;
    ctx.beginPath();
    ctx.moveTo(-skirtW / 2, 0 + bob);
    ctx.lineTo(skirtW / 2, 0 + bob);
    ctx.lineTo(skirtW / 2 + 2, 5 + bob);
    ctx.lineTo(-skirtW / 2 - 2, 5 + bob);
    ctx.closePath();
    ctx.fill();
    // Skirt pleat shadow
    ctx.fillStyle = p.bottomSec || 'rgba(0,0,0,0.15)';
    ctx.fillRect(-2, 0 + bob, 4, 5);
  } else if (s.bottomType === 'overalls') {
    // Dungarees / Overalls
    ctx.fillStyle = p.bottomMain;
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(-6, 3 + bob + (dir === 'down' ? legSwing : -legSwing), 5, 9);
      ctx.fillRect(1, 3 + bob + (dir === 'down' ? -legSwing : legSwing), 5, 9);
      // Front bib
      if (dir === 'down') {
        ctx.fillRect(-5, -4 + bob, 10, 8);
        ctx.fillStyle = '#facc15'; // Metal overall buttons
        ctx.fillRect(-4, -3 + bob, 2, 2);
        ctx.fillRect(2, -3 + bob, 2, 2);
      }
    } else {
      ctx.fillRect(-5 + legSwing, 3 + bob, 10, 9);
      ctx.fillRect(-4 + legSwing, -3 + bob, 8, 7);
    }
  } else if (s.bottomType === 'shorts') {
    // Sporty Shorts with Exposed Knees
    ctx.fillStyle = p.bottomMain;
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(-6, 2 + bob, 5, 5);
      ctx.fillRect(1, 2 + bob, 5, 5);
      // Exposed Legs
      ctx.fillStyle = p.skin;
      ctx.fillRect(-5, 6 + bob + (dir === 'down' ? legSwing : -legSwing), 4, 5);
      ctx.fillRect(1, 6 + bob + (dir === 'down' ? -legSwing : legSwing), 4, 5);
    } else {
      ctx.fillRect(-5 + legSwing, 2 + bob, 10, 5);
      ctx.fillStyle = p.skin;
      ctx.fillRect(-4 + legSwing, 6 + bob, 8, 5);
    }
  } else {
    // Standard Denim / Slacks
    ctx.fillStyle = p.bottomMain;
    if (dir === 'down' || dir === 'up') {
      ctx.fillRect(-6, 3 + bob + (dir === 'down' ? legSwing : -legSwing), 5, 9);
      ctx.fillRect(1, 3 + bob + (dir === 'down' ? -legSwing : legSwing), 5, 9);
      // Knee highlights
      ctx.fillStyle = p.bottomSec || 'rgba(255,255,255,0.18)';
      ctx.fillRect(-5, 6 + bob + (dir === 'down' ? legSwing : -legSwing), 3, 2);
      ctx.fillRect(2, 6 + bob + (dir === 'down' ? -legSwing : legSwing), 3, 2);
    } else {
      ctx.fillRect(-5 + legSwing, 3 + bob, 10, 9);
      ctx.fillStyle = p.bottomSec || 'rgba(255,255,255,0.18)';
      ctx.fillRect(-3 + legSwing, 6 + bob, 6, 2);
    }
  }

  // 3. Sneakers / Shoes
  ctx.fillStyle = p.shoesMain;
  if (dir === 'down' || dir === 'up') {
    ctx.fillRect(-7, 10 + bob, 6, 4);
    ctx.fillRect(1, 10 + bob, 6, 4);
    // Rubber Soles
    ctx.fillStyle = p.shoesSec;
    ctx.fillRect(-7, 13 + bob, 6, 2);
    ctx.fillRect(1, 13 + bob, 6, 2);
  } else {
    const shoeDir = dir === 'right' ? 1 : -1;
    ctx.fillRect(-6 + legSwing, 10 + bob, 11, 4);
    ctx.fillStyle = p.shoesSec;
    ctx.fillRect(-6 + legSwing + (shoeDir > 0 ? 2 : 0), 13 + bob, 9, 2);
  }

  // 4. Backpack (Drawn behind body when facing up/side)
  if (dir === 'up' || dir === 'left' || dir === 'right') {
    ctx.fillStyle = p.backpackMain;
    const bpX = dir === 'up' ? -6 : dir === 'left' ? 2 : -8;
    ctx.fillRect(bpX, -7 + bob + breathing, 6, 11);
    ctx.fillStyle = p.backpackSec || 'rgba(0,0,0,0.2)';
    ctx.fillRect(bpX + 1, -4 + bob + breathing, 4, 6);
  }

  // 5. Torso / Jacket / Top
  ctx.fillStyle = p.topMain;
  ctx.fillRect(-7, -7 + bob + breathing, 14, 11);

  // Top accent/undershirt
  ctx.fillStyle = p.topSec;
  if (dir === 'down') {
    ctx.fillRect(-3, -7 + bob + breathing, 6, 5);
    // Center zipper or tie
    ctx.fillStyle = p.accessoryMain || p.topSec;
    ctx.fillRect(-1, -3 + bob + breathing, 2, 7);
  } else if (dir === 'left' || dir === 'right') {
    const colX = dir === 'left' ? -4 : 1;
    ctx.fillRect(colX, -7 + bob + breathing, 3, 4);
  }

  // Arm swings with hands
  ctx.fillStyle = p.topMain;
  if (dir === 'down' || dir === 'up') {
    ctx.fillRect(-9, -6 + bob - legSwing + breathing, 3, 7);
    ctx.fillRect(6, -6 + bob + legSwing + breathing, 3, 7);
    // Hands
    ctx.fillStyle = p.skin;
    ctx.fillRect(-9, 1 + bob - legSwing + breathing, 3, 3);
    ctx.fillRect(6, 1 + bob + legSwing + breathing, 3, 3);
  }

  // 6. Head & Face
  ctx.fillStyle = p.skin;
  ctx.fillRect(-5, -17 + bob + breathing, 10, 10);

  // Hair Base (Back & Sides)
  ctx.fillStyle = p.hair;
  if (s.hairStyle === 'long_fringe' || s.hairStyle === 'twin_tails') {
    // Side hair tresses dropping down shoulders
    ctx.fillRect(-7, -16 + bob + breathing, 3, 10);
    ctx.fillRect(4, -16 + bob + breathing, 3, 10);
  } else if (s.hairStyle === 'pigtails') {
    // Pigtail tufts
    const pigSwing = Math.sin(time * 6) * 1.5;
    ctx.fillRect(-9 + pigSwing, -14 + bob + breathing, 4, 6);
    ctx.fillRect(5 - pigSwing, -14 + bob + breathing, 4, 6);
  } else if (s.hairStyle === 'buns_curls') {
    ctx.fillRect(-8, -17 + bob + breathing, 3, 5);
    ctx.fillRect(5, -17 + bob + breathing, 3, 5);
  }

  // Eyes & Expressions
  if (dir === 'down') {
    // Eyes with catchlights
    ctx.fillStyle = p.eyeColor;
    ctx.fillRect(-3, -13 + bob + breathing, 2, 3);
    ctx.fillRect(1, -13 + bob + breathing, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -13 + bob + breathing, 1, 1);
    ctx.fillRect(1, -13 + bob + breathing, 1, 1);

    // Subtle anime blush for female trainers
    if (trainer.gender === 'female') {
      ctx.fillStyle = 'rgba(244, 114, 182, 0.45)';
      ctx.fillRect(-4, -10 + bob + breathing, 2, 1);
      ctx.fillRect(2, -10 + bob + breathing, 2, 1);
    }
  } else if (dir === 'left') {
    ctx.fillStyle = p.eyeColor;
    ctx.fillRect(-4, -13 + bob + breathing, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -13 + bob + breathing, 1, 1);
  } else if (dir === 'right') {
    ctx.fillStyle = p.eyeColor;
    ctx.fillRect(2, -13 + bob + breathing, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, -13 + bob + breathing, 1, 1);
  }

  // Front Hair Fringe
  ctx.fillStyle = p.hair;
  ctx.fillRect(-6, -18 + bob + breathing, 12, 3);
  if (dir === 'down') {
    ctx.fillRect(-5, -15 + bob + breathing, 2, 3);
    ctx.fillRect(3, -15 + bob + breathing, 2, 3);
    if (s.hairStyle === 'wavy_shaggy') {
      ctx.fillRect(-1, -15 + bob + breathing, 2, 2);
    }
  }

  // 7. Hats & Headgear
  if (s.hatType === 'baseball_cap') {
    // Red / Ash Cap
    ctx.fillStyle = p.hatMain || '#dc2626';
    ctx.fillRect(-6, -21 + bob + breathing, 12, 6);
    // Cap Logo
    if (p.hatSec && (dir === 'down' || dir === 'left' || dir === 'right')) {
      ctx.fillStyle = p.hatSec;
      ctx.fillRect(-2, -20 + bob + breathing, 4, 3);
    }
    // Visor Brim
    ctx.fillStyle = p.hatSec || '#ffffff';
    const visorOffset = dir === 'left' ? -9 : dir === 'right' ? 3 : -5;
    const visorW = dir === 'down' ? 10 : 7;
    ctx.fillRect(visorOffset, -16 + bob + breathing, visorW, 2.5);
  } else if (s.hatType === 'backwards_cap') {
    // Ethan Backwards Cap
    ctx.fillStyle = p.hatMain || '#f59e0b';
    ctx.fillRect(-6, -21 + bob + breathing, 12, 6);
    // Back visor strap
    ctx.fillStyle = p.hatSec || '#0f172a';
    ctx.fillRect(-4, -17 + bob + breathing, 8, 2);
  } else if (s.hatType === 'beanie' || s.hatType === 'coordinator_beanie') {
    // Beanie Knit Cap
    ctx.fillStyle = p.hatMain || '#059669';
    ctx.fillRect(-6, -22 + bob + breathing, 12, 7);
    ctx.fillStyle = p.hatSec || '#ffffff';
    ctx.fillRect(-7, -17 + bob + breathing, 14, 2); // Ribbed cuff
    // Crest
    ctx.fillRect(-2, -20 + bob + breathing, 4, 3);
  } else if (s.hatType === 'beret') {
    // Lucas / Chic Beret
    ctx.fillStyle = p.hatMain || '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(1, -20 + bob + breathing, 8, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hatSec || '#0284c7';
    ctx.fillRect(-1, -22 + bob + breathing, 2, 2);
  } else if (s.hatType === 'sunhat') {
    // Leaf Sunhat
    ctx.fillStyle = p.hatMain || '#f8fafc';
    // Crown
    ctx.fillRect(-5, -22 + bob + breathing, 10, 5);
    // Wide Brim
    ctx.beginPath();
    ctx.ellipse(0, -17 + bob + breathing, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Red Ribbon Band
    ctx.fillStyle = p.hatSec || '#ef4444';
    ctx.fillRect(-5, -18 + bob + breathing, 10, 2);
  } else if (s.hatType === 'straw_hat') {
    // Lyra Straw Hat
    ctx.fillStyle = p.hatMain || '#fef08a';
    ctx.fillRect(-5, -21 + bob + breathing, 10, 4);
    ctx.beginPath();
    ctx.ellipse(0, -17 + bob + breathing, 11, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hatSec || '#1e3a8a';
    ctx.fillRect(-5, -18 + bob + breathing, 10, 1.5);
  } else if (s.hatType === 'bandana') {
    // May Bandana Headband
    ctx.fillStyle = p.hatMain || '#ef4444';
    ctx.fillRect(-6, -19 + bob + breathing, 12, 4);
    ctx.fillStyle = p.hatSec || '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -17 + bob + breathing, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8. Tall Grass Immersion
  if (inGrass) {
    const gSway = Math.sin(time * 3 + px * 0.1) * 2.5;
    ctx.fillStyle = '#40916c';
    ctx.beginPath();
    ctx.moveTo(-9, 14);
    ctx.lineTo(-7 + gSway, 3);
    ctx.lineTo(-4, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.moveTo(-2, 14);
    ctx.lineTo(0 - gSway, 2);
    ctx.lineTo(3, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#74c69d';
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.lineTo(7 + gSway, 4);
    ctx.lineTo(9, 14);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function getTrainerCharacter(id?: string): TrainerCustomization {
  if (!id) return TRAINER_CHARACTERS[0];
  return TRAINER_CHARACTERS.find(t => t.id === id) || TRAINER_CHARACTERS[0];
}
