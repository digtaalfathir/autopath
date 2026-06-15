module.exports = {
  meta: {
    type: 'end',
    label: 'End',
    category: 'Flow Control',
    description: 'End point of the workflow',
    color: '#6b7280',
  },
  defaults: {
    autoCloseBrowser: true,
    restoreWindow: true,
  },
  schema: [
    { key: 'autoCloseBrowser', label: 'Auto Close Browser', type: 'boolean' },
    { key: 'restoreWindow',    label: 'Restore Cyclone Window', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const autoClose = data.autoCloseBrowser !== false;  // default true

    if (!autoClose) {
      // Signal the engine not to close the browser in its cleanup step
      context.keepBrowserOpen = true;
      engine.log('INFO', 'Browser will remain open after workflow completes.');
    }

    engine.log('INFO', 'End node reached.');
  },
};
