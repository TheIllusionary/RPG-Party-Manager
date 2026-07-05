import type { Actor } from '../../types/domain';

/** D&D 5e ability score keys on `actor.stats`. */
export type AbilityScore = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface ClassAbilityProfile {
  /** Spellcasting ability for full/half/third casters. */
  spellcasting?: AbilityScore;
  /** Primary physical or martial attribute (fatigue, vigor, etc.). */
  primary: AbilityScore;
  /** Optional alternate primary (e.g. STR or DEX Fighter). */
  alternatePrimary?: AbilityScore[];
}

const CLASS_ABILITY_MAP: Record<string, ClassAbilityProfile> = {
  // Spellcasters
  artificer: { spellcasting: 'int', primary: 'int' },
  artifice: { spellcasting: 'int', primary: 'int' },
  bard: { spellcasting: 'cha', primary: 'cha' },
  bardo: { spellcasting: 'cha', primary: 'cha' },
  warlock: { spellcasting: 'cha', primary: 'cha' },
  bruxo: { spellcasting: 'cha', primary: 'cha' },
  cleric: { spellcasting: 'wis', primary: 'wis' },
  clerigo: { spellcasting: 'wis', primary: 'wis' },
  druid: { spellcasting: 'wis', primary: 'wis' },
  druida: { spellcasting: 'wis', primary: 'wis' },
  sorcerer: { spellcasting: 'cha', primary: 'cha' },
  feiticeiro: { spellcasting: 'cha', primary: 'cha' },
  wizard: { spellcasting: 'int', primary: 'int' },
  mago: { spellcasting: 'int', primary: 'int' },
  paladin: { spellcasting: 'cha', primary: 'cha' },
  paladino: { spellcasting: 'cha', primary: 'cha' },
  ranger: { spellcasting: 'wis', primary: 'wis' },
  patrulheiro: { spellcasting: 'wis', primary: 'wis' },
  // Martial
  barbarian: { primary: 'str', alternatePrimary: ['con'] },
  barbaro: { primary: 'str', alternatePrimary: ['con'] },
  fighter: { primary: 'str', alternatePrimary: ['dex'] },
  guerreiro: { primary: 'str', alternatePrimary: ['dex'] },
  rogue: { primary: 'dex' },
  ladino: { primary: 'dex' },
  monk: { primary: 'wis', alternatePrimary: ['dex'] },
  monge: { primary: 'wis', alternatePrimary: ['dex'] },
};

/** Virtual field paths resolved by `RuleEvaluator` from the actor's class. */
export const CLASS_RESOLVED_FIELD_PATHS = {
  spellcastingAbility: 'actor.spellcastingAbility',
  primaryAbility: 'actor.primaryAbility',
} as const;

export function normalizeClassKey(className: string): string {
  return className
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function getClassAbilityProfile(className: string | undefined | null): ClassAbilityProfile | null {
  if (!className?.trim()) return null;
  return CLASS_ABILITY_MAP[normalizeClassKey(className)] ?? null;
}

/** Reads class from `customAttributes` (supports `classType`, `class`, `className`). */
export function getActorClassName(actor: Actor): string | undefined {
  const attrs = actor.customAttributes;
  if (!attrs) return undefined;
  const raw = attrs.classType ?? attrs.class ?? attrs.className;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function getSpellcastingAbilityScore(actor: Actor): AbilityScore | null {
  const profile = getClassAbilityProfile(getActorClassName(actor));
  return profile?.spellcasting ?? null;
}

export function getPrimaryAbilityScore(actor: Actor): AbilityScore {
  const profile = getClassAbilityProfile(getActorClassName(actor));
  return profile?.primary ?? 'str';
}

export function resolveClassAbilityStatValue(actor: Actor, path: string): number | null {
  if (path === CLASS_RESOLVED_FIELD_PATHS.spellcastingAbility) {
    const score = getSpellcastingAbilityScore(actor);
    if (!score) return null;
    const value = actor.stats[score];
    return typeof value === 'number' ? value : null;
  }
  if (path === CLASS_RESOLVED_FIELD_PATHS.primaryAbility) {
    const score = getPrimaryAbilityScore(actor);
    const value = actor.stats[score];
    return typeof value === 'number' ? value : null;
  }
  return null;
}

export type CasterProgression = 'full' | 'half';

const HALF_CASTER_KEYS = new Set([
  'paladin',
  'paladino',
  'ranger',
  'patrulheiro',
  'artificer',
  'artifice',
]);

export function getCasterProgression(className: string | undefined | null): CasterProgression | null {
  const profile = getClassAbilityProfile(className);
  if (!profile?.spellcasting) return null;
  const key = normalizeClassKey(className ?? '');
  return HALF_CASTER_KEYS.has(key) ? 'half' : 'full';
}

export function playerHasSpellcasting(className: string | undefined | null): boolean {
  return getCasterProgression(className) !== null;
}

export function listKnownClassLabels(): string[] {
  const labels = new Set<string>();
  for (const key of Object.keys(CLASS_ABILITY_MAP)) {
    labels.add(key.charAt(0).toUpperCase() + key.slice(1));
  }
  return [...labels].sort();
}
