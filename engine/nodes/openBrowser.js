const { chromium } = require('playwright');

module.exports = {
  meta: {
    type: 'openBrowser',
    label: 'Open Browser',
    category: 'Browser',
    description: 'Launch a browser instance',
    color: '#2563EB',
  },
  defaults: {
    headless: false,
  },
  schema: [
    { key: 'headless', label: 'Headless Mode', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const headless = data.headless === true || data.headless === 'true';

    engine.log('INFO', `Launching browser (headless: ${headless})`);

    const opts = { headless, args: ['--start-maximized'] };

    // Try Chrome first, then Edge, then bundled Chromium
    const channels = ['chrome', 'msedge'];
    let launched = false;

    for (const channel of channels) {
      try {
        context.browser = await chromium.launch({ ...opts, channel });
        engine.log('INFO', `Browser opened (${channel}).`);
        launched = true;
        break;
      } catch (_) {
        // Not installed — try next
      }
    }

    if (!launched) {
      context.browser = await chromium.launch(opts);
      engine.log('INFO', 'Browser opened (Chromium).');
    }

    const ctx  = await context.browser.newContext({ viewport: null });
    context.page = await ctx.newPage();
  },
};
