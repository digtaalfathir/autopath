module.exports = {
  meta: {
    type: 'start',
    label: 'Start',
    category: 'Flow Control',
    description: 'Starting point of the workflow',
    icon: '▶',
    color: '#10b981',
  },
  defaults: {},
  schema: [],
  execute: async (_data, _context, engine) => {
    engine.log('INFO', '🚀 Workflow initialized');
  },
};
