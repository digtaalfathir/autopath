import React, { useState } from 'react';
import { getNodeDefinition } from '../nodeDefinitions';
import {
  IconGlobe, IconLink, IconType, IconMousePointer,
  IconPlay, IconStopSquare, IconProperties, IconCrosshair, IconSpinner,
} from './Icons';

const api = window.electronAPI || null;

function NodeIcon({ iconKey, size = 15 }) {
  switch (iconKey) {
    case 'globe': return <IconGlobe size={size} />;
    case 'link':  return <IconLink size={size} />;
    case 'type':  return <IconType size={size} />;
    case 'mouse': return <IconMousePointer size={size} />;
    case 'play':  return <IconPlay size={size} />;
    case 'stop':  return <IconStopSquare size={size} />;
    default:      return <IconProperties size={size} />;
  }
}

export default function PropertyPanel({ selectedNode, onNodeUpdate, nodes }) {
  const [picking, setPicking] = useState(false);
  const [pickingField, setPickingField] = useState(null);

  if (!selectedNode) {
    return (
      <div className="prop-empty">
        <div className="prop-empty__icon">
          <IconProperties size={36} />
        </div>
        <div className="prop-empty__text">
          Select a node on the canvas<br />to view and edit its properties.
        </div>
      </div>
    );
  }

  const def = getNodeDefinition(selectedNode.data?.nodeType);
  if (!def) return null;

  const handleChange = (key, value) => {
    onNodeUpdate(selectedNode.id, { ...selectedNode.data, [key]: value });
  };

  const findNavigateUrl = () => {
    if (!nodes) return null;
    const nav = nodes.find(n => n.data?.nodeType === 'navigateUrl' && n.data?.url);
    return nav?.data?.url || null;
  };

  const handlePickElement = async (fieldKey) => {
    if (!api?.pickElement) {
      alert('Element Picker is only available in Electron mode.\nRun: npm run dev');
      return;
    }
    const url = findNavigateUrl();
    if (!url) {
      alert('Add a "Navigate URL" node with a URL first so the\nElement Picker knows which page to open.');
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
      {/* Node type header */}
      <div className="prop-node-header">
        <div
          className="prop-node-header__icon"
          style={{ background: `${def.color}16`, color: def.color }}
        >
          <NodeIcon iconKey={def.iconKey} size={15} />
        </div>
        <div>
          <div className="prop-node-header__name">{def.label}</div>
          <div className="prop-node-header__desc">{def.description}</div>
        </div>
      </div>

      {/* Display label */}
      <div className="prop-section">
        <label className="prop-section__label">Display Label</label>
        <input
          id="property-label"
          className="prop-input"
          type="text"
          value={selectedNode.data?.label || ''}
          onChange={e => handleChange('label', e.target.value)}
          placeholder={def.label}
        />
      </div>

      {def.schema.length > 0 && <div className="prop-divider" />}

      {/* Schema fields */}
      {def.schema.map(field => (
        <div key={field.key} className="prop-section" style={{ marginBottom: 12 }}>
          <label className="prop-section__label">{field.label}</label>

          {field.type === 'boolean' ? (
            <>
              <div
                className="prop-checkbox-row"
                onClick={() => handleChange(field.key, !selectedNode.data?.[field.key])}
              >
                <input
                  id={`prop-${field.key}`}
                  type="checkbox"
                  checked={!!selectedNode.data?.[field.key]}
                  onChange={e => handleChange(field.key, e.target.checked)}
                  onClick={e => e.stopPropagation()}
                />
                <label htmlFor={`prop-${field.key}`}>
                  {selectedNode.data?.[field.key] ? 'Enabled' : 'Disabled'}
                </label>
              </div>
              {field.hint && <div className="prop-helper">{field.hint}</div>}
            </>
          ) : field.isSelector ? (
            <>
              <div className="prop-selector-row">
                <input
                  id={`prop-${field.key}`}
                  className="prop-input prop-input--mono"
                  type="text"
                  value={selectedNode.data?.[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || 'CSS selector...'}
                />
                <button
                  className={`prop-pick-btn ${picking && pickingField === field.key ? 'prop-pick-btn--active' : ''}`}
                  onClick={() => handlePickElement(field.key)}
                  disabled={picking}
                  id={`pick-${field.key}`}
                  title="Open browser and click an element to capture its selector"
                >
                  {picking && pickingField === field.key ? (
                    <IconSpinner size={13} />
                  ) : (
                    <IconCrosshair size={13} />
                  )}
                  {picking && pickingField === field.key ? 'Picking...' : 'Pick'}
                </button>
              </div>
              <div className="prop-helper">
                Type a CSS selector manually or click Pick to select from the browser.
              </div>
            </>
          ) : (
            <input
              id={`prop-${field.key}`}
              className="prop-input"
              type="text"
              value={selectedNode.data?.[field.key] || ''}
              onChange={e => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
            />
          )}
        </div>
      ))}

      {/* Picker active status */}
      {picking && (
        <div className="prop-picker-banner">
          <div className="prop-picker-banner__icon">
            <IconCrosshair size={16} />
          </div>
          <div>
            <div className="prop-picker-banner__title">Element Picker Active</div>
            <div className="prop-picker-banner__text">
              Switch to the browser window and click an element.<br />
              Press ESC to cancel.
            </div>
          </div>
        </div>
      )}

      <div className="prop-divider" style={{ marginTop: 20 }} />

      {/* Node ID (read-only) */}
      <div className="prop-section">
        <label className="prop-section__label" style={{ opacity: 0.55 }}>Node ID</label>
        <input
          className="prop-input prop-readonly"
          type="text"
          value={selectedNode.id}
          readOnly
        />
      </div>
    </div>
  );
}
