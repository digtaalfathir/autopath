'use strict';

// Shared helpers for the Advanced Web Automation node library.
// Backward-compatible: existing nodes keep using context.page directly.
//   - resolveScope(): returns the active iframe (context.frame) or the page,
//     so new element nodes work transparently inside iframes.
//   - resilient selectors: a node may carry data.selectorFallbacks (string[])
//     captured by the picker; findLocator() tries the primary first, then
//     each fallback, reducing breakage on minor UI changes.

const { interpolate } = require('./interpolate');

function requirePage(context) {
  if (!context.page) {
    throw new Error('Browser not open. Add an "Open Browser" node first.');
  }
  return context.page;
}

// Element scope — the active frame if "Switch Frame" was used, else the page.
function resolveScope(context) {
  return context.frame || context.page;
}

// Normalise a selector: auto-prefix XPath, leave CSS / engine-prefixed as-is.
function normalizeSelector(sel) {
  const s = (sel || '').trim();
  if (!s) return s;
  if (/^(xpath=|css=|text=)/i.test(s)) return s;
  if (s.startsWith('//') || s.startsWith('(//') || s.startsWith('./')) return 'xpath=' + s;
  return s;
}

// Build the ordered candidate list: primary selector + fallbacks, interpolated.
function selectorCandidates(data, variables) {
  const list = [];
  const primary = interpolate(data.selector || '', variables);
  if (primary) list.push(primary);

  const fb = Array.isArray(data.selectorFallbacks) ? data.selectorFallbacks : [];
  for (const f of fb) {
    const raw = typeof f === 'string' ? f : (f && f.value) || '';
    const v   = interpolate(raw, variables);
    if (v) list.push(v);
  }
  return [...new Set(list)].map(normalizeSelector).filter(Boolean);
}

// Resolve a Locator, trying the primary selector then each fallback.
// Returns { locator, used, index }. Throws if nothing matches.
async function findLocator(context, data, engine, opts = {}) {
  const { state = 'visible', timeout = 10000 } = opts;
  const scope = resolveScope(context);
  const cands = selectorCandidates(data, context.variables);
  if (!cands.length) throw new Error('Selector is required.');

  const per = cands.length > 1 ? Math.max(1500, Math.floor(timeout / cands.length)) : timeout;
  let lastErr;
  for (let i = 0; i < cands.length; i++) {
    try {
      const loc = scope.locator(cands[i]).first();
      await loc.waitFor({ state, timeout: per });
      if (i > 0 && engine) engine.log('WARN', `Primary selector failed — fell back to #${i}: ${cands[i]}`);
      return { locator: loc, used: cands[i], index: i };
    } catch (e) { lastErr = e; }
  }
  throw new Error(`No selector matched (tried ${cands.length}): ${cands.join(' | ')} — ${lastErr?.message || ''}`);
}

module.exports = { requirePage, resolveScope, normalizeSelector, selectorCandidates, findLocator };
