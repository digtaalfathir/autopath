'use strict';

// ControllerService — single orchestration hub for the entire system.
//
// Owns:  WorkflowRepository, ExecutionRepository, ScheduleRepository,
//        JobQueue, RobotRegistry, RobotAgent, SchedulerEngine
//
// Exposes a clean API so main.js IPC handlers become one-liners.
// All subsystems are started/stopped through controller.start() / controller.stop().

const path           = require('path');
const fs             = require('fs');
const { EventEmitter } = require('events');

const { WorkflowRepository }             = require('../../shared/workflow/WorkflowRepository');
const { ExecutionRepository }            = require('../../shared/history/ExecutionRepository');
const { ScheduleRepository }             = require('../../shared/scheduler/ScheduleRepository');
const { SchedulerEngine, computeNextRun } = require('../../shared/scheduler/SchedulerEngine');
const { JobQueue }                        = require('../../shared/jobs/JobQueue');
const { RobotRegistry }                  = require('../../shared/robot/RobotRegistry');
const { RobotAgent }                     = require('../robot/RobotAgent');
const { RobotApiServer }                 = require('./RobotApiServer');
const { JobManager }                     = require('./JobManager');
const { Dispatcher }                     = require('./Dispatcher');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

class ControllerService extends EventEmitter {
  // baseDir  — root of the data directories (project root in dev, resourcesPath in prod)
  // callbacks — IPC forwarding functions injected by main.js
  constructor({ baseDir, auditRepo, getSecrets, getExecutionConfig,
                onLog, onNodeStart, onNodeComplete, onNodeError,
                onJobComplete, onJobQueued, onSchedulerJobComplete, onDebugPaused }) {
    super();

    // Lazy providers injected from main.js (credential vault + execution guards)
    this._getSecrets         = getSecrets         || (() => ({}));
    this._getExecutionConfig = getExecutionConfig || (() => ({}));

    // ── Data directories ─────────────────────────────────────
    const releases  = ensureDir(path.join(baseDir, 'releases'));
    const history   = ensureDir(path.join(baseDir, 'history'));
    const schedules = ensureDir(path.join(baseDir, 'schedules'));
    const jobs      = ensureDir(path.join(baseDir, 'jobs'));
    const robots    = ensureDir(path.join(baseDir, 'robots'));

    // ── Repositories (singleton instances) ───────────────────
    this._workflowRepo = new WorkflowRepository({ releasesDir: releases });
    this._execRepo     = new ExecutionRepository({ historyDir: history });
    this._schedRepo    = new ScheduleRepository ({ schedulesFile: path.join(schedules, 'schedules.json') });
    this._jobQueue     = new JobQueue           ({ jobsFile:      path.join(jobs,      'jobs.json')      });
    this._registry     = new RobotRegistry      ({ registryFile:  path.join(robots,    'robots.json')    });

    // ── Orchestration layers ─────────────────────────────────
    this._jobManager = new JobManager({ jobQueue: this._jobQueue });
    this._dispatcher = new Dispatcher({ robotRegistry: this._registry });

    // ── Audit log (optional, injected from main.js) ───────────
    this._auditRepo  = auditRepo || null;

    // ── IPC callbacks ────────────────────────────────────────
    this._cb = {
      onLog:                  onLog                  || (() => {}),
      onNodeStart:            onNodeStart            || (() => {}),
      onNodeComplete:         onNodeComplete         || (() => {}),
      onNodeError:            onNodeError            || (() => {}),
      onJobComplete:          onJobComplete          || (() => {}),
      onJobQueued:            onJobQueued            || (() => {}),
      onSchedulerJobComplete: onSchedulerJobComplete || (() => {}),
      onDebugPaused:          onDebugPaused          || (() => {}),
    };

    this._robotAgent      = null;
    this._schedulerEngine = null;
    this._robotApiServer  = null;
  }

  _audit(action, details = {}) {
    try { this._auditRepo?.log({ action, actor: 'user', details }); } catch (_) {}
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  start() {
    this._startRobotAgent();
    this._startSchedulerEngine();
  }

  stop() {
    this._schedulerEngine?.stop();
    this._robotAgent?.stop();
    this._robotApiServer?.stop();
  }

  _log(level, message) {
    const ts = new Date().toISOString().substring(11, 19);
    this._cb.onLog({ level, message, timestamp: ts });
    if (level === 'ERROR') console.error(message);
  }

  _startRobotAgent() {
    try {
      this._robotAgent = new RobotAgent({
        robotId:            'robot_local',
        jobQueue:           this._jobQueue,
        workflowRepo:       this._workflowRepo,
        execRepo:           this._execRepo,
        registry:           this._registry,
        getSecrets:         this._getSecrets,
        getExecutionConfig: this._getExecutionConfig,
        onLog:           log  => this._cb.onLog(log),
        onNodeStart:     id   => this._cb.onNodeStart(id),
        onNodeComplete:  id   => this._cb.onNodeComplete(id),
        onNodeError:     data => this._cb.onNodeError(data),
        onJobComplete:   data => {
          this._cb.onJobComplete(data);
          this.emit(`job-complete:${data.jobId}`, data);
        },
        onDebugPaused:   data => this._cb.onDebugPaused(data),
      });
      this._robotAgent.start();
      this._log('INFO', '[Controller] RobotAgent started — robot_local ONLINE');
    } catch (err) {
      this._log('ERROR', `[Controller] RobotAgent failed to start: ${err.message}`);
    }
  }

  // ── Robot API Server (for remote robots) ─────────────────────
  startRobotApiServer(port, token) {
    if (this._robotApiServer) {
      this._robotApiServer.stop();
      this._robotApiServer = null;
    }
    this._robotApiServer = new RobotApiServer({
      jobQueue:      this._jobQueue,
      execRepo:      this._execRepo,
      registry:      this._registry,
      token,
      onLog:         log  => this._cb.onLog(log),
      onJobComplete: (jobId, result) => {
        this._cb.onJobComplete({ ...result, jobId });
        this.emit(`job-complete:${jobId}`, { ...result, jobId });
      },
    });
    this._robotApiServer.start(port);
    this._log('INFO', `[Controller] RobotApiServer started on port ${port}`);
  }

  stopRobotApiServer() {
    this._robotApiServer?.stop();
    this._robotApiServer = null;
  }

  _startSchedulerEngine() {
    try {
      this._schedulerEngine = new SchedulerEngine({
        schedRepo:     this._schedRepo,
        workflowRepo:  this._workflowRepo,
        execRepo:      this._execRepo,
        jobQueue:      this._jobQueue,
        onLog:         log  => this._cb.onLog(log),
        onJobComplete: data => this._cb.onSchedulerJobComplete(data),
      });
      this._schedulerEngine.start();
      this._log('INFO', '[Controller] SchedulerEngine started');
    } catch (err) {
      this._log('ERROR', `[Controller] SchedulerEngine failed to start: ${err.message}`);
    }
  }

  // ── Workflow Registry ─────────────────────────────────────────
  publishWorkflow(workflowId, flowData, description) {
    const result = this._workflowRepo.publish(workflowId, flowData, description);
    this._audit('workflow.publish', { workflowId, version: result?.version, description });
    return result;
  }

  listVersions(workflowId) {
    return this._workflowRepo.listVersions(workflowId);
  }

  listPublished() {
    return this._workflowRepo.listPublished();
  }

  // ── Job Management ────────────────────────────────────────────
  // Designer entry point: create MANUAL job → Dispatcher validates → Robot pulls.
  // Returns a Promise that resolves when RobotAgent emits job-complete.
  async requestRun(flowData) {
    const job = this._jobManager.createJob({
      workflowId:      flowData.name || 'untitled',
      workflowVersion: typeof flowData.version === 'number' ? flowData.version : null,
      source:          'MANUAL',
      flowData,
    });

    this._audit('workflow.run', { workflowId: job.workflowId, jobId: job.id, source: 'MANUAL' });
    this._cb.onJobQueued({ jobId: job.id });
    this._dispatcher.dispatch(job, this._cb.onLog);

    return new Promise(resolve => {
      this.once(`job-complete:${job.id}`, result => resolve({ ...result, jobId: job.id }));
    });
  }

  async cancelJob(jobId) {
    const result = this._jobManager.cancelJob(jobId);
    if (result.cancelled && result.wasRunning) {
      await this._robotAgent?.stopCurrentJob();
    }
    return result;
  }

  retryJob(jobId) {
    return this._jobManager.retryJob(jobId);
  }

  listJobs(options) { return this._jobManager.listJobs(options); }
  getJob(id)        { return this._jobManager.getJob(id); }

  async stopCurrentJob() {
    await this._robotAgent?.stopCurrentJob();
  }

  debugResume() { this._robotAgent?.debugResume(); }
  debugStep()   { this._robotAgent?.debugStep(); }

  // ── Robot Management ──────────────────────────────────────────
  listRobots() {
    return this._registry.listRobots();
  }

  // ── Schedule Management ───────────────────────────────────────
  listSchedules() {
    return this._schedRepo.listSchedules();
  }

  createSchedule(data) {
    const nextRun = computeNextRun(data.scheduleType, data.config || {}, new Date());
    const result  = this._schedRepo.createSchedule({
      ...data,
      nextRunAt: nextRun ? nextRun.toISOString() : null,
    });
    this._audit('schedule.create', { scheduleId: result?.id, name: data.name, type: data.scheduleType });
    return result;
  }

  updateSchedule(id, updates) {
    const existing = this._schedRepo.getSchedule(id);
    const type     = updates.scheduleType || existing?.scheduleType;
    const config   = updates.config       || existing?.config || {};
    const nextRun  = computeNextRun(type, config, new Date());
    const result   = this._schedRepo.updateSchedule(id, { ...updates, nextRunAt: nextRun ? nextRun.toISOString() : null });
    this._audit('schedule.update', { scheduleId: id });
    return result;
  }

  deleteSchedule(id) {
    this._schedRepo.deleteSchedule(id);
    this._audit('schedule.delete', { scheduleId: id });
  }

  toggleSchedule(id, enabled) {
    const existing = this._schedRepo.getSchedule(id);
    if (!existing) throw new Error('Schedule not found');
    const updates = { status: enabled ? 'ACTIVE' : 'DISABLED' };
    if (enabled) {
      const next = computeNextRun(existing.scheduleType, existing.config, new Date());
      updates.nextRunAt = next ? next.toISOString() : null;
    }
    this._schedRepo.updateSchedule(id, updates);
    this._audit('schedule.toggle', { scheduleId: id, enabled });
  }

  computeNextRun(scheduleType, config) {
    return computeNextRun(scheduleType, config, new Date());
  }

  // ── History ───────────────────────────────────────────────────
  listRuns(options) {
    return this._execRepo.getHistory(options);
  }

  getReport(runId) {
    return this._execRepo.generateReport(runId);
  }

  getReportScreenshot(runId) {
    return this._execRepo.getScreenshotDataUrl(runId);
  }

  // ── Dashboard Snapshot ────────────────────────────────────────
  // Aggregates system state for the monitoring dashboard.
  getDashboardData() {
    const now      = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const allJobs  = this._jobQueue.listJobs();
    const today    = allJobs.filter(j => j.createdAt >= dayStart);
    const count    = (status) => allJobs.filter(j => j.status === status).length;

    return {
      generatedAt: now.toISOString(),
      workflows:   this._workflowRepo.listPublished(),
      robots:      this._registry.listRobots(),
      schedules:   this._schedRepo.listSchedules(),
      jobs: {
        recent:  allJobs.slice(0, 20),
        summary: {
          total:     allJobs.length,
          today:     today.length,
          pending:   count('PENDING'),
          running:   count('RUNNING'),
          success:   count('SUCCESS'),
          failed:    count('FAILED'),
          cancelled: count('CANCELLED'),
        },
      },
      history: this._execRepo.getHistory({ limit: 10 }),
    };
  }
}

module.exports = { ControllerService };
