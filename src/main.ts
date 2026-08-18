import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { cp, mkdir, readFile, stat, mkdtemp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

 type Catalog = { catalogVersion: number; generatedAt: string | null; plugins: unknown[] };
 type ExtractRequest = { files: Array<{ path: string; name: string }> };
 type ExtractOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };
 type ProtocolEvent = { type: string; jobId?: string; value?: number; message?: string; outputs?: ExtractOutput[]; code?: string };

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  void mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.handle('catalog:list', async (): Promise<Catalog> => {
  const candidates = [
    path.resolve(app.getAppPath(), '..', 'alltools-plugins', 'catalog', 'catalog.json'),
    path.resolve(__dirname, 'catalog', 'catalog.json')
  ];
  for (const catalogPath of candidates) {
    try { return JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog; } catch { /* next source */ }
  }
  return { catalogVersion: 1, generatedAt: null, plugins: [] };
});

ipcMain.handle('pdf-to-text:extract', async (event, request: ExtractRequest): Promise<{ outputs: ExtractOutput[] }> => {
  if (!request.files.length) throw new Error('Select at least one PDF file.');
  const jobDirectory = await mkdtemp(path.join(tmpdir(), 'alltools-pdf-'));
  const inputDirectory = path.join(jobDirectory, 'input');
  const outputDirectory = path.join(jobDirectory, 'output');
  await mkdir(inputDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  const inputs: Array<{ id: string; path: string; mimeType: string }> = [];
  for (const [index, file] of request.files.entries()) {
    const stagedPath = path.join(inputDirectory, `${index}-${path.basename(file.name)}`);
    await cp(file.path, stagedPath);
    inputs.push({ id: `source-${index + 1}`, path: stagedPath, mimeType: 'application/pdf' });
  }

  const pluginBackend = path.resolve(app.getAppPath(), '..', 'alltools-plugins', 'plugins', 'pdf-to-text', 'backend');
  const jobId = `pdf-${Date.now()}`;
  const payload = { type: 'start', protocolVersion: 1, jobId, jobDirectory, inputs, options: {}, outputDirectory };
  const child = spawn('uv', ['run', '--directory', pluginBackend, '--frozen', 'python', '-m', 'alltools_pdf_to_text'], { cwd: jobDirectory, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.write(`${JSON.stringify(payload)}\n`);
  child.stdin.end();

  return await new Promise((resolve, reject) => {
    let buffer = '';
    let completed: ExtractOutput[] | null = null;
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line) as ProtocolEvent;
          if (message.type === 'progress') event.sender.send('pdf-to-text:progress', { value: message.value ?? 0, message: message.message ?? '' });
          if (message.type === 'completed') completed = message.outputs ?? [];
          if (message.type === 'failed') reject(new Error(message.message ?? message.code ?? 'PDF extraction failed.'));
        } catch { /* ignore malformed plugin lines; supervisor will report process failure */ }
      }
    });
    child.stderr.on('data', (chunk: Buffer) => event.sender.send('pdf-to-text:log', chunk.toString()));
    child.on('error', (error) => reject(new Error(`Could not start PDF plugin: ${error.message}`)));
    child.on('close', (code) => {
      if (completed) resolve({ outputs: completed });
      else if (code !== 0) reject(new Error('PDF extraction process stopped unexpectedly.'));
      else reject(new Error('PDF plugin did not return outputs.'));
    });
  });
});

ipcMain.handle('files:save', async (_event, output: ExtractOutput): Promise<boolean> => {
  const result = await dialog.showSaveDialog({ defaultPath: output.sourceName.replace(/\.pdf$/i, '.txt'), filters: [{ name: 'Text file', extensions: ['txt'] }] });
  if (result.canceled || !result.filePath) return false;
  await cp(output.path, result.filePath);
  return true;
});

ipcMain.handle('files:save-all', async (_event, outputs: ExtractOutput[]): Promise<boolean> => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths[0]) return false;
  for (const output of outputs) await cp(output.path, path.join(result.filePaths[0], path.basename(output.path)));
  return true;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
