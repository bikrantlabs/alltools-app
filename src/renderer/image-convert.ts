export {};

type ElectronFile = File & { path: string };
type Output = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };

const pluginId = 'image-convert';
const acceptedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'];
const dropzone = document.querySelector<HTMLElement>('#dropzone')!;
const input = document.querySelector<HTMLInputElement>('#file-input')!;
const filePanel = document.querySelector<HTMLElement>('#file-panel')!;
const fileList = document.querySelector<HTMLElement>('#file-list')!;
const fileCount = document.querySelector<HTMLElement>('#file-count')!;
const formatSelect = document.querySelector<HTMLSelectElement>('#format-select')!;
const progressPanel = document.querySelector<HTMLElement>('#progress-panel')!;
const progressMessage = document.querySelector<HTMLElement>('#progress-message')!;
const progressValue = document.querySelector<HTMLElement>('#progress-value')!;
const progressBar = document.querySelector<HTMLElement>('#progress-bar')!;
const resultsPanel = document.querySelector<HTMLElement>('#results-panel')!;
const resultsList = document.querySelector<HTMLElement>('#results-list')!;
const runButton = document.querySelector<HTMLButtonElement>('#run-tool')!;
let files: ElectronFile[] = [];
let outputs: Output[] = [];
let removeProgress: (() => void) | undefined;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFiles(): void {
  filePanel.hidden = files.length === 0;
  fileCount.textContent = String(files.length);
  fileList.innerHTML = files.map((file, index) => `<div class="file-row"><div class="file-type">${pluginId === 'image-convert' ? 'IMG' : 'PDF'}</div><div class="file-info"><span class="file-name">${file.name}</span><span class="file-size">${formatBytes(file.size)}</span></div><button class="remove-file" data-remove="${index}" aria-label="Remove ${file.name}">×</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => button.addEventListener('click', () => { files.splice(Number(button.dataset.remove), 1); renderFiles(); }));
}

function addFiles(incoming: FileList | File[]): void {
  const accepted = Array.from(incoming).filter((file): file is ElectronFile => 'path' in file && acceptedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension)));
  const existing = new Set(files.map((file) => `${file.name}:${file.size}`));
  files.push(...accepted.filter((file) => !existing.has(`${file.name}:${file.size}`)));
  renderFiles();
}

function renderOutputs(): void {
  resultsPanel.hidden = outputs.length === 0;
  resultsList.innerHTML = outputs.map((output) => `<div class="file-row result-row"><div class="file-type">OUT</div><div class="file-info"><span class="file-name">${output.path.split(/[\\/]/).pop() ?? output.sourceName}</span><span class="file-size">${formatBytes(output.sizeBytes)} · from ${output.sourceName}</span></div><button class="download-button" data-save="${output.id}">Download</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((button) => button.addEventListener('click', () => { const output = outputs.find((item) => item.id === button.dataset.save); if (output && window.alltools) void window.alltools.files.save(output); }));
}

async function run(): Promise<void> {
  if (!files.length || !window.alltools?.plugins?.run) {
    progressPanel.hidden = false;
    progressMessage.textContent = 'Select at least one supported image.';
    progressValue.textContent = '—';
    return;
  }
  runButton.disabled = true;
  progressPanel.hidden = false;
  resultsPanel.hidden = true;
  progressBar.style.transform = 'scaleX(0)';
  progressValue.textContent = '0%';
  progressMessage.textContent = 'Preparing plugin…';
  removeProgress?.();
  removeProgress = window.alltools.plugins.onRunProgress((update) => {
    if (update.id !== pluginId) return;
    const percentage = Math.round(update.value * 100);
    progressBar.style.transform = `scaleX(${percentage / 100})`;
    progressValue.textContent = `${percentage}%`;
    progressMessage.textContent = update.message;
  });
  try {
    const result = await window.alltools.plugins.run(pluginId, files.map((file) => ({ path: file.path, name: file.name })), { format: formatSelect.value });
    outputs = result.outputs;
    renderOutputs();
    progressMessage.textContent = 'Complete';
    progressBar.style.transform = 'scaleX(1)';
    progressValue.textContent = '100%';
  } catch (error) {
    progressMessage.textContent = error instanceof Error ? error.message : 'The plugin job failed.';
  } finally {
    runButton.disabled = false;
    removeProgress?.();
    removeProgress = undefined;
  }
}

document.querySelector('#choose-files')?.addEventListener('click', () => input.click());
input.addEventListener('change', () => { if (input.files) addFiles(input.files); input.value = ''; });
dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('drag-over'); if (event.dataTransfer?.files) addFiles(event.dataTransfer.files); });
document.querySelector('#clear-files')?.addEventListener('click', () => { files = []; outputs = []; renderFiles(); renderOutputs(); });
runButton.addEventListener('click', () => void run());
document.querySelector('#download-all')?.addEventListener('click', () => { if (outputs.length && window.alltools) void window.alltools.files.saveAll(outputs); });
renderFiles();

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
applyTheme(localStorage.getItem('alltools-theme') === 'light' ? 'light' : 'dark');
themeToggle?.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 't') {
    event.preventDefault();
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  }
});
