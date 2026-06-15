import React, { useRef, useEffect } from 'react';

/**
 * Execution console showing realtime log output from the workflow engine.
 */
export default function ExecutionConsole({ logs, onClear }) {
  const logsEndRef = useRef(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="console" id="execution-console">
      <div className="console__header">
        <span className="console__title">Execution Log</span>
        {logs.length > 0 && (
          <button className="console__clear-btn" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <div className="console__logs">
        {logs.length === 0 ? (
          <div className="console__empty">
            <span className="console__empty-icon">📋</span>
            <span>Run a workflow to see<br />execution logs here</span>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="console__log-entry">
              <span className="console__log-time">{log.timestamp}</span>
              <span className={`console__log-level console__log-level--${log.level}`}>
                {log.level}
              </span>
              <span className="console__log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
