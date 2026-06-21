'use strict';

const { interpolate }            = require('../../utils/interpolate');
const { requirePage, resolveScope, findLocator } = require('../../utils/browser');

const SEL = { key: 'selector', label: 'CSS / XPath Selector', type: 'text', placeholder: '#element', isSelector: true };
const C = '#7C3AED';

const hoverElement = {
  meta: { type: 'hoverElement', label: 'Hover Element', category: 'Mouse', description: 'Hover the mouse over an element', color: C },
  defaults: { selector: '' },
  schema: [SEL],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine);
    engine.log('INFO', `Hovering: "${used}"`);
    await locator.hover();
  },
};

const doubleClick = {
  meta: { type: 'doubleClick', label: 'Double Click', category: 'Mouse', description: 'Double-click an element', color: C },
  defaults: { selector: '' },
  schema: [SEL],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine);
    engine.log('INFO', `Double-clicking: "${used}"`);
    await locator.dblclick();
  },
};

const rightClick = {
  meta: { type: 'rightClick', label: 'Right Click', category: 'Mouse', description: 'Right-click (context menu) an element', color: C },
  defaults: { selector: '' },
  schema: [SEL],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine);
    engine.log('INFO', `Right-clicking: "${used}"`);
    await locator.click({ button: 'right' });
  },
};

const focusElement = {
  meta: { type: 'focusElement', label: 'Focus Element', category: 'Mouse', description: 'Move keyboard focus to an element', color: C },
  defaults: { selector: '' },
  schema: [SEL],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    engine.log('INFO', `Focusing: "${used}"`);
    await locator.focus();
  },
};

const clearInput = {
  meta: { type: 'clearInput', label: 'Clear Input', category: 'Input', description: 'Clear the value of an input field', color: '#D97706' },
  defaults: { selector: '' },
  schema: [SEL],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine);
    engine.log('INFO', `Clearing input: "${used}"`);
    await locator.fill('');
  },
};

const scrollToElement = {
  meta: { type: 'scrollToElement', label: 'Scroll To Element', category: 'Mouse', description: 'Scroll until an element is in view', color: C },
  defaults: { selector: '' },
  schema: [SEL],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    engine.log('INFO', `Scrolling to: "${used}"`);
    await locator.scrollIntoViewIfNeeded();
  },
};

const scrollPage = {
  meta: { type: 'scrollPage', label: 'Scroll Page', category: 'Mouse', description: 'Scroll the page up or down by pixels', color: C },
  defaults: { direction: 'down', pixels: '600' },
  schema: [
    { key: 'direction', label: 'Direction', type: 'select', options: ['down', 'up'] },
    { key: 'pixels',    label: 'Pixels',    type: 'text', placeholder: '600' },
  ],
  execute: async (data, context, engine) => {
    const page = requirePage(context);
    const dir  = (interpolate(data.direction || 'down', context.variables) || 'down').toLowerCase();
    const px   = Math.abs(parseInt(interpolate(String(data.pixels ?? '600'), context.variables), 10) || 600);
    const dy   = dir === 'up' ? -px : px;
    engine.log('INFO', `Scrolling page ${dir} by ${px}px`);
    await page.evaluate(y => window.scrollBy(0, y), dy);
  },
};

const keyboardInput = {
  meta: { type: 'keyboardInput', label: 'Keyboard Input', category: 'Input', description: 'Press a key or shortcut (e.g. Enter, Ctrl+A)', color: '#D97706' },
  defaults: { key: 'Enter', selector: '' },
  schema: [
    { key: 'key',      label: 'Key / Shortcut', type: 'text', placeholder: 'Enter, Tab, Escape, Control+A',
      hint: 'Playwright key syntax. Combine with + (e.g. Control+C, Control+Shift+S).' },
    { key: 'selector', label: 'Focus Selector (optional)', type: 'text', placeholder: '#input', isSelector: true,
      hint: 'If set, focus this element before pressing the key.' },
  ],
  execute: async (data, context, engine) => {
    const page = requirePage(context);
    const key  = interpolate(data.key || '', context.variables).trim();
    if (!key) throw new Error('Keyboard Input: key is required.');
    if ((data.selector || '').trim()) {
      const { locator } = await findLocator(context, data, engine, { state: 'attached' });
      await locator.focus();
    }
    engine.log('INFO', `Pressing key: "${key}"`);
    await page.keyboard.press(key);
  },
};

const selectDropdown = {
  meta: { type: 'selectDropdown', label: 'Select Dropdown', category: 'Input', description: 'Select an option in a <select> element', color: '#D97706' },
  defaults: { selector: '', value: '', by: 'value' },
  schema: [
    { key: 'selector', label: 'CSS / XPath Selector', type: 'text', placeholder: 'select#country', isSelector: true },
    { key: 'by',       label: 'Match By', type: 'select', options: ['value', 'label', 'index'] },
    { key: 'value',    label: 'Option', type: 'text', placeholder: 'ID or visible label or index',
      hint: 'Supports {{variable}}.' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine);
    const by  = (data.by || 'value').toLowerCase();
    const val = interpolate(data.value ?? '', context.variables);
    engine.log('INFO', `Selecting option (${by}=${val}) in "${used}"`);
    if (by === 'label')      await locator.selectOption({ label: val });
    else if (by === 'index') await locator.selectOption({ index: parseInt(val, 10) || 0 });
    else                     await locator.selectOption(val);
  },
};

module.exports = {
  handlers: [
    hoverElement, doubleClick, rightClick, focusElement, clearInput,
    scrollToElement, scrollPage, keyboardInput, selectDropdown,
  ],
};
