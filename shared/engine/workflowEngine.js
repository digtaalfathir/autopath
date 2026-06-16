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
  }

  // ── Breakpoint / step-debug API ─────────────────────────────
  setBreakpoints(nodeIds) {
    this._breakpoints = new Set(nodeIds || []);
  }

  async _pauseAt(nodeId) {
    this.emit('debug:paused', { nodeId, variables: { ...this.context.variables } });
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
        varSnap[k] = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      }

      // nodeId passed as 4th arg so ForEach/TryCatch can call executeFromHandle
      result = await handler.execute(node.data, this.context, this, node.id);

      // Variable Viewer: log each variable that was set or changed by this node
      for (const [k, v] of Object.entries(this.context.variables)) {
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
      this.emit('node-error', { nodeId: node.id, error: err.message });
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
  async execute(flowData) {
    this.running = true;
    this.aborted = false;

    // Reset per-run state
    this.context.keepBrowserOpen = false;
    this.context.variables = { ...(flowData.initialVariables || {}) };  // Feature 8
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

    this.log('INFO', `Workflow started — ${nodes.length} node(s), ${edges.length} edge(s).`);

    try {
      await this.executeNode(startNode);

      this.metrics.endTime = Date.now();
      const durSec = ((this.metrics.endTime - this.metrics.startTime) / 1000).toFixed(2);
      this.log('SUCCESS', `Workflow finished. Total runtime: ${durSec}s`);
      return { success: true, metrics: this._snapshotMetrics() };

    } catch (err) {
      this.metrics.endTime = this.metrics.endTime || Date.now();
      this.log('ERROR', `Workflow failed: ${err.message}`);
      return { success: false, error: err.message, metrics: this._snapshotMetrics() };

    } finally {
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
