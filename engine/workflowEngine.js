const EventEmitter = require('events');
const { PluginRegistry } = require('./pluginRegistry');

// Import built-in node handlers
const startHandler = require('./nodes/start');
const openBrowserHandler = require('./nodes/openBrowser');
const navigateUrlHandler = require('./nodes/navigateUrl');
const inputTextHandler = require('./nodes/inputText');
const clickElementHandler = require('./nodes/clickElement');
const endHandler = require('./nodes/end');

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.context = {
      browser: null,
      page: null,
      variables: {},
    };
    this.running = false;
    this.aborted = false;

    // Register built-in plugins
    this.registry = new PluginRegistry();
    this.registry.register('start', startHandler);
    this.registry.register('openBrowser', openBrowserHandler);
    this.registry.register('navigateUrl', navigateUrlHandler);
    this.registry.register('inputText', inputTextHandler);
    this.registry.register('clickElement', clickElementHandler);
    this.registry.register('end', endHandler);
  }

  log(level, message) {
    const timestamp = new Date().toISOString().substr(11, 12);
    const entry = { level, message, timestamp };
    this.emit('log', entry);
  }

  /**
   * Resolves the execution order from the flow JSON (nodes + edges).
   * Walks from the "start" node following edges.
   */
  resolveExecutionOrder(flowData) {
    const { nodes, edges } = flowData;

    // Build adjacency map: sourceId -> targetId
    const adjacency = {};
    for (const edge of edges) {
      adjacency[edge.source] = edge.target;
    }

    // Find start node
    const startNode = nodes.find(n => n.data?.nodeType === 'start');
    if (!startNode) {
      throw new Error('No Start node found in workflow');
    }

    const ordered = [];
    const visited = new Set();
    let currentId = startNode.id;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error(`Circular reference detected at node ${currentId}`);
      }
      visited.add(currentId);

      const node = nodes.find(n => n.id === currentId);
      if (!node) {
        throw new Error(`Node ${currentId} not found`);
      }
      ordered.push(node);
      currentId = adjacency[currentId] || null;
    }

    return ordered;
  }

  async execute(flowData) {
    this.running = true;
    this.aborted = false;

    try {
      const orderedNodes = this.resolveExecutionOrder(flowData);
      this.log('INFO', `Workflow started — ${orderedNodes.length} step(s)`);

      for (const node of orderedNodes) {
        if (this.aborted) {
          this.log('WARN', 'Workflow aborted by user');
          break;
        }

        const nodeType = node.data?.nodeType;
        const handler = this.registry.get(nodeType);

        if (!handler) {
          this.log('ERROR', `Unknown node type: ${nodeType}`);
          this.emit('node-error', { nodeId: node.id, error: `Unknown node type: ${nodeType}` });
          continue;
        }

        this.emit('node-start', node.id);
        this.log('INFO', `▶ Executing: ${node.data?.label || nodeType}`);

        try {
          await handler.execute(node.data, this.context, this);
          this.emit('node-complete', node.id);
          this.log('SUCCESS', `✓ Completed: ${node.data?.label || nodeType}`);
        } catch (err) {
          this.emit('node-error', { nodeId: node.id, error: err.message });
          this.log('ERROR', `✗ Failed: ${node.data?.label || nodeType} — ${err.message}`);
          throw err;
        }
      }

      this.log('INFO', '🏁 Workflow completed successfully');
      return { success: true };
    } catch (err) {
      this.log('ERROR', `Workflow failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      // Cleanup
      await this.cleanup();
      this.running = false;
    }
  }

  async stop() {
    this.aborted = true;
    this.log('WARN', 'Stop requested — aborting workflow...');
    await this.cleanup();
  }

  async cleanup() {
    try {
      if (this.context.browser) {
        await this.context.browser.close();
        this.context.browser = null;
        this.context.page = null;
      }
    } catch (_) {
      // Ignore cleanup errors
    }
  }
}

module.exports = { WorkflowEngine };
