import type { CustomAttributes, DocumentId, HomebrewRules, IsoTimestamp } from './common';

export type LogicTrigger =
  | 'manual'
  | 'on_turn_start'
  | 'on_turn_end'
  | 'on_damage'
  | 'on_heal'
  | 'on_spell_cast'
  | string;

export type LogicCompareOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'has' | 'notHas';

export type LogicEffectOp = 'add' | 'subtract' | 'set' | 'min' | 'max' | 'multiply';

/** Arithmetic operators for pure numeric `compute` trees (RuleEvaluator). */
export type RuleArithmeticOp = 'add' | 'subtract' | 'multiply' | 'divide';

/** Derived player resource a `compute` block writes to when evaluated in campaign. */
export type LogicComputeTarget = 'manaMax' | 'hpMax' | 'manaCurrent' | 'hpCurrent';

/** Where a logic block is evaluated in the rules pipeline. */
export type RuleScope = 'global' | 'encounter' | 'actor' | 'condition';

/**
 * Typed damage / protection modifiers attached to actor or condition rules.
 * Recognized by `RuleEngine.processDamage` and the damage pipeline.
 */
export interface DamageModifierDefinition {
  damage_type?: string;
  resistance?: string | string[];
  immunity?: string | string[];
  vulnerability?: string | string[];
  bypass_resistance?: string | string[];
}

/**
 * Serializable expression tree — homebrew-agnostic.
 * Example (Mana = Constitution * 2 + Level):
 * ```json
 * {
 *   "kind": "binary", "op": "add",
 *   "left": { "kind": "binary", "op": "multiply",
 *     "left": { "kind": "field", "path": "actor.stats.con" },
 *     "right": { "kind": "literal", "value": 2 }
 *   },
 *   "right": { "kind": "field", "path": "actor.customAttributes.level" }
 * }
 * ```
 */
export type RuleExpression =
  | { kind: 'literal'; value: number }
  | { kind: 'field'; path: string }
  | { kind: 'formula'; expression: string }
  | {
      kind: 'binary';
      op: RuleArithmeticOp;
      left: RuleExpression;
      right: RuleExpression;
    };

export interface LogicCondition {
  /** Dot-path into evaluation context, e.g. `actor.resources.mana.current`. */
  field: string;
  op: LogicCompareOp;
  value: string | number | boolean | null;
}

export type LogicValueRef =
  | { kind: 'literal'; value: number }
  | { kind: 'field'; field: string }
  | { kind: 'formula'; expression: string };

export interface LogicEffect {
  /** Dot-path target, e.g. `actor.resources.mana.current`. */
  target: string;
  op: LogicEffectOp;
  value: LogicValueRef;
}

/**
 * Serializable homebrew rule block stored inside campaign documents.
 * Evaluated at runtime by `LogicEngine`.
 */
export interface LogicBlock {
  id: DocumentId;
  name: string;
  description?: string;
  trigger: LogicTrigger;
  enabled: boolean;
  /** Execution scope — defaults to `global` when omitted (campaign-wide). */
  scope?: RuleScope;
  /** Damage resistances, immunities, bypass flags for pipeline resolution. */
  modifiers?: DamageModifierDefinition;
  /** Tombstone flag — block stays in JSON for sync but is hidden from UI and evaluators. */
  deleted?: boolean;
  /** Per-block version for offline-first merge (soft deletes, edits). */
  updatedAt?: IsoTimestamp;
  priority?: number;
  conditions?: LogicCondition[];
  effects: LogicEffect[];
  /**
   * Pure numeric computation evaluated by `RuleEvaluator.evaluate()`.
   * Use for derived pools (Mana max, Blood Power, etc.) without mutating the actor.
   */
  compute?: RuleExpression;
  /** When set, `compute` result is applied to this derived player resource. */
  computeTarget?: LogicComputeTarget;
  homebrewRules?: HomebrewRules;
  customAttributes?: CustomAttributes;
}
