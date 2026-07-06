import { ipcMain } from 'electron';

import { getDesktopInfrastructure } from './infrastructure';

const SYNC_CHANNELS = {
  setAuthToken: 'sync:set-auth-token',
  clearAuthToken: 'sync:clear-auth-token',
} as const;

export function registerSyncIpc(): void {
  ipcMain.handle(SYNC_CHANNELS.setAuthToken, async (_event, token: string) => {
    const infra = getDesktopInfrastructure();
    if (!infra) return { ok: false, error: 'Infrastructure not ready' };
    await infra.syncService.setAuthToken(token);
    return { ok: true };
  });

  ipcMain.handle(SYNC_CHANNELS.clearAuthToken, async () => {
    const infra = getDesktopInfrastructure();
    if (!infra) return { ok: false, error: 'Infrastructure not ready' };
    await infra.syncService.clearAuthToken();
    return { ok: true };
  });
}
