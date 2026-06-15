'use strict';

const { interpolate } = require('../utils/interpolate');

module.exports = {
  meta: {
    type: 'setVariable',
    label: 'Set Variable',
    category: 'Logic',
    description: 'Assign a value to a workflow variable',
    color: '#16A34A',
  },
  defaults: {
    variableName: '',
    value: '',
  },
  schema: [
    {
      key: 'variableName',
      label: 'Variable Name',
      type: 'text',
      placeholder: 'username',
    },
    {
      key: 'value',
      label: 'Value',
      type: 'text',
      placeholder: 'admin',
      hint: 'Supports {{otherVariable}} interpolation.',
    },
  ],
  execute: async (data, context, engine) => {
    const name = (data.variableName || '').trim();
    if (!name) throw new Error('Set Variable: "Variable Name" is required.');

    const resolved = interpolate(data.value ?? '', context.variables);
    context.variables[name] = resolved;

    engine.log('INFO', `Variable "${name}" = ${JSON.stringify(resolved)}`);
  },
};
