module.exports = {
  meta: {
    type: 'navigateUrl',
    label: 'Navigate URL',
    category: 'Browser',
    description: 'Navigate to a specific URL',
    icon: '🔗',
    color: '#8b5cf6',
  },
  defaults: {
    url: 'https://example.com',
  },
  schema: [
    { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' },
  ],
  execute: async (data, context, engine) => {
    if (!context.page) {
      throw new Error('Browser not open. Add an "Open Browser" node before Navigate URL.');
    }

    const url = data.url || 'https://example.com';
    engine.log('INFO', `Navigating to: ${url}`);

    await context.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    engine.log('INFO', `📄 Navigate success → ${url}`);
  },
};
