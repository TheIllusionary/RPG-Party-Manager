import { ipcMain } from 'electron';

import { getDesktopInfrastructure } from './infrastructure';
import { DOCUMENT_COLLECTIONS, type DocumentRecord } from '../services/persistence/IDocumentStore';
import type { MasterItem } from '../services/compendium/fiveETools/types';

export const COMPENDIUM_IPC_CHANNELS = {
  getItems: 'compendium:get-items',
  getSpells: 'compendium:get-spells',
  getMonsters: 'compendium:get-monsters',
  getClasses: 'compendium:get-classes',
  getSubclasses: 'compendium:get-subclasses',
  getRaces: 'compendium:get-races',
  putItems: 'compendium:put-items',
  getItemCount: 'compendium:get-item-count',
} as const;

export function registerCompendiumIpc(): void {
  /** Returns all MasterItem documents from the local compendium-items collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getItems, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];

    try {
      const items = await infra.documentStore.query<MasterItem & DocumentRecord>(
        DOCUMENT_COLLECTIONS.compendiumItems,
      );
      return items;
    } catch (err: unknown) {
      console.error('[CompendiumIpc] Failed to query items:', err);
      return [];
    }
  });

  /** Returns all MasterSpell documents from the local compendium-spells collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getSpells, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];

    try {
      const spells = await infra.documentStore.query<any>(
        DOCUMENT_COLLECTIONS.compendiumSpells,
      );
      return spells;
    } catch (err: unknown) {
      console.error('[CompendiumIpc] Failed to query spells:', err);
      return [];
    }
  });

  /** Returns all MasterMonster documents from the local compendium-monsters collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getMonsters, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];

    try {
      const monsters = await infra.documentStore.query<any>(
        DOCUMENT_COLLECTIONS.compendiumMonsters,
      );
      return monsters;
    } catch (err: unknown) {
      console.error('[CompendiumIpc] Failed to query monsters:', err);
      return [];
    }
  });

  /** Returns all MasterClass documents from the local compendium-classes collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getClasses, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];

    try {
      const classes = await infra.documentStore.query<any>(
        DOCUMENT_COLLECTIONS.compendiumClasses,
      );
      return classes;
    } catch (err: unknown) {
      console.error('[CompendiumIpc] Failed to query classes:', err);
      return [];
    }
  });

  /** Returns all MasterSubclass documents from the local compendium-subclasses collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getSubclasses, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];

    try {
      const subclasses = await infra.documentStore.query<any>(
        DOCUMENT_COLLECTIONS.compendiumSubclasses,
      );
      return subclasses;
    } catch (err: unknown) {
      console.error('[CompendiumIpc] Failed to query subclasses:', err);
      return [];
    }
  });

  /** Returns all MasterRace documents from the local compendium-races collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getRaces, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return [];

    try {
      const races = await infra.documentStore.query<any>(
        DOCUMENT_COLLECTIONS.compendiumRaces,
      );
      return races;
    } catch (err: unknown) {
      console.error('[CompendiumIpc] Failed to query races:', err);
      return [];
    }
  });

  /** Bulk upsert MasterItem documents (used by seed/ETL scripts). */
  ipcMain.handle(
    COMPENDIUM_IPC_CHANNELS.putItems,
    async (_event, items: MasterItem[]) => {
      const infra = getDesktopInfrastructure();
      if (!infra) {
        return { ok: false, error: 'Infrastructure not ready' };
      }

      try {
        let count = 0;
        for (const item of items) {
          await infra.documentStore.put(DOCUMENT_COLLECTIONS.compendiumItems, item as MasterItem & DocumentRecord);
          count += 1;
        }
        return { ok: true, count };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
      }
    },
  );

  /** Returns the count of items in the local collection. */
  ipcMain.handle(COMPENDIUM_IPC_CHANNELS.getItemCount, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return 0;

    try {
      const ids = await infra.documentStore.list(DOCUMENT_COLLECTIONS.compendiumItems);
      return ids.length;
    } catch {
      return 0;
    }
  });
}
