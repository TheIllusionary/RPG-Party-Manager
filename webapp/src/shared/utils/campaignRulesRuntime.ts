import { evaluate, RuleEvaluationError } from '../../engine/RuleEvaluator';
import { getLevelInfo, calculateModifier } from '../../features/battle/utils/partyUtils';
import { logicEngine } from '../../services/homebrew/LogicEngine';
import { getEnabledLogicBlocks } from './logicBlockUtils';
import { isManaCastingEnabled } from './castingSystem';
import {
  actorToEnemy,
  actorToPlayer,
  enemyToActor,
  playerToActor,
} from './actorBridge';
import type { IEnemy, IPlayer, ISubclass, StatAbbr } from '../../types';
import type { LogicBlock, LogicComputeTarget, LogicTrigger } from '../../types/domain';

export interface PlayerDerivedResources {
  manaMax: number;
  hpMax: number;
}

export interface ResolvePlayerResourcesOptions {
  subclass?: ISubclass | null;
  getEffectiveStat?: (player: IPlayer, stat: StatAbbr) => number;
}

export interface RuleRuntimeVariables {
  damage?: number;
  amount?: number;
  healed?: number;
  spellLevel?: number;
  [key: string]: unknown;
}

function playerIsVampire(player: IPlayer, subclass?: ISubclass | null): boolean {
  if (subclass?.resourceTrait === 'vampire') return true;
  if (subclass?.resourceTrait === 'standard') return false;
  return player.resourceTrait === 'vampire';
}

export function legacyCalculateMaxMana(player: IPlayer): number {
  const level = getLevelInfo(player.xp ?? 0).level;
  const baseCasterPoints = level * 6 + 2;
  const intScore = player.int ?? 10;
  const wisScore = player.wis ?? 10;
  const chaScore = player.cha ?? 10;
  const intMultiplier = Math.max(0, (intScore - 10) / 10);
  const wisMultiplier = Math.max(0, (wisScore - 10) / 20);
  const chaMultiplier = Math.max(0, (chaScore - 10) / 20);
  const totalBonusMult = 1 + intMultiplier + wisMultiplier + chaMultiplier;
  const calculated = Math.floor(baseCasterPoints * totalBonusMult);
  return Math.max(0, calculated + (player.manaModifier ?? 0));
}

export function legacyCalculateMaxHP(
  player: IPlayer,
  manaMax: number,
  isVampire: boolean,
  getEffectiveStat?: (player: IPlayer, stat: StatAbbr) => number,
): number {
  const level = getLevelInfo(player.xp ?? 0).level;
  const conScore = getEffectiveStat ? getEffectiveStat(player, 'con') : (player.con ?? 10);
  const conMod = calculateModifier(conScore);
  const baseHp = Math.max(1, (player.hpBase || 10) + conMod * level);
  if (isVampire) {
    return baseHp + manaMax;
  }
  return baseHp;
}

export function legacyEnemyMaxHP(enemy: IEnemy): number {
  return Math.max(1, enemy.hpMax ?? enemy.hp ?? 20);
}

export function resolveComputeTarget(block: LogicBlock): LogicComputeTarget | null {
  if (block.computeTarget) return block.computeTarget;
  if (block.id === 'mana_max_formula' || block.id.includes('mana_max')) return 'manaMax';
  if (block.id.includes('hp_max')) return 'hpMax';
  return null;
}

function applyComputeToPools(
  target: LogicComputeTarget,
  value: number,
  manaMax: number,
  hpMax: number,
): { manaMax: number; hpMax: number } {
  const next = Math.max(0, Math.floor(value));
  switch (target) {
    case 'manaMax':
      return { manaMax: next, hpMax };
    case 'hpMax':
      return { manaMax, hpMax: Math.max(1, next) };
    default:
      return { manaMax, hpMax };
  }
}

function runComputeRules(
  actor: import('../../types/domain').Actor,
  enabled: LogicBlock[],
  manaMax: number,
  hpMax: number,
): { manaMax: number; hpMax: number; hasHpComputeRule: boolean } {
  let nextMana = manaMax;
  let nextHp = hpMax;
  let hasHpComputeRule = false;

  for (const block of enabled) {
    if (!block.compute) continue;
    const target = resolveComputeTarget(block);
    if (!target || target === 'manaCurrent' || target === 'hpCurrent') continue;
    if (target === 'hpMax') hasHpComputeRule = true;

    try {
      const value = evaluate(actor, block);
      const applied = applyComputeToPools(target, value, nextMana, nextHp);
      nextMana = applied.manaMax;
      nextHp = applied.hpMax;

      actor.resources.mana = {
        current: actor.resources.mana?.current ?? 0,
        max: nextMana,
        label: 'Mana',
      };
      actor.resources.hp = {
        current: actor.resources.hp?.current ?? nextHp,
        max: nextHp,
      };
    } catch (err) {
      if (
        err instanceof RuleEvaluationError &&
        (err.message.includes('conditions not met') || err.message.includes('disabled'))
      ) {
        continue;
      }
    }
  }

  return { manaMax: nextMana, hpMax: nextHp, hasHpComputeRule };
}

function runManualEffectRules(
  actor: import('../../types/domain').Actor,
  enabled: LogicBlock[],
): import('../../types/domain').Actor {
  try {
    const { actor: mutated } = logicEngine.evaluateBlocks(enabled, { actor }, { trigger: 'manual' });
    return mutated;
  } catch {
    return actor;
  }
}

export function resolvePlayerResources(
  player: IPlayer,
  logicBlocks: LogicBlock[] | undefined,
  options?: ResolvePlayerResourcesOptions,
): PlayerDerivedResources {
  const manaCasting = isManaCastingEnabled(logicBlocks);
  const enabled = getEnabledLogicBlocks(logicBlocks ?? [])
    .filter((block) => block.enabled)
    .filter((block) => {
      if (manaCasting) return true;
      const target = resolveComputeTarget(block);
      return target !== 'manaMax' && block.id !== 'mana_max_formula';
    });
  const isVampire = playerIsVampire(player, options?.subclass);

  let manaMax = manaCasting ? legacyCalculateMaxMana(player) : 0;
  let hpMax = legacyCalculateMaxHP(player, manaMax, isVampire, options?.getEffectiveStat);

  const actor = playerToActor(player, { manaMax, hpMax });
  const computeResult = runComputeRules(actor, enabled, manaMax, hpMax);
  manaMax = computeResult.manaMax;
  hpMax = computeResult.hpMax;

  if (!computeResult.hasHpComputeRule && isVampire) {
    hpMax = legacyCalculateMaxHP(player, manaMax, true, options?.getEffectiveStat);
    actor.resources.hp = { current: player.hpCurrent ?? hpMax, max: hpMax };
  }

  const mutated = runManualEffectRules(actor, enabled);
  if (typeof mutated.resources.mana?.max === 'number') {
    manaMax = Math.max(0, mutated.resources.mana.max);
  }
  if (typeof mutated.resources.hp?.max === 'number') {
    hpMax = Math.max(1, mutated.resources.hp.max);
  }

  return { manaMax, hpMax };
}

export function resolveEnemyResources(
  enemy: IEnemy,
  logicBlocks: LogicBlock[] | undefined,
): { hpMax: number } {
  const enabled = getEnabledLogicBlocks(logicBlocks ?? []).filter((block) => block.enabled);
  let hpMax = legacyEnemyMaxHP(enemy);

  const actor = enemyToActor(enemy, { hpMax });
  const computeResult = runComputeRules(actor, enabled, 0, hpMax);
  hpMax = computeResult.hpMax;

  const mutated = runManualEffectRules(actor, enabled);
  if (typeof mutated.resources.hp?.max === 'number') {
    hpMax = Math.max(1, mutated.resources.hp.max);
  }

  return { hpMax };
}

export function applyPlayerRuleTrigger(
  player: IPlayer,
  logicBlocks: LogicBlock[] | undefined,
  trigger: LogicTrigger,
  options?: ResolvePlayerResourcesOptions & { variables?: RuleRuntimeVariables },
): Partial<IPlayer> {
  const enabled = getEnabledLogicBlocks(logicBlocks ?? []).filter((block) => block.enabled);
  if (enabled.length === 0) return {};

  const { manaMax, hpMax } = resolvePlayerResources(player, logicBlocks, options);
  const actor = playerToActor(player, { manaMax, hpMax });

  try {
    const { actor: mutated } = logicEngine.evaluateBlocks(
      enabled,
      { actor, variables: options?.variables },
      { trigger },
    );
    return actorToPlayer(mutated, player);
  } catch {
    return {};
  }
}

export function applyEnemyRuleTrigger(
  enemy: IEnemy,
  logicBlocks: LogicBlock[] | undefined,
  trigger: LogicTrigger,
  variables?: RuleRuntimeVariables,
): Partial<IEnemy> {
  const enabled = getEnabledLogicBlocks(logicBlocks ?? []).filter((block) => block.enabled);
  if (enabled.length === 0) return {};

  const { hpMax } = resolveEnemyResources(enemy, logicBlocks);
  const actor = enemyToActor(enemy, { hpMax });

  try {
    const { actor: mutated } = logicEngine.evaluateBlocks(
      enabled,
      { actor, variables },
      { trigger },
    );
    return actorToEnemy(mutated, enemy);
  } catch {
    return {};
  }
}

export function mergePlayerWithRules(
  player: IPlayer,
  basePatch: Partial<IPlayer>,
  logicBlocks: LogicBlock[] | undefined,
  trigger: LogicTrigger,
  options?: ResolvePlayerResourcesOptions & { variables?: RuleRuntimeVariables },
): Partial<IPlayer> {
  const merged = { ...player, ...basePatch };
  const rulePatch = applyPlayerRuleTrigger(merged, logicBlocks, trigger, options);
  return { ...basePatch, ...rulePatch };
}

export function mergeEnemyWithRules(
  enemy: IEnemy,
  basePatch: Partial<IEnemy>,
  logicBlocks: LogicBlock[] | undefined,
  trigger: LogicTrigger,
  variables?: RuleRuntimeVariables,
): Partial<IEnemy> {
  const merged = { ...enemy, ...basePatch };
  const rulePatch = applyEnemyRuleTrigger(merged, logicBlocks, trigger, variables);
  return { ...basePatch, ...rulePatch };
}

export function hpChangeTrigger(amount: number): LogicTrigger | null {
  if (amount > 0) return 'on_damage';
  if (amount < 0) return 'on_heal';
  return null;
}

export function hpChangeVariables(amount: number): RuleRuntimeVariables {
  const abs = Math.abs(amount);
  return {
    damage: amount > 0 ? amount : 0,
    healed: amount < 0 ? abs : 0,
    amount: abs,
  };
}
