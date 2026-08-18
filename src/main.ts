import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

type Catalog = {
  catalogVersion: number;
  generatedAt: string | null;
  plugins: unknown[];
};

const isDev = !app.isPackaged;

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#f7f8fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  void window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev) window.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.handle('catalog:list', async (): Promise<Catalog> => {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'alltools-plugins', 'catalog', 'catalog.json'),
    path.resolve(__dirname, 'catalog', 'catalog.json')
  ];
  for (const catalogPath of candidates) {
    try {
      return JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
    } catch {
      // Try the next catalog source.
    }
  }
  return { catalogVersion: 1, generatedAt: null, plugins: [] };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
