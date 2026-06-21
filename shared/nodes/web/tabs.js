'use strict';

const { interpolate }            = require('../../utils/interpolate');
const { requirePage, findLocator } = require('../../utils/browser');

const C = '#2563EB';

// Switching the active page invalidates any iframe scope.
function setActivePage(context, page) {
  context.page  = page;
  context.frame = null;
}

const openTab = {
  meta: { type: 'openTab', label: 'Open New Tab', category: 'Browser Tabs', description: 'Open a new browser tab and switch to it', color: C },
  defaults: { url: '', outputVariable: 'tabIndex' },
  schema: [
    { key: 'url',            label: 'URL (optional)', type: 'text', placeholder: 'https://example.com' },
    { key: 'outputVariable', label: 'Tab Index Variable', type: 'text', placeholder: 'tabIndex' },
  ],
  execute: async (data, context, engine) => {
    const page = requirePage(context);
    const bc   = page.context();
    const np   = await bc.newPage();
    const url  = interpolate(data.url || '', context.variables).trim();
    if (url) await np.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    setActivePage(context, np);
    const idx = bc.pages().indexOf(np);
    const out = (data.outputVariable || 'tabIndex').trim();
    context.variables[out] = idx;
    engine.log('INFO', `Opened new tab #${idx}${url ? ` → ${url}` : ''}`);
  },
};

const switchTab = {
  meta: { type: 'switchTab', label: 'Switch Tab', category: 'Browser Tabs', description: 'Switch the active tab by index', color: C },
  defaults: { index: '0' },
  schema: [
    { key: 'index', label: 'Tab Index', type: 'text', placeholder: '0', hint: '0 = first tab. Use Get Current Tab to inspect.' },
  ],
  execute: async (data, context, engine) => {
    const page  = requirePage(context);
    const pages = page.context().pages();
    const idx   = parseInt(interpolate(String(data.index ?? '0'), context.variables), 10) || 0;
    if (idx < 0 || idx >= pages.length) throw new Error(`Switch Tab: index ${idx} out of range (0–${pages.length - 1}).`);
    await pages[idx].bringToFront();
    setActivePage(context, pages[idx]);
    engine.log('INFO', `Switched to tab #${idx}`);
  },
};

const closeTab = {
  meta: { type: 'closeTab', label: 'Close Tab', category: 'Browser Tabs', description: 'Close the current tab and switch to the last remaining', color: '#DC2626' },
  defaults: {},
  schema: [],
  execute: async (data, context, engine) => {
    const page  = requirePage(context);
    const bc    = page.context();
    await page.close();
    const pages = bc.pages();
    if (pages.length) { setActivePage(context, pages[pages.length - 1]); await context.page.bringToFront(); }
    else              { setActivePage(context, null); }
    engine.log('INFO', `Tab closed (${pages.length} remaining)`);
  },
};

const getCurrentTab = {
  meta: { type: 'getCurrentTab', label: 'Get Current Tab', category: 'Browser Tabs', description: 'Read the active tab index, URL and title', color: C },
  defaults: { outputVariable: 'currentTab' },
  schema: [
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'currentTab' },
  ],
  execute: async (data, context, engine) => {
    const page  = requirePage(context);
    const pages = page.context().pages();
    const info  = { index: pages.indexOf(page), url: page.url(), title: await page.title().catch(() => ''), total: pages.length };
    const out   = (data.outputVariable || 'currentTab').trim();
    context.variables[out] = info;
    engine.log('INFO', `Current tab #${info.index}/${info.total} — ${info.url}  ({{${out}}})`);
  },
};

const waitPopup = {
  meta: { type: 'waitPopup', label: 'Wait Popup', category: 'Browser Tabs', description: 'Wait for a popup / new window and switch to it', color: C },
  defaults: { triggerSelector: '', timeout: '15000', outputVariable: 'popupIndex' },
  schema: [
    { key: 'triggerSelector', label: 'Trigger Selector (optional)', type: 'text', placeholder: 'a[target=_blank]', isSelector: true,
      hint: 'Clicked while waiting for the popup.' },
    { key: 'timeout',        label: 'Timeout (ms)', type: 'text', placeholder: '15000' },
    { key: 'outputVariable', label: 'Popup Index Variable', type: 'text', placeholder: 'popupIndex' },
  ],
  execute: async (data, context, engine) => {
    const page    = requirePage(context);
    const bc      = page.context();
    const timeout = Math.max(1000, parseInt(interpolate(String(data.timeout || '15000'), context.variables), 10) || 15000);
    engine.log('INFO', 'Waiting for popup / new window…');
    const waitPage = bc.waitForEvent('page', { timeout });

    const trigger = interpolate(data.triggerSelector || '', context.variables).trim();
    if (trigger) {
      const { locator } = await findLocator(context, { selector: data.triggerSelector, selectorFallbacks: data.selectorFallbacks }, engine);
      await locator.click();
    }

    const popup = await waitPage;
    await popup.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
    setActivePage(context, popup);
    const idx = bc.pages().indexOf(popup);
    const out = (data.outputVariable || 'popupIndex').trim();
    context.variables[out] = idx;
    engine.log('INFO', `Popup captured as tab #${idx} → ${popup.url()}`);
  },
};

const handlePopup = {
  meta: { type: 'handlePopup', label: 'Handle Popup', category: 'Browser Tabs', description: 'Accept or dismiss a native JS dialog (alert/confirm/prompt)', color: C },
  defaults: { action: 'accept', promptText: '', triggerSelector: '', timeout: '10000' },
  schema: [
    { key: 'action',          label: 'Action', type: 'select', options: ['accept', 'dismiss'] },
    { key: 'promptText',      label: 'Prompt Text (optional)', type: 'text', placeholder: 'value for window.prompt' },
    { key: 'triggerSelector', label: 'Trigger Selector (optional)', type: 'text', placeholder: '#delete-btn', isSelector: true,
      hint: 'Clicked to raise the dialog.' },
    { key: 'timeout',         label: 'Timeout (ms)', type: 'text', placeholder: '10000' },
  ],
  execute: async (data, context, engine) => {
    const page    = requirePage(context);
    const action  = (data.action || 'accept').toLowerCase();
    const prompt  = interpolate(data.promptText || '', context.variables);
    const timeout = Math.max(1000, parseInt(interpolate(String(data.timeout || '10000'), context.variables), 10) || 10000);

    const dialogPromise = page.waitForEvent('dialog', { timeout }).then(async (dialog) => {
      engine.log('INFO', `Dialog (${dialog.type()}): "${dialog.message()}" → ${action}`);
      if (action === 'dismiss') await dialog.dismiss();
      else                      await dialog.accept(prompt || undefined);
    });

    const trigger = interpolate(data.triggerSelector || '', context.variables).trim();
    if (trigger) {
      const { locator } = await findLocator(context, { selector: data.triggerSelector, selectorFallbacks: data.selectorFallbacks }, engine);
      await locator.click().catch(() => {});
    }
    await dialogPromise;
  },
};

module.exports = { handlers: [openTab, switchTab, closeTab, getCurrentTab, waitPopup, handlePopup] };
