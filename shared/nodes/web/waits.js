'use strict';

const { interpolate }            = require('../../utils/interpolate');
const { requirePage, resolveScope, findLocator, selectorCandidates, normalizeSelector } = require('../../utils/browser');

const SEL = { key: 'selector', label: 'CSS / XPath Selector', type: 'text', placeholder: '#element', isSelector: true };
const TIMEOUT = { key: 'timeout', label: 'Timeout (ms)', type: 'text', placeholder: '10000' };
const C = '#0EA5E9';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function readTimeout(data, variables, def = 10000) {
  return Math.max(1000, parseInt(interpolate(String(data.timeout || def), variables), 10) || def);
}

const waitUntilVisible = {
  meta: { type: 'waitUntilVisible', label: 'Wait Until Visible', category: 'Browser Wait', description: 'Wait until an element becomes visible', color: C },
  defaults: { selector: '', timeout: '10000' },
  schema: [SEL, TIMEOUT],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { used } = await findLocator(context, data, engine, { state: 'visible', timeout: readTimeout(data, context.variables) });
    engine.log('INFO', `Element visible: "${used}"`);
  },
};

const waitUntilHidden = {
  meta: { type: 'waitUntilHidden', label: 'Wait Until Hidden', category: 'Browser Wait', description: 'Wait until an element is hidden or removed', color: C },
  defaults: { selector: '', timeout: '10000' },
  schema: [SEL, TIMEOUT],
  execute: async (data, context, engine) => {
    requirePage(context);
    const scope   = resolveScope(context);
    const cands   = selectorCandidates(data, context.variables);
    if (!cands.length) throw new Error('Wait Until Hidden: selector is required.');
    const timeout = readTimeout(data, context.variables);
    await scope.locator(cands[0]).first().waitFor({ state: 'hidden', timeout });
    engine.log('INFO', `Element hidden: "${cands[0]}"`);
  },
};

async function waitEnabledState(data, context, engine, wantEnabled) {
  requirePage(context);
  const timeout = readTimeout(data, context.variables);
  const { locator, used } = await findLocator(context, data, engine, { state: 'attached', timeout });
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (engine.aborted) return;
    const enabled = await locator.isEnabled().catch(() => false);
    if (enabled === wantEnabled) { engine.log('INFO', `Element ${wantEnabled ? 'enabled' : 'disabled'}: "${used}"`); return; }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for element to be ${wantEnabled ? 'enabled' : 'disabled'}: ${used}`);
}

const waitUntilEnabled = {
  meta: { type: 'waitUntilEnabled', label: 'Wait Until Enabled', category: 'Browser Wait', description: 'Wait until an element is enabled', color: C },
  defaults: { selector: '', timeout: '10000' },
  schema: [SEL, TIMEOUT],
  execute: (data, context, engine) => waitEnabledState(data, context, engine, true),
};

const waitUntilDisabled = {
  meta: { type: 'waitUntilDisabled', label: 'Wait Until Disabled', category: 'Browser Wait', description: 'Wait until an element is disabled', color: C },
  defaults: { selector: '', timeout: '10000' },
  schema: [SEL, TIMEOUT],
  execute: (data, context, engine) => waitEnabledState(data, context, engine, false),
};

const retryUntilSuccess = {
  meta: { type: 'retryUntilSuccess', label: 'Retry Until Success', category: 'Logic', description: 'Retry the BODY steps until they succeed', color: '#D97706' },
  defaults: { maxAttempts: '3', interval: '1000' },
  schema: [
    { key: 'maxAttempts', label: 'Max Attempts', type: 'text', placeholder: '3' },
    { key: 'interval',    label: 'Interval (ms)', type: 'text', placeholder: '1000', hint: 'Delay between attempts.' },
  ],
  execute: async (data, context, engine, nodeId) => {
    const max      = Math.max(1, parseInt(interpolate(String(data.maxAttempts || '3'), context.variables), 10) || 3);
    const interval = Math.max(0, parseInt(interpolate(String(data.interval || '1000'), context.variables), 10) || 0);
    let lastErr;
    for (let attempt = 1; attempt <= max; attempt++) {
      if (engine.aborted) break;
      try {
        engine.log('INFO', `Retry: attempt ${attempt}/${max}`);
        await engine.executeFromHandle(nodeId, 'body');
        engine.log('INFO', `Retry: succeeded on attempt ${attempt}`);
        await engine.executeFromHandle(nodeId, 'done');
        return { _handled: true };
      } catch (err) {
        lastErr = err;
        engine.log('WARN', `Retry: attempt ${attempt} failed — ${err.message}`);
        if (attempt < max && interval) await sleep(interval);
      }
    }
    throw new Error(`Retry Until Success: all ${max} attempts failed — ${lastErr?.message || ''}`);
  },
};

module.exports = { handlers: [waitUntilVisible, waitUntilHidden, waitUntilEnabled, waitUntilDisabled, retryUntilSuccess] };
