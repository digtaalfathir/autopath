/**
 * Element Picker — opens a Playwright browser, lets user hover & click
 * on page elements, and returns a generated CSS selector.
 *
 * Flow:
 *   1. Launch Chromium (visible)
 *   2. Navigate to target URL
 *   3. Inject highlight overlay + click interceptor script
 *   4. User hovers → element highlighted with blue outline + tooltip
 *   5. User clicks → script captures element, generates selector
 *   6. Selector is returned to the caller
 *   7. Browser closes
 */

const { chromium } = require('playwright');

// JavaScript to inject into the target page
const PICKER_SCRIPT = `
(() => {
  // ─── State ──────────────────────────────────────────────
  let currentEl = null;
  let pickerActive = true;

  // ─── Overlay & Tooltip ──────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = '__cyclone_overlay';
  overlay.style.cssText = \`
    position: fixed; pointer-events: none; z-index: 2147483647;
    border: 2px solid #6c5ce7; background: rgba(108, 92, 231, 0.08);
    border-radius: 4px; transition: all 0.08s ease;
    box-shadow: 0 0 0 4000px rgba(0,0,0,0.15);
  \`;
  document.body.appendChild(overlay);

  const tooltip = document.createElement('div');
  tooltip.id = '__cyclone_tooltip';
  tooltip.style.cssText = \`
    position: fixed; z-index: 2147483647; pointer-events: none;
    background: #1a1a2e; color: #e8e8f0; font-family: 'Segoe UI', monospace;
    font-size: 12px; padding: 6px 12px; border-radius: 6px;
    border: 1px solid rgba(108, 92, 231, 0.5);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  \`;
  document.body.appendChild(tooltip);

  const banner = document.createElement('div');
  banner.id = '__cyclone_banner';
  banner.innerHTML = \`
    <span style="font-size:16px;margin-right:8px;">🎯</span>
    <span><b>Cyclone Picker</b> — Klik elemen yang ingin dipilih. Tekan <b>ESC</b> untuk batal.</span>
  \`;
  banner.style.cssText = \`
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: linear-gradient(135deg, #6c5ce7, #5a4bd4); color: white;
    font-family: 'Segoe UI', sans-serif; font-size: 13px;
    padding: 10px 20px; display: flex; align-items: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  \`;
  document.body.appendChild(banner);

  // ─── Selector Generator ─────────────────────────────────
  function generateSelector(el) {
    // 1. ID (most specific)
    if (el.id && !el.id.startsWith('__cyclone')) {
      return '#' + CSS.escape(el.id);
    }

    // 2. Unique data-* attributes
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-') && attr.value) {
        const sel = el.tagName.toLowerCase() + '[' + attr.name + '="' + attr.value + '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }

    // 3. name attribute (forms)
    if (el.name) {
      const sel = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }

    // 4. type + specific attributes for inputs
    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'TEXTAREA') {
      if (el.type) {
        const sel = el.tagName.toLowerCase() + '[type="' + el.type + '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
      if (el.placeholder) {
        const sel = el.tagName.toLowerCase() + '[placeholder="' + el.placeholder + '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }

    // 5. Unique class combination
    if (el.classList.length > 0) {
      const classSelector = el.tagName.toLowerCase() + '.' + Array.from(el.classList).map(c => CSS.escape(c)).join('.');
      if (document.querySelectorAll(classSelector).length === 1) return classSelector;
    }

    // 6. Build path with nth-child
    const parts = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id && !current.id.startsWith('__cyclone')) {
        parts.unshift('#' + CSS.escape(current.id));
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += ':nth-child(' + idx + ')';
        }
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ');
  }

  // ─── Build info text ────────────────────────────────────
  function getElementInfo(el) {
    let info = el.tagName.toLowerCase();
    if (el.id) info += '#' + el.id;
    if (el.classList.length) info += '.' + Array.from(el.classList).slice(0, 3).join('.');
    if (el.type) info += ' [type=' + el.type + ']';
    if (el.name) info += ' [name=' + el.name + ']';
    if (el.placeholder) info += ' [placeholder=' + el.placeholder + ']';
    const text = (el.textContent || '').trim().substring(0, 30);
    if (text && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
      info += ' "' + text + (el.textContent.trim().length > 30 ? '...' : '') + '"';
    }
    return info;
  }

  // ─── Event Handlers ─────────────────────────────────────
  function onMouseMove(e) {
    if (!pickerActive) return;
    const el = e.target;
    if (el.id && el.id.startsWith('__cyclone')) return;

    currentEl = el;
    const rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';

    tooltip.textContent = getElementInfo(el);
    tooltip.style.left = Math.min(rect.left, window.innerWidth - 350) + 'px';
    tooltip.style.top = Math.max(rect.bottom + 8, 48) + 'px';
    tooltip.style.display = 'block';
  }

  function onClick(e) {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const el = e.target;
    if (el.id && el.id.startsWith('__cyclone')) return;

    pickerActive = false;
    const selector = generateSelector(el);
    const info = getElementInfo(el);

    // Flash green to confirm
    overlay.style.borderColor = '#10b981';
    overlay.style.background = 'rgba(16, 185, 129, 0.15)';
    banner.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    banner.innerHTML = '<span style="font-size:16px;margin-right:8px;">✅</span><span><b>Selected!</b> ' + selector + '</span>';

    // Report back to Node.js
    setTimeout(() => {
      window.__cyclonePickerResolve({ selector, info, tagName: el.tagName.toLowerCase() });
    }, 600);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      pickerActive = false;
      window.__cyclonePickerResolve({ selector: null, canceled: true });
    }
  }

  // ─── Attach ─────────────────────────────────────────────
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
})();
`;

/**
 * Start the element picker.
 * @param {string} url - The URL to navigate to
 * @returns {Promise<{ selector: string|null, info: string, canceled?: boolean }>}
 */
async function startElementPicker(url) {
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // Navigate to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait a bit for page to settle
    await page.waitForTimeout(500);

    // Create promise that resolves when user picks or cancels
    const result = await new Promise((resolve) => {
      // Expose callback function so page script can call it
      page.exposeFunction('__cyclonePickerResolve', (data) => {
        resolve(data);
      }).then(() => {
        // Inject the picker script after exposing the function
        page.evaluate(PICKER_SCRIPT).catch(() => {
          resolve({ selector: null, canceled: true, error: 'Failed to inject picker' });
        });
      });

      // Also resolve if page/browser closes unexpectedly
      page.on('close', () => resolve({ selector: null, canceled: true }));
      browser.on('disconnected', () => resolve({ selector: null, canceled: true }));
    });

    return result;
  } catch (err) {
    return { selector: null, canceled: true, error: err.message };
  } finally {
    // Close browser
    try {
      if (browser) await browser.close();
    } catch (_) { }
  }
}

module.exports = { startElementPicker };
