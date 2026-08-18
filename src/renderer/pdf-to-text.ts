export {};

type ElectronFile = File & { path: string };
type PdfOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };

declare global {
  interface Window {
    alltools?: {
      catalog: { list: () => Promise<unknown> };
      pdfToText: {
        extract: (files: Array<{ path: string; name: string }>) => Promise<{ outputs: PdfOutput[] }>;
        onProgress: (listener: (update: { value: number; message: string }) => void) => () => void;
      };
      files: { save: (output: PdfOutput) => Promise<boolean>; saveAll: (outputs: PdfOutput[]) => Promise<boolean> };
    };
  }
}

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
let selectedFiles: ElectronFile[] = [];
let extractedOutputs: PdfOutput[] = [];
let removeProgressListener: (() => void) | undefined;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    progressMessage.textContent = 'PDF backend is unavailable. Check the sibling plugin repository and restart.';
    progressValue.textContent = '—';
    return;
  }
  progressPanel.hidden = false;
  resultsPanel.hidden = true;
  progressBar.style.width = '0%';
  progressValue.textContent = '0%';
  progressMessage.textContent = 'Preparing extraction…';
  removeProgressListener?.();
  removeProgressListener = window.alltools.pdfToText.onProgress((update) => {
    const percentage = Math.round(update.value * 100);
    progressBar.style.width = `${percentage}%`;
    progressValue.textContent = `${percentage}%`;
    progressMessage.textContent = update.message;
  });
  try {
    const result = await window.alltools.pdfToText.extract(selectedFiles.map((file) => ({ path: file.path, name: file.name })));
    extractedOutputs = result.outputs;
    renderResults();
    progressMessage.textContent = 'Extraction complete';
    progressBar.style.width = '100%';
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

document.querySelector('#clear-pdf-files')?.addEventListener('click', () => { selectedFiles = []; extractedOutputs = []; renderSelectedFiles(); resultsPanel.hidden = true; });
document.querySelector('#extract-pdf')?.addEventListener('click', () => void extractText());
document.querySelector('#download-all-pdf')?.addEventListener('click', () => { if (extractedOutputs.length && window.alltools) void window.alltools.files.saveAll(extractedOutputs); });
fileInput.addEventListener('change', () => { if (fileInput.files) addFiles(fileInput.files); fileInput.value = ''; });
dropzone.addEventListener('click', (event) => { if ((event.target as HTMLElement).closest('.choose-button')) return; fileInput.click(); });
dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('drag-over'); if (event.dataTransfer?.files) addFiles(event.dataTransfer.files); });
