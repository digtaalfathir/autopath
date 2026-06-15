/**
 * Node type definitions for the workflow designer.
 * This maps directly to the engine plugin system.
 *
 * To add a new node type:
 *  1. Add its definition here
 *  2. Create its handler in engine/nodes/
 *  3. Register it in engine/workflowEngine.js
 */

export const NODE_DEFINITIONS = [
  {
    type: 'start',
    label: 'Start',
    category: 'Flow Control',
    description: 'Workflow entry point',
    icon: '▶',
    color: '#10b981',
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
    description: 'Launch Chromium browser',
    icon: '🌐',
    color: '#3b82f6',
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
    description: 'Go to a web page',
    icon: '🔗',
    color: '#8b5cf6',
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
    category: 'Interaction',
    description: 'Type into input field',
    icon: '⌨',
    color: '#f59e0b',
    defaults: { selector: '', value: '', clearFirst: true },
    schema: [
      { key: 'selector', label: 'CSS Selector', type: 'text', placeholder: '#username', isSelector: true },
      { key: 'value', label: 'Value', type: 'text', placeholder: 'Enter text...' },
      { key: 'clearFirst', label: 'Clear First', type: 'boolean' },
    ],
    hasInput: true,
    hasOutput: true,
  },
  {
    type: 'clickElement',
    label: 'Click Element',
    category: 'Interaction',
    description: 'Click a page element',
    icon: '👆',
    color: '#ef4444',
    defaults: { selector: '', doubleClick: false },
    schema: [
      { key: 'selector', label: 'CSS Selector', type: 'text', placeholder: '#login-button', isSelector: true },
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
    icon: '⏹',
    color: '#6b7280',
    defaults: {},
    schema: [],
    maxInstances: 1,
    hasInput: true,
    hasOutput: false,
  },
];

/**
 * Group node definitions by category for sidebar display
 */
export function getNodesByCategory() {
  const categories = {};
  for (const def of NODE_DEFINITIONS) {
    if (!categories[def.category]) {
      categories[def.category] = [];
    }
    categories[def.category].push(def);
  }
  return categories;
}

/**
 * Get a node definition by type
 */
export function getNodeDefinition(type) {
  return NODE_DEFINITIONS.find(d => d.type === type) || null;
}
