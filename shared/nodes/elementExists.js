'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'elementExists',
    label: 'Element Exists',
    category: 'Browser Get',
    description: 'Check if an element exists in the DOM, store true/false',
    color: '#16A34A',
  },
  defaults: {
    selector: '',
    outputVariable: 'elementExists',
  },
  schema: [
    { key: 'selector', label: 'CSS Selector', type: 'text',
      placeholder: '#error-message', isSelector: true },
    { key: 'outputVariable', label: 'Output Variable', type: 'text',
      placeholder: 'elementExists',
      hint: 'Use with IF node: {{elementExists == true}}' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) throw new Error('Browser not open. Add an "Open Browser" node first.');

    const selector  = interpolate(data.selector || '', context.variables);
    if (!selector) throw new Error('Element Exists: selector is required.');

    const outputVar = (data.outputVariable || 'elementExists').trim();
    const scope = context.frame || context.page;   // iframe-aware (Switch Frame)

    // page.$() returns null if not found — never throws
    let exists = false;
    try {
      const el = await scope.$(selector);
      exists = el !== null;
    } catch (_) {
      exists = false;
    }

    context.variables[outputVar] = exists;
    engine.log('INFO', `Element "${selector}" exists: ${exists} → {{${outputVar}}}`);
  },
};
