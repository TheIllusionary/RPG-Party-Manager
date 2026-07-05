/** Game state payload inside sync documents — defined here to avoid circular imports. */
export type ISyncGameData = import('./index').IAppData;

/** ISO-8601 timestamp used for offline-first conflict resolution. */
export type SyncTimestamp = string;

/** Campaign ids that exist only on disk (DM dashboard sandbox) — never push to Atlas. */
export const LOCAL_ONLY_CAMPAIGN_IDS = ['dm-dashboard-test'] as const;

const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Whether `id` can be synced via `GET/POST /sync` (valid Mongo ObjectId, not local-only). */
export function isCloudSyncableCampaignId(id: string | undefined | null): boolean {
  if (!id) return false;
  if ((LOCAL_ONLY_CAMPAIGN_IDS as readonly string[]).includes(id)) return false;
  return MONGO_OBJECT_ID_RE.test(id);
}

/**
 * Campaign document synced between local `campaign.json` and MongoDB Atlas.
 * `data` holds the full game state (`IAppData` shape).
 */
export interface ISyncCampaignDocument {
  id: string;
  name: string;
  updatedAt: SyncTimestamp;
  data: ISyncGameData;
  /** Optional actor documents for desktop dashboard / document sync. */
  actors?: import('./domain').Actor[];
  /** Homebrew logic blocks edited in the Visual Rules Editor. */
  logicBlocks?: import('./domain').LogicBlock[];
}

/** Local-only metadata — stored in `campaign.sync-meta.json`, never sent to the API. */
export interface ISyncLocalMeta {
  isDirty: boolean;
  lastRemoteUpdatedAt: SyncTimestamp | null;
  lastSyncAttemptAt: SyncTimestamp | null;
  lastSyncError: string | null;
}

export interface ISyncPushPayload {
  id: string;
  name: string;
  updatedAt: SyncTimestamp;
  data: ISyncGameData;
  /** Homebrew logic blocks (includes soft-deleted tombstones). */
  logicBlocks?: import('./domain').LogicBlock[];
}

export interface ISyncPullResponse {
  id: string;
  name: string;
  updatedAt: SyncTimestamp;
  data: ISyncGameData;
  logicBlocks?: import('./domain').LogicBlock[];
}

export interface ISyncConflictResponse {
  error: 'Conflict';
  document: ISyncPullResponse;
}
