# Manufactura Connect

Professional Visual RPA Workflow Designer & Automation Engine

Manufactura Connect is a desktop automation platform for building drag-and-drop browser automation workflows and scheduling them to run unattended. It is built on Electron 28, React 18, and ReactFlow 11, and executes workflows using Playwright.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Node Types](#node-types)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Features](#features)
  - [Visual Workflow Designer](#visual-workflow-designer)
  - [Undo / Redo](#undo--redo)
  - [Workflow Validation](#workflow-validation)
  - [Parameterized Run](#parameterized-run)
  - [Breakpoint & Step Debug](#breakpoint--step-debug)
  - [Node Copy / Paste & Multi-select](#node-copy--paste--multi-select)
  - [Task Scheduler](#task-scheduler)
  - [Notification System](#notification-system)
  - [Run History & Export](#run-history--export)
  - [Multiple Robot Support](#multiple-robot-support)
  - [Audit Log](#audit-log)
- [System Tray & Background Mode](#system-tray--background-mode)
- [Remote Robot Agent](#remote-robot-agent)
- [Settings](#settings)
- [Data Directories](#data-directories)
- [License](#license)

---

## Architecture

```text
┌──────────────────────────────────────────────────┐
│              Manufactura Connect                 │
│   (Electron 28 — BrowserWindow + React 18 SPA)   │
│                                                  │
│  Node Palette │ ReactFlow Canvas │ Property Panel│
│  ─────────────┼──────────────────┼───────────────│
│  ExecutionConsole  │  Toolbar  │  Status Bar     │
└────────────────────────┬─────────────────────────┘
                         │ Electron IPC (contextBridge)
                         ▼
             ┌───────────────────────┐
             │   ControllerService   │  (singleton, EventEmitter)
             │   ├── WorkflowEngine  │  ← local execution
             │   ├── JobQueue        │  ← FIFO job queue
             │   ├── SchedulerEngine │  ← cron / time-based
             │   ├── WorkflowRegistry│  ← versioned publish
             │   ├── ExecutionRepo   │  ← run history (JSON)
             │   ├── AuditRepository │  ← append-only JSONL
             │   ├── SettingsRepo    │  ← settings.json
             │   └── RobotApiServer  │  ← HTTP API (optional)
             └───────────┬───────────┘
                         │
               ┌─────────┴──────────┐
               │                    │
               ▼                    ▼
      Local RobotAgent      RemoteRobotAgent
      (in-process)          (standalone CLI on
      Playwright            remote machine,
      browser               polls HTTP API)
```

The Designer (renderer process) communicates with the Controller (main process) exclusively via `window.electronAPI` (contextBridge). The Controller owns all state — workflows, jobs, schedules, history, robots, settings, and audit records.

---

## Project Structure

```text
cyclonelokalpride/
├── apps/
│   ├── controller/
│   │   ├── ControllerService.js   # Singleton orchestrator
│   │   └── RobotApiServer.js      # HTTP server for remote robots
│   ├── designer/
│   │   ├── electron/
│   │   │   ├── main.js            # Electron main process
│   │   │   └── preload.js         # contextBridge API surface
│   │   └── frontend/
│   │       ├── src/
│   │       │   ├── App.jsx        # Root component, all toolbar logic
│   │       │   ├── index.css      # All styles
│   │       │   └── components/
│   │       │       ├── WorkflowNode.jsx
│   │       │       ├── NodePalette.jsx
│   │       │       ├── PropertyPanel.jsx
│   │       │       ├── ExecutionConsole.jsx
│   │       │       ├── HistoryModal.jsx
│   │       │       ├── SchedulerModal.jsx
│   │       │       ├── AuditModal.jsx
│   │       │       ├── RobotManagerModal.jsx
│   │       │       ├── SettingsModal.jsx
│   │       │       ├── AboutModal.jsx
│   │       │       ├── ValidationModal.jsx
│   │       │       ├── RunParamsModal.jsx
│   │       │       ├── DashboardModal.jsx
│   │       │       ├── DebugToolbar.jsx
│   │       │       ├── Tooltip.jsx
│   │       │       ├── Skeleton.jsx
│   │       │       └── Icons.jsx
│   │       └── index.html
│   └── robot/
│       └── RemoteRobotAgent.js    # Standalone remote worker CLI
├── shared/
│   ├── engine/
│   │   └── WorkflowEngine.js
│   ├── nodes/                     # 40+ node plugin files
│   ├── scheduler/
│   │   ├── SchedulerEngine.js
│   │   └── cronParser.js          # 5-field cron + IANA timezone
│   ├── audit/
│   │   └── AuditRepository.js     # Append-only JSONL audit log
│   ├── settings/
│   │   └── SettingsRepository.js
│   └── utils/
├── flows/                         # Saved workflow JSON files
├── history/                       # Run history (runs.json)
├── jobs/                          # Job queue state (jobs.json)
├── robots/                        # Robot registry (robots.json)
├── audit/                         # Audit log files
├── settings/                      # settings.json
├── assets/
│   └── icon.png
└── package.json
```

---

## Installation

```bash
# Install root dependencies (Electron, ExcelJS, Playwright, etc.)
npm install

# Install frontend dependencies (React, ReactFlow, Vite)
npm run install:frontend
```

---

## Development

```bash
npm run dev
```

This starts Vite on port 5173 and Electron simultaneously. Electron waits 3 seconds for Vite to be ready before opening the window.

---

## Building

```bash
# Windows installer (.exe via NSIS)
npm run build

# Linux AppImage / deb
npm run build:linux
```

Build output is placed in `dist/`.

---

## Node Types

The workflow engine supports 40+ node types organized by category.

### Browser Automation

| Node | Description |
|---|---|
| `openBrowser` | Launch Chrome / Edge / Chromium (visible or headless) |
| `navigateUrl` | Navigate to a URL |
| `clickElement` | Click a page element by CSS or XPath selector |
| `inputText` | Type text into an input field |
| `getText` | Read text content from an element |
| `waitElement` | Wait for an element to appear |
| `waitPageLoad` | Wait for page navigation to complete |
| `waitUrl` | Wait until URL matches a pattern |
| `elementExists` | Check if an element is present (returns boolean) |
| `getCurrentUrl` | Read the current URL into a variable |
| `end` | Mark workflow end, optionally close the browser |

### Control Flow

| Node | Description |
|---|---|
| `start` | Workflow entry point |
| `ifNode` | Branch on a boolean condition |
| `forEachNode` | Iterate over an array |
| `tryCatchNode` | Catch errors and route to a fallback path |
| `delay` | Pause execution for N milliseconds |
| `logMessage` | Write a message to the execution console |
| `setVariable` | Set a workflow context variable |

### Data & Files

| Node | Description |
|---|---|
| `readFile` | Read a file to a variable |
| `writeFile` | Write a variable to a file |
| `moveFile` | Move or rename a file |
| `deleteFile` | Delete a file |
| `fileExists` | Check if a file exists |
| `createDirectory` | Create a directory |
| `directoryExists` | Check if a directory exists |

### Excel

| Node | Description |
|---|---|
| `excelOpen` | Open an Excel workbook |
| `excelReadCell` | Read a single cell value |
| `excelReadRange` | Read a range into an array |
| `excelWriteCell` | Write a value to a cell |
| `excelSave` | Save the workbook |
| `excelClose` | Close the workbook |

### Database

| Node | Description |
|---|---|
| `dbConnect` | Connect to a database |
| `dbQuery` | Execute a SELECT query |
| `dbExecute` | Execute INSERT / UPDATE / DELETE |
| `dbDisconnect` | Close the database connection |

### HTTP & Data

| Node | Description |
|---|---|
| `httpRequest` | Make an HTTP request (GET / POST / PUT / DELETE) |
| `jsonParse` | Parse a JSON string to an object |
| `stringReplace` | Replace text in a string |
| `stringContains` | Check if a string contains a substring |
| `arrayLength` | Get the length of an array |
| `dateTimeFormat` | Format a date/time value |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save workflow |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+O` | Open workflow |
| `Ctrl+N` | New workflow |
| `F5` | Run workflow |
| `Ctrl+.` | Stop workflow |
| `F8` | Toggle breakpoint on selected node |
| `F10` | Step (when paused at breakpoint) |
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+V` | Paste nodes |
| `Ctrl+D` | Duplicate selected nodes |
| `Delete` | Delete selected nodes |
| `Ctrl+A` | Select all nodes |

---

## Features

### Visual Workflow Designer

- Drag-and-drop canvas powered by ReactFlow 11
- Node palette on the left with all available node types
- Property inspector on the right for editing node parameters
- Execution console at the bottom with real-time log streaming
- Snap-to-grid node positioning
- Zoom and pan with mouse wheel or trackpad
- Active node highlighting during execution (blue = running, green = done, red = error)
- Empty-state hint when the canvas has no nodes
- Unsaved changes indicator (orange dot in the title bar)
- Recent files dropdown next to the Open button (last 5 files)
- Resizable left panel (180 – 420 px, drag the resize handle on the panel edge)
- Responsive layout — panels collapse at 1100 px and 900 px viewport widths
- Tooltips with keyboard shortcut hints on all toolbar buttons

### Undo / Redo

Canvas history is maintained as a snapshot stack (max 50 steps). Every node add, move, delete, and connection change is captured.

- `Ctrl+Z` — undo the last change
- `Ctrl+Y` — redo

### Workflow Validation

Before a workflow runs a validation pass checks:

- At least one Start node exists
- At least one End node exists
- All nodes are connected (no isolated nodes)
- Required properties on each node are filled in

Validation errors appear in the Validation modal with per-node detail. Execution is blocked until all errors are resolved.

### Parameterized Run

Workflows can declare input parameters. When you click **Run**, the Run Parameters modal appears so you can supply values before execution starts. Parameter values are injected into the workflow context and can be referenced as `{{paramName}}` inside node properties.

### Breakpoint & Step Debug

1. Press `F8` (or use the node context menu) to toggle a red breakpoint indicator on any node.
2. Start the workflow with `F5`. Execution pauses when it reaches a breakpoint node.
3. The **Debug Toolbar** appears at the top of the canvas.
   - **Resume** (`F10`) — continue running until the next breakpoint.
   - **Step** — execute one node and pause again.
4. While paused you can inspect the execution console to see variable state and log output.

### Node Copy / Paste & Multi-select

- Click and drag on the canvas background to draw a selection rectangle.
- `Ctrl+C` copies the selected nodes (including all properties).
- `Ctrl+V` pastes an offset duplicate set onto the canvas.
- `Ctrl+D` copies and pastes in one step.
- Connections between copied nodes are preserved in the paste.

### Task Scheduler

Open via the **More** menu (`···`) in the toolbar → **Scheduler**.

Supports five schedule types:

| Type | Description |
|---|---|
| ONCE | Run at a specific date and time |
| HOURLY | Repeat every N hours |
| DAILY | Run at a fixed time each day |
| WEEKLY | Run on a specific weekday at a fixed time |
| CRON | Full 5-field cron expression (`minute hour dom month dow`) |

DAILY, WEEKLY, and CRON schedules accept an optional **IANA timezone** (e.g. `Asia/Jakarta`). The engine converts the configured time to UTC using `Intl.DateTimeFormat`.

Cron expression format: `minute hour day-of-month month day-of-week`

Examples:
- `0 9 * * 1-5` — weekdays at 09:00
- `30 8 1 * *` — first of every month at 08:30
- `*/15 * * * *` — every 15 minutes

The scheduler runs in the background — when the window is closed the app hides to the system tray and scheduled workflows continue firing.

Schedules are persisted to disk and survive application restarts.

### Notification System

Configured in **More → Settings → Notifications**.

**Desktop notifications** — uses the Electron `Notification` class. Can be enabled independently for success and failure outcomes.

**Email notifications** — uses `nodemailer`. Configure your SMTP server, port, credentials, sender, and recipient. Notifications are sent on success, failure, or both depending on your settings.

### Run History & Export

Open via the **History** button in the toolbar.

**Versions tab** — lists every published version of the current workflow with publish date and description.

**Run History tab** — lists every execution with run ID, workflow version, trigger source (MANUAL or SCHEDULED), start time, duration, and status (SUCCESS / FAILED / RUNNING).

**Report tab** — detailed view of a selected run: timestamps, duration, nodes executed, nodes failed, and error message if any.

**Export options** (from the Run History tab):

- **Export Excel (.xlsx)** — generates a workbook with ExcelJS. One row per run, styled header.
- **Export PDF (.pdf)** — renders an HTML table and uses Electron's `printToPDF`. A save dialog asks for the output path.

### Multiple Robot Support

Manufactura Connect supports a distributed execution model where multiple robot workers pull jobs from a shared queue.

**Local Robot** — the built-in `RobotAgent` runs inside the main process and handles jobs automatically.

**Remote Robots** — any additional machine running `RemoteRobotAgent.js` connects to the Controller over HTTP, pulls jobs, executes them locally with Playwright, and reports results back. See [Remote Robot Agent](#remote-robot-agent).

Open **More → Robot Manager** to:

- Enable or disable the Robot API HTTP server
- Copy the API URL and bearer token
- View all connected robots with live status: ONLINE (green), BUSY (amber), OFFLINE (gray)
- Copy the command to register a new remote machine

### Audit Log

Every significant system action is appended to an audit log (JSONL format, one record per line).

Audited events include:

- Workflow published (with version number)
- Schedule created, updated, deleted, or toggled
- Job queued (with workflow ID and version)
- Job completed (with status SUCCESS or FAILED)

Open **More → Audit Log** to view a filterable table of audit entries. Use the filter input to search by action or actor. Click **Refresh** to load the latest records.

---

## System Tray & Background Mode

When you close the Manufactura Connect window (the × button in the title bar, or `Alt+F4` on Windows) the application **hides to the system tray** instead of quitting. The scheduler and robot API server keep running.

The system tray icon provides:

- **Show** — restore the window
- **Quit** — fully exit the application

A desktop notification is shown the first time the app moves to the tray.

To fully quit, use the tray **Quit** option or **More → Quit Application** from within the window.

---

## Remote Robot Agent

Run `RemoteRobotAgent.js` on any machine to add it as a remote execution worker.

```bash
node apps/robot/RemoteRobotAgent.js \
  --controller http://<controller-ip>:<port> \
  --token <bearer-token> \
  [--robot-id my-machine-1] \
  [--name "My Machine"] \
  [--poll 3000]
```

Or configure via environment variables:

```bash
export CONTROLLER_URL=http://192.168.1.100:4242
export CONTROLLER_TOKEN=your-secret-token
export ROBOT_ID=machine-01
export ROBOT_NAME="My Machine"
export POLL_INTERVAL_MS=3000
node apps/robot/RemoteRobotAgent.js
```

**How it works:**

1. The agent sends a heartbeat to `POST /api/robots/heartbeat` every 30 seconds to stay registered.
2. Every `POLL_INTERVAL_MS` (default 3 s) it calls `GET /api/jobs/next?robotId=<id>` to check for work.
3. When a job arrives the agent executes it locally using `WorkflowEngine` with Playwright.
4. On completion it posts the result and full execution log to `POST /api/jobs/complete`.

The Controller then resolves the waiting `requestRun` promise and forwards logs back to the Designer.

**Robot API routes:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/robots/heartbeat` | Bearer | Register / refresh robot presence |
| `GET` | `/api/jobs/next` | Bearer | Pull next queued job for a robot |
| `POST` | `/api/jobs/complete` | Bearer | Report job result and logs |

Enable the Robot API in **More → Settings → Robot API** and set the port. The bearer token is displayed (and copyable) in the Robot Manager modal.

---

## Settings

Open via **More → Settings**.

### Notifications

| Setting | Description |
|---|---|
| Desktop on success | System notification when a workflow succeeds |
| Desktop on failure | System notification when a workflow fails |
| Email notifications | Send email via SMTP on completion |
| SMTP host | SMTP server hostname |
| SMTP port | Port (default 587) |
| Secure | Enable TLS (use port 465) |
| Username | SMTP auth username |
| Password | SMTP auth password |
| From | Sender address |
| To | Recipient address |

### Robot API

| Setting | Description |
|---|---|
| Enable Robot API | Start the HTTP server for remote robot workers |
| Port | Port to listen on (default 4242) |

Settings are saved to disk immediately on each change.

---

## Data Directories

| Environment | Location |
|---|---|
| Development (`NODE_ENV=development`) | Project root — `flows/`, `history/`, `jobs/`, `robots/`, `audit/`, `settings/` |
| Production (packaged build) | `app.getPath('userData')` |

Typical `userData` paths:

- Windows: `%APPDATA%\Manufactura Connect\`
- Linux: `~/.config/Manufactura Connect/`
- macOS: `~/Library/Application Support/Manufactura Connect/`

---
