export {};

type ToolCategory = 'pdf' | 'image' | 'document' | 'audio' | 'video' | 'archive' | 'developer' | 'other';
type Tool = { id: string; name: string; description: string; category: ToolCategory; icon: string; installed: boolean; status?: 'installed' | 'available' | 'planned' | 'incompatible' | 'failed'; favorite?: boolean; recent?: boolean; installing?: boolean };
type CatalogPlugin = { id: string; name: string; description: string; installed?: boolean; status?: 'installed' | 'available' | 'planned' | 'incompatible' | 'failed'; favorite?: boolean; recent?: boolean; ui?: { category?: ToolCategory; icon?: string } };
type Catalog = { plugins?: CatalogPlugin[] };
type ElectronFile = File & { path: string };
type PdfOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };
declare global {
  interface Window {
    alltools?: {
      catalog: { list: () => Promise<unknown> };
      plugins: {
        install: (id: string) => Promise<{ status: 'installed' | 'failed'; error?: string }>;
        onProgress: (listener: (update: { id: string; value: number; message: string }) => void) => () => void;
      };
      pdfToText: {
        extract: (files: Array<{ path: string; name: string }>) => Promise<{ outputs: PdfOutput[] }>;
        onProgress: (listener: (update: { value: number; message: string }) => void) => () => void;
      };
      files: { save: (output: PdfOutput) => Promise<boolean>; saveAll: (outputs: PdfOutput[]) => Promise<boolean> };
    };
  }
}

const fallbackTools: Tool[] = [
  { id: 'pdf-to-text', name: 'PDF to Text', description: 'Turn one or more PDFs into plain text files.', category: 'pdf', icon: 'PDF', installed: true }
];

let tools: Tool[] = fallbackTools;
let activeView = 'all';
let activeCategory: ToolCategory | null = null;
let query = '';
let selectedFiles: ElectronFile[] = [];
let extractedOutputs: PdfOutput[] = [];
let removeProgressListener: (() => void) | undefined;
let removePluginProgressListener: (() => void) | undefined;

const grid = document.querySelector<HTMLElement>('#tool-grid')!;
const count = document.querySelector<HTMLElement>('#tool-count')!;
const title = document.querySelector<HTMLElement>('#view-title')!;
const search = document.querySelector<HTMLInputElement>('#search-input')!;
const toolbarEl = document.querySelector<HTMLElement>('.toolbar')!;
const pdfWorkspace = document.querySelector<HTMLElement>('#pdf-workspace')!;
const dropzone = document.querySelector<HTMLElement>('#pdf-dropzone')!;
const fileInput = document.querySelector<HTMLInputElement>('#pdf-input')!;
const filePanel = document.querySelector<HTMLElement>('#pdf-file-panel')!;
const fileCount = document.querySelector<HTMLElement>('#pdf-file-count')!;
const fileList = document.querySelector<HTMLElement>('#pdf-file-list')!;
const resultsPanel = document.querySelector<HTMLElement>('#pdf-results-panel')!;
const resultsList = document.querySelector<HTMLElement>('#pdf-results-list')!;
const progressPanel = document.querySelector<HTMLElement>('#pdf-progress-panel')!;
const progressBar = document.querySelector<HTMLElement>('#pdf-progress-bar')!;
const progressValue = document.querySelector<HTMLElement>('#pdf-progress-value')!;
const progressMessage = document.querySelector<HTMLElement>('#pdf-progress-message')!;

const gridElement = grid;
const countElement = count;
const titleElement = title;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizedCatalog(catalog: Catalog): Tool[] {
  if (!Array.isArray(catalog.plugins) || catalog.plugins.length === 0) return fallbackTools;
  return catalog.plugins.map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    category: plugin.ui?.category ?? 'other',
    icon: plugin.ui?.icon ?? (plugin.ui?.category === 'pdf' ? 'PDF' : plugin.ui?.category === 'image' ? 'IMG' : plugin.ui?.category === 'audio' ? 'AUD' : plugin.ui?.category === 'video' ? 'VID' : plugin.ui?.category === 'archive' ? 'ZIP' : plugin.ui?.category === 'developer' ? 'DEV' : 'DOC'),
    installed: plugin.id === 'pdf-to-text' || Boolean(plugin.installed) || plugin.status === 'installed',
    status: plugin.id === 'pdf-to-text' ? 'installed' : plugin.status ?? (plugin.installed ? 'installed' : 'available'),
    favorite: Boolean(plugin.favorite),
    recent: Boolean(plugin.recent)
  }));
}

function getVisibleTools(): Tool[] {
  return tools.filter((tool) => {
    const matchesQuery = !query || `${tool.name} ${tool.description}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || tool.category === activeCategory;
    if (activeView === 'favorites') return matchesQuery && matchesCategory && Boolean(tool.favorite);
    if (activeView === 'recent') return matchesQuery && matchesCategory && Boolean(tool.recent);
    return matchesQuery && matchesCategory;
  });
}

function render(): void {
  const visible = getVisibleTools();
  titleElement.textContent = activeCategory ? `${activeCategory[0].toUpperCase()}${activeCategory.slice(1)} tools` : activeView === 'all' ? 'All tools' : `${activeView[0].toUpperCase()}${activeView.slice(1)}`;
  countElement.textContent = String(visible.length);
  gridElement.innerHTML = visible.length ? visible.map((tool) => `
    <article class="tool-card ${tool.installing ? 'is-installing' : ''}">
      <div class="tool-head"><div class="tool-icon ${tool.category}">${tool.icon}</div><button class="tool-action" aria-label="Add ${tool.name} to favorites" data-favorite="${tool.id}">${tool.favorite ? '★' : '☆'}</button></div>
      <h3>${tool.name}</h3><p>${tool.description}</p>
      <div class="tool-footer"><span class="tool-status">${tool.status === 'installed' ? 'Ready offline' : tool.status === 'planned' ? 'Planned for a later wave' : tool.status === 'incompatible' ? 'Not compatible with this device' : tool.status === 'failed' ? 'Install failed — retry later' : 'Available to download'}</span>${tool.installed ? `<button class="download-button" data-open-tool="${tool.id}">Open tool</button>` : tool.status === 'planned' || tool.status === 'incompatible' ? '' : `<button class="download-button" data-download="${tool.id}">Download</button>`}</div>
    </article>
  `).join('') : '<div class="empty-state">No tools match this view yet.</div>';

  document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach((button) => button.addEventListener('click', () => {
    const tool = tools.find((item) => item.id === button.dataset.favorite);
    if (tool) tool.favorite = !tool.favorite;
    render();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-open-tool]').forEach((button) => button.addEventListener('click', () => {
    const toolId = button.dataset.openTool;
    if (toolId === 'pdf-to-text') window.location.href = './pdf-to-text.html';
    else if (toolId === 'pdf-merge' || toolId === 'image-convert') window.location.href = `./generic-tool.html?plugin=${encodeURIComponent(toolId)}`;
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach((button) => button.addEventListener('click', () => {
    const tool = tools.find((item) => item.id === button.dataset.download);
    if (!tool || !window.alltools?.plugins?.install) return;
    tool.installing = true;
    tool.status = 'available';
    button.disabled = true;
    button.textContent = 'Installing…';
    removePluginProgressListener?.();
    removePluginProgressListener = window.alltools.plugins.onProgress((update) => {
      if (update.id !== tool.id) return;
      button.textContent = update.value >= 1 ? 'Finalizing…' : `Installing ${Math.round(update.value * 100)}%`;
    });
    void window.alltools.plugins.install(tool.id).then((state) => {
      tool.installing = false;
      tool.status = state.status;
      tool.installed = state.status === 'installed';
      button.textContent = state.status === 'installed' ? 'Installed' : 'Retry';
      removePluginProgressListener?.();
      removePluginProgressListener = undefined;
      render();
    }).catch((error) => {
      tool.installing = false;
      tool.status = 'failed';
      button.disabled = false;
      button.textContent = 'Retry';
      removePluginProgressListener?.();
      removePluginProgressListener = undefined;
      console.error(error);
      render();
    });
  }));
}

function openPdfWorkspace(): void {
  toolbarEl.hidden = true;
  gridElement.hidden = true;
  pdfWorkspace.hidden = false;
  const tool = tools.find((item) => item.id === 'pdf-to-text');
  if (tool) tool.recent = true;
}

function closePdfWorkspace(): void {
  pdfWorkspace.hidden = true;
  toolbarEl.hidden = false;
  gridElement.hidden = false;
}

function renderSelectedFiles(): void {
  filePanel.hidden = selectedFiles.length === 0;
  fileCount.textContent = String(selectedFiles.length);
  fileList.innerHTML = selectedFiles.map((file, index) => `<div class="file-row"><div class="file-type">PDF</div><div class="file-info"><span class="file-name">${file.name}</span><span class="file-size">${formatBytes(file.size)}</span></div><button class="remove-file" data-remove-file="${index}" aria-label="Remove ${file.name}">×</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-remove-file]').forEach((button) => button.addEventListener('click', () => {
    selectedFiles.splice(Number(button.dataset.removeFile), 1);
    renderSelectedFiles();
  }));
}

function addFiles(files: FileList | File[]): void {
  const incoming = Array.from(files).filter((file): file is ElectronFile => file.name.toLowerCase().endsWith('.pdf') && 'path' in file);
  const existing = new Set(selectedFiles.map((file) => `${file.name}:${file.size}`));
  selectedFiles.push(...incoming.filter((file) => !existing.has(`${file.name}:${file.size}`)));
  renderSelectedFiles();
}

async function extractText(): Promise<void> {
  if (!selectedFiles.length) return;
  if (!window.alltools?.pdfToText?.extract) {
    progressPanel.hidden = false;
    progressMessage.textContent = 'PDF backend is unavailable. Restart the app after running pnpm build.';
    progressValue.textContent = '—';
    return;
  }
  progressPanel.hidden = false;
  resultsPanel.hidden = true;
  progressBar.style.transform = 'scaleX(0)';
  progressValue.textContent = '0%';
  progressMessage.textContent = 'Preparing extraction…';
  removeProgressListener?.();
  removeProgressListener = window.alltools.pdfToText.onProgress((update) => {
    const percentage = Math.round(update.value * 100);
    progressBar.style.transform = `scaleX(${percentage / 100})`;
    progressValue.textContent = `${percentage}%`;
    progressMessage.textContent = update.message;
  });
  try {
    const result = await window.alltools.pdfToText.extract(selectedFiles.map((file) => ({ path: file.path, name: file.name })));
    extractedOutputs = result.outputs;
    renderResults();
    progressMessage.textContent = 'Extraction complete';
    progressBar.style.transform = 'scaleX(1)';
    progressValue.textContent = '100%';
  } catch (error) {
    progressMessage.textContent = error instanceof Error ? error.message : 'Extraction failed';
  } finally {
    removeProgressListener?.();
    removeProgressListener = undefined;
  }
}

function renderResults(): void {
  resultsPanel.hidden = extractedOutputs.length === 0;
  resultsList.innerHTML = extractedOutputs.map((output) => `<div class="file-row result-row"><div class="file-type">TXT</div><div class="file-info"><span class="file-name">${output.path.split(/[\\/]/).pop() ?? output.sourceName}</span><span class="file-size">${formatBytes(output.sizeBytes)} · from ${output.sourceName}</span></div><button class="download-button" data-save-output="${output.id}">Download</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-save-output]').forEach((button) => button.addEventListener('click', () => {
    const output = extractedOutputs.find((item) => item.id === button.dataset.saveOutput);
    if (output && window.alltools) void window.alltools.files.save(output);
  }));
}

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('[data-view], [data-category]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active'); activeView = button.dataset.view ?? 'all'; activeCategory = null; render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('[data-view], [data-category]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active'); activeView = 'all'; activeCategory = (button.dataset.category as ToolCategory | undefined) ?? null; render();
}));
search.addEventListener('input', (event) => { query = (event.target as HTMLInputElement).value; render(); });
document.querySelector('#back-to-tools')?.addEventListener('click', closePdfWorkspace);
document.querySelector('#clear-pdf-files')?.addEventListener('click', () => { selectedFiles = []; extractedOutputs = []; renderSelectedFiles(); resultsPanel.hidden = true; });
document.querySelector('#extract-pdf')?.addEventListener('click', () => void extractText());
document.querySelector('#download-all-pdf')?.addEventListener('click', () => { if (extractedOutputs.length && window.alltools) void window.alltools.files.saveAll(extractedOutputs); });
fileInput.addEventListener('change', () => { if (fileInput.files) addFiles(fileInput.files); fileInput.value = ''; });
dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('drag-over'); if (event.dataTransfer?.files) addFiles(event.dataTransfer.files); });

if (window.alltools?.catalog?.list) {
  void window.alltools.catalog.list().then((catalog) => { tools = normalizedCatalog(catalog as Catalog); render(); }).catch(() => render());
} else {
  render();
}

const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
const themeLabel = themeToggle?.querySelector<HTMLElement>('.theme-label');
const themeSymbol = themeToggle?.querySelector<HTMLElement>('.theme-symbol');

function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme;
  if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Use light mode' : 'Use dark mode';
  if (themeSymbol) themeSymbol.textContent = theme === 'dark' ? '☼' : '◐';
  themeToggle?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  localStorage.setItem('alltools-theme', theme);
}

const storedTheme = localStorage.getItem('alltools-theme');
applyTheme(storedTheme === 'light' ? 'light' : 'dark');
themeToggle?.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 't') {
    event.preventDefault();
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  }
});
