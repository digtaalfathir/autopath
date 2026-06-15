module.exports = {
  meta: {
    type: 'inputText',
    label: 'Input Text',
    category: 'Interaction',
    description: 'Type text into an input element',
    icon: '⌨',
    color: '#f59e0b',
  },
  defaults: {
    selector: '',
    value: '',
    clearFirst: true,
  },
  schema: [
    { key: 'selector', label: 'CSS Selector', type: 'text', placeholder: '#username' },
    { key: 'value', label: 'Value', type: 'text', placeholder: 'Enter text...' },
    { key: 'clearFirst', label: 'Clear First', type: 'boolean', placeholder: '' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node first.');
    }

    const { selector, value } = data;
    if (!selector) throw new Error('Selector is required for Input Text');

    engine.log('INFO', `Filling "${selector}" with "${value}"`);

    // Wait for element to be visible
    await context.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

    if (data.clearFirst !== false) {
      await context.page.fill(selector, '');
    }
    await context.page.fill(selector, value || '');

    engine.log('INFO', `⌨ Input filled: ${selector}`);
  },
};
