const { chromium } = require('playwright');
const { systemChromeUserDataDir, isProfileLockError } = require('../utils/browserProfile');

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
    profileMode: 'isolated',     // 'isolated' = clean session | 'user' = real Chrome profile
    userDataDir: '',
    profileDirectory: 'Default',
  },
  schema: [
    { key: 'profileMode', label: 'Profile Mode', type: 'select', options: ['isolated', 'user'],
      hint: 'isolated = fresh clean session. user = your real Chrome profile (logins, cookies, extensions). NOTE: close Chrome first — Chrome locks the profile while running.' },
    { key: 'userDataDir', label: 'User Data Dir (optional)', type: 'text', placeholder: 'blank = your real Chrome User Data',
      hint: 'Only for "user" mode. Blank = auto-detect your real Chrome profile. Set a custom path for a dedicated persistent profile.' },
    { key: 'profileDirectory', label: 'Profile Directory', type: 'text', placeholder: 'Default',
      hint: 'Which Chrome profile to load when User Data Dir is blank (e.g. "Default", "Profile 1").' },
    { key: 'headless', label: 'Headless Mode', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const headless = data.headless === true || data.headless === 'true';
    const mode     = (data.profileMode || 'isolated').toLowerCase();
    const channels = ['chrome', 'msedge'];   // prefer real Chrome, then Edge, then bundled Chromium

    // ── Mode 2: User profile (real Chrome session) ─────────────────────
    // Loads the user's actual logins / cookies / extensions. context.browser
    // holds a BrowserContext here — cleanup() and tab nodes still work
    // (close() / page.context() exist on both Browser and BrowserContext).
    if (mode === 'user' || mode === 'persistent') {
      const custom = (data.userDataDir || '').trim();
      const dir    = custom || systemChromeUserDataDir();
      const args   = ['--start-maximized'];
      // Selecting a named profile only applies to the real Chrome User Data dir.
      if (!custom) args.push(`--profile-directory=${(data.profileDirectory || 'Default').trim()}`);
      const opts = { headless, viewport: null, args };

      engine.log('INFO', `Launching ${custom ? 'persistent profile' : 'your Chrome profile'}: ${dir}`);

      try {
        // Real Chrome profiles require the Chrome channel (not bundled Chromium).
        context.browser = await chromium.launchPersistentContext(dir, { ...opts, channel: 'chrome' });
      } catch (err) {
        if (isProfileLockError(err.message)) {
          throw new Error(
            'Cannot open your Chrome profile because Chrome is already running. ' +
            'Close all Chrome windows and run again — or use Profile Mode = isolated.'
          );
        }
        if (custom) {
          // Custom dedicated profile: fall back to Edge, then bundled Chromium.
          try { context.browser = await chromium.launchPersistentContext(dir, { ...opts, channel: 'msedge' }); }
          catch { context.browser = await chromium.launchPersistentContext(dir, opts); }
        } else {
          throw new Error(`Failed to open your Chrome profile ("${dir}"). Is Google Chrome installed? — ${err.message}`);
        }
      }

      context.page = context.browser.pages()[0] || await context.browser.newPage();
      engine.log('INFO', 'Browser opened (user profile).');
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
