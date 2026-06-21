'use strict';

const { interpolate } = require('../utils/interpolate');

const VALID_STATES = ['visible', 'attached', 'hidden', 'detached'];

module.exports = {
  meta: {
    type: 'waitElement',
    label: 'Wait Element',
    category: 'Browser Wait',
    description: 'Wait until an element reaches a specific state',
    color: '#7C3AED',
  },
  defaults: {
    selector: '',
    state: 'visible',
    timeout: '10000',
  },
  schema: [
    { key: 'selector', label: 'CSS Selector', type: 'text',
      placeholder: '#success-message', isSelector: true },
    { key: 'state', label: 'State', type: 'text',
      placeholder: 'visible',
      hint: 'visible | attached | hidden | detached' },
    { key: 'timeout', label: 'Timeout (ms)', type: 'text',
      placeholder: '10000' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) throw new Error('Browser not open. Add an "Open Browser" node first.');

    const selector = interpolate(data.selector || '', context.variables);
    if (!selector) throw new Error('Wait Element: selector is required.');

    const state   = VALID_STATES.includes(data.state) ? data.state : 'visible';
    const timeout = Math.max(1000, parseInt(interpolate(String(data.timeout || '10000'), context.variables), 10) || 10000);

    const scope = context.frame || context.page;   // iframe-aware (Switch Frame)

    engine.log('INFO', `Waiting element: "${selector}" → ${state} (timeout: ${timeout}ms)`);

    await scope.waitForSelector(selector, { state, timeout });

    engine.log('INFO', `Element found: "${selector}" is ${state}`);
  },
};
