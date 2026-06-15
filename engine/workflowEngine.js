const EventEmitter = require('events');
const { PluginRegistry } = require('./pluginRegistry');

const startHandler       = require('./nodes/start');
const openBrowserHandler = require('./nodes/openBrowser');
const navigateUrlHandler = require('./nodes/navigateUrl');
const inputTextHandler   = require('./nodes/inputText');
const clickElementHandler= require('./nodes/clickElement');
const endHandler         = require('./nodes/end');

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();

    this.context = {
      browser: null,
      page: null,
      variables: {},
      keepBrowserOpen: false,  // set by End node when autoCloseBrowser=false
    };

    this.running = false;
    this.aborted = false;

    // Runtime metrics — structured for future extension
    this.metrics = {
      startTime:     null,   // ms epoch
      endTime:       null,
      nodesExecuted: 0,
      nodesFailed:   0,
      nodesAborted:  0,
      nodeTimes:     {},     // { [nodeId]: { label, durationMs, status } }
    };

    this.registry = new PluginRegistry();
    this.registry.register('start',        startHandler);
    this.registry.register('openBrowser',  openBrowserHandler);
    this.registry.register('navigateUrl',  navigateUrlHandler);
    this.registry.register('inputText',    inputTextHandler);
    this.registry.register('clickElement', clickElementHandler);
    this.registry.register('end',          endHandler);
  }

  // ── Logging ─────────────────────────────────────────────────
  log(level, message) {
    const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
    this.emit('log', { level, message, timestamp });
  }

  // ── Execution order ─────────────────────────────────────────
  resolveExecutionOrder(flowData) {
    const { nodes, edges } = flowData;
    const adjacency = {};
    for (const edge of edges) {
      adjacency[edge.source] = edge.target;
    }

    const startNode = nodes.find(n => n.data?.nodeType === 'start');
    if (!startNode) throw new Error('No Start node found in workflow.');

    const ordered = [];
    const visited = new Set();
    let currentId = startNode.id;

    while (currentId) {
      if (visited.has(currentId)) throw new Error(`Circular reference at node ${currentId}.`);
      visited.add(currentId);
      const node = nodes.find(n => n.id === currentId);
      if (!node) throw new Error(`Node ${currentId} not found.`);
      ordered.push(node);
      currentId = adjacency[currentId] || null;
    }

    return ordered;
  }

  // ── Main execute ─────────────────────────────────────────────
  async execute(flowData) {
    this.running = true;
    this.aborted = false;
    this.context.keepBrowserOpen = false;

    // Reset metrics
    this.metrics = {
      startTime:     Date.now(),
      endTime:       null,
      nodesExecuted: 0,
      nodesFailed:   0,
      nodesAborted:  0,
      nodeTimes:     {},
    };

    let success = false;

    try {
      const orderedNodes = this.resolveExecutionOrder(flowData);
      this.log('INFO', `Workflow started — ${orderedNodes.length} step(s).`);

      for (const node of orderedNodes) {
        if (this.aborted) {
          this.log('WARN', 'Workflow aborted by user.');
          this.metrics.nodesAborted++;
          break;
        }

        const nodeType = node.data?.nodeType;
        const label    = node.data?.label || nodeType;
        const handler  = this.registry.get(nodeType);

        if (!handler) {
          this.log('ERROR', `Unknown node type: ${nodeType}`);
          this.emit('node-error', { nodeId: node.id, error: `Unknown: ${nodeType}` });
          this.metrics.nodesFailed++;
          continue;
        }

        this.emit('node-start', node.id);
        this.log('INFO', `Running: ${label}`);

        const nodeStart = Date.now();
        try {
          await handler.execute(node.data, this.context, this);
          const dur = Date.now() - nodeStart;
          this.metrics.nodesExecuted++;
          this.metrics.nodeTimes[node.id] = { label, durationMs: dur, status: 'success' };
          this.emit('node-complete', node.id);
          this.log('SUCCESS', `Completed: ${label} (${dur}ms)`);
        } catch (err) {
          const dur = Date.now() - nodeStart;
          this.metrics.nodesFailed++;
          this.metrics.nodeTimes[node.id] = { label, durationMs: dur, status: 'error', error: err.message };
          this.emit('node-error', { nodeId: node.id, error: err.message });
          this.log('ERROR', `Failed: ${label} — ${err.message}`);
          throw err;
        }
      }

      success = true;
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
    this.log('WARN', 'Stop requested — aborting...');
    await this.cleanup(true); // force close regardless of keepBrowserOpen
  }

  // ── Cleanup ──────────────────────────────────────────────────
  /**
   * @param {boolean} force  When true, close browser even if keepBrowserOpen is set.
   *                         Used by stop() so a manual abort always frees the browser.
   */
  async cleanup(force = false) {
    try {
      if (this.context.browser && (force || !this.context.keepBrowserOpen)) {
        await this.context.browser.close();
        this.context.browser = null;
        this.context.page    = null;
      }
    } catch (_) {}
  }

  // ── Metrics snapshot ─────────────────────────────────────────
  _snapshotMetrics() {
    return {
      startTime:     this.metrics.startTime,
      endTime:       this.metrics.endTime   || Date.now(),
      nodesExecuted: this.metrics.nodesExecuted,
      nodesFailed:   this.metrics.nodesFailed,
      nodesAborted:  this.metrics.nodesAborted,
      // Derived helpers
      slowestNode: this._getSlowestNode(),
      fastestNode: this._getFastestNode(),
    };
  }

  _getSlowestNode() {
    let slowest = null;
    for (const [id, data] of Object.entries(this.metrics.nodeTimes)) {
      if (!slowest || data.durationMs > slowest.durationMs) {
        slowest = { nodeId: id, ...data };
      }
    }
    return slowest;
  }

  _getFastestNode() {
    let fastest = null;
    for (const [id, data] of Object.entries(this.metrics.nodeTimes)) {
      if (!fastest || data.durationMs < fastest.durationMs) {
        fastest = { nodeId: id, ...data };
      }
    }
    return fastest;
  }
}

module.exports = { WorkflowEngine };
