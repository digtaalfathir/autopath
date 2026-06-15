import React from 'react';
import { getNodesByCategory } from '../nodeDefinitions';

/**
 * Left sidebar showing draggable node types grouped by category.
 */
export default function NodePalette() {
  const categories = getNodesByCategory();

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="node-palette" id="node-palette">
      <div className="node-palette__header">🧩 Node Palette</div>
      <div className="node-palette__list">
        {Object.entries(categories).map(([category, nodes]) => (
          <div key={category} className="node-palette__category">
            <div className="node-palette__category-title">{category}</div>
            {nodes.map((def) => (
              <div
                key={def.type}
                className="node-palette__item"
                id={`palette-node-${def.type}`}
                draggable
                onDragStart={(e) => onDragStart(e, def.type)}
              >
                <div
                  className="node-palette__item-icon"
                  style={{ background: `${def.color}18`, color: def.color }}
                >
                  {def.icon}
                </div>
                <div className="node-palette__item-info">
                  <span className="node-palette__item-label">{def.label}</span>
                  <span className="node-palette__item-desc">{def.description}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
