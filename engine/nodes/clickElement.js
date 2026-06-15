module.exports = {
  meta: {
    type: 'clickElement',
    label: 'Click Element',
    category: 'Interaction',
    description: 'Click on a page element',
    icon: '👆',
    color: '#ef4444',
  },
  defaults: {
    selector: '',
    doubleClick: false,
  },
  schema: [
    { key: 'selector', label: 'CSS Selector', type: 'text', placeholder: '#login-button' },
    { key: 'doubleClick', label: 'Double Click', type: 'boolean', placeholder: '' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node first.');
    }

    const { selector, doubleClick } = data;
    if (!selector) throw new Error('Selector is required for Click Element');

    engine.log('INFO', `Clicking element: ${selector}`);

    // Wait for element
    await context.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });

    if (doubleClick) {
      await context.page.dblclick(selector);
    } else {
      await context.page.click(selector);
    }

    engine.log('INFO', `👆 Clicked: ${selector}`);
  },
};
