import db, { type IBaseRecord } from './db';
import { request } from './api';

export function resolveConflict<T extends IBaseRecord>(local: T | undefined | null, server: T): 'server_wins' | 'local_wins' | 'skip' {
    if (!local) {
        if (server.isDeleted) return 'skip'; // Server deleted a record we don't even have
        return 'server_wins';
    }
    if (server.updatedAt > local.updatedAt) return 'server_wins';
    if (local.updatedAt > server.updatedAt) return 'local_wins';
    return 'skip';
}

export class SyncService {
    async getLastSyncTime(): Promise<number> {
        const record = await db.campaignState.get('dexie_last_sync');
        return record ? parseInt(record.data || '0', 10) : 0;
    }

    async setLastSyncTime(time: number): Promise<void> {
        await db.campaignState.put({
            id: 'dexie_last_sync',
            campaignId: 'global',
            type: 'globalSettings',
            data: time.toString(),
            updatedAt: Date.now()
        });
    }

    async fetchServerChanges(since: number): Promise<Record<string, any[]>> {
        return request<Record<string, any[]>>(`/sync/pull?since=${since}`);
    }

    async pushLocalChanges(changes: Record<string, any[]>): Promise<void> {
        await request<void>('/sync/push', {
            method: 'POST',
            body: JSON.stringify(changes)
        });
    }

    async getLocalChanges(since: number): Promise<Record<string, any[]>> {
        const changes: Record<string, any[]> = {};
        const tables = ['players', 'library', 'buffs', 'subclasses', 'items', 'campaignState'] as const;
        
        for (const tableName of tables) {
            const table = db.table(tableName);
            const records = await table.where('updatedAt').above(since).toArray();
            if (records.length > 0) {
                changes[tableName] = records;
            }
        }
        return changes;
    }

    async sync() {
        try {
            const lastSync = await this.getLastSyncTime();
            
            // 1. Fetch server changes since last sync
            const serverData = await this.fetchServerChanges(lastSync);
            
            // 2. Fetch local changes since last sync (before applying server changes)
            const localData = await this.getLocalChanges(lastSync);
            
            const tables = ['players', 'library', 'buffs', 'subclasses', 'items', 'campaignState'] as const;
            let highestTimestamp = lastSync;

            for (const tableName of tables) {
                const serverRecords = serverData[tableName] || [];
                let localRecords = localData[tableName] || [];
                const table = db.table(tableName);

                for (const serverRec of serverRecords) {
                    highestTimestamp = Math.max(highestTimestamp, serverRec.updatedAt);
                    
                    const localRecIndex = localRecords.findIndex(r => r.id === serverRec.id);
                    const localRec = localRecIndex !== -1 ? localRecords[localRecIndex] : await table.get(serverRec.id);
                    
                    const resolution = resolveConflict(localRec, serverRec);
                    
                    if (resolution === 'server_wins') {
                        // Apply server changes locally
                        await table.put(serverRec);
                        // If it was in localData, remove it so we don't echo back
                        if (localRecIndex !== -1) {
                            localRecords.splice(localRecIndex, 1);
                        }
                    } else if (resolution === 'local_wins') {
                        // Keep in localData to be pushed, don't overwrite local DB
                        if (localRecIndex === -1 && localRec) {
                             localRecords.push(localRec);
                        }
                    } else {
                        // skip
                        if (localRecIndex !== -1) {
                            localRecords.splice(localRecIndex, 1);
                        }
                    }
                }
            }

            // 3. Push remaining local changes
            const hasLocalChanges = tables.some(t => localData[t] && localData[t].length > 0);
            if (hasLocalChanges) {
                await this.pushLocalChanges(localData);
                for (const tableName of tables) {
                    for (const rec of (localData[tableName] || [])) {
                        highestTimestamp = Math.max(highestTimestamp, rec.updatedAt);
                    }
                }
            }
            
            await this.setLastSyncTime(highestTimestamp);
        } catch (e) {
            console.error('Sync failed', e);
        }
    }
}
