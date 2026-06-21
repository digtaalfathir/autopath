# Level 2 — Desktop Automation: Analysis & Architecture

Status: **Architecture phase only** (no implementation yet).
Branch: `feature/desktop-automation`. `main` stays the stable Web Automation baseline.

Goal: automate Windows desktop apps (Win32, WinForms, WPF, UIA) + SAP GUI / MES /
ERP clients — **reusing** the existing engine and orchestration, **without
touching or breaking** Web Automation.

---

## 0. Audit summary (what we have today)

| Layer | File(s) | Reusable for desktop? |
|---|---|---|
| Workflow Engine | `shared/engine/workflowEngine.js` | ✅ 100% — graph traversal, timeout/cycle/max-step guards, secrets, breakpoints |
| Node System | `PluginRegistry` + grouped loader (`webGroups`/comm) | ✅ — add a `desktop` group, 1 line |
| **Provider pattern (precedent!)** | `shared/database/DatabaseFactory.js` + `providers/BaseProvider.js` | ✅ — copy this exact shape for `AutomationProvider` |
| Execution context | `context = { browser, page, frame, variables, workbooks, databases }` | ✅ — add `context.desktop` the same way |
| Controller / Queue / JobManager | `apps/controller/*` | ✅ unchanged |
| Robot Agent (local + remote) | `apps/robot/*` | ✅ unchanged — remote robot model is *exactly* how you deploy on a SAP/MES machine |
| Scheduler / Publish / Versioning / History / Report | various | ✅ unchanged |
| Screenshot-on-error, Credential Vault, secrets injection | engine + main | ✅ reuse for desktop too |
| PropertyPanel / nodeDefinitions / palette | `apps/designer/frontend/*` | ✅ reuse; add category + a `target` field type |
| Element Picker (web) | `apps/designer/elementPicker.js` (Playwright overlay) | ⚠️ UX reusable, mechanism **not** — native apps need a new inspector |
| Resilient selector | `shared/utils/browser.js` (`findLocator` + fallbacks) | ✅ reuse the *concept* for desktop selectors |

**Key insight:** the database layer already proves the pattern we need:
`BaseProvider` (abstract) → `SQLiteProvider` (concrete) → `createProvider(type)`
(factory) → stored in `context.databases[name]`. Desktop automation is the same
story with a different provider.

---

## 1. How to add Desktop Automation without breaking Web Automation

Three rules:

1. **Additive only.** Do not modify the engine core, Controller, Robot, Queue,
   Scheduler, Publish, History. Desktop arrives as (a) a new provider, (b) a new
   node group, (c) a new native sidecar — all opt-in.
2. **New context slot.** Add `context.desktop` (a sidecar client handle), exactly
   like `context.browser` / `context.databases`. Web nodes never read it.
3. **Lazy + guarded.** The native sidecar is spawned only when the first desktop
   node runs. On non-Windows, desktop nodes throw a clear error
   (`Desktop automation requires Windows`). Web workflows are byte-for-byte
   unaffected.

Registration uses the existing grouped loader:

```js
// shared/engine/workflowEngine.js — same pattern as web/comm groups
require('../nodes/desktop'),   // <-- one line, additive
```

Old workflows keep running because no existing node, type, or context field
changes.

---

## 2. What to reuse (no rewrite)

- **Workflow Engine** — `executeNode`, edge traversal, `_withTimeout`,
  `_detectCycle`, max-steps, secrets bucket, debug breakpoints. Desktop nodes are
  just handlers with `execute(data, context, engine, nodeId)`.
- **Node system** — `PluginRegistry`, grouped module loader, `meta/defaults/schema/execute`.
- **Queue / Controller / Robot / Scheduler / Publish / Versioning / History /
  Report** — transport & orchestration are automation-agnostic.
- **Credential Vault + `{{secret.*}}`** — SAP/ERP logins need this.
- **Screenshot-on-error** — extend to capture the *window* via the sidecar.
- **Designer** — PropertyPanel, palette categories, `isSelector` pick button,
  `select` field type, resilient-selector storage (`selectorFallbacks`).

## 3. What is new

| New component | Where | Responsibility |
|---|---|---|
| **AutomationProvider** (interface) | `shared/automation/providers/BaseAutomationProvider.js` | unified verbs: launch/attach, find, click, type, getText, getValue, setValue, exists, waitFor, select, keys, screenshot, close |
| **BrowserProvider** | `shared/automation/providers/BrowserProvider.js` | thin wrapper over current Playwright logic (so web can later flow through the same interface) |
| **DesktopProvider** (Node client) | `shared/automation/providers/DesktopProvider.js` | talks to the native sidecar via JSON-RPC |
| **UIA Sidecar** (the big new piece) | `sidecar/` (.NET) | actual native automation engine (FlaUI/UIA3 + COM) |
| **Desktop Selector Engine** | `shared/automation/desktopSelector.js` | selector grammar + resilient resolution |
| **Desktop Element Inspector** | sidecar + a small Designer mode | capture AutomationId/Name/ControlType/path, highlight target |
| **Desktop node group** | `shared/nodes/desktop/*` | Launch/Attach App, Click, Type, GetText, Select, Wait, Exists, Screenshot, SAP-specific |
| **SAP provider** | sidecar COM interop (or `winax`) | SAP GUI Scripting session/fields |

---

## 4. Technology choice for Electron + Node.js on Windows

There is **no robust pure-Node UIA binding**. The proven approach (used by
commercial RPA) is a **native sidecar** driven from Node.

**Recommended stack:**

| Need | Technology | Why |
|---|---|---|
| UIA + Win32 + WinForms + WPF | **.NET 8 sidecar using FlaUI (FlaUI.UIA3)** | FlaUI is the best free UIA library; one library covers all four UI tech stacks; ships as a self-contained `.exe` (no .NET install needed on target) |
| Node ↔ sidecar transport | **JSON-RPC over stdio** (or localhost WebSocket) | mirrors the existing `RobotApiServer` style; simple, fast, local-only |
| SAP GUI | **SAP GUI Scripting API via COM** | SAP scripting is COM-based; reach it from the sidecar's COM interop, or directly in Node via `winax` |
| Image / coordinate fallback | **nut.js** (optional) | for apps with no accessible tree (Citrix, custom-drawn) and a stepping stone to Level 3 OCR |

**Rejected alternatives:** `node-ffi-napi` calling UIAutomationCore COM (fragile,
unmaintainable), PowerShell UIAutomation (slow/brittle), pure `robotjs`
(coordinate-only, no element model).

**Trade-off:** the sidecar adds a .NET build step and a bundled binary
(~10–40 MB self-contained, per-arch). That is the accepted cost for reliable UIA —
and it's isolated from the Node/Electron build (packaged via electron-builder
`extraResources`).

**Topology:**

```text
Designer (renderer)
   │ IPC
Controller / Robot Agent (Node, main process — local OR remote machine)
   │  context.browser → Playwright            (existing, unchanged)
   │  context.desktop → DesktopProvider ──JSON-RPC──► UIA Sidecar (.NET FlaUI + COM)
   │                                                      │
   └────────────────────────────────────────────────────► Target apps:
                                                           Win32 / WinForms / WPF / UIA / SAP GUI
```

Because desktop automation must run on the same Windows box as the target app,
the **existing remote-robot model is the deployment story**: install
RobotAgent + sidecar on the SAP/MES workstation; the Controller dispatches jobs
to it exactly as today.

---

## 5. Should we introduce an `AutomationProvider` abstraction? — Yes

Model it on the existing DB factory:

```js
// shared/automation/providers/BaseAutomationProvider.js
class BaseAutomationProvider {
  async launch(opts)            { notImpl(); }   // start an app / browser
  async attach(opts)            { notImpl(); }   // attach to a running window/page
  async find(selector, o)       { notImpl(); }   // -> handle (resilient, with fallbacks)
  async click(selector, o)      { notImpl(); }
  async type(selector, text, o) { notImpl(); }
  async getText(selector, o)    { notImpl(); }
  async getValue(selector, o)   { notImpl(); }
  async setValue(selector, v,o) { notImpl(); }
  async exists(selector, o)     { notImpl(); }
  async waitFor(selector, o)    { notImpl(); }   // visible/hidden/enabled/disabled
  async select(selector, v, o)  { notImpl(); }
  async keys(combo, o)          { notImpl(); }
  async screenshot(o)           { notImpl(); }
  async close()                 { notImpl(); }
}
```

```js
// shared/automation/AutomationFactory.js  (mirrors DatabaseFactory)
function createProvider(target) {
  switch (target) {
    case 'web':     return new BrowserProvider();   // wraps current Playwright code
    case 'desktop': return new DesktopProvider();   // sidecar client
    default: throw new Error(`Unsupported automation target: ${target}`);
  }
}
```

This keeps each platform's quirks behind one interface and makes the node layer thin.

**Migration safety:** introduce the abstraction **without rewriting existing
browser nodes** first. `BrowserProvider` wraps the same `context.page` logic;
desktop ships as its own provider + node group. Unifying the old web nodes onto
`BrowserProvider` is an *optional later refactor*, not a prerequisite — so Web
Automation stability is never at risk.

---

## 6. Ideal cross-platform node design

Goal: one **Click Element** that works on browser *and* desktop without two
workflows. Two complementary mechanisms:

**(a) Selector scheme decides the provider.** The selector's prefix tells the
node which provider to use:

```text
Web:     css=#login        xpath=//button[@id='ok']
Desktop: uia=AutomationId:loginBtn   name=Login   role=Button   path=Window/Pane/Button[2]
SAP:     sap=wnd[0]/usr/txtRSYST-BNAME
```

**(b) Optional `target` field** (`Auto | Web | Desktop`) on shared verbs. `Auto`
infers from the selector scheme / active session; explicit value forces a provider.

A unified node becomes thin — parse selector → pick provider → call the verb:

```js
// conceptual shared handler
execute: async (data, context, engine) => {
  const provider = resolveProvider(data, context);     // by target / selector scheme / active session
  const { selector } = data;
  await provider.click(selector, { timeout: data.timeout, fallbacks: data.selectorFallbacks });
}
```

The **verbs are shared** (click/type/getText/exists/wait/select/screenshot);
only the provider implementation differs. The resilient-selector idea from
`findLocator` carries over: desktop selectors also get an ordered fallback list
(AutomationId → Name → ControlType+index → tree path).

**Pragmatic v1:** ship a dedicated **Desktop** node category first (clear UX,
zero risk to web), then optionally merge the verbs into shared nodes once the
provider layer is proven.

---

## 7. Realistic 1-week roadmap (MVP → Usable → Production)

**MVP (Day 1–2)**
- Day 1: .NET sidecar skeleton (FlaUI UIA3) + JSON-RPC over stdio; Node
  `DesktopProvider` client; spawn/lifecycle/health; `context.desktop`.
  Verbs: launch/attach, click by AutomationId, type, getText. Proof: drive
  Notepad / Calculator.
- Day 2: Desktop selector engine (AutomationId/Name/ControlType/index + fallback)
  + `waitFor` (visible/enabled) + `exists`. Node group `shared/nodes/desktop/*` +
  nodeDefinitions + palette category **Desktop**. Register via grouped loader.

**Usable (Day 3–5)**
- Day 3: Desktop Element Inspector — point-and-capture selector via sidecar +
  bounding-box highlight; wire into PropertyPanel pick button (desktop mode);
  store `selectorFallbacks`.
- Day 4: More verbs — setValue/clear, select (combo/menu/list), check/toggle,
  keyboard (SendKeys), element/window screenshot, getValue, grid/table read.
  WinForms + WPF coverage.
- Day 5: **SAP GUI provider** (COM scripting) — connect session, read/set fields
  by SAP id, press buttons, read status bar.

**Production Ready (Day 6–7)**
- Day 6: Robustness — per-verb timeout + retry, desktop screenshot-on-error,
  non-Windows guards, package sidecar via electron-builder `extraResources` +
  ship with RemoteRobotAgent; code-sign the sidecar.
- Day 7: QA Lab desktop targets (a small sample WinForms/WPF app), 5–6 demo
  desktop workflows, extend `TESTING_GUIDE.md`, write developer docs.

Milestones: **MVP** = element click/type/getText on a real app; **Usable** =
inspector + full verb set + SAP; **Production** = packaged, signed, retried,
QA-covered.

---

## 8. Risks & decisions to confirm before coding

1. **.NET sidecar accepted?** (adds a native build + ~tens of MB). It is the only
   robust UIA path — confirm before Day 1.
2. **Distribution** — sidecar bundled with the app and with RemoteRobotAgent.
3. **SAP** — requires SAP GUI Scripting enabled on the client + server policy.
4. **Security** — desktop automation = full local control; gate behind the same
   audit log; never log secret field values (already handled).
5. **Unify-now vs later** — recommend a dedicated Desktop category for v1; unify
   verbs into shared nodes only after the provider layer is proven.

> No web-automation code is modified by this plan. Implementation proceeds on
> `feature/desktop-automation` and merges to `main` only when green.
