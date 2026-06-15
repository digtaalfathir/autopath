import React, { useRef, useEffect } from 'react';
import { IconTerminal, IconCheck, IconX } from './Icons';

function fmtTime(ms) {
  if (ms == null) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(startMs, endMs) {
  if (!startMs || !endMs) return '—';
  const sec = ((endMs - startMs) / 1000).toFixed(2);
  return `${sec}s`;
}

// Compact one-line summary bar shown at the top of the console
function ExecSummary({ summary, onDismiss }) {
  if (!summary) return null;
  const ok      = summary.success;
  const dur     = fmtDuration(summary.startTime, summary.endTime);
  const errors  = summary.nodesFailed ?? 0;
  const started = fmtTime(summary.startTime);

  return (
    <div className={`exec-summary-bar ${ok ? 'exec-summary-bar--ok' : 'exec-summary-bar--err'}`}>
      <span className="exec-summary-bar__icon">
        {ok ? <IconCheck size={11} /> : <IconX size={11} />}
      </span>
      <span className="exec-summary-bar__status">{ok ? 'Completed' : 'Failed'}</span>
      <span className="exec-summary-bar__sep">·</span>
      <span className="exec-summary-bar__item">{started}</span>
      <span className="exec-summary-bar__sep">·</span>
      <span className="exec-summary-bar__item">{dur}</span>
      <span className="exec-summary-bar__sep">·</span>
      <span className="exec-summary-bar__item">{summary.nodesExecuted ?? 0} nodes</span>
      {errors > 0 && (
        <>
          <span className="exec-summary-bar__sep">·</span>
          <span className="exec-summary-bar__item exec-summary-bar__item--err">
            {errors} error{errors !== 1 ? 's' : ''}
          </span>
        </>
      )}
      <button
        className="exec-summary-bar__dismiss"
        onClick={onDismiss}
        title="Dismiss summary"
      >
        ×
      </button>
    </div>
  );
}

export default function ExecutionConsole({ logs, onClear, summary, onDismissSummary }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="console" id="execution-console">
      {/* Summary bar always stays at top — never covers logs */}
      {summary && (
        <ExecSummary summary={summary} onDismiss={onDismissSummary} />
      )}

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
    </div>
  );
}
