import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type PdfInput = { path: string; name: string };
export type PdfOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };
export type ProgressUpdate = { value: number; message: string };

export type AllToolsApi = {
  catalog: { list: () => Promise<unknown> };
  pdfToText: {
    extract: (files: PdfInput[]) => Promise<{ outputs: PdfOutput[] }>;
    onProgress: (listener: (update: ProgressUpdate) => void) => () => void;
    onLog: (listener: (message: string) => void) => () => void;
  };
  files: {
    save: (output: PdfOutput) => Promise<boolean>;
    saveAll: (outputs: PdfOutput[]) => Promise<boolean>;
  };
};

contextBridge.exposeInMainWorld('alltools', {
  catalog: { list: (): Promise<unknown> => ipcRenderer.invoke('catalog:list') },
  pdfToText: {
    extract: (files: PdfInput[]): Promise<{ outputs: PdfOutput[] }> => ipcRenderer.invoke('pdf-to-text:extract', { files }),
    onProgress: (listener: (update: ProgressUpdate) => void): (() => void) => {
      const callback = (_event: IpcRendererEvent, update: ProgressUpdate) => listener(update);
      ipcRenderer.on('pdf-to-text:progress', callback);
      return () => ipcRenderer.removeListener('pdf-to-text:progress', callback);
    },
    onLog: (listener: (message: string) => void): (() => void) => {
      const callback = (_event: IpcRendererEvent, message: string) => listener(message);
      ipcRenderer.on('pdf-to-text:log', callback);
      return () => ipcRenderer.removeListener('pdf-to-text:log', callback);
    }
  },
  files: {
    save: (output: PdfOutput): Promise<boolean> => ipcRenderer.invoke('files:save', output),
    saveAll: (outputs: PdfOutput[]): Promise<boolean> => ipcRenderer.invoke('files:save-all', outputs)
  }
});

declare global { interface Window { alltools: AllToolsApi; } }
