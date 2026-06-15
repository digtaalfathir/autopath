import React, { useRef, useEffect } from 'react';
import { IconTerminal, IconCheck, IconX, IconInfo } from './Icons';

function fmtTime(ms) {
  if (ms == null) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(startMs, endMs) {
  if (!startMs || !endMs) return '—';
  const sec = ((endMs - startMs) / 1000).toFixed(2);
  return `${sec}s`;
}

function ExecSummary({ summary }) {
  if (!summary) return null;

  const rows = [
    { label: 'Status',          value: summary.success ? 'Success' : 'Failed',
      valueClass: summary.success ? 'exec-summary__value--ok' : 'exec-summary__value--err' },
    { label: 'Started',         value: fmtTime(summary.startTime) },
    { label: 'Finished',        value: fmtTime(summary.endTime) },
    { label: 'Duration',        value: fmtDuration(summary.startTime, summary.endTime) },
    { label: 'Nodes Executed',  value: summary.nodesExecuted ?? '—' },
    { label: 'Errors',          value: summary.nodesFailed ?? 0,
      valueClass: (summary.nodesFailed || 0) > 0 ? 'exec-summary__value--err' : '' },
  ];

  return (
    <div className="exec-summary">
      <div className="exec-summary__header">
        <span className="exec-summary__header-icon">
          {summary.success ? <IconCheck size={13} /> : <IconX size={13} />}
        </span>
        Execution Summary
      </div>
      <div className="exec-summary__rows">
        {rows.map(r => (
          <div key={r.label} className="exec-summary__row">
            <span className="exec-summary__label">{r.label}</span>
            <span className={`exec-summary__value ${r.valueClass || ''}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecutionConsole({ logs, onClear, summary }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="console" id="execution-console">
      <div className="console__output">
        {logs.length === 0 && !summary ? (
          <div className="console__empty">
            <IconTerminal size={24} />
            <span>Run a workflow to see output here.</span>
          </div>
        ) : (
          <>
            {logs.map((log, idx) => (
              <div key={idx} className="log-entry">
                <span className="log-entry__time">{log.timestamp}</span>
                <span className={`log-entry__level log-entry__level--${log.level}`}>
                  {log.level === 'SUCCESS' ? 'OK' : log.level}
                </span>
                <span className="log-entry__msg">{log.message}</span>
              </div>
            ))}
            <div ref={endRef} />
          </>
        )}
      </div>

      {summary && <ExecSummary summary={summary} />}
    </div>
  );
}
