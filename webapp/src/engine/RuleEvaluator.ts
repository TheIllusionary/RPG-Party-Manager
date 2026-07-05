import type { Actor } from '../types/domain';
import type {
  LogicBlock,
  LogicCompareOp,
  LogicCondition,
  RuleArithmeticOp,
  RuleExpression,
} from '../types/domain';

import { resolveClassAbilityStatValue } from '../shared/schema/classAbilityMap';
import { evaluateFormula } from '../services/homebrew/expressionEvaluator';
import { getPathValue, toNumber } from '../services/homebrew/pathUtils';

/**
 * Operator map — no `eval()`. Extend here when adding new homebrew math.
 * Example: a Blood Magic table might introduce `floor` or `ceil` as new ops later.
 */
export const RULE_OPERATORS: Record<RuleArithmeticOp, (left: number, right: number) => number> = {
  add: (left, right) => left + right,
  subtract: (left, right) => left - right,
  multiply: (left, right) => left * right,
  divide: (left, right) => {
    if (right === 0) {
      throw new Error('RuleEvaluator: division by zero');
    }
    return left / right;
  },
};

export class RuleEvaluationError extends Error {
  constructor(
    public readonly blockId: string,
    reason: string,
  ) {
    super(`Rule "${blockId}": ${reason}`);
    this.name = 'RuleEvaluationError';
  }
}

export interface RuleEvaluationOptions {
  /** Extra variables for formulas (dice results, spell tier, etc.). */
  variables?: Record<string, unknown>;
}

function buildEvaluationContext(
  actor: Actor,
  variables?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    actor,
    variables: variables ?? {},
  };
}

function compareValues(
  left: unknown,
  op: LogicCompareOp,
  right: string | number | boolean | null,
): boolean {
  switch (op) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'gt':
      return (toNumber(left) ?? NaN) > (toNumber(right) ?? NaN);
    case 'gte':
      return (toNumber(left) ?? NaN) >= (toNumber(right) ?? NaN);
    case 'lt':
      return (toNumber(left) ?? NaN) < (toNumber(right) ?? NaN);
    case 'lte':
      return (toNumber(left) ?? NaN) <= (toNumber(right) ?? NaN);
    case 'has':
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === 'string' && (typeof right === 'string' || typeof right === 'number')) {
        return left.includes(String(right));
      }
      return false;
    case 'notHas':
      return !compareValues(left, 'has', right);
    default:
      return false;
  }
}

function assertConditions(
  blockId: string,
  conditions: LogicCondition[] | undefined,
  context: Record<string, unknown>,
): void {
  if (!conditions || conditions.length === 0) return;

  const passed = conditions.every((condition) => {
    const left = getPathValue(context, condition.field);
    return compareValues(left, condition.op, condition.value);
  });

  if (!passed) {
    throw new RuleEvaluationError(blockId, 'conditions not met');
  }
}

function resolveField(path: string, context: Record<string, unknown>): number {
  const actor = context.actor as Actor | undefined;
  if (actor) {
    const classStat = resolveClassAbilityStatValue(actor, path);
    if (classStat !== null) {
      return classStat;
    }
  }

  const value = toNumber(getPathValue(context, path));
  if (value === null) {
    throw new Error(`Field "${path}" is not numeric`);
  }
  return value;
}

function evaluateExpression(
  expression: RuleExpression,
  context: Record<string, unknown>,
): number {
  switch (expression.kind) {
    case 'literal':
      return expression.value;
    case 'field':
      return resolveField(expression.path, context);
    case 'formula':
      return evaluateFormula(expression.expression, context);
    case 'binary': {
      const operator = RULE_OPERATORS[expression.op];
      if (!operator) {
        throw new Error(`Unknown operator "${expression.op}"`);
      }
      const left = evaluateExpression(expression.left, context);
      const right = evaluateExpression(expression.right, context);
      return operator(left, right);
    }
    default: {
      const _exhaustive: never = expression;
      throw new Error(`Unknown expression kind: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Evaluates a single `LogicBlock` and returns a numeric result.
 *
 * ## Adding a new homebrew block (JSON-only, no SRD coupling)
 *
 * 1. Append a `LogicBlock` to `CampaignState.logicBlocks` in your campaign document.
 * 2. Set `enabled: true` and optional `conditions` (e.g. only vampires).
 * 3. Define `compute` as a `RuleExpression` tree — field paths read from `actor.stats`,
 *    `actor.resources`, or `actor.customAttributes` (e.g. `actor.customAttributes.level`).
 * 4. Call `evaluate(actor, block)` to get the derived value (Mana max, Blood Power, etc.).
 * 5. Optionally wire `effects` separately via `LogicEngine` when the block should **mutate**
 *    the actor document instead of only returning a number.
 *
 * @example Mana = (Constitution × 2) + Level
 * ```json
 * {
 *   "id": "mana_max_formula",
 *   "name": "Mana Maximum",
 *   "trigger": "manual",
 *   "enabled": true,
 *   "effects": [],
 *   "compute": {
 *     "kind": "binary",
 *     "op": "add",
 *     "left": {
 *       "kind": "binary",
 *       "op": "multiply",
 *       "left": { "kind": "field", "path": "actor.stats.con" },
 *       "right": { "kind": "literal", "value": 2 }
 *     },
 *     "right": { "kind": "field", "path": "actor.customAttributes.level" }
 *   }
 * }
 * ```
 */
export function evaluate(
  actor: Actor,
  rule: LogicBlock,
  options?: RuleEvaluationOptions,
): number {
  if (rule.deleted) {
    throw new RuleEvaluationError(rule.id, 'block is deleted');
  }

  if (!rule.enabled) {
    throw new RuleEvaluationError(rule.id, 'block is disabled');
  }

  const context = buildEvaluationContext(actor, options?.variables);
  assertConditions(rule.id, rule.conditions, context);

  if (!rule.compute) {
    throw new RuleEvaluationError(
      rule.id,
      'missing compute expression — add a `compute` RuleExpression tree to this LogicBlock',
    );
  }

  return evaluateExpression(rule.compute, context);
}

/** Class wrapper for dependency injection / testing. */
export class RuleEvaluator {
  evaluate(actor: Actor, rule: LogicBlock, options?: RuleEvaluationOptions): number {
    return evaluate(actor, rule, options);
  }
}

export const ruleEvaluator = new RuleEvaluator();
