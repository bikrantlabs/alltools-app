"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const isDev = !electron_1.app.isPackaged;
function createWindow() {
    const window = new electron_1.BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 960,
        minHeight: 640,
        backgroundColor: '#f7f8fa',
        webPreferences: {
            preload: node_path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });
    void window.loadFile(node_path_1.default.join(__dirname, 'renderer', 'index.html'));
    if (isDev)
        window.webContents.openDevTools({ mode: 'detach' });
}
electron_1.ipcMain.handle('catalog:list', async () => {
    const candidates = [
        node_path_1.default.resolve(__dirname, '..', '..', 'alltools-plugins', 'catalog', 'catalog.json'),
        node_path_1.default.resolve(__dirname, 'catalog', 'catalog.json')
    ];
    for (const catalogPath of candidates) {
        try {
            return JSON.parse(await (0, promises_1.readFile)(catalogPath, 'utf8'));
        }
        catch {
            // Try the next catalog source.
        }
    }
    return { catalogVersion: 1, generatedAt: null, plugins: [] };
});
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
//# sourceMappingURL=main.js.map