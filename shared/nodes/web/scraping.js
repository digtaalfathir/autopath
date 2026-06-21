'use strict';

const { interpolate }            = require('../../utils/interpolate');
const { requirePage, resolveScope, findLocator, normalizeSelector } = require('../../utils/browser');

const C = '#16A34A';

const extractTable = {
  meta: { type: 'extractTable', label: 'Extract Table', category: 'Web Scraping', description: 'Read an HTML table into an array of objects', color: C },
  defaults: { selector: 'table', outputVariable: 'tableData' },
  schema: [
    { key: 'selector',       label: 'Table Selector', type: 'text', placeholder: 'table#data', isSelector: true },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'tableData', hint: 'Array of row objects — use with For Each.' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    const rows = await locator.evaluate((table) => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      let headers = [...table.querySelectorAll('thead tr th')].map(th => norm(th.textContent));
      let body;
      if (headers.length) {
        body = [...table.querySelectorAll('tbody tr')];
        if (!body.length) body = [...table.querySelectorAll('tr')];
      } else {
        const all = [...table.querySelectorAll('tr')];
        headers = [...(all[0] ? all[0].querySelectorAll('th,td') : [])].map(c => norm(c.textContent));
        body = all.slice(1);
      }
      return body.map(tr => {
        const cells = [...tr.querySelectorAll('td,th')].map(c => norm(c.textContent));
        if (!cells.length) return null;
        const obj = {};
        cells.forEach((c, i) => { obj[headers[i] || ('col' + i)] = c; });
        return obj;
      }).filter(Boolean);
    });
    const out = (data.outputVariable || 'tableData').trim();
    context.variables[out] = rows;
    engine.log('INFO', `Extracted ${rows.length} row(s) from "${used}" → {{${out}}}`);
  },
};

const extractLinks = {
  meta: { type: 'extractLinks', label: 'Extract Links', category: 'Web Scraping', description: 'Collect links ({text, href}) into an array', color: C },
  defaults: { selector: 'a', outputVariable: 'links' },
  schema: [
    { key: 'selector',       label: 'Link Selector', type: 'text', placeholder: 'a', isSelector: true },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'links' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const scope = resolveScope(context);
    const sel   = normalizeSelector(interpolate(data.selector || 'a', context.variables) || 'a');
    const links = await scope.locator(sel).evaluateAll(els =>
      els.map(a => ({ text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.href || a.getAttribute('href') || '' }))
         .filter(l => l.href)
    );
    const out = (data.outputVariable || 'links').trim();
    context.variables[out] = links;
    engine.log('INFO', `Extracted ${links.length} link(s) → {{${out}}}`);
  },
};

const extractElements = {
  meta: { type: 'extractElements', label: 'Extract Elements', category: 'Web Scraping', description: 'Collect text (or an attribute) of matching elements into an array', color: C },
  defaults: { selector: '', attribute: '', outputVariable: 'items' },
  schema: [
    { key: 'selector',       label: 'CSS / XPath Selector', type: 'text', placeholder: '.product .name', isSelector: true },
    { key: 'attribute',      label: 'Attribute (optional)', type: 'text', placeholder: 'blank = text content' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'items' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const scope = resolveScope(context);
    const sel   = normalizeSelector(interpolate(data.selector || '', context.variables));
    if (!sel) throw new Error('Extract Elements: selector is required.');
    const attr  = interpolate(data.attribute || '', context.variables).trim();
    const items = await scope.locator(sel).evaluateAll(
      (els, a) => els.map(e => a ? e.getAttribute(a) : (e.textContent || '').replace(/\s+/g, ' ').trim()),
      attr
    );
    const out = (data.outputVariable || 'items').trim();
    context.variables[out] = items;
    engine.log('INFO', `Extracted ${items.length} element(s) → {{${out}}}`);
  },
};

module.exports = { handlers: [extractTable, extractLinks, extractElements] };
