const { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
let vttView = null;

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

    // Check if we are in development mode by seeing if an environment variable is set
    // When running `wait-on tcp:5173 && electron .`, Vite is running on localhost:5173
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
    // Intercept response headers to remove x-frame-options and content-security-policy for Owlbear Rodeo
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

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers for VTT View
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
