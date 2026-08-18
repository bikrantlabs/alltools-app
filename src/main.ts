import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import path from 'node:path';
import { access, cp, mkdir, readFile, stat, mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

type CatalogPlugin = { id: string; version?: string; source?: { type?: string; path?: string }; status?: string; [key: string]: unknown };
type Catalog = { catalogVersion: number; generatedAt: string | null; plugins: CatalogPlugin[] };
type ExtractRequest = { files: Array<{ path: string; name: string }> };
type PluginState = { id: string; version: string; status: 'installed' | 'failed' | 'unavailable'; installedPath?: string; error?: string; updatedAt: string };
type PluginInstallRequest = { id: string };
type PluginRunRequest = { pluginId: string; files: Array<{ path: string; name: string }>; options?: Record<string, unknown> };

 type ExtractOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };
 type ProtocolEvent = { type: string; jobId?: string; value?: number; message?: string; outputs?: ExtractOutput[]; code?: string };

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function pluginStorePath(): string { return path.join(app.getPath('userData'), 'plugins'); }
function pluginStatePath(): string { return path.join(app.getPath('userData'), 'plugin-state.json'); }
async function readPluginStates(): Promise<Record<string, PluginState>> {
  try { return JSON.parse(await readFile(pluginStatePath(), 'utf8')) as Record<string, PluginState>; } catch { return {}; }
}
async function writePluginStates(states: Record<string, PluginState>): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(pluginStatePath(), JSON.stringify(states, null, 2), 'utf8');
}
async function loadCatalog(): Promise<Catalog> {
  const candidates = [
    path.resolve(app.getAppPath(), '..', 'alltools-plugins', 'catalog', 'catalog.json'),
    path.resolve(__dirname, 'catalog', 'catalog.json')
  ];
  for (const catalogPath of candidates) {
    try { return JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog; } catch { /* next source */ }
  }
  return { catalogVersion: 1, generatedAt: null, plugins: [] };
}
async function runCommand(command: string, args: string[], cwd: string, onOutput: (message: string) => void): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk: Buffer) => onOutput(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => onOutput(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code ?? 'unknown'}`)));
  });
}

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

  const strictCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [strictCsp] } });
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`[renderer:${level}] ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[renderer-gone] ${details.reason}`);
  });
  void mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev && process.env.ALLTOOLS_DEVTOOLS === '1') mainWindow.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.handle('catalog:list', async (): Promise<Catalog> => {
  const catalog = await loadCatalog();
  const states = await readPluginStates();
  return { ...catalog, plugins: catalog.plugins.map((plugin) => {
    const state = states[plugin.id];
    const overlay = state && state.status !== 'unavailable' ? { status: state.status, installed: state.status === 'installed' } : {};
    return { ...plugin, ...overlay };
  }) };
});

ipcMain.handle('plugins:install', async (event, request: PluginInstallRequest): Promise<PluginState> => {
  const catalog = await loadCatalog();
  const plugin = catalog.plugins.find((item) => item.id === request.id);
  if (!plugin || plugin.source?.type !== 'local-development' || !plugin.source.path) throw new Error('This plugin is not available from an approved local source.');
  const sourcePath = path.resolve(app.getAppPath(), '..', 'alltools-plugins', plugin.source.path.replace(/^plugins\//, 'plugins/'));
  const manifestPath = path.join(sourcePath, 'plugin.json');
  const states = await readPluginStates();
  try { await access(manifestPath); } catch {
    const state: PluginState = { id: plugin.id, version: plugin.version ?? '0.0.0', status: 'unavailable', error: `The local plugin source is missing: ${plugin.source.path}`, updatedAt: new Date().toISOString() };
    states[plugin.id] = state;
    await writePluginStates(states);
    event.sender.send('plugins:install-progress', { id: plugin.id, value: 1, message: state.error });
    return state;
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { id?: string; version?: string; runtime?: { packageManager?: string }; capabilities?: { network?: boolean } };
  if (manifest.id !== plugin.id) throw new Error('Plugin manifest id does not match the catalog entry.');
  if (!manifest.version || manifest.runtime?.packageManager !== 'uv' || manifest.capabilities?.network !== false) throw new Error('Plugin manifest failed the AllTools safety checks.');
  const installPath = path.join(pluginStorePath(), manifest.id, manifest.version);
  try {
    event.sender.send('plugins:install-progress', { id: manifest.id, value: 0.1, message: 'Validating plugin manifest' });
    await mkdir(path.dirname(installPath), { recursive: true });
    await cp(sourcePath, installPath, { recursive: true, force: true });
    event.sender.send('plugins:install-progress', { id: manifest.id, value: 0.45, message: 'Preparing isolated plugin environment' });
    const backendPath = path.join(installPath, 'backend');
    await access(backendPath);
    await runCommand('uv', ['sync', '--directory', backendPath], installPath, (message) => event.sender.send('plugins:install-log', { id: manifest.id, message }));
    const state: PluginState = { id: manifest.id, version: manifest.version, status: 'installed', installedPath: installPath, updatedAt: new Date().toISOString() };
    states[manifest.id] = state;
    await writePluginStates(states);
    event.sender.send('plugins:install-progress', { id: manifest.id, value: 1, message: 'Plugin installed and ready offline' });
    return state;
  } catch (error) {
    const state: PluginState = { id: manifest.id, version: manifest.version, status: 'failed', error: error instanceof Error ? error.message : 'Plugin installation failed', updatedAt: new Date().toISOString() };
    states[manifest.id] = state;
    await writePluginStates(states);
    event.sender.send('plugins:install-progress', { id: manifest.id, value: 1, message: state.error });
    return state;
  }
});

ipcMain.handle('plugins:states', async (): Promise<Record<string, PluginState>> => readPluginStates());

ipcMain.handle('plugins:run', async (event, request: PluginRunRequest): Promise<{ outputs: ExtractOutput[] }> => {
  const states = await readPluginStates();
  const state = states[request.pluginId];
  if (!state || state.status !== 'installed' || !state.installedPath) throw new Error('Install this plugin before running it.');
  const manifest = JSON.parse(await readFile(path.join(state.installedPath, 'plugin.json'), 'utf8')) as { entrypoint?: { command?: string; protocolVersion?: number } };
  const command = manifest.entrypoint?.command ?? '';
  const moduleMatch = command.match(/^python\s+-m\s+([A-Za-z0-9_.-]+)$/);
  if (!moduleMatch || manifest.entrypoint?.protocolVersion !== 1) throw new Error('The installed plugin entrypoint is invalid.');
  const jobDirectory = await mkdtemp(path.join(tmpdir(), `alltools-${request.pluginId}-`));
  const inputDirectory = path.join(jobDirectory, 'input');
  const outputDirectory = path.join(jobDirectory, 'output');
  await mkdir(inputDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  const inputs: Array<{ id: string; path: string; mimeType: string }> = [];
  for (const [index, file] of request.files.entries()) {
    const stagedPath = path.join(inputDirectory, `${index}-${path.basename(file.name)}`);
    await cp(file.path, stagedPath);
    inputs.push({ id: `source-${index + 1}`, path: stagedPath, mimeType: 'application/octet-stream' });
  }
  const jobId = `${request.pluginId}-${Date.now()}`;
  const payload = { type: 'start', protocolVersion: 1, jobId, jobDirectory, inputs, options: request.options ?? {}, outputDirectory };
  const child = spawn('uv', ['run', '--directory', path.join(state.installedPath, 'backend'), '--frozen', 'python', '-m', moduleMatch[1]], { cwd: jobDirectory, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.write(`${JSON.stringify(payload)}\n`);
  child.stdin.end();
  return await new Promise((resolve, reject) => {
    let buffer = '';
    let completed: ExtractOutput[] | null = null;
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line) as ProtocolEvent;
          if (message.type === 'progress') event.sender.send('plugins:run-progress', { id: request.pluginId, value: message.value ?? 0, message: message.message ?? '' });
          if (message.type === 'completed') completed = message.outputs ?? [];
          if (message.type === 'failed') reject(new Error(message.message ?? message.code ?? 'Plugin job failed.'));
        } catch { /* malformed plugin output is handled by process exit */ }
      }
    });
    child.stderr.on('data', (chunk: Buffer) => event.sender.send('plugins:run-log', { id: request.pluginId, message: chunk.toString() }));
    child.on('error', (error) => reject(new Error(`Could not start plugin: ${error.message}`)));
    child.on('close', (code) => completed ? resolve({ outputs: completed }) : reject(new Error(code === 0 ? 'Plugin did not return outputs.' : 'Plugin process stopped unexpectedly.')));
  });
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
