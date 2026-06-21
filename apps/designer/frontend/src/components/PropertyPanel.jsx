import React, { useState } from 'react';
import { getNodeDefinition } from '../nodeDefinitions';
import {
  IconGlobe, IconLink, IconType, IconMousePointer,
  IconPlay, IconStopSquare, IconProperties, IconCrosshair, IconSpinner,
  IconVariable, IconClock, IconAPI, IconLog,
  IconCondition, IconLoop, IconShield,
  IconWaitUrl, IconWaitEl, IconWaitLoad,
  IconGetUrl, IconGetText, IconExists,
  IconJsonParse, IconStrReplace, IconStrContains, IconDateTime, IconArrLength,
  IconReadFile, IconWriteFile, IconMoveFile, IconDeleteFile, IconFileExists,
  IconCreateDir, IconDirExists,
  IconExcelOpen, IconExcelReadCell, IconExcelWriteCell,
  IconExcelReadRange, IconExcelSave, IconExcelClose,
  IconDbConnect, IconDbQuery, IconDbExecute, IconDbDisconnect,
} from './Icons';

const api = window.electronAPI || null;

function NodeIcon({ iconKey, size = 15 }) {
  switch (iconKey) {
    case 'globe':     return <IconGlobe size={size} />;
    case 'link':      return <IconLink size={size} />;
    case 'type':      return <IconType size={size} />;
    case 'mouse':     return <IconMousePointer size={size} />;
    case 'play':      return <IconPlay size={size} />;
    case 'stop':      return <IconStopSquare size={size} />;
    case 'variable':  return <IconVariable size={size} />;
    case 'clock':     return <IconClock size={size} />;
    case 'api':       return <IconAPI size={size} />;
    case 'log':       return <IconLog size={size} />;
    case 'condition': return <IconCondition size={size} />;
    case 'loop':      return <IconLoop size={size} />;
    case 'shield':    return <IconShield size={size} />;
    case 'waitUrl':   return <IconWaitUrl size={size} />;
    case 'waitEl':    return <IconWaitEl size={size} />;
    case 'waitLoad':  return <IconWaitLoad size={size} />;
    case 'getUrl':    return <IconGetUrl size={size} />;
    case 'getText':   return <IconGetText size={size} />;
    case 'exists':      return <IconExists size={size} />;
    case 'jsonParse':   return <IconJsonParse size={size} />;
    case 'strReplace':  return <IconStrReplace size={size} />;
    case 'strContains': return <IconStrContains size={size} />;
    case 'dateTime':    return <IconDateTime size={size} />;
    case 'arrLength':   return <IconArrLength size={size} />;
    case 'readFile':    return <IconReadFile size={size} />;
    case 'writeFile':   return <IconWriteFile size={size} />;
    case 'moveFile':    return <IconMoveFile size={size} />;
    case 'deleteFile':  return <IconDeleteFile size={size} />;
    case 'fileExists':  return <IconFileExists size={size} />;
    case 'createDir':   return <IconCreateDir size={size} />;
    case 'dirExists':      return <IconDirExists size={size} />;
    case 'excelOpen':      return <IconExcelOpen size={size} />;
    case 'excelReadCell':  return <IconExcelReadCell size={size} />;
    case 'excelWriteCell': return <IconExcelWriteCell size={size} />;
    case 'excelReadRange': return <IconExcelReadRange size={size} />;
    case 'excelSave':      return <IconExcelSave size={size} />;
    case 'excelClose':     return <IconExcelClose size={size} />;
    case 'dbConnect':      return <IconDbConnect size={size} />;
    case 'dbQuery':        return <IconDbQuery size={size} />;
    case 'dbExecute':      return <IconDbExecute size={size} />;
    case 'dbDisconnect':   return <IconDbDisconnect size={size} />;
    default:               return <IconProperties size={size} />;
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

    // URL is optional: used only when launching a brand-new browser for the
    // first time. If the singleton browser is already open it is ignored —
    // the picker attaches to whatever page is currently active.
    const url = findNavigateUrl() || null;

    setPicking(true);
    setPickingField(fieldKey);
    try {
      const result = await api.pickElement(url);
      if (result.success && result.selector) {
        handleChange(fieldKey, result.selector);
        // Resilient selectors: store fallbacks captured by the picker so the
        // engine can recover if the primary selector breaks on a UI change.
        if (fieldKey === 'selector' && Array.isArray(result.fallbacks)) {
          handleChange('selectorFallbacks', result.fallbacks);
        }
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
          ) : field.type === 'textarea' ? (
            <>
              <textarea
                id={`prop-${field.key}`}
                className="prop-textarea"
                value={selectedNode.data?.[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                rows={4}
                spellCheck={false}
              />
              {field.hint && <div className="prop-helper">{field.hint}</div>}
            </>
          ) : field.type === 'select' ? (
            <>
              <select
                id={`prop-${field.key}`}
                className="prop-input"
                value={selectedNode.data?.[field.key] ?? (field.options?.[0] || '')}
                onChange={e => handleChange(field.key, e.target.value)}
              >
                {(field.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
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
            <>
              <input
                id={`prop-${field.key}`}
                className="prop-input"
                type="text"
                value={selectedNode.data?.[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
              />
              {field.hint && <div className="prop-helper">{field.hint}</div>}
            </>
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
