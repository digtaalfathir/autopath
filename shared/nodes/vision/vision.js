'use strict';

// Tier 5 — Vision / Surface automation nodes (Citrix / RDP / VNC + universal).
// Image-template + OCR based; works on pixels only. Category: "Vision".

const fs = require('fs');
const { interpolate } = require('../../utils/interpolate');
const { loadNut }     = require('../../utils/nut');
const vision          = require('../../vision/vision');

const CAT   = 'Vision';
const COLOR = '#0D9488';
const S   = (v, vars) => interpolate(v ?? '', vars);
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

// Build a region {x,y,width,height} from fields, or null (full screen).
function region(data, ctx) {
  const x = num(S(data.x, ctx.variables), null), y = num(S(data.y, ctx.variables), null);
  const w = num(S(data.width, ctx.variables), null), h = num(S(data.height, ctx.variables), null);
  return (x != null && y != null && w != null && h != null) ? { x, y, width: w, height: h } : null;
}
const REGION_FIELDS = [
  { key: 'x',      label: 'Region X (optional)', type: 'text', placeholder: 'blank = full screen' },
  { key: 'y',      label: 'Region Y (optional)', type: 'text', placeholder: '' },
  { key: 'width',  label: 'Region Width', type: 'text', placeholder: '' },
  { key: 'height', label: 'Region Height', type: 'text', placeholder: '' },
];

async function clickAt(cx, cy, buttonName, double) {
  const nut = loadNut();
  await nut.mouse.setPosition(new nut.Point(cx, cy));
  const b = buttonName === 'right' ? nut.Button.RIGHT : nut.Button.LEFT;
  if (double) await nut.mouse.doubleClick(b); else await nut.mouse.click(b);
}

// ── Capture Screen ────────────────────────────────────────────
const captureScreen = {
  meta: { type: 'captureScreen', label: 'Capture Screen', category: CAT, description: 'Save a screenshot (full screen or region) to a file', color: COLOR },
  defaults: { x: '', y: '', width: '', height: '', filePath: '', outputVariable: 'screenshotPath' },
  schema: [...REGION_FIELDS,
    { key: 'filePath',       label: 'File Path (optional)', type: 'text', placeholder: 'auto-generated if blank' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'screenshotPath' },
  ],
  execute: async (data, ctx, engine) => {
    const file = await vision.captureToFile(region(data, ctx));
    let dest = S(data.filePath, ctx.variables).trim();
    if (dest) { try { fs.copyFileSync(file, dest); fs.unlinkSync(file); } catch (_) { dest = file; } }
    else dest = file;
    ctx.variables[(data.outputVariable || 'screenshotPath').trim()] = dest;
    engine.log('INFO', `Screenshot saved → ${dest}`);
  },
};

// ── Click Image ───────────────────────────────────────────────
const clickImage = {
  meta: { type: 'clickImage', label: 'Click Image', category: CAT, description: 'Find a template image on screen and click it', color: COLOR },
  defaults: { templatePath: '', confidence: '0.85', button: 'left', double: false, x: '', y: '', width: '', height: '' },
  schema: [
    { key: 'templatePath', label: 'Template Image Path', type: 'text', placeholder: 'C:\\templates\\login-btn.png' },
    { key: 'confidence',   label: 'Confidence (0–1)', type: 'text', placeholder: '0.85' },
    { key: 'button',       label: 'Button', type: 'select', options: ['left', 'right'] },
    { key: 'double',       label: 'Double Click', type: 'boolean' },
    ...REGION_FIELDS,
  ],
  execute: async (data, ctx, engine) => {
    const tpl = S(data.templatePath, ctx.variables).trim();
    if (!tpl) throw new Error('Click Image: template image path is required.');
    const conf = parseFloat(S(data.confidence, ctx.variables)) || 0.85;
    const m = await vision.findImageOnScreen(tpl, region(data, ctx), conf);
    if (!m.found) throw new Error(`Click Image: template not found (best score ${m.score?.toFixed(2)}).`);
    engine.log('INFO', `Image matched @ ${m.centerX},${m.centerY} (score ${m.score.toFixed(2)}) — clicking`);
    await clickAt(m.centerX, m.centerY, data.button || 'left', data.double === true || data.double === 'true');
  },
};

// ── Wait Image ────────────────────────────────────────────────
const waitImage = {
  meta: { type: 'waitImage', label: 'Wait Image', category: CAT, description: 'Wait until a template image appears or disappears', color: COLOR },
  defaults: { templatePath: '', confidence: '0.85', state: 'appear', timeout: '30000', interval: '1000', x: '', y: '', width: '', height: '' },
  schema: [
    { key: 'templatePath', label: 'Template Image Path', type: 'text', placeholder: 'C:\\templates\\ready.png' },
    { key: 'confidence',   label: 'Confidence (0–1)', type: 'text', placeholder: '0.85' },
    { key: 'state',        label: 'Wait For', type: 'select', options: ['appear', 'disappear'] },
    { key: 'timeout',      label: 'Timeout (ms)', type: 'text', placeholder: '30000' },
    { key: 'interval',     label: 'Poll Interval (ms)', type: 'text', placeholder: '1000' },
    ...REGION_FIELDS,
  ],
  execute: async (data, ctx, engine) => {
    const tpl = S(data.templatePath, ctx.variables).trim();
    if (!tpl) throw new Error('Wait Image: template image path is required.');
    const conf = parseFloat(S(data.confidence, ctx.variables)) || 0.85;
    const wantAppear = (data.state || 'appear') === 'appear';
    const timeout = Math.max(1000, num(S(data.timeout, ctx.variables), 30000));
    const interval = Math.max(300, num(S(data.interval, ctx.variables), 1000));
    const reg = region(data, ctx);
    const deadline = Date.now() + timeout;
    engine.log('INFO', `Waiting for image to ${wantAppear ? 'appear' : 'disappear'}…`);
    while (Date.now() < deadline) {
      if (engine.aborted) return;
      const m = await vision.findImageOnScreen(tpl, reg, conf);
      if (m.found === wantAppear) { engine.log('INFO', `Image ${wantAppear ? 'appeared' : 'gone'}.`); return; }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error(`Wait Image: did not ${wantAppear ? 'appear' : 'disappear'} within ${timeout}ms.`);
  },
};

// ── Image Exists ──────────────────────────────────────────────
const imageExists = {
  meta: { type: 'imageExists', label: 'Image Exists', category: CAT, description: 'Check whether a template image is on screen (boolean)', color: COLOR },
  defaults: { templatePath: '', confidence: '0.85', outputVariable: 'imageFound', x: '', y: '', width: '', height: '' },
  schema: [
    { key: 'templatePath',   label: 'Template Image Path', type: 'text', placeholder: 'C:\\templates\\icon.png' },
    { key: 'confidence',     label: 'Confidence (0–1)', type: 'text', placeholder: '0.85' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'imageFound' },
    ...REGION_FIELDS,
  ],
  execute: async (data, ctx, engine) => {
    const tpl = S(data.templatePath, ctx.variables).trim();
    if (!tpl) throw new Error('Image Exists: template image path is required.');
    const conf = parseFloat(S(data.confidence, ctx.variables)) || 0.85;
    const m = await vision.findImageOnScreen(tpl, region(data, ctx), conf);
    const out = (data.outputVariable || 'imageFound').trim();
    ctx.variables[out] = !!m.found;
    engine.log('INFO', `Image exists: ${!!m.found} (score ${m.score?.toFixed(2)}) → {{${out}}}`);
  },
};

// ── Click Text (OCR) ──────────────────────────────────────────
const clickText = {
  meta: { type: 'clickText', label: 'Click Text', category: CAT, description: 'OCR the screen, find text and click it', color: COLOR },
  defaults: { text: '', occurrence: '1', button: 'left', double: false, x: '', y: '', width: '', height: '' },
  schema: [
    { key: 'text',       label: 'Text to Click', type: 'text', placeholder: 'Login' },
    { key: 'occurrence', label: 'Occurrence (nth)', type: 'text', placeholder: '1' },
    { key: 'button',     label: 'Button', type: 'select', options: ['left', 'right'] },
    { key: 'double',     label: 'Double Click', type: 'boolean' },
    ...REGION_FIELDS,
  ],
  execute: async (data, ctx, engine) => {
    const needle = S(data.text, ctx.variables).trim();
    if (!needle) throw new Error('Click Text: text is required.');
    const { words } = await vision.ocrScreen(region(data, ctx));
    const hits = words.filter(w => (w.text || '').toLowerCase().includes(needle.toLowerCase()));
    const idx = Math.max(1, num(S(data.occurrence, ctx.variables), 1)) - 1;
    if (idx >= hits.length) throw new Error(`Click Text: "${needle}" not found (matches: ${hits.length}).`);
    const hit = hits[idx];
    engine.log('INFO', `Text "${needle}" @ ${hit.cx},${hit.cy} — clicking`);
    await clickAt(hit.cx, hit.cy, data.button || 'left', data.double === true || data.double === 'true');
  },
};

// ── Read Text (OCR) ───────────────────────────────────────────
const readText = {
  meta: { type: 'readText', label: 'Read Text', category: CAT, description: 'OCR a region (or full screen) into a variable', color: COLOR },
  defaults: { x: '', y: '', width: '', height: '', outputVariable: 'ocrText' },
  schema: [...REGION_FIELDS,
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'ocrText' },
  ],
  execute: async (data, ctx, engine) => {
    const { text } = await vision.ocrScreen(region(data, ctx));
    const out = (data.outputVariable || 'ocrText').trim();
    const clean = (text || '').trim();
    ctx.variables[out] = clean;
    engine.log('INFO', `OCR read ${clean.length} char(s) → {{${out}}}`);
  },
};

module.exports = { handlers: [captureScreen, clickImage, waitImage, imageExists, clickText, readText] };
