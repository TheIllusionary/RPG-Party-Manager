import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { evaluate, RuleEvaluationError } from '../../engine/RuleEvaluator';
import { DASHBOARD_LOGIC_BLOCKS } from '../../features/dashboard/constants/dashboardDefaults';
import { dmDashboardBridge } from '../../services/dmDashboardBridge';
import {
  filterActiveLogicBlocks,
  softDeleteLogicBlock,
} from '../../shared/utils/logicBlockUtils';
import type { Actor, LogicBlock } from '../../types/domain';
import type { IDmRuleEvaluationRow } from '../../types/dashboard';

import {
  blockToDraft,
  defaultVerticalDraft,
  mergeDraftIntoBlock,
  stepsToExpression,
  type VerticalRuleDraft,
} from './formulaStack';

const DEV_STORAGE_KEY = 'rpg-rules-editor-blocks';

function loadDevBlocks(): LogicBlock[] {
  try {
    const raw = sessionStorage.getItem(DEV_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LogicBlock[];
  } catch {
    /* ignore */
  }
  return [...DASHBOARD_LOGIC_BLOCKS];
}

function saveDevBlocks(blocks: LogicBlock[]): void {
  try {
    sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(blocks));
  } catch {
    /* ignore */
  }
}

export interface UseRulesEditorOptions {
  actors: Actor[];
}

export interface UseRulesEditorResult {
  electronAvailable: boolean;
  /** Active (non-deleted) blocks for sidebar UI. */
  blocks: LogicBlock[];
  /** Full document set including soft-deleted tombstones. */
  allBlocks: LogicBlock[];
  selectedBlockId: string | null;
  selectedBlock: LogicBlock | null;
  draft: VerticalRuleDraft;
  saving: boolean;
  saveError: string | null;
  previewRows: IDmRuleEvaluationRow[];
  selectBlock: (blockId: string) => void;
  addBlock: () => void;
  updateBlockMeta: (patch: Partial<Pick<LogicBlock, 'name' | 'description' | 'enabled'>>) => void;
  updateDraft: (draft: VerticalRuleDraft) => void;
  deleteBlock: (blockId: string) => void;
  saveNow: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRulesEditor({ actors }: UseRulesEditorOptions): UseRulesEditorResult {
  const electronAvailable = dmDashboardBridge.isAvailable();
  const [blocks, setBlocks] = useState<LogicBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VerticalRuleDraft>(defaultVerticalDraft());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocksRef = useRef(blocks);
  const draftRef = useRef(draft);
  blocksRef.current = blocks;
  draftRef.current = draft;

  const persistBlocks = useCallback(
    async (nextBlocks: LogicBlock[]) => {
      setSaving(true);
      setSaveError(null);
      try {
        if (electronAvailable) {
          const saved = await dmDashboardBridge.saveLogicBlocks(nextBlocks);
          setBlocks(saved);
        } else {
          saveDevBlocks(nextBlocks);
          setBlocks(nextBlocks);
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Failed to save blocks');
      } finally {
        setSaving(false);
      }
    },
    [electronAvailable],
  );

  const scheduleSave = useCallback(
    (nextBlocks: LogicBlock[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistBlocks(nextBlocks);
      }, 500);
    },
    [persistBlocks],
  );

  const syncDraftToBlocks = useCallback(
    (nextDraft: VerticalRuleDraft, blockId: string | null = selectedBlockId) => {
      if (!blockId) return;
      const index = blocksRef.current.findIndex((b) => b.id === blockId);
      if (index < 0) return;
      const merged = mergeDraftIntoBlock(blocksRef.current[index], nextDraft);
      const nextBlocks = [...blocksRef.current];
      nextBlocks[index] = merged;
      setBlocks(nextBlocks);
      scheduleSave(nextBlocks);
    },
    [scheduleSave, selectedBlockId],
  );

  const loadBlockIntoEditor = useCallback((block: LogicBlock) => {
    setSelectedBlockId(block.id);
    setDraft(blockToDraft(block));
  }, []);

  const refresh = useCallback(async () => {
    setSaveError(null);
    try {
      let loaded: LogicBlock[];
      if (electronAvailable) {
        loaded = await dmDashboardBridge.listLogicBlocks();
      } else {
        loaded = loadDevBlocks();
      }
      if (loaded.length === 0) {
        loaded = [...DASHBOARD_LOGIC_BLOCKS];
        await persistBlocks(loaded);
      }
      setBlocks(loaded);
      setSelectedBlockId((prev) => {
        const active = filterActiveLogicBlocks(loaded);
        if (prev && active.some((b) => b.id === prev)) {
          const block = active.find((b) => b.id === prev)!;
          setDraft(blockToDraft(block));
          return prev;
        }
        setDraft(defaultVerticalDraft());
        return null;
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to load blocks');
    }
  }, [electronAvailable, persistBlocks]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectBlock = useCallback(
    (blockId: string) => {
      const block = filterActiveLogicBlocks(blocksRef.current).find((b) => b.id === blockId);
      if (!block) return;
      loadBlockIntoEditor(block);
    },
    [loadBlockIntoEditor],
  );

  const addBlock = useCallback(() => {
    const id = `logic_${Date.now()}`;
    const now = new Date().toISOString();
    const block: LogicBlock = {
      id,
      name: 'New Rule',
      trigger: 'manual',
      enabled: true,
      effects: [],
      compute: { kind: 'literal', value: 0 },
      updatedAt: now,
    };
    const initialDraft = defaultVerticalDraft();
    const merged = mergeDraftIntoBlock(block, initialDraft);
    const next = [...blocksRef.current, merged];
    setBlocks(next);
    loadBlockIntoEditor(merged);
    void persistBlocks(next);
  }, [loadBlockIntoEditor, persistBlocks]);

  const updateBlockMeta = useCallback(
    (patch: Partial<Pick<LogicBlock, 'name' | 'description' | 'enabled'>>) => {
      const blockId = selectedBlockId;
      if (!blockId) return;
      const next = blocksRef.current.map((block) =>
        block.id === blockId
          ? { ...block, ...patch, updatedAt: new Date().toISOString() }
          : block,
      );
      setBlocks(next);
      scheduleSave(next);
    },
    [scheduleSave, selectedBlockId],
  );

  const updateDraft = useCallback(
    (nextDraft: VerticalRuleDraft) => {
      setDraft(nextDraft);
      syncDraftToBlocks(nextDraft);
    },
    [syncDraftToBlocks],
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      if (!window.confirm('Delete this rule? (soft delete — remains in sync as tombstone)')) {
        return;
      }
      const now = new Date().toISOString();
      const next = blocksRef.current.map((block) =>
        block.id === blockId ? softDeleteLogicBlock(block, now) : block,
      );
      setBlocks(next);
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
        setDraft(defaultVerticalDraft());
      }
      void persistBlocks(next);
    },
    [persistBlocks, selectedBlockId],
  );

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const blockId = selectedBlockId;
    let nextBlocks = [...blocksRef.current];
    if (blockId) {
      const index = nextBlocks.findIndex((b) => b.id === blockId);
      if (index >= 0) {
        nextBlocks[index] = mergeDraftIntoBlock(nextBlocks[index], draftRef.current);
        setBlocks(nextBlocks);
      }
    }
    await persistBlocks(nextBlocks);
  }, [persistBlocks, selectedBlockId]);

  const selectedBlock = useMemo(
    () => filterActiveLogicBlocks(blocks).find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const visibleBlocks = useMemo(() => filterActiveLogicBlocks(blocks), [blocks]);

  const previewRows = useMemo((): IDmRuleEvaluationRow[] => {
    if (!selectedBlock) return [];
    const compute = stepsToExpression(draft.steps) ?? selectedBlock.compute;
    const previewBlock: LogicBlock = mergeDraftIntoBlock(selectedBlock, draft);
    const withCompute = { ...previewBlock, compute };
    return actors.map((actor) => {
      try {
        const result = evaluate(actor, withCompute);
        return {
          actorId: actor.id,
          actorName: actor.name,
          blockId: withCompute.id,
          blockName: withCompute.name,
          result,
        };
      } catch (error) {
        if (error instanceof RuleEvaluationError && error.message.includes('conditions')) {
          return {
            actorId: actor.id,
            actorName: actor.name,
            blockId: withCompute.id,
            blockName: withCompute.name,
            result: null,
            skipped: true,
          };
        }
        return {
          actorId: actor.id,
          actorName: actor.name,
          blockId: withCompute.id,
          blockName: withCompute.name,
          result: null,
          error: error instanceof Error ? error.message : 'Error',
        };
      }
    });
  }, [actors, draft, selectedBlock]);

  return {
    electronAvailable,
    blocks: visibleBlocks,
    allBlocks: blocks,
    selectedBlockId,
    selectedBlock,
    draft,
    saving,
    saveError,
    previewRows,
    selectBlock,
    addBlock,
    updateBlockMeta,
    updateDraft,
    deleteBlock,
    saveNow,
    refresh,
  };
}
