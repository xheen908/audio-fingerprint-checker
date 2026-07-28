const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  analyzeAudio: (filePath, keys, onProgress) => {
    if (onProgress) {
      ipcRenderer.on('analyze-progress', (event, status) => onProgress(status));
    }
    return ipcRenderer.invoke('analyze-audio', filePath, keys).finally(() => {
      ipcRenderer.removeAllListeners('analyze-progress');
    });
  },
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
});
