# 🌀 Cyclone LokalPride — Visual RPA Workflow Designer

Desktop automation tool for building visual drag-and-drop workflows and executing browser automation using Playwright.

Built with **Electron** + **React** + **React Flow** + **Playwright**.

---

## 📁 Project Structure

```
cyclonelokalpride/
├── electron/              # Electron main process
│   ├── main.js           # Main process entry (IPC handlers, window mgmt)
│   └── preload.js        # Context bridge for renderer process
│
├── frontend/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── WorkflowNode.jsx      # Custom React Flow node component
│   │   │   ├── NodePalette.jsx       # Left sidebar — draggable node list
│   │   │   ├── PropertyPanel.jsx     # Right panel — node property editor
│   │   │   └── ExecutionConsole.jsx   # Right panel — execution log viewer
│   │   ├── nodeDefinitions.js        # Node type registry (schemas, defaults)
│   │   ├── App.jsx                   # Main application component
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Complete design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── engine/                # Playwright execution engine
│   ├── workflowEngine.js  # Core engine — reads JSON, runs steps
│   ├── pluginRegistry.js  # Plugin system for extensible node types
│   └── nodes/             # Built-in node handlers
│       ├── start.js       # Start → workflow init
│       ├── openBrowser.js # Open Browser → chromium.launch()
│       ├── navigateUrl.js # Navigate URL → page.goto()
│       ├── inputText.js   # Input Text → page.fill()
│       ├── clickElement.js # Click → page.click()
│       └── end.js         # End → workflow cleanup
│
├── flows/                 # Saved workflow JSON files
│   └── Sample Login Flow.json
│
├── package.json           # Root config (Electron + builder)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18 (recommended: LTS 20)
- **npm** >= 8

### Install

```bash
# Install root dependencies (Electron + Playwright)
npm install

# Install frontend dependencies (React + React Flow)
cd frontend && npm install && cd ..

# Install Playwright browsers
npx playwright install chromium
```

### Development

```bash
# Run both frontend dev server and Electron in parallel
npm run dev
```

Or run separately:

```bash
# Terminal 1: Start React dev server
npm run dev:frontend

# Terminal 2: Start Electron (after frontend is ready)
npm run dev:electron
```

### Build for Windows (.exe)

```bash
# Build frontend then package with Electron Builder
npm run build
```

Output will be in `dist/` directory as an NSIS installer `.exe`.

---

## 🎯 Features

### 1. Visual Workflow Designer
- Drag-and-drop nodes from the palette to the canvas
- Connect nodes with edges to define execution flow
- Snap-to-grid alignment
- Minimap overview
- Zoom and pan controls

### 2. Available Nodes
| Node | Action | Playwright API |
|------|--------|---------------|
| **Start** | Workflow entry point | — |
| **Open Browser** | Launch Chromium | `chromium.launch()` |
| **Navigate URL** | Go to a URL | `page.goto()` |
| **Input Text** | Type into field | `page.fill()` |
| **Click Element** | Click an element | `page.click()` |
| **End** | Workflow end point | — |

### 3. Property Panel
Select any node to edit its properties:
- **Navigate URL**: url
- **Input Text**: selector, value, clearFirst
- **Click Element**: selector, doubleClick
- **Open Browser**: headless mode

### 4. File Operations
- **Save**: Save workflow as JSON
- **Save As**: Save with file dialog
- **Open**: Load workflow from JSON file

### 5. Execution Engine
- Reads flow JSON and resolves node execution order
- Runs each node step-by-step using Playwright
- Realtime log output to console panel
- Visual node status (running → completed → error)
- Stop execution at any time

### 6. Execution Console
```
[INFO] 🚀 Workflow initialized
[INFO] 🌐 Browser opened successfully
[INFO] 📄 Navigate success → https://example.com
[INFO] ⌨ Input filled: #username
[INFO] 👆 Clicked: #login-button
[INFO] 🏁 Workflow completed successfully
```

---

## 🔌 Plugin Architecture (Future-Ready)

Adding a new node type requires 3 steps:

### 1. Create node handler in `engine/nodes/`

```js
// engine/nodes/delay.js
module.exports = {
  meta: {
    type: 'delay',
    label: 'Delay',
    category: 'Utility',
    description: 'Wait for specified time',
    icon: '⏱',
    color: '#06b6d4',
  },
  defaults: { ms: 1000 },
  schema: [
    { key: 'ms', label: 'Milliseconds', type: 'text', placeholder: '1000' },
  ],
  execute: async (data, context, engine) => {
    const ms = parseInt(data.ms) || 1000;
    engine.log('INFO', `Waiting ${ms}ms...`);
    await new Promise(resolve => setTimeout(resolve, ms));
  },
};
```

### 2. Register in `engine/workflowEngine.js`

```js
const delayHandler = require('./nodes/delay');
this.registry.register('delay', delayHandler);
```

### 3. Add to `frontend/src/nodeDefinitions.js`

```js
{
  type: 'delay',
  label: 'Delay',
  category: 'Utility',
  description: 'Wait for specified time',
  icon: '⏱',
  color: '#06b6d4',
  defaults: { ms: 1000 },
  schema: [
    { key: 'ms', label: 'Milliseconds', type: 'text', placeholder: '1000' },
  ],
  hasInput: true,
  hasOutput: true,
}
```

### Planned Future Nodes
- 📊 Read Excel / Write Excel
- 🌍 HTTP Request
- 📧 Send Email
- ⏱ Delay
- 🔀 If Condition
- 🔄 Loop
- 🗄 Database Query

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────┐
│                Designer (React)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │  Node     │  │  Canvas  │  │ Property  │ │
│  │  Palette  │  │  (React  │  │  Panel /  │ │
│  │           │  │   Flow)  │  │  Console  │ │
│  └──────────┘  └──────────┘  └───────────┘ │
└─────────────────────┬───────────────────────┘
                      │ save / execute (IPC)
                      ▼
              ┌──────────────┐
              │  flow.json   │
              └──────┬───────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Execution Engine   │
          │  (Plugin Registry)  │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Playwright Robot   │
          │  (Chromium)         │
          └─────────────────────┘
```

---

## 📄 License

MIT
