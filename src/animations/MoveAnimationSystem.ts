/**
 * MoveAnimationSystem.ts
 * Comprehensive Move-Specific Attack Animation Framework
 *
 * Architecture:
 * Move -> Animation Profile -> Reusable Visual Components -> Composition -> Unique Animation
 *
 * Supports all moves with unique identities, physical lunges, continuous streams,
 * charging beams, multi-hit sequences, status effects, and layered audio.
 */

import { sound } from '../audio/SoundSynthesizer';
import { pokemon3DManager } from '../systems/Pokemon3DManager';

export interface MoveAnimationProfile {
  kind:
    | 'physical'
    | 'projectile'
    | 'stream'
    | 'beam'
    | 'vortex'
    | 'burst'
    | 'sky_drop'
    | 'ground'
    | 'status'
    | 'multihit';
  subType: string;
  element: string;
  powerScale?: number;
  chargeDuration?: number;
  particles?: {
    count?: number;
    color?: string;
    shape?: string;
    trail?: boolean;
  };
  multiHitCount?: number;
  isPhysical?: boolean;
}

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const R = Math.random;

export const ctr = (e: HTMLElement): { x: number; y: number } => {
  return {
    x: e.offsetLeft + e.offsetWidth / 2,
    y: e.offsetTop + e.offsetHeight / 2,
  };
};

export const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const el = (className: string, css?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement => {
  const d = document.createElement('div');
  d.className = className;
  if (css) Object.assign(d.style, css);
  if (text) d.textContent = text;
  const world = $('#world');
  if (world) world.appendChild(d);
  return d;
};

export const fly = (
  d: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  removeOnFinish: boolean = true
): Promise<Animation> => {
  const anim = d.animate(keyframes, options);
  if (removeOnFinish) {
    anim.finished.then(
      () => d.remove(),
      () => d.remove()
    );
  }
  return anim.finished;
};

export const tr = (p: { x: number; y: number }, scale: number = 1, rotDeg: number = 0) =>
  `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${scale})${rotDeg ? ` rotate(${rotDeg}deg)` : ''}`;

export const screenShake = (intensity: 'light' | 'medium' | 'heavy' = 'medium', durationMs: number = 320) => {
  const world = $('#world');
  if (!world) return;
  const d = intensity === 'heavy' ? 14 : intensity === 'medium' ? 7 : 3;
  world.animate(
    [
      { transform: 'none' },
      { transform: `translate(${-d}px, ${d * 0.6}px)` },
      { transform: `translate(${d}px, ${-d * 0.6}px)` },
      { transform: `translate(${-d * 0.5}px, ${d * 0.4}px)` },
      { transform: 'none' },
    ],
    { duration: durationMs, easing: 'ease-out' }
  );
};

export const screenFlash = (color: string = '#ffffff', durationMs: number = 280) => {
  const glow = el('screen-flash', {
    position: 'absolute',
    inset: '0',
    background: color,
    pointerEvents: 'none',
    zIndex: '50',
  });
  fly(glow, [{ opacity: '0.7' }, { opacity: '0' }], { duration: durationMs });
};

// ============================================================================
// MOVE ANIMATION PROFILES DATABASE (Move-Specific Presentation)
// ============================================================================

export const MOVE_PROFILES: Record<string, MoveAnimationProfile> = {
  // FIRE
  Ember: { kind: 'projectile', subType: 'ember', element: 'fire', powerScale: 0.8 },
  Flamethrower: { kind: 'stream', subType: 'flamethrower', element: 'fire', powerScale: 1.2 },
  'Fire Blast': { kind: 'projectile', subType: 'fire_blast', element: 'fire', powerScale: 1.6, chargeDuration: 350 },
  'Fire Spin': { kind: 'vortex', subType: 'fire_spin', element: 'fire', powerScale: 1.0 },
  'Heat Wave': { kind: 'vortex', subType: 'heat_wave', element: 'fire', powerScale: 1.3 },
  'Fire Fang': { kind: 'physical', subType: 'fire_fang', element: 'fire', isPhysical: true, powerScale: 1.0 },
  'Will-O-Wisp': { kind: 'status', subType: 'will_o_wisp', element: 'fire' },

  // WATER
  'Water Gun': { kind: 'stream', subType: 'water_gun', element: 'water', powerScale: 0.9 },
  'Hydro Pump': { kind: 'stream', subType: 'hydro_pump', element: 'water', powerScale: 1.6, chargeDuration: 400 },
  Surf: { kind: 'vortex', subType: 'surf', element: 'water', powerScale: 1.4 },
  Bubble: { kind: 'projectile', subType: 'bubble', element: 'water', powerScale: 0.7 },
  'Bubble Beam': { kind: 'stream', subType: 'bubble_beam', element: 'water', powerScale: 1.1 },
  'Aqua Jet': { kind: 'physical', subType: 'aqua_jet', element: 'water', isPhysical: true, powerScale: 1.0 },
  'Water Pulse': { kind: 'projectile', subType: 'water_pulse', element: 'water', powerScale: 1.0 },

  // ELECTRIC
  'Thunder Shock': { kind: 'burst', subType: 'thunder_shock', element: 'electric', powerScale: 0.8 },
  Spark: { kind: 'physical', subType: 'spark', element: 'electric', isPhysical: true, powerScale: 1.1 },
  Thunderbolt: { kind: 'beam', subType: 'thunderbolt', element: 'electric', powerScale: 1.3 },
  Thunder: { kind: 'sky_drop', subType: 'thunder', element: 'electric', powerScale: 1.7, chargeDuration: 350 },
  'Electro Ball': { kind: 'projectile', subType: 'electro_ball', element: 'electric', powerScale: 1.1 },
  Discharge: { kind: 'burst', subType: 'discharge', element: 'electric', powerScale: 1.3 },

  // GRASS
  'Razor Leaf': { kind: 'projectile', subType: 'razor_leaf', element: 'grass', powerScale: 1.0 },
  'Vine Whip': { kind: 'burst', subType: 'vine_whip', element: 'grass', isPhysical: true, powerScale: 0.9 },
  'Solar Beam': { kind: 'beam', subType: 'solar_beam', element: 'grass', powerScale: 1.8, chargeDuration: 550 },
  'Leaf Blade': { kind: 'physical', subType: 'leaf_blade', element: 'grass', isPhysical: true, powerScale: 1.2 },
  'Energy Ball': { kind: 'projectile', subType: 'energy_ball', element: 'grass', powerScale: 1.2 },
  'Petal Dance': { kind: 'vortex', subType: 'petal_dance', element: 'grass', powerScale: 1.3 },
  'Giga Drain': { kind: 'projectile', subType: 'giga_drain', element: 'grass', powerScale: 1.1 },
  'Bullet Seed': { kind: 'multihit', subType: 'bullet_seed', element: 'grass', multiHitCount: 4, powerScale: 0.8 },
  'Sleep Powder': { kind: 'status', subType: 'sleep_powder', element: 'grass' },
  'Stun Spore': { kind: 'status', subType: 'stun_spore', element: 'grass' },
  'Poison Powder': { kind: 'status', subType: 'poison_powder', element: 'grass' },

  // ICE
  'Ice Beam': { kind: 'beam', subType: 'ice_beam', element: 'ice', powerScale: 1.3 },
  'Ice Shard': { kind: 'projectile', subType: 'ice_shard', element: 'ice', powerScale: 0.9 },
  Blizzard: { kind: 'vortex', subType: 'blizzard', element: 'ice', powerScale: 1.6, chargeDuration: 300 },
  'Icicle Spear': { kind: 'multihit', subType: 'icicle_spear', element: 'ice', multiHitCount: 4, powerScale: 0.9 },
  'Ice Punch': { kind: 'physical', subType: 'ice_punch', element: 'ice', isPhysical: true, powerScale: 1.1 },
  'Powder Snow': { kind: 'projectile', subType: 'powder_snow', element: 'ice', powerScale: 0.8 },

  // ROCK
  'Rock Throw': { kind: 'projectile', subType: 'rock_throw', element: 'rock', powerScale: 0.9 },
  'Rock Slide': { kind: 'sky_drop', subType: 'rock_slide', element: 'rock', powerScale: 1.2 },
  'Stone Edge': { kind: 'ground', subType: 'stone_edge', element: 'rock', powerScale: 1.5 },
  'Rock Blast': { kind: 'multihit', subType: 'rock_blast', element: 'rock', multiHitCount: 3, powerScale: 0.9 },
  'Rock Tomb': { kind: 'sky_drop', subType: 'rock_tomb', element: 'rock', powerScale: 1.1 },

  // PSYCHIC
  Psychic: { kind: 'burst', subType: 'psychic', element: 'psychic', powerScale: 1.4, chargeDuration: 300 },
  Psybeam: { kind: 'beam', subType: 'psybeam', element: 'psychic', powerScale: 1.1 },
  Confusion: { kind: 'vortex', subType: 'confusion', element: 'psychic', powerScale: 0.9 },
  Psyshock: { kind: 'projectile', subType: 'psyshock', element: 'psychic', powerScale: 1.2 },
  'Future Sight': { kind: 'sky_drop', subType: 'future_sight', element: 'psychic', powerScale: 1.6 },

  // GHOST
  'Shadow Ball': { kind: 'projectile', subType: 'shadow_ball', element: 'ghost', powerScale: 1.3, chargeDuration: 400 },
  Lick: { kind: 'physical', subType: 'lick', element: 'ghost', isPhysical: true, powerScale: 0.7 },
  'Night Shade': { kind: 'burst', subType: 'night_shade', element: 'ghost', powerScale: 1.1 },
  Hex: { kind: 'vortex', subType: 'hex', element: 'ghost', powerScale: 1.1 },
  'Shadow Sneak': { kind: 'physical', subType: 'shadow_sneak', element: 'ghost', isPhysical: true, powerScale: 0.9 },
  'Shadow Punch': { kind: 'physical', subType: 'shadow_punch', element: 'ghost', isPhysical: true, powerScale: 1.0 },

  // FLYING
  Gust: { kind: 'vortex', subType: 'gust', element: 'flying', powerScale: 0.8 },
  'Wing Attack': { kind: 'physical', subType: 'wing_attack', element: 'flying', isPhysical: true, powerScale: 1.0 },
  'Air Slash': { kind: 'projectile', subType: 'air_slash', element: 'flying', powerScale: 1.2 },
  'Aerial Ace': { kind: 'physical', subType: 'aerial_ace', element: 'flying', isPhysical: true, powerScale: 1.1 },
  Hurricane: { kind: 'vortex', subType: 'hurricane', element: 'flying', powerScale: 1.6 },
  'Sky Attack': { kind: 'physical', subType: 'sky_attack', element: 'flying', isPhysical: true, powerScale: 1.8, chargeDuration: 450 },
  Fly: { kind: 'sky_drop', subType: 'fly', element: 'flying', isPhysical: true, powerScale: 1.3 },

  // GROUND
  'Mud Shot': { kind: 'projectile', subType: 'mud_shot', element: 'ground', powerScale: 0.9 },
  'Mud Slap': { kind: 'projectile', subType: 'mud_shot', element: 'ground', powerScale: 0.7 },
  Earthquake: { kind: 'ground', subType: 'earthquake', element: 'ground', powerScale: 1.5, chargeDuration: 250 },
  Dig: { kind: 'ground', subType: 'dig', element: 'ground', isPhysical: true, powerScale: 1.2 },
  'Earth Power': { kind: 'ground', subType: 'earth_power', element: 'ground', powerScale: 1.4 },
  Bulldoze: { kind: 'ground', subType: 'bulldoze', element: 'ground', powerScale: 1.0 },

  // BUG
  'Bug Bite': { kind: 'physical', subType: 'bug_bite', element: 'bug', isPhysical: true, powerScale: 0.9 },
  'Signal Beam': { kind: 'beam', subType: 'signal_beam', element: 'bug', powerScale: 1.2 },
  'X-Scissor': { kind: 'physical', subType: 'x_scissor', element: 'bug', isPhysical: true, powerScale: 1.2 },
  'Fury Cutter': { kind: 'multihit', subType: 'fury_cutter', element: 'bug', multiHitCount: 3, powerScale: 0.8 },
  'Pin Missile': { kind: 'multihit', subType: 'pin_missile', element: 'bug', multiHitCount: 4, powerScale: 0.8 },
  Megahorn: { kind: 'physical', subType: 'megahorn', element: 'bug', isPhysical: true, powerScale: 1.6 },
  'String Shot': { kind: 'status', subType: 'string_shot', element: 'bug' },

  // POISON
  'Poison Sting': { kind: 'projectile', subType: 'poison_sting', element: 'poison', powerScale: 0.7 },
  Sludge: { kind: 'stream', subType: 'sludge', element: 'poison', powerScale: 1.0 },
  'Sludge Bomb': { kind: 'projectile', subType: 'sludge_bomb', element: 'poison', powerScale: 1.3 },
  'Poison Jab': { kind: 'physical', subType: 'poison_jab', element: 'poison', isPhysical: true, powerScale: 1.1 },
  Acid: { kind: 'stream', subType: 'acid', element: 'poison', powerScale: 0.9 },
  Toxic: { kind: 'status', subType: 'toxic', element: 'poison' },

  // FIGHTING
  'Karate Chop': { kind: 'physical', subType: 'karate_chop', element: 'fighting', isPhysical: true, powerScale: 1.0 },
  'Double Kick': { kind: 'multihit', subType: 'double_kick', element: 'fighting', isPhysical: true, multiHitCount: 2, powerScale: 0.9 },
  'Brick Break': { kind: 'physical', subType: 'brick_break', element: 'fighting', isPhysical: true, powerScale: 1.2 },
  'Close Combat': { kind: 'multihit', subType: 'close_combat', element: 'fighting', isPhysical: true, multiHitCount: 4, powerScale: 1.6 },
  'Aura Sphere': { kind: 'projectile', subType: 'aura_sphere', element: 'fighting', powerScale: 1.3 },
  'Low Kick': { kind: 'physical', subType: 'low_kick', element: 'fighting', isPhysical: true, powerScale: 1.0 },
  'Cross Chop': { kind: 'physical', subType: 'cross_chop', element: 'fighting', isPhysical: true, powerScale: 1.4 },
  'Dynamic Punch': { kind: 'physical', subType: 'dynamic_punch', element: 'fighting', isPhysical: true, powerScale: 1.5 },
  Submission: { kind: 'physical', subType: 'submission', element: 'fighting', isPhysical: true, powerScale: 1.2 },

  // NORMAL & PHYSICAL
  Tackle: { kind: 'physical', subType: 'tackle', element: 'normal', isPhysical: true, powerScale: 0.9 },
  Scratch: { kind: 'physical', subType: 'scratch', element: 'normal', isPhysical: true, powerScale: 0.9 },
  Bite: { kind: 'physical', subType: 'bite', element: 'dark', isPhysical: true, powerScale: 1.0 },
  Headbutt: { kind: 'physical', subType: 'headbutt', element: 'normal', isPhysical: true, powerScale: 1.1 },
  'Body Slam': { kind: 'physical', subType: 'body_slam', element: 'normal', isPhysical: true, powerScale: 1.3 },
  'Quick Attack': { kind: 'physical', subType: 'quick_attack', element: 'normal', isPhysical: true, powerScale: 0.9 },
  'Hyper Beam': { kind: 'beam', subType: 'hyper_beam', element: 'normal', powerScale: 2.0, chargeDuration: 600 },
  Pound: { kind: 'physical', subType: 'pound', element: 'normal', isPhysical: true, powerScale: 0.8 },
  'Double Slap': { kind: 'multihit', subType: 'double_slap', element: 'normal', isPhysical: true, multiHitCount: 3, powerScale: 0.8 },
  'Fury Attack': { kind: 'multihit', subType: 'fury_attack', element: 'normal', isPhysical: true, multiHitCount: 4, powerScale: 0.8 },
  'Fury Swipes': { kind: 'multihit', subType: 'fury_swipes', element: 'normal', isPhysical: true, multiHitCount: 4, powerScale: 0.8 },
  'Skull Bash': { kind: 'physical', subType: 'skull_bash', element: 'normal', isPhysical: true, powerScale: 1.5, chargeDuration: 450 },

  // STATUS MOVES
  Growl: { kind: 'status', subType: 'growl', element: 'normal' },
  'Tail Whip': { kind: 'status', subType: 'tail_whip', element: 'normal' },
  Leer: { kind: 'status', subType: 'leer', element: 'normal' },
  Screech: { kind: 'status', subType: 'screech', element: 'normal' },
  'Swords Dance': { kind: 'status', subType: 'swords_dance', element: 'normal' },
  Agility: { kind: 'status', subType: 'agility', element: 'psychic' },
  Recover: { kind: 'status', subType: 'recover', element: 'normal' },

  // DRAGON
  'Dragon Rage': { kind: 'beam', subType: 'dragon_rage', element: 'dragon', powerScale: 1.1 },
  'Dragon Claw': { kind: 'physical', subType: 'dragon_claw', element: 'dragon', isPhysical: true, powerScale: 1.2 },
  'Dragon Pulse': { kind: 'beam', subType: 'dragon_pulse', element: 'dragon', powerScale: 1.3 },
  'Dragon Breath': { kind: 'stream', subType: 'dragon_breath', element: 'dragon', powerScale: 1.1 },
  Outrage: { kind: 'multihit', subType: 'outrage', element: 'dragon', isPhysical: true, multiHitCount: 3, powerScale: 1.6 },
};

/**
 * Resolves profile for ANY supported move, creating a tailored profile if not explicitly registered.
 */
export function getMoveProfile(moveName: string, typeShort: string, power: number, isPhysical: boolean): MoveAnimationProfile {
  if (MOVE_PROFILES[moveName]) {
    return MOVE_PROFILES[moveName];
  }

  // Fallback tailored to move category and type
  const typeElementMap: Record<string, string> = {
    Fi: 'fire', Wa: 'water', El: 'electric', Gr: 'grass', Ic: 'ice',
    Fg: 'fighting', Po: 'poison', Gd: 'ground', Fl: 'flying', Ps: 'psychic',
    Bu: 'bug', Ro: 'rock', Gh: 'ghost', Dr: 'dragon', No: 'normal',
  };
  const element = typeElementMap[typeShort] || 'normal';

  if (isPhysical) {
    return {
      kind: 'physical',
      subType: 'tackle',
      element,
      isPhysical: true,
      powerScale: Math.max(0.7, power / 70),
    };
  } else if (power > 90) {
    return {
      kind: 'beam',
      subType: 'hyper_beam',
      element,
      powerScale: power / 80,
      chargeDuration: 300,
    };
  } else if (power > 50) {
    return {
      kind: 'projectile',
      subType: 'energy_ball',
      element,
      powerScale: power / 70,
    };
  } else {
    return {
      kind: 'burst',
      subType: 'thunder_shock',
      element,
      powerScale: 0.8,
    };
  }
}

// ============================================================================
// MAIN ANIMATION ORCHESTRATION PIPELINE
// ============================================================================

export class MoveAnimationSystem {
  private static instance: MoveAnimationSystem;

  public static getInstance(): MoveAnimationSystem {
    if (!MoveAnimationSystem.instance) {
      MoveAnimationSystem.instance = new MoveAnimationSystem();
    }
    return MoveAnimationSystem.instance;
  }

  /**
   * Complete controlled execution sequence:
   * 1. Attacker anticipation & Charge
   * 2. Attack initiation (Launch sound, projectile / beam / lunge / vortex)
   * 3. Travel & Impact
   * 4. Target hit reaction & Damage scaling
   * 5. Cleanup
   */
  public async playMove(
    attackerSide: 'p' | 'f',
    moveName: string,
    typeShort: string,
    power: number,
    effectiveness: number,
    isCritical: boolean = false
  ): Promise<void> {
    const defenderSide = attackerSide === 'p' ? 'f' : 'p';
    const attackerEl = $('#' + attackerSide + 'w');
    const defenderEl = $('#' + defenderSide + 'w');

    if (!attackerEl || !defenderEl) return;

    const A = ctr(attackerEl);
    const D = ctr(defenderEl);
    const isPlayer = attackerSide === 'p';

    const isPhysicalCategory = 'FgPoGdFlBuRoGhNo'.includes(typeShort);
    const profile = getMoveProfile(moveName, typeShort, power, isPhysicalCategory);

    // 1. Charge / Anticipation Phase
    await this.playAnticipationAndCharge(attackerEl, profile, A, D, isPlayer);

    // 2. Main Attack Execution
    await this.executeAttackComponent(profile, A, D, attackerEl, defenderEl, isPlayer, effectiveness, isCritical);

    // 3. Target Hit Reaction & Screen Shake
    await this.playTargetImpact(defenderEl, effectiveness, isCritical, profile.powerScale || 1.0);
  }

  private async playAnticipationAndCharge(
    attackerEl: HTMLElement,
    profile: MoveAnimationProfile,
    A: { x: number; y: number },
    D: { x: number; y: number },
    isPlayer: boolean
  ): Promise<void> {
    // Sound charge
    sound.sfxA('c', { t: profile.element.slice(0, 2).toUpperCase() }, profile.kind, 1, profile.powerScale || 1);

    // Physical lunge wind-up
    if (profile.isPhysical) {
      const recoilX = isPlayer ? -18 : 18;
      const recoilY = isPlayer ? 10 : -10;
      await attackerEl.animate(
        [
          { transform: 'none' },
          { transform: `translate(${recoilX}px, ${recoilY}px) scale(0.96)`, offset: 0.6 },
          { transform: `translate(${recoilX * 1.2}px, ${recoilY * 1.2}px) scale(0.94)` },
        ],
        { duration: 240, easing: 'ease-out' }
      ).finished;
      return;
    }

    // Charging particles gather for high-power attacks
    if (profile.chargeDuration && profile.chargeDuration > 100) {
      const chargeGlow = el('charge-orb', {
        position: 'absolute',
        left: A.x + 'px',
        top: A.y + 'px',
        width: '30px',
        height: '30px',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle, #fff, ${this.getColorForElement(profile.element)} 70%, transparent)`,
        filter: 'blur(2px)',
        zIndex: '30',
      });

      // Motes spiraling inwards
      const moteCount = 12;
      for (let i = 0; i < moteCount; i++) {
        const angle = (i / moteCount) * Math.PI * 2;
        const dist = 70;
        const mote = el('mote', {
          position: 'absolute',
          left: A.x + Math.cos(angle) * dist + 'px',
          top: A.y + Math.sin(angle) * dist + 'px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: `0 0 8px ${this.getColorForElement(profile.element)}`,
          zIndex: '31',
        });
        fly(
          mote,
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' },
            { transform: `translate(${A.x - (A.x + Math.cos(angle) * dist) - 4}px, ${A.y - (A.y + Math.sin(angle) * dist) - 4}px) scale(0.2)`, opacity: '0' },
          ],
          { duration: profile.chargeDuration, easing: 'ease-in' }
        );
      }

      await fly(
        chargeGlow,
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: '0.4' },
          { transform: 'translate(-50%, -50%) scale(2.2)', opacity: '1' },
        ],
        { duration: profile.chargeDuration }
      );
    }
  }

  private async executeAttackComponent(
    profile: MoveAnimationProfile,
    A: { x: number; y: number },
    D: { x: number; y: number },
    attackerEl: HTMLElement,
    defenderEl: HTMLElement,
    isPlayer: boolean,
    effectiveness: number,
    isCritical: boolean
  ): Promise<void> {
    const sub = profile.subType;

    // Special moves mapped to unique custom components:
    if (sub === 'ember') return this.playEmber(A, D);
    if (sub === 'flamethrower') return this.playFlamethrower(A, D);
    if (sub === 'fire_blast') return this.playFireBlast(A, D);
    if (sub === 'fire_spin') return this.playFireSpin(D);
    if (sub === 'heat_wave') return this.playHeatWave(A, D);
    if (sub === 'will_o_wisp') return this.playWillOWisp(A, D);

    if (sub === 'water_gun') return this.playWaterGun(A, D);
    if (sub === 'hydro_pump') return this.playHydroPump(A, D);
    if (sub === 'surf') return this.playSurf(A, D);
    if (sub === 'bubble' || sub === 'bubble_beam') return this.playBubble(A, D, sub === 'bubble_beam');
    if (sub === 'water_pulse') return this.playWaterPulse(A, D);
    if (sub === 'aqua_jet') return this.playAquaJet(attackerEl, A, D);

    if (sub === 'thunder_shock') return this.playThunderShock(D);
    if (sub === 'spark') return this.playSpark(attackerEl, A, D);
    if (sub === 'thunderbolt') return this.playThunderbolt(A, D);
    if (sub === 'thunder') return this.playThunder(D);
    if (sub === 'electro_ball') return this.playElectroBall(A, D);
    if (sub === 'discharge') return this.playDischarge(A);

    if (sub === 'razor_leaf') return this.playRazorLeaf(A, D);
    if (sub === 'vine_whip') return this.playVineWhip(A, D);
    if (sub === 'solar_beam') return this.playSolarBeam(A, D);
    if (sub === 'leaf_blade') return this.playLeafBlade(attackerEl, A, D);
    if (sub === 'energy_ball') return this.playEnergyBall(A, D);
    if (sub === 'petal_dance') return this.playPetalDance(D);
    if (sub === 'bullet_seed') return this.playBulletSeed(A, D);

    if (sub === 'ice_beam') return this.playIceBeam(A, D);
    if (sub === 'ice_shard') return this.playIceShard(A, D);
    if (sub === 'blizzard') return this.playBlizzard(D);
    if (sub === 'icicle_spear') return this.playIcicleSpear(A, D);

    if (sub === 'rock_throw') return this.playRockThrow(A, D);
    if (sub === 'rock_slide') return this.playRockSlide(D);
    if (sub === 'stone_edge') return this.playStoneEdge(D);
    if (sub === 'rock_blast') return this.playRockBlast(A, D);

    if (sub === 'psychic') return this.playPsychic(D);
    if (sub === 'psybeam') return this.playPsybeam(A, D);
    if (sub === 'confusion') return this.playConfusion(D);

    if (sub === 'shadow_ball') return this.playShadowBall(A, D);
    if (sub === 'night_shade') return this.playNightShade(D);
    if (sub === 'hex') return this.playHex(D);
    if (sub === 'lick') return this.playLick(attackerEl, A, D);

    if (sub === 'gust' || sub === 'hurricane') return this.playGust(D, sub === 'hurricane');
    if (sub === 'air_slash') return this.playAirSlash(A, D);
    if (sub === 'aerial_ace') return this.playAerialAce(attackerEl, A, D);

    if (sub === 'earthquake') return this.playEarthquake();
    if (sub === 'dig') return this.playDig(attackerEl, A, D);
    if (sub === 'earth_power') return this.playEarthPower(D);
    if (sub === 'mud_shot') return this.playMudShot(A, D);

    if (sub === 'x_scissor') return this.playXScissor(D);
    if (sub === 'signal_beam') return this.playSignalBeam(A, D);
    if (sub === 'pin_missile') return this.playPinMissile(A, D);
    if (sub === 'bug_bite' || sub === 'bite' || sub === 'fire_fang') return this.playBite(attackerEl, A, D, sub);

    if (sub === 'poison_sting') return this.playPoisonSting(A, D);
    if (sub === 'sludge' || sub === 'sludge_bomb') return this.playSludge(A, D, sub === 'sludge_bomb');
    if (sub === 'acid') return this.playAcid(A, D);

    if (sub === 'karate_chop' || sub === 'brick_break') return this.playChop(attackerEl, A, D);
    if (sub === 'double_kick') return this.playDoubleKick(attackerEl, A, D);
    if (sub === 'close_combat') return this.playCloseCombat(attackerEl, A, D);
    if (sub === 'aura_sphere') return this.playAuraSphere(A, D);

    if (sub === 'quick_attack') return this.playQuickAttack(attackerEl, A, D);
    if (sub === 'hyper_beam') return this.playHyperBeam(A, D);
    if (sub === 'scratch') return this.playScratch(D);

    // Status moves
    if (sub === 'growl' || sub === 'screech') return this.playSoundWave(A, D, sub === 'screech');
    if (sub === 'leer') return this.playLeer(A, D);
    if (sub === 'tail_whip') return this.playTailWhip(attackerEl);
    if (sub === 'sleep_powder' || sub === 'stun_spore' || sub === 'poison_powder') {
      return this.playPowderCloud(D, sub);
    }
    if (sub === 'string_shot') return this.playStringShot(A, D);

    // Fallback Physical Dash / Slam
    if (profile.isPhysical) {
      return this.playPhysicalLunge(attackerEl, A, D, profile.powerScale || 1.0);
    }

    // Fallback Generic Projectile
    return this.playGenericProjectile(A, D, profile.element, profile.powerScale || 1.0);
  }

  // ==========================================================================
  // REUSABLE VISUAL COMPONENTS IMPLEMENTATIONS
  // ==========================================================================

  // --- FIRE MOVES ---

  /** EMBER: Small individual fiery embers flying independently */
  private async playEmber(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fi' }, 'spark', 1, 0.9);
    const count = 5;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < count; i++) {
      const delay = i * 65;
      const ember = el('ember-bullet', {
        position: 'absolute',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #fff, #ff7a00 50%, #ff1100 85%, transparent)',
        boxShadow: '0 0 10px #ff5500',
        zIndex: '32',
      });

      const scatterX = (R() - 0.5) * 36;
      const scatterY = (R() - 0.5) * 36;
      const targetPos = { x: D.x + scatterX, y: D.y + scatterY };

      const anim = fly(
        ember,
        [
          { transform: tr(A, 0.4), opacity: '1' },
          { transform: tr(lerp(A, targetPos, 0.5), 1.2), opacity: '1', offset: 0.5 },
          { transform: tr(targetPos, 0.7), opacity: '0.8' },
        ],
        { duration: 320, delay, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' }
      ).then(() => {
        this.createImpactSparks(targetPos, '#ff4400', 4);
      });

      promises.push(anim);
    }

    await Promise.all(promises);
  }

  /** FLAMETHROWER: Continuous high-pressure dense flame stream */
  private async playFlamethrower(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fi' }, 'stream', 2, 1.3);
    const particleCount = 28;
    const totalDuration = 650;

    for (let i = 0; i < particleCount; i++) {
      const delay = i * 20;
      const flame = el('flame-stream-pt', {
        position: 'absolute',
        width: `${18 + R() * 16}px`,
        height: `${18 + R() * 16}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, #ffff88, #ff8800 45%, #ff2200 80%, transparent)`,
        filter: 'blur(2px)',
        zIndex: '32',
      });

      const coneSpread = (i / particleCount) * 44;
      const target = {
        x: D.x + (R() - 0.5) * coneSpread,
        y: D.y + (R() - 0.5) * coneSpread,
      };

      fly(
        flame,
        [
          { transform: tr(A, 0.3), opacity: '0.9' },
          { transform: tr(lerp(A, target, 0.4), 1.1), opacity: '0.8', offset: 0.4 },
          { transform: tr(target, 1.8), opacity: '0' },
        ],
        { duration: 400, delay, easing: 'ease-in' }
      );
    }

    screenShake('medium', 450);
    await new Promise(r => setTimeout(r, totalDuration));
  }

  /** FIRE BLAST: Kanji/Star shaped massive explosive fire attack */
  private async playFireBlast(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fi' }, 'blast', 3, 1.8);
    const blastOrb = el('fire-blast-core', {
      position: 'absolute',
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #ffffff, #ffcc00 30%, #ff3300 70%, transparent 95%)',
      boxShadow: '0 0 30px #ff4400, 0 0 60px #ff0000',
      zIndex: '35',
    });

    await fly(
      blastOrb,
      [
        { transform: tr(A, 0.4, 0), opacity: '0.8' },
        { transform: tr(D, 2.0, 720), opacity: '1' },
      ],
      { duration: 480, easing: 'ease-in' }
    );

    // Explosive star detonation at target
    screenFlash('#ffaa44', 350);
    screenShake('heavy', 500);

    // 5 radiating flame arms forming the signature Star/Kanji blast
    for (let arm = 0; arm < 5; arm++) {
      const angle = (arm / 5) * Math.PI * 2;
      for (let step = 1; step <= 4; step++) {
        const armPt = el('blast-arm-pt', {
          position: 'absolute',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ffffcc, #ff4400 70%, transparent)',
          boxShadow: '0 0 14px #ff3300',
          zIndex: '36',
        });
        const dist = step * 26;
        const targetPos = { x: D.x + Math.cos(angle) * dist, y: D.y + Math.sin(angle) * dist };

        fly(
          armPt,
          [
            { transform: tr(D, 0.8), opacity: '1' },
            { transform: tr(targetPos, 1.4), opacity: '0' },
          ],
          { duration: 380, delay: step * 30, easing: 'ease-out' }
        );
      }
    }

    await new Promise(r => setTimeout(r, 450));
  }

  /** FIRE SPIN: Whirling vortex of fire column encasing target */
  private async playFireSpin(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fi' }, 'stream', 2, 1.2);
    const count = 22;
    for (let i = 0; i < count; i++) {
      const delay = i * 28;
      const angle = (i * 45 * Math.PI) / 180;
      const r = 38;
      const p = el('fire-spin-pt', {
        position: 'absolute',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #fff, #ff8800 60%, transparent)',
        boxShadow: '0 0 10px #ff2200',
        zIndex: '34',
      });

      const px = D.x + Math.cos(angle) * r;
      const py = D.y + Math.sin(angle) * (r * 0.5) - (i * 2.5);

      fly(
        p,
        [
          { transform: tr({ x: px, y: py + 40 }, 0.5), opacity: '0.9' },
          { transform: tr({ x: px, y: py - 40 }, 1.5), opacity: '0' },
        ],
        { duration: 520, delay, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 600));
  }

  /** HEAT WAVE: Wide expanding shimmering thermal distortion */
  private async playHeatWave(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fi' }, 'stream', 2, 1.2);
    for (let wave = 0; wave < 3; wave++) {
      const ring = el('heat-wave-ring', {
        position: 'absolute',
        width: '90px',
        height: '40px',
        borderRadius: '50%',
        border: '3px solid #ff7700',
        boxShadow: '0 0 20px #ff4400, inset 0 0 15px #ffbb00',
        zIndex: '32',
      });

      fly(
        ring,
        [
          { transform: tr(A, 0.4), opacity: '0.9' },
          { transform: tr(D, 2.4), opacity: '0' },
        ],
        { duration: 480, delay: wave * 130, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 650));
  }

  /** WILL-O-WISP: Ghostly blue/violet floating ethereal flames */
  private async playWillOWisp(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gh' }, 'orb', 1, 1.0);
    const count = 3;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < count; i++) {
      const wisp = el('wisp', {
        position: 'absolute',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #e0f2fe, #38bdf8 40%, #6366f1 80%, transparent)',
        boxShadow: '0 0 16px #60a5fa, 0 0 24px #818cf8',
        zIndex: '34',
      });

      const delay = i * 160;
      const arcY = (i - 1) * 35;
      const midPoint = { x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 + arcY };

      const anim = fly(
        wisp,
        [
          { transform: tr(A, 0.6), opacity: '0.8' },
          { transform: tr(midPoint, 1.2), opacity: '1', offset: 0.5 },
          { transform: tr(D, 0.8), opacity: '0.3' },
        ],
        { duration: 600, delay, easing: 'ease-in-out' }
      );
      promises.push(anim);
    }
    await Promise.all(promises);
  }

  // --- WATER MOVES ---

  /** WATER GUN: Narrow pressurized water stream */
  private async playWaterGun(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Wa' }, 'stream', 1, 0.9);
    const count = 16;
    for (let i = 0; i < count; i++) {
      const drop = el('water-drop', {
        position: 'absolute',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #ffffff, #38bdf8 60%, #0284c7 90%)',
        boxShadow: '0 0 8px #0ea5e9',
        zIndex: '33',
      });

      const spread = (R() - 0.5) * 12;
      const target = { x: D.x + spread, y: D.y + spread };

      fly(
        drop,
        [
          { transform: tr(A, 0.5), opacity: '0.9' },
          { transform: tr(target, 1.2), opacity: '0.1' },
        ],
        { duration: 320, delay: i * 22, easing: 'ease-in' }
      );
    }
    await new Promise(r => setTimeout(r, 450));
    this.createSplash(D, 10);
  }

  /** HYDRO PUMP: Massive high-pressure water blast torrent */
  private async playHydroPump(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Wa' }, 'blast', 3, 1.7);
    screenShake('heavy', 600);

    const count = 35;
    for (let i = 0; i < count; i++) {
      const torrent = el('hydro-torrent', {
        position: 'absolute',
        width: `${24 + R() * 20}px`,
        height: `${24 + R() * 20}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #e0f2fe, #0284c7 60%, #0369a1 90%)',
        boxShadow: '0 0 18px #38bdf8',
        zIndex: '34',
      });

      const cone = (i / count) * 45;
      const target = { x: D.x + (R() - 0.5) * cone, y: D.y + (R() - 0.5) * cone };

      fly(
        torrent,
        [
          { transform: tr(A, 0.6), opacity: '0.95' },
          { transform: tr(target, 2.2), opacity: '0' },
        ],
        { duration: 420, delay: i * 16, easing: 'ease-in' }
      );
    }

    await new Promise(r => setTimeout(r, 650));
    this.createSplash(D, 24);
  }

  /** SURF: Giant rolling wave sweeping across battlefield */
  private async playSurf(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Wa' }, 'blast', 2, 1.4);
    screenShake('medium', 500);

    const wave = el('surf-wave', {
      position: 'absolute',
      width: '180px',
      height: '90px',
      borderRadius: '50% 50% 30% 30%',
      background: 'linear-gradient(to top, #0284c7, #38bdf8 70%, #ffffff)',
      boxShadow: '0 10px 25px rgba(2,132,199,0.7)',
      zIndex: '33',
    });

    await fly(
      wave,
      [
        { transform: tr(A, 0.3), opacity: '0.7' },
        { transform: tr(D, 2.2), opacity: '1', offset: 0.8 },
        { transform: tr(D, 2.6), opacity: '0' },
      ],
      { duration: 600, easing: 'ease-out' }
    );
    this.createSplash(D, 18);
  }

  /** BUBBLE / BUBBLE BEAM: Multiple floating shimmering bubbles */
  private async playBubble(A: { x: number; y: number }, D: { x: number; y: number }, isBeam: boolean): Promise<void> {
    sound.sfxA('l', { t: 'Wa' }, 'stream', 1, isBeam ? 1.2 : 0.8);
    const count = isBeam ? 20 : 8;

    for (let i = 0; i < count; i++) {
      const bubble = el('bubble-pt', {
        position: 'absolute',
        width: `${14 + R() * 12}px`,
        height: `${14 + R() * 12}px`,
        borderRadius: '50%',
        border: '1.5px solid #bae6fd',
        background: 'radial-gradient(circle at 35% 35%, #ffffff, rgba(56,189,248,0.4) 50%, rgba(2,132,199,0.7))',
        boxShadow: 'inset 0 0 6px #ffffff, 0 0 8px #7dd3fc',
        zIndex: '33',
      });

      const wobbleX = (R() - 0.5) * 50;
      const wobbleY = (R() - 0.5) * 40;
      const target = { x: D.x + wobbleX, y: D.y + wobbleY };

      fly(
        bubble,
        [
          { transform: tr(A, 0.5), opacity: '0.9' },
          { transform: tr(target, 1.2), opacity: '0' },
        ],
        { duration: 420 + R() * 140, delay: i * (isBeam ? 22 : 60), easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, count * (isBeam ? 22 : 60) + 300));
  }

  /** WATER PULSE: Expanding sonic water rings */
  private async playWaterPulse(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Wa' }, 'stream', 1, 1.0);
    const ringCount = 4;
    for (let i = 0; i < ringCount; i++) {
      const ring = el('water-pulse-ring', {
        position: 'absolute',
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        border: '3px solid #38bdf8',
        boxShadow: '0 0 12px #0284c7',
        zIndex: '33',
      });

      fly(
        ring,
        [
          { transform: tr(A, 0.3), opacity: '1' },
          { transform: tr(D, 2.0), opacity: '0' },
        ],
        { duration: 450, delay: i * 90, easing: 'ease-in-out' }
      );
    }
    await new Promise(r => setTimeout(r, ringCount * 90 + 350));
  }

  /** AQUA JET: Attacker cloaked in water charging forward */
  private async playAquaJet(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Wa' }, 'stream', 1, 1.1);
    const shroud = el('aqua-shroud', {
      position: 'absolute',
      left: A.x + 'px',
      top: A.y + 'px',
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #e0f2fe 30%, #38bdf8 70%, transparent)',
      boxShadow: '0 0 25px #0284c7',
      zIndex: '28',
    });

    fly(shroud, [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: `translate(${D.x - A.x - 35}px, ${D.y - A.y - 35}px) scale(1.4)` }], {
      duration: 300,
    });

    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.8}px, ${(D.y - A.y) * 0.8}px)`, offset: 0.6 },
        { transform: 'none' },
      ],
      { duration: 380, easing: 'ease-in-out' }
    ).finished;
    this.createSplash(D, 14);
  }

  // --- ELECTRIC MOVES ---

  /** THUNDER SHOCK: Small electrical spark discharge */
  private async playThunderShock(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'El' }, 'bolt', 1, 0.9);
    for (let i = 0; i < 6; i++) {
      const spark = el('electric-spark', {
        position: 'absolute',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #ffffff, #fef08a 50%, #eab308 90%)',
        boxShadow: '0 0 10px #facc15',
        zIndex: '34',
      });
      const offset = { x: D.x + (R() - 0.5) * 45, y: D.y + (R() - 0.5) * 45 };
      fly(
        spark,
        [
          { transform: tr(D, 0.2), opacity: '1' },
          { transform: tr(offset, 1.2), opacity: '0' },
        ],
        { duration: 250, delay: i * 35 }
      );
    }
    await new Promise(r => setTimeout(r, 320));
  }

  /** SPARK: Charged electrical dash */
  private async playSpark(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'El' }, 'bolt', 1, 1.1);
    screenFlash('#fef08a', 200);

    await attackerEl.animate(
      [
        { transform: 'none', filter: 'drop-shadow(0 0 15px #facc15)' },
        { transform: `translate(${(D.x - A.x) * 0.75}px, ${(D.y - A.y) * 0.75}px) scale(1.08)`, filter: 'drop-shadow(0 0 25px #ffffff)', offset: 0.55 },
        { transform: 'none', filter: 'none' },
      ],
      { duration: 380, easing: 'ease-in-out' }
    ).finished;
    this.createLightningBurst(D, '#facc15', 5);
  }

  /** THUNDERBOLT: Branching zigzag lightning bolts from attacker to target */
  private async playThunderbolt(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'El' }, 'bolt', 2, 1.4);
    screenShake('medium', 400);
    screenFlash('#fffbeb', 220);

    const world = $('#world');
    if (!world) return;

    for (let bolt = 0; bolt < 3; bolt++) {
      const points: [number, number][] = [[A.x, A.y]];
      const segments = 7;
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        const lx = A.x + (D.x - A.x) * t + (R() - 0.5) * 45;
        const ly = A.y + (D.y - A.y) * t + (R() - 0.5) * 45;
        points.push([lx, ly]);
      }
      points.push([D.x, D.y]);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:35;');
      const poly = points.map(p => p.join(',')).join(' ');
      svg.innerHTML = `
        <polyline points="${poly}" fill="none" stroke="#facc15" stroke-width="8" stroke-linecap="round" filter="drop-shadow(0 0 8px #eab308)"/>
        <polyline points="${poly}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      `;
      world.appendChild(svg);
      fly(svg as unknown as HTMLElement, [{ opacity: '1' }, { opacity: '0' }], { duration: 220, delay: bolt * 60 });
    }
    await new Promise(r => setTimeout(r, 350));
  }

  /** THUNDER: Massive vertical lightning pillar descending from sky */
  private async playThunder(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'El' }, 'blast', 3, 1.8);
    screenFlash('#ffffff', 350);
    screenShake('heavy', 600);

    const world = $('#world');
    if (!world) return;

    const skyY = -50;
    const points: [number, number][] = [[D.x + (R() - 0.5) * 20, skyY]];
    const segments = 8;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const lx = D.x + (R() - 0.5) * 50;
      const ly = skyY + (D.y - skyY) * t;
      points.push([lx, ly]);
    }
    points.push([D.x, D.y]);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:36;');
    const poly = points.map(p => p.join(',')).join(' ');
    svg.innerHTML = `
      <polyline points="${poly}" fill="none" stroke="#facc15" stroke-width="16" stroke-linecap="round" filter="drop-shadow(0 0 16px #eab308)"/>
      <polyline points="${poly}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
    `;
    world.appendChild(svg);

    await fly(svg as unknown as HTMLElement, [{ opacity: '1' }, { opacity: '0' }], { duration: 450 });
  }

  /** ELECTRO BALL: Growing electrical sphere launching */
  private async playElectroBall(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'El' }, 'spark', 2, 1.2);
    const ball = el('electro-ball', {
      position: 'absolute',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #ffffff, #fef08a 40%, #eab308 80%, transparent)',
      boxShadow: '0 0 20px #facc15',
      zIndex: '34',
    });

    await fly(
      ball,
      [
        { transform: tr(A, 0.4), opacity: '0.8' },
        { transform: tr(D, 1.6), opacity: '1' },
      ],
      { duration: 420, easing: 'ease-in' }
    );
    this.createLightningBurst(D, '#facc15', 6);
  }

  /** DISCHARGE: Radial electrical explosion */
  private async playDischarge(A: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'El' }, 'bolt', 2, 1.3);
    screenShake('medium', 350);

    const wave = el('discharge-wave', {
      position: 'absolute',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      border: '4px solid #facc15',
      boxShadow: '0 0 25px #eab308, inset 0 0 15px #ffffff',
      zIndex: '33',
    });

    await fly(
      wave,
      [
        { transform: tr(A, 0.3), opacity: '1' },
        { transform: tr(A, 4.5), opacity: '0' },
      ],
      { duration: 450, easing: 'ease-out' }
    );
  }

  // --- GRASS MOVES ---

  /** RAZOR LEAF: Rotating spinning leaves flying in arcs */
  private async playRazorLeaf(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'leaf', 1, 1.1);
    const count = 7;
    for (let i = 0; i < count; i++) {
      const leaf = el('razor-leaf-pt', {
        position: 'absolute',
        width: '18px',
        height: '10px',
        borderRadius: '50% 0 50% 0',
        background: 'linear-gradient(45deg, #15803d, #4ade80, #86efac)',
        boxShadow: '0 0 8px #22c55e',
        zIndex: '34',
      });

      const arcY = (R() - 0.5) * 50;
      const mid = { x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 + arcY };

      fly(
        leaf,
        [
          { transform: tr(A, 0.4, 0), opacity: '0.9' },
          { transform: tr(mid, 1.2, 360), opacity: '1', offset: 0.5 },
          { transform: tr(D, 1.0, 720), opacity: '0' },
        ],
        { duration: 420, delay: i * 45, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, count * 45 + 350));
  }

  /** VINE WHIP: Organic vines extending and whipping target */
  private async playVineWhip(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'vine', 1, 1.0);
    const world = $('#world');
    if (!world) return;

    for (let v = 0; v < 2; v++) {
      const bendY = v === 0 ? -40 : 40;
      const pathData = `M ${A.x} ${A.y} Q ${(A.x + D.x) / 2} ${(A.y + D.y) / 2 + bendY} ${D.x} ${D.y}`;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:34;');
      svg.innerHTML = `
        <path d="${pathData}" fill="none" stroke="#16a34a" stroke-width="7" stroke-linecap="round"/>
        <path d="${pathData}" fill="none" stroke="#86efac" stroke-width="3" stroke-linecap="round"/>
      `;
      world.appendChild(svg);
      fly(svg as unknown as HTMLElement, [{ opacity: '1' }, { opacity: '0' }], { duration: 320, delay: v * 70 });
    }
    screenShake('light', 280);
    await new Promise(r => setTimeout(r, 380));
  }

  /** SOLAR BEAM: Massive focused radiant solar laser */
  private async playSolarBeam(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'beam', 3, 1.8);
    screenFlash('#fef9c3', 300);
    screenShake('heavy', 550);

    const world = $('#world');
    if (!world) return;

    const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);
    const length = Math.hypot(D.x - A.x, D.y - A.y);

    const beam = el('solar-beam-core', {
      position: 'absolute',
      left: A.x + 'px',
      top: A.y + 'px',
      width: `${length}px`,
      height: '42px',
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      background: 'linear-gradient(to right, #ffffff, #facc15 30%, #4ade80 70%, #ffffff)',
      boxShadow: '0 0 25px #22c55e, 0 0 50px #eab308',
      borderRadius: '21px',
      zIndex: '36',
    });

    await fly(beam, [{ opacity: '0.3', transform: `rotate(${angle}deg) scaleY(0.4)` }, { opacity: '1', transform: `rotate(${angle}deg) scaleY(1.4)` }, { opacity: '0', transform: `rotate(${angle}deg) scaleY(0.2)` }], {
      duration: 520,
    });
  }

  /** LEAF BLADE: Sharp blade slash */
  private async playLeafBlade(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'leaf', 1, 1.2);
    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.7}px, ${(D.y - A.y) * 0.7}px)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 320 }
    ).finished;

    const slash = el('leaf-blade-slash', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '80px',
      height: '14px',
      background: 'linear-gradient(90deg, transparent, #22c55e, #ffffff, #22c55e, transparent)',
      boxShadow: '0 0 15px #15803d',
      transform: 'translate(-50%, -50%) rotate(-45deg)',
      zIndex: '35',
    });

    await fly(slash, [{ transform: 'translate(-50%, -50%) rotate(-45deg) scale(0.2)', opacity: '1' }, { transform: 'translate(-50%, -50%) rotate(-45deg) scale(1.6)', opacity: '0' }], {
      duration: 260,
    });
  }

  /** ENERGY BALL: Concentrated nature sphere */
  private async playEnergyBall(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'orb', 2, 1.2);
    const orb = el('energy-ball', {
      position: 'absolute',
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #f0fdf4, #4ade80 50%, #15803d 90%)',
      boxShadow: '0 0 20px #22c55e',
      zIndex: '34',
    });

    await fly(orb, [{ transform: tr(A, 0.4), opacity: '0.8' }, { transform: tr(D, 1.8), opacity: '1' }], { duration: 420, easing: 'ease-in' });
    this.createImpactSparks(D, '#22c55e', 8);
  }

  /** PETAL DANCE: Swirling petal storm */
  private async playPetalDance(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'leaf', 1, 1.2);
    for (let i = 0; i < 20; i++) {
      const petal = el('petal-pt', {
        position: 'absolute',
        width: '12px',
        height: '8px',
        borderRadius: '50% 0 50% 50%',
        background: '#f472b6',
        boxShadow: '0 0 6px #fb7185',
        zIndex: '34',
      });
      const angle = (i * 36 * Math.PI) / 180;
      const r = 35 + R() * 20;
      fly(
        petal,
        [
          { transform: tr({ x: D.x + Math.cos(angle) * r, y: D.y + Math.sin(angle) * r }, 0.5, 0), opacity: '1' },
          { transform: tr({ x: D.x + Math.cos(angle + 2) * (r * 1.3), y: D.y + Math.sin(angle + 2) * (r * 1.3) }, 1.2, 360), opacity: '0' },
        ],
        { duration: 550, delay: i * 20, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 600));
  }

  /** BULLET SEED: Rapid machine gun seeds */
  private async playBulletSeed(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gr' }, 'spark', 1, 0.8);
    for (let i = 0; i < 5; i++) {
      const seed = el('seed-bullet', {
        position: 'absolute',
        width: '12px',
        height: '8px',
        borderRadius: '50%',
        background: '#eab308',
        boxShadow: '0 0 6px #ca8a04',
        zIndex: '34',
      });
      fly(seed, [{ transform: tr(A, 0.6), opacity: '1' }, { transform: tr(D, 1.0), opacity: '0.8' }], { duration: 240, delay: i * 55, easing: 'ease-in' }).then(() => {
        this.createImpactSparks(D, '#ca8a04', 3);
        screenShake('light', 150);
      });
    }
    await new Promise(r => setTimeout(r, 5 * 55 + 260));
  }

  // --- ICE MOVES ---

  /** ICE BEAM: Continuous frozen beam crystallizing target */
  private async playIceBeam(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ic' }, 'beam', 2, 1.3);
    const length = Math.hypot(D.x - A.x, D.y - A.y);
    const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);

    const beam = el('ice-beam-core', {
      position: 'absolute',
      left: A.x + 'px',
      top: A.y + 'px',
      width: `${length}px`,
      height: '24px',
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      background: 'linear-gradient(to right, #ffffff, #7dd3fc 40%, #bae6fd 80%, #ffffff)',
      boxShadow: '0 0 20px #38bdf8, 0 0 35px #ffffff',
      borderRadius: '12px',
      zIndex: '35',
    });

    await fly(beam, [{ opacity: '0.2', transform: `rotate(${angle}deg) scaleY(0.3)` }, { opacity: '1', transform: `rotate(${angle}deg) scaleY(1.3)` }, { opacity: '0', transform: `rotate(${angle}deg) scaleY(0.2)` }], {
      duration: 450,
    });

    // Ice crystals freezing on defender
    this.createIceShatter(D, 12);
  }

  /** ICE SHARD: Sharp fast ice icicle projectiles */
  private async playIceShard(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ic' }, 'spark', 1, 1.0);
    for (let i = 0; i < 3; i++) {
      const shard = el('ice-shard-pt', {
        position: 'absolute',
        width: '26px',
        height: '8px',
        clipPath: 'polygon(0 50%, 70% 0, 100% 50%, 70% 100%)',
        background: 'linear-gradient(to right, #bae6fd, #ffffff)',
        boxShadow: '0 0 10px #38bdf8',
        zIndex: '34',
      });
      const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);
      fly(shard, [{ transform: tr(A, 0.5, angle), opacity: '0.9' }, { transform: tr(D, 1.4, angle), opacity: '0.9' }], { duration: 280, delay: i * 60, easing: 'ease-in' }).then(() => {
        this.createIceShatter(D, 4);
      });
    }
    await new Promise(r => setTimeout(r, 420));
  }

  /** BLIZZARD: Snowstorm swirling across battlefield */
  private async playBlizzard(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ic' }, 'blast', 3, 1.6);
    screenShake('medium', 500);

    for (let i = 0; i < 28; i++) {
      const flake = el('blizzard-flake', {
        position: 'absolute',
        width: `${8 + R() * 10}px`,
        height: `${8 + R() * 10}px`,
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 0 12px #38bdf8',
        zIndex: '35',
      });

      const startPos = { x: D.x - 120 + (R() - 0.5) * 80, y: D.y - 80 + (R() - 0.5) * 60 };
      const endPos = { x: D.x + 120 + (R() - 0.5) * 80, y: D.y + 60 + (R() - 0.5) * 60 };

      fly(
        flake,
        [
          { transform: tr(startPos, 0.4), opacity: '0.8' },
          { transform: tr(endPos, 1.5), opacity: '0' },
        ],
        { duration: 420 + R() * 120, delay: i * 18, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 650));
    this.createIceShatter(D, 14);
  }

  /** ICICLE SPEAR: Repeated launched ice spikes */
  private async playIcicleSpear(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ic' }, 'spark', 1, 0.9);
    for (let i = 0; i < 4; i++) {
      const spear = el('icicle-spear-pt', {
        position: 'absolute',
        width: '32px',
        height: '10px',
        clipPath: 'polygon(0 50%, 80% 0, 100% 50%, 80% 100%)',
        background: 'linear-gradient(to right, #38bdf8, #ffffff)',
        boxShadow: '0 0 12px #0284c7',
        zIndex: '34',
      });
      const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);
      fly(spear, [{ transform: tr(A, 0.5, angle), opacity: '1' }, { transform: tr(D, 1.2, angle), opacity: '1' }], { duration: 250, delay: i * 70, easing: 'ease-in' }).then(() => {
        this.createIceShatter(D, 5);
        screenShake('light', 160);
      });
    }
    await new Promise(r => setTimeout(r, 4 * 70 + 280));
  }

  // --- ROCK MOVES ---

  /** ROCK THROW: Boulders hurled at target */
  private async playRockThrow(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ro' }, 'rock', 1, 1.0);
    const boulder = el('rock-boulder', {
      position: 'absolute',
      width: '34px',
      height: '30px',
      borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
      background: 'linear-gradient(135deg, #a8a29e, #78716c 60%, #44403c)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      zIndex: '34',
    });

    const arcY = -40;
    const mid = { x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 + arcY };

    await fly(
      boulder,
      [
        { transform: tr(A, 0.6, 0), opacity: '1' },
        { transform: tr(mid, 1.2, 180), opacity: '1', offset: 0.5 },
        { transform: tr(D, 1.0, 360), opacity: '1' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }
    );

    screenShake('medium', 300);
    this.createRockDebris(D, 8);
  }

  /** ROCK SLIDE: Multiple rocks tumbling from above */
  private async playRockSlide(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ro' }, 'rock', 2, 1.2);
    screenShake('medium', 450);

    for (let i = 0; i < 6; i++) {
      const rock = el('rock-slide-pt', {
        position: 'absolute',
        width: `${22 + R() * 16}px`,
        height: `${20 + R() * 14}px`,
        borderRadius: '45% 55% 60% 40%',
        background: 'linear-gradient(135deg, #a8a29e, #57534e)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
        zIndex: '35',
      });

      const startPos = { x: D.x + (R() - 0.5) * 70, y: D.y - 120 };
      const targetPos = { x: D.x + (R() - 0.5) * 50, y: D.y + (R() - 0.5) * 25 };

      fly(
        rock,
        [
          { transform: tr(startPos, 0.6, 0), opacity: '0.9' },
          { transform: tr(targetPos, 1.1, 180), opacity: '1' },
        ],
        { duration: 320, delay: i * 45, easing: 'ease-in' }
      ).then(() => {
        this.createRockDebris(targetPos, 4);
      });
    }
    await new Promise(r => setTimeout(r, 500));
  }

  /** STONE EDGE: Giant sharp stone spires erupting from ground */
  private async playStoneEdge(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ro' }, 'rock', 3, 1.5);
    screenShake('heavy', 500);

    for (let i = 0; i < 4; i++) {
      const spire = el('stone-spire', {
        position: 'absolute',
        width: '26px',
        height: '60px',
        clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
        background: 'linear-gradient(to top, #44403c, #78716c 60%, #d6d3d1)',
        boxShadow: '0 0 15px rgba(0,0,0,0.7)',
        zIndex: '34',
      });

      const offset = (i - 1.5) * 22;
      const pos = { x: D.x + offset, y: D.y };

      fly(
        spire,
        [
          { transform: tr({ x: pos.x, y: pos.y + 40 }, 0.2), opacity: '0' },
          { transform: tr(pos, 1.3), opacity: '1', offset: 0.6 },
          { transform: tr(pos, 1.1), opacity: '0' },
        ],
        { duration: 420, delay: i * 40, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 480));
  }

  /** ROCK BLAST: Rapid stone projectile barrage */
  private async playRockBlast(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ro' }, 'rock', 1, 0.9);
    for (let i = 0; i < 4; i++) {
      const rock = el('rock-blast-pt', {
        position: 'absolute',
        width: '18px',
        height: '16px',
        borderRadius: '50% 40% 60% 50%',
        background: '#78716c',
        boxShadow: '0 0 6px #44403c',
        zIndex: '34',
      });
      fly(rock, [{ transform: tr(A, 0.5), opacity: '1' }, { transform: tr(D, 1.1), opacity: '1' }], { duration: 250, delay: i * 65, easing: 'ease-in' }).then(() => {
        this.createRockDebris(D, 3);
        screenShake('light', 160);
      });
    }
    await new Promise(r => setTimeout(r, 4 * 65 + 280));
  }

  // --- PSYCHIC MOVES ---

  /** PSYCHIC: Psychic distortion rings and warping aura */
  private async playPsychic(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ps' }, 'wave', 2, 1.4);
    screenFlash('#f43f5e', 220);

    for (let i = 0; i < 4; i++) {
      const ring = el('psychic-distortion', {
        position: 'absolute',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '3px solid #ec4899',
        boxShadow: '0 0 20px #f43f5e, inset 0 0 15px #a855f7',
        zIndex: '35',
      });

      fly(
        ring,
        [
          { transform: tr(D, 0.2), opacity: '1' },
          { transform: tr(D, 2.5), opacity: '0' },
        ],
        { duration: 480, delay: i * 80, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 550));
  }

  /** PSYBEAM: Concentrated psychedelic colorful psychic beam */
  private async playPsybeam(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ps' }, 'beam', 2, 1.2);
    const length = Math.hypot(D.x - A.x, D.y - A.y);
    const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);

    const beam = el('psybeam-core', {
      position: 'absolute',
      left: A.x + 'px',
      top: A.y + 'px',
      width: `${length}px`,
      height: '22px',
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      background: 'linear-gradient(to right, #ec4899, #a855f7, #3b82f6, #06b6d4, #ffffff)',
      boxShadow: '0 0 16px #ec4899, 0 0 25px #a855f7',
      borderRadius: '11px',
      zIndex: '35',
    });

    await fly(beam, [{ opacity: '0.2', transform: `rotate(${angle}deg) scaleY(0.4)` }, { opacity: '1', transform: `rotate(${angle}deg) scaleY(1.3)` }, { opacity: '0', transform: `rotate(${angle}deg) scaleY(0.2)` }], {
      duration: 450,
    });
  }

  /** CONFUSION: Swirling psychic confusion rings with dizzy stars */
  private async playConfusion(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Ps' }, 'wave', 1, 0.9);
    for (let i = 0; i < 3; i++) {
      const ring = el('confusion-ring', {
        position: 'absolute',
        width: '45px',
        height: '25px',
        borderRadius: '50%',
        border: '2px solid #e879f9',
        boxShadow: '0 0 10px #d946ef',
        zIndex: '34',
      });

      fly(
        ring,
        [
          { transform: tr({ x: D.x, y: D.y - 20 }, 0.4, 0), opacity: '1' },
          { transform: tr({ x: D.x, y: D.y - 20 }, 1.8, 360), opacity: '0' },
        ],
        { duration: 480, delay: i * 90, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 450));
  }

  // --- GHOST MOVES ---

  /** SHADOW BALL: Signature dark spectral orb gathered and launched */
  private async playShadowBall(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gh' }, 'orb', 2, 1.4);

    // 1. Purple/black spectral energy spirals around attacker
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 55;
      const swirl = el('shadow-swirl', {
        position: 'absolute',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: '#581c87',
        boxShadow: '0 0 10px #7e22ce',
        zIndex: '34',
      });
      fly(
        swirl,
        [
          { transform: tr({ x: A.x + Math.cos(angle) * dist, y: A.y + Math.sin(angle) * dist }, 1), opacity: '0.9' },
          { transform: tr(A, 0.2), opacity: '0' },
        ],
        { duration: 320, delay: i * 20, easing: 'ease-in' }
      );
    }

    // 2. Dark orb forms and launches with smoky trail
    const shadowOrb = el('shadow-ball-orb', {
      position: 'absolute',
      width: '42px',
      height: '42px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #0f172a 40%, #581c87 75%, #a855f7 95%)',
      boxShadow: '0 0 25px #7e22ce, inset 0 0 15px #000000',
      zIndex: '35',
    });

    await fly(
      shadowOrb,
      [
        { transform: tr(A, 0.4, 0), opacity: '0.8' },
        { transform: tr(D, 1.6, 720), opacity: '1' },
      ],
      { duration: 420, easing: 'ease-in' }
    );

    // 3. Shadow explosion scattering purple/black particles
    screenFlash('#3b0764', 250);
    screenShake('medium', 350);

    for (let p = 0; p < 16; p++) {
      const darkPart = el('shadow-frag', {
        position: 'absolute',
        width: `${12 + R() * 10}px`,
        height: `${12 + R() * 10}px`,
        borderRadius: '50%',
        background: R() > 0.5 ? '#1e1b4b' : '#6b21a8',
        boxShadow: '0 0 12px #9333ea',
        zIndex: '36',
      });
      const a = (p / 16) * Math.PI * 2;
      const dist = 35 + R() * 30;
      fly(
        darkPart,
        [
          { transform: tr(D, 1), opacity: '1' },
          { transform: tr({ x: D.x + Math.cos(a) * dist, y: D.y + Math.sin(a) * dist }, 0.2), opacity: '0' },
        ],
        { duration: 360, easing: 'ease-out' }
      );
    }

    await new Promise(r => setTimeout(r, 400));
  }

  /** NIGHT SHADE: Spectral dark silhouette aura */
  private async playNightShade(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gh' }, 'wave', 1, 1.1);
    screenFlash('#09090b', 280);

    const shade = el('night-shade-silhouette', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(0,0,0,0.85) 40%, rgba(88,28,135,0.7) 70%, transparent)',
      boxShadow: '0 0 30px #581c87',
      transform: 'translate(-50%, -50%)',
      zIndex: '33',
    });

    await fly(shade, [{ opacity: '0', transform: 'translate(-50%, -50%) scale(0.5)' }, { opacity: '1', transform: 'translate(-50%, -50%) scale(1.6)', offset: 0.5 }, { opacity: '0', transform: 'translate(-50%, -50%) scale(2.0)' }], {
      duration: 520,
    });
  }

  /** HEX: Purple curse eyes and ominous hex seals */
  private async playHex(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gh' }, 'orb', 1, 1.1);
    for (let eye = 0; eye < 2; eye++) {
      const curseEye = el('hex-eye', {
        position: 'absolute',
        width: '28px',
        height: '16px',
        borderRadius: '50%',
        background: '#a855f7',
        boxShadow: '0 0 15px #c084fc, inset 0 0 6px #000000',
        zIndex: '34',
      });
      const pos = { x: D.x + (eye === 0 ? -22 : 22), y: D.y - 30 };
      fly(curseEye, [{ transform: tr(pos, 0.4), opacity: '0' }, { transform: tr(pos, 1.2), opacity: '1', offset: 0.5 }, { transform: tr(pos, 0.8), opacity: '0' }], {
        duration: 480,
      });
    }
    await new Promise(r => setTimeout(r, 520));
  }

  /** LICK: Quick ghostly tongue strike */
  private async playLick(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gh' }, 'dash', 1, 0.8);
    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.6}px, ${(D.y - A.y) * 0.6}px)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 280 }
    ).finished;

    const tongue = el('lick-tongue', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '50px',
      height: '16px',
      borderRadius: '25px',
      background: '#f43f5e',
      boxShadow: '0 0 10px #fb7185',
      transform: 'translate(-50%, -50%)',
      zIndex: '35',
    });

    await fly(tongue, [{ opacity: '1', transform: 'translate(-50%, -50%) scaleX(0.2)' }, { opacity: '1', transform: 'translate(-50%, -50%) scaleX(1.4)' }, { opacity: '0' }], { duration: 220 });
  }

  // --- FLYING MOVES ---

  /** GUST / HURRICANE: Large rotating wind vortex */
  private async playGust(D: { x: number; y: number }, isHurricane: boolean): Promise<void> {
    sound.sfxA('l', { t: 'Fl' }, 'stream', 1, isHurricane ? 1.6 : 0.9);
    screenShake(isHurricane ? 'heavy' : 'light', 400);

    const count = isHurricane ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const gust = el('gust-wind', {
        position: 'absolute',
        width: `${30 + R() * 25}px`,
        height: '6px',
        borderRadius: '3px',
        background: 'linear-gradient(90deg, transparent, #ffffff, #e0f2fe, transparent)',
        boxShadow: '0 0 10px #bae6fd',
        zIndex: '33',
      });

      const angle = (i * 36 * Math.PI) / 180;
      const r = 30 + R() * 20;

      fly(
        gust,
        [
          { transform: tr({ x: D.x + Math.cos(angle) * r, y: D.y + Math.sin(angle) * (r * 0.5) }, 0.5, i * 40), opacity: '0.8' },
          { transform: tr({ x: D.x + Math.cos(angle + 3) * (r * 1.4), y: D.y + Math.sin(angle + 3) * (r * 0.7) - 30 }, 1.4, i * 40 + 360), opacity: '0' },
        ],
        { duration: 420, delay: i * 25, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 520));
  }

  /** AIR SLASH: Crescent shaped high-speed air blade */
  private async playAirSlash(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fl' }, 'leaf', 1, 1.2);
    const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);

    const blade = el('air-slash-blade', {
      position: 'absolute',
      width: '50px',
      height: '14px',
      borderRadius: '50%',
      borderTop: '5px solid #ffffff',
      boxShadow: '0 -4px 15px #38bdf8',
      zIndex: '34',
    });

    await fly(blade, [{ transform: tr(A, 0.4, angle), opacity: '0.9' }, { transform: tr(D, 1.8, angle), opacity: '1' }], { duration: 320, easing: 'ease-in' });
    screenShake('light', 220);
  }

  /** AERIAL ACE: Ultra-fast dash with cross slashes */
  private async playAerialAce(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fl' }, 'dash', 2, 1.2);
    screenFlash('#ffffff', 180);

    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 1.1}px, ${(D.y - A.y) * 1.1}px)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 260, easing: 'ease-in-out' }
    ).finished;

    // Cross slash
    this.createSlashCross(D, '#38bdf8');
    screenShake('medium', 250);
  }

  // --- GROUND MOVES ---

  /** EARTHQUAKE: Battlefield shaking with ground fissures */
  private async playEarthquake(): Promise<void> {
    sound.sfxA('l', { t: 'Gd' }, 'quake', 3, 1.6);
    screenShake('heavy', 750);
    screenFlash('#451a03', 180);

    const world = $('#world');
    if (!world) return;

    // Dust billows
    for (let i = 0; i < 12; i++) {
      const dust = el('ground-dust', {
        position: 'absolute',
        width: `${24 + R() * 24}px`,
        height: `${24 + R() * 24}px`,
        borderRadius: '50%',
        background: '#78350f',
        filter: 'blur(3px)',
        zIndex: '30',
      });
      const px = 150 + R() * 300;
      const py = 250 + R() * 150;
      fly(
        dust,
        [
          { transform: tr({ x: px, y: py }, 0.5), opacity: '0.7' },
          { transform: tr({ x: px + (R() - 0.5) * 30, y: py - 40 }, 1.8), opacity: '0' },
        ],
        { duration: 520, delay: i * 35, easing: 'ease-out' }
      );
    }
    await new Promise(r => setTimeout(r, 650));
  }

  /** DIG: Burrowing underground and erupting underneath target */
  private async playDig(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gd' }, 'quake', 2, 1.2);

    // 1. Burrow down
    await attackerEl.animate(
      [
        { transform: 'none', opacity: '1' },
        { transform: 'translateY(40px) scale(0.6)', opacity: '0' },
      ],
      { duration: 250 }
    ).finished;

    this.createGroundBurst(A);
    await new Promise(r => setTimeout(r, 180));

    // 2. Erupt under target
    this.createGroundBurst(D);
    screenShake('heavy', 350);

    await attackerEl.animate(
      [
        { transform: `translate(${D.x - A.x}px, ${D.y - A.y + 40}px) scale(0.6)`, opacity: '0' },
        { transform: `translate(${D.x - A.x}px, ${D.y - A.y - 20}px) scale(1.1)`, opacity: '1', offset: 0.6 },
        { transform: 'none', opacity: '1' },
      ],
      { duration: 420, easing: 'ease-out' }
    ).finished;
  }

  /** EARTH POWER: Volcanic energy pillar erupting from ground */
  private async playEarthPower(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gd' }, 'blast', 2, 1.4);
    screenShake('heavy', 450);

    const pillar = el('earth-power-pillar', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '60px',
      height: '110px',
      transform: 'translate(-50%, -100%)',
      background: 'linear-gradient(to top, #78350f, #f59e0b 60%, #fef08a)',
      boxShadow: '0 0 25px #d97706',
      borderRadius: '30px 30px 0 0',
      zIndex: '34',
    });

    await fly(
      pillar,
      [
        { transform: 'translate(-50%, 0) scaleY(0)', opacity: '0' },
        { transform: 'translate(-50%, -70%) scaleY(1.2)', opacity: '1', offset: 0.5 },
        { transform: 'translate(-50%, -100%) scaleY(0.2)', opacity: '0' },
      ],
      { duration: 480, easing: 'ease-out' }
    );
  }

  /** MUD SHOT: Chunky mud pellets splashing */
  private async playMudShot(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Gd' }, 'spark', 1, 0.9);
    for (let i = 0; i < 4; i++) {
      const mud = el('mud-pellet', {
        position: 'absolute',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: '#78350f',
        boxShadow: '0 0 6px #451a03',
        zIndex: '34',
      });
      fly(mud, [{ transform: tr(A, 0.6), opacity: '1' }, { transform: tr(D, 1.2), opacity: '1' }], { duration: 280, delay: i * 55, easing: 'ease-in' }).then(() => {
        this.createSplash(D, 4, '#78350f');
      });
    }
    await new Promise(r => setTimeout(r, 4 * 55 + 300));
  }

  // --- BUG MOVES ---

  /** X-SCISSOR: Dual crossing blades forming an 'X' cut */
  private async playXScissor(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Bu' }, 'claw', 2, 1.2);
    screenShake('medium', 250);

    const slashA = el('x-slash-1', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '75px',
      height: '10px',
      background: 'linear-gradient(90deg, transparent, #84cc16, #ffffff, #84cc16, transparent)',
      boxShadow: '0 0 12px #65a30d',
      transform: 'translate(-50%, -50%) rotate(45deg)',
      zIndex: '35',
    });

    const slashB = el('x-slash-2', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '75px',
      height: '10px',
      background: 'linear-gradient(90deg, transparent, #84cc16, #ffffff, #84cc16, transparent)',
      boxShadow: '0 0 12px #65a30d',
      transform: 'translate(-50%, -50%) rotate(-45deg)',
      zIndex: '35',
    });

    fly(slashA, [{ transform: 'translate(-50%, -50%) rotate(45deg) scale(0.2)', opacity: '1' }, { transform: 'translate(-50%, -50%) rotate(45deg) scale(1.6)', opacity: '0' }], { duration: 280 });
    await fly(slashB, [{ transform: 'translate(-50%, -50%) rotate(-45deg) scale(0.2)', opacity: '1' }, { transform: 'translate(-50%, -50%) rotate(-45deg) scale(1.6)', opacity: '0' }], { duration: 280 });
  }

  /** SIGNAL BEAM: Bug-like iridescent double beam */
  private async playSignalBeam(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Bu' }, 'beam', 2, 1.2);
    const length = Math.hypot(D.x - A.x, D.y - A.y);
    const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);

    const beam = el('signal-beam-core', {
      position: 'absolute',
      left: A.x + 'px',
      top: A.y + 'px',
      width: `${length}px`,
      height: '18px',
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      background: 'repeating-linear-gradient(90deg, #ec4899, #84cc16 20px, #06b6d4 40px)',
      boxShadow: '0 0 16px #84cc16',
      borderRadius: '9px',
      zIndex: '35',
    });

    await fly(beam, [{ opacity: '0.2', transform: `rotate(${angle}deg) scaleY(0.4)` }, { opacity: '1', transform: `rotate(${angle}deg) scaleY(1.3)` }, { opacity: '0', transform: `rotate(${angle}deg) scaleY(0.2)` }], { duration: 420 });
  }

  /** PIN MISSILE: Barrage of glowing needle darts */
  private async playPinMissile(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Bu' }, 'leaf', 1, 0.9);
    for (let i = 0; i < 6; i++) {
      const needle = el('pin-needle', {
        position: 'absolute',
        width: '24px',
        height: '4px',
        borderRadius: '2px',
        background: '#a3e635',
        boxShadow: '0 0 8px #84cc16',
        zIndex: '34',
      });
      const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);
      fly(needle, [{ transform: tr(A, 0.6, angle), opacity: '1' }, { transform: tr(D, 1.2, angle), opacity: '0.9' }], { duration: 240, delay: i * 40, easing: 'ease-in' }).then(() => {
        this.createImpactSparks(D, '#a3e635', 3);
      });
    }
    await new Promise(r => setTimeout(r, 6 * 40 + 260));
  }

  /** BITE / BUG BITE / FIRE FANG: Massive clamping translucent fangs */
  private async playBite(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }, subType: string): Promise<void> {
    sound.sfxA('l', { t: subType === 'fire_fang' ? 'Fi' : 'No' }, 'bite', 1, 1.0);

    // Attacker slight lunge
    attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.4}px, ${(D.y - A.y) * 0.4}px)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 260 }
    );

    const fangColor = subType === 'fire_fang' ? '#ff4400' : '#ffffff';
    const fangA = el('bite-fang-top', {
      position: 'absolute',
      width: '40px',
      height: '24px',
      clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
      background: fangColor,
      boxShadow: `0 0 14px ${fangColor}`,
      zIndex: '35',
    });

    const fangB = el('bite-fang-bottom', {
      position: 'absolute',
      width: '40px',
      height: '24px',
      clipPath: 'polygon(50% 0, 0 100%, 100% 100%)',
      background: fangColor,
      boxShadow: `0 0 14px ${fangColor}`,
      zIndex: '35',
    });

    fly(fangA, [{ transform: tr({ x: D.x, y: D.y - 35 }, 1), opacity: '0' }, { transform: tr({ x: D.x, y: D.y - 4 }, 1.3), opacity: '1', offset: 0.6 }, { opacity: '0' }], { duration: 320 });
    await fly(fangB, [{ transform: tr({ x: D.x, y: D.y + 35 }, 1), opacity: '0' }, { transform: tr({ x: D.x, y: D.y + 4 }, 1.3), opacity: '1', offset: 0.6 }, { opacity: '0' }], { duration: 320 });

    screenShake('medium', 250);
  }

  // --- POISON MOVES ---

  /** POISON STING: Sharp poisonous spikes */
  private async playPoisonSting(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Po' }, 'spark', 1, 0.8);
    for (let i = 0; i < 3; i++) {
      const sting = el('poison-sting-pt', {
        position: 'absolute',
        width: '18px',
        height: '6px',
        borderRadius: '3px',
        background: '#a855f7',
        boxShadow: '0 0 8px #9333ea',
        zIndex: '34',
      });
      const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);
      fly(sting, [{ transform: tr(A, 0.5, angle), opacity: '1' }, { transform: tr(D, 1.2, angle), opacity: '1' }], { duration: 240, delay: i * 60, easing: 'ease-in' }).then(() => {
        this.createImpactSparks(D, '#a855f7', 4);
      });
    }
    await new Promise(r => setTimeout(r, 380));
  }

  /** SLUDGE / SLUDGE BOMB: Toxic chunks & splash */
  private async playSludge(A: { x: number; y: number }, D: { x: number; y: number }, isBomb: boolean): Promise<void> {
    sound.sfxA('l', { t: 'Po' }, 'stream', 1, isBomb ? 1.4 : 1.0);
    const orb = el('sludge-bomb-pt', {
      position: 'absolute',
      width: isBomb ? '36px' : '22px',
      height: isBomb ? '36px' : '22px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #c084fc, #7e22ce 60%, #3b0764)',
      boxShadow: '0 0 16px #9333ea',
      zIndex: '34',
    });

    await fly(orb, [{ transform: tr(A, 0.5), opacity: '0.9' }, { transform: tr(D, 1.6), opacity: '1' }], { duration: 380, easing: 'ease-in' });
    this.createSplash(D, isBomb ? 16 : 8, '#7e22ce');
    screenShake('medium', 250);
  }

  /** ACID: Corrosive bubbling spray */
  private async playAcid(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Po' }, 'stream', 1, 0.9);
    for (let i = 0; i < 14; i++) {
      const drop = el('acid-pt', {
        position: 'absolute',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: '#a855f7',
        boxShadow: '0 0 8px #c084fc',
        zIndex: '33',
      });
      const spread = (R() - 0.5) * 20;
      fly(drop, [{ transform: tr(A, 0.4), opacity: '0.9' }, { transform: tr({ x: D.x + spread, y: D.y + spread }, 1.2), opacity: '0' }], { duration: 320, delay: i * 25, easing: 'ease-in' });
    }
    await new Promise(r => setTimeout(r, 450));
  }

  // --- FIGHTING MOVES ---

  /** KARATE CHOP / BRICK BREAK: Powerful downward physical chop */
  private async playChop(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fg' }, 'punch', 2, 1.2);
    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.8}px, ${(D.y - A.y) * 0.8}px)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 280, easing: 'ease-in-out' }
    ).finished;

    // Vertical impact slice
    const chop = el('chop-fx', {
      position: 'absolute',
      left: D.x + 'px',
      top: D.y + 'px',
      width: '14px',
      height: '75px',
      borderRadius: '7px',
      background: 'linear-gradient(to bottom, #ffffff, #ef4444, transparent)',
      boxShadow: '0 0 15px #dc2626',
      transform: 'translate(-50%, -50%)',
      zIndex: '35',
    });

    fly(chop, [{ transform: 'translate(-50%, -50%) scaleY(0.2)', opacity: '1' }, { transform: 'translate(-50%, -50%) scaleY(1.4)', opacity: '0' }], { duration: 250 });
    screenShake('heavy', 350);
    this.createImpactSparks(D, '#ef4444', 8);
  }

  /** DOUBLE KICK: Two clearly separated kicks */
  private async playDoubleKick(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    for (let kick = 0; kick < 2; kick++) {
      sound.sfxA('l', { t: 'Fg' }, 'punch', 1, 0.9);
      await attackerEl.animate(
        [
          { transform: 'none' },
          { transform: `translate(${(D.x - A.x) * 0.7}px, ${(D.y - A.y) * 0.7}px)`, offset: 0.5 },
          { transform: 'none' },
        ],
        { duration: 220 }
      ).finished;

      this.createImpactSparks(D, '#f97316', 5);
      screenShake('light', 180);
      await new Promise(r => setTimeout(r, 60));
    }
  }

  /** CLOSE COMBAT: Rapid multi-hit melee strike sequence */
  private async playCloseCombat(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fg' }, 'punch', 3, 1.6);
    screenFlash('#fee2e2', 200);

    for (let hit = 0; hit < 4; hit++) {
      const offsetX = (R() - 0.5) * 35;
      const offsetY = (R() - 0.5) * 30;

      attackerEl.animate(
        [
          { transform: 'none' },
          { transform: `translate(${(D.x - A.x) * 0.75 + offsetX}px, ${(D.y - A.y) * 0.75 + offsetY}px)`, offset: 0.5 },
          { transform: 'none' },
        ],
        { duration: 160 }
      );

      this.createImpactSparks({ x: D.x + offsetX, y: D.y + offsetY }, '#ef4444', 4);
      screenShake('medium', 180);
      await new Promise(r => setTimeout(r, 110));
    }
  }

  /** AURA SPHERE: Concentrated aura projectile */
  private async playAuraSphere(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Fg' }, 'orb', 2, 1.3);
    const sphere = el('aura-sphere-pt', {
      position: 'absolute',
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #ffffff, #38bdf8 50%, #0284c7 85%)',
      boxShadow: '0 0 25px #38bdf8',
      zIndex: '35',
    });

    await fly(sphere, [{ transform: tr(A, 0.4), opacity: '0.9' }, { transform: tr(D, 1.8), opacity: '1' }], { duration: 400, easing: 'ease-in' });
    this.createImpactSparks(D, '#38bdf8', 10);
    screenShake('medium', 300);
  }

  // --- NORMAL & SPECIAL MOVES ---

  /** QUICK ATTACK: Blinding white trail dash with speedlines */
  private async playQuickAttack(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'dash', 2, 1.1);
    screenFlash('#ffffff', 180);

    // Speedline ghost trail
    for (let t = 1; t <= 3; t++) {
      const trail = el('speed-trail', {
        position: 'absolute',
        width: '60px',
        height: '4px',
        borderRadius: '2px',
        background: '#ffffff',
        boxShadow: '0 0 10px #ffffff',
        zIndex: '32',
      });
      const pos = lerp(A, D, t / 4);
      const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);
      fly(trail, [{ transform: tr(pos, 1, angle), opacity: '1' }, { transform: tr(pos, 1.5, angle), opacity: '0' }], { duration: 250, delay: t * 40 });
    }

    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.95}px, ${(D.y - A.y) * 0.95}px)`, offset: 0.45 },
        { transform: 'none' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }
    ).finished;

    screenShake('light', 220);
    this.createImpactSparks(D, '#ffffff', 6);
  }

  /** HYPER BEAM: Epic screen-filling destructive beam */
  private async playHyperBeam(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'blast', 3, 2.0);
    screenFlash('#ffffff', 400);
    screenShake('heavy', 750);

    const length = Math.hypot(D.x - A.x, D.y - A.y) + 100;
    const angle = Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI);

    const beam = el('hyper-beam-core', {
      position: 'absolute',
      left: A.x + 'px',
      top: A.y + 'px',
      width: `${length}px`,
      height: '54px',
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      background: 'linear-gradient(to right, #ffffff, #fbbf24 20%, #ef4444 50%, #8b5cf6 80%, #ffffff)',
      boxShadow: '0 0 35px #f59e0b, 0 0 60px #ef4444',
      borderRadius: '27px',
      zIndex: '38',
    });

    await fly(beam, [{ opacity: '0.4', transform: `rotate(${angle}deg) scaleY(0.3)` }, { opacity: '1', transform: `rotate(${angle}deg) scaleY(1.8)` }, { opacity: '0', transform: `rotate(${angle}deg) scaleY(0.2)` }], {
      duration: 650,
    });
  }

  /** SCRATCH: Three sharp claw marks */
  private async playScratch(D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'claw', 1, 1.0);
    for (let c = 0; c < 3; c++) {
      const scratch = el('scratch-mark', {
        position: 'absolute',
        width: '45px',
        height: '4px',
        borderRadius: '2px',
        background: '#ffffff',
        boxShadow: '0 0 8px #94a3b8',
        transform: `translate(-50%, -50%) rotate(-35deg) translate(${(c - 1) * 12}px, 0)`,
        zIndex: '34',
      });
      fly(
        scratch,
        [
          { transform: `translate(-50%, -50%) rotate(-35deg) translate(${(c - 1) * 12}px, -20px) scaleX(0.2)`, opacity: '1' },
          { transform: `translate(-50%, -50%) rotate(-35deg) translate(${(c - 1) * 12}px, 20px) scaleX(1.4)`, opacity: '0' },
        ],
        { duration: 250, delay: c * 25 }
      );
    }
    screenShake('light', 220);
    await new Promise(r => setTimeout(r, 280));
  }

  /** PHYSICAL LUNGE (Tackle, Slam, Headbutt): Pokemon physically moving */
  private async playPhysicalLunge(attackerEl: HTMLElement, A: { x: number; y: number }, D: { x: number; y: number }, scale: number): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'slam', 1, scale);
    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: `translate(${(D.x - A.x) * 0.7}px, ${(D.y - A.y) * 0.7}px) scale(1.05)`, offset: 0.5 },
        { transform: 'none' },
      ],
      { duration: 320, easing: 'ease-in-out' }
    ).finished;

    screenShake(scale > 1.2 ? 'heavy' : 'medium', 280);
    this.createImpactSparks(D, '#ffffff', Math.round(5 * scale));
  }

  // --- STATUS MOVES ---

  /** GROWL / SCREECH: Expanding sonic voice rings */
  private async playSoundWave(A: { x: number; y: number }, D: { x: number; y: number }, isScreech: boolean): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'wave', 1, isScreech ? 1.3 : 0.8);
    const count = isScreech ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const wave = el('sound-wave-ring', {
        position: 'absolute',
        width: '35px',
        height: '35px',
        borderRadius: '50%',
        border: `3px solid ${isScreech ? '#ef4444' : '#94a3b8'}`,
        boxShadow: `0 0 10px ${isScreech ? '#dc2626' : '#cbd5e1'}`,
        zIndex: '33',
      });
      fly(wave, [{ transform: tr(A, 0.4), opacity: '1' }, { transform: tr(D, 2.2), opacity: '0' }], { duration: 420, delay: i * 85, easing: 'ease-out' });
    }
    await new Promise(r => setTimeout(r, count * 85 + 320));
  }

  /** LEER: Menacing red eye glare streaks */
  private async playLeer(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'wave', 1, 0.9);
    for (let eye = 0; eye < 2; eye++) {
      const beam = el('leer-laser', {
        position: 'absolute',
        left: A.x + (eye === 0 ? -12 : 12) + 'px',
        top: A.y - 15 + 'px',
        width: `${Math.hypot(D.x - A.x, D.y - A.y)}px`,
        height: '4px',
        transformOrigin: '0 50%',
        transform: `rotate(${Math.atan2(D.y - A.y, D.x - A.x) * (180 / Math.PI)}deg)`,
        background: '#ef4444',
        boxShadow: '0 0 8px #dc2626',
        zIndex: '34',
      });
      fly(beam, [{ opacity: '0.9' }, { opacity: '0' }], { duration: 320 });
    }
    await new Promise(r => setTimeout(r, 350));
  }

  /** TAIL WHIP: Twinkling sparkle and waggle */
  private async playTailWhip(attackerEl: HTMLElement): Promise<void> {
    sound.sfxA('l', { t: 'No' }, 'spark', 1, 0.8);
    await attackerEl.animate(
      [
        { transform: 'none' },
        { transform: 'rotate(-12deg)', offset: 0.25 },
        { transform: 'rotate(12deg)', offset: 0.5 },
        { transform: 'rotate(-8deg)', offset: 0.75 },
        { transform: 'none' },
      ],
      { duration: 400 }
    ).finished;
  }

  /** POWDER CLOUD: Sleep / Stun / Poison spore particles */
  private async playPowderCloud(D: { x: number; y: number }, subType: string): Promise<void> {
    const color = subType === 'sleep_powder' ? '#60a5fa' : subType === 'poison_powder' ? '#c084fc' : '#facc15';
    sound.sfxA('l', { t: 'Gr' }, 'wave', 1, 0.8);

    for (let i = 0; i < 22; i++) {
      const spore = el('powder-spore', {
        position: 'absolute',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        zIndex: '34',
      });

      const startPos = { x: D.x + (R() - 0.5) * 50, y: D.y - 60 };
      const endPos = { x: startPos.x + (R() - 0.5) * 35, y: D.y + 20 };

      fly(spore, [{ transform: tr(startPos, 0.4), opacity: '0.9' }, { transform: tr(endPos, 1.3), opacity: '0' }], { duration: 520, delay: i * 20, easing: 'ease-out' });
    }
    await new Promise(r => setTimeout(r, 600));
  }

  /** STRING SHOT: Silk web threads shooting forward */
  private async playStringShot(A: { x: number; y: number }, D: { x: number; y: number }): Promise<void> {
    sound.sfxA('l', { t: 'Bu' }, 'stream', 1, 0.8);
    const world = $('#world');
    if (!world) return;

    for (let i = 0; i < 4; i++) {
      const targetOffset = (i - 1.5) * 18;
      const pathData = `M ${A.x} ${A.y} Q ${(A.x + D.x) / 2 + (R() - 0.5) * 20} ${(A.y + D.y) / 2 + (R() - 0.5) * 20} ${D.x + targetOffset} ${D.y + targetOffset}`;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:34;');
      svg.innerHTML = `<path d="${pathData}" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>`;
      world.appendChild(svg);
      fly(svg as unknown as HTMLElement, [{ opacity: '1' }, { opacity: '0' }], { duration: 420, delay: i * 45 });
    }
    await new Promise(r => setTimeout(r, 450));
  }

  /** GENERIC PROJECTILE FALLBACK */
  private async playGenericProjectile(A: { x: number; y: number }, D: { x: number; y: number }, element: string, powerScale: number): Promise<void> {
    const color = this.getColorForElement(element);
    sound.sfxA('l', { t: element.slice(0, 2).toUpperCase() }, 'spark', 1, powerScale);

    const projectile = el('generic-projectile', {
      position: 'absolute',
      width: `${24 * powerScale}px`,
      height: `${24 * powerScale}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle, #ffffff, ${color} 70%)`,
      boxShadow: `0 0 15px ${color}`,
      zIndex: '34',
    });

    await fly(projectile, [{ transform: tr(A, 0.4), opacity: '0.9' }, { transform: tr(D, 1.4), opacity: '1' }], { duration: 380, easing: 'ease-in' });
    this.createImpactSparks(D, color, 6);
  }

  // ==========================================================================
  // HELPER FX & TARGET REACTIONS
  // ==========================================================================

  private async playTargetImpact(defenderEl: HTMLElement, effectiveness: number, isCritical: boolean, powerScale: number): Promise<void> {
    sound.sfxA('i', { t: 'No' }, 'hit', 1, powerScale, isCritical);

    const isSuper = effectiveness > 1;
    const isWeak = effectiveness < 1 && effectiveness > 0;
    const shakeIntensity = isCritical || isSuper || powerScale >= 1.5 ? 'heavy' : isWeak ? 'light' : 'medium';

    screenShake(shakeIntensity, isSuper ? 400 : 250);

    // Hit flash reaction on sprite
    await defenderEl.animate(
      [
        { transform: 'none', filter: 'brightness(3)' },
        { transform: 'translateX(-12px)', opacity: '0.4', offset: 0.3 },
        { transform: 'translateX(10px)', opacity: '0.9', offset: 0.6 },
        { transform: 'none', filter: 'none', opacity: '1' },
      ],
      { duration: 350 }
    ).finished;
  }

  private createImpactSparks(pos: { x: number; y: number }, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const spark = el('impact-spark', {
        position: 'absolute',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}`,
        zIndex: '35',
      });
      const a = R() * Math.PI * 2;
      const dist = 15 + R() * 25;
      fly(
        spark,
        [
          { transform: tr(pos, 1), opacity: '1' },
          { transform: tr({ x: pos.x + Math.cos(a) * dist, y: pos.y + Math.sin(a) * dist }, 0.2), opacity: '0' },
        ],
        { duration: 250, easing: 'ease-out' }
      );
    }
  }

  private createSplash(pos: { x: number; y: number }, count: number, color: string = '#38bdf8'): void {
    for (let i = 0; i < count; i++) {
      const drop = el('splash-drop', {
        position: 'absolute',
        width: `${10 + R() * 8}px`,
        height: `${10 + R() * 8}px`,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        zIndex: '35',
      });
      const a = R() * Math.PI * 2;
      const d = 20 + R() * 35;
      fly(drop, [{ transform: tr(pos, 0.4), opacity: '0.9' }, { transform: tr({ x: pos.x + Math.cos(a) * d, y: pos.y + Math.sin(a) * (d * 0.6) }, 1.3), opacity: '0' }], { duration: 320, easing: 'ease-out' });
    }
  }

  private createIceShatter(pos: { x: number; y: number }, count: number): void {
    for (let i = 0; i < count; i++) {
      const crystal = el('ice-crystal', {
        position: 'absolute',
        width: `${12 + R() * 10}px`,
        height: `${12 + R() * 10}px`,
        clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
        background: '#ffffff',
        boxShadow: '0 0 8px #7dd3fc',
        zIndex: '35',
      });
      const a = R() * Math.PI * 2;
      const dist = 25 + R() * 35;
      fly(crystal, [{ transform: tr(pos, 0.5, 0), opacity: '1' }, { transform: tr({ x: pos.x + Math.cos(a) * dist, y: pos.y + Math.sin(a) * dist }, 1.2, 180), opacity: '0' }], { duration: 320, easing: 'ease-out' });
    }
  }

  private createRockDebris(pos: { x: number; y: number }, count: number): void {
    for (let i = 0; i < count; i++) {
      const deb = el('rock-debris', {
        position: 'absolute',
        width: `${10 + R() * 8}px`,
        height: `${10 + R() * 8}px`,
        borderRadius: '40% 60% 50% 50%',
        background: '#78716c',
        boxShadow: '0 0 5px rgba(0,0,0,0.5)',
        zIndex: '35',
      });
      const a = R() * Math.PI * 2;
      const dist = 18 + R() * 25;
      fly(deb, [{ transform: tr(pos, 1, 0), opacity: '1' }, { transform: tr({ x: pos.x + Math.cos(a) * dist, y: pos.y + Math.sin(a) * dist }, 0.4, 180), opacity: '0' }], { duration: 280, easing: 'ease-out' });
    }
  }

  private createGroundBurst(pos: { x: number; y: number }): void {
    for (let i = 0; i < 8; i++) {
      const clod = el('dirt-clod', {
        position: 'absolute',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: '#78350f',
        zIndex: '33',
      });
      const a = (i / 8) * Math.PI * 2;
      fly(clod, [{ transform: tr(pos, 0.5), opacity: '1' }, { transform: tr({ x: pos.x + Math.cos(a) * 30, y: pos.y + Math.sin(a) * 15 - 20 }, 1.2), opacity: '0' }], { duration: 300, easing: 'ease-out' });
    }
  }

  private createLightningBurst(pos: { x: number; y: number }, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const spark = el('electric-burst-spark', {
        position: 'absolute',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}`,
        zIndex: '35',
      });
      const a = (i / count) * Math.PI * 2;
      const dist = 25 + R() * 20;
      fly(spark, [{ transform: tr(pos, 0.5), opacity: '1' }, { transform: tr({ x: pos.x + Math.cos(a) * dist, y: pos.y + Math.sin(a) * dist }, 1.3), opacity: '0' }], { duration: 240 });
    }
  }

  private createSlashCross(pos: { x: number; y: number }, color: string): void {
    for (let i = 0; i < 2; i++) {
      const rot = i === 0 ? 45 : -45;
      const s = el('cross-slash', {
        position: 'absolute',
        left: pos.x + 'px',
        top: pos.y + 'px',
        width: '60px',
        height: '8px',
        background: `linear-gradient(90deg, transparent, ${color}, #ffffff, ${color}, transparent)`,
        boxShadow: `0 0 10px ${color}`,
        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        zIndex: '35',
      });
      fly(s, [{ transform: `translate(-50%, -50%) rotate(${rot}deg) scale(0.2)`, opacity: '1' }, { transform: `translate(-50%, -50%) rotate(${rot}deg) scale(1.4)`, opacity: '0' }], { duration: 240 });
    }
  }

  private getColorForElement(element: string): string {
    const map: Record<string, string> = {
      fire: '#ff5500',
      water: '#38bdf8',
      electric: '#facc15',
      grass: '#22c55e',
      ice: '#7dd3fc',
      fighting: '#ef4444',
      poison: '#a855f7',
      ground: '#d97706',
      flying: '#60a5fa',
      psychic: '#ec4899',
      bug: '#84cc16',
      rock: '#a8a29e',
      ghost: '#7e22ce',
      dragon: '#6366f1',
      normal: '#ffffff',
    };
    return map[element] || '#ffffff';
  }
}

export const moveAnimationSystem = MoveAnimationSystem.getInstance();
