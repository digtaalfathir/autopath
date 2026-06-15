const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const { WorkflowEngine }    = require('../engine/workflowEngine');
const { startElementPicker, closePicker } = require('../engine/elementPicker');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let engine     = null;

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
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
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

// ── Flows directory ──────────────────────────────────────────
function getFlowsDir() {
  const dir = isDev
    ? path.join(__dirname, '..', 'flows')
    : path.join(process.resourcesPath, 'flows');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Window controls ──────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// ── Save workflow ────────────────────────────────────────────
ipcMain.handle('flow:save', async (_e, { name, data }) => {
  try {
    const fp = path.join(getFlowsDir(), `${name}.json`);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: fp };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Save As ──────────────────────────────────────────────────
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

// ── Open workflow ─────────────────────────────────────────────
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

// ── List saved flows ──────────────────────────────────────────
ipcMain.handle('flow:list', async () => {
  try {
    const files = fs.readdirSync(getFlowsDir()).filter(f => f.endsWith('.json'));
    return { success: true, files: files.map(f => f.replace('.json', '')) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Execute workflow ──────────────────────────────────────────
ipcMain.handle('flow:execute', async (_e, flowData) => {
  try {
    engine = new WorkflowEngine();

    engine.on('log',          log  => mainWindow?.webContents.send('engine:log',          log));
    engine.on('node-start',   id   => mainWindow?.webContents.send('engine:node-start',   id));
    engine.on('node-complete',id   => mainWindow?.webContents.send('engine:node-complete', id));
    engine.on('node-error',   data => mainWindow?.webContents.send('engine:node-error',    data));

    const result = await engine.execute(flowData);
    engine = null;
    // result now includes { success, metrics } — forwarded to renderer as-is
    return result;
  } catch (err) {
    engine = null;
    return { success: false, error: err.message };
  }
});

// ── Stop execution ────────────────────────────────────────────
ipcMain.handle('flow:stop', async () => {
  try {
    if (engine) { await engine.stop(); engine = null; }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Element Picker ────────────────────────────────────────────
ipcMain.handle('picker:start', async (_e, { url }) => {
  try {
    // url may be null/undefined — picker will try existing sessions first
    const result = await startElementPicker(url || null, mainWindow);
    if (result.canceled) return { success: false, canceled: true };
    return { success: true, selector: result.selector, info: result.info };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Close the singleton picker browser cleanly on exit
app.on('before-quit', async () => {
  await closePicker();
});
