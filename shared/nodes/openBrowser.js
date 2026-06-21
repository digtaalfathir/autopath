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

      // Anti-hang guard: if Chrome is already running it hands the launch off to
      // the existing instance and exits, so launchPersistentContext can hang
      // forever. Fail fast with a clear message instead of getting stuck.
      const LOCK_MSG = 'Cannot open your Chrome profile — Chrome appears to be already running ' +
        '(it locks the profile). Close ALL Chrome windows and run again, or use Profile Mode = isolated.';
      const withTimeout = (p, ms) => {
        let t;
        const to = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('CHROME_LAUNCH_TIMEOUT')), ms); });
        return Promise.race([p, to]).finally(() => clearTimeout(t));
      };

      try {
        // Real Chrome profiles require the Chrome channel (not bundled Chromium).
        context.browser = await withTimeout(chromium.launchPersistentContext(dir, { ...opts, channel: 'chrome' }), 20000);
      } catch (err) {
        if (err.message === 'CHROME_LAUNCH_TIMEOUT' || isProfileLockError(err.message)) {
          throw new Error(LOCK_MSG);
        }
        if (custom) {
          // Custom dedicated profile: fall back to Edge, then bundled Chromium.
          try { context.browser = await withTimeout(chromium.launchPersistentContext(dir, { ...opts, channel: 'msedge' }), 20000); }
          catch { context.browser = await withTimeout(chromium.launchPersistentContext(dir, opts), 20000); }
        } else {
          throw new Error(`Failed to open your Chrome profile ("${dir}"). Is Google Chrome installed? — ${err.message}`);
        }
      }

      // A real profile may restore previous tabs, so pages()[0] can be a
      // background tab the user can't see. Control the visible blank tab (or a
      // fresh one) and bring it to the front so the workflow acts on what the
      // user sees.
      const blank = context.browser.pages().find(p => {
        try { return p.url() === 'about:blank' || p.url() === 'chrome://newtab/'; } catch { return false; }
      });
      context.page = blank || await context.browser.newPage();
      try { await context.page.bringToFront(); } catch (_) {}
      engine.log('INFO', `Browser opened (user profile, ${context.browser.pages().length} tab(s) restored).`);
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
