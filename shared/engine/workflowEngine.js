'use strict';

const EventEmitter = require('events');
const { PluginRegistry } = require('./pluginRegistry');

// Stage 1
const startHandler        = require('../nodes/start');
const openBrowserHandler  = require('../nodes/openBrowser');
const navigateUrlHandler  = require('../nodes/navigateUrl');
const inputTextHandler    = require('../nodes/inputText');
const clickElementHandler = require('../nodes/clickElement');
const endHandler          = require('../nodes/end');
// Stage 2
const setVariableHandler  = require('../nodes/setVariable');
const logMessageHandler   = require('../nodes/logMessage');
const delayHandler        = require('../nodes/delay');
const httpRequestHandler  = require('../nodes/httpRequest');
// Stage 3
const ifNodeHandler       = require('../nodes/ifNode');
const forEachNodeHandler  = require('../nodes/forEachNode');
const tryCatchNodeHandler = require('../nodes/tryCatchNode');
// Stage 4A — Browser Automation
const waitUrlHandler       = require('../nodes/waitUrl');
const waitElementHandler   = require('../nodes/waitElement');
const waitPageLoadHandler  = require('../nodes/waitPageLoad');
const getCurrentUrlHandler = require('../nodes/getCurrentUrl');
const getTextHandler       = require('../nodes/getText');
const elementExistsHandler = require('../nodes/elementExists');
// Stage 4B — Data Processing
const jsonParseHandler      = require('../nodes/jsonParse');
const stringReplaceHandler  = require('../nodes/stringReplace');
const stringContainsHandler = require('../nodes/stringContains');
const dateTimeFormatHandler = require('../nodes/dateTimeFormat');
const arrayLengthHandler    = require('../nodes/arrayLength');
// Stage 5 — File System
const readFileHandler        = require('../nodes/readFile');
const writeFileHandler       = require('../nodes/writeFile');
const moveFileHandler        = require('../nodes/moveFile');
const deleteFileHandler      = require('../nodes/deleteFile');
const fileExistsHandler      = require('../nodes/fileExists');
const createDirectoryHandler = require('../nodes/createDirectory');
const directoryExistsHandler = require('../nodes/directoryExists');
// Stage 6 — Excel
const excelOpenHandler      = require('../nodes/excelOpen');
const excelReadCellHandler  = require('../nodes/excelReadCell');
const excelWriteCellHandler = require('../nodes/excelWriteCell');
const excelReadRangeHandler = require('../nodes/excelReadRange');
const excelSaveHandler      = require('../nodes/excelSave');
const excelCloseHandler     = require('../nodes/excelClose');
// Stage 7 — Database
const dbConnectHandler    = require('../nodes/dbConnect');
const dbQueryHandler      = require('../nodes/dbQuery');
const dbExecuteHandler    = require('../nodes/dbExecute');
const dbDisconnectHandler = require('../nodes/dbDisconnect');

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();

    this.context = {
      browser: null,
      page: null,
      variables: {},
      workbooks: {},
      databases: {},
      keepBrowserOpen: false,
      lastError: null,
    };

    this.running = false;
    this.aborted = false;

    // Execution guards (configurable per-run via execute() options)
    this._nodeTimeoutMs     = 0;   // 0 = disabled
    this._workflowTimeoutMs = 0;   // 0 = disabled
    this._maxSteps          = 0;   // 0 = disabled
    this._stepCount         = 0;

    // Screenshot captured at the first failing node (when a page is open)
    this._errorShot = null;

    // Breakpoint / step-debug state (reset per execution)
    this._breakpoints = new Set();
    this._stepMode    = false;
    this._resumeFn    = null;

    this.metrics = {
      startTime:     null,
      endTime:       null,
      nodesExecuted: 0,
      nodesFailed:   0,
      nodesAborted:  0,
      nodeTimes:     {},
    };

    // Graph maps (built per-execution)
    this.nodeMap    = new Map(); // id → node
    this.edgesFrom  = new Map(); // id → [{ id, target, sourceHandle }]

    this.registry = new PluginRegistry();
    // Stage 1
    this.registry.register('start',        startHandler);
    this.registry.register('openBrowser',  openBrowserHandler);
    this.registry.register('navigateUrl',  navigateUrlHandler);
    this.registry.register('inputText',    inputTextHandler);
    this.registry.register('clickElement', clickElementHandler);
    this.registry.register('end',          endHandler);
    // Stage 2
    this.registry.register('setVariable',  setVariableHandler);
    this.registry.register('logMessage',   logMessageHandler);
    this.registry.register('delay',        delayHandler);
    this.registry.register('httpRequest',  httpRequestHandler);
    // Stage 3
    this.registry.register('ifNode',       ifNodeHandler);
    this.registry.register('forEachNode',  forEachNodeHandler);
    this.registry.register('tryCatchNode', tryCatchNodeHandler);
    // Stage 4A — Browser Automation
    this.registry.register('waitUrl',       waitUrlHandler);
    this.registry.register('waitElement',   waitElementHandler);
    this.registry.register('waitPageLoad',  waitPageLoadHandler);
    this.registry.register('getCurrentUrl', getCurrentUrlHandler);
    this.registry.register('getText',       getTextHandler);
    this.registry.register('elementExists', elementExistsHandler);
    // Stage 4B — Data Processing
    this.registry.register('jsonParse',      jsonParseHandler);
    this.registry.register('stringReplace',  stringReplaceHandler);
    this.registry.register('stringContains', stringContainsHandler);
    this.registry.register('dateTimeFormat', dateTimeFormatHandler);
    this.registry.register('arrayLength',    arrayLengthHandler);
    // Stage 5 — File System
    this.registry.register('readFile',        readFileHandler);
    this.registry.register('writeFile',       writeFileHandler);
    this.registry.register('moveFile',        moveFileHandler);
    this.registry.register('deleteFile',      deleteFileHandler);
    this.registry.register('fileExists',      fileExistsHandler);
    this.registry.register('createDirectory', createDirectoryHandler);
    this.registry.register('directoryExists', directoryExistsHandler);
    // Stage 6 — Excel
    this.registry.register('openExcel',   excelOpenHandler);
    this.registry.register('readCell',    excelReadCellHandler);
    this.registry.register('writeCell',   excelWriteCellHandler);
    this.registry.register('readRange',   excelReadRangeHandler);
    this.registry.register('saveExcel',   excelSaveHandler);
    this.registry.register('closeExcel',  excelCloseHandler);
    // Stage 7 — Database
    this.registry.register('dbConnect',    dbConnectHandler);
    this.registry.register('dbQuery',      dbQueryHandler);
    this.registry.register('dbExecute',    dbExecuteHandler);
    this.registry.register('dbDisconnect', dbDisconnectHandler);

    // ── Advanced Web Automation Library (grouped handler modules) ──
    const webGroups = [
      require('../nodes/web/interaction'),
      require('../nodes/web/elements'),
      require('../nodes/web/files'),
      require('../nodes/web/tabs'),
      require('../nodes/web/frames'),
      require('../nodes/web/waits'),
      require('../nodes/web/scraping'),
      require('../nodes/comm/email'),
      require('../nodes/desktop/shell'),   // Desktop Tier 1 — Shell & Launch
      require('../nodes/desktop/input'),   // Desktop Tier 2 — Keyboard & Mouse
      require('../nodes/desktop/window'),  // Desktop Tier 3 — Window Management
      require('../nodes/desktop/uia'),     // Desktop Tier 4 — Element-based (UIA)
    ];
    for (const group of webGroups) {
      for (const handler of group.handlers) {
        this.registry.register(handler.meta.type, handler);
      }
    }
  }

  // ── Breakpoint / step-debug API ─────────────────────────────
  setBreakpoints(nodeIds) {
    this._breakpoints = new Set(nodeIds || []);
  }

  async _pauseAt(nodeId) {
    this.emit('debug:paused', { nodeId, variables: this._publicVars() });
    await new Promise(resolve => { this._resumeFn = resolve; });
    this._resumeFn = null;
  }

  debugResume() {
    this._stepMode = false;
    if (this._resumeFn) { this._resumeFn(); this._resumeFn = null; }
  }

  debugStep() {
    this._stepMode = true;
    if (this._resumeFn) { this._resumeFn(); this._resumeFn = null; }
  }

  // ── Logging ─────────────────────────────────────────────────
  log(level, message) {
    const timestamp = new Date().toISOString().substr(11, 12);
    this.emit('log', { level, message, timestamp });
  }

  // ── Graph helpers ────────────────────────────────────────────

  _buildGraph(flowData) {
    const { nodes, edges } = flowData;
    this.nodeMap   = new Map(nodes.map(n => [n.id, n]));
    this.edgesFrom = new Map();
    for (const edge of edges) {
      if (!this.edgesFrom.has(edge.source)) this.edgesFrom.set(edge.source, []);
      this.edgesFrom.get(edge.source).push(edge);
    }
  }

  /**
   * Detect a directed cycle in the workflow graph (DFS, 3-colour).
   * ForEach/TryCatch loop internally in JS — the graph itself must stay
   * acyclic, so any back-edge here is an unintended infinite loop.
   * @returns {string[]|null} node ids forming the cycle, or null.
   */
  _detectCycle() {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    for (const id of this.nodeMap.keys()) color.set(id, WHITE);

    const stack = [];
    let cycle = null;

    const visit = (u) => {
      color.set(u, GRAY);
      stack.push(u);
      for (const edge of (this.edgesFrom.get(u) || [])) {
        const v = edge.target;
        if (!this.nodeMap.has(v)) continue;
        if (color.get(v) === GRAY) {
          cycle = stack.slice(stack.indexOf(v)).concat(v);
          return true;
        }
        if (color.get(v) === WHITE && visit(v)) return true;
      }
      stack.pop();
      color.set(u, BLACK);
      return false;
    };

    for (const id of this.nodeMap.keys()) {
      if (color.get(id) === WHITE && visit(id)) break;
    }
    return cycle;
  }

  /**
   * Race a promise against a timeout. The underlying work can't be cancelled
   * mid-call, but the workflow fails fast and cleanup() closes the browser.
   */
  _withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`"${label}" timed out after ${ms}ms`)),
        ms
      );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  // Variables exposed to logs / debug UI — the reserved `secret` bucket is
  // never surfaced, so injected credentials can't leak.
  _publicVars() {
    const { secret, ...rest } = this.context.variables;
    return rest;
  }

  /**
   * Follow outgoing edges from nodeId, filtered by sourceHandle.
   * handleId === null  →  follow edges with no/null sourceHandle (regular nodes)
   * handleId === 'xyz' →  follow edges where sourceHandle === 'xyz'
   */
  async followEdges(nodeId, handleId) {
    if (this.aborted) return;
    const outgoing = this.edgesFrom.get(nodeId) || [];
    const matching = handleId
      ? outgoing.filter(e => e.sourceHandle === handleId)
      : outgoing.filter(e => !e.sourceHandle);

    for (const edge of matching) {
      if (this.aborted) break;
      const next = this.nodeMap.get(edge.target);
      if (next) await this.executeNode(next);
    }
  }

  /**
   * Public method for ForEach / TryCatch handlers to execute a named branch.
   * Equivalent to followEdges but exposed on the engine instance.
   */
  async executeFromHandle(nodeId, handleId) {
    await this.followEdges(nodeId, handleId);
  }

  // ── Execute a single node ────────────────────────────────────
  async executeNode(node) {
    if (this.aborted) {
      this.metrics.nodesAborted++;
      return;
    }

    // Runaway-loop safety net (covers pathological nested loops)
    if (this._maxSteps > 0 && ++this._stepCount > this._maxSteps) {
      throw new Error(
        `Execution exceeded ${this._maxSteps} steps — possible runaway loop. ` +
        `Increase "Max steps" in Settings → Execution if this is intentional.`
      );
    }

    // Pause at breakpoint or when in step mode (Feature 9)
    if (this._breakpoints.has(node.id) || this._stepMode) {
      this._stepMode = false;  // consume step; debugStep() will re-arm it
      await this._pauseAt(node.id);
      if (this.aborted) {
        this.metrics.nodesAborted++;
        return;
      }
    }

    const nodeType = node.data?.nodeType;
    const label    = node.data?.label || nodeType;
    const handler  = this.registry.get(nodeType);

    if (!handler) {
      this.log('ERROR', `Unknown node type: "${nodeType}"`);
      this.emit('node-error', { nodeId: node.id, error: `Unknown: ${nodeType}` });
      this.metrics.nodesFailed++;
      throw new Error(`Unknown node type: "${nodeType}"`);
    }

    this.emit('node-start', node.id);
    this.log('INFO', `[${label}] Started`);

    const t0 = Date.now();
    let result;

    try {
      // Snapshot variable keys+serialised values for Variable Viewer diffing
      const varSnap = {};
      for (const [k, v] of Object.entries(this.context.variables)) {
        if (k === 'secret') continue;   // never snapshot/log credentials
        varSnap[k] = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      }

      // Per-node timeout: data.timeoutMs override → engine default → disabled.
      // nodeId passed as 4th arg so ForEach/TryCatch can call executeFromHandle
      const nodeTimeoutMs = Number(node.data?.timeoutMs) || this._nodeTimeoutMs || 0;
      const work = handler.execute(node.data, this.context, this, node.id);
      result = nodeTimeoutMs > 0 ? await this._withTimeout(work, nodeTimeoutMs, label) : await work;

      // Variable Viewer: log each variable that was set or changed by this node
      for (const [k, v] of Object.entries(this.context.variables)) {
        if (k === 'secret') continue;   // never log credentials
        const before = varSnap[k];
        const after  = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
        if (before !== after) {
          const display = String(after).length > 120 ? String(after).slice(0, 120) + '...' : String(after);
          this.log('INFO', `  >> ${k}: ${display}`);
        }
      }

      const dur = Date.now() - t0;
      this.metrics.nodesExecuted++;
      this.metrics.nodeTimes[node.id] = { label, durationMs: dur, status: 'success' };
      this.emit('node-complete', node.id);
      this.log('SUCCESS', `[${label}] Completed (${dur}ms)`);
    } catch (err) {
      const dur = Date.now() - t0;
      this.metrics.nodesFailed++;
      this.metrics.nodeTimes[node.id] = { label, durationMs: dur, status: 'error', error: err.message };

      // Screenshot-on-error — capture page state at the first failing node
      let shotUrl = null;
      if (this.context.page && !this._errorShot) {
        try {
          const buf = await this.context.page.screenshot({ type: 'jpeg', quality: 60 });
          this._errorShot = { nodeId: node.id, label, base64: buf.toString('base64') };
          shotUrl = `data:image/jpeg;base64,${this._errorShot.base64}`;
          this.log('INFO', `[${label}] Screenshot captured on error`);
        } catch (_) { /* page may be closing — ignore */ }
      }

      this.emit('node-error', { nodeId: node.id, error: err.message, screenshot: shotUrl });
      this.log('ERROR', `[${label}] Failed: ${err.message}`);
      throw err;
    }

    // _handled: true means the handler already traversed its own subgraph
    // (TryCatch). Skip followEdges to avoid double-execution.
    if (result && result._handled) return;

    const nextHandle = result?.nextHandle ?? null;
    await this.followEdges(node.id, nextHandle);
  }

  // ── Main execute ─────────────────────────────────────────────
  // options: { secrets?, execution?: { nodeTimeoutMs, workflowTimeoutMs, maxSteps } }
  async execute(flowData, options = {}) {
    this.running = true;
    this.aborted = false;

    // Execution guards (backward-compatible — all default to disabled)
    const exec = options.execution || {};
    this._nodeTimeoutMs     = Number(exec.nodeTimeoutMs)     || 0;
    this._workflowTimeoutMs = Number(exec.workflowTimeoutMs) || 0;
    this._maxSteps          = Number(exec.maxSteps)          || 0;
    this._stepCount         = 0;
    this._errorShot         = null;

    // Reset per-run state
    this.context.keepBrowserOpen = false;
    this.context.variables = { ...(flowData.initialVariables || {}) };  // Feature 8
    // Reserved `secret` bucket — resolvable via {{secret.NAME.password}},
    // redacted from logs/debug, never written to flow JSON.
    this.context.variables.secret = options.secrets || {};
    this.context.workbooks = {};
    this.context.databases = {};
    this.context.lastError  = null;

    this.metrics = {
      startTime:     Date.now(),
      endTime:       null,
      nodesExecuted: 0,
      nodesFailed:   0,
      nodesAborted:  0,
      nodeTimes:     {},
    };

    const { nodes = [], edges = [] } = flowData;
    this._buildGraph(flowData);

    const startNode = nodes.find(n => n.data?.nodeType === 'start');
    if (!startNode) {
      this.running = false;
      return { success: false, error: 'No Start node found in workflow.', metrics: this._snapshotMetrics() };
    }

    // Reject cyclic graphs before running (prevents infinite loop / stack overflow)
    const cycle = this._detectCycle();
    if (cycle) {
      const names = cycle.map(id => this.nodeMap.get(id)?.data?.label || id).join(' → ');
      this.metrics.endTime = Date.now();
      this.log('ERROR', `Workflow contains a loop (cycle): ${names}`);
      this.running = false;
      return { success: false, error: `Workflow contains a loop (cycle): ${names}`, metrics: this._snapshotMetrics() };
    }

    this.log('INFO', `Workflow started — ${nodes.length} node(s), ${edges.length} edge(s).`);

    let wfTimer = null;
    try {
      const run = this.executeNode(startNode);
      if (this._workflowTimeoutMs > 0) {
        const wfTimeout = new Promise((_, reject) => {
          wfTimer = setTimeout(() => {
            this.aborted = true;
            if (this._resumeFn) { this._resumeFn(); this._resumeFn = null; } // unblock debug pause
            reject(new Error(`Workflow timed out after ${this._workflowTimeoutMs}ms`));
          }, this._workflowTimeoutMs);
        });
        await Promise.race([run, wfTimeout]);
      } else {
        await run;
      }

      this.metrics.endTime = Date.now();
      const durSec = ((this.metrics.endTime - this.metrics.startTime) / 1000).toFixed(2);
      this.log('SUCCESS', `Workflow finished. Total runtime: ${durSec}s`);
      return { success: true, metrics: this._snapshotMetrics() };

    } catch (err) {
      this.metrics.endTime = this.metrics.endTime || Date.now();
      this.log('ERROR', `Workflow failed: ${err.message}`);
      return {
        success: false,
        error:   err.message,
        metrics: this._snapshotMetrics(),
        screenshot:     this._errorShot ? `data:image/jpeg;base64,${this._errorShot.base64}` : null,
        screenshotNode: this._errorShot?.label || null,
      };

    } finally {
      if (wfTimer) clearTimeout(wfTimer);
      await this.cleanup(false);
      this.running = false;
    }
  }

  // ── Stop ─────────────────────────────────────────────────────
  async stop() {
    this.aborted = true;
    if (this._resumeFn) { this._resumeFn(); this._resumeFn = null; } // unblock debug pause
    this.log('WARN', 'Stop requested — aborting...');
    await this.cleanup(true);
  }

  // ── Cleanup ──────────────────────────────────────────────────
  async cleanup(force = false) {
    try {
      if (this.context.browser && (force || !this.context.keepBrowserOpen)) {
        await this.context.browser.close();
        this.context.browser = null;
        this.context.page    = null;
      }
    } catch (_) {}
    // Stop the UIA sidecar process if a Desktop (Tier 4) node started one.
    try {
      if (this.context.desktopUia) { this.context.desktopUia.stop(); this.context.desktopUia = null; }
    } catch (_) {}
  }

  // ── Metrics ──────────────────────────────────────────────────
  _snapshotMetrics() {
    return {
      startTime:     this.metrics.startTime,
      endTime:       this.metrics.endTime || Date.now(),
      nodesExecuted: this.metrics.nodesExecuted,
      nodesFailed:   this.metrics.nodesFailed,
      nodesAborted:  this.metrics.nodesAborted,
      slowestNode:   this._getSlowestNode(),
      fastestNode:   this._getFastestNode(),
    };
  }

  _getSlowestNode() {
    let slowest = null;
    for (const [id, data] of Object.entries(this.metrics.nodeTimes)) {
      if (!slowest || data.durationMs > slowest.durationMs) slowest = { nodeId: id, ...data };
    }
    return slowest;
  }

  _getFastestNode() {
    let fastest = null;
    for (const [id, data] of Object.entries(this.metrics.nodeTimes)) {
      if (!fastest || data.durationMs < fastest.durationMs) fastest = { nodeId: id, ...data };
    }
    return fastest;
  }
}

module.exports = { WorkflowEngine };
