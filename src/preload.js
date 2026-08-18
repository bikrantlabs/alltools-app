const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alltools', {
  catalog: {
    list: () => ipcRenderer.invoke('catalog:list')
  }
});
