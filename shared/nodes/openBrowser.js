const { chromium } = require('playwright');
const { defaultUserDataDir } = require('../utils/browserProfile');

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
    profileMode: 'isolated',   // 'isolated' = clean session | 'user' = persistent profile
    userDataDir: '',
  },
  schema: [
    { key: 'profileMode', label: 'Profile Mode', type: 'select', options: ['isolated', 'user'],
      hint: 'isolated = fresh clean session. user = persistent profile (keeps logins, cookies, extensions across runs).' },
    { key: 'userDataDir', label: 'User Data Dir (optional)', type: 'text', placeholder: 'blank = managed profile',
      hint: 'Only for "user" mode. Path to a Chrome user-data directory. Leave blank to use the app-managed profile.' },
    { key: 'headless', label: 'Headless Mode', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const headless = data.headless === true || data.headless === 'true';
    const mode     = (data.profileMode || 'isolated').toLowerCase();
    const channels = ['chrome', 'msedge'];   // prefer real Chrome, then Edge, then bundled Chromium

    // ── Mode 2: User / persistent profile ──────────────────────────────
    // Keeps cookies, logins and extensions across runs. context.browser holds
    // a BrowserContext here — cleanup() and tab nodes still work (close() /
    // page.context() exist on both Browser and BrowserContext).
    if (mode === 'user' || mode === 'persistent') {
      const userDataDir = (data.userDataDir && data.userDataDir.trim()) || defaultUserDataDir();
      const opts = { headless, viewport: null, args: ['--start-maximized'] };

      engine.log('INFO', `Launching browser (persistent profile: ${userDataDir})`);

      let ctx = null;
      for (const channel of channels) {
        try {
          ctx = await chromium.launchPersistentContext(userDataDir, { ...opts, channel });
          engine.log('INFO', `Browser opened (persistent, ${channel}).`);
          break;
        } catch (_) { /* not installed — try next */ }
      }
      if (!ctx) {
        ctx = await chromium.launchPersistentContext(userDataDir, opts);
        engine.log('INFO', 'Browser opened (persistent, Chromium).');
      }

      context.browser = ctx;                                  // BrowserContext
      context.page    = ctx.pages()[0] || await ctx.newPage();
      return;
    }

    // ── Mode 1: Isolated (default — unchanged behaviour) ───────────────
    engine.log('INFO', `Launching browser (headless: ${headless})`);
    const opts = { headless, args: ['--start-maximized'] };

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
