import type { MasterItem } from '../services/compendium/fiveETools/types';

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

const DEV_ITEMS_STORAGE_KEY = 'rpg-compendium-items-dev';

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

function loadDevItems(): MasterItem[] {
  try {
    const raw = sessionStorage.getItem(DEV_ITEMS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MasterItem[];
  } catch {
    /* ignore */
  }
  return [];
}

/** Fetches all compendium items from the local store (Electron IPC or sessionStorage fallback). */
export async function getCompendiumItems(): Promise<MasterItem[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const items = (await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getItems)) as MasterItem[] | null;
    return items ?? [];
  }
  return loadDevItems();
}

export async function getCompendiumSpells(): Promise<any[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const spells = await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getSpells);
    return spells as any[] ?? [];
  }
  return [];
}

export async function getCompendiumMonsters(): Promise<any[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const monsters = await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getMonsters);
    return monsters as any[] ?? [];
  }
  return [];
}

export async function getCompendiumClasses(): Promise<any[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const classes = await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getClasses);
    return classes as any[] ?? [];
  }
  return [];
}

export async function getCompendiumSubclasses(): Promise<any[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const subclasses = await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getSubclasses);
    return subclasses as any[] ?? [];
  }
  return [];
}

export async function getCompendiumRaces(): Promise<any[]> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const races = await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getRaces);
    return races as any[] ?? [];
  }
  return [];
}

/** Returns the count of locally stored compendium items. */
export async function getCompendiumItemCount(): Promise<number> {
  const ipc = getIpcRenderer();
  if (ipc) {
    return (await ipc.invoke(COMPENDIUM_IPC_CHANNELS.getItemCount)) as number;
  }
  return loadDevItems().length;
}
