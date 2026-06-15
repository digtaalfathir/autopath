module.exports = {
  meta: {
    type: 'end',
    label: 'End',
    category: 'Flow Control',
    description: 'End point of the workflow',
    icon: '⏹',
    color: '#6b7280',
  },
  defaults: {},
  schema: [],
  execute: async (_data, _context, engine) => {
    engine.log('INFO', '⏹ End node reached');
  },
};
