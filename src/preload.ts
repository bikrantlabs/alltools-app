import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type PdfInput = { path: string; name: string };
export type PdfOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };
export type ProgressUpdate = { value: number; message: string };
export type PluginInstallProgress = { id: string; value: number; message: string };
export type PluginState = { id: string; version: string; status: 'installed' | 'failed' | 'unavailable'; installedPath?: string; error?: string; updatedAt: string };

export type AllToolsApi = {
  catalog: { list: () => Promise<unknown> };
  plugins: {
    install: (id: string, reinstall?: boolean) => Promise<PluginState>;
    states: () => Promise<Record<string, PluginState>>;
    onProgress: (listener: (update: PluginInstallProgress) => void) => () => void;
    onLog: (listener: (update: { id: string; message: string }) => void) => () => void;
    run: (pluginId: string, files: PdfInput[], options?: Record<string, unknown>) => Promise<{ outputs: PdfOutput[] }>;
    onRunProgress: (listener: (update: PluginInstallProgress) => void) => () => void;
  };
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
  plugins: {
    install: (id: string, reinstall = false): Promise<PluginState> => ipcRenderer.invoke('plugins:install', { id, reinstall }),
    states: (): Promise<Record<string, PluginState>> => ipcRenderer.invoke('plugins:states'),
    onProgress: (listener: (update: PluginInstallProgress) => void): (() => void) => {
      const callback = (_event: IpcRendererEvent, update: PluginInstallProgress) => listener(update);
      ipcRenderer.on('plugins:install-progress', callback);
      return () => ipcRenderer.removeListener('plugins:install-progress', callback);
    },
    onLog: (listener: (update: { id: string; message: string }) => void): (() => void) => {
      const callback = (_event: IpcRendererEvent, update: { id: string; message: string }) => listener(update);
      ipcRenderer.on('plugins:install-log', callback);
      return () => ipcRenderer.removeListener('plugins:install-log', callback);
    },
    run: (pluginId: string, files: PdfInput[], options?: Record<string, unknown>): Promise<{ outputs: PdfOutput[] }> => ipcRenderer.invoke('plugins:run', { pluginId, files, options }),
    onRunProgress: (listener: (update: PluginInstallProgress) => void): (() => void) => {
      const callback = (_event: IpcRendererEvent, update: PluginInstallProgress) => listener(update);
      ipcRenderer.on('plugins:run-progress', callback);
      return () => ipcRenderer.removeListener('plugins:run-progress', callback);
    }
  },
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
