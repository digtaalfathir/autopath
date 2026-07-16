<h1 align="center">Autopath</h1>

<p align="center"><em>Design the path, the bot walks it.</em></p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.1.0-2563EB">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-0EA5E9">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-16A34A">
  <img alt="stack" src="https://img.shields.io/badge/Electron%2028-React%2018-6B7280">
</p>

**Autopath** is a visual RPA workflow designer for automating repetitive tasks.
Drag and connect nodes into a flow, and the bot executes it — across the web,
the Windows desktop, files, Excel, databases, email, and even Citrix / RDP / VNC
sessions. A desktop app inspired by UiPath Studio, built for people who'd rather
design an automation than write one.

![screenshot](docs/screenshot.png)

> _Screenshot placeholder — replace `docs/screenshot.png` with a real capture of the designer._

---

## Features

- **Visual designer** — drag-and-drop nodes on a ReactFlow canvas; connect them into a flow.
- **Web automation** — Playwright-powered: click, type, navigate, tabs, popups, iframes, upload/download, scraping, resilient selectors + element picker.
- **Desktop automation (Windows)**
  - *Shell & launch* — open apps/files/folders, run cmd/PowerShell, manage processes.
  - *Keyboard & mouse* — global hotkeys, typing, clicks, scroll, drag.
  - *Window management* — find/focus/move/resize/maximize windows.
  - *Element-based (UIA)* — click/read by AutomationId/Name via a bundled FlaUI sidecar.
- **Vision / Surface** — image template matching + OCR for Citrix / RDP / VNC and any pixels-only UI.
- **Data & integration** — Excel, SQLite, file system, HTTP, and email (SMTP send / IMAP read).
- **Orchestration** — controller, robot agents (local + remote), job queue, scheduler (cron + timezone), publish + versioning, run history, execution reports.
- **Reliability** — per-node/workflow timeouts, cycle detection, retry, screenshot-on-error, credential vault.
- **Desktop UX** — system tray, auto-start, start-minimized, notifications.

## Installation

Download the latest **`Autopath Setup <version>.exe`** from the
[Releases](../../releases) page and run it.

> Requires **Google Chrome or Edge** installed for web automation (browsers are
> not bundled). Vision OCR downloads its language data on first run.

## Usage

1. Launch **Autopath**.
2. Drag nodes from the left palette onto the canvas and connect them into a flow.
3. Fill each node's properties (use the **Pick** button to capture web selectors).
4. Press **Run** to execute, or **Publish** + **Scheduler** to run it unattended.

Example demo flows ship in-app (seeded on first launch) — web login, form fill,
Excel/DB pipelines, desktop app control, and Citrix-style OCR.

### Build from source

```bash
npm install
npm run install:frontend
npm run dev          # designer + engine (dev)
npm run build        # Windows installer (electron-builder)
```

Releases are built automatically on GitHub Actions (Windows runner) when a
`v*` tag is pushed — see [RELEASING.md](RELEASING.md).

## Tech Stack

- **Electron 28** + **React 18** + **ReactFlow 11** (designer)
- **Playwright** (web automation)
- **nut.js** + **tesseract.js** (desktop input & vision/OCR)
- **FlaUI / .NET 8** sidecar (Windows UIA)
- **ExcelJS**, **sql.js**, **nodemailer**, **imapflow**

## License

[MIT](LICENSE) © Rifky Andigta Al-Fathir

---

<sub>Inspired by: UiPath · Cyclone</sub>
