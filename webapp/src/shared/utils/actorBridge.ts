import { getLevelInfo } from '../../features/battle/utils/partyUtils';
import type { IEnemy, IPlayer } from '../../types';
import type { Actor, ActorKind } from '../../types/domain';

export interface EntityToActorOptions {
  hpMax?: number;
  manaMax?: number;
}

export function inferEnemyKind(enemy: IEnemy): ActorKind {
  const classType = (enemy.classType || '').toLowerCase();
  const background = (enemy.background || '').toLowerCase();
  if (classType.includes('npc') || background.includes('npc') || classType === 'npc') {
    return 'npc';
  }
  return 'monster';
}

function parseEnemyLevel(enemy: IEnemy): number {
  const cr = parseFloat(String(enemy.cr ?? '1'));
  if (Number.isFinite(cr) && cr > 0) {
    return Math.max(1, Math.floor(cr));
  }
  return 1;
}

/** Maps campaign `IPlayer` documents to domain `Actor` for RuleEvaluator / LogicEngine. */
export function playerToActor(player: IPlayer, options?: EntityToActorOptions): Actor {
  const level = getLevelInfo(player.xp ?? 0).level;
  const hpMax = options?.hpMax ?? Math.max(1, player.hpBase ?? 10);
  const manaMax = options?.manaMax ?? 0;

  return {
    id: player.id,
    kind: 'player',
    name: player.name,
    inParty: player.inParty,
    stats: {
      str: player.str ?? 10,
      dex: player.dex ?? 10,
      con: player.con ?? 10,
      int: player.int ?? 10,
      wis: player.wis ?? 10,
      cha: player.cha ?? 10,
    },
    resources: {
      hp: { current: player.hpCurrent ?? hpMax, max: hpMax },
      mana: { current: player.manaCurrent ?? 0, max: manaMax, label: 'Mana' },
    },
    conditions: player.cc ?? [],
    visibility: {
      hp: 'visible',
      resources: 'visible',
      notes: 'dm_only',
      playerVisibleAttributeKeys: ['level', 'classType'],
    },
    customAttributes: {
      level,
      classType: player.classType,
      resistances: player.resistances ?? [],
      immunities: player.immunities ?? [],
      vulnerabilities: player.vulnerabilities ?? [],
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Maps encounter `IEnemy` (monster or NPC) to domain `Actor`. */
export function enemyToActor(enemy: IEnemy, options?: EntityToActorOptions): Actor {
  const hpMax = options?.hpMax ?? enemy.hpMax ?? enemy.hp ?? 20;
  const hpCurrent = enemy.hp ?? hpMax;

  return {
    id: enemy.id,
    kind: inferEnemyKind(enemy),
    name: enemy.name,
    stats: {
      str: enemy.str ?? 10,
      dex: enemy.dex ?? 10,
      con: enemy.con ?? 10,
      int: enemy.int ?? 10,
      wis: enemy.wis ?? 10,
      cha: enemy.cha ?? 10,
    },
    resources: {
      hp: { current: hpCurrent, max: hpMax },
    },
    conditions: enemy.cc ?? [],
    visibility: {
      hp: 'visible',
      resources: 'visible',
      notes: 'dm_only',
      playerVisibleAttributeKeys: ['level', 'classType'],
    },
    customAttributes: {
      level: parseEnemyLevel(enemy),
      classType: enemy.classType,
      cr: enemy.cr,
      resistances: enemy.resistances ?? [],
      immunities: enemy.immunities ?? [],
      vulnerabilities: enemy.vulnerabilities ?? [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function actorToPlayer(actor: Actor, _base: IPlayer): Partial<IPlayer> {
  const patch: Partial<IPlayer> = {};

  if (actor.resources.hp?.current !== undefined) {
    patch.hpCurrent = actor.resources.hp.current;
  }
  if (actor.resources.mana?.current !== undefined) {
    patch.manaCurrent = actor.resources.mana.current;
  }
  // Never map derived max HP into hpBase — hpBase is class hit-die foundation only.
  if (actor.conditions) {
    patch.cc = actor.conditions;
  }

  return patch;
}

export function actorToEnemy(actor: Actor, _base: IEnemy): Partial<IEnemy> {
  const patch: Partial<IEnemy> = {};

  if (actor.resources.hp?.current !== undefined) {
    patch.hp = actor.resources.hp.current;
  }
  if (actor.resources.hp?.max !== undefined) {
    patch.hpMax = Math.max(1, actor.resources.hp.max);
  }
  if (actor.conditions) {
    patch.cc = actor.conditions;
  }

  return patch;
}
