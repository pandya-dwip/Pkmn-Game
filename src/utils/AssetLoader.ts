import Phaser from 'phaser';
import { POKEMON_SPECIES_MAP } from '../data/pokemon';
import { TYPE_COLORS } from '../data/types';

export const ASSETS = {
  pokemon: (id: number) => `pkmn_${id}`,
  backgrounds: {
    kantoBattle: 'bg_kanto_battle',
    menuBackground: 'bg_menu',
  },
  items: {
    healthBerry: 'item_health_berry',
    fullHealBerry: 'item_full_heal_berry',
    revive: 'item_revive',
    leafStone: 'item_leaf_stone',
    fireStone: 'item_fire_stone',
    waterStone: 'item_water_stone',
    thunderStone: 'item_thunder_stone',
    moonStone: 'item_moon_stone',
  },
  particles: {
    leaf: 'particle_leaf',
    flame: 'particle_flame',
    waterDrop: 'particle_water_drop',
    spark: 'particle_spark',
    frost: 'particle_frost',
    shadowOrb: 'particle_shadow_orb',
    rock: 'particle_rock',
    slash: 'particle_slash',
    circle: 'particle_circle',
    star: 'particle_star',
  },
};

export function getPokemonArtworkUrl(speciesId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`;
}

/**
 * Creates a clean procedural canvas fallback for any Pokémon so it NEVER fails to render.
 */
export function createPokemonFallbackTexture(scene: Phaser.Scene, speciesId: number, textureKey: string): void {
  if (scene.textures.exists(textureKey)) return;

  const species = POKEMON_SPECIES_MAP[speciesId] || POKEMON_SPECIES_MAP[1];
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const typeShort = species.typesShort[0] || 'No';
  const color = TYPE_COLORS[typeShort]?.hex || '#4a90e2';

  // Circular creature silhouette with glowing badge
  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2 - 10);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, '#0b1226');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Creature Monogram
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 10;
  ctx.fillText(species.name, size / 2, size / 2 - 15);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`#${species.id.toString().padStart(3, '0')}`, size / 2, size / 2 + 25);

  scene.textures.addCanvas(textureKey, canvas);
}

/**
 * Procedurally generates particle and UI asset textures in Phaser memory.
 */
export function generateProceduralTextures(scene: Phaser.Scene): void {
  // 1. Particle Circle
  if (!scene.textures.exists(ASSETS.particles.circle)) {
    const c = scene.textures.createCanvas(ASSETS.particles.circle, 32, 32);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#ffd54a');
      grad.addColorStop(1, 'rgba(255, 213, 74, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
      c.refresh();
    }
  }

  // 2. Leaf Particle
  if (!scene.textures.exists(ASSETS.particles.leaf)) {
    const c = scene.textures.createCanvas(ASSETS.particles.leaf, 32, 16);
    if (c) {
      const ctx = c.getContext();
      ctx.fillStyle = '#4cd05a';
      ctx.beginPath();
      ctx.ellipse(16, 8, 14, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1d6e27';
      ctx.stroke();
      c.refresh();
    }
  }

  // 3. Flame Particle
  if (!scene.textures.exists(ASSETS.particles.flame)) {
    const c = scene.textures.createCanvas(ASSETS.particles.flame, 32, 32);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffea75');
      grad.addColorStop(0.7, '#ff501a');
      grad.addColorStop(1, 'rgba(255, 80, 26, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
  }

  // 4. Water Drop Particle
  if (!scene.textures.exists(ASSETS.particles.waterDrop)) {
    const c = scene.textures.createCanvas(ASSETS.particles.waterDrop, 24, 24);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(12, 12, 2, 12, 12, 12);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#3a9bff');
      grad.addColorStop(1, 'rgba(58, 155, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(12, 12, 12, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
  }

  // 5. Spark Particle
  if (!scene.textures.exists(ASSETS.particles.spark)) {
    const c = scene.textures.createCanvas(ASSETS.particles.spark, 28, 28);
    if (c) {
      const ctx = c.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffe34a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, 2);
      ctx.lineTo(17, 11);
      ctx.lineTo(26, 14);
      ctx.lineTo(17, 17);
      ctx.lineTo(14, 26);
      ctx.lineTo(11, 17);
      ctx.lineTo(2, 14);
      ctx.lineTo(11, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      c.refresh();
    }
  }

  // 6. Rock Particle
  if (!scene.textures.exists(ASSETS.particles.rock)) {
    const c = scene.textures.createCanvas(ASSETS.particles.rock, 32, 28);
    if (c) {
      const ctx = c.getContext();
      ctx.fillStyle = '#8a7458';
      ctx.beginPath();
      ctx.moveTo(6, 14);
      ctx.lineTo(12, 4);
      ctx.lineTo(24, 6);
      ctx.lineTo(28, 18);
      ctx.lineTo(20, 26);
      ctx.lineTo(8, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 2;
      ctx.stroke();
      c.refresh();
    }
  }

  // 7. Slash Particle
  if (!scene.textures.exists(ASSETS.particles.slash)) {
    const c = scene.textures.createCanvas(ASSETS.particles.slash, 64, 16);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createLinearGradient(0, 8, 64, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 6, 64, 4);
      c.refresh();
    }
  }

  // 8. Ground Shadow Ellipse
  if (!scene.textures.exists('ground_shadow')) {
    const c = scene.textures.createCanvas('ground_shadow', 160, 60);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(80, 30, 10, 80, 30, 80);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(80, 30, 75, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
  }
}
