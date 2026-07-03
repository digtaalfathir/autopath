'use strict';

// DesktopProvider — Node client for the native UIA sidecar (Tier 4).
// Spawns Manufactura.Sidecar.exe and talks JSON-RPC over stdio (one JSON
// object per line). Lazily started on first use and reused for the workflow.
//
// Sidecar path resolution order:
//   1. process.env.MC_SIDECAR_PATH        (set by main.js)
//   2. <resourcesPath>/sidecar/Manufactura.Sidecar.exe   (packaged)
//   3. sidecar/dist/Manufactura.Sidecar.exe               (dev build)

const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

function resolveSidecarPath() {
  const candidates = [];
  if (process.env.MC_SIDECAR_PATH) candidates.push(process.env.MC_SIDECAR_PATH);
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'sidecar', 'Manufactura.Sidecar.exe'));
  candidates.push(path.join(__dirname, '..', '..', 'sidecar', 'dist', 'Manufactura.Sidecar.exe'));
  return candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

class DesktopProvider {
  constructor() {
    this._proc     = null;
    this._nextId   = 1;
    this._pending  = new Map();   // id → { resolve, reject }
    this._buffer   = '';
    this._ready    = false;
  }

  _ensureStarted() {
    if (this._proc) return;
    if (process.platform !== 'win32') {
      throw new Error('Desktop (UIA) automation is only available on Windows.');
    }
    const exe = resolveSidecarPath();
    if (!exe) {
      throw new Error('UIA sidecar not found. Build it: powershell -File sidecar/build.ps1 (requires .NET 8 SDK), or set MC_SIDECAR_PATH.');
    }

    this._proc = spawn(exe, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    this._proc.stdout.setEncoding('utf-8');
    this._proc.stdout.on('data', chunk => this._onData(chunk));
    this._proc.stderr.setEncoding('utf-8');
    this._proc.on('exit', (code) => {
      const err = new Error(`UIA sidecar exited (code ${code}).`);
      for (const { reject } of this._pending.values()) reject(err);
      this._pending.clear();
      this._proc = null;
    });
    this._ready = true;
  }

  _onData(chunk) {
    this._buffer += chunk;
    let nl;
    while ((nl = this._buffer.indexOf('\n')) >= 0) {
      const line = this._buffer.slice(0, nl).trim();
      this._buffer = this._buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }   // ignore non-JSON (diagnostics)
      const p = this._pending.get(msg.id);
      if (!p) continue;
      this._pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result || {});
      else p.reject(new Error(msg.error || 'Sidecar error'));
    }
  }

  // Send a command; resolves with the sidecar's result, rejects on error/timeout.
  request(cmd, params = {}, timeoutMs = 60000) {
    this._ensureStarted();
    const id = this._nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this._pending.has(id)) { this._pending.delete(id); reject(new Error(`Sidecar timeout on "${cmd}".`)); }
      }, timeoutMs);
      this._pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      try { this._proc.stdin.write(JSON.stringify({ id, cmd, params }) + '\n'); }
      catch (e) { clearTimeout(timer); this._pending.delete(id); reject(e); }
    });
  }

  // ── Verb helpers (thin wrappers over the protocol) ─────────────
  health()                        { return this.request('health', {}, 8000); }
  launch(p)                       { return this.request('launch', p); }
  attach(p)                       { return this.request('attach', p); }
  click(p)                        { return this.request('click', p); }
  setText(p)                      { return this.request('setText', p); }
  getText(p)                      { return this.request('getText', p); }
  getValue(p)                     { return this.request('getValue', p); }
  exists(p)                       { return this.request('exists', p); }
  waitFor(p)                      { return this.request('waitFor', p); }

  stop() {
    try { this._proc?.stdin.write(JSON.stringify({ id: this._nextId++, cmd: 'close', params: {} }) + '\n'); } catch (_) {}
    try { this._proc?.kill(); } catch (_) {}
    this._proc = null;
  }
}

// One provider per workflow run, stored on the execution context.
function getDesktopProvider(context) {
  if (!context.desktopUia) context.desktopUia = new DesktopProvider();
  return context.desktopUia;
}

module.exports = { DesktopProvider, getDesktopProvider, resolveSidecarPath };
