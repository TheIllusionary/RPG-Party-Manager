import {
  DEFAULT_FRIENDLY_LABEL,
  ACTOR_KIND_FRIENDLY_LABEL,
  ACTOR_KIND_OPTIONS,
  defaultConditionValue,
  friendlyLabelForPath,
  isActorKindCondition,
  pathForFriendlyLabel,
} from '../../shared/schema/SchemaResolver';
import type {
  LogicBlock,
  LogicCompareOp,
  LogicCondition,
  LogicTrigger,
  RuleArithmeticOp,
  RuleExpression,
} from '../../types/domain';

export const VERTICAL_RULE_META_KEY = '_verticalRuleDraft';

export type OperandKind = 'variable' | 'literal';

export interface FormulaOperand {
  kind: OperandKind;
  /** Key from FRIENDLY_FIELD_MAP when kind === variable */
  friendlyLabel?: string;
  value?: number;
}

export interface FormulaSeedStep {
  id: string;
  kind: 'seed';
  operand: FormulaOperand;
}

export interface FormulaCombineStep {
  id: string;
  kind: 'combine';
  op: RuleArithmeticOp;
  operand: FormulaOperand;
}

export type FormulaStep = FormulaSeedStep | FormulaCombineStep;

export interface ConditionStep {
  id: string;
  friendlyLabel: string;
  op: LogicCompareOp;
  value: string | number | boolean;
}

export interface VerticalRuleDraft {
  trigger: LogicTrigger;
  steps: FormulaStep[];
  conditions: ConditionStep[];
}

export function newStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultVerticalDraft(): VerticalRuleDraft {
  return {
    trigger: 'manual',
    steps: [
      {
        id: newStepId(),
        kind: 'seed',
        operand: { kind: 'variable', friendlyLabel: DEFAULT_FRIENDLY_LABEL },
      },
    ],
    conditions: [],
  };
}

function operandToExpression(operand: FormulaOperand): RuleExpression {
  if (operand.kind === 'literal') {
    return { kind: 'literal', value: operand.value ?? 0 };
  }
  const path = pathForFriendlyLabel(operand.friendlyLabel ?? DEFAULT_FRIENDLY_LABEL);
  return { kind: 'field', path: path ?? 'actor.stats.con' };
}

export function stepsToExpression(steps: FormulaStep[]): RuleExpression | undefined {
  if (steps.length === 0) return undefined;
  const seed = steps[0];
  if (seed.kind !== 'seed') return undefined;

  let acc: RuleExpression = operandToExpression(seed.operand);
  for (let i = 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.kind !== 'combine') continue;
    acc = {
      kind: 'binary',
      op: step.op,
      left: acc,
      right: operandToExpression(step.operand),
    };
  }
  return acc;
}

function expressionToOperand(expr: RuleExpression): FormulaOperand {
  if (expr.kind === 'literal') {
    return { kind: 'literal', value: expr.value };
  }
  if (expr.kind === 'field') {
    return {
      kind: 'variable',
      friendlyLabel: friendlyLabelForPath(expr.path) ?? DEFAULT_FRIENDLY_LABEL,
    };
  }
  return { kind: 'literal', value: 0 };
}

export function expressionToSteps(expr: RuleExpression | undefined): FormulaStep[] {
  if (!expr) return defaultVerticalDraft().steps;

  if (expr.kind === 'field' || expr.kind === 'literal') {
    return [{ id: newStepId(), kind: 'seed', operand: expressionToOperand(expr) }];
  }

  if (expr.kind === 'binary') {
    const leftSteps = expressionToSteps(expr.left);
    return [
      ...leftSteps,
      {
        id: newStepId(),
        kind: 'combine',
        op: expr.op,
        operand: expressionToOperand(expr.right),
      },
    ];
  }

  return defaultVerticalDraft().steps;
}

function normalizeConditionValue(
  friendlyLabel: string,
  value: string | number | boolean,
): string | number | boolean {
  if (isActorKindCondition(friendlyLabel)) {
    const str = String(value).trim().toLowerCase();
    const valid = ACTOR_KIND_OPTIONS.some((opt) => opt.value === str);
    return valid ? str : 'player';
  }
  if (typeof value === 'boolean') return value;
  return value;
}

function normalizeConditionStep(step: ConditionStep): ConditionStep {
  return {
    ...step,
    friendlyLabel: step.friendlyLabel || ACTOR_KIND_FRIENDLY_LABEL,
    value: normalizeConditionValue(step.friendlyLabel, step.value),
  };
}

export function conditionsToSteps(conditions: LogicCondition[]): ConditionStep[] {
  return conditions.map((condition) =>
    normalizeConditionStep({
      id: newStepId(),
      friendlyLabel: friendlyLabelForPath(condition.field) ?? ACTOR_KIND_FRIENDLY_LABEL,
      op: condition.op,
      value: condition.value as string | number | boolean,
    }),
  );
}

export function stepsToConditions(steps: ConditionStep[]): LogicCondition[] {
  return steps
    .map((step) => {
      const path = pathForFriendlyLabel(step.friendlyLabel);
      if (!path) return null;
      return { field: path, op: step.op, value: step.value };
    })
    .filter((item): item is LogicCondition => item !== null);
}

export function blockToDraft(block: LogicBlock): VerticalRuleDraft {
  const stored = block.customAttributes?.[VERTICAL_RULE_META_KEY];
  if (stored && typeof stored === 'object') {
    const draft = stored as VerticalRuleDraft;
    return {
      ...draft,
      conditions: (draft.conditions ?? []).map((c) => normalizeConditionStep(c)),
    };
  }
  return {
    trigger: block.trigger,
    steps: expressionToSteps(block.compute),
    conditions: conditionsToSteps(block.conditions ?? []),
  };
}

export function mergeDraftIntoBlock(block: LogicBlock, draft: VerticalRuleDraft): LogicBlock {
  const compute = stepsToExpression(draft.steps);
  return {
    ...block,
    trigger: draft.trigger,
    compute,
    conditions: stepsToConditions(draft.conditions),
    updatedAt: new Date().toISOString(),
    customAttributes: {
      ...(block.customAttributes ?? {}),
      [VERTICAL_RULE_META_KEY]: draft,
    },
  };
}
