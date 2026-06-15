'use strict';

const http  = require('http');
const https = require('https');
const { URL } = require('url');
const { interpolate } = require('../utils/interpolate');

/**
 * Minimal HTTP client built on Node.js built-ins.
 * Returns { status, statusText, headers, data, raw }.
 * Parses JSON automatically; falls back to raw string.
 */
function request(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (_) {
      return reject(new Error(`Invalid URL: ${urlStr}`));
    }

    const isHttps  = parsed.protocol === 'https:';
    const lib      = isHttps ? https : http;
    const bodyBuf  = body ? Buffer.from(body, 'utf-8') : null;

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   method.toUpperCase(),
      headers:  { ...headers },
    };

    if (bodyBuf) {
      options.headers['Content-Length'] = bodyBuf.length;
    }

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let data  = raw;
        try { data = JSON.parse(raw); } catch (_) {}
        resolve({
          status:     res.statusCode,
          statusText: res.statusMessage,
          headers:    res.headers,
          data,
          raw,
        });
      });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out after 30s'));
    });

    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────

module.exports = {
  meta: {
    type: 'httpRequest',
    label: 'HTTP Request',
    category: 'API',
    description: 'Make an HTTP API call and store the response',
    color: '#2563EB',
  },
  defaults: {
    method: 'GET',
    url: '',
    headers: '',
    body: '',
    outputVariable: 'response',
  },
  schema: [
    {
      key: 'method',
      label: 'Method',
      type: 'text',
      placeholder: 'GET',
    },
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      placeholder: 'https://api.example.com/users/{{userId}}',
      hint: 'Supports {{variable}} interpolation.',
    },
    {
      key: 'headers',
      label: 'Headers (JSON)',
      type: 'textarea',
      placeholder: '{"Authorization": "Bearer {{token}}"}',
      hint: 'Optional. Must be valid JSON. Supports {{variable}}.',
    },
    {
      key: 'body',
      label: 'Body (JSON)',
      type: 'textarea',
      placeholder: '{"username": "{{username}}"}',
      hint: 'Optional. Used for POST / PUT / PATCH.',
    },
    {
      key: 'outputVariable',
      label: 'Output Variable',
      type: 'text',
      placeholder: 'response',
      hint: 'Response stored as context.variables[name]. Access with {{response.data.id}}.',
    },
  ],

  execute: async (data, context, engine) => {
    const method    = (interpolate(data.method || 'GET', context.variables)).toUpperCase();
    const url       = interpolate(data.url || '', context.variables).trim();
    const outVar    = (data.outputVariable || 'response').trim();

    if (!url) throw new Error('HTTP Request: URL is required.');

    // Parse headers
    let headers = {};
    if (data.headers && data.headers.trim()) {
      const rawHeaders = interpolate(data.headers, context.variables);
      try {
        headers = JSON.parse(rawHeaders);
      } catch (_) {
        engine.log('WARN', 'HTTP Request: Headers is not valid JSON — ignoring.');
      }
    }

    // Prepare body (only for write methods)
    let body = null;
    const writeMethods = ['POST', 'PUT', 'PATCH'];
    if (writeMethods.includes(method) && data.body && data.body.trim()) {
      body = interpolate(data.body, context.variables);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    engine.log('INFO', `HTTP ${method} → ${url}`);

    const result = await request(method, url, headers, body);

    // Store full response under the output variable
    context.variables[outVar] = result;

    const statusOk = result.status >= 200 && result.status < 300;
    const logLevel = statusOk ? 'SUCCESS' : 'WARN';
    engine.log(logLevel, `HTTP ${method} ${result.status} ${result.statusText} — stored in "{{${outVar}}}"`);

    if (!statusOk) {
      engine.log('WARN', `Response body: ${result.raw.substring(0, 200)}`);
    }
  },
};
