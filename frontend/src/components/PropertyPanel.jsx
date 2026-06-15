import React, { useState } from 'react';
import { getNodeDefinition } from '../nodeDefinitions';

const api = window.electronAPI || null;

/**
 * Property editor panel for the selected node.
 * Renders form fields based on the node's schema definition.
 * Includes 🎯 Element Picker button for selector fields.
 */
export default function PropertyPanel({ selectedNode, onNodeUpdate, nodes }) {
  const [picking, setPicking] = useState(false);
  const [pickingField, setPickingField] = useState(null);

  if (!selectedNode) {
    return (
      <div className="property-editor__empty">
        <div className="property-editor__empty-icon">🔧</div>
        <div className="property-editor__empty-text">
          Select a node on the canvas<br />to edit its properties
        </div>
      </div>
    );
  }

  const def = getNodeDefinition(selectedNode.data?.nodeType);
  if (!def) return null;

  const handleChange = (key, value) => {
    onNodeUpdate(selectedNode.id, {
      ...selectedNode.data,
      [key]: value,
    });
  };

  /**
   * Find the Navigate URL node's URL from the workflow.
   * Looks through all nodes for a navigateUrl type.
   */
  const findNavigateUrl = () => {
    if (!nodes) return null;
    const navNode = nodes.find(n => n.data?.nodeType === 'navigateUrl' && n.data?.url);
    return navNode?.data?.url || null;
  };

  /**
   * Launch element picker for a selector field.
   * Opens browser at the Navigate URL, user clicks element,
   * selector auto-fills into the field.
   */
  const handlePickElement = async (fieldKey) => {
    if (!api?.pickElement) {
      alert('Element Picker hanya tersedia di mode Electron.\nJalankan dengan: npm run dev');
      return;
    }

    const url = findNavigateUrl();
    if (!url) {
      alert('Tambahkan node "Navigate URL" dengan URL terlebih dahulu\nagar Element Picker tahu halaman mana yang dibuka.');
      return;
    }

    setPicking(true);
    setPickingField(fieldKey);

    try {
      const result = await api.pickElement(url);

      if (result.success && result.selector) {
        handleChange(fieldKey, result.selector);
      }
    } catch (err) {
      console.error('Picker error:', err);
    } finally {
      setPicking(false);
      setPickingField(null);
    }
  };

  return (
    <div className="property-editor" id="property-editor">
      {/* Node header */}
      <div className="property-editor__node-header">
        <div
          className="property-editor__node-icon"
          style={{ background: `${def.color}20`, color: def.color }}
        >
          {def.icon}
        </div>
        <div className="property-editor__node-info">
          <h3>{def.label}</h3>
          <p>{def.description}</p>
        </div>
      </div>

      {/* Node label */}
      <div className="property-editor__field">
        <label className="property-editor__label">Display Label</label>
        <input
          id="property-label"
          className="property-editor__input"
          type="text"
          value={selectedNode.data?.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder={def.label}
        />
      </div>

      {/* Schema fields */}
      {def.schema.map((field) => (
        <div key={field.key} className="property-editor__field">
          <label className="property-editor__label">{field.label}</label>
          {field.type === 'boolean' ? (
            <div
              className="property-editor__checkbox-wrapper"
              onClick={() =>
                handleChange(field.key, !selectedNode.data?.[field.key])
              }
            >
              <input
                id={`property-${field.key}`}
                className="property-editor__checkbox"
                type="checkbox"
                checked={!!selectedNode.data?.[field.key]}
                onChange={(e) => handleChange(field.key, e.target.checked)}
              />
              <span className="property-editor__checkbox-label">
                {selectedNode.data?.[field.key] ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ) : field.isSelector ? (
            /* ── Selector field with Pick button ──────────── */
            <div className="property-editor__selector-group">
              <input
                id={`property-${field.key}`}
                className="property-editor__input property-editor__input--selector"
                type="text"
                value={selectedNode.data?.[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
              />
              <button
                className={`property-editor__pick-btn ${picking && pickingField === field.key ? 'property-editor__pick-btn--active' : ''}`}
                onClick={() => handlePickElement(field.key)}
                disabled={picking}
                title="🎯 Klik untuk memilih elemen langsung di halaman web"
                id={`pick-${field.key}`}
              >
                {picking && pickingField === field.key ? (
                  <span className="property-editor__pick-spinner">⟳</span>
                ) : (
                  '🎯'
                )}
              </button>
            </div>
          ) : (
            <input
              id={`property-${field.key}`}
              className="property-editor__input"
              type="text"
              value={selectedNode.data?.[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
            />
          )}

          {/* Helper text for selector fields */}
          {field.isSelector && (
            <div className="property-editor__helper">
              Ketik manual atau klik 🎯 untuk pilih dari halaman web
            </div>
          )}
        </div>
      ))}

      {/* Picker status banner */}
      {picking && (
        <div className="property-editor__picker-status">
          <div className="property-editor__picker-status-icon">🎯</div>
          <div>
            <div className="property-editor__picker-status-title">Element Picker Aktif</div>
            <div className="property-editor__picker-status-text">
              Klik elemen di halaman browser yang terbuka.<br />
              Tekan ESC untuk batal.
            </div>
          </div>
        </div>
      )}

      {/* Node ID (read-only) */}
      <div className="property-editor__field" style={{ marginTop: 24 }}>
        <label className="property-editor__label" style={{ opacity: 0.5 }}>Node ID</label>
        <input
          className="property-editor__input"
          type="text"
          value={selectedNode.id}
          readOnly
          style={{ opacity: 0.4, cursor: 'default' }}
        />
      </div>
    </div>
  );
}
