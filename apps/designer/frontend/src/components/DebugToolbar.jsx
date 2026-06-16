import React from 'react';

export default function DebugToolbar({ debugState, onResume, onStep, onStop }) {
  if (!debugState) return null;

  const { nodeName, variables } = debugState;
  const varEntries = Object.entries(variables || {});

  return (
    <div className="debug-toolbar">
      <div className="debug-toolbar__header">
        <span className="debug-toolbar__badge">⏸ PAUSED</span>
        <span className="debug-toolbar__node">at &quot;{nodeName}&quot;</span>
      </div>

      {varEntries.length > 0 && (
        <div className="debug-toolbar__vars">
          <div className="debug-toolbar__vars-title">Variables</div>
          <div className="debug-toolbar__vars-list">
            {varEntries.map(([k, v]) => (
              <div key={k} className="debug-toolbar__var-row">
                <span className="debug-toolbar__var-key">{k}</span>
                <span className="debug-toolbar__var-sep">:</span>
                <span className="debug-toolbar__var-val">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {varEntries.length === 0 && (
        <div className="debug-toolbar__no-vars">No variables set yet</div>
      )}

      <div className="debug-toolbar__actions">
        <button className="debug-toolbar__btn debug-toolbar__btn--resume" onClick={onResume} title="Resume execution (F8)">
          ▶ Resume
        </button>
        <button className="debug-toolbar__btn debug-toolbar__btn--step" onClick={onStep} title="Step to next node (F10)">
          ⏭ Step
        </button>
        <button className="debug-toolbar__btn debug-toolbar__btn--stop" onClick={onStop} title="Stop execution">
          ⏹ Stop
        </button>
      </div>
    </div>
  );
}
