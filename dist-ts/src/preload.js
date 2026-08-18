"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('alltools', {
    catalog: {
        list: () => electron_1.ipcRenderer.invoke('catalog:list')
    }
});
//# sourceMappingURL=preload.js.map