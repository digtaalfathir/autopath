'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'delay',
    label: 'Delay',
    category: 'Logic',
    description: 'Pause execution for a set number of milliseconds',
    color: '#D97706',
  },
  defaults: {
    milliseconds: '1000',
  },
  schema: [
    {
      key: 'milliseconds',
      label: 'Milliseconds',
      type: 'text',
      placeholder: '1000',
      hint: 'Supports {{variable}} — resolved at runtime.',
    },
  ],
  execute: async (data, context, engine) => {
    const raw = interpolate(String(data.milliseconds ?? '1000'), context.variables);
    const ms  = Math.max(0, parseInt(raw, 10) || 0);

    engine.log('INFO', `Waiting ${ms}ms...`);
    await new Promise(r => setTimeout(r, ms));
    engine.log('INFO', `Delay complete (${ms}ms).`);
  },
};
