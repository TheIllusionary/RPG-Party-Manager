import type { ICampaign } from '../types';
import type {
  ICampaignDataDto,
  ICampaignListItem,
  ICreateCampaignPayload,
  IUpdateCampaignPayload,
  ICreateCampaignResponse,
} from '../types/api';

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
  return [];
}

export async function createCampaign(
  payload: ICreateCampaignPayload = {},
): Promise<ICreateCampaignResponse> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.create, payload)) as ICreateCampaignResponse;
  }
  throw new Error('IPC not available');
}

export async function updateCampaign(
  campaignId: string,
  payload: IUpdateCampaignPayload = {},
): Promise<ICampaign> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.update, campaignId, payload)) as ICampaign;
  }
  throw new Error('IPC not available');
}

export async function deleteCampaign(campaignId: string): Promise<{ ok: boolean }> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.delete, campaignId)) as { ok: boolean };
  }
  return { ok: false };
}

export async function getCampaignData(campaignId: string): Promise<ICampaignDataDto> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.getData, campaignId)) as ICampaignDataDto;
  }
  throw new Error('IPC not available');
}

export async function updateCampaignData(
  campaignId: string,
  data: ICampaignDataDto,
): Promise<ICampaignDataDto> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(CAMPAIGN_IPC_CHANNELS.updateData, campaignId, data)) as ICampaignDataDto;
  }
  throw new Error('IPC not available');
}
