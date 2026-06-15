/**
 * Plugin Registry — future-ready architecture for extensible node types.
 *
 * Each plugin must export:
 *   {
 *     meta: { type, label, category, description, icon, color },
 *     defaults: { ...default property values },
 *     schema: [ { key, label, type, placeholder?, options? } ],
 *     execute: async (data, context, engine) => { ... }
 *   }
 *
 * To add a new node type (e.g., Read Excel, HTTP Request):
 *   1. Create a file in engine/nodes/
 *   2. Export the handler with the structure above
 *   3. Register it in workflowEngine.js constructor
 */

class PluginRegistry {
  constructor() {
    this.plugins = new Map();
  }

  register(type, handler) {
    if (!handler.meta || !handler.execute) {
      throw new Error(`Plugin "${type}" must export { meta, execute }`);
    }
    this.plugins.set(type, handler);
  }

  get(type) {
    return this.plugins.get(type) || null;
  }

  getAll() {
    return Array.from(this.plugins.values());
  }

  getAllMeta() {
    return Array.from(this.plugins.values()).map(p => p.meta);
  }

  has(type) {
    return this.plugins.has(type);
  }
}

module.exports = { PluginRegistry };
