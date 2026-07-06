import type {
  Actor,
  IDmBroadcastResult,
  IDmDashboardBridge,
  IDmSyncStatus,
  IDmVttStatus,
  LogicBlock,
} from '../types/dashboard';
import { DM_IPC_CHANNELS } from '../types/dashboard';

function getIpcRenderer():
  | { invoke: (channel: string, ...args: unknown[]) => Promise<unknown>; on: (ch: string, fn: () => void) => void; off: (ch: string, fn: () => void) => void }
  | null {
  if (typeof window === 'undefined' || !window.require) return null;
  try {
    return window.require('electron').ipcRenderer;
  } catch {
    return null;
  }
}

class ElectronDmDashboardBridge implements IDmDashboardBridge {
  isAvailable(): boolean {
    return getIpcRenderer() !== null;
  }

  private invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    const ipc = getIpcRenderer();
    if (!ipc) {
      return Promise.reject(new Error('DM Dashboard requires the Electron desktop app'));
    }
    return ipc.invoke(channel, ...args) as Promise<T>;
  }

  listActors(): Promise<Actor[]> {
    return this.invoke<Actor[]>(DM_IPC_CHANNELS.listActors);
  }

  saveActor(actor: Actor): Promise<Actor[]> {
    return this.invoke<Actor[]>(DM_IPC_CHANNELS.saveActor, actor);
  }

  seedActors(): Promise<Actor[]> {
    return this.invoke<Actor[]>(DM_IPC_CHANNELS.seedActors);
  }

  getVttStatus(): Promise<IDmVttStatus> {
    return this.invoke<IDmVttStatus>(DM_IPC_CHANNELS.getVttStatus);
  }

  simulateBroadcast(actorId: string): Promise<IDmBroadcastResult> {
    return this.invoke<IDmBroadcastResult>(DM_IPC_CHANNELS.simulateBroadcast, actorId);
  }

  getSyncStatus(): Promise<IDmSyncStatus> {
    return this.invoke<IDmSyncStatus>(DM_IPC_CHANNELS.getSyncStatus);
  }

  listLogicBlocks(): Promise<LogicBlock[]> {
    return this.invoke<LogicBlock[]>(DM_IPC_CHANNELS.listLogicBlocks);
  }

  saveLogicBlocks(blocks: LogicBlock[]): Promise<LogicBlock[]> {
    return this.invoke<LogicBlock[]>(DM_IPC_CHANNELS.saveLogicBlocks, blocks);
  }

  onActorsUpdated(listener: () => void): () => void {
    const ipc = getIpcRenderer();
    if (!ipc) return () => undefined;
    const channel = DM_IPC_CHANNELS.actorsUpdated;
    ipc.on(channel, listener);
    return () => ipc.off(channel, listener);
  }
}

export const dmDashboardBridge: IDmDashboardBridge = new ElectronDmDashboardBridge();

export function isElectronDashboardAvailable(): boolean {
  return dmDashboardBridge.isAvailable();
}
