type ElectronFile = File & { path: string };
type Output = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };

declare global {
  interface Window {
    alltools?: {
      plugins: {
        run: (pluginId: string, files: Array<{ path: string; name: string }>, options?: Record<string, unknown>) => Promise<{ outputs: Output[] }>;
        onRunProgress: (listener: (update: { id: string; value: number; message: string }) => void) => () => void;
      };
      files: { save: (output: Output) => Promise<boolean>; saveAll: (outputs: Output[]) => Promise<boolean> };
    };
  }
}

const params = new URLSearchParams(window.location.search);
const pluginId = params.get('plugin') ?? 'pdf-merge';
const pluginMeta: Record<string, { title: string; description: string; category: string; accept: string; format?: boolean }> = {
  'pdf-merge': { title: 'Merge PDFs', description: 'Combine multiple PDF files into one ordered document.', category: 'PDF / FILE STUDIO', accept: '.pdf' },
  'image-convert': { title: 'Convert Images', description: 'Convert image files between common formats completely offline.', category: 'IMAGE / FILE STUDIO', accept: 'image/*', format: true }
};
const meta = pluginMeta[pluginId] ?? { title: 'Local tool', description: 'Process files locally with an installed AllTools plugin.', category: 'TOOL / FILE STUDIO', accept: '*' };
const title = document.querySelector<HTMLElement>('#tool-title')!;
const description = document.querySelector<HTMLElement>('#tool-description')!;
const category = document.querySelector<HTMLElement>('#tool-category')!;
const route = document.querySelector<HTMLElement>('#tool-route')!;
const dropzone = document.querySelector<HTMLElement>('#dropzone')!;
const input = document.querySelector<HTMLInputElement>('#file-input')!;
const fileList = document.querySelector<HTMLElement>('#file-list')!;
const fileCount = document.querySelector<HTMLElement>('#file-count')!;
const optionsPanel = document.querySelector<HTMLElement>('#options-panel')!;
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

title.textContent = meta.title;
description.textContent = meta.description;
category.textContent = meta.category;
route.textContent = `/tools/${pluginId}`;
input.accept = meta.accept;
optionsPanel.hidden = !meta.format;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFiles(): void {
  fileCount.textContent = String(files.length);
  fileList.innerHTML = files.map((file, index) => `<div class="file-row"><div class="file-type">${pluginId === 'image-convert' ? 'IMG' : 'PDF'}</div><div class="file-info"><span class="file-name">${file.name}</span><span class="file-size">${formatBytes(file.size)}</span></div><button class="remove-file" data-remove="${index}" aria-label="Remove ${file.name}">×</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => button.addEventListener('click', () => { files.splice(Number(button.dataset.remove), 1); renderFiles(); }));
}

function addFiles(incoming: FileList | File[]): void {
  const accepted = Array.from(incoming).filter((file): file is ElectronFile => 'path' in file);
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
  if (!files.length || !window.alltools?.plugins?.run) return;
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
    const result = await window.alltools.plugins.run(pluginId, files.map((file) => ({ path: file.path, name: file.name })), meta.format ? { format: formatSelect.value } : {});
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
