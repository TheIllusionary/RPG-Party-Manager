/**
 * SchemaResolver — maps DM-friendly labels to technical dot-paths.
 * UI must ONLY show keys from this dictionary; never raw paths.
 */

import { CLASS_RESOLVED_FIELD_PATHS } from './classAbilityMap';

/** Friendly label → technical path (RuleEvaluator / LogicEngine). */
export const FRIENDLY_FIELD_MAP: Record<string, string> = {
  'Strength (STR)': 'actor.stats.str',
  'Dexterity (DEX)': 'actor.stats.dex',
  'Constitution (CON)': 'actor.stats.con',
  'Intelligence (INT)': 'actor.stats.int',
  'Wisdom (WIS)': 'actor.stats.wis',
  'Charisma (CHA)': 'actor.stats.cha',
  Level: 'actor.customAttributes.level',
  'Current HP': 'actor.resources.hp.current',
  'Max HP': 'actor.resources.hp.max',
  'Current Mana': 'actor.resources.mana.current',
  'Max Mana': 'actor.resources.mana.max',
  'Actor Type': 'actor.kind',
  'Spellcasting Ability (class)': CLASS_RESOLVED_FIELD_PATHS.spellcastingAbility,
  'Primary Ability (class)': CLASS_RESOLVED_FIELD_PATHS.primaryAbility,
  'Actor Class': 'actor.customAttributes.classType',
};

export const FRIENDLY_FIELD_GROUPS: Record<string, string[]> = {
  'D&D Attributes': [
    'Strength (STR)',
    'Dexterity (DEX)',
    'Constitution (CON)',
    'Intelligence (INT)',
    'Wisdom (WIS)',
    'Charisma (CHA)',
  ],
  'D&D 5e Class': [
    'Spellcasting Ability (class)',
    'Primary Ability (class)',
    'Actor Class',
  ],
  'Campaign Fields': ['Level', 'Actor Type'],
  Resources: ['Current HP', 'Max HP', 'Current Mana', 'Max Mana'],
};

export function friendlyLabels(): string[] {
  return Object.keys(FRIENDLY_FIELD_MAP);
}

export function pathForFriendlyLabel(label: string): string | undefined {
  return FRIENDLY_FIELD_MAP[label];
}

export function friendlyLabelForPath(path: string): string | undefined {
  const entry = Object.entries(FRIENDLY_FIELD_MAP).find(([, technical]) => technical === path);
  return entry?.[0];
}

export const DEFAULT_FRIENDLY_LABEL = 'Constitution (CON)';

export const TRIGGER_FRIENDLY_MAP: Record<string, string> = {
  manual: 'Passive / Manual Action',
  on_damage: 'On Damage Received',
  on_turn_start: 'Turn Start',
  on_turn_end: 'Turn End',
  on_heal: 'On Heal',
  on_spell_cast: 'On Spell Cast',
};

export function triggerOptions(): Array<{ value: string; label: string }> {
  return Object.entries(TRIGGER_FRIENDLY_MAP).map(([value, label]) => ({ value, label }));
}

export const MATH_OP_LABELS: Record<string, string> = {
  add: 'Addition (+)',
  subtract: 'Subtraction (−)',
  multiply: 'Multiplication (×)',
  divide: 'Division (÷)',
};

export const COMPARE_OP_LABELS: Record<string, string> = {
  eq: 'equals',
  neq: 'is not equal to',
  gt: 'is greater than',
  gte: 'is greater than or equal to',
  lt: 'is less than',
  lte: 'is less than or equal to',
};

/** Valores para condição `Tipo de ator` → `actor.kind` (não existe `actor.type`). */
export const ACTOR_KIND_OPTIONS = [
  { value: 'player', label: 'Player' },
  { value: 'npc', label: 'NPC' },
  { value: 'monster', label: 'Monster' },
 ] as const;
 
 export const ACTOR_KIND_FRIENDLY_LABEL = 'Actor Type';
 
 /** Campos cujo valor na condição é numérico. */
 const NUMERIC_CONDITION_LABELS = new Set([
   'Strength (STR)',
   'Dexterity (DEX)',
   'Constitution (CON)',
   'Intelligence (INT)',
   'Wisdom (WIS)',
   'Charisma (CHA)',
   'Level',
   'Current HP',
   'Max HP',
   'Current Mana',
   'Max Mana',
 ]);
 
 export function isActorKindCondition(friendlyLabel: string): boolean {
   return friendlyLabel === ACTOR_KIND_FRIENDLY_LABEL;
 }
 
 export function isNumericConditionField(friendlyLabel: string): boolean {
   return NUMERIC_CONDITION_LABELS.has(friendlyLabel);
 }
 
 export function defaultConditionValue(friendlyLabel: string): string | number {
   if (isActorKindCondition(friendlyLabel)) return 'player';
   if (isNumericConditionField(friendlyLabel)) return 0;
   return '';
 }
