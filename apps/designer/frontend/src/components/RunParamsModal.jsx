import React, { useState } from 'react';

export default function RunParamsModal({ onClose, onRun }) {
  const [rows, setRows] = useState([{ key: '', value: '' }]);

  const addRow = () => setRows(r => [...r, { key: '', value: '' }]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleRun = () => {
    const vars = {};
    for (const { key, value } of rows) {
      if (key.trim()) vars[key.trim()] = value;
    }
    onRun(vars);
  };

  return (
    <div className="hist-overlay" onClick={onClose}>
      <div className="rp-dialog" onClick={e => e.stopPropagation()}>
        <div className="pub-dialog__title">Run with Parameters</div>
        <div className="rp-dialog__sub">
          Set initial variables before the workflow starts. These values override any SetVariable nodes with the same name.
        </div>

        <div className="rp-table">
          <div className="rp-table__header">
            <span>Variable Name</span>
            <span>Initial Value</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="rp-table__row">
              <input
                className="rp-input"
                placeholder="variableName"
                value={row.key}
                onChange={e => updateRow(i, 'key', e.target.value)}
              />
              <input
                className="rp-input"
                placeholder="value"
                value={row.value}
                onChange={e => updateRow(i, 'value', e.target.value)}
              />
              <button
                className="rp-remove"
                onClick={() => removeRow(i)}
                title="Remove row"
                disabled={rows.length === 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button className="rp-add" onClick={addRow}>+ Add Variable</button>

        <div className="pub-dialog__actions">
          <button className="pub-dialog__btn" onClick={onClose}>Cancel</button>
          <button className="pub-dialog__btn pub-dialog__btn--primary" onClick={handleRun}>
            ▶ Run
          </button>
        </div>
      </div>
    </div>
  );
}
