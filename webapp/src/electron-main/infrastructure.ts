import type { App } from 'electron';
import path from 'node:path';

import { FileSystemDocumentStore } from '../services/persistence/FileSystemDocumentStore';
import { PlayerViewService } from '../services/PlayerViewService';
import { SyncService } from '../services/SyncService';
import { WebSocketServer } from '../services/WebSocketServer';
import { SyncQueueService } from './SyncQueueService';
import { CompendiumSyncManager } from './compendiumSyncManager';
import type { IDocumentStore } from '../services/persistence/IDocumentStore';

export interface DesktopInfrastructure {
  documentStore: IDocumentStore;
  webSocketServer: WebSocketServer;
  playerViewService: PlayerViewService;
  syncService: SyncService;
  syncQueueService: SyncQueueService;
  compendiumSyncManager: CompendiumSyncManager;
}

let infrastructure: DesktopInfrastructure | null = null;

const DEFAULT_PLAYER_VIEW_PORT = 8765;

/**
 * Bootstraps document persistence (JSON files in userData) and the local Player View WebSocket.
 * Called from Electron main process on app ready.
 */
export function startDesktopInfrastructure(app: App): DesktopInfrastructure {
  if (infrastructure) return infrastructure;

  const documentsPath = path.join(app.getPath('userData'), 'documents');
  const documentStore = new FileSystemDocumentStore({
    basePath: documentsPath,
    prettyPrint: !app.isPackaged,
  });

  const port = Number.parseInt(
    process.env.PLAYER_VIEW_WS_PORT ?? String(DEFAULT_PLAYER_VIEW_PORT),
    10,
  );

  const emptySnapshot = () => ({
    schemaVersion: 1,
    actors: [],
    broadcastAt: new Date().toISOString(),
  });

  const webSocketServer = new WebSocketServer({
    port,
    getSnapshot: emptySnapshot,
  });

  const playerViewService = new PlayerViewService(webSocketServer);

  const syncService = SyncService.createForElectron(app);
  void syncService.bootstrap().catch((err) => {
    console.error('[SyncService] Bootstrap failed:', err);
  });

  const syncQueueService = new SyncQueueService();
  const compendiumSyncManager = new CompendiumSyncManager();

  console.log(`[Documents] Store path: ${documentsPath}`);
  console.log(`[PlayerView] WebSocket listening on ws://127.0.0.1:${port}`);
  console.log(`[SyncService] Local campaign file: ${app.getPath('userData')}/campaign.json`);

  infrastructure = { 
    documentStore, 
    webSocketServer, 
    playerViewService, 
    syncService,
    syncQueueService,
    compendiumSyncManager
  };

  // Trigger master data sync after short delay
  setTimeout(() => {
    compendiumSyncManager.initializeCompendium().catch(console.error);
  }, 1000);

  return infrastructure;
}

export async function stopDesktopInfrastructure(): Promise<void> {
  if (!infrastructure) return;
  infrastructure.syncService.stopAutoSync();
  await infrastructure.webSocketServer.close();
  infrastructure = null;
}

export function getDesktopInfrastructure(): DesktopInfrastructure | null {
  return infrastructure;
}
