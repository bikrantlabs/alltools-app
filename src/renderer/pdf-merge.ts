export {};

type ElectronFile = File & { path: string };
type Output = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };

const pluginId = 'pdf-merge';
const input = document.querySelector<HTMLInputElement>('#file-input')!;
const dropzone = document.querySelector<HTMLElement>('#dropzone')!;
const fileList = document.querySelector<HTMLElement>('#file-list')!;
const fileCount = document.querySelector<HTMLElement>('#file-count')!;
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
  fileCount.textContent = String(files.length);
  fileList.innerHTML = files.map((file, index) => `<div class="file-row"><div class="file-type">${String(index + 1).padStart(2, '0')}</div><div class="file-info"><span class="file-name">${file.name}</span><span class="file-size">${formatBytes(file.size)} · merge position ${index + 1}</span></div><button class="remove-file" data-remove="${index}" aria-label="Remove ${file.name}">×</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((button) => button.addEventListener('click', () => { files.splice(Number(button.dataset.remove), 1); renderFiles(); }));
  runButton.disabled = files.length < 2;
}

function addFiles(incoming: FileList | File[]): void {
  const accepted = Array.from(incoming).filter((file): file is ElectronFile => file.name.toLowerCase().endsWith('.pdf') && 'path' in file);
  const existing = new Set(files.map((file) => `${file.name}:${file.size}`));
  files.push(...accepted.filter((file) => !existing.has(`${file.name}:${file.size}`)));
  renderFiles();
}

function renderOutputs(): void {
  resultsPanel.hidden = outputs.length === 0;
  resultsList.innerHTML = outputs.map((output) => `<div class="file-row result-row"><div class="file-type">PDF</div><div class="file-info"><span class="file-name">${output.path.split(/[\\/]/).pop() ?? 'merged.pdf'}</span><span class="file-size">${formatBytes(output.sizeBytes)}</span></div><button class="download-button" data-save="${output.id}">Download</button></div>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((button) => button.addEventListener('click', () => { const output = outputs.find((item) => item.id === button.dataset.save); if (output && window.alltools) void window.alltools.files.save(output); }));
}

async function merge(): Promise<void> {
  if (files.length < 2 || !window.alltools?.plugins?.run) {
    progressPanel.hidden = false;
    progressMessage.textContent = 'Select at least two PDF files to merge.';
    progressValue.textContent = '—';
    return;
  }
  runButton.disabled = true;
  progressPanel.hidden = false;
  resultsPanel.hidden = true;
  progressBar.style.transform = 'scaleX(0)';
  progressValue.textContent = '0%';
  progressMessage.textContent = 'Preparing merge…';
  removeProgress?.();
  removeProgress = window.alltools.plugins.onRunProgress((update) => {
    if (update.id !== pluginId) return;
    const percentage = Math.round(update.value * 100);
    progressBar.style.transform = `scaleX(${percentage / 100})`;
    progressValue.textContent = `${percentage}%`;
    progressMessage.textContent = update.message;
  });
  try {
    const result = await window.alltools.plugins.run(pluginId, files.map((file) => ({ path: file.path, name: file.name })));
    outputs = result.outputs;
    renderOutputs();
    progressMessage.textContent = 'Merge complete';
    progressBar.style.transform = 'scaleX(1)';
    progressValue.textContent = '100%';
  } catch (error) {
    progressMessage.textContent = error instanceof Error ? error.message : 'PDF merge failed.';
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
runButton.addEventListener('click', () => void merge());
document.querySelector('#download-all')?.addEventListener('click', () => { if (outputs.length && window.alltools) void window.alltools.files.saveAll(outputs); });
renderFiles();
