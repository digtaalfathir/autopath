const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Flow operations
  saveFlow: (name, data) => ipcRenderer.invoke('flow:save', { name, data }),
  saveFlowAs: (data) => ipcRenderer.invoke('flow:saveAs', { data }),
  openFlow: () => ipcRenderer.invoke('flow:open'),
  listFlows: () => ipcRenderer.invoke('flow:list'),

  // Execution
  executeFlow: (flowData) => ipcRenderer.invoke('flow:execute', flowData),
  stopFlow: () => ipcRenderer.invoke('flow:stop'),

  // Element Picker
  pickElement: (url) => ipcRenderer.invoke('picker:start', { url }),

  // Engine events
  onEngineLog: (callback) => {
    const listener = (_event, log) => callback(log);
    ipcRenderer.on('engine:log', listener);
    return () => ipcRenderer.removeListener('engine:log', listener);
  },
  onNodeStart: (callback) => {
    const listener = (_event, nodeId) => callback(nodeId);
    ipcRenderer.on('engine:node-start', listener);
    return () => ipcRenderer.removeListener('engine:node-start', listener);
  },
  onNodeComplete: (callback) => {
    const listener = (_event, nodeId) => callback(nodeId);
    ipcRenderer.on('engine:node-complete', listener);
    return () => ipcRenderer.removeListener('engine:node-complete', listener);
  },
  onNodeError: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('engine:node-error', listener);
    return () => ipcRenderer.removeListener('engine:node-error', listener);
  },
});
