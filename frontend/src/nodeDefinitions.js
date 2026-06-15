/**
 * Node type definitions for the workflow designer.
 * Maps to the engine plugin system.
 */

export const NODE_DEFINITIONS = [
  {
    type: 'start',
    label: 'Start',
    category: 'Flow Control',
    description: 'Workflow entry point',
    iconKey: 'play',
    color: '#16A34A',
    defaults: {},
    schema: [],
    maxInstances: 1,
    hasInput: false,
    hasOutput: true,
  },
  {
    type: 'openBrowser',
    label: 'Open Browser',
    category: 'Browser',
    description: 'Launch a browser instance',
    iconKey: 'globe',
    color: '#2563EB',
    defaults: { headless: false },
    schema: [
      { key: 'headless', label: 'Headless Mode', type: 'boolean' },
    ],
    hasInput: true,
    hasOutput: true,
  },
  {
    type: 'navigateUrl',
    label: 'Navigate URL',
    category: 'Browser',
    description: 'Go to a web address',
    iconKey: 'link',
    color: '#7C3AED',
    defaults: { url: 'https://example.com' },
    schema: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' },
    ],
    hasInput: true,
    hasOutput: true,
  },
  {
    type: 'inputText',
    label: 'Input Text',
    category: 'Input',
    description: 'Type into an input field',
    iconKey: 'type',
    color: '#D97706',
    defaults: { selector: '', value: '', clearFirst: true },
    schema: [
      { key: 'selector',   label: 'CSS Selector',    type: 'text',    placeholder: '#username', isSelector: true },
      { key: 'value',      label: 'Value',            type: 'text',    placeholder: 'Enter text...' },
      { key: 'clearFirst', label: 'Clear Field First',type: 'boolean' },
    ],
    hasInput: true,
    hasOutput: true,
  },
  {
    type: 'clickElement',
    label: 'Click Element',
    category: 'Mouse',
    description: 'Click a page element',
    iconKey: 'mouse',
    color: '#7C3AED',
    defaults: { selector: '', doubleClick: false },
    schema: [
      { key: 'selector',    label: 'CSS Selector', type: 'text',    placeholder: '#login-button', isSelector: true },
      { key: 'doubleClick', label: 'Double Click', type: 'boolean' },
    ],
    hasInput: true,
    hasOutput: true,
  },
  {
    type: 'end',
    label: 'End',
    category: 'Flow Control',
    description: 'Workflow end point',
    iconKey: 'stop',
    color: '#6B7280',
    defaults: { autoCloseBrowser: true, restoreWindow: true },
    schema: [
      { key: 'autoCloseBrowser', label: 'Auto Close Browser',    type: 'boolean',
        hint: 'When disabled, the browser stays open after the workflow finishes.' },
      { key: 'restoreWindow',    label: 'Restore Cyclone Window', type: 'boolean',
        hint: 'Bring Cyclone back to the foreground after execution.' },
    ],
    maxInstances: 1,
    hasInput: true,
    hasOutput: false,
  },
];

export function getNodesByCategory() {
  const categories = {};
  for (const def of NODE_DEFINITIONS) {
    if (!categories[def.category]) categories[def.category] = [];
    categories[def.category].push(def);
  }
  return categories;
}

export function getNodeDefinition(type) {
  return NODE_DEFINITIONS.find(d => d.type === type) || null;
}
