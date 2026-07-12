import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { RuleEngine } from '../../../engine';
import type { ActorDamageModifiers } from '../../../engine/types';
import {
  createCombatRuleEngine,
  getActorModifiers,
  getEncounterRules,
  patchEnemyFromActor,
  patchPlayerFromActor,
  syncRuleEngine,
  type RuleEngineCombatConfig,
} from '../utils/ruleEngineCombat';
import type { IEnemy, IPlayer } from '../../../types';
import type { LogicBlock } from '../../../types/domain';

export interface TurnActorRef {
  type: 'player' | 'enemy';
  id: string;
  name: string;
}

export interface UseRuleEngineCombatParams {
  players: IPlayer[];
  enemies: IEnemy[];
  logicBlocks?: LogicBlock[];
  calculateMaxHP: (player: IPlayer) => number;
  calculateMaxMana: (player: IPlayer) => number;
  calculateEnemyMaxHP: (enemy: IEnemy) => number;
  updatePlayers: (players: IPlayer[]) => void;
  setEnemies: Dispatch<SetStateAction<IEnemy[]>>;
  showActionToast: (msg: string) => void;
  initiativeMode?: 'none' | 'group' | 'individual';
  customTurnOrder?: string[];
}

export interface UseRuleEngineCombatResult {
  encounterRules: LogicBlock[];
  turnOrder: TurnActorRef[];
  currentTurnIndex: number;
  currentTurnActor: TurnActorRef | null;
  applyQuickDamage: (
    entityType: 'player' | 'enemy',
    entityId: string,
    amount: number,
    damageType: string,
  ) => void;
  applyQuickHeal: (entityType: 'player' | 'enemy', entityId: string, amount: number) => void;
  getModifiersFor: (entityId: string) => ActorDamageModifiers | null;
  advanceEncounterTurn: (overridePlayers?: IPlayer[], overrideEnemies?: IEnemy[]) => void;
}

export function useRuleEngineCombat({
  players,
  enemies,
  logicBlocks,
  calculateMaxHP,
  calculateMaxMana,
  calculateEnemyMaxHP,
  updatePlayers,
  setEnemies,
  showActionToast,
  initiativeMode = 'none',
  customTurnOrder = [],
}: UseRuleEngineCombatParams): UseRuleEngineCombatResult {
  const engineRef = useRef<RuleEngine>(createCombatRuleEngine());
  const [turnIndex, setTurnIndex] = useState(0);

  const config = useMemo<RuleEngineCombatConfig>(
    () => ({
      players,
      enemies,
      logicBlocks,
      calculateMaxHP,
      calculateMaxMana,
      calculateEnemyMaxHP,
    }),
    [players, enemies, logicBlocks, calculateMaxHP, calculateMaxMana, calculateEnemyMaxHP],
  );

  useEffect(() => {
    syncRuleEngine(engineRef.current, config);
  }, [config]);

  const encounterRules = useMemo(() => getEncounterRules(logicBlocks), [logicBlocks]);

  const turnOrder = useMemo<TurnActorRef[]>(() => {
    const partyActors = players
      .filter((p) => p.inParty)
      .map((p) => ({ type: 'player' as const, id: p.id, name: p.name }));
    const enemyActors = enemies.map((e) => ({
      type: 'enemy' as const,
      id: e.id,
      name: e.name,
    }));
    
    if (initiativeMode === 'none') {
        return [...partyActors, ...enemyActors];
    }
    
    // For group or individual, we map customTurnOrder IDs back to actors
    if (customTurnOrder.length > 0) {
        const order: TurnActorRef[] = [];
        for (const id of customTurnOrder) {
            if (id === 'group-party') {
                order.push({ type: 'player', id: 'group-party', name: 'Party' });
            } else if (id === 'group-enemies') {
                order.push({ type: 'enemy', id: 'group-enemies', name: 'Enemies' });
            } else {
                const p = partyActors.find(x => x.id === id);
                if (p) order.push(p);
                else {
                    const e = enemyActors.find(x => x.id === id);
                    if (e) order.push(e);
                }
            }
        }
        return order;
    }
    
    // Default fallback if order not set yet but mode is active
    if (initiativeMode === 'group') {
        return [
            { type: 'player', id: 'group-party', name: 'Party' },
            { type: 'enemy', id: 'group-enemies', name: 'Enemies' }
        ];
    }
    
    return [...partyActors, ...enemyActors];
  }, [players, enemies, initiativeMode, customTurnOrder]);

  const currentTurnActor = turnOrder.length > 0 ? turnOrder[turnIndex % turnOrder.length] : null;

  const syncRosterFromEngine = useCallback(() => {
    const engine = engineRef.current;
    updatePlayers(players.map((p) => patchPlayerFromActor(p, engine.getActor(p.id))));
    setEnemies((prev) =>
      prev.map((e) => patchEnemyFromActor(e, engine.getActor(e.id))),
    );
  }, [players, updatePlayers, setEnemies]);

  const applyQuickDamage = useCallback(
    (entityType: 'player' | 'enemy', entityId: string, amount: number, damageType: string) => {
      const parsed = Math.max(0, Math.floor(Number(amount)) || 0);
      if (parsed <= 0) return;

      syncRuleEngine(engineRef.current, config);
      const engine = engineRef.current;
      const actor = engine.getActor(entityId);
      if (!actor) return;

      const result = engine.processDamage(actor, actor, parsed, damageType);
      syncRosterFromEngine();

      const steps = result.pipeline.steps
        .filter((s) => s.amountBefore !== s.amountAfter || s.halted)
        .map((s) => s.detail ?? s.label)
        .join(' · ');

      showActionToast(
        `💥 ${actor.name}: ${parsed} ${damageType} → ${result.finalDamage} dmg${steps ? ` (${steps})` : ''}`,
      );
      void entityType;
    },
    [config, syncRosterFromEngine, showActionToast],
  );

  const applyQuickHeal = useCallback(
    (entityType: 'player' | 'enemy', entityId: string, amount: number) => {
      const parsed = Math.max(0, Math.floor(Number(amount)) || 0);
      if (parsed <= 0) return;

      syncRuleEngine(engineRef.current, config);
      const engine = engineRef.current;
      const actor = engine.getActor(entityId);
      if (!actor) return;

      const hp = actor.resources.hp ?? { current: 0, max: 0 };
      const max = hp.max ?? hp.current ?? 0;
      const next = Math.min(max, (hp.current ?? 0) + parsed);
      const healedActor: typeof actor = {
        ...actor,
        resources: {
          ...actor.resources,
          hp: { ...hp, current: next, max },
        },
        updatedAt: new Date().toISOString(),
      };
      engine.setActor(healedActor);
      engine.processEvent(
        'on_heal',
        { actorId: entityId, variables: { healed: parsed, amount: parsed } },
        undefined,
        healedActor,
      );
      syncRosterFromEngine();
      showActionToast(`💚 ${actor.name}: +${parsed} HP (${hp.current ?? 0} → ${next})`);
      void entityType;
    },
    [config, syncRosterFromEngine, showActionToast],
  );

  const getModifiersFor = useCallback(
    (entityId: string) => {
      syncRuleEngine(engineRef.current, config);
      return getActorModifiers(engineRef.current, entityId);
    },
    [config],
  );

  const advanceEncounterTurn = useCallback((overridePlayers?: IPlayer[], overrideEnemies?: IEnemy[]) => {
    if (turnOrder.length === 0) {
      showActionToast('⚠️ No actors in turn order');
      return;
    }

    const current = turnOrder[turnIndex % turnOrder.length];
    const activePlayers = overridePlayers || players;
    const activeEnemies = overrideEnemies || enemies;

    const localConfig = {
      ...config,
      players: activePlayers,
      enemies: activeEnemies,
    };

    syncRuleEngine(engineRef.current, localConfig);
    const engine = engineRef.current;

    let beforeHp: number | undefined;
    if (current.id !== 'group-party' && current.id !== 'group-enemies') {
      beforeHp = engine.getActor(current.id)?.resources.hp?.current;
    }

    if (current.id === 'group-party') {
      const activePlayerIds = activePlayers.filter((p) => p.inParty).map((p) => p.id);
      for (const pid of activePlayerIds) {
        if (engine.getActor(pid)) {
          engine.advanceTurn(pid);
        }
      }
    } else if (current.id === 'group-enemies') {
      const enemyIds = activeEnemies.map((e) => e.id);
      for (const eid of enemyIds) {
        if (engine.getActor(eid)) {
          engine.advanceTurn(eid);
        }
      }
    } else {
      if (engine.getActor(current.id)) {
        engine.advanceTurn(current.id);
      }
    }

    // Apply the rule engine patches directly to the activePlayers and activeEnemies
    const finalPlayers = activePlayers.map((p) => patchPlayerFromActor(p, engine.getActor(p.id)));
    const finalEnemies = activeEnemies.map((e) => patchEnemyFromActor(e, engine.getActor(e.id)));

    updatePlayers(finalPlayers);
    setEnemies(finalEnemies);

    let afterHp: number | undefined;
    if (current.id !== 'group-party' && current.id !== 'group-enemies') {
      afterHp = engine.getActor(current.id)?.resources.hp?.current;
    }

    const hpNote =
      beforeHp != null && afterHp != null && beforeHp !== afterHp
        ? ` HP ${beforeHp}→${afterHp}`
        : '';

    showActionToast(`⏭ Turn: ${current.name}${hpNote}`);
    setTurnIndex((prev) => (prev + 1) % turnOrder.length);
  }, [turnOrder, turnIndex, config, showActionToast, players, enemies, updatePlayers, setEnemies]);

  return {
    encounterRules,
    turnOrder,
    currentTurnIndex: turnIndex,
    currentTurnActor,
    applyQuickDamage,
    applyQuickHeal,
    getModifiersFor,
    advanceEncounterTurn,
  };
}
