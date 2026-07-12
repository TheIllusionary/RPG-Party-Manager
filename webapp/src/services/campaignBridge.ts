import type { ICampaign } from '../types';
import type {
  ICampaignDataDto,
  ICampaignListItem,
  ICreateCampaignPayload,
  IUpdateCampaignPayload,
  ICreateCampaignResponse,
} from '../types/api';
import * as api from './api';

const CAMPAIGN_IPC_CHANNELS = {
  list: 'campaign:list',
  create: 'campaign:create',
  update: 'campaign:update',
  delete: 'campaign:delete',
  getData: 'campaign:get-data',
  updateData: 'campaign:update-data',
} as const;

function getIpcRenderer():
  | { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> }
  | null {
  if (typeof window === 'undefined' || !window.require) return null;
  try {
    return window.require('electron').ipcRenderer;
  } catch {
    return null;
  }
}

export async function listCampaigns(): Promise<ICampaignListItem[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const campaigns = await ipc.invoke(CAMPAIGN_IPC_CHANNELS.list);
    return (campaigns as ICampaignListItem[]) ?? [];
  }
  return api.listCampaigns();
}

export async function createCampaign(
  payload: ICreateCampaignPayload = {},
): Promise<ICreateCampaignResponse> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.create, payload)) as ICreateCampaignResponse;
  }
  return api.createCampaign(payload);
}

export async function updateCampaign(
  campaignId: string,
  payload: IUpdateCampaignPayload = {},
): Promise<ICampaign> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.update, campaignId, payload)) as ICampaign;
  }
  return api.updateCampaign(campaignId, payload);
}

export async function deleteCampaign(campaignId: string): Promise<{ ok: boolean }> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const res = await ipc.invoke(CAMPAIGN_IPC_CHANNELS.delete, campaignId);
    return (res as { ok: boolean }) ?? { ok: false };
  }
  return api.deleteCampaign(campaignId);
}

export async function getCampaignData(campaignId: string): Promise<ICampaignDataDto> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.getData, campaignId)) as ICampaignDataDto;
  }
  return api.getCampaignData(campaignId);
}

export async function updateCampaignData(
  campaignId: string,
  data: ICampaignDataDto,
): Promise<ICampaignDataDto> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.updateData, campaignId, data)) as ICampaignDataDto;
  }
  return api.updateCampaignData(campaignId, data);
}
