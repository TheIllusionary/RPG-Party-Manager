import type { Actor } from '../types/domain';
import type { LogicBlock } from '../types/domain';
import type { PlayerViewDTO } from '../types/player-view';
import type { ISyncLocalMeta } from '../types/sync';

export interface IDmVttStatus {
  running: boolean;
  port: number;
  clientCount: number;
  url: string;
}

export interface IDmSyncStatus {
  isDirty: boolean;
  meta: ISyncLocalMeta;
}

export interface IDmRuleEvaluationRow {
  actorId: string;
  actorName: string;
  blockId: string;
  blockName: string;
  result: number | null;
  error?: string;
  /** Rule did not apply to this actor (e.g. mana formula only for players). */
  skipped?: boolean;
}

export interface IDmBroadcastResult {
  actorId: string;
  dto: PlayerViewDTO;
  sentAt: string;
}

export const DM_IPC_CHANNELS = {
  listActors: 'dm:list-actors',
  saveActor: 'dm:save-actor',
  seedActors: 'dm:seed-actors',
  getVttStatus: 'dm:get-vtt-status',
  simulateBroadcast: 'dm:simulate-broadcast',
  getSyncStatus: 'dm:get-sync-status',
  actorsUpdated: 'dm:actors-updated',
  listLogicBlocks: 'dm:list-logic-blocks',
  saveLogicBlocks: 'dm:save-logic-blocks',
} as const;

export interface IDmDashboardBridge {
  isAvailable(): boolean;
  listActors(): Promise<Actor[]>;
  saveActor(actor: Actor): Promise<Actor[]>;
  seedActors(): Promise<Actor[]>;
  getVttStatus(): Promise<IDmVttStatus>;
  simulateBroadcast(actorId: string): Promise<IDmBroadcastResult>;
  getSyncStatus(): Promise<IDmSyncStatus>;
  listLogicBlocks(): Promise<LogicBlock[]>;
  saveLogicBlocks(blocks: LogicBlock[]): Promise<LogicBlock[]>;
  onActorsUpdated(listener: () => void): () => void;
}

export type { Actor, LogicBlock };
