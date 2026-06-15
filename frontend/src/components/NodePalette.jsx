import React, { useState } from 'react';
import { getNodesByCategory } from '../nodeDefinitions';
import {
  IconSearch, IconChevronRight, IconChevronDown,
  IconGlobe, IconLink, IconType, IconMousePointer,
  IconPlay, IconStopSquare,
} from './Icons';

function NodeIcon({ iconKey, size = 14 }) {
  switch (iconKey) {
    case 'globe': return <IconGlobe size={size} />;
    case 'link':  return <IconLink size={size} />;
    case 'type':  return <IconType size={size} />;
    case 'mouse': return <IconMousePointer size={size} />;
    case 'play':  return <IconPlay size={size} />;
    case 'stop':  return <IconStopSquare size={size} />;
    default:      return null;
  }
}

function PaletteCategory({ category, nodes, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  const onDragStart = (e, nodeType) => {
    e.dataTransfer.setData('application/reactflow-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="palette-category">
      <div
        className="palette-category__header"
        onClick={() => setOpen(o => !o)}
        title={open ? 'Collapse' : 'Expand'}
      >
        <span
          className={`palette-category__chevron ${open ? 'palette-category__chevron--open' : ''}`}
        >
          <IconChevronRight size={12} />
        </span>
        {category}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
          {nodes.length}
        </span>
      </div>

      {open && (
        <div className="palette-category__items">
          {nodes.map(def => (
            <div
              key={def.type}
              className="palette-item"
              id={`palette-${def.type}`}
              draggable
              onDragStart={e => onDragStart(e, def.type)}
              title={`${def.label} — ${def.description}\nDrag to canvas to add`}
            >
              <div
                className="palette-item__icon"
                style={{ background: `${def.color}15`, color: def.color }}
              >
                <NodeIcon iconKey={def.iconKey} size={14} />
              </div>
              <div className="palette-item__text">
                <span className="palette-item__label">{def.label}</span>
                <span className="palette-item__desc">{def.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NodePalette() {
  const [query, setQuery] = useState('');
  const allCategories = getNodesByCategory();

  // Filter nodes by search query
  const filteredCategories = {};
  for (const [cat, nodes] of Object.entries(allCategories)) {
    const filtered = nodes.filter(
      n =>
        !query ||
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        n.description.toLowerCase().includes(query.toLowerCase())
    );
    if (filtered.length > 0) filteredCategories[cat] = filtered;
  }

  return (
    <aside className="sidebar-left" id="node-palette">
      <div className="sidebar-left__header">
        <span className="sidebar-left__title">Activities</span>
      </div>

      <div className="sidebar-left__search">
        <IconSearch size={13} />
        <input
          type="text"
          placeholder="Search activities..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="sidebar-left__list">
        {Object.entries(filteredCategories).map(([cat, nodes]) => (
          <PaletteCategory
            key={cat}
            category={cat}
            nodes={nodes}
            defaultOpen
          />
        ))}

        {Object.keys(filteredCategories).length === 0 && (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No activities match "{query}"
          </div>
        )}
      </div>
    </aside>
  );
}
