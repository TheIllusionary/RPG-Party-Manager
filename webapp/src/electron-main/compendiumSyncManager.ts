import { net } from 'electron';
import { getDesktopInfrastructure } from './infrastructure';
import { DOCUMENT_COLLECTIONS } from '../services/persistence/IDocumentStore';

export class CompendiumSyncManager {
  /**
   * Initializes the Compendium. If the local compendium is empty,
   * it will attempt to fetch from the MongoDB API and write locally.
   */
  public async initializeCompendium(): Promise<void> {
    const infra = getDesktopInfrastructure();
    if (!infra) return;

    try {
      const spellIds = await infra.documentStore.list(DOCUMENT_COLLECTIONS.compendiumSpells);
      const itemIds = await infra.documentStore.list(DOCUMENT_COLLECTIONS.compendiumItems);

      if (spellIds.length === 0 && itemIds.length === 0) {
        console.log('[CompendiumSync] Local master data empty. Downloading from Cloud API...');
        
        if (!net.isOnline()) {
          console.warn('[CompendiumSync] Cannot download master data: Offline.');
          return;
        }

        await this.downloadMasterData(infra.documentStore);
      } else {
        console.log(`[CompendiumSync] Master data present (${spellIds.length} spells, ${itemIds.length} items). Skipping download.`);
      }
    } catch (err) {
      console.error('[CompendiumSync] Failed to initialize:', err);
    }
  }

  private async downloadMasterData(_store: any): Promise<void> {
    // In a real implementation, this would fetch from the Cloud API.
    // For now, it logs since the cloud endpoints are pending implementation.
    console.log('[CompendiumSync] FAKE download from /api/compendium/spells and /api/compendium/items');
    // Example logic:
    // const res = await fetch('...');
    // const data = await res.json();
    // for (const doc of data) {
    //   await store.put(collection, doc);
    // }
  }
}
