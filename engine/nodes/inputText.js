'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'inputText',
    label: 'Input Text',
    category: 'Input',
    description: 'Type text into an input element',
    color: '#D97706',
  },
  defaults: {
    selector: '',
    value: '',
    clearFirst: true,
  },
  schema: [
    { key: 'selector',   label: 'CSS Selector',    type: 'text',    placeholder: '#username', isSelector: true },
    { key: 'value',      label: 'Value',            type: 'text',    placeholder: 'Enter text or {{variable}}',
      hint: 'Supports {{variable}} interpolation.' },
    { key: 'clearFirst', label: 'Clear Field First',type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node first.');
    }

    const selector = data.selector;
    if (!selector) throw new Error('Input Text: CSS Selector is required.');

    const value = interpolate(data.value ?? '', context.variables);

    engine.log('INFO', `Input text into "${selector}"`);

    await context.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

    if (data.clearFirst !== false) {
      await context.page.fill(selector, '');
    }
    await context.page.fill(selector, value);

    engine.log('INFO', `Input complete: "${selector}"`);
  },
};
