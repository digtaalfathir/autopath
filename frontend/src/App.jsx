import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';

import WorkflowNode from './components/WorkflowNode';
import NodePalette from './components/NodePalette';
import PropertyPanel from './components/PropertyPanel';
import ExecutionConsole from './components/ExecutionConsole';
import { getNodeDefinition, NODE_DEFINITIONS } from './nodeDefinitions';

// API bridge — in Electron we use window.electronAPI, in browser we mock it
const api = window.electronAPI || null;

// Custom node types registry
const nodeTypes = {
  workflowNode: WorkflowNode,
};

let nodeIdCounter = 0;
function generateNodeId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

// ── Default edge options ──────────────────────────────────────
const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#6c5ce7', strokeWidth: 2.5 },
  type: 'smoothstep',
};

export default function App() {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [rightTab, setRightTab] = useState('properties'); // 'properties' | 'console'
  const [logs, setLogs] = useState([]);
  const [flowName, setFlowName] = useState('Untitled Workflow');
  const [engineStatus, setEngineStatus] = useState('idle'); // idle | running | success | error

  // ── Register engine event listeners ───────────────────────
  useEffect(() => {
    if (!api) return;

    const unsubLog = api.onEngineLog((log) => {
      setLogs((prev) => [...prev, log]);
    });

    const unsubNodeStart = api.onNodeStart((nodeId) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: 'running' } }
            : n
        )
      );
    });

    const unsubNodeComplete = api.onNodeComplete((nodeId) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: 'completed' } }
            : n
        )
      );
    });

    const unsubNodeError = api.onNodeError(({ nodeId }) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: 'error' } }
            : n
        )
      );
    });

    return () => {
      unsubLog();
      unsubNodeStart();
      unsubNodeComplete();
      unsubNodeError();
    };
  }, [setNodes]);

  // ── Edge connection ───────────────────────────────────────
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
    },
    [setEdges]
  );

  // ── Node selection ────────────────────────────────────────
  const onNodeClick = useCallback(
    (_event, node) => {
      setSelectedNode(node);
      setRightTab('properties');
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ── Update node data from property panel ──────────────────
  const onNodeUpdate = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
        )
      );
      // Update selected node reference
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...newData } }
          : prev
      );
    },
    [setNodes]
  );

  // ── Drag & Drop from palette ──────────────────────────────
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow-type');
      if (!nodeType || !reactFlowInstance) return;

      const def = getNodeDefinition(nodeType);
      if (!def) return;

      const position = reactFlowInstance.screenToFlowPosition
        ? reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
        : reactFlowInstance.project({
            x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
            y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
          });

      const newNode = {
        id: generateNodeId(),
        type: 'workflowNode',
        position,
        data: {
          nodeType: def.type,
          label: def.label,
          ...def.defaults,
          status: '',
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  // ── Keyboard shortcuts (Delete node) ──────────────────────
  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Delete' && selectedNode) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) =>
          eds.filter(
            (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
          )
        );
        setSelectedNode(null);
      }
    },
    [selectedNode, setNodes, setEdges]
  );

  // ── Get flow data for save/execute ────────────────────────
  const getFlowData = useCallback(() => {
    if (!reactFlowInstance) return null;
    const flow = reactFlowInstance.toObject();
    return {
      name: flowName,
      version: '1.0',
      createdAt: new Date().toISOString(),
      nodes: flow.nodes,
      edges: flow.edges,
      viewport: flow.viewport,
    };
  }, [reactFlowInstance, flowName]);

  // ── Save workflow ─────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const data = getFlowData();
    if (!data) return;

    if (api) {
      const result = await api.saveFlow(flowName, data);
      if (result.success) {
        setLogs((prev) => [
          ...prev,
          {
            level: 'SUCCESS',
            message: `Workflow saved: ${result.path}`,
            timestamp: new Date().toISOString().substr(11, 12),
          },
        ]);
      }
    } else {
      // Browser fallback: download JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${flowName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [getFlowData, flowName]);

  // ── Save As ───────────────────────────────────────────────
  const handleSaveAs = useCallback(async () => {
    const data = getFlowData();
    if (!data || !api) return;

    const result = await api.saveFlowAs(data);
    if (result.success) {
      setFlowName(result.name);
      setLogs((prev) => [
        ...prev,
        {
          level: 'SUCCESS',
          message: `Workflow saved as: ${result.path}`,
          timestamp: new Date().toISOString().substr(11, 12),
        },
      ]);
    }
  }, [getFlowData]);

  // ── Open workflow ─────────────────────────────────────────
  const handleOpen = useCallback(async () => {
    if (api) {
      const result = await api.openFlow();
      if (result.success) {
        const { data, name } = result;
        setFlowName(name);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        if (data.viewport && reactFlowInstance) {
          reactFlowInstance.setViewport(data.viewport);
        }
        setLogs((prev) => [
          ...prev,
          {
            level: 'INFO',
            message: `Opened workflow: ${name}`,
            timestamp: new Date().toISOString().substr(11, 12),
          },
        ]);
      }
    } else {
      // Browser fallback: file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const data = JSON.parse(text);
        setFlowName(data.name || file.name.replace('.json', ''));
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      };
      input.click();
    }
  }, [reactFlowInstance, setNodes, setEdges]);

  // ── Execute workflow ──────────────────────────────────────
  const handleExecute = useCallback(async () => {
    const data = getFlowData();
    if (!data) return;

    // Clear previous statuses
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, status: '' } }))
    );
    setLogs([]);
    setRightTab('console');
    setEngineStatus('running');

    if (api) {
      const result = await api.executeFlow(data);
      setEngineStatus(result.success ? 'success' : 'error');
    } else {
      // Simulate execution in browser mode
      setLogs([
        { level: 'WARN', message: 'Running in browser mode — Playwright not available', timestamp: new Date().toISOString().substr(11, 12) },
        { level: 'INFO', message: 'To execute workflows, run the app in Electron', timestamp: new Date().toISOString().substr(11, 12) },
      ]);
      setEngineStatus('idle');
    }
  }, [getFlowData, setNodes]);

  // ── Stop execution ────────────────────────────────────────
  const handleStop = useCallback(async () => {
    if (api) {
      await api.stopFlow();
    }
    setEngineStatus('idle');
  }, []);

  // ── Clear logs ────────────────────────────────────────────
  const handleClearLogs = useCallback(() => setLogs([]), []);

  // ── Minimap node color ────────────────────────────────────
  const minimapNodeColor = useCallback((node) => {
    const def = getNodeDefinition(node.data?.nodeType);
    return def?.color || '#555';
  }, []);

  // ── Memoized selected node (sync with nodes state) ────────
  const currentSelectedNode = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find((n) => n.id === selectedNode.id) || null;
  }, [selectedNode, nodes]);

  return (
    <div className="app-container" onKeyDown={onKeyDown} tabIndex={0}>
      {/* ── Title Bar ──────────────────────────────────────── */}
      <header className="title-bar">
        <div className="title-bar__brand">
          <div className="title-bar__logo">C</div>
          <div className="title-bar__title">
            <span>Cyclone</span> LokalPride
          </div>
        </div>
        <div className="title-bar__actions">
          <button
            className="title-bar__btn"
            onClick={() => api?.minimize()}
            title="Minimize"
          >
            ─
          </button>
          <button
            className="title-bar__btn"
            onClick={() => api?.maximize()}
            title="Maximize"
          >
            □
          </button>
          <button
            className="title-bar__btn title-bar__btn--close"
            onClick={() => api?.close()}
            title="Close"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="toolbar" id="toolbar">
        <div className="toolbar__group">
          <button className="toolbar__btn" onClick={handleOpen} id="btn-open">
            📂 Open
          </button>
          <button className="toolbar__btn" onClick={handleSave} id="btn-save">
            💾 Save
          </button>
          {api && (
            <button className="toolbar__btn" onClick={handleSaveAs} id="btn-save-as">
              📄 Save As
            </button>
          )}
        </div>

        <div className="toolbar__separator" />

        <div className="toolbar__group">
          <button
            className="toolbar__btn toolbar__btn--primary"
            onClick={handleExecute}
            disabled={engineStatus === 'running'}
            id="btn-execute"
          >
            ▶ Run
          </button>
          {engineStatus === 'running' && (
            <button
              className="toolbar__btn toolbar__btn--danger"
              onClick={handleStop}
              id="btn-stop"
            >
              ⏹ Stop
            </button>
          )}
        </div>

        <div className="toolbar__separator" />

        <span className="toolbar__flow-name">
          {flowName} <span>({nodes.length} nodes)</span>
        </span>
      </div>

      {/* ── Main Content ───────────────────────────────────── */}
      <div className="main-content">
        {/* Left: Node Palette */}
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
              variant="dots"
              gap={20}
              size={1.2}
              color="rgba(255,255,255,0.04)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={minimapNodeColor}
              maskColor="rgba(0,0,0,0.7)"
              style={{ background: '#0d0d16' }}
            />

            {/* Empty state hint */}
            {nodes.length === 0 && (
              <div className="drop-indicator">
                <span className="drop-indicator__icon">🎯</span>
                Drag nodes from the palette<br />and drop them here
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Right: Properties / Console */}
        <div className="right-panel" id="right-panel">
          <div className="right-panel__tabs">
            <button
              className={`right-panel__tab ${rightTab === 'properties' ? 'right-panel__tab--active' : ''}`}
              onClick={() => setRightTab('properties')}
            >
              🔧 Properties
            </button>
            <button
              className={`right-panel__tab ${rightTab === 'console' ? 'right-panel__tab--active' : ''}`}
              onClick={() => setRightTab('console')}
            >
              📋 Console {logs.length > 0 && `(${logs.length})`}
            </button>
          </div>
          <div className="right-panel__content">
            {rightTab === 'properties' ? (
              <PropertyPanel
                selectedNode={currentSelectedNode}
                onNodeUpdate={onNodeUpdate}
                nodes={nodes}
              />
            ) : (
              <ExecutionConsole logs={logs} onClear={handleClearLogs} />
            )}
          </div>
        </div>
      </div>

      {/* ── Status Bar ─────────────────────────────────────── */}
      <footer className="status-bar">
        <div className="status-bar__left">
          <div className="status-bar__item">
            <div className={`status-bar__dot status-bar__dot--${engineStatus}`} />
            <span>
              {engineStatus === 'idle' && 'Ready'}
              {engineStatus === 'running' && 'Executing...'}
              {engineStatus === 'success' && 'Completed'}
              {engineStatus === 'error' && 'Error'}
            </span>
          </div>
          <div className="status-bar__item">
            <span>{nodes.length} nodes · {edges.length} connections</span>
          </div>
        </div>
        <div className="status-bar__right">
          <span>Cyclone LokalPride v1.0</span>
        </div>
      </footer>
    </div>
  );
}
