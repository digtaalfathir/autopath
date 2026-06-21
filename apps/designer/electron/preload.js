const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),   // hides to tray
  quit:     () => ipcRenderer.send('app:quit'),        // real quit

  // Local draft save / open
  saveFlow:   (name, data) => ipcRenderer.invoke('flow:save',   { name, data }),
  saveFlowAs: (data)       => ipcRenderer.invoke('flow:saveAs', { data }),
  openFlow:   ()           => ipcRenderer.invoke('flow:open'),
  listFlows:  ()           => ipcRenderer.invoke('flow:list'),

  // Execution (Designer → Controller → Robot)
  executeFlow: (flowData) => ipcRenderer.invoke('flow:execute', flowData),
  stopFlow:    ()         => ipcRenderer.invoke('flow:stop'),

  // Element Picker
  pickElement: (url) => ipcRenderer.invoke('picker:start', { url }),

  // Workflow Registry
  publishFlow:   (workflowId, flowData, description) => ipcRenderer.invoke('workflow:publish',      { workflowId, flowData, description }),
  listVersions:  (workflowId)                        => ipcRenderer.invoke('workflow:listVersions', { workflowId }),
  listPublished: ()                                  => ipcRenderer.invoke('workflow:listPublished'),

  // Run History / Reports
  listRuns:  (options) => ipcRenderer.invoke('history:list',   options || {}),
  getReport: (runId)   => ipcRenderer.invoke('history:report', { runId }),
  getReportScreenshot: (runId) => ipcRenderer.invoke('history:screenshot', { runId }),

  // Scheduler
  listSchedules:  ()            => ipcRenderer.invoke('scheduler:list'),
  createSchedule: (data)        => ipcRenderer.invoke('scheduler:create', data),
  updateSchedule: (id, updates) => ipcRenderer.invoke('scheduler:update', { id, updates }),
  deleteSchedule: (id)          => ipcRenderer.invoke('scheduler:delete', { id }),
  toggleSchedule: (id, enabled) => ipcRenderer.invoke('scheduler:toggle', { id, enabled }),

  // Job Management
  getJob:    (id)      => ipcRenderer.invoke('job:get',    { id }),
  listJobs:  (options) => ipcRenderer.invoke('job:list',   options || {}),
  cancelJob: (id)      => ipcRenderer.invoke('job:cancel', { id }),
  retryJob:  (id)      => ipcRenderer.invoke('job:retry',  { id }),

  // Robot Management
  listRobots: () => ipcRenderer.invoke('robot:list'),

  // Controller Dashboard
  getDashboard: () => ipcRenderer.invoke('controller:dashboard'),

  // Step Debugger
  debugResume: () => ipcRenderer.invoke('debug:resume'),
  debugStep:   () => ipcRenderer.invoke('debug:step'),

  // Settings (F12)
  getSettings:  ()        => ipcRenderer.invoke('settings:get'),
  saveSettings: (updates) => ipcRenderer.invoke('settings:save', updates),

  // Credential Vault
  listCredentials:  ()     => ipcRenderer.invoke('credentials:list'),
  saveCredential:   (cred) => ipcRenderer.invoke('credentials:save', cred),
  deleteCredential: (name) => ipcRenderer.invoke('credentials:delete', { name }),

  // Audit Log (F15)
  listAudit: (options) => ipcRenderer.invoke('audit:list', options || {}),

  // Robot API info (F11)
  getRobotApiInfo: () => ipcRenderer.invoke('robot:api-info'),

  // Export Report (F13)
  exportExcel: (runs, filename) => ipcRenderer.invoke('report:export-excel', { runs, filename }),
  exportPdf:   (htmlContent, filename) => ipcRenderer.invoke('report:export-pdf', { htmlContent, filename }),

  // Push events from main → renderer
  onSchedulerJobComplete: (callback) => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('scheduler:job-complete', listener);
    return () => ipcRenderer.removeListener('scheduler:job-complete', listener);
  },

  onRobotJobQueued: (callback) => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('robot:job-queued', listener);
    return () => ipcRenderer.removeListener('robot:job-queued', listener);
  },

  onEngineLog: (callback) => {
    const listener = (_e, log) => callback(log);
    ipcRenderer.on('engine:log', listener);
    return () => ipcRenderer.removeListener('engine:log', listener);
  },

  onNodeStart: (callback) => {
    const listener = (_e, nodeId) => callback(nodeId);
    ipcRenderer.on('engine:node-start', listener);
    return () => ipcRenderer.removeListener('engine:node-start', listener);
  },

  onNodeComplete: (callback) => {
    const listener = (_e, nodeId) => callback(nodeId);
    ipcRenderer.on('engine:node-complete', listener);
    return () => ipcRenderer.removeListener('engine:node-complete', listener);
  },

  onNodeError: (callback) => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('engine:node-error', listener);
    return () => ipcRenderer.removeListener('engine:node-error', listener);
  },

  onDebugPaused: (callback) => {
    const listener = (_e, data) => callback(data);
    ipcRenderer.on('debug:paused', listener);
    return () => ipcRenderer.removeListener('debug:paused', listener);
  },
});
