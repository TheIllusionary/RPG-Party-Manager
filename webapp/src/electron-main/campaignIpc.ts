import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import { getDesktopInfrastructure } from './infrastructure';
import { DOCUMENT_COLLECTIONS, type DocumentRecord } from '../services/persistence/IDocumentStore';
import type { ISyncCampaignDocument, ISyncGameData } from '../types/sync';
import type { ICampaignDataDto, ICreateCampaignPayload, IUpdateCampaignPayload, ICampaignListItem } from '../types/api';

export const CAMPAIGN_IPC_CHANNELS = {
  list: 'campaign:list',
  create: 'campaign:create',
  update: 'campaign:update',
  delete: 'campaign:delete',
  getData: 'campaign:get-data',
  updateData: 'campaign:update-data',
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

export function registerCampaignIpc(): void {
  ipcMain.handle(CAMPAIGN_IPC_CHANNELS.list, async (): Promise<ICampaignListItem[]> => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];
    try {
      const docs = await infra.documentStore.query<ISyncCampaignDocument & DocumentRecord>(
        DOCUMENT_COLLECTIONS.campaigns
      );
      return docs.map((doc) => ({
        _id: doc.id,
        name: doc.name,
        lastAccessed: doc.updatedAt,
      }));
    } catch (err) {
      console.error('[CampaignIpc] Failed to list campaigns:', err);
      return [];
    }
  });

  ipcMain.handle(CAMPAIGN_IPC_CHANNELS.create, async (_event, payload: ICreateCampaignPayload) => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Infrastructure not ready');

    const newDoc: ISyncCampaignDocument & DocumentRecord = {
      id: randomUUID(),
      name: payload.name || 'New Campaign',
      updatedAt: new Date().toISOString(),
      data: emptyAppData(),
    };

    await infra.documentStore.put(DOCUMENT_COLLECTIONS.campaigns, newDoc);

    await infra.syncQueueService.enqueue({
      method: 'POST',
      endpoint: '/campaigns',
      payload: { name: newDoc.name },
      entityId: newDoc.id,
      campaignId: newDoc.id,
    });

    return { campaign: { _id: newDoc.id, name: newDoc.name } };
  });

  ipcMain.handle(CAMPAIGN_IPC_CHANNELS.update, async (_event, id: string, payload: IUpdateCampaignPayload) => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Infrastructure not ready');

    const updated = await infra.documentStore.update<ISyncCampaignDocument & DocumentRecord>(
      DOCUMENT_COLLECTIONS.campaigns,
      id,
      (current) => {
        if (!current) throw new Error(`Campaign ${id} not found`);
        return {
          ...current,
          name: payload.name ?? current.name,
          updatedAt: new Date().toISOString(),
        };
      }
    );

    await infra.syncQueueService.enqueue({
      method: 'PATCH',
      endpoint: `/campaigns/${id}`,
      payload,
      entityId: id,
      campaignId: id,
    });

    return { _id: updated.id, name: updated.name };
  });

  ipcMain.handle(CAMPAIGN_IPC_CHANNELS.delete, async (_event, id: string) => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Infrastructure not ready');

    const deleted = await infra.documentStore.delete(DOCUMENT_COLLECTIONS.campaigns, id);

    if (deleted) {
      await infra.syncQueueService.enqueue({
        method: 'DELETE',
        endpoint: `/campaigns/${id}`,
        payload: {},
        entityId: id,
        campaignId: id,
      });
    }

    return { ok: deleted };
  });

  ipcMain.handle(CAMPAIGN_IPC_CHANNELS.getData, async (_event, id: string): Promise<ICampaignDataDto> => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Infrastructure not ready');

    const doc = await infra.documentStore.get<ISyncCampaignDocument & DocumentRecord>(DOCUMENT_COLLECTIONS.campaigns, id);
    if (!doc) {
      // In a robust implementation we might initialize one, but for now throw.
      throw new Error(`Campaign ${id} data not found`);
    }

    return doc.data;
  });

  ipcMain.handle(CAMPAIGN_IPC_CHANNELS.updateData, async (_event, id: string, data: ICampaignDataDto): Promise<ICampaignDataDto> => {
    const infra = getDesktopInfrastructure();
    if (!infra) throw new Error('Infrastructure not ready');

    await infra.documentStore.update<ISyncCampaignDocument & DocumentRecord>(
      DOCUMENT_COLLECTIONS.campaigns,
      id,
      (current) => {
        if (!current) throw new Error(`Campaign ${id} not found`);
        return {
          ...current,
          updatedAt: new Date().toISOString(),
          data,
        };
      }
    );

    await infra.syncQueueService.enqueue({
      method: 'PUT',
      endpoint: `/campaigns/${id}/data`,
      payload: data,
      entityId: id,
      campaignId: id,
    });

    return data;
  });
}
