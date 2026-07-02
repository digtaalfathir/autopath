'use strict';

// Desktop Automation — Tier 2: Global Keyboard & Mouse (nut.js).
// nut.js is lazily required so this module loads even where it isn't installed
// or the OS can't do input; the node then fails at runtime with a clear message.
// Input goes to whatever window is FOCUSED — pair with Tier 1 (launch) + focus.

const { interpolate } = require('../../utils/interpolate');

const CAT   = 'Desktop';
const COLOR = '#0F766E';
const S   = (v, vars) => interpolate(v ?? '', vars);
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

let _nut = null;
function nut() {
  if (_nut) return _nut;
  try { _nut = require('@nut-tree-fork/nut-js'); }
  catch { throw new Error('Global input requires "@nut-tree-fork/nut-js". Run: npm install @nut-tree-fork/nut-js'); }
  try {
    _nut.keyboard.config.autoDelayMs = 20;   // small gap → reliable typing
    _nut.mouse.config.mouseSpeed     = 2000;  // px/s for smooth moves
  } catch (_) {}
  return _nut;
}

// Map a friendly token ("ctrl","win","enter","f4","a","5") to a nut.js Key.
function tokenToKey(n, tokenRaw) {
  const t = tokenRaw.trim().toLowerCase();
  const K = n.Key;
  const map = {
    ctrl: K.LeftControl, control: K.LeftControl,
    alt: K.LeftAlt, shift: K.LeftShift,
    win: K.LeftSuper, super: K.LeftSuper, meta: K.LeftSuper, cmd: K.LeftSuper, windows: K.LeftSuper,
    enter: K.Enter, return: K.Enter, tab: K.Tab, esc: K.Escape, escape: K.Escape,
    space: K.Space, spacebar: K.Space, backspace: K.Backspace, del: K.Delete, delete: K.Delete,
    insert: K.Insert, home: K.Home, end: K.End, pageup: K.PageUp, pagedown: K.PageDown,
    up: K.Up, down: K.Down, left: K.Left, right: K.Right, capslock: K.CapsLock,
  };
  if (map[t] !== undefined) return map[t];
  if (/^f([1-9]|1[0-2])$/.test(t)) return K['F' + t.slice(1)];
  if (/^[a-z]$/.test(t)) return K[t.toUpperCase()];
  if (/^[0-9]$/.test(t)) return K['Num' + t];
  throw new Error(`Unknown key token: "${tokenRaw}"`);
}

function parseCombo(n, combo) {
  const keys = String(combo).split('+').map(s => s.trim()).filter(Boolean).map(tok => tokenToKey(n, tok));
  if (!keys.length) throw new Error('Hotkey is empty.');
  return keys;
}

// ── Send Keys / Hotkey ────────────────────────────────────────
const sendHotkey = {
  meta: { type: 'sendHotkey', label: 'Send Hotkey', category: CAT, description: 'Press a key or key-combo globally (Ctrl+A, Win+E, Enter…)', color: COLOR },
  defaults: { keys: 'Enter', repeat: '1' },
  schema: [
    { key: 'keys',   label: 'Keys / Combo', type: 'text', placeholder: 'Control+A  /  Win+E  /  Alt+F4  /  Enter',
      hint: 'Combine with + . Sent to the focused window. Supports {{variable}}.' },
    { key: 'repeat', label: 'Repeat', type: 'text', placeholder: '1' },
  ],
  execute: async (data, context, engine) => {
    const n = nut();
    const combo = S(data.keys, context.variables).trim();
    if (!combo) throw new Error('Send Hotkey: keys are required.');
    const keys   = parseCombo(n, combo);
    const repeat = Math.max(1, num(S(data.repeat, context.variables), 1));
    engine.log('INFO', `Sending hotkey: ${combo}${repeat > 1 ? ` ×${repeat}` : ''}`);
    for (let i = 0; i < repeat; i++) await n.keyboard.type(...keys);
  },
};

// ── Type Text (global) ────────────────────────────────────────
const typeText = {
  meta: { type: 'typeText', label: 'Type Text', category: CAT, description: 'Type text into the focused window', color: COLOR },
  defaults: { text: '', autoDelayMs: '', pressEnter: false },
  schema: [
    { key: 'text',        label: 'Text', type: 'textarea', placeholder: 'Hello {{name}}', hint: 'Sent to the focused window. Supports {{variable}}.' },
    { key: 'autoDelayMs', label: 'Per-key Delay (ms, optional)', type: 'text', placeholder: '20' },
    { key: 'pressEnter',  label: 'Press Enter After', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const n = nut();
    const text = S(data.text, context.variables);
    const delay = num(S(data.autoDelayMs, context.variables), null);
    if (delay != null) { try { n.keyboard.config.autoDelayMs = Math.max(0, delay); } catch (_) {} }
    engine.log('INFO', `Typing ${text.length} char(s) into focused window`);
    if (text) await n.keyboard.type(text);
    if (data.pressEnter === true || data.pressEnter === 'true') await n.keyboard.type(n.Key.Enter);
  },
};

// ── Mouse helpers ─────────────────────────────────────────────
async function moveTo(n, x, y, smooth) {
  const p = new n.Point(x, y);
  if (smooth) await n.mouse.move(n.straightTo(p));
  else        await n.mouse.setPosition(p);
}
function button(n, name) {
  return name === 'right' ? n.Button.RIGHT : name === 'middle' ? n.Button.MIDDLE : n.Button.LEFT;
}

// ── Mouse Click (coordinate) ──────────────────────────────────
const mouseClick = {
  meta: { type: 'mouseClick', label: 'Mouse Click', category: CAT, description: 'Click at screen coordinates (or current position)', color: COLOR },
  defaults: { x: '', y: '', button: 'left', double: false },
  schema: [
    { key: 'x',      label: 'X (blank = current)', type: 'text', placeholder: '640' },
    { key: 'y',      label: 'Y (blank = current)', type: 'text', placeholder: '360' },
    { key: 'button', label: 'Button', type: 'select', options: ['left', 'right', 'middle'] },
    { key: 'double', label: 'Double Click', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const n = nut();
    const xs = S(data.x, context.variables).trim();
    const ys = S(data.y, context.variables).trim();
    if (xs !== '' && ys !== '') await moveTo(n, num(xs, 0), num(ys, 0), false);
    const b = button(n, (data.button || 'left').toLowerCase());
    engine.log('INFO', `Mouse ${data.double ? 'double-' : ''}click (${data.button})${xs ? ` @ ${xs},${ys}` : ''}`);
    if (data.double === true || data.double === 'true') await n.mouse.doubleClick(b);
    else await n.mouse.click(b);
  },
};

// ── Mouse Move ────────────────────────────────────────────────
const mouseMove = {
  meta: { type: 'mouseMove', label: 'Mouse Move', category: CAT, description: 'Move the mouse to screen coordinates', color: COLOR },
  defaults: { x: '', y: '', smooth: true },
  schema: [
    { key: 'x',      label: 'X', type: 'text', placeholder: '640' },
    { key: 'y',      label: 'Y', type: 'text', placeholder: '360' },
    { key: 'smooth', label: 'Smooth Move', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const n = nut();
    const x = num(S(data.x, context.variables), null), y = num(S(data.y, context.variables), null);
    if (x == null || y == null) throw new Error('Mouse Move: X and Y are required.');
    engine.log('INFO', `Mouse move → ${x},${y}`);
    await moveTo(n, x, y, data.smooth !== false);
  },
};

// ── Mouse Scroll ──────────────────────────────────────────────
const mouseScroll = {
  meta: { type: 'mouseScroll', label: 'Mouse Scroll', category: CAT, description: 'Scroll the wheel up or down', color: COLOR },
  defaults: { direction: 'down', amount: '5' },
  schema: [
    { key: 'direction', label: 'Direction', type: 'select', options: ['down', 'up'] },
    { key: 'amount',    label: 'Amount (steps)', type: 'text', placeholder: '5' },
  ],
  execute: async (data, context, engine) => {
    const n = nut();
    const amt = Math.max(1, num(S(data.amount, context.variables), 5));
    const dir = (S(data.direction, context.variables) || 'down').toLowerCase();
    engine.log('INFO', `Mouse scroll ${dir} ${amt}`);
    if (dir === 'up') await n.mouse.scrollUp(amt); else await n.mouse.scrollDown(amt);
  },
};

// ── Mouse Drag ────────────────────────────────────────────────
const mouseDrag = {
  meta: { type: 'mouseDrag', label: 'Mouse Drag', category: CAT, description: 'Drag from one coordinate to another', color: COLOR },
  defaults: { fromX: '', fromY: '', toX: '', toY: '' },
  schema: [
    { key: 'fromX', label: 'From X', type: 'text', placeholder: '100' },
    { key: 'fromY', label: 'From Y', type: 'text', placeholder: '100' },
    { key: 'toX',   label: 'To X',   type: 'text', placeholder: '400' },
    { key: 'toY',   label: 'To Y',   type: 'text', placeholder: '300' },
  ],
  execute: async (data, context, engine) => {
    const n = nut();
    const fx = num(S(data.fromX, context.variables), null), fy = num(S(data.fromY, context.variables), null);
    const tx = num(S(data.toX, context.variables), null),   ty = num(S(data.toY, context.variables), null);
    if ([fx, fy, tx, ty].some(v => v == null)) throw new Error('Mouse Drag: From/To X and Y are required.');
    engine.log('INFO', `Mouse drag ${fx},${fy} → ${tx},${ty}`);
    await n.mouse.setPosition(new n.Point(fx, fy));
    await n.mouse.pressButton(n.Button.LEFT);
    await n.mouse.move(n.straightTo(new n.Point(tx, ty)));
    await n.mouse.releaseButton(n.Button.LEFT);
  },
};

module.exports = { handlers: [sendHotkey, typeText, mouseClick, mouseMove, mouseScroll, mouseDrag] };
