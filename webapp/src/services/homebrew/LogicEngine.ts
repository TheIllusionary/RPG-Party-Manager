import type { Actor } from '../../types/domain';
import type {
  LogicBlock,
  LogicCompareOp,
  LogicCondition,
  LogicEffect,
  LogicEffectOp,
  LogicTrigger,
  LogicValueRef,
} from '../../types/domain';

import { evaluateFormula } from './expressionEvaluator';
import { getPathValue, setPathValue, toNumber } from './pathUtils';
import { isLogicBlockActive } from '../../shared/utils/logicBlockUtils';

export interface LogicEvaluationContext {
  actor: Actor;
  /** Additional variables for formulas (e.g. spell cost, dice results). */
  variables?: Record<string, unknown>;
}

export interface LogicBlockResult {
  blockId: string;
  blockName: string;
  applied: boolean;
  skippedReason?: string;
  mutations: string[];
}

export interface LogicEngineResult {
  actor: Actor;
  results: LogicBlockResult[];
}

function buildContext(ctx: LogicEvaluationContext): Record<string, unknown> {
  return {
    actor: ctx.actor,
    variables: ctx.variables ?? {},
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

function evaluateConditions(
  conditions: LogicCondition[] | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((condition) => {
    const left = getPathValue(context, condition.field);
    return compareValues(left, condition.op, condition.value);
  });
}

function resolveValueRef(ref: LogicValueRef, context: Record<string, unknown>): number {
  switch (ref.kind) {
    case 'literal':
      return ref.value;
    case 'field': {
      const value = toNumber(getPathValue(context, ref.field));
      if (value === null) {
        throw new Error(`Field "${ref.field}" is not numeric`);
      }
      return value;
    }
    case 'formula':
      return evaluateFormula(ref.expression, context);
    default: {
      const _exhaustive: never = ref;
      throw new Error(`Unknown value ref: ${String(_exhaustive)}`);
    }
  }
}

function applyEffectOp(current: number, op: LogicEffectOp, operand: number): number {
  switch (op) {
    case 'add':
      return current + operand;
    case 'subtract':
      return current - operand;
    case 'set':
      return operand;
    case 'min':
      return Math.min(current, operand);
    case 'max':
      return Math.max(current, operand);
    case 'multiply':
      return current * operand;
    default: {
      const _exhaustive: never = op;
      throw new Error(`Unknown effect op: ${String(_exhaustive)}`);
    }
  }
}

function applyEffect(
  effect: LogicEffect,
  context: Record<string, unknown>,
  actorRoot: Record<string, unknown>,
): string {
  const operand = resolveValueRef(effect.value, context);
  const currentRaw = getPathValue(context, effect.target);
  const current = toNumber(currentRaw) ?? 0;
  const next = applyEffectOp(current, effect.op, operand);
  setPathValue(actorRoot, effect.target.replace(/^actor\./, ''), next);
  return `${effect.target} ${effect.op} ${operand} → ${next}`;
}

/**
 * Evaluates an ordered list of homebrew logic blocks against an actor.
 * Blocks mutate a cloned actor document; original is not modified unless caller persists.
 */
export class LogicEngine {
  evaluateBlocks(
    blocks: LogicBlock[],
    ctx: LogicEvaluationContext,
    options?: { trigger?: LogicTrigger },
  ): LogicEngineResult {
    const actorClone = structuredClone(ctx.actor) as Actor;
    const actorRoot = actorClone as unknown as Record<string, unknown>;
    const context = buildContext({ ...ctx, actor: actorClone });
    const results: LogicBlockResult[] = [];

    const sorted = [...blocks]
      .filter(isLogicBlockActive)
      .filter((b) => b.enabled)
      .filter((b) => !options?.trigger || b.trigger === options.trigger || b.trigger === 'manual')
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const block of sorted) {
      const mutations: string[] = [];
      if (!evaluateConditions(block.conditions, context)) {
        results.push({
          blockId: block.id,
          blockName: block.name,
          applied: false,
          skippedReason: 'conditions_not_met',
          mutations,
        });
        continue;
      }

      try {
        for (const effect of block.effects) {
          mutations.push(applyEffect(effect, context, actorRoot));
        }
        context.actor = actorClone;
        results.push({
          blockId: block.id,
          blockName: block.name,
          applied: true,
          mutations,
        });
      } catch (err: unknown) {
        results.push({
          blockId: block.id,
          blockName: block.name,
          applied: false,
          skippedReason: err instanceof Error ? err.message : 'effect_failed',
          mutations,
        });
      }
    }

    return { actor: actorClone, results };
  }

  /** Convenience: run a single block by id from a campaign's logic block array. */
  runBlock(
    blocks: LogicBlock[],
    blockId: string,
    ctx: LogicEvaluationContext,
  ): LogicEngineResult {
    const block = blocks.find((b) => b.id === blockId && isLogicBlockActive(b));
    if (!block) {
      throw new Error(`LogicBlock not found: ${blockId}`);
    }
    return this.evaluateBlocks([block], ctx, { trigger: block.trigger });
  }
}

export const logicEngine = new LogicEngine();
