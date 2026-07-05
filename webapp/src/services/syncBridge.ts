const SYNC_IPC_CHANNELS = {
  setAuthToken: 'sync:set-auth-token',
  clearAuthToken: 'sync:clear-auth-token',
} as const;

function getIpcRenderer():
  | { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> }
  | null {
  if (typeof window === 'undefined' || !window.require) return null;
  try {
    return window.require('electron').ipcRenderer;
  } catch {
    return null;
  }
}

export function isElectronSyncAvailable(): boolean {
  return getIpcRenderer() !== null;
}

/** Push JWT from renderer localStorage to Electron main for SyncService. */
export function pushAuthTokenToSync(token: string): void {
  const ipc = getIpcRenderer();
  if (!ipc || !token.trim()) return;
  void ipc.invoke(SYNC_IPC_CHANNELS.setAuthToken, token);
}

/** Remove JWT from Electron main on logout. */
export function clearAuthTokenFromSync(): void {
  const ipc = getIpcRenderer();
  if (!ipc) return;
  void ipc.invoke(SYNC_IPC_CHANNELS.clearAuthToken);
}

/** Re-send stored token after session restore (Electron only). */
export function syncAuthFromStorage(getToken: () => string | null): void {
  const token = getToken();
  if (token) {
    pushAuthTokenToSync(token);
  } else {
    clearAuthTokenFromSync();
  }
}
