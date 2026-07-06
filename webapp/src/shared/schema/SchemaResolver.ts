/**
 * SchemaResolver — maps DM-friendly labels to technical dot-paths.
 * UI must ONLY show keys from this dictionary; never raw paths.
 */

import { CLASS_RESOLVED_FIELD_PATHS } from './classAbilityMap';

/** Friendly label → technical path (RuleEvaluator / LogicEngine). */
export const FRIENDLY_FIELD_MAP: Record<string, string> = {
  'Força (STR)': 'actor.stats.str',
  'Destreza (DEX)': 'actor.stats.dex',
  'Constituição (CON)': 'actor.stats.con',
  'Inteligência (INT)': 'actor.stats.int',
  'Sabedoria (WIS)': 'actor.stats.wis',
  'Carisma (CHA)': 'actor.stats.cha',
  Nível: 'actor.customAttributes.level',
  'HP atual': 'actor.resources.hp.current',
  'HP máximo': 'actor.resources.hp.max',
  'Mana atual': 'actor.resources.mana.current',
  'Mana máxima': 'actor.resources.mana.max',
  'Tipo de ator': 'actor.kind',
  'Atributo de conjuração (classe)': CLASS_RESOLVED_FIELD_PATHS.spellcastingAbility,
  'Atributo principal (classe)': CLASS_RESOLVED_FIELD_PATHS.primaryAbility,
  'Classe do ator': 'actor.customAttributes.classType',
};

export const FRIENDLY_FIELD_GROUPS: Record<string, string[]> = {
  'Atributos D&D': [
    'Força (STR)',
    'Destreza (DEX)',
    'Constituição (CON)',
    'Inteligência (INT)',
    'Sabedoria (WIS)',
    'Carisma (CHA)',
  ],
  'Classe D&D 5e': [
    'Atributo de conjuração (classe)',
    'Atributo principal (classe)',
    'Classe do ator',
  ],
  'Campos da campanha': ['Nível', 'Tipo de ator'],
  Recursos: ['HP atual', 'HP máximo', 'Mana atual', 'Mana máxima'],
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

export const DEFAULT_FRIENDLY_LABEL = 'Constituição (CON)';

export const TRIGGER_FRIENDLY_MAP: Record<string, string> = {
  manual: 'Passiva / Ação manual',
  on_damage: 'Ao receber dano',
  on_turn_start: 'Início do turno',
  on_turn_end: 'Fim do turno',
  on_heal: 'Ao curar',
  on_spell_cast: 'Ao conjurar magia',
};

export function triggerOptions(): Array<{ value: string; label: string }> {
  return Object.entries(TRIGGER_FRIENDLY_MAP).map(([value, label]) => ({ value, label }));
}

export const MATH_OP_LABELS: Record<string, string> = {
  add: 'Soma (+)',
  subtract: 'Subtração (−)',
  multiply: 'Multiplicação (×)',
  divide: 'Divisão (÷)',
};

export const COMPARE_OP_LABELS: Record<string, string> = {
  eq: 'é igual a',
  neq: 'é diferente de',
  gt: 'é maior que',
  gte: 'é maior ou igual a',
  lt: 'é menor que',
  lte: 'é menor ou igual a',
};

/** Valores para condição `Tipo de ator` → `actor.kind` (não existe `actor.type`). */
export const ACTOR_KIND_OPTIONS = [
  { value: 'player', label: 'Jogador (player)' },
  { value: 'npc', label: 'NPC' },
  { value: 'monster', label: 'Monstro (monster)' },
] as const;

export const ACTOR_KIND_FRIENDLY_LABEL = 'Tipo de ator';

/** Campos cujo valor na condição é numérico. */
const NUMERIC_CONDITION_LABELS = new Set([
  'Força (STR)',
  'Destreza (DEX)',
  'Constituição (CON)',
  'Inteligência (INT)',
  'Sabedoria (WIS)',
  'Carisma (CHA)',
  'Nível',
  'HP atual',
  'HP máximo',
  'Mana atual',
  'Mana máxima',
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
