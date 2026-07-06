import { net } from 'electron';
import { randomUUID } from 'crypto';
import { getDesktopInfrastructure } from './infrastructure';
import { DOCUMENT_COLLECTIONS, type DocumentRecord } from '../services/persistence/IDocumentStore';

export interface ISyncQueueEntry extends DocumentRecord {
  id: string;             // UUID of the sync job
  method: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;       // Cloud API route (e.g., `/api/homebrew/spells`)
  payload: any;           // The serialized Homebrew entity
  entityId: string;       // Target ID
  campaignId: string;
  createdAt: string;
  retryCount: number;
}

export class SyncQueueService {
  private isFlushing = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (net.online) {
      setTimeout(() => this.flushQueue(), 5000);
    }
  }

  /**
   * Called by the frontend or main process when it detects network recovery.
   */
  public triggerFlush() {
    this.flushQueue();
  }

  /**
   * Serializes a mutation to the local Sync Queue.
   */
  public async enqueue(entry: Omit<ISyncQueueEntry, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    const infra = getDesktopInfrastructure();
    if (!infra) return;

    const fullEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    } as ISyncQueueEntry;

    try {
      await infra.documentStore.put(DOCUMENT_COLLECTIONS.syncQueue, fullEntry);
      console.log(`[SyncQueue] Enqueued ${entry.method} to ${entry.endpoint}`);
      
      // Attempt immediate flush if online
      if (net.isOnline()) {
        this.flushQueue();
      }
    } catch (err) {
      console.error('[SyncQueue] Failed to enqueue:', err);
    }
  }

  /**
   * Processes all pending operations sequentially.
   */
  public async flushQueue(): Promise<void> {
    if (this.isFlushing || !net.isOnline()) return;
    this.isFlushing = true;

    const infra = getDesktopInfrastructure();
    if (!infra) {
      this.isFlushing = false;
      return;
    }

    try {
      const entries = await infra.documentStore.query<ISyncQueueEntry>(DOCUMENT_COLLECTIONS.syncQueue);
      if (entries.length === 0) {
        this.isFlushing = false;
        return;
      }

      // Sort oldest first
      entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      console.log(`[SyncQueue] Flushing ${entries.length} entries...`);

      for (const entry of entries) {
        if (!net.isOnline()) break; // Halts if connection lost mid-flush

        try {
          // Attempt push
          const success = await this.pushToCloud(entry);
          if (success) {
            await infra.documentStore.delete(DOCUMENT_COLLECTIONS.syncQueue, entry.id);
            console.log(`[SyncQueue] Successfully synced ${entry.id}`);
          } else {
            // Increment retry count
            entry.retryCount += 1;
            await infra.documentStore.put(DOCUMENT_COLLECTIONS.syncQueue, entry);
            console.warn(`[SyncQueue] Failed to sync ${entry.id}, retry count: ${entry.retryCount}`);
            break; // Halt on first failure to maintain sequence
          }
        } catch (err) {
           console.error(`[SyncQueue] Error processing entry ${entry.id}:`, err);
           entry.retryCount += 1;
           await infra.documentStore.put(DOCUMENT_COLLECTIONS.syncQueue, entry);
           break; // Halt sequence
        }
      }
    } catch (err) {
      console.error('[SyncQueue] Failed to read queue:', err);
    } finally {
      this.isFlushing = false;
    }
  }

  private async pushToCloud(entry: ISyncQueueEntry): Promise<boolean> {
    // In a real implementation, this would use node-fetch or similar
    // to call the cloud API using the user's stored auth token.
    // For now, we simulate success since the API is pending.
    console.log(`[SyncQueue] FAKE push ${entry.method} ${entry.endpoint}`);
    return true; 
  }
}
