import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { App } from 'electron';

import {
  isCloudSyncableCampaignId,
  type ISyncCampaignDocument,
  type ISyncConflictResponse,
  type ISyncLocalMeta,
  type ISyncPullResponse,
  type ISyncPushPayload,
} from '../types/sync';
import { mergeLogicBlocksById } from '../shared/utils/logicBlockUtils';

const CAMPAIGN_FILE = 'campaign.json';
const META_FILE = 'campaign.sync-meta.json';
const AUTH_TOKEN_FILE = 'sync-auth.token';
const DEFAULT_SYNC_INTERVAL_MS = 30_000;
const DEFAULT_API_URL =
  process.env.API_URL ?? 'https://rpg-party-manager-api.onrender.com';

export interface SyncServiceOptions {
  /** Electron `app.getPath('userData')` */
  userDataPath: string;
  apiUrl?: string;
  /** Returns JWT for `Authorization: Bearer`. Falls back to `sync-auth.token` in userData. */
  getAuthToken?: () => string | null;
  syncIntervalMs?: number;
}

function defaultMeta(): ISyncLocalMeta {
  return {
    isDirty: false,
    lastRemoteUpdatedAt: null,
    lastSyncAttemptAt: null,
    lastSyncError: null,
  };
}

function parseTimestamp(value: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO timestamp: ${value}`);
  }
  return ms;
}

function mergeSyncedCampaign(
  local: ISyncCampaignDocument,
  remote: ISyncPullResponse,
): ISyncCampaignDocument {
  const remoteWinsDoc = parseTimestamp(remote.updatedAt) > parseTimestamp(local.updatedAt);

  return {
    id: remote.id,
    name: remoteWinsDoc ? remote.name : local.name,
    updatedAt: remoteWinsDoc ? remote.updatedAt : local.updatedAt,
    data: remoteWinsDoc ? remote.data : local.data,
    actors: local.actors,
    logicBlocks: mergeLogicBlocksById(local.logicBlocks, remote.logicBlocks),
  };
}

async function atomicWriteJson(filePath: string, payload: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(tempPath, json, 'utf8');
  try {
    await rename(tempPath, filePath);
  } catch (err) {
    await unlink(tempPath).catch(() => undefined);
    throw err;
  }
}

/**
 * Offline-first sync between `userData/campaign.json` and MongoDB Atlas (`GET/POST /sync`).
 *
 * - **saveLocal** — immediate write + `isDirty = true`
 * - **syncRemote** — push when dirty
 * - **loadRemote** — pull when remote `updatedAt` is newer
 *
 * Initialize once from Electron main via `SyncService.createForElectron(app)`.
 */
export class SyncService {
  private static instance: SyncService | null = null;

  private readonly campaignPath: string;
  private readonly metaPath: string;
  private readonly authTokenPath: string;
  private readonly apiUrl: string;
  private readonly getAuthToken?: () => string | null;
  private readonly syncIntervalMs: number;

  private meta: ISyncLocalMeta = defaultMeta();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private metaLoaded = false;
  private inMemoryToken: string | null = null;
  private missingAuthLogged = false;
  private lastLoggedSyncError: string | null = null;

  private constructor(options: SyncServiceOptions) {
    this.campaignPath = path.join(options.userDataPath, CAMPAIGN_FILE);
    this.metaPath = path.join(options.userDataPath, META_FILE);
    this.authTokenPath = path.join(options.userDataPath, AUTH_TOKEN_FILE);
    this.apiUrl = (options.apiUrl ?? process.env.API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
    this.getAuthToken = options.getAuthToken;
    this.syncIntervalMs = options.syncIntervalMs ?? DEFAULT_SYNC_INTERVAL_MS;
  }

  static initialize(options: SyncServiceOptions): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService(options);
    }
    return SyncService.instance;
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      throw new Error('SyncService not initialized — call SyncService.createForElectron() first');
    }
    return SyncService.instance;
  }

  static createForElectron(
    app: App,
    options?: Omit<SyncServiceOptions, 'userDataPath'>,
  ): SyncService {
    const service = SyncService.initialize({
      userDataPath: app.getPath('userData'),
      ...options,
    });
    return service;
  }

  /** Whether local changes still need a push to Atlas. */
  getIsDirty(): boolean {
    return this.meta.isDirty;
  }

  getLocalMeta(): ISyncLocalMeta {
    return { ...this.meta };
  }

  /** Called from renderer via IPC after login or session restore. */
  async setAuthToken(token: string): Promise<void> {
    const trimmed = token.trim();
    if (!trimmed) {
      await this.clearAuthToken();
      return;
    }
    this.inMemoryToken = trimmed;
    this.missingAuthLogged = false;
    await mkdir(path.dirname(this.authTokenPath), { recursive: true });
    await writeFile(this.authTokenPath, trimmed, 'utf8');
    if (this.meta.isDirty) {
      void this.syncRemote();
    }
  }

  /** Called from renderer via IPC on logout. */
  async clearAuthToken(): Promise<void> {
    this.inMemoryToken = null;
    await unlink(this.authTokenPath).catch(() => undefined);
  }

  /**
   * Persists the full campaign document locally and marks it dirty for the next push.
   * Pass `{ cloudSync: false }` for local-only documents (e.g. DM dashboard sandbox).
   */
  async saveLocal(
    document: ISyncCampaignDocument,
    options?: { cloudSync?: boolean },
  ): Promise<void> {
    await this.ensureMetaLoaded();
    const payload: ISyncCampaignDocument = {
      ...document,
      updatedAt: document.updatedAt ?? new Date().toISOString(),
    };
    await atomicWriteJson(this.campaignPath, payload);
    const markDirty = options?.cloudSync !== false && isCloudSyncableCampaignId(payload.id);
    this.meta = {
      ...this.meta,
      isDirty: markDirty,
      lastSyncError: null,
    };
    await this.persistMeta();
  }


  /**
   * Reads `campaign.json` from disk. Returns `null` if the file does not exist yet.
   */
  async loadLocal(): Promise<ISyncCampaignDocument | null> {
    await this.ensureMetaLoaded();
    try {
      const raw = await readFile(this.campaignPath, 'utf8');
      return JSON.parse(raw) as ISyncCampaignDocument;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /**
   * Pulls from Atlas. If remote `updatedAt` is newer than local, overwrites `campaign.json`.
   */
  async loadRemote(): Promise<ISyncCampaignDocument | null> {
    await this.ensureMetaLoaded();
    const local = await this.loadLocal();
    if (!local?.id) {
      console.warn('[SyncService] loadRemote skipped — no local campaign id');
      return local;
    }

    if (!isCloudSyncableCampaignId(local.id)) {
      return local;
    }

    const remote = await this.fetchRemote(local.id);
    if (!remote) return local;

    const remoteMs = parseTimestamp(remote.updatedAt);
    const localMs = local ? parseTimestamp(local.updatedAt) : 0;

    if (remoteMs > localMs) {
      const merged = mergeSyncedCampaign(local, remote);
      await atomicWriteJson(this.campaignPath, merged);
      this.meta = {
        ...this.meta,
        isDirty: false,
        lastRemoteUpdatedAt: remote.updatedAt,
        lastSyncError: null,
      };
      await this.persistMeta();
      return merged;
    }

    return local;
  }

  /**
   * Pushes local document to Atlas when `isDirty`. Keeps `isDirty` on failure for retry.
   */
  async syncRemote(): Promise<boolean> {
    await this.ensureMetaLoaded();
    if (!this.meta.isDirty) return true;

    const local = await this.loadLocal();
    if (!local) {
      this.meta = { ...this.meta, isDirty: false };
      await this.persistMeta();
      return true;
    }

    if (!isCloudSyncableCampaignId(local.id)) {
      if (this.meta.isDirty) {
        this.meta = { ...this.meta, isDirty: false, lastSyncError: null };
        await this.persistMeta();
      }
      return true;
    }

    const token = await this.resolveAuthToken();
    if (!token) {
      await this.recordSyncFailure('Missing auth token — log in before syncing');
      return false;
    }

    const body: ISyncPushPayload = {
      id: local.id,
      name: local.name,
      updatedAt: local.updatedAt,
      data: local.data,
      logicBlocks: local.logicBlocks,
    };

    try {
      const res = await fetch(`${this.apiUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const conflict = (await res.json()) as ISyncConflictResponse;
        if (conflict.document) {
          const remoteMs = parseTimestamp(conflict.document.updatedAt);
          const localMs = parseTimestamp(local.updatedAt);
          if (remoteMs > localMs) {
            await this.applyRemoteDocument(conflict.document);
            return true;
          }
        }
        await this.recordSyncFailure('Remote campaign is newer — pull before pushing');
        return false;
      }

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        await this.recordSyncFailure(errBody.error ?? `POST /sync failed (${res.status})`);
        return false;
      }

      const saved = (await res.json()) as ISyncPullResponse;
      this.meta = {
        ...this.meta,
        isDirty: false,
        lastRemoteUpdatedAt: saved.updatedAt,
        lastSyncAttemptAt: new Date().toISOString(),
        lastSyncError: null,
      };
      await this.persistMeta();
      this.lastLoggedSyncError = null;
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.recordSyncFailure(message);
      return false;
    }
  }

  /**
   * Startup hook: pull if remote is newer, then push if still dirty, then schedule retries.
   */
  async bootstrap(): Promise<void> {
    await this.ensureMetaLoaded();
    await this.loadRemote().catch((err) => {
      console.warn('[SyncService] loadRemote on bootstrap failed:', err);
    });
    await this.syncRemote().catch((err) => {
      console.warn('[SyncService] syncRemote on bootstrap failed:', err);
    });
    this.startAutoSync();
  }

  /** Retries `syncRemote` every 30s (configurable) while `isDirty`. */
  startAutoSync(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      void this.syncRemote();
    }, this.syncIntervalMs);
  }

  stopAutoSync(): void {
    if (!this.intervalHandle) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  private async ensureMetaLoaded(): Promise<void> {
    if (this.metaLoaded) return;
    try {
      const raw = await readFile(this.metaPath, 'utf8');
      this.meta = { ...defaultMeta(), ...(JSON.parse(raw) as ISyncLocalMeta) };
    } catch (err: unknown) {
      if (!isNodeError(err) || err.code !== 'ENOENT') throw err;
      this.meta = defaultMeta();
      await this.persistMeta();
    }
    this.metaLoaded = true;
  }

  private async persistMeta(): Promise<void> {
    await atomicWriteJson(this.metaPath, this.meta);
  }

  private async recordSyncFailure(message: string): Promise<void> {
    this.meta = {
      ...this.meta,
      isDirty: true,
      lastSyncAttemptAt: new Date().toISOString(),
      lastSyncError: message,
    };
    await this.persistMeta();
    if (message.includes('Missing auth token')) {
      if (!this.missingAuthLogged) {
        console.warn('[SyncService]', message);
        this.missingAuthLogged = true;
      }
      return;
    }
    this.missingAuthLogged = false;
    if (message === this.lastLoggedSyncError) return;
    this.lastLoggedSyncError = message;
    console.warn('[SyncService]', message);
  }

  private async resolveAuthToken(): Promise<string | null> {
    if (this.inMemoryToken) return this.inMemoryToken;
    const fromCallback = this.getAuthToken?.();
    if (fromCallback) return fromCallback;

    try {
      const token = (await readFile(this.authTokenPath, 'utf8')).trim();
      return token || null;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  private async fetchRemote(campaignId: string): Promise<ISyncPullResponse | null> {
    const token = await this.resolveAuthToken();
    if (!token) {
      if (!this.missingAuthLogged) {
        console.warn('[SyncService] loadRemote skipped — missing auth token');
        this.missingAuthLogged = true;
      }
      return null;
    }

    const url = new URL(`${this.apiUrl}/sync`);
    url.searchParams.set('campaignId', campaignId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error ?? `GET /sync failed (${res.status})`);
    }

    return res.json() as Promise<ISyncPullResponse>;
  }

  private async applyRemoteDocument(remote: ISyncPullResponse): Promise<void> {
    const local = (await this.loadLocal()) ?? {
      id: remote.id,
      name: remote.name,
      updatedAt: remote.updatedAt,
      data: remote.data,
    };
    const merged = mergeSyncedCampaign(local, remote);
    await atomicWriteJson(this.campaignPath, merged);
    this.meta = {
      ...this.meta,
      isDirty: false,
      lastRemoteUpdatedAt: merged.updatedAt,
      lastSyncError: null,
    };
    await this.persistMeta();
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return typeof err === 'object' && err !== null && 'code' in err;
}

/** Singleton accessor — prefer after `SyncService.createForElectron()`. */
export function getSyncService(): SyncService {
  return SyncService.getInstance();
}
