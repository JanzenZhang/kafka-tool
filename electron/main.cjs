const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const kafkaService = require('./kafkaService.cjs');

const store = new Store({
    name: 'kafka-tool-config',
    defaults: {
        connections: [],
    },
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 960,
        minHeight: 640,
        backgroundColor: '#0f1117',
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '../build/icon.png'),
    });

    // In production, load the built HTML file
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    } else {
        // In development, load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
    }

    // On macOS, set the dock icon explicitly for local development
    if (process.platform === 'darwin' && !app.isPackaged) {
        app.dock.setIcon(path.join(__dirname, '../build/icon.png'));
    }
}

// ──── Connection IPC Handlers ────

ipcMain.handle('connections:getAll', () => {
    return store.get('connections');
});

ipcMain.handle('connections:save', (_event, conn) => {
    const connections = store.get('connections');
    const idx = connections.findIndex((c) => c.id === conn.id);
    if (idx >= 0) {
        connections[idx] = conn;
    } else {
        connections.push(conn);
    }
    store.set('connections', connections);
    return conn;
});

ipcMain.handle('connections:delete', (_event, id) => {
    const connections = store.get('connections').filter((c) => c.id !== id);
    store.set('connections', connections);
    kafkaService.disconnect(id).catch(() => { });
    return connections;
});

ipcMain.handle('connections:test', async (_event, config) => {
    return await kafkaService.testConnection(config);
});

ipcMain.handle('connections:connect', async (_event, id) => {
    const connections = store.get('connections');
    const conn = connections.find((c) => c.id === id);
    if (!conn) return { success: false, error: 'Connection not found' };
    return await kafkaService.connect(id, conn);
});

ipcMain.handle('connections:disconnect', async (_event, id) => {
    await kafkaService.disconnect(id);
    return { success: true };
});

// ──── Topics IPC Handlers ────

ipcMain.handle('topics:list', async (_event, connId) => {
    try {
        return { success: true, topics: await kafkaService.listTopics(connId) };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ──── Producer IPC Handlers ────

ipcMain.handle('producer:send', async (_event, connId, topic, key, value) => {
    try {
        const result = await kafkaService.produce(connId, topic, key, value);
        return result;
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ──── Consumer IPC Handlers ────

ipcMain.handle('consumer:start', async (_event, connId, topic, groupId) => {
    try {
        const connections = store.get('connections');
        const connConfig = connections.find((c) => c.id === connId);
        if (!connConfig) return { success: false, error: 'Connection not found' };

        const result = await kafkaService.startConsumer(
            connId,
            connConfig,
            topic,
            groupId,
            (message) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('consumer:message', message);
                }
            }
        );
        return { ...result, consumerKey: `group:${topic}:${groupId}` };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('consumer:browse', async (_event, connId, topic, startFrom) => {
    try {
        const connections = store.get('connections');
        const connConfig = connections.find((c) => c.id === connId);
        if (!connConfig) return { success: false, error: 'Connection not found' };

        const result = await kafkaService.startBrowseConsumer(
            connId,
            connConfig,
            topic,
            startFrom,
            (message) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('consumer:message', message);
                }
            }
        );
        return { ...result, consumerKey: `browse:${topic}` };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('consumer:stop', async (_event, connId, consumerKey) => {
    try {
        await kafkaService.stopConsumer(connId, consumerKey);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ──── App Lifecycle ────

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
    await kafkaService.disconnectAll();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
