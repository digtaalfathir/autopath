const { app, BrowserWindow, ipcMain, dialog, Notification, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const { ControllerService }               = require('../../controller');
const { startElementPicker, closePicker } = require('../elementPicker');
const { AuditRepository }                 = require('../../../shared/audit/AuditRepository');
const { SettingsRepository }              = require('../../../shared/settings/SettingsRepository');
const { CredentialStore }                 = require('./CredentialStore');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow   = null;
let controller   = null;
let settingsRepo = null;
let auditRepo    = null;
let credStore    = null;
let tray         = null;
let forceQuit    = false;  // true only when user explicitly quits from tray
let trayNotified = false;  // show "running in background" hint only once

const APP_NAME = 'Autopath';

// Resolve the branded app icon, preferring the pre-sized PNG for the target.
// Falls back through sizes so the tray is never blank if one file is missing.
function loadAppIcon(preferredSize) {
  const assetsDir = path.join(__dirname, '..', '..', '..', 'assets');
  const candidates = preferredSize
    ? [`icon-${preferredSize}.png`, 'icon.png', 'icon-256.png', 'icon-32.png', 'icon-16.png']
    : ['icon.png', 'icon-256.png'];
  for (const file of candidates) {
    try {
      const img = nativeImage.createFromPath(path.join(assetsDir, file));
      if (!img.isEmpty()) return img;
    } catch (_) { /* try next */ }
  }
  return nativeImage.createEmpty();
}

// ── System Tray — keeps scheduler alive when window is closed ─────────
function createTray() {
  // Use a 32px source and let Electron scale down — sharper than a hard 16×16 resize
  let icon = loadAppIcon(32);
  if (!icon.isEmpty()) icon = icon.resize({ width: 16, height: 16, quality: 'best' });

  tray = new Tray(icon);
  tray.setToolTip(`${APP_NAME} — Scheduler running`);

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: `Show ${APP_NAME}`,
      click: () => { mainWindow?.show(); mainWindow?.focus(); },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { forceQuit = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(buildMenu());

  // Left-click restores the window
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

function hideToTray() {
  mainWindow?.hide();
  if (!trayNotified) {
    trayNotified = true;
    if (Notification.isSupported()) {
      try {
        new Notification({
          title: `${APP_NAME} running in background`,
          body:  'Scheduler and automations continue. Click the tray icon to restore.',
        }).show();
      } catch (_) {}
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1400,
    height:   900,
    minWidth: 1100,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: '#F5F6FA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: loadAppIcon(256),
    frame: false,
    titleBarStyle: 'hidden',
    show: false,   // shown on ready-to-show unless Start Minimized is enabled
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  // Start Minimized To Tray — stay hidden on launch (great for robot/scheduler).
  const startMinimized = !!getSystemSettings().startMinimized || process.argv.includes('--hidden');
  mainWindow.once('ready-to-show', () => {
    if (!startMinimized) { mainWindow.show(); mainWindow.focus(); }
    else console.log('[main] Started minimized to tray.');
  });

  // Intercept native close (Alt+F4, taskbar close on Windows).
  // Close To Tray (default ON) → hide so the scheduler keeps running.
  // When disabled → quit the app entirely.
  mainWindow.on('close', (e) => {
    if (forceQuit) return;
    const closeToTray = getSystemSettings().closeToTray !== false;
    if (closeToTray) { e.preventDefault(); hideToTray(); }
    else { forceQuit = true; }   // allow the close to proceed → app quits
  });

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
// Copy bundled demo flows from resources/flows/ → userData/flows/ on EVERY
// launch, but only files that don't already exist (copy-if-not-exists). This
// guarantees new demo flows shipped in an update appear after install, without
// ever overwriting flows the user created or edited.
// (Previously gated by a version marker, so flows added after the first 1.0.0
//  install were never seeded — that's the bug being fixed here.)
function seedInitialData() {
  if (isDev) return;   // dev uses project root directly — no seeding needed

  const srcFlows = path.join(process.resourcesPath, 'flows');
  const dstFlows = path.join(app.getPath('userData'), 'flows');

  try {
    if (!fs.existsSync(srcFlows)) return;
    if (!fs.existsSync(dstFlows)) fs.mkdirSync(dstFlows, { recursive: true });

    let copied = 0;
    for (const file of fs.readdirSync(srcFlows)) {
      const src = path.join(srcFlows, file);
      const dst = path.join(dstFlows, file);
      if (!fs.existsSync(dst)) {          // never overwrite user's existing files
        try { fs.copyFileSync(src, dst); copied++; } catch (_) {}
      }
    }
    if (copied) console.log(`[seed] Added ${copied} demo flow(s) to ${dstFlows}`);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
  }
}

// ── Notifications (F12) ───────────────────────────────────────────────
function sendDesktopNotification(title, body) {
  if (!Notification.isSupported()) return;
  try { new Notification({ title, body }).show(); } catch (_) {}
}

async function sendEmail(smtp, subject, text) {
  try {
    // lazy require so app still works if nodemailer is not installed
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: !!smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({ from: smtp.user, to: smtp.to, subject, text });
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
  }
}

function handleJobNotification(data, isScheduled) {
  const settings = settingsRepo?.get()?.notifications;
  if (!settings) return;
  const success  = data.success !== false;
  const label    = isScheduled ? 'Scheduled job' : 'Manual run';
  const wfId     = data.workflowId || data.jobId || '';

  if (success && settings.desktopOnSuccess)
    sendDesktopNotification(`${APP_NAME} — Run Complete`, `${label} "${wfId}" completed successfully.`);
  if (!success && settings.desktopOnFailure)
    sendDesktopNotification(`${APP_NAME} — Run Failed`, `${label} "${wfId}" failed: ${data.error || 'unknown error'}`);

  if (settings.emailEnabled && settings.smtp?.host) {
    const smtp = settings.smtp;
    if (success && settings.emailOnSuccess)
      sendEmail(smtp, `[Autopath] Run Complete — ${wfId}`, `${label} "${wfId}" completed successfully.\n\nTimestamp: ${new Date().toISOString()}`);
    if (!success && settings.emailOnFailure)
      sendEmail(smtp, `[Autopath] Run Failed — ${wfId}`, `${label} "${wfId}" failed.\n\nError: ${data.error}\nTimestamp: ${new Date().toISOString()}`);
  }
}

// ── Repositories (created early so window/tray can read system settings) ──
function ensureRepos() {
  if (settingsRepo) return;
  const baseDir = getDataDir();
  settingsRepo = new SettingsRepository({ settingsFile: path.join(baseDir, 'settings', 'settings.json') });
  auditRepo    = new AuditRepository   ({ auditFile:    path.join(baseDir, 'audit',    'audit.jsonl')   });
  credStore    = new CredentialStore   ({ file:         path.join(baseDir, 'credentials', 'credentials.json') });
  settingsRepo.ensureRobotToken();
}

function getSystemSettings() {
  try { return settingsRepo?.get()?.system || {}; } catch { return {}; }
}

// Register/unregister OS login-item (auto start). No-op in dev.
function applyAutoStart() {
  if (isDev) return;
  const s = getSystemSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin:  !!s.autoStart,
      openAsHidden: !!s.startMinimized,          // macOS
      args:         s.startMinimized ? ['--hidden'] : [],
    });
  } catch (err) { console.error('[main] setLoginItemSettings failed:', err.message); }
}

// ── Start the Controller (owns all repos + robot + scheduler) ─────────
function startController() {
  ensureRepos();
  const baseDir = getDataDir();

  controller = new ControllerService({
    baseDir,
    auditRepo,
    // Resolve credentials + execution guards lazily, per run
    getSecrets:         () => { try { return credStore.decryptAll(); }           catch { return {}; } },
    getExecutionConfig: () => { try { return settingsRepo.get().execution || {}; } catch { return {}; } },
    onLog:                  log  => mainWindow?.webContents.send('engine:log',           log),
    onNodeStart:            id   => mainWindow?.webContents.send('engine:node-start',    id),
    onNodeComplete:         id   => mainWindow?.webContents.send('engine:node-complete', id),
    onNodeError:            data => mainWindow?.webContents.send('engine:node-error',    data),
    onJobComplete:          data => { mainWindow?.webContents.send('robot:job-complete', data); handleJobNotification(data, false); },
    onJobQueued:            data => mainWindow?.webContents.send('robot:job-queued',     data),
    onSchedulerJobComplete: data => { mainWindow?.webContents.send('scheduler:job-complete', data); handleJobNotification(data, true); },
    onDebugPaused:          data => mainWindow?.webContents.send('debug:paused',         data),
  });
  controller.start();

  // Start Robot API server if enabled in settings
  const robotApi = settingsRepo.get().robotApi;
  if (robotApi.enabled && robotApi.token) {
    try { controller.startRobotApiServer(robotApi.port, robotApi.token); } catch (err) {
      console.error('[main] Failed to start RobotApiServer:', err.message);
    }
  }
}

// ── Window controls ───────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
// Custom titlebar X → respect Close To Tray (default ON keeps scheduler alive)
ipcMain.on('window:close', () => {
  const closeToTray = getSystemSettings().closeToTray !== false;
  if (closeToTray) hideToTray();
  else { forceQuit = true; app.quit(); }
});
// Explicit quit from tray or Ctrl+Q
ipcMain.on('app:quit', () => { forceQuit = true; app.quit(); });

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

ipcMain.handle('history:screenshot', async (_e, { runId }) => {
  try {
    return { success: true, dataUrl: controller.getReportScreenshot(runId) };
  } catch (err) {
    return { success: false, error: err.message, dataUrl: null };
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

// ── Settings (F12) ───────────────────────────────────────────────────
ipcMain.handle('settings:get', async () => {
  try { return { success: true, settings: settingsRepo.get() }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('settings:save', async (_e, updates) => {
  try {
    const prev    = settingsRepo.get();
    const saved   = settingsRepo.set(updates);
    const apiPrev = prev.robotApi;
    const apiNew  = saved.robotApi;

    // Apply Robot API changes immediately without restart
    if (apiNew.enabled && (!apiPrev.enabled || apiPrev.port !== apiNew.port || apiPrev.token !== apiNew.token)) {
      controller.startRobotApiServer(apiNew.port, apiNew.token);
    } else if (!apiNew.enabled && apiPrev.enabled) {
      controller.stopRobotApiServer();
    }

    // Sync OS auto-start entry when System settings change
    if (JSON.stringify(prev.system) !== JSON.stringify(saved.system)) applyAutoStart();

    return { success: true, settings: saved };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Credential Vault ─────────────────────────────────────────────────
ipcMain.handle('credentials:list', async () => {
  try { return { success: true, credentials: credStore.list(), encryptionAvailable: credStore.encryptionAvailable() }; }
  catch (err) { return { success: false, error: err.message, credentials: [] }; }
});

ipcMain.handle('credentials:save', async (_e, cred) => {
  try {
    const r = credStore.save(cred);
    auditRepo.log({ action: 'credential.save', details: { name: cred?.name } });
    return r;
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('credentials:delete', async (_e, { name }) => {
  try {
    const r = credStore.delete(name);
    auditRepo.log({ action: 'credential.delete', details: { name } });
    return r;
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Audit Log (F15) ──────────────────────────────────────────────────
ipcMain.handle('audit:list', async (_e, options) => {
  try { return { success: true, entries: auditRepo.list(options || {}) }; }
  catch (err) { return { success: false, error: err.message, entries: [] }; }
});

// ── Robot API info (F11) ─────────────────────────────────────────────
ipcMain.handle('robot:api-info', async () => {
  try {
    const s = settingsRepo.get().robotApi;
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const ips  = [];
    for (const ifaces of Object.values(nets)) {
      for (const iface of ifaces) {
        if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
      }
    }
    return { success: true, enabled: s.enabled, port: s.port, token: s.token, ips };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Export Report (F13) ──────────────────────────────────────────────
ipcMain.handle('report:export-excel', async (_e, { runs, filename }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Excel Report',
      defaultPath: path.join(app.getPath('downloads'), filename || 'cyclone-report.xlsx'),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled) return { success: false, canceled: true };

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Autopath';
    wb.created = new Date();

    const ws = wb.addWorksheet('Run History');
    ws.columns = [
      { header: 'Run ID',         key: 'id',             width: 30 },
      { header: 'Workflow',       key: 'workflowId',     width: 25 },
      { header: 'Status',         key: 'status',         width: 12 },
      { header: 'Start Time',     key: 'startTime',      width: 22 },
      { header: 'End Time',       key: 'endTime',        width: 22 },
      { header: 'Duration (ms)',  key: 'duration',       width: 14 },
      { header: 'Nodes Executed', key: 'nodesExecuted',  width: 16 },
      { header: 'Nodes Failed',   key: 'nodesFailed',    width: 14 },
      { header: 'Error',          key: 'error',          width: 40 },
    ];
    // Header row styling
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const r of (runs || [])) {
      ws.addRow({
        id:            r.id,
        workflowId:    r.workflowId || '',
        status:        r.status || '',
        startTime:     r.startTime ? new Date(r.startTime).toLocaleString() : '',
        endTime:       r.endTime   ? new Date(r.endTime).toLocaleString()   : '',
        duration:      r.duration  || '',
        nodesExecuted: r.nodesExecuted || '',
        nodesFailed:   r.nodesFailed   || '',
        error:         r.error         || '',
      });
    }

    await wb.xlsx.writeFile(result.filePath);
    auditRepo.log({ action: 'report.export', details: { format: 'excel', rows: runs?.length || 0 } });
    return { success: true, path: result.filePath };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('report:export-pdf', async (_e, { htmlContent, filename }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export PDF Report',
      defaultPath: path.join(app.getPath('downloads'), filename || 'cyclone-report.pdf'),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (result.canceled) return { success: false, canceled: true };

    // Create a hidden window to render the HTML and print to PDF
    const pdfWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      marginsType: 1, printBackground: true, landscape: true,
    });
    pdfWin.close();
    fs.writeFileSync(result.filePath, pdfBuffer);
    auditRepo.log({ action: 'report.export', details: { format: 'pdf' } });
    shell.openPath(result.filePath);
    return { success: true, path: result.filePath };
  } catch (err) { return { success: false, error: err.message }; }
});

// ── Element Picker ────────────────────────────────────────────────────
ipcMain.handle('picker:start', async (_e, { url }) => {
  try {
    const result = await startElementPicker(url || null, mainWindow);
    if (result.canceled) return { success: false, canceled: true };
    return { success: true, selector: result.selector, info: result.info, fallbacks: result.fallbacks || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Windows: makes desktop notifications + taskbar group use the branded name/icon
  app.setAppUserModelId('com.autopath.app');
  app.setName(APP_NAME);
  ensureRepos();        // settings available before window/tray decisions
  seedInitialData();
  createWindow();
  createTray();
  startController();
  applyAutoStart();     // sync OS login-item with saved settings
});

// Don't quit when all windows closed — stay alive in tray so scheduler keeps running.
// macOS also needs this overridden (no default "keep alive" for non-dock apps).
app.on('window-all-closed', () => {
  if (forceQuit) app.quit();
  // else: stay alive — tray keeps the process running
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', async () => {
  controller?.stop();
  await closePicker();
});
