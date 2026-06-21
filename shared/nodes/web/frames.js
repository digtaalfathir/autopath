'use strict';

const { interpolate }            = require('../../utils/interpolate');
const { requirePage, normalizeSelector } = require('../../utils/browser');

const C = '#0D9488';

const switchFrame = {
  meta: { type: 'switchFrame', label: 'Switch Frame', category: 'Browser Frame', description: 'Enter an iframe so element nodes act inside it', color: C },
  defaults: { frameSelector: '', timeout: '10000' },
  schema: [
    { key: 'frameSelector', label: 'Iframe Selector', type: 'text', placeholder: 'iframe#content', isSelector: true,
      hint: 'CSS/XPath of the <iframe>. Subsequent element nodes run inside it until Exit Frame.' },
    { key: 'timeout', label: 'Timeout (ms)', type: 'text', placeholder: '10000' },
  ],
  execute: async (data, context, engine) => {
    const page    = requirePage(context);
    const scope   = context.frame || page;   // supports nested iframes
    const sel     = normalizeSelector(interpolate(data.frameSelector || '', context.variables));
    if (!sel) throw new Error('Switch Frame: iframe selector is required.');
    const timeout = Math.max(1000, parseInt(interpolate(String(data.timeout || '10000'), context.variables), 10) || 10000);

    engine.log('INFO', `Switching into frame: "${sel}"`);
    const handle = await scope.waitForSelector(sel, { state: 'attached', timeout });
    const frame  = await handle.contentFrame();
    if (!frame) throw new Error('Switch Frame: selected element is not an iframe.');
    context.frame = frame;
    engine.log('INFO', 'Now operating inside the iframe.');
  },
};

const exitFrame = {
  meta: { type: 'exitFrame', label: 'Exit Frame', category: 'Browser Frame', description: 'Return to the main page from an iframe', color: C },
  defaults: {},
  schema: [],
  execute: async (data, context, engine) => {
    context.frame = null;
    engine.log('INFO', 'Exited iframe — back to main page.');
  },
};

module.exports = { handlers: [switchFrame, exitFrame] };
