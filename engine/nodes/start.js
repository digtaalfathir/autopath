module.exports = {
  meta: {
    type: 'start',
    label: 'Start',
    category: 'Flow Control',
    description: 'Starting point of the workflow',
    color: '#16A34A',
  },
  defaults: {},
  schema: [],
  execute: async (_data, _context, engine) => {
    engine.log('INFO', 'Workflow initialized.');
  },
};
