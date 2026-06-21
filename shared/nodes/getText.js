'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'getText',
    label: 'Get Text',
    category: 'Browser Get',
    description: 'Extract visible text from an element into a variable',
    color: '#2563EB',
  },
  defaults: {
    selector: '',
    outputVariable: 'text',
    timeout: '10000',
  },
  schema: [
    { key: 'selector', label: 'CSS Selector', type: 'text',
      placeholder: 'h1.post-title', isSelector: true },
    { key: 'outputVariable', label: 'Output Variable', type: 'text',
      placeholder: 'text',
      hint: 'Access extracted text with {{text}} in later nodes.' },
    { key: 'timeout', label: 'Timeout (ms)', type: 'text',
      placeholder: '10000' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) throw new Error('Browser not open. Add an "Open Browser" node first.');

    const selector  = interpolate(data.selector || '', context.variables);
    if (!selector) throw new Error('Get Text: selector is required.');

    const outputVar = (data.outputVariable || 'text').trim();
    const timeout   = Math.max(1000, parseInt(interpolate(String(data.timeout || '10000'), context.variables), 10) || 10000);

    const scope = context.frame || context.page;   // iframe-aware (Switch Frame)

    engine.log('INFO', `Getting text from: "${selector}"`);

    await scope.waitForSelector(selector, { state: 'visible', timeout });
    const raw  = await scope.textContent(selector);
    const text = (raw || '').trim();

    context.variables[outputVar] = text;
    engine.log('INFO', `Text extracted: "${text.slice(0, 120)}${text.length > 120 ? '…' : ''}" → {{${outputVar}}}`);
  },
};
