import type { IPlayer } from '../../types';
import { getCasterProgression } from '../schema/classAbilityMap';

/** D&D 5e full-caster spell slots by character level (index 0 = level 1). */
const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Half-caster progression (Paladin, Ranger, Artificer). */
const HALF_CASTER_SLOTS: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
];

export type PlayerSpellSlots = Record<string, { current: number; max: number }>;

function getSlotMaxesForLevel(level: number, progression: CasterProgression): number[] {
  const table = progression === 'half' ? HALF_CASTER_SLOTS : FULL_CASTER_SLOTS;
  const idx = Math.max(1, Math.min(20, Math.floor(level))) - 1;
  return [...table[idx]];
}

export function playerQualifiesForSpellSlots(player: IPlayer): boolean {
  return getCasterProgression(player.classType) !== null;
}

export function buildSpellSlotsForLevel(
  level: number,
  progression: CasterProgression,
  existing?: PlayerSpellSlots,
  fillCurrent = true,
): PlayerSpellSlots {
  const maxes = getSlotMaxesForLevel(level, progression);
  const slots: PlayerSpellSlots = {};

  maxes.forEach((max, i) => {
    if (max <= 0) return;
    const key = String(i + 1);
    const prev = existing?.[key];
    const nextMax = max;
    let nextCurrent = fillCurrent ? nextMax : (prev?.current ?? nextMax);
    if (prev && prev.max === nextMax) {
      nextCurrent = Math.min(prev.current, nextMax);
    } else if (fillCurrent) {
      nextCurrent = nextMax;
    }
    slots[key] = { current: nextCurrent, max: nextMax };
  });

  return slots;
}

export function getPlayerSpellSlots(player: IPlayer, level: number): PlayerSpellSlots {
  const progression = getCasterProgression(player.classType);
  if (!progression) return {};

  if (player.spellSlots && Object.keys(player.spellSlots).length > 0) {
    return buildSpellSlotsForLevel(level, progression, player.spellSlots, false);
  }
  return buildSpellSlotsForLevel(level, progression, undefined, true);
}

export function restoreSpellSlotsToMax(player: IPlayer, level: number): PlayerSpellSlots {
  const progression = getCasterProgression(player.classType);
  if (!progression) return {};
  return buildSpellSlotsForLevel(level, progression, player.spellSlots, true);
}

export type SpellSlotCastSuccess = {
  ok: true;
  spellSlots: PlayerSpellSlots;
  costPaid: number;
  costResource: 'slot';
  slotLevel: number;
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
};

export type SpellSlotCastFailure = { ok: false; error: string };

export type SpellSlotCastResult = SpellSlotCastSuccess | SpellSlotCastFailure;

export function castSpellWithSlot(player: IPlayer, spellLevel: number, level: number): SpellSlotCastResult {
  const lvl = Math.floor(Number(spellLevel) || 0);
  if (lvl < 1 || lvl > 9) {
    return { ok: false, error: 'Spell level must be 1–9' };
  }

  const progression = getCasterProgression(player.classType);
  if (!progression) {
    return { ok: false, error: `${player.classType || 'Class'} is not a spellcaster` };
  }

  const slots = getPlayerSpellSlots(player, level);
  const key = String(lvl);
  const pool = slots[key];

  if (!pool || pool.max <= 0) {
    return { ok: false, error: `No level-${lvl} spell slots at this character level` };
  }
  if (pool.current <= 0) {
    return { ok: false, error: `No level-${lvl} slots remaining` };
  }

  const nextSlots = {
    ...slots,
    [key]: { ...pool, current: pool.current - 1 },
  };

  return {
    ok: true,
    spellSlots: nextSlots,
    costPaid: 1,
    costResource: 'slot',
    slotLevel: lvl,
    hpCurrent: player.hpCurrent,
    hpTemp: player.hpTemp ?? 0,
    ultCurrent: player.ultCurrent ?? 0,
  };
}

export function adjustSpellSlot(
  player: IPlayer,
  slotLevel: number,
  delta: number,
  characterLevel: number,
): PlayerSpellSlots {
  const progression = getCasterProgression(player.classType);
  if (!progression) return {};

  const slots = getPlayerSpellSlots(player, characterLevel);
  const key = String(slotLevel);
  const pool = slots[key];
  if (!pool) return slots;

  const next = Math.max(0, Math.min(pool.max, pool.current + delta));
  return { ...slots, [key]: { ...pool, current: next } };
}

export function formatSlotLabel(level: number): string {
  const suffix =
    level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
  return `${level}${suffix}`;
}
