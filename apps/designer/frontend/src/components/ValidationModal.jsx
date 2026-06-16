import React from 'react';

export default function ValidationModal({ result, onClose, onRunAnyway }) {
  const { errors, warnings } = result;
  const hasErrors   = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="hist-overlay" onClick={onClose}>
      <div className="val-dialog" onClick={e => e.stopPropagation()}>
        <div className="val-dialog__title">
          {hasErrors ? '⛔ Workflow has errors' : '⚠ Workflow has warnings'}
        </div>

        {hasErrors && (
          <div className="val-section">
            <div className="val-section__label val-section__label--error">Errors (must fix before running)</div>
            <ul className="val-list val-list--error">
              {errors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </div>
        )}

        {hasWarnings && (
          <div className="val-section">
            <div className="val-section__label val-section__label--warn">Warnings</div>
            <ul className="val-list val-list--warn">
              {warnings.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </div>
        )}

        <div className="val-dialog__actions">
          <button className="pub-dialog__btn" onClick={onClose}>
            Fix Issues
          </button>
          {!hasErrors && (
            <button className="pub-dialog__btn pub-dialog__btn--primary" onClick={onRunAnyway}>
              Run Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
