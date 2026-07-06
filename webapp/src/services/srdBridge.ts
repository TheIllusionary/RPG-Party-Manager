import type { ISRDCatalog } from '../types/srd';
import { createEmptySrdCatalog } from '../types/srd';
const SRD_IPC_CHANNELS = {
  mergeCatalogBatch: 'srd:merge-catalog-batch',
  getCatalogStats: 'srd:get-catalog-stats',
  getCatalog: 'srd:get-catalog',
} as const;

const DEV_SRD_STORAGE_KEY = 'rpg-srd-catalog-dev';

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

export function isSrdBridgeAvailable(): boolean {
  return getIpcRenderer() !== null;
}

function loadDevCatalog(): ISRDCatalog {
  try {
    const raw = sessionStorage.getItem(DEV_SRD_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ISRDCatalog;
  } catch {
    /* ignore */
  }
  return createEmptySrdCatalog();
}

function saveDevCatalog(catalog: ISRDCatalog): void {
  try {
    sessionStorage.setItem(DEV_SRD_STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    /* ignore */
  }
}


/** Loads the full SRD catalog from Electron local store or browser sessionStorage. */
export async function getSrdCatalog(): Promise<ISRDCatalog> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const catalog = (await ipc.invoke(SRD_IPC_CHANNELS.getCatalog)) as ISRDCatalog | null;
    return catalog ?? createEmptySrdCatalog();
  }
  return loadDevCatalog();
}

export async function getSrdCatalogStats(): Promise<{
  spellCount: number;
  equipmentCount: number;
  subclassCount: number;
  importedAt: string | null;
}> {
  const ipc = getIpcRenderer();
  if (ipc) {
    const stats = (await ipc.invoke(SRD_IPC_CHANNELS.getCatalogStats)) as {
      spellCount: number;
      equipmentCount: number;
      subclassCount?: number;
      importedAt: string | null;
    };
    return {
      spellCount: stats.spellCount,
      equipmentCount: stats.equipmentCount,
      subclassCount: stats.subclassCount ?? 0,
      importedAt: stats.importedAt,
    };
  }

  const catalog = loadDevCatalog();
  return {
    spellCount: catalog.spells.length,
    equipmentCount: catalog.equipment.length,
    subclassCount: catalog.subclasses?.length ?? 0,
    importedAt: catalog.importedAt,
  };
}
