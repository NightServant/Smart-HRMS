'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Minimal, explicit bridge exposed to splash.html. No general ipcRenderer
// access is leaked to the renderer.
contextBridge.exposeInMainWorld('shrms', {
    // Splash -> main: user asked to retry the connection.
    retry: () => ipcRenderer.send('wake:retry'),

    // main -> splash: staged progress updates during the wake sequence.
    onStatus: (cb) =>
        ipcRenderer.on('wake:status', (_e, payload) => cb(payload)),

    // main -> splash: no internet connection detected.
    onOffline: (cb) => ipcRenderer.on('wake:offline', (_e, payload) => cb(payload)),

    // main -> splash: server did not wake in time / other failure.
    onError: (cb) => ipcRenderer.on('wake:error', (_e, payload) => cb(payload)),
});
