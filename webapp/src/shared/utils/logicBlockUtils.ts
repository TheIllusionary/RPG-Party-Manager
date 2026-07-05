import type { LogicBlock } from '../../types/domain';
import type { IsoTimestamp } from '../../types/domain';

export function normalizeLogicBlock(raw: unknown, fallbackId: string): LogicBlock {
  const b =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    id: typeof b.id === 'string' && b.id ? b.id : fallbackId,
    name: typeof b.name === 'string' ? b.name : 'Regra sem nome',
    description: typeof b.description === 'string' ? b.description : undefined,
    trigger: typeof b.trigger === 'string' ? b.trigger : 'manual',
    enabled: b.enabled !== false,
    deleted: b.deleted === true,
    updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : undefined,
    priority: typeof b.priority === 'number' ? b.priority : undefined,
    conditions: Array.isArray(b.conditions)
      ? (b.conditions as LogicBlock['conditions'])
      : undefined,
    effects: Array.isArray(b.effects) ? (b.effects as LogicBlock['effects']) : [],
    compute: b.compute as LogicBlock['compute'],
    computeTarget: b.computeTarget as LogicBlock['computeTarget'],
    scope: b.scope as LogicBlock['scope'],
    modifiers: b.modifiers as LogicBlock['modifiers'],
  };
}

export function normalizeLogicBlocks(raw: unknown): LogicBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => normalizeLogicBlock(item, `logic_block_${idx}`));
}

export function getEnabledLogicBlocks(blocks: LogicBlock[]): LogicBlock[] {
  return filterActiveLogicBlocks(blocks).filter((block) => block.enabled);
}

export function isLogicBlockActive(block: LogicBlock): boolean {
  return block.deleted !== true;
}

export function filterActiveLogicBlocks(blocks: LogicBlock[]): LogicBlock[] {
  return blocks.filter(isLogicBlockActive);
}

export function softDeleteLogicBlock(block: LogicBlock, at?: IsoTimestamp): LogicBlock {
  const updatedAt = at ?? new Date().toISOString();
  return {
    ...block,
    deleted: true,
    enabled: false,
    updatedAt,
  };
}

function blockTimestamp(block: LogicBlock): number {
  const ms = Date.parse(block.updatedAt ?? '');
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Per-block merge for sync conflicts — newer `updatedAt` wins (including tombstones).
 */
export function mergeLogicBlocksById(
  ...sources: Array<LogicBlock[] | undefined>
): LogicBlock[] {
  const byId = new Map<string, LogicBlock>();

  for (const list of sources) {
    if (!list) continue;
    for (const block of list) {
      const existing = byId.get(block.id);
      if (!existing || blockTimestamp(block) >= blockTimestamp(existing)) {
        byId.set(block.id, block);
      }
    }
  }

  return [...byId.values()];
}
