/** @deprecated Import from `campaignRulesRuntime` instead. */
export {
  legacyCalculateMaxMana,
  legacyCalculateMaxHP,
  resolveComputeTarget,
  resolvePlayerResources,
  resolveEnemyResources,
  applyPlayerRuleTrigger,
  applyEnemyRuleTrigger,
  mergePlayerWithRules,
  mergeEnemyWithRules,
  hpChangeTrigger,
  hpChangeVariables,
} from './campaignRulesRuntime';

export type {
  PlayerDerivedResources,
  ResolvePlayerResourcesOptions,
  RuleRuntimeVariables,
} from './campaignRulesRuntime';
