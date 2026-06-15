/**
 * Element Picker
 *
 * Session priority (highest to lowest):
 *   1. Existing user browser found via CDP (ports 9222-9224)
 *   2. Singleton picker browser kept alive from a prior pick call
 *   3. Launch new browser (Chrome → Edge → Chromium)
 *
 * When reusing an existing session the current page is NOT navigated —
 * the user sees exactly the page they left open.
 * When launching fresh the configured URL is loaded.
 */

'use strict';

const { chromium } = require('playwright');

// ── Singleton ─────────────────────────────────────────────────
// Kept alive between calls; closed only when the host app exits.
let _singleton = null; // { browser, page }

// ── Picker overlay script injected into the target page ───────
const PICKER_SCRIPT = `
(() => {
  // Remove any leftover artifacts from a previous pick session
  ['__cyclone_overlay', '__cyclone_tooltip', '__cyclone_banner'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });

  window.__cyclonePickerResult = undefined;

  var currentEl  = null;
  var pickerLive = true;

  // ── Overlay highlight ──────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = '__cyclone_overlay';
  overlay.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'z-index:2147483647',
    'border:2px solid #2563EB',
    'background:rgba(37,99,235,0.06)',
    'border-radius:3px',
    'transition:all 0.07s ease',
    'display:none',
    'box-shadow:0 0 0 4000px rgba(0,0,0,0.10)',
  ].join(';');
  document.body.appendChild(overlay);

  // ── Element info tooltip ───────────────────────────────────
  var tooltip = document.createElement('div');
  tooltip.id = '__cyclone_tooltip';
  tooltip.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'pointer-events:none',
    'background:#111827',
    'color:#F9FAFB',
    'font-family:Cascadia Code,Consolas,monospace',
    'font-size:11px',
    'padding:4px 9px',
    'border-radius:3px',
    'border:1px solid rgba(255,255,255,0.12)',
    'box-shadow:0 4px 12px rgba(0,0,0,0.35)',
    'max-width:440px',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'display:none',
  ].join(';');
  document.body.appendChild(tooltip);

  // ── Top instruction banner ─────────────────────────────────
  var banner = document.createElement('div');
  banner.id = '__cyclone_banner';
  banner.innerHTML = [
    '<div style="display:flex;align-items:center;gap:10px">',
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"',
    ' stroke="white" stroke-width="1.5" stroke-linecap="round">',
    '<circle cx="8" cy="8" r="4"/>',
    '<path d="M8 1v3M8 12v3M1 8h3M12 8h3"/>',
    '</svg>',
    '<span style="font-weight:600">Element Picker</span>',
    '<span style="opacity:0.75;font-weight:400">',
    'Click an element to capture its selector. Press ESC to cancel.',
    '</span>',
    '</div>',
  ].join('');
  banner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:2147483647',
    'background:#1D4ED8',
    'color:white',
    'font-family:Segoe UI,system-ui,sans-serif',
    'font-size:13px',
    'padding:9px 18px',
    'display:flex',
    'align-items:center',
    'box-shadow:0 2px 8px rgba(0,0,0,0.25)',
    'border-bottom:1px solid rgba(255,255,255,0.15)',
  ].join(';');
  document.body.appendChild(banner);

  // ── Selector generator ─────────────────────────────────────
  function generateSelector(el) {
    if (el.id && !el.id.startsWith('__cyclone')) {
      return '#' + CSS.escape(el.id);
    }
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name.startsWith('data-') && attr.value) {
        var sel = el.tagName.toLowerCase() + '[' + attr.name + '="' + attr.value + '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }
    if (el.name) {
      var sel = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    if (['INPUT','BUTTON','TEXTAREA'].includes(el.tagName)) {
      if (el.placeholder) {
        var sel = el.tagName.toLowerCase() + '[placeholder="' + el.placeholder + '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }
    if (el.classList.length > 0) {
      var cls = el.tagName.toLowerCase() + '.' +
        Array.from(el.classList).map(function(c){ return CSS.escape(c); }).join('.');
      if (document.querySelectorAll(cls).length === 1) return cls;
    }
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      var part = cur.tagName.toLowerCase();
      if (cur.id && !cur.id.startsWith('__cyclone')) {
        parts.unshift('#' + CSS.escape(cur.id));
        break;
      }
      var parent = cur.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c){ return c.tagName === cur.tagName; });
        if (siblings.length > 1) part += ':nth-child(' + (siblings.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(' > ');
  }

  function getInfo(el) {
    var info = el.tagName.toLowerCase();
    if (el.id) info += '#' + el.id;
    if (el.classList.length) info += '.' + Array.from(el.classList).slice(0, 3).join('.');
    if (el.type)        info += ' [type=' + el.type + ']';
    if (el.name)        info += ' [name=' + el.name + ']';
    if (el.placeholder) info += ' [placeholder=' + el.placeholder + ']';
    var text = (el.textContent || '').trim().substring(0, 32);
    if (text && !['INPUT','TEXTAREA','SELECT'].includes(el.tagName)) {
      info += ' "' + text + (el.textContent.trim().length > 32 ? '...' : '') + '"';
    }
    return info;
  }

  // ── Event handlers ─────────────────────────────────────────
  function onMove(e) {
    if (!pickerLive) return;
    var el = e.target;
    if (el.id && el.id.startsWith('__cyclone')) return;
    currentEl = el;
    var rect = el.getBoundingClientRect();
    overlay.style.left   = rect.left   + 'px';
    overlay.style.top    = rect.top    + 'px';
    overlay.style.width  = rect.width  + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
    tooltip.textContent = getInfo(el);
    tooltip.style.left = Math.min(rect.left, window.innerWidth - 420) + 'px';
    tooltip.style.top  = Math.max(rect.bottom + 6, 50) + 'px';
    tooltip.style.display = 'block';
  }

  function onClick(e) {
    if (!pickerLive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var el = e.target;
    if (el.id && el.id.startsWith('__cyclone')) return;
    pickerLive = false;

    var selector = generateSelector(el);
    var info     = getInfo(el);

    // Confirmation flash
    overlay.style.borderColor = '#16A34A';
    overlay.style.background  = 'rgba(22,163,74,0.08)';
    banner.style.background   = '#166534';
    banner.innerHTML = [
      '<div style="display:flex;align-items:center;gap:10px">',
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"',
      ' stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '<path d="M3 8l3.5 3.5L13 5"/>',
      '</svg>',
      '<span style="font-weight:600">Element selected</span>',
      '<code style="opacity:0.8;font-family:Consolas,monospace;font-size:12px">' + selector + '</code>',
      '</div>',
    ].join('');

    setTimeout(function() {
      overlay.remove();
      tooltip.remove();
      banner.remove();
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click',     onClick, true);
      document.removeEventListener('keydown',   onKey,   true);
      window.__cyclonePickerResult = { selector: selector, info: info, tagName: el.tagName.toLowerCase() };
    }, 500);
  }

  function onKey(e) {
    if (e.key === 'Escape' && pickerLive) {
      pickerLive = false;
      overlay.remove();
      tooltip.remove();
      banner.remove();
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click',     onClick, true);
      document.removeEventListener('keydown',   onKey,   true);
      window.__cyclonePickerResult = { selector: null, canceled: true };
    }
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click',     onClick, true);
  document.addEventListener('keydown',   onKey,   true);
})();
`;

// ── Helpers ───────────────────────────────────────────────────

function isSingletonAlive() {
  try {
    return _singleton !== null && _singleton.browser.isConnected();
  } catch (_) {
    return false;
  }
}

/**
 * Try to attach to a browser the user already has open via the Chrome
 * DevTools Protocol.  Works when Chrome/Edge is running with
 * --remote-debugging-port=<port>.  Silently skips ports that are not
 * listening.
 */
async function tryConnectCDP() {
  const ports = [9222, 9223, 9224];
  for (const port of ports) {
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 1500 });
      const contexts = browser.contexts();
      if (contexts.length > 0) {
        const pages = contexts[0].pages();
        const page  = pages.length > 0 ? pages[0] : await contexts[0].newPage();
        return { browser, page, via: 'cdp' };
      }
      // Connected but empty — not useful
      await browser.close();
    } catch (_) {
      // Port not open or not a browser — skip
    }
  }
  return null;
}

/** Launch a new browser (Chrome → Edge → bundled Chromium). */
async function launchBrowser() {
  const opts = { headless: false, args: ['--start-maximized'] };
  const channels = ['chrome', 'msedge'];
  for (const channel of channels) {
    try {
      const browser = await chromium.launch({ ...opts, channel });
      const ctx     = await browser.newContext({ viewport: null });
      const page    = await ctx.newPage();
      return { browser, page, via: channel };
    } catch (_) {
      // Not installed — try next
    }
  }
  // Last resort: Playwright's bundled Chromium
  const browser = await chromium.launch(opts);
  const ctx     = await browser.newContext({ viewport: null });
  const page    = await ctx.newPage();
  return { browser, page, via: 'chromium' };
}

/**
 * Poll the page for window.__cyclonePickerResult.
 * Resolves as soon as the value is set or the page/browser closes.
 */
function waitForPickerResult(browser, page) {
  return new Promise((resolve) => {
    let done = false;

    const finish = (value) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      resolve(value);
    };

    const timer = setInterval(async () => {
      if (done) return;
      try {
        const val = await page.evaluate(() => window.__cyclonePickerResult);
        if (val !== undefined) finish(val);
      } catch (_) {
        finish({ selector: null, canceled: true });
      }
    }, 150);

    page.on('close',          () => finish({ selector: null, canceled: true }));
    browser.on('disconnected',() => finish({ selector: null, canceled: true }));
  });
}

// ── Public API ────────────────────────────────────────────────

/**
 * @param {string|null} url  - URL to navigate to when launching a fresh browser.
 *                            Ignored when attaching to an existing session.
 * @param {Electron.BrowserWindow|null} mainWindow
 */
async function startElementPicker(url, mainWindow = null) {
  const wasVisible = mainWindow && !mainWindow.isMinimized();
  if (wasVisible) {
    mainWindow.minimize();
    await new Promise(r => setTimeout(r, 250));
  }

  let session   = null; // { browser, page, via }
  let navigated = false;
  let ownsBrowser = false;

  try {
    // ── Priority 1: Attach via CDP to user's existing browser ──
    session = await tryConnectCDP();
    if (session) {
      // Keep current page — do not navigate
      navigated   = false;
      ownsBrowser = false;
    }

    // ── Priority 2: Reuse our singleton picker browser ─────────
    if (!session && isSingletonAlive()) {
      session     = { browser: _singleton.browser, page: _singleton.page, via: 'singleton' };
      navigated   = false;
      ownsBrowser = true;
      if (url) {
        // Navigate to the configured URL in the existing window
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        navigated = true;
      }
    }

    // ── Priority 3: Launch a fresh browser ─────────────────────
    if (!session) {
      session     = await launchBrowser();
      ownsBrowser = true;
      if (url) {
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        navigated = true;
      }
      // Store as singleton for next pick
      _singleton = { browser: session.browser, page: session.page };
    }

    // Bring the browser tab to the foreground
    await session.page.bringToFront();
    if (!navigated) {
      // Small delay so the OS can switch focus
      await new Promise(r => setTimeout(r, 200));
    }

    // Reset previous result before injecting
    await session.page.evaluate(() => { window.__cyclonePickerResult = undefined; }).catch(() => {});

    // Inject the picker UI
    await session.page.evaluate(PICKER_SCRIPT);

    // Wait for user to pick or cancel
    const result = await waitForPickerResult(session.browser, session.page);

    // ── Post-pick cleanup ──────────────────────────────────────
    if (session.via === 'cdp') {
      // Disconnect CDP without closing the user's browser
      try { await session.browser.close(); } catch (_) {}
    } else if (ownsBrowser) {
      // Keep browser open for next pick (singleton)
      _singleton = { browser: session.browser, page: session.page };
    }

    return result;

  } catch (err) {
    // If singleton is dead, clear it
    if (_singleton && !isSingletonAlive()) {
      _singleton = null;
    }
    return { selector: null, canceled: true, error: err.message };

  } finally {
    if (wasVisible && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.focus();
    }
  }
}

/** Close the singleton browser. Call on app exit. */
async function closePicker() {
  if (_singleton) {
    try {
      if (_singleton.browser.isConnected()) {
        await _singleton.browser.close();
      }
    } catch (_) {}
    _singleton = null;
  }
}

module.exports = { startElementPicker, closePicker };
