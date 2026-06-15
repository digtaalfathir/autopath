'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'navigateUrl',
    label: 'Navigate URL',
    category: 'Browser',
    description: 'Navigate to a specific URL',
    color: '#7C3AED',
  },
  defaults: {
    url: 'https://example.com',
  },
  schema: [
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      placeholder: 'https://example.com/user/{{userId}}',
      hint: 'Supports {{variable}} interpolation.',
    },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node before Navigate URL.');
    }

    const url = interpolate(data.url || 'https://example.com', context.variables);
    engine.log('INFO', `Navigating to: ${url}`);

    await context.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    engine.log('INFO', `Navigation complete: ${url}`);
  },
};
