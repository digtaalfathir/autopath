'use strict';

// Desktop Automation — Tier 3: Window Management (nut.js).
// The "glue" that guarantees Tier 2 input reaches the right application:
// find/focus a window, wait for it, and control its state.

const { interpolate } = require('../../utils/interpolate');
const { loadNut }     = require('../../utils/nut');

const CAT   = 'Desktop';
const COLOR = '#0F766E';
const S   = (v, vars) => interpolate(v ?? '', vars);
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

function matches(title, query, exact) {
  const t = (title || '').toLowerCase(), q = query.toLowerCase();
  return exact ? t === q : t.includes(q);
}

async function findByTitle(nut, query, exact) {
  const wins = await nut.getWindows();
  for (const w of wins) {
    let t = '';
    try { t = await w.getTitle(); } catch (_) {}
    if (matches(t, query, exact)) return { win: w, title: t };
  }
  return null;
}

// Resolve the target window: explicit title → attached (context.desktopWindow)
// → the currently active window.
async function resolveWindow(nut, data, context, exact) {
  const q = S(data.title, context.variables).trim();
  if (q) {
    const r = await findByTitle(nut, q, exact);
    if (!r) throw new Error(`Window not found: "${q}"`);
    return r.win;
  }
  if (context.desktopWindow) return context.desktopWindow;
  return await nut.getActiveWindow();
}

// ── Attach Window ─────────────────────────────────────────────
const attachWindow = {
  meta: { type: 'attachWindow', label: 'Attach Window', category: CAT, description: 'Find a window by title and make it the active target', color: COLOR },
  defaults: { title: '', matchMode: 'contains', focus: true, outputVariable: 'windowTitle' },
  schema: [
    { key: 'title',          label: 'Window Title', type: 'text', placeholder: 'Notepad  /  SAP Logon' },
    { key: 'matchMode',      label: 'Match', type: 'select', options: ['contains', 'exact'] },
    { key: 'focus',          label: 'Focus After Attach', type: 'boolean' },
    { key: 'outputVariable', label: 'Title Variable', type: 'text', placeholder: 'windowTitle' },
  ],
  execute: async (data, context, engine) => {
    const nut = loadNut();
    const q = S(data.title, context.variables).trim();
    if (!q) throw new Error('Attach Window: title is required.');
    const r = await findByTitle(nut, q, (data.matchMode || 'contains') === 'exact');
    if (!r) throw new Error(`Attach Window: no window matching "${q}".`);
    context.desktopWindow = r.win;
    if (data.focus !== false) { try { await r.win.focus(); } catch (_) {} }
    context.variables[(data.outputVariable || 'windowTitle').trim()] = r.title;
    engine.log('INFO', `Attached window: "${r.title}"${data.focus !== false ? ' (focused)' : ''}`);
  },
};

// ── Wait Window ───────────────────────────────────────────────
const waitWindow = {
  meta: { type: 'waitWindow', label: 'Wait Window', category: CAT, description: 'Wait for a window to appear or disappear', color: COLOR },
  defaults: { title: '', matchMode: 'contains', state: 'appear', timeout: '30000', interval: '750', focus: true },
  schema: [
    { key: 'title',     label: 'Window Title', type: 'text', placeholder: 'Notepad' },
    { key: 'matchMode', label: 'Match', type: 'select', options: ['contains', 'exact'] },
    { key: 'state',     label: 'Wait For', type: 'select', options: ['appear', 'disappear'] },
    { key: 'timeout',   label: 'Timeout (ms)', type: 'text', placeholder: '30000' },
    { key: 'interval',  label: 'Poll Interval (ms)', type: 'text', placeholder: '750' },
    { key: 'focus',     label: 'Focus On Appear', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const nut = loadNut();
    const q = S(data.title, context.variables).trim();
    if (!q) throw new Error('Wait Window: title is required.');
    const exact    = (data.matchMode || 'contains') === 'exact';
    const wantAppear = (data.state || 'appear') === 'appear';
    const timeout  = Math.max(1000, num(S(data.timeout, context.variables), 30000));
    const interval = Math.max(200, num(S(data.interval, context.variables), 750));
    const deadline = Date.now() + timeout;

    engine.log('INFO', `Waiting for window "${q}" to ${wantAppear ? 'appear' : 'disappear'}…`);
    while (Date.now() < deadline) {
      if (engine.aborted) return;
      const r = await findByTitle(nut, q, exact);
      if (wantAppear && r) {
        context.desktopWindow = r.win;
        if (data.focus !== false) { try { await r.win.focus(); } catch (_) {} }
        engine.log('INFO', `Window appeared: "${r.title}"`);
        return;
      }
      if (!wantAppear && !r) { engine.log('INFO', `Window "${q}" is gone.`); return; }
      await new Promise(res => setTimeout(res, interval));
    }
    throw new Error(`Wait Window: "${q}" did not ${wantAppear ? 'appear' : 'disappear'} within ${timeout}ms.`);
  },
};

// ── Focus Window ──────────────────────────────────────────────
const focusWindow = {
  meta: { type: 'focusWindow', label: 'Focus Window', category: CAT, description: 'Bring a window to the front (by title, or the attached one)', color: COLOR },
  defaults: { title: '', matchMode: 'contains' },
  schema: [
    { key: 'title',     label: 'Window Title (blank = attached)', type: 'text', placeholder: 'Notepad' },
    { key: 'matchMode', label: 'Match', type: 'select', options: ['contains', 'exact'] },
  ],
  execute: async (data, context, engine) => {
    const nut = loadNut();
    const win = await resolveWindow(nut, data, context, (data.matchMode || 'contains') === 'exact');
    await win.focus();
    context.desktopWindow = win;
    let t = ''; try { t = await win.getTitle(); } catch (_) {}
    engine.log('INFO', `Focused window: "${t}"`);
  },
};

// ── Set Window State ──────────────────────────────────────────
const setWindowState = {
  meta: { type: 'setWindowState', label: 'Set Window State', category: CAT, description: 'Maximize / minimize / restore / move / resize a window', color: COLOR },
  defaults: { title: '', matchMode: 'contains', state: 'maximize', x: '0', y: '0', width: '1024', height: '768' },
  schema: [
    { key: 'title',     label: 'Window Title (blank = attached)', type: 'text', placeholder: 'Notepad' },
    { key: 'matchMode', label: 'Match', type: 'select', options: ['contains', 'exact'] },
    { key: 'state',     label: 'State', type: 'select', options: ['maximize', 'minimize', 'restore', 'move', 'resize'] },
    { key: 'x',         label: 'X (move)', type: 'text', placeholder: '0' },
    { key: 'y',         label: 'Y (move)', type: 'text', placeholder: '0' },
    { key: 'width',     label: 'Width (resize)', type: 'text', placeholder: '1024' },
    { key: 'height',    label: 'Height (resize)', type: 'text', placeholder: '768' },
  ],
  execute: async (data, context, engine) => {
    const nut = loadNut();
    const win = await resolveWindow(nut, data, context, (data.matchMode || 'contains') === 'exact');
    const state = (data.state || 'maximize').toLowerCase();
    engine.log('INFO', `Set window state: ${state}`);
    switch (state) {
      case 'minimize': await win.minimize(); break;
      case 'restore':  await win.restore();  break;
      case 'maximize': {
        const w = await nut.screen.width(), h = await nut.screen.height();
        try { await win.restore(); } catch (_) {}
        await win.move(new nut.Point(0, 0));
        await win.resize(new nut.Size(w, h));
        break;
      }
      case 'move':
        await win.move(new nut.Point(num(S(data.x, context.variables), 0), num(S(data.y, context.variables), 0)));
        break;
      case 'resize':
        await win.resize(new nut.Size(num(S(data.width, context.variables), 1024), num(S(data.height, context.variables), 768)));
        break;
      default: throw new Error(`Set Window State: unknown state "${state}".`);
    }
  },
};

// ── Get Active Window ─────────────────────────────────────────
const getActiveWindowNode = {
  meta: { type: 'getActiveWindow', label: 'Get Active Window', category: CAT, description: 'Read the title of the focused window into a variable', color: COLOR },
  defaults: { outputVariable: 'activeWindow' },
  schema: [
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'activeWindow' },
  ],
  execute: async (data, context, engine) => {
    const nut = loadNut();
    const win = await nut.getActiveWindow();
    let title = ''; try { title = await win.getTitle(); } catch (_) {}
    context.variables[(data.outputVariable || 'activeWindow').trim()] = title;
    engine.log('INFO', `Active window: "${title}"`);
  },
};

module.exports = { handlers: [attachWindow, waitWindow, focusWindow, setWindowState, getActiveWindowNode] };
