const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const { ControllerService }               = require('../../controller');
const { startElementPicker, closePicker } = require('../elementPicker');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let controller = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1400,
    height:   900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Cyclone Studio',
    backgroundColor: '#F5F6FA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Resolve writable data root ────────────────────────────────────────
// Dev:  project root (./flows, ./jobs, etc.)
// Prod: app.getPath('userData') — always writable on all platforms.
//       Linux: ~/.config/cyclone-lokalpride/
//       Windows: C:\Users\...\AppData\Roaming\cyclone-lokalpride\
//       (NOT process.resourcesPath, which is read-only on Windows Program Files)
function getDataDir() {
  return isDev
    ? path.join(__dirname, '..', '..', '..')
    : app.getPath('userData');
}

// ── Flows directory (local draft storage, not managed by Controller) ──
function getFlowsDir() {
  const dir = path.join(getDataDir(), 'flows');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Initial data seeding ──────────────────────────────────────────────
// On first install: copy demo flows from resources/flows/ → userData/flows/.
// Uses a version marker so new demo flows added in future releases are seeded too.
// Never overwrites files the user has already created/modified.
const SEED_VERSION = '1.0.0';

function seedInitialData() {
  if (isDev) return;   // dev uses project root directly — no seeding needed

  const userDataDir = app.getPath('userData');
  const markerFile  = path.join(userDataDir, `.seeded-v${SEED_VERSION}`);

  if (fs.existsSync(markerFile)) return;   // already seeded this version

  const srcFlows = path.join(process.resourcesPath, 'flows');
  const dstFlows = path.join(userDataDir, 'flows');

  if (fs.existsSync(srcFlows)) {
    if (!fs.existsSync(dstFlows)) fs.mkdirSync(dstFlows, { recursive: true });
    for (const file of fs.readdirSync(srcFlows)) {
      const src = path.join(srcFlows, file);
      const dst = path.join(dstFlows, file);
      if (!fs.existsSync(dst)) {         // never overwrite user's existing files
        try { fs.copyFileSync(src, dst); } catch (_) {}
      }
    }
  }

  fs.writeFileSync(markerFile, new Date().toISOString(), 'utf-8');
}

// ── Start the Controller (owns all repos + robot + scheduler) ─────────
function startController() {
  const baseDir = getDataDir();

  controller = new ControllerService({
    baseDir,
    onLog:                  log  => mainWindow?.webContents.send('engine:log',           log),
    onNodeStart:            id   => mainWindow?.webContents.send('engine:node-start',    id),
    onNodeComplete:         id   => mainWindow?.webContents.send('engine:node-complete', id),
    onNodeError:            data => mainWindow?.webContents.send('engine:node-error',    data),
    onJobComplete:          data => mainWindow?.webContents.send('robot:job-complete',   data),
    onJobQueued:            data => mainWindow?.webContents.send('robot:job-queued',     data),
    onSchedulerJobComplete: data => mainWindow?.webContents.send('scheduler:job-complete', data),
    onDebugPaused:          data => mainWindow?.webContents.send('debug:paused',         data),
  });
  controller.start();
}

// ── Window controls ───────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// ── Local draft save / open (bypasses Controller — no versioning) ─────
ipcMain.handle('flow:save', async (_e, { name, data }) => {
  try {
    const fp = path.join(getFlowsDir(), `${name}.json`);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: fp };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('flow:saveAs', async (_e, { data }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Workflow',
      defaultPath: path.join(getFlowsDir(), 'workflow.json'),
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (result.canceled) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath, name: path.basename(result.filePath, '.json') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('flow:open', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Workflow',
      defaultPath: getFlowsDir(),
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled) return { success: false, canceled: true };
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    const data    = JSON.parse(content);
    const name    = path.basename(result.filePaths[0], '.json');
    return { success: true, data, name };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('flow:list', async () => {
  try {
    const files = fs.readdirSync(getFlowsDir()).filter(f => f.endsWith('.json'));
    return { success: true, files: files.map(f => f.replace('.json', '')) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Execution (Designer → Controller → JobQueue → Robot) ─────────────
ipcMain.handle('flow:execute', async (_e, flowData) => {
  try {
    return await controller.requestRun(flowData);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('flow:stop', async () => {
  try {
    await controller.stopCurrentJob();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Job Management ────────────────────────────────────────────────────
ipcMain.handle('job:get', async (_e, { id }) => {
  try {
    return { success: true, job: controller.getJob(id) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('job:list', async (_e, options) => {
  try {
    return { success: true, jobs: controller.listJobs(options || {}) };
  } catch (err) {
    return { success: false, error: err.message, jobs: [] };
  }
});

ipcMain.handle('job:cancel', async (_e, { id }) => {
  try {
    const result = await controller.cancelJob(id);
    return { success: result.cancelled, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('job:retry', async (_e, { id }) => {
  try {
    const job = controller.retryJob(id);
    return job ? { success: true, job } : { success: false, error: 'Cannot retry this job' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Workflow Registry ─────────────────────────────────────────────────
ipcMain.handle('workflow:publish', async (_e, { workflowId, flowData, description }) => {
  try {
    const result = controller.publishWorkflow(workflowId, flowData, description);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workflow:listVersions', async (_e, { workflowId }) => {
  try {
    return { success: true, versions: controller.listVersions(workflowId) };
  } catch (err) {
    return { success: false, error: err.message, versions: [] };
  }
});

ipcMain.handle('workflow:listPublished', async () => {
  try {
    return { success: true, workflows: controller.listPublished() };
  } catch (err) {
    return { success: false, error: err.message, workflows: [] };
  }
});

// ── Run History / Reports ─────────────────────────────────────────────
ipcMain.handle('history:list', async (_e, options) => {
  try {
    return { success: true, runs: controller.listRuns(options || {}) };
  } catch (err) {
    return { success: false, error: err.message, runs: [] };
  }
});

ipcMain.handle('history:report', async (_e, { runId }) => {
  try {
    return { success: true, report: controller.getReport(runId) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Scheduler ─────────────────────────────────────────────────────────
ipcMain.handle('scheduler:list', async () => {
  try {
    return { success: true, schedules: controller.listSchedules() };
  } catch (err) {
    return { success: false, error: err.message, schedules: [] };
  }
});

ipcMain.handle('scheduler:create', async (_e, data) => {
  try {
    return { success: true, schedule: controller.createSchedule(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('scheduler:update', async (_e, { id, updates }) => {
  try {
    return { success: true, schedule: controller.updateSchedule(id, updates) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('scheduler:delete', async (_e, { id }) => {
  try {
    controller.deleteSchedule(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('scheduler:toggle', async (_e, { id, enabled }) => {
  try {
    controller.toggleSchedule(id, enabled);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Robot Management ──────────────────────────────────────────────────
ipcMain.handle('robot:list', async () => {
  try {
    return { success: true, robots: controller.listRobots() };
  } catch (err) {
    return { success: false, error: err.message, robots: [] };
  }
});

// ── Controller Dashboard ──────────────────────────────────────────────
ipcMain.handle('controller:dashboard', async () => {
  try {
    return { success: true, data: controller.getDashboardData() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Step Debugger ─────────────────────────────────────────────────────
ipcMain.handle('debug:resume', async () => {
  try { controller.debugResume(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('debug:step', async () => {
  try { controller.debugStep(); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── Element Picker ────────────────────────────────────────────────────
ipcMain.handle('picker:start', async (_e, { url }) => {
  try {
    const result = await startElementPicker(url || null, mainWindow);
    if (result.canceled) return { success: false, canceled: true };
    return { success: true, selector: result.selector, info: result.info };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  seedInitialData();
  createWindow();
  startController();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', async () => {
  controller?.stop();
  await closePicker();
});
