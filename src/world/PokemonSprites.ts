/**
 * PokemonSprites.ts
 * Shared lazy image cache for overworld Pokémon sprites (companion, static
 * encounters, lost Pokémon). Uses the same PokeAPI sprite source the rest of
 * the game already uses for artwork; images load on demand and are reused.
 */

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const cache = new Map<string, HTMLImageElement>();

export function getPokemonSprite(id: number, back = false): HTMLImageElement | null {
  const key = (back ? 'b' : 'f') + id;
  let img = cache.get(key);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = `${BASE}${back ? 'back/' : ''}${id}.png`;
    cache.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function preloadPokemonSprites(id: number): void {
  getPokemonSprite(id, false);
  getPokemonSprite(id, true);
}
