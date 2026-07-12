const { app, BrowserWindow, ipcMain, session, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const {
    startDesktopInfrastructure,
    stopDesktopInfrastructure,
} = require('./bootstrap/infrastructure.cjs');
const { registerDashboardIpc } = require('./bootstrap/dashboardIpc.cjs');
const { registerSyncIpc } = require('./bootstrap/syncIpc.cjs');
const { registerSrdIpc } = require('./bootstrap/srdIpc.cjs');
const { registerCompendiumIpc } = require('./bootstrap/compendiumIpc.cjs');
const { registerCampaignIpc } = require('./bootstrap/campaignIpc.cjs');

let mainWindow = null;
let apiProcess = null;

const updater = autoUpdater;

function setupAutoUpdater() {
    if (!app.isPackaged) {
        console.log('[AutoUpdate] Skipped in development.');
        return;
    }

    log.transports.file.level = 'info';
    updater.logger = log;

    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;

    updater.on('checking-for-update', () => {
        log.info('[AutoUpdate] Checking for updates…');
    });

    updater.on('update-available', (info) => {
        log.info('[AutoUpdate] Update available:', info.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-update-status', {
                status: 'available',
                version: info.version,
            });
        }
    });

    updater.on('update-not-available', (info) => {
        log.info('[AutoUpdate] App is up to date.', info?.version ?? '');
    });

    updater.on('download-progress', (progress) => {
        const pct = Math.round(progress.percent);
        log.info(`[AutoUpdate] Downloading… ${pct}%`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-update-status', {
                status: 'downloading',
                percent: pct,
            });
        }
    });

    updater.on('update-downloaded', (info) => {
        log.info('[AutoUpdate] Update downloaded:', info.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-update-status', {
                status: 'downloaded',
                version: info.version,
            });
        }

        dialog.showMessageBox({
            type: 'info',
            title: 'Update ready',
            message: `Party Manager ${info.version} was downloaded.`,
            detail: 'The update will install automatically when you close the app.',
            buttons: ['Restart now', 'Later'],
            defaultId: 0,
            cancelId: 1,
        }).then(({ response }) => {
            if (response === 0) {
                updater.quitAndInstall(false, true);
            }
        });
    });

    updater.on('error', (err) => {
        log.error('[AutoUpdate] Error:', err);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app-update-status', {
                status: 'error',
                message: err?.message ?? String(err),
            });
        }
    });

    updater.checkForUpdatesAndNotify().catch((err) => {
        log.error('[AutoUpdate] checkForUpdates failed:', err);
    });
}

function getApiPaths() {
  if (app.isPackaged) {
    return {
      entry: path.join(process.resourcesPath, 'api', 'index.js'),
      cwd: path.join(process.resourcesPath, 'api'),
      envFile: path.join(process.resourcesPath, 'api', '.env'),
    };
  }

  return {
    entry: path.join(__dirname, '../../api/index.js'),
    cwd: path.join(__dirname, '../../api'),
    envFile: path.join(__dirname, '../../api/.env'),
  };
}

function loadApiEnv() {
  const { envFile } = getApiPaths();
  const env = { ...process.env };

  if (!fs.existsSync(envFile)) return env;

  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }

  return env;
}

function startApiServer() {
  if (apiProcess) return;

  const { entry, cwd } = getApiPaths();

  if (!fs.existsSync(entry)) {
    console.error('[API] Entry not found:', entry);
    return;
  }

  const env = loadApiEnv();
  env.NODE_ENV = app.isPackaged ? 'production' : 'development';

  console.log('[API] Starting server from', entry);

  apiProcess = fork(entry, [], {
    cwd,
    env,
    stdio: 'inherit',
    silent: false,
  });

  apiProcess.on('error', (err) => {
    console.error('[API] Process error:', err);
  });

  apiProcess.on('exit', (code, signal) => {
    console.log(`[API] Process exited (code=${code}, signal=${signal})`);
    apiProcess = null;
  });
}

function stopApiServer() {
  if (!apiProcess) return;

  const proc = apiProcess;
  apiProcess = null;

  try {
    if (process.platform === 'win32') {
      proc.kill();
    } else {
      proc.kill('SIGTERM');
    }
  } catch (err) {
    console.error('[API] Failed to kill process:', err);
  }
}

function createWindow() {
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "D&D Party Manager",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[RENDER CONSOLE] ${message} (at ${path.basename(sourceId)}:${line})`);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Packaged app uses the hosted API (see shared/cloudDefaults.js / Vite DEFAULT_API_URL).
    // Local API fork is only for a future offline mode with api/.env beside the install.

    session.defaultSession.webRequest.onHeadersReceived(
        { urls: ['*://*.owlbear.rodeo/*'] },
        (details, callback) => {
            const responseHeaders = { ...details.responseHeaders };
            for (const header of Object.keys(responseHeaders)) {
                const lowerHeader = header.toLowerCase();
                if (lowerHeader === 'x-frame-options' || lowerHeader === 'content-security-policy') {
                    delete responseHeaders[header];
                }
            }
            callback({ cancel: false, responseHeaders });
        }
    );

    try {
        startDesktopInfrastructure(app);
    } catch (err) {
        console.error('[Infrastructure] Failed to start document store / Player View WebSocket:', err);
    }

    createWindow();
    registerDashboardIpc(() => mainWindow);
    registerSyncIpc();
    registerSrdIpc();
    registerCompendiumIpc();
    registerCampaignIpc();
    setupAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    stopApiServer();
    stopDesktopInfrastructure().catch((err) => {
        console.error('[Infrastructure] Shutdown error:', err);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});



ipcMain.on('vtt-open-browser', (event, { url }) => {
    shell.openExternal(url);
});
