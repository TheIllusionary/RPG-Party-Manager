import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';

import {
  DASHBOARD_LOGIC_BLOCKS,
  DASHBOARD_TEST_CAMPAIGN_ID,
  createSampleActors,
} from '../features/dashboard/constants/dashboardDefaults';
import { getDesktopInfrastructure } from './infrastructure';
import { DOCUMENT_COLLECTIONS } from '../services/persistence/IDocumentStore';
import type { DocumentRecord } from '../services/persistence/IDocumentStore';
import type { Actor, LogicBlock } from '../types/domain';
import type { ISyncCampaignDocument } from '../types/sync';
import type { ISyncGameData } from '../types/sync';
import {
  softDeleteLogicBlock,
} from '../shared/utils/logicBlockUtils';

const DM_CHANNELS = {
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

function emptyAppData(): ISyncGameData {
  return {
    players: [],
    equipment: { inventories: {}, equipped: {}, playerGold: {} },
    library: [],
    encounters: [],
    training: {},
    chaos: { customTables: [] },
    notebook: { pages: [] },
    bestiaryReview: {},
    buffsDatabase: [],
    subclasses: [],
  };
}

function notifyActorsUpdated(getMainWindow: () => BrowserWindow | null): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(DM_CHANNELS.actorsUpdated);
  }
}

async function listAllActors(): Promise<Actor[]> {
  const infra = getDesktopInfrastructure();
  if (!infra) return [];
  const actors = await infra.documentStore.query<Actor & DocumentRecord>(
    DOCUMENT_COLLECTIONS.actors,
  );
  const byId = new Map<string, Actor>();
  for (const actor of actors) {
    byId.set(actor.id, actor);
  }
  return [...byId.values()];
}

async function listAllLogicBlocks(): Promise<LogicBlock[]> {
  const infra = getDesktopInfrastructure();
  if (!infra) return [];
  const blocks = await infra.documentStore.query<LogicBlock & DocumentRecord>(
    DOCUMENT_COLLECTIONS.logicBlocks,
  );
  const byId = new Map<string, LogicBlock>();
  for (const block of blocks) {
    byId.set(block.id, block);
  }
  return [...byId.values()];
}

async function buildSyncDocument(
  actors: Actor[],
  logicBlocks: LogicBlock[],
): Promise<ISyncCampaignDocument> {
  return {
    id: DASHBOARD_TEST_CAMPAIGN_ID,
    name: 'DM Dashboard Test Campaign',
    updatedAt: new Date().toISOString(),
    data: emptyAppData(),
    actors,
    logicBlocks,
  };
}

async function persistLogicBlocksPipeline(blocks: LogicBlock[]): Promise<LogicBlock[]> {
  const infra = getDesktopInfrastructure();
  if (!infra) throw new Error('Desktop infrastructure not ready');

  const now = new Date().toISOString();
  const stored = await infra.documentStore.query<LogicBlock & DocumentRecord>(
    DOCUMENT_COLLECTIONS.logicBlocks,
  );
  const incomingById = new Map(blocks.map((block) => [block.id, block]));

  for (const block of blocks) {
    await infra.documentStore.put(
      DOCUMENT_COLLECTIONS.logicBlocks,
      {
        ...block,
        updatedAt: block.updatedAt ?? now,
      } as DocumentRecord & LogicBlock,
    );
  }

  for (const orphan of stored) {
    if (!incomingById.has(orphan.id) && orphan.deleted !== true) {
      await infra.documentStore.put(
        DOCUMENT_COLLECTIONS.logicBlocks,
        softDeleteLogicBlock(orphan, now) as DocumentRecord & LogicBlock,
      );
    }
  }

  const actors = await listAllActors();
  const logicBlocks = await listAllLogicBlocks();
  const syncDoc = await buildSyncDocument(actors, logicBlocks);
  await infra.syncService.saveLocal(syncDoc, { cloudSync: false });
  return logicBlocks;
}

async function persistActorPipeline(
  actor: Actor,
  getMainWindow: () => BrowserWindow | null,
): Promise<Actor[]> {
  const infra = getDesktopInfrastructure();
  if (!infra) throw new Error('Desktop infrastructure not ready');

  const document: Actor = {
    ...actor,
    updatedAt: new Date().toISOString(),
  };

  await infra.documentStore.put(
    DOCUMENT_COLLECTIONS.actors,
    document as DocumentRecord & Actor,
  );

  const actors = await listAllActors();

  const syncDoc = await buildSyncDocument(actors, await listAllLogicBlocks());
  await infra.syncService.saveLocal(syncDoc, { cloudSync: false });

  infra.playerViewService.onActorChanged(document);

  notifyActorsUpdated(getMainWindow);
  return actors;
}

export function registerDashboardIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(DM_CHANNELS.listActors, async () => {
    const actors = await listAllActors();
    if (actors.length === 0) {
      const infra = getDesktopInfrastructure();
      if (!infra) return [];
      const samples = createSampleActors();
      for (const sample of samples) {
        await infra.documentStore.put(
          DOCUMENT_COLLECTIONS.actors,
          sample as DocumentRecord & Actor,
        );
      }
      return listAllActors();
    }
    return actors;
  });

  ipcMain.handle(DM_CHANNELS.saveActor, async (_event, actor: Actor) => {
    return persistActorPipeline(actor, getMainWindow);
  });

  ipcMain.handle(DM_CHANNELS.seedActors, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Desktop infrastructure not ready');

    const samples = createSampleActors();
    for (const sample of samples) {
      await infra.documentStore.put(
        DOCUMENT_COLLECTIONS.actors,
        sample as DocumentRecord & Actor,
      );
    }

    const actors = await listAllActors();
    const syncDoc = await buildSyncDocument(actors, await listAllLogicBlocks());
    await infra.syncService.saveLocal(syncDoc, { cloudSync: false });
    notifyActorsUpdated(getMainWindow);
    return actors;
  });

  ipcMain.handle(DM_CHANNELS.getVttStatus, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) {
      return { running: false, port: 0, clientCount: 0, url: '' };
    }
    const status = infra.webSocketServer.getStatus();
    return {
      ...status,
      url: `ws://127.0.0.1:${status.port}`,
    };
  });

  ipcMain.handle(DM_CHANNELS.getSyncStatus, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) {
      return {
        isDirty: false,
        meta: {
          isDirty: false,
          lastRemoteUpdatedAt: null,
          lastSyncAttemptAt: null,
          lastSyncError: 'Infrastructure not ready',
        },
      };
    }
    return {
      isDirty: infra.syncService.getIsDirty(),
      meta: infra.syncService.getLocalMeta(),
    };
  });

  ipcMain.handle(DM_CHANNELS.simulateBroadcast, async (_event, actorId: string) => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Desktop infrastructure not ready');

    const actor = await infra.documentStore.get<Actor & DocumentRecord>(
      DOCUMENT_COLLECTIONS.actors,
      actorId,
    );
    if (!actor) throw new Error(`Actor not found: ${actorId}`);

    const dto = infra.playerViewService.sanitizeForPlayerView(actor);
    infra.webSocketServer.broadcastActorUpdate(dto);

    return {
      actorId,
      dto,
      sentAt: new Date().toISOString(),
    };
  });

  ipcMain.handle(DM_CHANNELS.listLogicBlocks, async () => {
    const blocks = await listAllLogicBlocks();
    if (blocks.length === 0) {
      const infra = getDesktopInfrastructure();
      if (!infra) return [];
      for (const sample of DASHBOARD_LOGIC_BLOCKS) {
        await infra.documentStore.put(
          DOCUMENT_COLLECTIONS.logicBlocks,
          sample as DocumentRecord & LogicBlock,
        );
      }
      return listAllLogicBlocks();
    }
    return blocks;
  });

  ipcMain.handle(DM_CHANNELS.saveLogicBlocks, async (_event, blocks: LogicBlock[]) => {
    return persistLogicBlocksPipeline(blocks);
  });
}
