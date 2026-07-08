import type { MasterItem } from '../services/compendium/fiveETools/types';
import compendiumDb from './compendiumCacheDB';
import * as api from './api';

const COMPENDIUM_IPC_CHANNELS = {
  getItems: 'compendium:get-items',
  getSpells: 'compendium:get-spells',
  getMonsters: 'compendium:get-monsters',
  getClasses: 'compendium:get-classes',
  getSubclasses: 'compendium:get-subclasses',
  getRaces: 'compendium:get-races',
  putItems: 'compendium:put-items',
  getItemCount: 'compendium:get-item-count',
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

async function fetchWithCache<T>(
  id: string,
  ipcChannel: string,
  apiFetcher: () => Promise<any[]>
): Promise<T[]> {
  // 1. Check local Dexie cache first
  const cached = await compendiumDb.cache.get(id);
  if (cached && cached.data && cached.data.length > 0) {
    return cached.data as T[];
  }

  // 2. Try Electron IPC if running locally
  const ipc = getIpcRenderer();
  if (ipc) {
    try {
      const data = await ipc.invoke(ipcChannel);
      if (data && Array.isArray(data) && data.length > 0) {
        await compendiumDb.cache.put({ id, data });
        return data as T[];
      }
    } catch (err) {
      console.warn(`[IPC] Failed to fetch ${id} from IPC:`, err);
    }
  }

  // 3. Fallback to MongoDB API
  try {
    const apiData = await apiFetcher();
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      await compendiumDb.cache.put({ id, data: apiData });
      return apiData as T[];
    }
  } catch (err) {
    console.warn(`[API] Failed to fetch ${id} from API:`, err);
  }

  return [];
}

/** Fetches all compendium items from the local store (Electron IPC or sessionStorage fallback). */
export async function getCompendiumItems(): Promise<MasterItem[]> {
  return fetchWithCache<MasterItem>('items', COMPENDIUM_IPC_CHANNELS.getItems, api.fetchCompendiumItems);
}

export async function getCompendiumSpells(): Promise<any[]> {
  return fetchWithCache<any>('spells', COMPENDIUM_IPC_CHANNELS.getSpells, api.fetchCompendiumSpells);
}

export async function getCompendiumMonsters(): Promise<any[]> {
  return fetchWithCache<any>('monsters', COMPENDIUM_IPC_CHANNELS.getMonsters, api.fetchCompendiumMonsters);
}

export async function getCompendiumClasses(): Promise<any[]> {
  return fetchWithCache<any>('classes', COMPENDIUM_IPC_CHANNELS.getClasses, api.fetchCompendiumClasses);
}

export async function getCompendiumSubclasses(): Promise<any[]> {
  return fetchWithCache<any>('subclasses', COMPENDIUM_IPC_CHANNELS.getSubclasses, api.fetchCompendiumSubclasses);
}

export async function getCompendiumRaces(): Promise<any[]> {
  return fetchWithCache<any>('races', COMPENDIUM_IPC_CHANNELS.getRaces, api.fetchCompendiumRaces);
}

/** Returns the count of locally stored compendium items. */
export async function getCompendiumItemCount(): Promise<number> {
  const cached = await compendiumDb.cache.get('items');
  if (cached && cached.data) return cached.data.length;
  
  const ipc = getIpcRenderer();
  if (ipc) {
    try {
      return (await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getItemCount)) as number;
    } catch {
      return 0;
    }
  }
  return 0;
}
