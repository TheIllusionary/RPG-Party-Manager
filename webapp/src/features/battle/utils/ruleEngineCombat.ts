import { getLevelInfo } from './partyUtils'
import {
  createRuleEngine,
  collectActorModifiers,
  getActorScopedRules,
  getConditionRulesForActor,
  partitionBlocksByScope,
  type RuleEngine,
} from '../../../engine'
import type { IEnemy, IPlayer } from '../../../types'
import type { Actor, ActorKind } from '../../../types/domain'
import type { LogicBlock } from '../../../types/domain'
import type {
  ActorDamageModifiers,
  ScopedRulesBundle,
} from '../../../engine/types'

/**
 * Inline IPlayer → Actor converter (replaces actorBridge.playerToActor).
 */
function playerToActor(
  player: IPlayer,
  opts: { hpMax: number; manaMax: number },
): Actor {
  return {
    id: player.id,
    kind: 'player',
    name: player.name,
    playerName: player.player,
    inParty: player.inParty,
    editing: player.editing,
    stats: {
      str: player.str ?? 10,
      dex: player.dex ?? 10,
      con: player.con ?? 10,
      int: player.int ?? 10,
      wis: player.wis ?? 10,
      cha: player.cha ?? 10,
    },
    resources: {
      hp: { current: player.hpCurrent ?? opts.hpMax, max: opts.hpMax },
      tempHp: player.hpTemp != null ? { current: player.hpTemp } : undefined,
      mana: {
        current: player.manaCurrent ?? 0,
        max: opts.manaMax,
        label: 'Mana',
      },
      limitBreak: {
        current: player.ultCurrent ?? 0,
        max: player.ultMax ?? 0,
        label: 'Limit Break',
      },
    },
    buffs: player.buffs,
    buffStates: player.buffStates,
    spentBuffs: player.spentBuffs,
    subclassId: player.subclassId,
    optionalSubclassId: player.optionalSubclassId,
    conditions: player.cc ?? [],
    visibility: {
      hp: 'visible',
      resources: 'visible',
      notes: 'dm_only',
      playerVisibleAttributeKeys: ['level', 'classType'],
    },
    customAttributes: {
      level: getLevelInfo(player.xp ?? 0).level,
      classType: player.classType,
      resistances: player.resistances ?? [],
      immunities: player.immunities ?? [],
      vulnerabilities: player.vulnerabilities ?? [],
    },
    updatedAt: new Date().toISOString(),
  }
}

function inferEnemyKind(enemy: IEnemy): ActorKind {
  const classType = (enemy.classType || '').toLowerCase()
  if (classType === 'npc' || classType.includes('npc')) return 'npc'
  return 'monster'
}

/**
 * Inline IEnemy → Actor converter (replaces actorBridge.enemyToActor).
 */
function enemyToActor(enemy: IEnemy, opts: { hpMax: number }): Actor {
  const hpCurrent = enemy.hp ?? opts.hpMax
  return {
    id: enemy.id,
    kind: inferEnemyKind(enemy),
    name: enemy.name,
    editing: enemy.editing,
    stats: {
      str: enemy.str ?? 10,
      dex: enemy.dex ?? 10,
      con: enemy.con ?? 10,
      int: enemy.int ?? 10,
      wis: enemy.wis ?? 10,
      cha: enemy.cha ?? 10,
    },
    resources: {
      hp: { current: hpCurrent, max: opts.hpMax },
      tempHp: enemy.hpTemp != null ? { current: enemy.hpTemp } : undefined,
      limitBreak:
        enemy.limitBreakUsed !== undefined
          ? {
              current: enemy.limitBreakUsed ? 1 : 0,
              max: 1,
              label: 'Limit Break',
            }
          : undefined,
    },
    attacks: enemy.attacks?.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      type: a.type,
      toHit: a.toHit,
      dc: a.dc,
      save: a.save,
      reach: a.reach,
      range: a.range,
      damage: a.damage,
      halfOnSuccess: a.halfOnSuccess,
      cc: a.cc,
      ccCustom: a.ccCustom,
    })),
    buffs: enemy.buffs,
    buffStates: enemy.buffStates,
    spentBuffs: enemy.spentBuffs,
    conditions: enemy.cc ?? [],
    visibility: {
      hp: 'visible',
      resources: 'visible',
      notes: 'dm_only',
      playerVisibleAttributeKeys: ['level', 'classType'],
    },
    customAttributes: {
      level: Math.max(1, Math.floor(parseFloat(String(enemy.cr ?? '1')) || 1)),
      classType: enemy.classType,
      cr: enemy.cr,
      resistances: enemy.resistances ?? [],
      immunities: enemy.immunities ?? [],
      vulnerabilities: enemy.vulnerabilities ?? [],
    },
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Inline Actor → Partial<IPlayer> (replaces actorBridge.actorToPlayer).
 */
function actorToPlayerPatch(actor: Actor): Partial<IPlayer> {
  const patch: Partial<IPlayer> = {}

  if (actor.resources.hp?.current !== undefined)
    patch.hpCurrent = actor.resources.hp.current
  if (actor.resources.tempHp?.current !== undefined)
    patch.hpTemp = actor.resources.tempHp.current
  if (actor.resources.mana?.current !== undefined)
    patch.manaCurrent = actor.resources.mana.current
  if (actor.resources.limitBreak?.current !== undefined)
    patch.ultCurrent = actor.resources.limitBreak.current
  if (actor.conditions) patch.cc = actor.conditions
  if (actor.buffs !== undefined) patch.buffs = actor.buffs
  if (actor.buffStates !== undefined) patch.buffStates = actor.buffStates
  if (actor.spentBuffs !== undefined) patch.spentBuffs = actor.spentBuffs

  return patch
}

/**
 * Inline Actor → Partial<IEnemy> (replaces actorBridge.actorToEnemy).
 */
function actorToEnemyPatch(actor: Actor): Partial<IEnemy> {
  const patch: Partial<IEnemy> = {}

  if (actor.resources.hp?.current !== undefined)
    patch.hp = actor.resources.hp.current
  if (actor.resources.hp?.max !== undefined)
    patch.hpMax = Math.max(1, actor.resources.hp.max)
  if (actor.resources.tempHp?.current !== undefined)
    patch.hpTemp = actor.resources.tempHp.current
  if (actor.conditions) patch.cc = actor.conditions
  if (actor.buffs !== undefined) patch.buffs = actor.buffs
  if (actor.buffStates !== undefined) patch.buffStates = actor.buffStates
  if (actor.spentBuffs !== undefined) patch.spentBuffs = actor.spentBuffs

  return patch
}

export interface RuleEngineCombatConfig {
  players: IPlayer[]
  enemies: IEnemy[]
  logicBlocks?: LogicBlock[]
  calculateMaxHP: (player: IPlayer) => number
  calculateMaxMana: (player: IPlayer) => number
  calculateEnemyMaxHP: (enemy: IEnemy) => number
}

function buildActorRulesMap(
  actorRules: LogicBlock[],
  actorIds: string[],
): Record<string, LogicBlock[]> {
  const map: Record<string, LogicBlock[]> = {}
  for (const id of actorIds) {
    map[id] = []
  }
  for (const block of actorRules) {
    const targetId = block.customAttributes?.actorId
    if (typeof targetId === 'string' && map[targetId]) {
      map[targetId].push(block)
    } else {
      for (const id of actorIds) {
        map[id].push(block)
      }
    }
  }
  return map
}

export function syncRuleEngine(
  engine: RuleEngine,
  config: RuleEngineCombatConfig,
): void {
  const actorIds = [
    ...config.players.map(p => p.id),
    ...config.enemies.map(e => e.id),
  ]

  for (const player of config.players) {
    engine.setActor(
      playerToActor(player, {
        hpMax: config.calculateMaxHP(player),
        manaMax: config.calculateMaxMana(player),
      }),
    )
  }

  for (const enemy of config.enemies) {
    engine.setActor(
      enemyToActor(enemy, {
        hpMax: config.calculateEnemyMaxHP(enemy),
      }),
    )
  }

  const partitioned = partitionBlocksByScope(config.logicBlocks ?? [])
  engine.setRules({
    global: partitioned.global,
    encounter: partitioned.encounter,
    condition: partitioned.condition,
    actor: buildActorRulesMap(partitioned.actor, actorIds),
  })
}

export function getEncounterRules(logicBlocks?: LogicBlock[]): LogicBlock[] {
  return partitionBlocksByScope(logicBlocks ?? []).encounter
}

export function getActorModifiers(
  engine: RuleEngine,
  actorId: string,
): ActorDamageModifiers | null {
  const actor = engine.getActor(actorId)
  if (!actor) return null
  const rules = engine.getRules()
  const actorRules = getActorScopedRules(rules, actorId)
  const conditionRules = getConditionRulesForActor(actor, rules)
  return collectActorModifiers(actor, actorRules, conditionRules)
}

export function createCombatRuleEngine(): RuleEngine {
  return createRuleEngine()
}

export function patchPlayerFromActor(
  player: IPlayer,
  actor: Actor | undefined,
): IPlayer {
  if (!actor) return player
  return { ...player, ...actorToPlayerPatch(actor) }
}

export function patchEnemyFromActor(
  enemy: IEnemy,
  actor: Actor | undefined,
): IEnemy {
  if (!actor) return enemy
  return { ...enemy, ...actorToEnemyPatch(actor) }
}

export function getRulesBundle(engine: RuleEngine): ScopedRulesBundle {
  return engine.getRules()
}
