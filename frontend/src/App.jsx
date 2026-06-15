import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import WorkflowNode from './components/WorkflowNode';
import NodePalette from './components/NodePalette';
import PropertyPanel from './components/PropertyPanel';
import ExecutionConsole from './components/ExecutionConsole';
import { getNodeDefinition } from './nodeDefinitions';
import {
  LogoMark,
  IconFolderOpen, IconSave, IconDocument, IconSettings,
  IconPlay, IconStopSquare, IconTerminal, IconTrash,
  IconProperties, IconMinimize, IconMaximize, IconClose,
  IconPanelBottom, IconChevronUp, IconChevronDown,
} from './components/Icons';

const api = window.electronAPI || null;

const nodeTypes = { workflowNode: WorkflowNode };

let nodeIdCounter = 0;
function generateNodeId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

const defaultEdgeOptions = {
  animated: false,
  style: { stroke: '#9CA3AF', strokeWidth: 1.5 },
  type: 'smoothstep',
};

export default function App() {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [logs, setLogs] = useState([]);
  const [flowName, setFlowName] = useState('Untitled Workflow');
  const [engineStatus, setEngineStatus] = useState('idle');
  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState('output');
  const [execSummary, setExecSummary] = useState(null);
  const [bottomHeight, setBottomHeight] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  // Refs hold drag-start values so the mousemove closure is stale-closure-free
  const resizeDragRef = useRef({ startY: 0, startH: 220 });

  // ── Bottom panel resize (drag the top edge upward) ──────────
  const onPanelResizeStart = useCallback((e) => {
    if (!bottomOpen) return;
    e.preventDefault();
    resizeDragRef.current = { startY: e.clientY, startH: bottomHeight };
    setIsResizing(true);

    const onMouseMove = (ev) => {
      const delta = resizeDragRef.current.startY - ev.clientY; // up = positive
      const next  = Math.max(80, Math.min(window.innerHeight * 0.8, resizeDragRef.current.startH + delta));
      setBottomHeight(next);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  }, [bottomOpen, bottomHeight]);

  // Engine event listeners
  useEffect(() => {
    if (!api) return;
    const unsubLog = api.onEngineLog(log => setLogs(p => [...p, log]));
    const unsubStart = api.onNodeStart(id =>
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, status: 'running' } } : n))
    );
    const unsubComplete = api.onNodeComplete(id =>
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, status: 'completed' } } : n))
    );
    const unsubError = api.onNodeError(({ nodeId }) =>
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n))
    );
    return () => { unsubLog(); unsubStart(); unsubComplete(); unsubError(); };
  }, [setNodes]);

  const onConnect = useCallback(
    params => setEdges(eds => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_e, node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const onNodeUpdate = useCallback((nodeId, newData) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev);
  }, [setNodes]);

  const onDragOver = useCallback(e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('application/reactflow-type');
    if (!nodeType || !reactFlowInstance) return;
    const def = getNodeDefinition(nodeType);
    if (!def) return;

    const position = reactFlowInstance.screenToFlowPosition
      ? reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      : reactFlowInstance.project({
          x: e.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
          y: e.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
        });

    setNodes(nds => [
      ...nds,
      {
        id: generateNodeId(),
        type: 'workflowNode',
        position,
        data: { nodeType: def.type, label: def.label, ...def.defaults, status: '' },
      },
    ]);
  }, [reactFlowInstance, setNodes]);

  const onKeyDown = useCallback(e => {
    if (e.key === 'Delete' && selectedNode) {
      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
      setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const getFlowData = useCallback(() => {
    if (!reactFlowInstance) return null;
    const flow = reactFlowInstance.toObject();
    return { name: flowName, version: '1.0', nodes: flow.nodes, edges: flow.edges, viewport: flow.viewport };
  }, [reactFlowInstance, flowName]);

  const handleSave = useCallback(async () => {
    const data = getFlowData();
    if (!data) return;
    if (api) {
      const r = await api.saveFlow(flowName, data);
      if (r.success) addLog('SUCCESS', `Saved: ${r.path}`);
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${flowName}.json`; a.click();
      URL.revokeObjectURL(url);
    }
  }, [getFlowData, flowName]);

  const handleSaveAs = useCallback(async () => {
    const data = getFlowData();
    if (!data || !api) return;
    const r = await api.saveFlowAs(data);
    if (r.success) { setFlowName(r.name); addLog('SUCCESS', `Saved as: ${r.path}`); }
  }, [getFlowData]);

  const handleOpen = useCallback(async () => {
    if (api) {
      const r = await api.openFlow();
      if (r.success) {
        setFlowName(r.name);
        setNodes(r.data.nodes || []);
        setEdges(r.data.edges || []);
        if (r.data.viewport && reactFlowInstance) reactFlowInstance.setViewport(r.data.viewport);
        addLog('INFO', `Opened: ${r.name}`);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = async ev => {
        const file = ev.target.files[0];
        if (!file) return;
        const data = JSON.parse(await file.text());
        setFlowName(data.name || file.name.replace('.json', ''));
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      };
      input.click();
    }
  }, [reactFlowInstance, setNodes, setEdges]);

  const addLog = (level, message) => {
    setLogs(p => [...p, { level, message, timestamp: new Date().toISOString().substr(11, 8) }]);
  };

  const handleExecute = useCallback(async () => {
    const data = getFlowData();
    if (!data) return;
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: '' } })));
    setLogs([]);
    setExecSummary(null);
    setBottomOpen(true);
    setBottomTab('output');
    setEngineStatus('running');
    if (api) {
      const r = await api.executeFlow(data);
      setEngineStatus(r.success ? 'success' : 'error');
      if (r.metrics) setExecSummary({ ...r.metrics, success: r.success });
    } else {
      addLog('WARN', 'Running in browser mode — automation engine not available.');
      addLog('INFO', 'Launch in Electron to run workflows.');
      setEngineStatus('idle');
    }
  }, [getFlowData, setNodes]);

  const handleStop = useCallback(async () => {
    if (api) await api.stopFlow();
    setEngineStatus('idle');
  }, []);

  const minimapNodeColor = useCallback(node => {
    const def = getNodeDefinition(node.data?.nodeType);
    return def?.color || '#9CA3AF';
  }, []);

  const currentSelectedNode = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find(n => n.id === selectedNode.id) || null;
  }, [selectedNode, nodes]);

  const errorCount = logs.filter(l => l.level === 'ERROR').length;

  const statusLabel = {
    idle: 'Ready',
    running: 'Executing...',
    success: 'Completed',
    error: 'Error',
  }[engineStatus];

  return (
    <div className="app-container" onKeyDown={onKeyDown} tabIndex={0}>

      {/* ── Title Bar ────────────────────────────────────────── */}
      <header className="title-bar">
        <div className="title-bar__brand">
          <div className="title-bar__logo">
            <LogoMark size={20} />
          </div>
          <span className="title-bar__name">
            <em>Cyclone</em> Studio
          </span>
        </div>

        <div className="title-bar__divider" />
        <span className="title-bar__flow">{flowName}</span>

        <div className="title-bar__spacer" />

        <div className="title-bar__wincontrols">
          <button className="winctrl" onClick={() => api?.minimize()} title="Minimize">
            <IconMinimize size={11} />
          </button>
          <button className="winctrl" onClick={() => api?.maximize()} title="Maximize / Restore">
            <IconMaximize size={11} />
          </button>
          <button className="winctrl winctrl--close" onClick={() => api?.close()} title="Close">
            <IconClose size={11} />
          </button>
        </div>
      </header>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="toolbar" id="toolbar">
        <div className="toolbar__group">
          <button className="toolbar__btn" onClick={handleOpen} id="btn-open" title="Open workflow (Ctrl+O)">
            <IconFolderOpen size={14} /> Open
          </button>
          <button className="toolbar__btn" onClick={handleSave} id="btn-save" title="Save workflow (Ctrl+S)">
            <IconSave size={14} /> Save
          </button>
          {api && (
            <button className="toolbar__btn" onClick={handleSaveAs} id="btn-save-as" title="Save as new file">
              <IconDocument size={14} /> Save As
            </button>
          )}
        </div>

        <div className="toolbar__sep" />

        <div className="toolbar__group">
          <button
            className="toolbar__btn toolbar__btn--primary"
            onClick={handleExecute}
            disabled={engineStatus === 'running'}
            id="btn-execute"
            title="Run workflow (F5)"
          >
            <IconPlay size={13} /> Run
          </button>
          {engineStatus === 'running' && (
            <button
              className="toolbar__btn toolbar__btn--danger"
              onClick={handleStop}
              id="btn-stop"
              title="Stop execution"
            >
              <IconStopSquare size={13} /> Stop
            </button>
          )}
        </div>

        <div className="toolbar__sep" />

        <div className="toolbar__flow-info">
          <strong>{flowName}</strong>
          &nbsp;&mdash;&nbsp;
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}, {edges.length} {edges.length === 1 ? 'connection' : 'connections'}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button className="toolbar__btn" title="Settings">
            <IconSettings size={14} />
          </button>
        </div>
      </div>

      {/* ── Workspace ────────────────────────────────────────── */}
      <div className="workspace">
        {/* Left: Activity Palette */}
        <NodePalette />

        {/* Center: Canvas */}
        <div
          className="canvas-container"
          ref={reactFlowWrapper}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            deleteKeyCode="Delete"
            snapToGrid
            snapGrid={[16, 16]}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#D1D5DB"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={minimapNodeColor}
              maskColor="rgba(245,246,250,0.75)"
              style={{ background: '#FFFFFF' }}
            />

            {nodes.length === 0 && (
              <div className="canvas-hint">
                <div className="canvas-hint__icon">
                  <svg viewBox="0 0 48 48" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                    <rect x="8" y="8" width="14" height="12" rx="2" />
                    <rect x="26" y="8" width="14" height="12" rx="2" />
                    <rect x="17" y="28" width="14" height="12" rx="2" />
                    <path d="M15 20v4M33 20v4M15 24h18M24 24v4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="canvas-hint__title">No activities on the canvas</div>
                <div className="canvas-hint__sub">Drag activities from the left panel to build your workflow</div>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Right: Properties */}
        <aside className="sidebar-right" id="right-panel">
          <div className="sidebar-right__header">
            <IconProperties size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="sidebar-right__title">Properties</span>
          </div>
          <div className="sidebar-right__body">
            <PropertyPanel
              selectedNode={currentSelectedNode}
              onNodeUpdate={onNodeUpdate}
              nodes={nodes}
            />
          </div>
        </aside>
      </div>

      {/* ── Bottom Panel ─────────────────────────────────────── */}
      <div
        className={`bottom-panel ${!bottomOpen ? 'bottom-panel--collapsed' : ''} ${isResizing ? 'bottom-panel--resizing' : ''}`}
        style={{ height: bottomOpen ? bottomHeight : 32 }}
        id="bottom-panel"
      >
        {/* Drag handle — grab and pull up to expand */}
        <div
          className="bottom-panel__resize-handle"
          onMouseDown={onPanelResizeStart}
          title="Drag to resize"
        />
        <div className="bottom-panel__topbar">
          <div className="bottom-panel__tabs">
            <button
              className={`bottom-panel__tab ${bottomTab === 'output' ? 'bottom-panel__tab--active' : ''}`}
              onClick={() => { setBottomTab('output'); setBottomOpen(true); }}
            >
              <IconTerminal size={13} />
              Output
              {logs.length > 0 && (
                <span className="bottom-panel__tab-badge">{logs.length}</span>
              )}
            </button>
            <button
              className={`bottom-panel__tab ${bottomTab === 'errors' ? 'bottom-panel__tab--active' : ''}`}
              onClick={() => { setBottomTab('errors'); setBottomOpen(true); }}
            >
              Errors
              {errorCount > 0 && (
                <span className="bottom-panel__tab-badge" style={{ background: 'var(--clr-danger-light)', color: 'var(--clr-danger)' }}>
                  {errorCount}
                </span>
              )}
            </button>
          </div>

          <div className="bottom-panel__actions">
            {logs.length > 0 && (
              <button
                className="bottom-panel__action-btn"
                onClick={() => setLogs([])}
                title="Clear output"
              >
                <IconTrash size={13} />
              </button>
            )}
            <button
              className="bottom-panel__action-btn"
              onClick={() => setBottomOpen(o => !o)}
              title={bottomOpen ? 'Collapse panel' : 'Expand panel'}
            >
              {bottomOpen ? <IconChevronDown size={13} /> : <IconChevronUp size={13} />}
            </button>
          </div>
        </div>

        {bottomOpen && (
          <div className="bottom-panel__body">
            {bottomTab === 'output' && (
              <ExecutionConsole
                logs={logs}
                onClear={() => setLogs([])}
                summary={execSummary}
                onDismissSummary={() => setExecSummary(null)}
              />
            )}
            {bottomTab === 'errors' && (
              <ExecutionConsole
                logs={logs.filter(l => l.level === 'ERROR')}
                onClear={() => setLogs(p => p.filter(l => l.level !== 'ERROR'))}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Status Bar ───────────────────────────────────────── */}
      <footer className={`status-bar status-bar--${engineStatus}`}>
        <div className="status-bar__left">
          <div className="status-bar__item">
            <div className={`status-indicator status-indicator--${engineStatus}`} />
            {statusLabel}
          </div>
          <div className="status-bar__item">
            {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} &middot; {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
          </div>
        </div>
        <div className="status-bar__right">
          <span>Cyclone Studio v1.0</span>
        </div>
      </footer>
    </div>
  );
}
