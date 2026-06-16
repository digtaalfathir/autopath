'use strict';

// RobotAgent — picks jobs from JobQueue and executes workflows.
// Stage 11: this class becomes a network client that receives jobs from Controller.

const EventEmitter      = require('events');
const { WorkflowEngine } = require('../../shared/engine/workflowEngine');

function ts() {
  return new Date().toISOString().substring(11, 19);
}

class RobotAgent extends EventEmitter {
  constructor({ robotId, jobQueue, workflowRepo, execRepo, registry,
                onLog, onNodeStart, onNodeComplete, onNodeError, onJobComplete, onDebugPaused }) {
    super();
    this.robotId      = robotId || 'robot_local';
    this.jobQueue     = jobQueue;
    this.workflowRepo = workflowRepo;
    this.execRepo     = execRepo;
    this.registry     = registry;

    // IPC forwarding callbacks
    this._onLog          = onLog          || (() => {});
    this._onNodeStart    = onNodeStart    || (() => {});
    this._onNodeComplete = onNodeComplete || (() => {});
    this._onNodeError    = onNodeError    || (() => {});
    this._onJobComplete  = onJobComplete  || (() => {});
    this._onDebugPaused  = onDebugPaused  || (() => {});

    this._busy            = false;
    this._currentEngine   = null;
    this._currentJobId    = null;
    this._pollInterval    = null;
    this._heartbeatInt    = null;
  }

  start() {
    this.jobQueue.resetStuckJobs();
    this.registry.registerRobot(this.robotId, { name: 'Local Robot', capabilities: ['workflow'] });
    this.registry.updateHeartbeat(this.robotId, 'ONLINE');
    this._pollInterval = setInterval(() => this._poll(), 3_000);     // poll every 3s
    this._heartbeatInt = setInterval(() => {                         // heartbeat every 30s
      this.registry.updateHeartbeat(this.robotId, this._busy ? 'BUSY' : 'ONLINE');
    }, 30_000);
    this._log('INFO', `[Robot ${this.robotId}] Started — polling every 3s`);
  }

  stop() {
    clearInterval(this._pollInterval);
    clearInterval(this._heartbeatInt);
    this.registry.updateHeartbeat(this.robotId, 'OFFLINE');
    this._log('INFO', `[Robot ${this.robotId}] Stopped`);
  }

  async stopCurrentJob() {
    if (this._currentEngine) await this._currentEngine.stop();
  }

  debugResume() { this._currentEngine?.debugResume(); }
  debugStep()   { this._currentEngine?.debugStep(); }

  _log(level, message) {
    this._onLog({ level, message, timestamp: ts() });
  }

  // ── Poll for next PENDING job ────────────────────────────────
  async _poll() {
    if (this._busy) return;
    const job = this.jobQueue.claimNextJob(this.robotId);
    if (!job) return;
    await this._execute(job);
  }

  // ── Execute a claimed job ────────────────────────────────────
  async _execute(job) {
    this._busy         = true;
    this._currentJobId = job.id;
    this.registry.updateHeartbeat(this.robotId, 'BUSY');

    // ── 1. Resolve workflow data ─────────────────────────────
    let flowData;
    try {
      if (job.flowData) {
        // MANUAL run: embedded canvas state
        flowData = job.flowData;
      } else {
        // SCHEDULED run: load from published release
        const rel = this.workflowRepo.getVersion(job.workflowId, job.workflowVersion);
        flowData  = {
          name:     rel.workflowName || rel.workflowId,
          version:  rel.version,
          nodes:    rel.nodes,
          edges:    rel.edges,
          viewport: rel.viewport || {},
        };
      }
    } catch (err) {
      this._log('ERROR', `[Robot] Cannot load workflow for job ${job.id}: ${err.message}`);
      this.jobQueue.updateJob(job.id, {
        status: 'FAILED', completedAt: new Date().toISOString(), error: err.message,
      });
      this._finish(job.id, null, { success: false, error: err.message });
      return;
    }

    // ── 2. Record run in history ──────────────────────────────
    const runId = this.execRepo.createRun({
      workflowId:      job.workflowId,
      workflowName:    flowData.name,
      workflowVersion: job.workflowVersion,
      startTime:       new Date().toISOString(),
      executionSource: job.source,
    });

    this.jobQueue.updateJob(job.id, { status: 'RUNNING', startedAt: new Date().toISOString(), runId });
    this._log('INFO', `[Robot] Job ${job.id} — ${job.workflowId} — starting`);

    // ── 3. Execute via WorkflowEngine ─────────────────────────
    try {
      const engine        = new WorkflowEngine();
      this._currentEngine = engine;

      engine.on('log',           log  => this._onLog(log));
      engine.on('node-start',    id   => this._onNodeStart(id));
      engine.on('node-complete', id   => this._onNodeComplete(id));
      engine.on('node-error',    data => this._onNodeError(data));
      engine.on('debug:paused',  data => this._onDebugPaused(data));

      // Apply breakpoints from flowData (Feature 9)
      if (job.flowData?.breakpoints?.length) {
        engine.setBreakpoints(job.flowData.breakpoints);
      }

      const result = await engine.execute(flowData);
      this._currentEngine = null;

      // ── 4. Update run history ─────────────────────────────
      this.execRepo.updateRun(runId, {
        endTime:       new Date().toISOString(),
        duration:      result.metrics ? (result.metrics.endTime - result.metrics.startTime) : null,
        status:        result.success ? 'SUCCESS' : 'FAILED',
        nodesExecuted: result.metrics?.nodesExecuted || 0,
        nodesFailed:   result.metrics?.nodesFailed   || 0,
        error:         result.error || null,
      });

      // ── 5. Update job status ──────────────────────────────
      this.jobQueue.updateJob(job.id, {
        status:      result.success ? 'SUCCESS' : 'FAILED',
        completedAt: new Date().toISOString(),
        runId,
        error:       result.error || null,
      });

      this._log(result.success ? 'SUCCESS' : 'ERROR',
        `[Robot] Job ${job.id} ${result.success ? 'completed' : 'failed'}`);

      this._finish(job.id, runId, { success: result.success, metrics: result.metrics, runId });

    } catch (err) {
      this._currentEngine = null;

      this.execRepo.updateRun(runId, {
        endTime: new Date().toISOString(), status: 'FAILED', error: err.message,
      });
      this.jobQueue.updateJob(job.id, {
        status: 'FAILED', completedAt: new Date().toISOString(), runId, error: err.message,
      });

      this._log('ERROR', `[Robot] Job ${job.id} threw: ${err.message}`);
      this._finish(job.id, runId, { success: false, error: err.message, runId });

    } finally {
      this._busy         = false;
      this._currentJobId = null;
      this.registry.updateHeartbeat(this.robotId, 'ONLINE');
    }
  }

  _finish(jobId, runId, result) {
    // Notify the flow:execute IPC handler that's awaiting this job
    this.emit(`job-complete:${jobId}`, { ...result, jobId, runId });
    // Notify renderer (toast / status)
    this._onJobComplete({ jobId, workflowId: this._currentJobId, ...result });
  }
}

module.exports = { RobotAgent };
