import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getNodeDefinition } from '../nodeDefinitions';
import {
  IconGlobe, IconLink, IconType, IconMousePointer,
  IconPlay, IconStopSquare, IconCheck, IconX, IconSpinner,
} from './Icons';

function NodeIcon({ iconKey, size = 15 }) {
  switch (iconKey) {
    case 'globe': return <IconGlobe size={size} />;
    case 'link':  return <IconLink size={size} />;
    case 'type':  return <IconType size={size} />;
    case 'mouse': return <IconMousePointer size={size} />;
    case 'play':  return <IconPlay size={size} />;
    case 'stop':  return <IconStopSquare size={size} />;
    default:      return <span style={{ fontSize: size * 0.85 }}>•</span>;
  }
}

function StatusBadge({ status }) {
  if (!status) return null;

  if (status === 'running') {
    return (
      <div className="workflow-node__status workflow-node__status--running">
        <IconSpinner size={11} />
      </div>
    );
  }
  if (status === 'completed') {
    return (
      <div className="workflow-node__status workflow-node__status--completed">
        <IconCheck size={10} />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="workflow-node__status workflow-node__status--error">
        <IconX size={9} />
      </div>
    );
  }
  return null;
}

function WorkflowNode({ data, selected }) {
  const def = getNodeDefinition(data.nodeType);
  if (!def) return null;

  const status = data.status || '';

  let subtitle = '';
  if (data.nodeType === 'navigateUrl' && data.url) subtitle = data.url;
  else if (data.nodeType === 'inputText' && data.selector) subtitle = data.selector;
  else if (data.nodeType === 'clickElement' && data.selector) subtitle = data.selector;

  const nodeColor = def.color;

  return (
    <div
      className={`workflow-node ${selected ? 'selected' : ''} ${status}`}
      style={{ '--node-color': nodeColor }}
    >
      {def.hasInput && (
        <Handle type="target" position={Position.Top} style={{ top: -5 }} />
      )}

      <StatusBadge status={status} />

      <div className="workflow-node__body">
        <div
          className="workflow-node__icon"
          style={{
            background: `${nodeColor}18`,
            color: nodeColor,
          }}
        >
          <NodeIcon iconKey={def.iconKey} size={14} />
        </div>
        <div className="workflow-node__text">
          <div className="workflow-node__title">{data.label || def.label}</div>
          {subtitle && (
            <div className="workflow-node__subtitle" title={subtitle}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {def.hasOutput && (
        <Handle type="source" position={Position.Bottom} style={{ bottom: -5 }} />
      )}
    </div>
  );
}

export default memo(WorkflowNode);
