'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'clickElement',
    label: 'Click Element',
    category: 'Mouse',
    description: 'Click on a page element',
    color: '#7C3AED',
  },
  defaults: {
    selector: '',
    doubleClick: false,
  },
  schema: [
    { key: 'selector',    label: 'CSS Selector', type: 'text',    placeholder: '#login-button', isSelector: true },
    { key: 'doubleClick', label: 'Double Click', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node first.');
    }

    const selector = interpolate(data.selector || '', context.variables);
    if (!selector) throw new Error('Click Element: CSS Selector is required.');

    engine.log('INFO', `Clicking: "${selector}"`);

    await context.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

    if (data.doubleClick) {
      await context.page.dblclick(selector);
    } else {
      await context.page.click(selector);
    }

    engine.log('INFO', `Click complete: "${selector}"`);
  },
};
