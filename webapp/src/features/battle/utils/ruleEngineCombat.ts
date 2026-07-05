import {
  createRuleEngine,
  collectActorModifiers,
  getActorScopedRules,
  getConditionRulesForActor,
  partitionBlocksByScope,
  type RuleEngine,
} from '../../../engine';
import {
  actorToEnemy,
  actorToPlayer,
  enemyToActor,
  playerToActor,
} from '../../../shared/utils/actorBridge';
import type { IEnemy, IPlayer } from '../../../types';
import type { Actor } from '../../../types/domain';
import type { LogicBlock } from '../../../types/domain';
import type { ActorDamageModifiers, ScopedRulesBundle } from '../../../engine/types';

export interface RuleEngineCombatConfig {
  players: IPlayer[];
  enemies: IEnemy[];
  logicBlocks?: LogicBlock[];
  calculateMaxHP: (player: IPlayer) => number;
  calculateMaxMana: (player: IPlayer) => number;
  calculateEnemyMaxHP: (enemy: IEnemy) => number;
}

function buildActorRulesMap(
  actorRules: LogicBlock[],
  actorIds: string[],
): Record<string, LogicBlock[]> {
  const map: Record<string, LogicBlock[]> = {};
  for (const id of actorIds) {
    map[id] = [];
  }
  for (const block of actorRules) {
    const targetId = block.customAttributes?.actorId;
    if (typeof targetId === 'string' && map[targetId]) {
      map[targetId].push(block);
    } else {
      for (const id of actorIds) {
        map[id].push(block);
      }
    }
  }
  return map;
}

export function syncRuleEngine(
  engine: RuleEngine,
  config: RuleEngineCombatConfig,
): void {
  const actorIds = [
    ...config.players.map((p) => p.id),
    ...config.enemies.map((e) => e.id),
  ];

  for (const player of config.players) {
    engine.setActor(
      playerToActor(player, {
        hpMax: config.calculateMaxHP(player),
        manaMax: config.calculateMaxMana(player),
      }),
    );
  }

  for (const enemy of config.enemies) {
    engine.setActor(
      enemyToActor(enemy, {
        hpMax: config.calculateEnemyMaxHP(enemy),
      }),
    );
  }

  const partitioned = partitionBlocksByScope(config.logicBlocks ?? []);
  engine.setRules({
    global: partitioned.global,
    encounter: partitioned.encounter,
    condition: partitioned.condition,
    actor: buildActorRulesMap(partitioned.actor, actorIds),
  });
}

export function getEncounterRules(logicBlocks?: LogicBlock[]): LogicBlock[] {
  return partitionBlocksByScope(logicBlocks ?? []).encounter;
}

export function getActorModifiers(
  engine: RuleEngine,
  actorId: string,
): ActorDamageModifiers | null {
  const actor = engine.getActor(actorId);
  if (!actor) return null;
  const rules = engine.getRules();
  const actorRules = getActorScopedRules(rules, actorId);
  const conditionRules = getConditionRulesForActor(actor, rules);
  return collectActorModifiers(actor, actorRules, conditionRules);
}

export function createCombatRuleEngine(): RuleEngine {
  return createRuleEngine();
}

export function patchPlayerFromActor(
  player: IPlayer,
  actor: Actor | undefined,
): IPlayer {
  if (!actor) return player;
  return { ...player, ...actorToPlayer(actor, player) };
}

export function patchEnemyFromActor(
  enemy: IEnemy,
  actor: Actor | undefined,
): IEnemy {
  if (!actor) return enemy;
  return { ...enemy, ...actorToEnemy(actor, enemy) };
}

export function getRulesBundle(engine: RuleEngine): ScopedRulesBundle {
  return engine.getRules();
}
