'use strict';

// Desktop Automation — Tier 1: Shell & Launch Control.
// Uses Node's built-in child_process only (no native deps, no sidecar).
// Windows-first but cross-platform where sensible so it also runs in dev.

const { spawn, exec } = require('child_process');
const { interpolate } = require('../../utils/interpolate');

const CAT   = 'Desktop';
const COLOR = '#0F766E';
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const S = (v, vars) => interpolate(v ?? '', vars);
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

// Run a shell command, resolve with { code, stdout, stderr } (never rejects).
function run(cmd, opts = {}) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true, maxBuffer: 1024 * 1024 * 16, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: stdout || '', stderr: stderr || (err ? err.message : '') });
    });
  });
}

// Launch a detached process (survives, doesn't block the workflow). Returns PID.
function launchDetached(command, args, cwd) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore', cwd: cwd || undefined, windowsHide: false });
  child.unref();
  return child.pid;
}

// ── Run Program ───────────────────────────────────────────────
const runProgram = {
  meta: { type: 'runProgram', label: 'Run Program', category: CAT, description: 'Launch an application/exe by path', color: COLOR },
  defaults: { programPath: '', args: '', workingDir: '', waitForExit: false, outputVariable: 'pid' },
  schema: [
    { key: 'programPath',    label: 'Program Path', type: 'text', placeholder: 'C:\\Windows\\notepad.exe' },
    { key: 'args',           label: 'Arguments (one per line)', type: 'textarea', placeholder: 'C:\\file.txt' },
    { key: 'workingDir',     label: 'Working Directory (optional)', type: 'text', placeholder: 'C:\\' },
    { key: 'waitForExit',    label: 'Wait for Exit', type: 'boolean', hint: 'Block until the program closes (else launch and continue).' },
    { key: 'outputVariable', label: 'PID / Exit Variable', type: 'text', placeholder: 'pid' },
  ],
  execute: async (data, context, engine) => {
    const exe  = S(data.programPath, context.variables).trim();
    if (!exe) throw new Error('Run Program: Program Path is required.');
    const args = S(data.args, context.variables).split('\n').map(a => a.trim()).filter(Boolean);
    const cwd  = S(data.workingDir, context.variables).trim() || undefined;
    const out  = (data.outputVariable || 'pid').trim();

    if (data.waitForExit === true || data.waitForExit === 'true') {
      const quoted = [exe, ...args].map(a => /\s/.test(a) ? `"${a}"` : a).join(' ');
      engine.log('INFO', `Running (wait): ${quoted}`);
      const r = await run(quoted, { cwd });
      context.variables[out] = r.code;
      engine.log(r.code === 0 ? 'INFO' : 'WARN', `Program exited with code ${r.code}`);
      if (r.code !== 0) engine.log('WARN', (r.stderr || '').slice(0, 300));
    } else {
      const pid = launchDetached(exe, args, cwd);
      context.variables[out] = pid;
      engine.log('INFO', `Launched "${exe}" (pid ${pid})`);
    }
  },
};

// ── Open File (default app) ───────────────────────────────────
const openFile = {
  meta: { type: 'openFile', label: 'Open File', category: CAT, description: 'Open a file with its default application', color: COLOR },
  defaults: { path: '' },
  schema: [{ key: 'path', label: 'File Path', type: 'text', placeholder: 'C:\\Reports\\report.pdf' }],
  execute: async (data, context, engine) => {
    const p = S(data.path, context.variables).trim();
    if (!p) throw new Error('Open File: path is required.');
    engine.log('INFO', `Opening file: ${p}`);
    if (isWin)      launchDetached('cmd', ['/c', 'start', '', p]);
    else if (isMac) launchDetached('open', [p]);
    else            launchDetached('xdg-open', [p]);
  },
};

// ── Open Folder (file manager) ────────────────────────────────
const openFolder = {
  meta: { type: 'openFolder', label: 'Open Folder', category: CAT, description: 'Open a folder in the file manager', color: COLOR },
  defaults: { path: '' },
  schema: [{ key: 'path', label: 'Folder Path', type: 'text', placeholder: 'C:\\Reports  (blank = default location)' }],
  execute: async (data, context, engine) => {
    const p = S(data.path, context.variables).trim();
    engine.log('INFO', `Opening folder: ${p || '(default)'}`);
    if (isWin)      launchDetached('explorer', p ? [p] : []);
    else if (isMac) launchDetached('open', [p || '.']);
    else            launchDetached('xdg-open', [p || '.']);
  },
};

// ── Run Command (cmd / powershell / shell) ────────────────────
const runCommand = {
  meta: { type: 'runCommand', label: 'Run Command', category: CAT, description: 'Run a shell command / script and capture output', color: COLOR },
  defaults: { command: '', shell: 'default', workingDir: '', timeout: '60000', failOnError: true, outputVariable: 'stdout' },
  schema: [
    { key: 'command',        label: 'Command', type: 'textarea', placeholder: 'Get-Service | Where Status -eq Running', hint: 'Supports {{variable}}.' },
    { key: 'shell',          label: 'Shell', type: 'select', options: ['default', 'cmd', 'powershell'] },
    { key: 'workingDir',     label: 'Working Directory (optional)', type: 'text', placeholder: 'C:\\' },
    { key: 'timeout',        label: 'Timeout (ms)', type: 'text', placeholder: '60000' },
    { key: 'failOnError',    label: 'Fail on Non-zero Exit', type: 'boolean' },
    { key: 'outputVariable', label: 'Output Variable (stdout)', type: 'text', placeholder: 'stdout' },
  ],
  execute: async (data, context, engine) => {
    const raw = S(data.command, context.variables).trim();
    if (!raw) throw new Error('Run Command: command is required.');
    const shell   = (data.shell || 'default').toLowerCase();
    const cwd     = S(data.workingDir, context.variables).trim() || undefined;
    const timeout = Math.max(1000, num(S(data.timeout, context.variables), 60000));
    const out     = (data.outputVariable || 'stdout').trim();

    let cmd = raw;
    if (isWin && shell === 'powershell') {
      cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${raw.replace(/"/g, '\\"')}"`;
    } // 'cmd' and 'default' run through exec's default cmd.exe on Windows / sh on unix

    engine.log('INFO', `Running command (${shell})…`);
    const r = await run(cmd, { cwd, timeout });
    const stdout = r.stdout.trim();
    context.variables[out] = stdout;
    context.variables[`${out}_code`]   = r.code;
    context.variables[`${out}_stderr`] = r.stderr.trim();

    if (stdout) engine.log('INFO', `stdout: ${stdout.slice(0, 200)}${stdout.length > 200 ? '…' : ''}`);
    if (r.code !== 0) {
      engine.log('WARN', `Exit code ${r.code}: ${(r.stderr || '').slice(0, 200)}`);
      if (data.failOnError !== false) throw new Error(`Command failed (exit ${r.code}): ${(r.stderr || '').slice(0, 200)}`);
    }
  },
};

// ── Kill Process ──────────────────────────────────────────────
const killProcess = {
  meta: { type: 'killProcess', label: 'Kill Process', category: CAT, description: 'Terminate a process by name or PID', color: '#DC2626' },
  defaults: { target: '', matchBy: 'name', ignoreNotFound: true },
  schema: [
    { key: 'target',         label: 'Process (name or PID)', type: 'text', placeholder: 'notepad.exe  or  12345' },
    { key: 'matchBy',        label: 'Match By', type: 'select', options: ['name', 'pid'] },
    { key: 'ignoreNotFound', label: 'Ignore If Not Running', type: 'boolean' },
  ],
  execute: async (data, context, engine) => {
    const target = S(data.target, context.variables).trim();
    if (!target) throw new Error('Kill Process: target is required.');
    const byPid = (data.matchBy || 'name') === 'pid';

    let cmd;
    if (isWin) cmd = byPid ? `taskkill /F /PID ${target}` : `taskkill /F /IM "${target}"`;
    else       cmd = byPid ? `kill -9 ${target}`          : `pkill -f "${target}"`;

    engine.log('INFO', `Killing process (${data.matchBy}): ${target}`);
    const r = await run(cmd);
    if (r.code !== 0 && data.ignoreNotFound === false) {
      throw new Error(`Kill Process failed: ${(r.stderr || r.stdout || '').slice(0, 200)}`);
    }
    engine.log('INFO', r.code === 0 ? 'Process terminated.' : 'Process not found (ignored).');
  },
};

// ── Wait Process (running / not running) ──────────────────────
async function isRunning(name) {
  if (isWin) {
    const r = await run(`tasklist /FI "IMAGENAME eq ${name}"`);
    return r.stdout.toLowerCase().includes(name.toLowerCase());
  }
  const r = await run(`pgrep -f "${name}"`);
  return r.code === 0;
}

const waitProcess = {
  meta: { type: 'waitProcess', label: 'Wait Process', category: CAT, description: 'Wait until a process is running or has stopped', color: COLOR },
  defaults: { name: '', state: 'running', timeout: '30000', interval: '1000' },
  schema: [
    { key: 'name',     label: 'Process Name', type: 'text', placeholder: 'notepad.exe' },
    { key: 'state',    label: 'Wait For', type: 'select', options: ['running', 'notRunning'] },
    { key: 'timeout',  label: 'Timeout (ms)', type: 'text', placeholder: '30000' },
    { key: 'interval', label: 'Poll Interval (ms)', type: 'text', placeholder: '1000' },
  ],
  execute: async (data, context, engine) => {
    const name = S(data.name, context.variables).trim();
    if (!name) throw new Error('Wait Process: name is required.');
    const want     = (data.state || 'running') === 'running';
    const timeout  = Math.max(1000, num(S(data.timeout, context.variables), 30000));
    const interval = Math.max(200, num(S(data.interval, context.variables), 1000));
    const deadline = Date.now() + timeout;

    engine.log('INFO', `Waiting for "${name}" to be ${want ? 'running' : 'stopped'}…`);
    while (Date.now() < deadline) {
      if (engine.aborted) return;
      if ((await isRunning(name)) === want) { engine.log('INFO', `"${name}" is now ${want ? 'running' : 'stopped'}.`); return; }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error(`Wait Process: "${name}" did not become ${want ? 'running' : 'stopped'} within ${timeout}ms.`);
  },
};

module.exports = { handlers: [runProgram, openFile, openFolder, runCommand, killProcess, waitProcess] };
