'use strict';

/**
 * Resolve {{path}} and {{obj.nested.key}} templates against a variables map.
 *
 * Rules:
 *  - Non-string values are returned as-is (numbers, booleans, null, objects).
 *  - Missing paths are left as the original {{...}} token.
 *  - Object / array values are serialised to JSON so they can be embedded in strings.
 *  - Supports dot-notation: {{response.data.name}}.
 *
 * @param {*}      value     - The raw field value from node data.
 * @param {object} variables - context.variables from the execution context.
 * @returns {*} Resolved value.
 */
function interpolate(value, variables = {}) {
  if (typeof value !== 'string') return value;

  return value.replace(/\{\{([^}]+)\}\}/g, (_match, expr) => {
    const path  = expr.trim();
    const parts = path.split('.');

    let cursor = variables;
    for (const part of parts) {
      if (cursor == null || typeof cursor !== 'object') return _match;
      cursor = cursor[part];
    }

    if (cursor === undefined || cursor === null) return _match;
    if (typeof cursor === 'object') return JSON.stringify(cursor);
    return String(cursor);
  });
}

/**
 * Resolve interpolation across every string value in a data object.
 * Useful when a node wants to interpolate all its fields at once.
 *
 * @param {object} data      - Node data object (e.g. { url, value, selector }).
 * @param {object} variables - context.variables.
 * @returns {object} New object with all string values resolved.
 */
function interpolateAll(data, variables = {}) {
  const result = {};
  for (const [key, val] of Object.entries(data)) {
    result[key] = interpolate(val, variables);
  }
  return result;
}

module.exports = { interpolate, interpolateAll };
