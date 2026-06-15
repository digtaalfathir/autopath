const { chromium } = require('playwright');

module.exports = {
  meta: {
    type: 'openBrowser',
    label: 'Open Browser',
    category: 'Browser',
    description: 'Launch a Chromium browser instance',
    icon: '🌐',
    color: '#3b82f6',
  },
  defaults: {
    headless: false,
  },
  schema: [
    { key: 'headless', label: 'Headless Mode', type: 'boolean', placeholder: '' },
  ],
  execute: async (data, context, engine) => {
    const headless = data.headless === true || data.headless === 'true';
    engine.log('INFO', `Launching browser (headless: ${headless})`);

    context.browser = await chromium.launch({
      channel: 'chrome',
      headless,
      args: ['--start-maximized'],
    });

    const browserContext = await context.browser.newContext({
      viewport: null,
    });
    context.page = await browserContext.newPage();

    engine.log('INFO', '🌐 Browser opened successfully');
  },
};
