import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getNodeDefinition } from '../nodeDefinitions';

/**
 * Custom node component for React Flow.
 * Renders a styled node card with icon, title, and connection handles.
 */
function WorkflowNode({ data, selected }) {
  const def = getNodeDefinition(data.nodeType);
  if (!def) return null;

  const statusClass = data.status || '';

  // Build subtitle from key property values
  let subtitle = '';
  if (data.nodeType === 'navigateUrl' && data.url) {
    subtitle = data.url;
  } else if (data.nodeType === 'inputText' && data.selector) {
    subtitle = data.selector;
  } else if (data.nodeType === 'clickElement' && data.selector) {
    subtitle = data.selector;
  }

  return (
    <div className={`custom-node ${selected ? 'selected' : ''} ${statusClass}`}>
      {/* Status dot */}
      {statusClass && (
        <div
          className="custom-node__status"
          style={{
            background:
              statusClass === 'running'
                ? '#06b6d4'
                : statusClass === 'completed'
                ? '#10b981'
                : statusClass === 'error'
                ? '#ef4444'
                : 'transparent',
          }}
        />
      )}

      {/* Input handle */}
      {def.hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ top: -5 }}
        />
      )}

      {/* Node content */}
      <div className="custom-node__header">
        <div
          className="custom-node__icon"
          style={{ background: `${def.color}20`, color: def.color }}
        >
          {def.icon}
        </div>
        <div>
          <div className="custom-node__title">{data.label || def.label}</div>
          {subtitle && (
            <div className="custom-node__subtitle" title={subtitle}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Output handle */}
      {def.hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ bottom: -5 }}
        />
      )}
    </div>
  );
}

export default memo(WorkflowNode);
