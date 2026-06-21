'use strict';

const fs   = require('fs');
const path = require('path');

class ExecutionRepository {
  constructor({ historyDir }) {
    this.historyDir = historyDir;
    this.runsFile   = path.join(historyDir, 'runs.json');
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
    if (!fs.existsSync(this.runsFile)) fs.writeFileSync(this.runsFile, '[]', 'utf-8');
  }

  _load() {
    try { return JSON.parse(fs.readFileSync(this.runsFile, 'utf-8')); }
    catch (_) { return []; }
  }

  _save(runs) {
    fs.writeFileSync(this.runsFile, JSON.stringify(runs, null, 2), 'utf-8');
  }

  // ── Create a new run record (returns runId) ──────────────────
  createRun({ workflowId, workflowName, workflowVersion, startTime, executionSource }) {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const runs  = this._load();
    runs.unshift({
      runId,
      workflowId,
      workflowName,
      workflowVersion:  workflowVersion != null ? workflowVersion : null,
      startTime:        startTime || new Date().toISOString(),
      endTime:          null,
      duration:         null,
      status:           'RUNNING',
      nodesExecuted:    0,
      nodesFailed:      0,
      error:            null,
      executionSource:  executionSource || 'MANUAL',
    });
    this._save(runs);
    return runId;
  }

  // ── Update run after completion ──────────────────────────────
  updateRun(runId, updates) {
    const runs = this._load();
    const idx  = runs.findIndex(r => r.runId === runId);
    if (idx !== -1) { runs[idx] = { ...runs[idx], ...updates }; this._save(runs); }
  }

  // ── List runs, optionally filtered by workflowId ─────────────
  getHistory({ workflowId, limit } = {}) {
    let runs = this._load();
    if (workflowId) runs = runs.filter(r => r.workflowId === workflowId);
    if (limit)      runs = runs.slice(0, limit);
    return runs;
  }

  // ── Get a single run ─────────────────────────────────────────
  getRun(runId) {
    const run = this._load().find(r => r.runId === runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    return run;
  }

  // ── Generate execution report ────────────────────────────────
  generateReport(runId) {
    const run = this.getRun(runId);
    return {
      runId:         run.runId,
      workflow:      run.workflowName || run.workflowId,
      workflowId:    run.workflowId,
      version:       run.workflowVersion != null ? `v${run.workflowVersion}` : 'draft',
      status:        run.status,
      startTime:     run.startTime,
      endTime:       run.endTime,
      duration:      run.duration != null ? (run.duration / 1000).toFixed(2) + 's' : '—',
      nodesExecuted:   run.nodesExecuted,
      nodesFailed:     run.nodesFailed,
      error:           run.error || null,
      executionSource: run.executionSource || 'MANUAL',
      errorScreenshot: run.errorScreenshot || null,
    };
  }

  // ── Resolve an error-screenshot file to a data URL (or null) ─
  getScreenshotDataUrl(runId) {
    const run = this._load().find(r => r.runId === runId);
    if (!run || !run.errorScreenshot) return null;
    const fp = path.join(this.historyDir, 'screenshots', run.errorScreenshot);
    if (!fs.existsSync(fp)) return null;
    try { return `data:image/jpeg;base64,${fs.readFileSync(fp).toString('base64')}`; }
    catch (_) { return null; }
  }
}

module.exports = { ExecutionRepository };
