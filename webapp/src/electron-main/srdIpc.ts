import { ipcMain } from 'electron';

import { getDesktopInfrastructure } from './infrastructure';
import { createEmptySrdCatalog } from '../types/srd';

export const SRD_IPC_CHANNELS = {
  mergeCatalogBatch: 'srd:merge-catalog-batch',
  getCatalogStats: 'srd:get-catalog-stats',
  getCatalog: 'srd:get-catalog',
} as const;

export function registerSrdIpc(): void {
  ipcMain.handle(SRD_IPC_CHANNELS.getCatalog, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) {
      return createEmptySrdCatalog();
    }
    const local = await infra.syncService.loadLocal();
    return local?.data.srdCatalog ?? createEmptySrdCatalog();
  });

  ipcMain.handle(SRD_IPC_CHANNELS.getCatalogStats, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) {
      return { spellCount: 0, equipmentCount: 0, subclassCount: 0, importedAt: null };
    }
    const local = await infra.syncService.loadLocal();
    const catalog = local?.data.srdCatalog;
    return {
      spellCount: catalog?.spells.length ?? 0,
      equipmentCount: catalog?.equipment.length ?? 0,
      subclassCount: catalog?.subclasses?.length ?? 0,
      importedAt: catalog?.importedAt ?? null,
    };
  });
}
