'use strict';

const { interpolate }            = require('../../utils/interpolate');
const { requirePage, findLocator } = require('../../utils/browser');

const SEL = { key: 'selector', label: 'CSS / XPath Selector', type: 'text', placeholder: '#element', isSelector: true };
const C = '#2563EB';

const getAttribute = {
  meta: { type: 'getAttribute', label: 'Get Attribute', category: 'Browser Get', description: 'Read an element attribute into a variable', color: C },
  defaults: { selector: '', attribute: 'href', outputVariable: 'attr' },
  schema: [
    SEL,
    { key: 'attribute',      label: 'Attribute', type: 'text', placeholder: 'href, value, class, data-id' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'attr' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    const attr = interpolate(data.attribute || '', context.variables).trim();
    if (!attr) throw new Error('Get Attribute: attribute name is required.');
    const out  = (data.outputVariable || 'attr').trim();
    const val  = await locator.getAttribute(attr);
    context.variables[out] = val;
    engine.log('INFO', `Attribute "${attr}" of "${used}" → {{${out}}} = ${val}`);
  },
};

const setAttribute = {
  meta: { type: 'setAttribute', label: 'Set Attribute', category: 'Browser Get', description: 'Set an attribute on an element', color: C },
  defaults: { selector: '', attribute: 'value', value: '' },
  schema: [
    SEL,
    { key: 'attribute', label: 'Attribute', type: 'text', placeholder: 'value, class, data-id' },
    { key: 'value',     label: 'Value', type: 'text', placeholder: 'new value', hint: 'Supports {{variable}}.' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    const attr = interpolate(data.attribute || '', context.variables).trim();
    if (!attr) throw new Error('Set Attribute: attribute name is required.');
    const val  = interpolate(data.value ?? '', context.variables);
    await locator.evaluate((el, [a, v]) => el.setAttribute(a, v), [attr, val]);
    engine.log('INFO', `Set "${attr}"="${val}" on "${used}"`);
  },
};

const getHtml = {
  meta: { type: 'getHtml', label: 'Get HTML', category: 'Browser Get', description: 'Read innerHTML/outerHTML of an element', color: C },
  defaults: { selector: '', outputVariable: 'html', outer: false },
  schema: [
    SEL,
    { key: 'outer',          label: 'Outer HTML', type: 'boolean', hint: 'Include the element tag itself.' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'html' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    const out  = (data.outputVariable || 'html').trim();
    const html = data.outer
      ? await locator.evaluate(el => el.outerHTML)
      : await locator.innerHTML();
    context.variables[out] = html;
    engine.log('INFO', `HTML of "${used}" (${html.length} chars) → {{${out}}}`);
  },
};

const getValue = {
  meta: { type: 'getValue', label: 'Get Value', category: 'Browser Get', description: 'Read the value of an input/select/textarea', color: C },
  defaults: { selector: '', outputVariable: 'value' },
  schema: [
    SEL,
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'value' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    const out = (data.outputVariable || 'value').trim();
    const val = await locator.inputValue();
    context.variables[out] = val;
    engine.log('INFO', `Value of "${used}" → {{${out}}} = "${val}"`);
  },
};

module.exports = { handlers: [getAttribute, setAttribute, getHtml, getValue] };
