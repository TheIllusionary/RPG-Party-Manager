const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let mainWindow = null;
let vttView = null;
let apiProcess = null;

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
        if (vttView) {
            vttView = null;
        }
    });
}

app.whenReady().then(() => {
    if (app.isPackaged) {
        startApiServer();
    }

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

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    stopApiServer();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('vtt-toggle-visibility', (event, { visible }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    if (visible) {
        if (!vttView) {
            vttView = new WebContentsView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            vttView.webContents.on('did-start-loading', () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('vtt-loading-status', { loading: true });
                }
            });

            vttView.webContents.on('did-stop-loading', () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('vtt-loading-status', { loading: false });
                }
            });

            vttView.webContents.on('before-input-event', (event, input) => {
                if (input.type === 'keyDown' && input.key === 'Escape') {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('vtt-exit-fullscreen');
                    }
                }
            });

            vttView.webContents.loadURL('https://owlbear.rodeo');
        }

        try {
            win.contentView.addChildView(vttView);
        } catch (e) {
            // Already added as a child view
        }
        vttView.setVisible(true);
    } else {
        if (vttView) {
            vttView.setVisible(false);
            try {
                vttView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
                win.contentView.removeChildView(vttView);
            } catch (e) {
                // Not a child view or already removed
            }
        }
    }
});

ipcMain.on('vtt-update-bounds', (event, bounds) => {
    if (vttView) {
        vttView.setBounds({
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height)
        });
    }
});

ipcMain.on('vtt-load-url', (event, { url }) => {
    if (vttView) {
        vttView.webContents.loadURL(url);
    }
});

ipcMain.on('vtt-reload', () => {
    if (vttView) {
        vttView.webContents.reload();
    }
});

ipcMain.on('vtt-open-browser', (event, { url }) => {
    shell.openExternal(url);
});
