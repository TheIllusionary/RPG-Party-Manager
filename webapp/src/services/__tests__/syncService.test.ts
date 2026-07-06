import { describe, it, expect } from 'vitest';
import { resolveConflict } from '../syncService';
import type { IBaseRecord } from '../db';

describe('syncService Conflict Resolution', () => {
    describe('resolveConflict', () => {
        it('should return server_wins if local does not exist and server is not deleted', () => {
            const server: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 100, isDeleted: false };
            expect(resolveConflict(null, server)).toBe('server_wins');
        });

        it('should return skip if local does not exist and server IS deleted (no zombie creation)', () => {
            const server: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 100, isDeleted: true };
            expect(resolveConflict(null, server)).toBe('skip');
        });

        it('should return server_wins if server is newer', () => {
            const local: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 50 };
            const server: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 100 };
            expect(resolveConflict(local, server)).toBe('server_wins');
        });

        it('should return local_wins if local is newer', () => {
            const local: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 150 };
            const server: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 100 };
            expect(resolveConflict(local, server)).toBe('local_wins');
        });

        it('should return local_wins for Zombie Record scenario (local deleted but newer)', () => {
            // Local record was soft-deleted while offline (updatedAt: 200)
            const local: IBaseRecord = { id: 'zombie1', campaignId: 'c1', updatedAt: 200, isDeleted: true };
            // Server still has the old active record (updatedAt: 150)
            const server: IBaseRecord = { id: 'zombie1', campaignId: 'c1', updatedAt: 150, isDeleted: false };
            
            // local_wins ensures that the server doesn't overwrite our local tombstone, 
            // and the push phase will send the tombstone to the server to process the deletion.
            expect(resolveConflict(local, server)).toBe('local_wins');
        });

        it('should return skip if timestamps are identical', () => {
            const local: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 100 };
            const server: IBaseRecord = { id: '1', campaignId: 'c1', updatedAt: 100 };
            expect(resolveConflict(local, server)).toBe('skip');
        });
    });
});
