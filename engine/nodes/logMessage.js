'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'logMessage',
    label: 'Log Message',
    category: 'Logic',
    description: 'Print a message to the execution console',
    color: '#6B7280',
  },
  defaults: {
    message: '',
    level: 'INFO',
  },
  schema: [
    {
      key: 'message',
      label: 'Message',
      type: 'textarea',
      placeholder: 'Hello, {{username}}',
      hint: 'Supports {{variable}} and {{obj.nested}} interpolation.',
    },
    {
      key: 'level',
      label: 'Level (INFO / WARN / ERROR)',
      type: 'text',
      placeholder: 'INFO',
    },
  ],
  execute: async (data, context, engine) => {
    const msg   = interpolate(data.message || '', context.variables);
    const level = (['INFO', 'WARN', 'ERROR', 'SUCCESS'].includes((data.level || '').toUpperCase()))
      ? data.level.toUpperCase()
      : 'INFO';

    engine.log(level, msg);
  },
};
