const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { WorkflowEngine } = require('../engine/workflowEngine');
const { startElementPicker } = require('../engine/elementPicker');

// Determine if running in dev mode
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let engine = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Cyclone LokalPride - RPA Designer',
    backgroundColor: '#0a0a0f',
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
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Flows directory ─────────────────────────────────────────
function getFlowsDir() {
  const flowsDir = isDev
    ? path.join(__dirname, '..', 'flows')
    : path.join(process.resourcesPath, 'flows');
  if (!fs.existsSync(flowsDir)) {
    fs.mkdirSync(flowsDir, { recursive: true });
  }
  return flowsDir;
}

// ── IPC Handlers ────────────────────────────────────────────

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

// Save workflow
ipcMain.handle('flow:save', async (_event, { name, data }) => {
  try {
    const flowsDir = getFlowsDir();
    const filePath = path.join(flowsDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save As dialog
ipcMain.handle('flow:saveAs', async (_event, { data }) => {
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

// Open workflow
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
    const data = JSON.parse(content);
    const name = path.basename(result.filePaths[0], '.json');
    return { success: true, data, name };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// List saved flows
ipcMain.handle('flow:list', async () => {
  try {
    const flowsDir = getFlowsDir();
    const files = fs.readdirSync(flowsDir).filter(f => f.endsWith('.json'));
    return { success: true, files: files.map(f => f.replace('.json', '')) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Execute workflow
ipcMain.handle('flow:execute', async (_event, flowData) => {
  try {
    engine = new WorkflowEngine();

    // Send log messages to renderer
    engine.on('log', (log) => {
      mainWindow?.webContents.send('engine:log', log);
    });

    engine.on('node-start', (nodeId) => {
      mainWindow?.webContents.send('engine:node-start', nodeId);
    });

    engine.on('node-complete', (nodeId) => {
      mainWindow?.webContents.send('engine:node-complete', nodeId);
    });

    engine.on('node-error', ({ nodeId, error }) => {
      mainWindow?.webContents.send('engine:node-error', { nodeId, error });
    });

    const result = await engine.execute(flowData);
    engine = null;
    return result;
  } catch (err) {
    engine = null;
    return { success: false, error: err.message };
  }
});

// Stop execution
ipcMain.handle('flow:stop', async () => {
  try {
    if (engine) {
      await engine.stop();
      engine = null;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Element Picker — opens browser, user clicks element, returns CSS selector
ipcMain.handle('picker:start', async (_event, { url }) => {
  try {
    if (!url) {
      return { success: false, error: 'URL is required. Add a Navigate URL node first.' };
    }
    const result = await startElementPicker(url);
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    return { success: true, selector: result.selector, info: result.info };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── App lifecycle ───────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
