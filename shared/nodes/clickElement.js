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
    waitNavigation: false,
  },
  schema: [
    { key: 'selector',       label: 'CSS Selector',       type: 'text',    placeholder: '#login-button', isSelector: true },
    { key: 'doubleClick',    label: 'Double Click',        type: 'boolean' },
    { key: 'waitNavigation', label: 'Wait for Navigation', type: 'boolean',
      hint: 'Enable when this click triggers a redirect or page reload.' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node first.');
    }

    const selector = interpolate(data.selector || '', context.variables);
    if (!selector) throw new Error('Click Element: CSS Selector is required.');

    const scope = context.frame || context.page;   // iframe-aware (Switch Frame)

    engine.log('INFO', `Clicking: "${selector}"`);
    await scope.waitForSelector(selector, { state: 'visible', timeout: 10000 });

    if (data.waitNavigation) {
      // Start the loadState listener BEFORE clicking to avoid the race condition
      // where navigation finishes before the listener is registered.
      // Navigation is always page-level, even when the click is inside a frame.
      engine.log('INFO', 'Waiting for navigation after click...');
      await Promise.all([
        context.page.waitForLoadState('domcontentloaded', { timeout: 15000 }),
        data.doubleClick
          ? scope.dblclick(selector)
          : scope.click(selector),
      ]);
      engine.log('INFO', 'Navigation detected and complete.');
    } else {
      if (data.doubleClick) {
        await scope.dblclick(selector);
      } else {
        await scope.click(selector);
      }
      engine.log('INFO', `Click complete: "${selector}"`);
    }
  },
};
