'use strict';

const {
    app,
    BrowserWindow,
    shell,
    ipcMain,
} = require('electron');
const path = require('path');
const { waitForServer, SERVER_URL } = require('./lib/wake');

const SPLASH_SIZE = { width: 460, height: 340 };
const MAIN_SIZE = { width: 1280, height: 800, minWidth: 1024, minHeight: 700 };

let splashWindow = null;
let mainWindow = null;
// Guards against overlapping wake sequences triggered by rapid Retry clicks.
let wakeInFlight = false;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: SPLASH_SIZE.width,
        height: SPLASH_SIZE.height,
        frame: false,
        resizable: false,
        movable: true,
        center: true,
        show: false,
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.once('ready-to-show', () => {
        splashWindow.show();
    });
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

/**
 * Push a status update to the splash renderer.
 */
function sendSplash(channel, payload) {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send(channel, payload);
    }
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: MAIN_SIZE.width,
        height: MAIN_SIZE.height,
        minWidth: MAIN_SIZE.minWidth,
        minHeight: MAIN_SIZE.minHeight,
        show: false,
        backgroundColor: '#ffffff',
        title: 'Smart HRMS',
        icon: path.join(__dirname, 'build', 'icon.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Open target=_blank / external-origin links in the system browser.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
            shell.openExternal(url);
        } catch (_err) {
            /* ignore */
        }
        return { action: 'deny' };
    });

    // Keep navigation to a different origin inside the system browser.
    mainWindow.webContents.on('will-navigate', (event, url) => {
        try {
            const target = new URL(url);
            const base = new URL(SERVER_URL);
            if (target.origin !== base.origin) {
                event.preventDefault();
                shell.openExternal(url);
            }
        } catch (_err) {
            /* ignore malformed URLs */
        }
    });

    // If the page itself fails to load, show an in-app retry screen instead
    // of a blank white window. errorCode -3 is an aborted request (e.g. a
    // redirect) and is not a real failure.
    mainWindow.webContents.on(
        'did-fail-load',
        (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
            if (!isMainFrame || errorCode === -3) {
                return;
            }
            loadMainErrorPage(errorDescription || 'The page failed to load.');
        },
    );

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

/**
 * Render a self-contained retry page inside the main window when the live
 * site fails to load. The Retry button re-loads the server URL.
 */
function loadMainErrorPage(message) {
    const safe = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
    background:#0f172a;color:#e2e8f0;text-align:center;padding:24px}
  .card{max-width:460px}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#94a3b8;line-height:1.5;margin:0 0 20px}
  button{background:#2563eb;color:#fff;border:0;border-radius:8px;
    padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer}
  button:hover{background:#1d4ed8}
  .icon{font-size:44px;margin-bottom:12px}
</style></head><body>
  <div class="card">
    <div class="icon">&#9888;&#65039;</div>
    <h1>Unable to load Smart HRMS</h1>
    <p>${safe}<br>Please check your connection and try again.</p>
    <button onclick="location.href='${SERVER_URL}'">Retry</button>
  </div>
</body></html>`;
    mainWindow.loadURL(
        'data:text/html;charset=utf-8,' + encodeURIComponent(html),
    );
}

/**
 * Swap from the splash window to the fully loaded main window.
 */
function showMainWindow() {
    const win = createMainWindow();

    let swapped = false;
    const swap = () => {
        if (swapped) {
            return;
        }
        swapped = true;
        win.show();
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
    };

    // Prefer swapping once the real content has painted.
    win.webContents.once('did-finish-load', swap);
    // Safety net: if did-finish-load never fires, swap after a timeout so the
    // user is never stuck on the splash. did-fail-load handler covers errors.
    setTimeout(swap, 30000);

    win.loadURL(SERVER_URL);
}

/**
 * Run the connectivity gate + cold-start wake sequence, driving the splash UI.
 */
async function runWakeSequence() {
    if (wakeInFlight) {
        return;
    }
    wakeInFlight = true;

    sendSplash('wake:status', {
        phase: 'connecting',
        elapsedMs: 0,
        attempt: 0,
    });

    let result;
    try {
        result = await waitForServer({
            fetchImpl: (...args) => fetch(...args),
            onStatus: (s) => sendSplash('wake:status', s),
        });
    } catch (err) {
        result = { ok: false, reason: 'timeout', error: String(err) };
    }

    wakeInFlight = false;

    if (result.ok) {
        sendSplash('wake:status', { phase: 'launching', elapsedMs: 0 });
        showMainWindow();
    } else if (result.reason === 'offline') {
        sendSplash('wake:offline', {});
    } else {
        sendSplash('wake:error', { reason: result.reason });
    }
}

// Retry from the splash (offline or timeout state).
ipcMain.on('wake:retry', () => {
    if (!wakeInFlight) {
        runWakeSequence();
    }
});

app.whenReady().then(() => {
    createSplashWindow();
    // Give the splash a beat to paint before the first probe.
    setTimeout(runWakeSequence, 400);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createSplashWindow();
            setTimeout(runWakeSequence, 400);
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
