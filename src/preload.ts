import { contextBridge, ipcRenderer } from 'electron';

export type AllToolsApi = {
  catalog: {
    list: () => Promise<unknown>;
  };
};

contextBridge.exposeInMainWorld('alltools', {
  catalog: {
    list: (): Promise<unknown> => ipcRenderer.invoke('catalog:list')
  }
});

declare global {
  interface Window {
    alltools: AllToolsApi;
  }
}
