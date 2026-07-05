export { evaluate, RuleEvaluator, ruleEvaluator, RULE_OPERATORS, RuleEvaluationError } from './RuleEvaluator';
export type { RuleEvaluationOptions } from './RuleEvaluator';

export { RuleEngine, createRuleEngine, gameRuleEngine } from './RuleEngine';
export { runDamagePipeline } from './damagePipeline';
export type { RunDamagePipelineParams } from './damagePipeline';
export {
  buildScopedRulesBundle,
  collectActorModifiers,
  collectAttackerBypass,
  getActorScopedRules,
  getConditionRulesForActor,
  mergeRulesForTrigger,
  partitionBlocksByScope,
  resolveRuleScope,
  hasImmunity,
  hasResistance,
  hasBypass,
} from './modifiers';
export { normalizeDamageType, damageTypesMatch } from './damageTypes';

export type {
  EngineEventType,
  EngineEventPayload,
  DamagePayload,
  ActorDamageModifiers,
  DamagePipelineStep,
  DamagePipelineStepId,
  DamagePipelineState,
  DamageProcessResult,
  ScopedRulesInput,
  ScopedRulesBundle,
  RuleEngineState,
  TurnAdvanceResult,
  EventProcessResult,
  AppliedBlockSummary,
  EventMiddleware,
  EventMiddlewareContext,
  DEFAULT_RULE_SCOPE,
} from './types';

export type { RuleScope, DamageModifierDefinition } from '../types/domain/logic-block';
