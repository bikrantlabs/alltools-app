const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isDev = !app.isPackaged;

function createWindow() {
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

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev) window.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.handle('catalog:list', async () => {
  const catalogPath = path.resolve(__dirname, '..', '..', 'alltools-plugins', 'catalog', 'catalog.json');
  try {
    const raw = await fs.readFile(catalogPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { catalogVersion: 1, generatedAt: null, plugins: [] };
  }
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
