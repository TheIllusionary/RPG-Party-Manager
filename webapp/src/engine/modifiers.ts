import type { Actor } from '../types/domain';
import type { LogicBlock, RuleScope } from '../types/domain';
import type { DamageModifierDefinition } from '../types/domain/logic-block';
import { filterActiveLogicBlocks } from '../shared/utils/logicBlockUtils';
import type { ActorDamageModifiers, ScopedRulesBundle, ScopedRulesInput } from './types';
import { DEFAULT_RULE_SCOPE } from './types';
import { mergeTypeLists, toTypeList } from './damageTypes';

function readAttrTypes(actor: Actor, key: string): string[] {
  const raw = actor.customAttributes?.[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

function applyTypedModifier(
  target: ActorDamageModifiers,
  def: DamageModifierDefinition,
): void {
  const dt = def.damage_type ? toTypeList(def.damage_type) : [];

  const resist = toTypeList(def.resistance);
  const immune = toTypeList(def.immunity);
  const vuln = toTypeList(def.vulnerability);
  const bypass = toTypeList(def.bypass_resistance);

  if (dt.length > 0) {
    if (resist.length > 0) target.resistances.push(...dt);
    if (immune.length > 0) target.immunities.push(...dt);
    if (vuln.length > 0) target.vulnerabilities.push(...dt);
    if (bypass.length > 0) target.bypassResistances.push(...dt);
    return;
  }

  target.resistances.push(...resist);
  target.immunities.push(...immune);
  target.vulnerabilities.push(...vuln);
  target.bypassResistances.push(...bypass);
}

function finalizeModifiers(raw: ActorDamageModifiers): ActorDamageModifiers {
  return {
    resistances: mergeTypeLists(raw.resistances),
    immunities: mergeTypeLists(raw.immunities),
    vulnerabilities: mergeTypeLists(raw.vulnerabilities),
    bypassResistances: mergeTypeLists(raw.bypassResistances),
  };
}

export function collectActorModifiers(
  actor: Actor,
  actorScopedRules: LogicBlock[],
  conditionScopedRules: LogicBlock[],
): ActorDamageModifiers {
  const mods: ActorDamageModifiers = {
    resistances: mergeTypeLists(
      readAttrTypes(actor, 'resistances'),
      readAttrTypes(actor, 'resistance'),
    ),
    immunities: mergeTypeLists(
      readAttrTypes(actor, 'immunities'),
      readAttrTypes(actor, 'immunity'),
    ),
    vulnerabilities: mergeTypeLists(
      readAttrTypes(actor, 'vulnerabilities'),
      readAttrTypes(actor, 'vulnerability'),
    ),
    bypassResistances: mergeTypeLists(
      readAttrTypes(actor, 'bypass_resistance'),
      readAttrTypes(actor, 'bypassResistances'),
    ),
  };

  for (const block of [...actorScopedRules, ...conditionScopedRules]) {
    if (block.modifiers) {
      applyTypedModifier(mods, block.modifiers);
    }
    const homebrew = block.homebrewRules as DamageModifierDefinition | undefined;
    if (homebrew) {
      applyTypedModifier(mods, homebrew);
    }
  }

  return finalizeModifiers(mods);
}

export function collectAttackerBypass(
  attacker: Actor,
  attackerScopedRules: LogicBlock[],
): string[] {
  const mods = collectActorModifiers(attacker, attackerScopedRules, []);
  return mods.bypassResistances;
}

export function resolveRuleScope(block: LogicBlock): RuleScope {
  return block.scope ?? DEFAULT_RULE_SCOPE;
}

export function partitionBlocksByScope(blocks: LogicBlock[]): {
  global: LogicBlock[];
  encounter: LogicBlock[];
  actor: LogicBlock[];
  condition: LogicBlock[];
} {
  const enabled = filterActiveLogicBlocks(blocks).filter((b) => b.enabled);
  const buckets = {
    global: [] as LogicBlock[],
    encounter: [] as LogicBlock[],
    actor: [] as LogicBlock[],
    condition: [] as LogicBlock[],
  };

  for (const block of enabled) {
    switch (resolveRuleScope(block)) {
      case 'encounter':
        buckets.encounter.push(block);
        break;
      case 'actor':
        buckets.actor.push(block);
        break;
      case 'condition':
        buckets.condition.push(block);
        break;
      default:
        buckets.global.push(block);
        break;
    }
  }

  return buckets;
}

export function buildScopedRulesBundle(input: ScopedRulesInput): ScopedRulesBundle {
  const global = filterActiveLogicBlocks(input.global ?? []).filter((b) => b.enabled);
  const encounter = filterActiveLogicBlocks(input.encounter ?? []).filter((b) => b.enabled);
  const condition = filterActiveLogicBlocks(input.condition ?? []).filter((b) => b.enabled);

  const actor = new Map<string, LogicBlock[]>();
  if (input.actor) {
    for (const [actorId, list] of Object.entries(input.actor)) {
      actor.set(
        actorId,
        filterActiveLogicBlocks(list).filter((b) => b.enabled),
      );
    }
  }

  return { global, encounter, actor, condition };
}

export function getActorScopedRules(
  bundle: ScopedRulesBundle,
  actorId: string,
): LogicBlock[] {
  return bundle.actor.get(actorId) ?? [];
}

export function getConditionRulesForActor(
  actor: Actor,
  bundle: ScopedRulesBundle,
): LogicBlock[] {
  const active = (actor.conditions ?? []).map((c) => c.toLowerCase().trim());
  if (active.length === 0) return [];

  return bundle.condition.filter((block) => {
    const condKeys = [
      block.customAttributes?.conditionName,
      block.customAttributes?.condition,
      block.name,
      block.id,
    ]
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.toLowerCase().trim());

    return condKeys.some((key) => active.includes(key));
  });
}

export function mergeRulesForTrigger(
  bundle: ScopedRulesBundle,
  actor: Actor,
  trigger: string,
): LogicBlock[] {
  const actorRules = getActorScopedRules(bundle, actor.id);
  const conditionRules = getConditionRulesForActor(actor, bundle);

  const all = [
    ...bundle.global,
    ...bundle.encounter,
    ...actorRules,
    ...conditionRules,
  ];

  return all
    .filter((block) => block.trigger === trigger || block.trigger === 'manual')
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

export function hasImmunity(mods: ActorDamageModifiers, damageType: string): boolean {
  const dt = damageType.toLowerCase().trim();
  return mods.immunities.some((i) => i === dt);
}

export function hasResistance(mods: ActorDamageModifiers, damageType: string): boolean {
  const dt = damageType.toLowerCase().trim();
  return mods.resistances.some((r) => r === dt);
}

export function hasBypass(bypassList: string[], damageType: string): boolean {
  const dt = damageType.toLowerCase().trim();
  return bypassList.some((b) => b === dt);
}

export function hasVulnerability(mods: ActorDamageModifiers, damageType: string): boolean {
  const dt = damageType.toLowerCase().trim();
  return mods.vulnerabilities.some((v) => v === dt);
}
