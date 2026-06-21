import React, { useState, useEffect, useRef } from 'react';
import { IconExport } from './Icons';
import { SkeletonTable } from './Skeleton';

const api = window.electronAPI || null;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDur(ms) {
  if (ms == null) return '—';
  return (ms / 1000).toFixed(2) + 's';
}

function StatusBadge({ status }) {
  const palette = {
    SUCCESS: { bg: '#DCFCE7', color: '#15803D' },
    FAILED:  { bg: '#FEE2E2', color: '#DC2626' },
    RUNNING: { bg: '#DBEAFE', color: '#2563EB' },
  };
  const s = palette[status] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function VersionsTab({ versions }) {
  if (!versions.length) {
    return <div className="hist-empty">No published versions. Click <strong>Publish</strong> in the toolbar.</div>;
  }
  return (
    <table className="hist-table">
      <thead>
        <tr><th>Version</th><th>Published</th><th>Description</th></tr>
      </thead>
      <tbody>
        {versions.map((v, i) => (
          <tr key={v.version}>
            <td>
              <strong>v{v.version}</strong>
              {i === 0 && <span className="hist-badge hist-badge--latest">latest</span>}
            </td>
            <td>{fmtDate(v.publishDate)}</td>
            <td>{v.description || <span className="hist-muted">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SourceBadge({ source }) {
  const scheduled = source === 'SCHEDULED';
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
      background: scheduled ? '#FFF7ED' : '#F3F4F6',
      color:      scheduled ? '#C2410C' : '#6B7280',
    }}>
      {source || 'MANUAL'}
    </span>
  );
}

function ExportButton({ runs }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const exportExcel = async () => {
    setMenuOpen(false);
    await api?.exportExcel(runs, 'cyclone-history.xlsx');
  };

  const exportPdf = async () => {
    setMenuOpen(false);
    const rows = runs.map(r =>
      `<tr><td>${r.runId?.slice(0,16)}…</td><td>${r.workflowId||''}</td><td>${r.status||''}</td><td>${r.startTime ? new Date(r.startTime).toLocaleString() : ''}</td><td>${r.duration != null ? (r.duration/1000).toFixed(2)+'s' : ''}</td><td>${r.error||''}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cyclone Run History</title>
    <style>body{font-family:sans-serif;padding:24px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#1e293b;color:#fff}</style>
    </head><body><h1>Cyclone Run History — ${new Date().toLocaleDateString()}</h1>
    <table><thead><tr><th>Run ID</th><th>Workflow</th><th>Status</th><th>Start Time</th><th>Duration</th><th>Error</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    await api?.exportPdf(html, 'cyclone-history.pdf');
  };

  if (!api) return null;
  return (
    <div className="export-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      <button className="hist-btn" onClick={() => setMenuOpen(v => !v)}>
        <IconExport size={12} /> Export ▾
      </button>
      {menuOpen && (
        <div className="export-menu">
          <button onClick={exportExcel}>Export Excel (.xlsx)</button>
          <button onClick={exportPdf}>Export PDF (.pdf)</button>
        </div>
      )}
    </div>
  );
}

function RunHistoryTab({ runs, onViewReport }) {
  if (!runs.length) {
    return <div className="hist-empty">No run history yet. Run the workflow to create entries.</div>;
  }
  return (
    <>
      <div className="hist-actions-bar">
        <ExportButton runs={runs} />
      </div>
      <table className="hist-table">
        <thead>
          <tr><th>Run ID</th><th>Version</th><th>Source</th><th>Start</th><th>Duration</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.runId}>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.runId.slice(0, 18)}…</td>
              <td>{r.workflowVersion != null ? `v${r.workflowVersion}` : <span className="hist-muted">draft</span>}</td>
              <td><SourceBadge source={r.executionSource} /></td>
              <td>{fmtDate(r.startTime)}</td>
              <td>{fmtDur(r.duration)}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>
                <button className="hist-btn" onClick={() => onViewReport(r.runId)}>Report</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ReportTab({ report }) {
  const [shot, setShot] = useState(null);

  useEffect(() => {
    setShot(null);
    if (report?.errorScreenshot && api) {
      api.getReportScreenshot(report.runId).then(r => { if (r?.success) setShot(r.dataUrl); });
    }
  }, [report?.runId, report?.errorScreenshot]);

  if (!report) return <div className="hist-empty">Select a run from Run History tab.</div>;
  const ok = report.status === 'SUCCESS';
  return (
    <div className="exec-report">
      <div className={`exec-report__banner exec-report__banner--${ok ? 'ok' : 'err'}`}>
        {ok ? '✓ SUCCESS' : '✗ FAILED'}
      </div>
      <div className="exec-report__grid">
        <div className="exec-report__row"><span>Workflow</span><strong>{report.workflow}</strong></div>
        <div className="exec-report__row"><span>Version</span><strong>{report.version}</strong></div>
        <div className="exec-report__row"><span>Run ID</span><code>{report.runId}</code></div>
        <div className="exec-report__divider" />
        <div className="exec-report__row"><span>Started</span><strong>{fmtDate(report.startTime)}</strong></div>
        <div className="exec-report__row"><span>Ended</span><strong>{fmtDate(report.endTime)}</strong></div>
        <div className="exec-report__row"><span>Duration</span><strong>{report.duration}</strong></div>
        <div className="exec-report__divider" />
        <div className="exec-report__row"><span>Source</span><SourceBadge source={report.executionSource} /></div>
        <div className="exec-report__row"><span>Nodes Executed</span><strong>{report.nodesExecuted}</strong></div>
        <div className="exec-report__row"><span>Nodes Failed</span><strong>{report.nodesFailed}</strong></div>
        {report.error && (
          <div className="exec-report__row exec-report__row--err"><span>Error</span><strong>{report.error}</strong></div>
        )}
      </div>

      {report.errorScreenshot && (
        <div className="exec-report__shot">
          <div className="exec-report__shot-label">Screenshot at failure</div>
          {shot
            ? <a href={shot} target="_blank" rel="noreferrer" title="Open full size">
                <img className="exec-report__shot-img" src={shot} alt="Error screenshot" />
              </a>
            : <div className="hist-muted" style={{ fontSize: 12 }}>Loading screenshot…</div>}
        </div>
      )}
    </div>
  );
}

export default function HistoryModal({ flowName, onClose }) {
  const [tab, setTab]           = useState('versions');
  const [versions, setVersions] = useState([]);
  const [runs, setRuns]         = useState([]);
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (!api) { setLoading(false); return; }
      const [vRes, rRes] = await Promise.all([
        api.listVersions(flowName),
        api.listRuns({ workflowId: flowName }),
      ]);
      setVersions(vRes?.versions || []);
      setRuns(rRes?.runs || []);
      setLoading(false);
    }
    load();
  }, [flowName]);

  async function viewReport(runId) {
    if (!api) return;
    const r = await api.getReport(runId);
    setReport(r?.report || null);
    setTab('report');
  }

  return (
    <div className="hist-overlay" onClick={onClose}>
      <div className="hist-dialog" onClick={e => e.stopPropagation()}>

        <div className="hist-header">
          <div>
            <div className="hist-header__title">Production</div>
            <div className="hist-header__sub">{flowName}</div>
          </div>
          <button className="hist-close" onClick={onClose}>×</button>
        </div>

        <div className="hist-tabs">
          <button className={`hist-tab ${tab === 'versions' ? 'hist-tab--active' : ''}`} onClick={() => setTab('versions')}>
            Versions
            {versions.length > 0 && <span className="hist-tab-count">{versions.length}</span>}
          </button>
          <button className={`hist-tab ${tab === 'history' ? 'hist-tab--active' : ''}`} onClick={() => setTab('history')}>
            Run History
            {runs.length > 0 && <span className="hist-tab-count">{runs.length}</span>}
          </button>
          {report && (
            <button className={`hist-tab ${tab === 'report' ? 'hist-tab--active' : ''}`} onClick={() => setTab('report')}>
              Report
            </button>
          )}
        </div>

        <div className="hist-body">
          {loading ? (
            <SkeletonTable rows={5} cols={tab === 'versions' ? 3 : 7} />
          ) : (
            <>
              {tab === 'versions' && <VersionsTab versions={versions} />}
              {tab === 'history'  && <RunHistoryTab runs={runs} onViewReport={viewReport} />}
              {tab === 'report'   && <ReportTab report={report} />}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
