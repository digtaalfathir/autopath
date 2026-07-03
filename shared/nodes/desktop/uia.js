'use strict';

// Desktop Automation — Tier 4: Element-based (UIA / Win32) via the FlaUI sidecar.
// Targets elements by AutomationId / Name / ControlType — robust and
// resolution-independent (unlike Tier 2 coordinates). Windows-only; requires
// the built sidecar (see sidecar/README.md).

const { interpolate } = require('../../utils/interpolate');
const { getDesktopProvider } = require('../../automation/DesktopProvider');

const CAT   = 'Desktop';
const COLOR = '#4338CA';
const S   = (v, vars) => interpolate(v ?? '', vars);
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

const SEL = { key: 'selector', label: 'UIA Selector', type: 'text', placeholder: 'automationId:okBtn / name:OK / controlType:Edit',
  hint: 'automationId: / name: / controlType: / class: , optional #index, chain with " > ".' };
const TO = { key: 'timeout', label: 'Timeout (ms)', type: 'text', placeholder: '10000' };

// ── Launch (UIA) ──────────────────────────────────────────────
const uiaLaunch = {
  meta: { type: 'uiaLaunch', label: 'UIA Launch App', category: CAT, description: 'Launch an app and attach the UIA engine to it', color: COLOR },
  defaults: { path: '', args: '', timeout: '15000' },
  schema: [
    { key: 'path',    label: 'Program Path', type: 'text', placeholder: 'notepad.exe' },
    { key: 'args',    label: 'Arguments', type: 'text', placeholder: '' },
    TO,
  ],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const r = await dp.launch({ path: S(data.path, context.variables).trim(), args: S(data.args, context.variables).trim(), timeoutMs: num(S(data.timeout, context.variables), 15000) });
    engine.log('INFO', `UIA launched "${r.title || ''}" (pid ${r.pid}).`);
  },
};

// ── Attach (UIA) ──────────────────────────────────────────────
const uiaAttach = {
  meta: { type: 'uiaAttach', label: 'UIA Attach App', category: CAT, description: 'Attach the UIA engine to a running app (by process/PID/title)', color: COLOR },
  defaults: { process: '', pid: '', title: '' },
  schema: [
    { key: 'process', label: 'Process Name', type: 'text', placeholder: 'notepad.exe' },
    { key: 'pid',     label: 'PID (optional)', type: 'text', placeholder: '' },
    { key: 'title',   label: 'Window Title (optional)', type: 'text', placeholder: 'Untitled - Notepad' },
  ],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const r = await dp.attach({ process: S(data.process, context.variables).trim(), pid: S(data.pid, context.variables).trim(), title: S(data.title, context.variables).trim() });
    engine.log('INFO', `UIA attached "${r.title || ''}" (pid ${r.pid}).`);
  },
};

// ── Click (UIA) ───────────────────────────────────────────────
const uiaClick = {
  meta: { type: 'uiaClick', label: 'UIA Click', category: CAT, description: 'Click an element by UIA selector', color: COLOR },
  defaults: { selector: '', button: 'left', double: false, timeout: '10000' },
  schema: [SEL, { key: 'button', label: 'Button', type: 'select', options: ['left', 'right'] }, { key: 'double', label: 'Double Click', type: 'boolean' }, TO],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const selector = S(data.selector, context.variables).trim();
    engine.log('INFO', `UIA click: ${selector}`);
    await dp.click({ selector, button: (data.button || 'left'), double: data.double === true || data.double === 'true', timeoutMs: num(S(data.timeout, context.variables), 10000) });
  },
};

// ── Set Text (UIA) ────────────────────────────────────────────
const uiaSetText = {
  meta: { type: 'uiaSetText', label: 'UIA Set Text', category: CAT, description: 'Set the value/text of an element', color: COLOR },
  defaults: { selector: '', text: '', timeout: '10000' },
  schema: [SEL, { key: 'text', label: 'Text', type: 'textarea', placeholder: 'Hello {{name}}', hint: 'Supports {{variable}}.' }, TO],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const selector = S(data.selector, context.variables).trim();
    engine.log('INFO', `UIA set text: ${selector}`);
    await dp.setText({ selector, text: S(data.text, context.variables), timeoutMs: num(S(data.timeout, context.variables), 10000) });
  },
};

// ── Get Text (UIA) ────────────────────────────────────────────
const uiaGetText = {
  meta: { type: 'uiaGetText', label: 'UIA Get Text', category: CAT, description: 'Read an element value/text into a variable', color: COLOR },
  defaults: { selector: '', outputVariable: 'uiaText', timeout: '10000' },
  schema: [SEL, { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'uiaText' }, TO],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const selector = S(data.selector, context.variables).trim();
    const r = await dp.getText({ selector, timeoutMs: num(S(data.timeout, context.variables), 10000) });
    const out = (data.outputVariable || 'uiaText').trim();
    context.variables[out] = r.text || '';
    engine.log('INFO', `UIA text of "${selector}" → {{${out}}} = "${(r.text || '').slice(0, 120)}"`);
  },
};

// ── Exists (UIA) ──────────────────────────────────────────────
const uiaExists = {
  meta: { type: 'uiaExists', label: 'UIA Element Exists', category: CAT, description: 'Check whether an element exists (boolean)', color: COLOR },
  defaults: { selector: '', outputVariable: 'uiaExists', timeout: '3000' },
  schema: [SEL, { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'uiaExists' }, TO],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const selector = S(data.selector, context.variables).trim();
    const r = await dp.exists({ selector, timeoutMs: num(S(data.timeout, context.variables), 3000) });
    const out = (data.outputVariable || 'uiaExists').trim();
    context.variables[out] = !!r.exists;
    engine.log('INFO', `UIA exists "${selector}": ${!!r.exists} → {{${out}}}`);
  },
};

// ── Wait Element (UIA) ────────────────────────────────────────
const uiaWait = {
  meta: { type: 'uiaWait', label: 'UIA Wait Element', category: CAT, description: 'Wait until an element is visible or hidden', color: COLOR },
  defaults: { selector: '', state: 'visible', timeout: '15000' },
  schema: [SEL, { key: 'state', label: 'State', type: 'select', options: ['visible', 'hidden'] }, TO],
  execute: async (data, context, engine) => {
    const dp = getDesktopProvider(context);
    const selector = S(data.selector, context.variables).trim();
    engine.log('INFO', `UIA wait ${data.state || 'visible'}: ${selector}`);
    await dp.waitFor({ selector, state: (data.state || 'visible'), timeoutMs: num(S(data.timeout, context.variables), 15000) });
  },
};

module.exports = { handlers: [uiaLaunch, uiaAttach, uiaClick, uiaSetText, uiaGetText, uiaExists, uiaWait] };
