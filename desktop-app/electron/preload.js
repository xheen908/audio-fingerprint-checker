const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  analyzeAudio: (filePath, keys) => ipcRenderer.invoke('analyze-audio', filePath, keys),
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
});
