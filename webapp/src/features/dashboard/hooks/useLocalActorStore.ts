import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { evaluate, RuleEvaluationError } from '../../../engine/RuleEvaluator';
import { dmDashboardBridge } from '../../../services/dmDashboardBridge';
import type { Actor } from '../../../types/domain';
import type {
  IDmBroadcastResult,
  IDmRuleEvaluationRow,
  IDmSyncStatus,
  IDmVttStatus,
} from '../../../types/dashboard';
import { DASHBOARD_LOGIC_BLOCKS } from '../constants/dashboardDefaults';

const POLL_MS = 2_000;

export interface UseLocalActorStoreResult {
  electronAvailable: boolean;
  loading: boolean;
  error: string | null;
  actors: Actor[];
  vttStatus: IDmVttStatus | null;
  syncStatus: IDmSyncStatus | null;
  ruleRows: IDmRuleEvaluationRow[];
  lastBroadcast: IDmBroadcastResult | null;
  refresh: () => Promise<void>;
  seedSampleData: () => Promise<void>;
  updateActorField: (
    actorId: string,
    updater: (actor: Actor) => Actor,
  ) => void;
  simulateBroadcast: (actorId: string) => Promise<void>;
}

function actorForRuleEvaluation(actor: Actor): Actor {
  const level = actor.customAttributes?.level;
  const levelNum =
    typeof level === 'number' ? level : typeof level === 'string' ? Number(level) : 1;
  return {
    ...actor,
    customAttributes: {
      ...actor.customAttributes,
      level: Number.isFinite(levelNum) ? levelNum : 1,
    },
  };
}

function computeRuleRows(actors: Actor[]): IDmRuleEvaluationRow[] {
  const rows: IDmRuleEvaluationRow[] = [];
  for (const actor of actors) {
    for (const block of DASHBOARD_LOGIC_BLOCKS) {
      try {
        const result = evaluate(actorForRuleEvaluation(actor), block);
        rows.push({
          actorId: actor.id,
          actorName: actor.name,
          blockId: block.id,
          blockName: block.name,
          result,
        });
      } catch (err: unknown) {
        if (err instanceof RuleEvaluationError && err.message.includes('conditions not met')) {
          rows.push({
            actorId: actor.id,
            actorName: actor.name,
            blockId: block.id,
            blockName: block.name,
            result: null,
            skipped: true,
          });
          continue;
        }
        rows.push({
          actorId: actor.id,
          actorName: actor.name,
          blockId: block.id,
          blockName: block.name,
          result: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return rows;
}

export function useLocalActorStore(): UseLocalActorStoreResult {
  const electronAvailable = dmDashboardBridge.isAvailable();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [vttStatus, setVttStatus] = useState<IDmVttStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<IDmSyncStatus | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState<IDmBroadcastResult | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const ruleRows = useMemo(() => computeRuleRows(actors), [actors]);

  const refreshStatus = useCallback(async () => {
    if (!electronAvailable) return;
    try {
      const [vtt, sync] = await Promise.all([
        dmDashboardBridge.getVttStatus(),
        dmDashboardBridge.getSyncStatus(),
      ]);
      setVttStatus(vtt);
      setSyncStatus(sync);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [electronAvailable]);

  const refresh = useCallback(async () => {
    if (!electronAvailable) {
      setLoading(false);
      setError('Abra pelo Electron (npm run electron:dev) para usar o dashboard de teste.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const list = await dmDashboardBridge.listActors();
      setActors(list);
      await refreshStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [electronAvailable, refreshStatus]);

  const persistActor = useCallback(async (actor: Actor) => {
    const updated = await dmDashboardBridge.saveActor(actor);
    setActors(updated);
    await refreshStatus();
  }, [refreshStatus]);

  const updateActorField = useCallback(
    (actorId: string, updater: (actor: Actor) => Actor) => {
      setActors((prev) => {
        const next = prev.map((a) => {
          if (a.id !== actorId) return a;
          return {
            ...updater(a),
            updatedAt: new Date().toISOString(),
          };
        });
        const changed = next.find((a) => a.id === actorId);
        if (changed && electronAvailable) {
          const existingTimer = saveTimers.current.get(actorId);
          if (existingTimer) clearTimeout(existingTimer);
          saveTimers.current.set(
            actorId,
            setTimeout(() => {
              void persistActor(changed).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : String(err));
              });
            }, 400),
          );
        }
        return next;
      });
    },
    [electronAvailable, persistActor],
  );

  const seedSampleData = useCallback(async () => {
    if (!electronAvailable) return;
    setLoading(true);
    try {
      const list = await dmDashboardBridge.seedActors();
      setActors(list);
      await refreshStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [electronAvailable, refreshStatus]);

  const simulateBroadcast = useCallback(async (actorId: string) => {
    if (!electronAvailable) return;
    try {
      const result = await dmDashboardBridge.simulateBroadcast(actorId);
      setLastBroadcast(result);
      await refreshStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [electronAvailable, refreshStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!electronAvailable) return undefined;
    const unsubscribe = dmDashboardBridge.onActorsUpdated(() => {
      void refresh();
    });
    return unsubscribe;
  }, [electronAvailable, refresh]);

  useEffect(() => {
    if (!electronAvailable) return undefined;
    const id = setInterval(() => {
      void refreshStatus();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [electronAvailable, refreshStatus]);

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) {
        clearTimeout(timer);
      }
      saveTimers.current.clear();
    };
  }, []);

  return {
    electronAvailable,
    loading,
    error,
    actors,
    vttStatus,
    syncStatus,
    ruleRows,
    lastBroadcast,
    refresh,
    seedSampleData,
    updateActorField,
    simulateBroadcast,
  };
}
