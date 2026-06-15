# 🌀 Cyclone Automation Studio

Professional Visual RPA Workflow Designer for Browser Automation

Cyclone Automation Studio is a desktop automation platform that allows users to build drag-and-drop workflows visually and execute browser automation using Playwright.

Built with:

* Electron
* React
* React Flow
* Playwright

Designed to provide an experience similar to commercial RPA platforms such as UiPath Studio and Microsoft Power Automate Desktop.

---

# 📁 Project Structure

```text
cyclonelokalpride/
├── electron/
│   ├── main.js
│   └── preload.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WorkflowNode.jsx
│   │   │   ├── NodePalette.jsx
│   │   │   ├── PropertyPanel.jsx
│   │   │   ├── ExecutionConsole.jsx
│   │   │   └── ElementPickerButton.jsx
│   │   │
│   │   ├── nodeDefinitions.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── vite.config.js
│   └── package.json
│
├── engine/
│   ├── workflowEngine.js
│   ├── pluginRegistry.js
│   ├── browserManager.js
│   ├── executionTracker.js
│   ├── elementPicker.js
│   │
│   └── nodes/
│       ├── start.js
│       ├── openBrowser.js
│       ├── navigateUrl.js
│       ├── inputText.js
│       ├── clickElement.js
│       └── end.js
│
├── flows/
│
├── package.json
└── README.md
```

---

# 🚀 Features

## Visual Workflow Designer

* Drag and drop workflow editor
* React Flow powered canvas
* Node-based automation design
* Snap-to-grid positioning
* Zoom and pan controls
* Workflow validation
* Real-time execution visualization

---

## Browser Automation

### Open Browser

Launch browser sessions using:

* Google Chrome
* Microsoft Edge
* Chromium

Supports:

* Visible Mode
* Headless Mode

---

### Browser Session Reuse

Cyclone automatically attempts to reuse existing browser sessions.

When Element Picker is activated:

1. Cyclone minimizes itself.
2. Searches for active browser sessions.
3. Attaches to existing browser if available.
4. Does not create duplicate browser windows.
5. Restores Cyclone after selection.

If no active browser session exists:

1. Browser is launched automatically.
2. Target URL is opened.
3. Picker mode starts.

---

## Smart Element Picker

Visual selector capture system inspired by enterprise RPA tools.

Features:

* Hover highlighting
* Selector generation
* Element metadata preview
* Auto minimize / restore workflow designer
* Existing browser session attachment
* ESC cancel support

Returned data:

```json
{
  "selector": "#login-btn",
  "tagName": "button",
  "text": "Login",
  "id": "login-btn"
}
```

---

## Node Types

| Node          | Description          |
| ------------- | -------------------- |
| Start         | Workflow entry point |
| Open Browser  | Open browser session |
| Navigate URL  | Navigate browser     |
| Input Text    | Fill input field     |
| Click Element | Click UI element     |
| End           | Workflow completion  |

Future Nodes:

* Delay
* Condition
* Loop
* Excel
* HTTP Request
* Database
* File Operations
* Email
* OCR
* AI Activities

---

## Property Panel

Every node contains editable properties.

Examples:

### Open Browser

* Browser Type
* Headless
* Reuse Existing Session

### Navigate URL

* URL

### Input Text

* Selector
* Value
* Clear Existing Value

### Click Element

* Selector
* Double Click

### End

* Auto Close Browser
* Restore Cyclone Window

---

## End Node

The End node controls workflow completion behavior.

### Auto Close Browser = ON

```text
Open Browser
↓
Automation
↓
End
↓
Browser Closed
↓
Cyclone Restored
```

### Auto Close Browser = OFF

```text
Open Browser
↓
Automation
↓
End
↓
Browser Remains Open
↓
Cyclone Restored
```

Useful for:

* Debugging
* Manual continuation
* Inspection
* Recorder workflows

---

## Execution Engine

Cyclone executes workflows node-by-node.

Features:

* Plugin-based architecture
* Execution queue
* Runtime context
* Browser session management
* Error handling
* Workflow cancellation

---

## Execution Analytics

Cyclone tracks workflow performance automatically.

Captured metrics:

* Start Time
* End Time
* Duration
* Executed Nodes
* Errors
* Status

Example:

```text
Workflow Started
09:12:15.201

Browser Opened
09:12:16.810

Navigate Success
09:12:18.552

Input Completed
09:12:20.133

Click Completed
09:12:21.887

Workflow Finished
09:12:23.615

Duration
8.41s
```

Execution Summary:

```text
Status:
Success

Started:
09:12:15

Finished:
09:12:23

Duration:
8.41s

Executed Nodes:
12

Errors:
0
```

---

## Save & Load Workflows

Supported operations:

* New Workflow
* Open Workflow
* Save Workflow
* Save As
* Export JSON

Workflow files are stored as JSON and can be version-controlled.

---

## Professional UI

Inspired by:

* UiPath Studio
* Microsoft Power Automate Desktop
* Visual Studio
* JetBrains IDEs

Design Principles:

* Light Theme
* Enterprise Appearance
* Clean Workflow Canvas
* Property Inspector
* Execution Console
* Minimal Branding

No:

* Neon effects
* AI-style gradients
* Robot mascots
* Futuristic UI gimmicks

---

## Build

Install dependencies:

```bash
npm install

cd frontend
npm install
cd ..
```

Run development mode:

```bash
npm run dev
```

Build desktop application:

```bash
npm run build
```

Output:

```text
dist/
└── Cyclone Setup.exe
```

---

## Architecture

```text
┌────────────────────────────────────────────┐
│           Cyclone Designer (React)         │
├──────────────┬──────────────┬──────────────┤
│ Activities   │ Canvas       │ Properties   │
│ Panel        │ React Flow   │ Inspector    │
└──────────────┴──────┬───────┴──────────────┘
                      │
                      ▼
             Electron IPC Bridge
                      │
                      ▼
         ┌─────────────────────────┐
         │ Workflow Engine         │
         │ Plugin Registry         │
         │ Browser Manager         │
         │ Runtime Tracker         │
         └─────────────┬───────────┘
                       │
                       ▼
            Playwright Browser Layer
                       │
                       ▼
           Chrome / Edge / Chromium
```

---

# License

MIT License
