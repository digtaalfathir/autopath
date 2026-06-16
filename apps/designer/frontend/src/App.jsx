import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
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
import HistoryModal from './components/HistoryModal';
import SchedulerModal from './components/SchedulerModal';
import DashboardModal from './components/DashboardModal';
import ValidationModal from './components/ValidationModal';
import RunParamsModal from './components/RunParamsModal';
import DebugToolbar from './components/DebugToolbar';
import { BreakpointContext } from './contexts/BreakpointContext';
import { getNodeDefinition } from './nodeDefinitions';
import {
  LogoMark,
  IconFolderOpen, IconSave, IconDocument, IconSettings,
  IconPlay, IconStopSquare, IconTerminal, IconTrash,
  IconProperties, IconMinimize, IconMaximize, IconClose,
  IconPanelBottom, IconChevronUp, IconChevronDown,
  IconPublish, IconHistory, IconScheduler, IconDashboard,
  IconUndo, IconRedo,
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

// ── Pre-run workflow validation ──────────────────────────────────────────
function validateWorkflow(nodes, edges) {
  const errors   = [];
  const warnings = [];

  const startNodes = nodes.filter(n => n.data?.nodeType === 'start');
  if (startNodes.length === 0) {
    errors.push('No Start node found. Every workflow must begin with a Start node.');
  } else if (startNodes.length > 1) {
    warnings.push('Multiple Start nodes detected. Only the first will be used.');
  }

  if (startNodes.length > 0 && nodes.length > 1) {
    const hasOut = edges.some(e => e.source === startNodes[0].id);
    if (!hasOut) errors.push('Start node has no outgoing connection — the workflow will not execute any steps.');
  }

  if (nodes.length > 1) {
    const connectedIds = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
    nodes
      .filter(n => !connectedIds.has(n.id) && !['start', 'end'].includes(n.data?.nodeType))
      .forEach(n => warnings.push(`"${n.data?.label || n.data?.nodeType}" is not connected to any other node.`));
  }

  for (const node of nodes) {
    const nt  = node.data?.nodeType;
    const lbl = node.data?.label || nt;
    if (nt === 'navigateUrl'  && !node.data?.url?.trim())      errors.push(`"${lbl}": URL is required.`);
    if (nt === 'inputText'    && !node.data?.selector?.trim()) errors.push(`"${lbl}": CSS Selector is required.`);
    if (nt === 'clickElement' && !node.data?.selector?.trim()) errors.push(`"${lbl}": CSS Selector is required.`);
    if (nt === 'httpRequest'  && !node.data?.url?.trim())      errors.push(`"${lbl}": Request URL is required.`);
    if (nt === 'readFile'     && !node.data?.filePath?.trim()) errors.push(`"${lbl}": File Path is required.`);
    if (nt === 'writeFile'    && !node.data?.filePath?.trim()) errors.push(`"${lbl}": File Path is required.`);
    if (nt === 'setVariable'  && !node.data?.variableName?.trim()) warnings.push(`"${lbl}": Variable Name is empty.`);
  }

  return { errors, warnings, valid: errors.length === 0 };
}

export default function App() {
  const reactFlowWrapper  = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // ── Canvas state (manual useState so we can intercept changes) ──────
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // ── Undo/Redo (Feature 6) ──────────────────────────────────────────
  const [past,   setPast]   = useState([]);   // array of {nodes, edges} snapshots
  const [future, setFuture] = useState([]);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback((newNodes, newEdges) => {
    if (isUndoRedoRef.current) return;
    setPast(p => [...p.slice(-49), { nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) }]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      isUndoRedoRef.current = true;
      setFuture(f => [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...f.slice(0, 49)]);
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
      return p.slice(0, -1);
    });
  }, [nodes, edges]);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      isUndoRedoRef.current = true;
      setPast(p => [...p.slice(-49), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
      setNodes(next.nodes);
      setEdges(next.edges);
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
      return f.slice(1);
    });
  }, [nodes, edges]);

  // ── ReactFlow change handlers (detect removes for undo history) ─────
  const onNodesChange = useCallback((changes) => {
    if (!isUndoRedoRef.current && changes.some(c => c.type === 'remove')) {
      setPast(p => [...p.slice(-49), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
      setFuture([]);
    }
    setNodes(nds => applyNodeChanges(changes, nds));
  }, [nodes, edges]);

  const onEdgesChange = useCallback((changes) => {
    if (!isUndoRedoRef.current && changes.some(c => c.type === 'remove')) {
      setPast(p => [...p.slice(-49), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
      setFuture([]);
    }
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, [nodes, edges]);

  // ── Copy/Paste (Feature 10) ────────────────────────────────────────
  const clipboardRef = useRef(null);

  const handleCopy = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;
    const selectedIds   = new Set(selected.map(n => n.id));
    const internalEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));
    clipboardRef.current = { nodes: selected, edges: internalEdges };
  }, [nodes, edges]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;
    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;
    const idMap = {};
    const newNodes = copiedNodes.map(n => {
      const newId = generateNodeId();
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: true,
        data: { ...n.data, status: '' },
      };
    });
    const newEdges = copiedEdges.map(e => ({
      ...e,
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      source: idMap[e.source] || e.source,
      target: idMap[e.target] || e.target,
    }));
    const allNodes = [...nodes.map(n => ({ ...n, selected: false })), ...newNodes];
    const allEdges = [...edges, ...newEdges];
    setNodes(allNodes);
    setEdges(allEdges);
    pushHistory(allNodes, allEdges);
  }, [nodes, edges, pushHistory]);

  const handleDuplicate = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;
    const selectedIds   = new Set(selected.map(n => n.id));
    const internalEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));
    const idMap = {};
    const newNodes = selected.map(n => {
      const newId = generateNodeId();
      idMap[n.id] = newId;
      return { ...n, id: newId, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true, data: { ...n.data, status: '' } };
    });
    const newEdges = internalEdges.map(e => ({
      ...e,
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      source: idMap[e.source],
      target: idMap[e.target],
    }));
    const allNodes = [...nodes.map(n => ({ ...n, selected: false })), ...newNodes];
    const allEdges = [...edges, ...newEdges];
    setNodes(allNodes);
    setEdges(allEdges);
    pushHistory(allNodes, allEdges);
  }, [nodes, edges, pushHistory]);

  // ── Breakpoints (Feature 9) ────────────────────────────────────────
  const [breakpoints, setBreakpoints] = useState(() => new Set());

  const onToggleBreakpoint = useCallback((nodeId) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  const breakpointContextValue = useMemo(() => ({ breakpoints, onToggleBreakpoint }), [breakpoints, onToggleBreakpoint]);

  // ── Debug state ───────────────────────────────────────────────────
  const [debugState, setDebugState] = useState(null); // { nodeId, nodeName, variables }

  useEffect(() => {
    if (!api?.onDebugPaused) return;
    return api.onDebugPaused(({ nodeId, variables }) => {
      const node = nodes.find(n => n.id === nodeId);
      setDebugState({ nodeId, nodeName: node?.data?.label || nodeId, variables });
      setNodes(nds => nds.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status: 'paused' } } : n
      ));
    });
  }, [nodes]);  // eslint-disable-line — nodes ref needed to resolve node label

  const handleDebugResume = useCallback(async () => {
    if (debugState) {
      setNodes(nds => nds.map(n => n.id === debugState.nodeId ? { ...n, data: { ...n.data, status: '' } } : n));
      setDebugState(null);
    }
    await api?.debugResume();
  }, [debugState]);

  const handleDebugStep = useCallback(async () => {
    if (debugState) {
      setNodes(nds => nds.map(n => n.id === debugState.nodeId ? { ...n, data: { ...n.data, status: '' } } : n));
      setDebugState(null);
    }
    await api?.debugStep();
  }, [debugState]);

  // ── Other UI state ────────────────────────────────────────────────
  const [selectedNode, setSelectedNode]   = useState(null);
  const [logs, setLogs]                   = useState([]);
  const [flowName, setFlowName]           = useState('Untitled Workflow');
  const [engineStatus, setEngineStatus]   = useState('idle');
  const [bottomOpen, setBottomOpen]       = useState(true);
  const [bottomTab, setBottomTab]         = useState('output');
  const [execSummary, setExecSummary]     = useState(null);
  const [bottomHeight, setBottomHeight]   = useState(220);
  const [isResizing, setIsResizing]       = useState(false);
  // Stage 8 — Production Lifecycle
  const [publishedVersion, setPublishedVersion] = useState(null);
  const [historyOpen,    setHistoryOpen]   = useState(false);
  const [pubDialogOpen,  setPubDialogOpen] = useState(false);
  const [pubDescription, setPubDescription] = useState('');
  const [pubToast,       setPubToast]      = useState(null);
  // Stage 9 — Scheduler
  const [schedulerOpen,  setSchedulerOpen] = useState(false);
  // Stage 11 — Controller Dashboard
  const [dashboardOpen,  setDashboardOpen] = useState(false);
  // Feature 7 — Validation modal
  const [validationResult, setValidationResult] = useState(null);
  const [pendingRunParams, setPendingRunParams]  = useState(null); // callback after validation OK
  // Feature 8 — Run with params modal
  const [runParamsOpen,  setRunParamsOpen] = useState(false);

  const resizeDragRef = useRef({ startY: 0, startH: 220 });

  // ── Bottom panel resize ─────────────────────────────────────────────
  const onPanelResizeStart = useCallback((e) => {
    if (!bottomOpen) return;
    e.preventDefault();
    resizeDragRef.current = { startY: e.clientY, startH: bottomHeight };
    setIsResizing(true);

    const onMouseMove = (ev) => {
      const delta = resizeDragRef.current.startY - ev.clientY;
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

  // ── Engine event listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!api) return;
    const unsubLog = api.onEngineLog(log => {
      setLogs(p => [...p, log]);
      setEngineStatus(s => s === 'pending' ? 'running' : s);
    });
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

  // Scheduled job completion toast
  useEffect(() => {
    if (!api?.onSchedulerJobComplete) return;
    return api.onSchedulerJobComplete(data => {
      setPubToast({
        ok:      data.success,
        message: `Scheduled: ${data.workflowId} ${data.success ? 'completed' : 'failed'}`,
      });
      setTimeout(() => setPubToast(null), 4000);
    });
  }, []);

  // ── Canvas handlers ────────────────────────────────────────────────
  const onConnect = useCallback(params => {
    const newEdges = addEdge({ ...params, ...defaultEdgeOptions }, edges);
    setEdges(newEdges);
    pushHistory(nodes, newEdges);
  }, [edges, nodes, pushHistory]);

  const onNodeDragStop = useCallback((_e, _node) => {
    pushHistory(nodes, edges);
  }, [nodes, edges, pushHistory]);

  const onNodeClick    = useCallback((_e, node) => setSelectedNode(node), []);
  const onPaneClick    = useCallback(() => setSelectedNode(null), []);

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

    const newNode = {
      id: generateNodeId(),
      type: 'workflowNode',
      position,
      data: { nodeType: def.type, label: def.label, ...def.defaults, status: '' },
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    pushHistory(newNodes, edges);
  }, [reactFlowInstance, nodes, edges, pushHistory]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  const onKeyDown = useCallback(e => {
    // Ignore shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (ctrl && e.key === 'c') { handleCopy(); return; }
    if (ctrl && e.key === 'v') { e.preventDefault(); handlePaste(); return; }
    if (ctrl && e.key === 'd') { e.preventDefault(); handleDuplicate(); return; }

    // Debug shortcuts
    if (debugState) {
      if (e.key === 'F8')  { e.preventDefault(); handleDebugResume(); return; }
      if (e.key === 'F10') { e.preventDefault(); handleDebugStep();   return; }
    }

    if (e.key === 'Delete' && selectedNode) {
      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
      setEdges(eds => eds.filter(ed => ed.source !== selectedNode.id && ed.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, undo, redo, handleCopy, handlePaste, handleDuplicate, debugState, handleDebugResume, handleDebugStep]);

  // ── Flow data helpers ─────────────────────────────────────────────
  const getFlowData = useCallback(() => {
    if (!reactFlowInstance) return null;
    const flow = reactFlowInstance.toObject();
    return {
      name: flowName,
      version: publishedVersion,
      nodes:   flow.nodes.map(n => ({ ...n, data: { ...n.data, status: undefined } })),
      edges:   flow.edges,
      viewport: flow.viewport,
    };
  }, [reactFlowInstance, flowName, publishedVersion]);

  // ── File operations ────────────────────────────────────────────────
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
        setPublishedVersion(null);
        setPast([]);
        setFuture([]);
        setBreakpoints(new Set());
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
        setPast([]);
        setFuture([]);
      };
      input.click();
    }
  }, [reactFlowInstance]);

  const addLog = (level, message) => {
    setLogs(p => [...p, { level, message, timestamp: new Date().toISOString().substr(11, 8) }]);
  };

  // ── Execution (Feature 7 validation + Feature 8 params + Feature 9 breakpoints) ──
  const _doExecute = useCallback(async (initialVariables = {}) => {
    const data = getFlowData();
    if (!data) return;
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: '' } })));
    setLogs([]);
    setExecSummary(null);
    setBottomOpen(true);
    setBottomTab('output');
    setEngineStatus('pending');
    setDebugState(null);
    if (api) {
      const flowWithExtras = {
        ...data,
        initialVariables: Object.keys(initialVariables).length > 0 ? initialVariables : undefined,
        breakpoints: breakpoints.size > 0 ? Array.from(breakpoints) : undefined,
      };
      const r = await api.executeFlow(flowWithExtras);
      setEngineStatus(r.success ? 'success' : 'error');
      if (r.metrics) setExecSummary({ ...r.metrics, success: r.success });
      if (!r.success && r.error) addLog('ERROR', `Execution failed: ${r.error}`);
    } else {
      addLog('WARN', 'Running in browser mode — automation engine not available.');
      addLog('INFO', 'Launch in Electron to run workflows.');
      setEngineStatus('idle');
    }
  }, [getFlowData, setNodes, breakpoints]);

  const handleExecute = useCallback(() => {
    const result = validateWorkflow(nodes, edges);
    if (!result.valid || result.warnings.length > 0) {
      // Show validation modal; store what to do after user decides
      setValidationResult(result);
      setPendingRunParams({});   // empty params — plain run
    } else {
      _doExecute({});
    }
  }, [nodes, edges, _doExecute]);

  const handleRunWithParams = useCallback(() => {
    const result = validateWorkflow(nodes, edges);
    if (!result.valid) {
      setValidationResult(result);
      setPendingRunParams(null);  // block — errors must be fixed
    } else {
      setRunParamsOpen(true);
    }
  }, [nodes, edges]);

  const handleStop = useCallback(async () => {
    if (api) await api.stopFlow();
    setEngineStatus('idle');
    setDebugState(null);
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: '' } })));
  }, []);

  // Validation modal actions
  const onValidationRunAnyway = useCallback(() => {
    setValidationResult(null);
    if (pendingRunParams !== null) {
      _doExecute(pendingRunParams);
    }
    setPendingRunParams(null);
  }, [pendingRunParams, _doExecute]);

  const onValidationClose = useCallback(() => {
    setValidationResult(null);
    setPendingRunParams(null);
  }, []);

  // RunParams modal: user supplies vars, then run
  const onRunWithParams = useCallback((vars) => {
    setRunParamsOpen(false);
    _doExecute(vars);
  }, [_doExecute]);

  const handlePublish = useCallback(async () => {
    const data = getFlowData();
    if (!data || !api) return;
    const r = await api.publishFlow(flowName, data, pubDescription);
    if (r.success) {
      setPublishedVersion(r.version);
      setPubToast({ ok: true, message: `Published "${flowName}" as v${r.version}` });
      setTimeout(() => setPubToast(null), 3500);
      addLog('SUCCESS', `Published as v${r.version} → ${flowName}_v${r.version}.release.json`);
    } else {
      setPubToast({ ok: false, message: r.error || 'Publish failed' });
      setTimeout(() => setPubToast(null), 3500);
    }
    setPubDialogOpen(false);
    setPubDescription('');
  }, [getFlowData, flowName, pubDescription]);

  const minimapNodeColor = useCallback(node => {
    const def = getNodeDefinition(node.data?.nodeType);
    return def?.color || '#9CA3AF';
  }, []);

  const currentSelectedNode = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find(n => n.id === selectedNode.id) || null;
  }, [selectedNode, nodes]);

  const errorCount  = logs.filter(l => l.level === 'ERROR').length;
  const canUndo     = past.length > 0;
  const canRedo     = future.length > 0;

  const statusLabel = {
    idle:    'Ready',
    pending: 'Queued...',
    running: 'Executing...',
    success: 'Completed',
    error:   'Error',
  }[engineStatus];

  return (
    <BreakpointContext.Provider value={breakpointContextValue}>
    <div className="app-container" onKeyDown={onKeyDown} tabIndex={0}>

      {/* ── Title Bar ──────────────────────────────────────────── */}
      <header className="title-bar">
        <div className="title-bar__brand">
          <div className="title-bar__logo"><LogoMark size={20} /></div>
          <span className="title-bar__name"><em>Cyclone</em> Studio</span>
        </div>
        <div className="title-bar__divider" />
        <span className="title-bar__flow">{flowName}</span>
        <div className="title-bar__spacer" />
        <div className="title-bar__wincontrols">
          <button className="winctrl" onClick={() => api?.minimize()} title="Minimize"><IconMinimize size={11} /></button>
          <button className="winctrl" onClick={() => api?.maximize()} title="Maximize / Restore"><IconMaximize size={11} /></button>
          <button className="winctrl winctrl--close" onClick={() => api?.close()} title="Close"><IconClose size={11} /></button>
        </div>
      </header>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="toolbar" id="toolbar">
        <div className="toolbar__group">
          <button className="toolbar__btn" onClick={handleOpen} title="Open workflow (Ctrl+O)">
            <IconFolderOpen size={14} /> Open
          </button>
          <button className="toolbar__btn" onClick={handleSave} title="Save workflow (Ctrl+S)">
            <IconSave size={14} /> Save
          </button>
          {api && (
            <button className="toolbar__btn" onClick={handleSaveAs} title="Save as new file">
              <IconDocument size={14} /> Save As
            </button>
          )}
        </div>

        <div className="toolbar__sep" />

        {/* Undo/Redo — Feature 6 */}
        <div className="toolbar__group">
          <button
            className="toolbar__btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <IconUndo size={14} /> Undo
          </button>
          <button
            className="toolbar__btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <IconRedo size={14} /> Redo
          </button>
        </div>

        <div className="toolbar__sep" />

        <div className="toolbar__group">
          <button
            className="toolbar__btn toolbar__btn--primary"
            onClick={handleExecute}
            disabled={engineStatus === 'running' || engineStatus === 'pending'}
            title="Run workflow (F5)"
          >
            <IconPlay size={13} /> Run
          </button>
          <button
            className="toolbar__btn"
            onClick={handleRunWithParams}
            disabled={engineStatus === 'running' || engineStatus === 'pending'}
            title="Run with initial variables (Feature 8)"
          >
            ⚡ Params
          </button>
          {(engineStatus === 'running' || engineStatus === 'pending' || debugState) && (
            <button
              className="toolbar__btn toolbar__btn--danger"
              onClick={handleStop}
              title="Stop execution"
            >
              <IconStopSquare size={13} /> Stop
            </button>
          )}
        </div>

        <div className="toolbar__sep" />

        {api && (
          <div className="toolbar__group">
            <button
              className="toolbar__btn toolbar__btn--publish"
              onClick={() => setPubDialogOpen(true)}
              disabled={engineStatus === 'running' || engineStatus === 'pending'}
              title="Publish this workflow as a versioned release"
            >
              <IconPublish size={13} />
              {publishedVersion ? `Publish (v${publishedVersion})` : 'Publish'}
            </button>
            <button className="toolbar__btn" onClick={() => setHistoryOpen(true)} title="View versions and run history">
              <IconHistory size={13} /> History
            </button>
            <button className="toolbar__btn" onClick={() => setSchedulerOpen(true)} title="Manage task schedules">
              <IconScheduler size={13} /> Scheduler
            </button>
            <button className="toolbar__btn" onClick={() => setDashboardOpen(true)} title="Controller Dashboard">
              <IconDashboard size={13} /> Dashboard
            </button>
          </div>
        )}

        <div className="toolbar__sep" />

        <div className="toolbar__flow-info">
          <strong>{flowName}</strong>
          &nbsp;&mdash;&nbsp;
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}, {edges.length} {edges.length === 1 ? 'connection' : 'connections'}
          {breakpoints.size > 0 && (
            <span className="toolbar__bp-badge" title={`${breakpoints.size} breakpoint(s)`}>
              ⬤ {breakpoints.size}
            </span>
          )}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button className="toolbar__btn" title="Settings"><IconSettings size={14} /></button>
        </div>
      </div>

      {/* ── Workspace ──────────────────────────────────────────── */}
      <div className="workspace">
        <NodePalette />

        <div className="canvas-container" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>

          {/* Debug Toolbar overlay — Feature 9 */}
          <DebugToolbar
            debugState={debugState}
            onResume={handleDebugResume}
            onStep={handleDebugStep}
            onStop={handleStop}
          />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Control"
            selectionKeyCode="Shift"
            snapToGrid
            snapGrid={[16, 16]}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D1D5DB" />
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

        <aside className="sidebar-right" id="right-panel">
          <div className="sidebar-right__header">
            <IconProperties size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="sidebar-right__title">Properties</span>
          </div>
          <div className="sidebar-right__body">
            <PropertyPanel selectedNode={currentSelectedNode} onNodeUpdate={onNodeUpdate} nodes={nodes} />
          </div>
        </aside>
      </div>

      {/* ── Bottom Panel ───────────────────────────────────────── */}
      <div
        className={`bottom-panel ${!bottomOpen ? 'bottom-panel--collapsed' : ''} ${isResizing ? 'bottom-panel--resizing' : ''}`}
        style={{ height: bottomOpen ? bottomHeight : 32 }}
        id="bottom-panel"
      >
        <div className="bottom-panel__resize-handle" onMouseDown={onPanelResizeStart} title="Drag to resize" />
        <div className="bottom-panel__topbar">
          <div className="bottom-panel__tabs">
            <button
              className={`bottom-panel__tab ${bottomTab === 'output' ? 'bottom-panel__tab--active' : ''}`}
              onClick={() => { setBottomTab('output'); setBottomOpen(true); }}
            >
              <IconTerminal size={13} />
              Output
              {logs.length > 0 && <span className="bottom-panel__tab-badge">{logs.length}</span>}
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
              <button className="bottom-panel__action-btn" onClick={() => setLogs([])} title="Clear output">
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
              <ExecutionConsole logs={logs} onClear={() => setLogs([])} summary={execSummary} onDismissSummary={() => setExecSummary(null)} />
            )}
            {bottomTab === 'errors' && (
              <ExecutionConsole logs={logs.filter(l => l.level === 'ERROR')} onClear={() => setLogs(p => p.filter(l => l.level !== 'ERROR'))} />
            )}
          </div>
        )}
      </div>

      {/* ── Publish Dialog ────────────────────────────────────── */}
      {pubDialogOpen && (
        <div className="hist-overlay" onClick={() => setPubDialogOpen(false)}>
          <div className="pub-dialog" onClick={e => e.stopPropagation()}>
            <div className="pub-dialog__title">Publish Workflow</div>
            <div className="pub-dialog__sub">Publishing <strong>{flowName}</strong> as a new versioned release.</div>
            <label className="pub-dialog__label">Description <span className="hist-muted">(optional)</span></label>
            <input
              className="pub-dialog__input"
              type="text"
              placeholder="e.g. Initial release, Bug fix, Added retry logic…"
              value={pubDescription}
              onChange={e => setPubDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePublish()}
              autoFocus
            />
            <div className="pub-dialog__actions">
              <button className="pub-dialog__btn" onClick={() => { setPubDialogOpen(false); setPubDescription(''); }}>Cancel</button>
              <button className="pub-dialog__btn pub-dialog__btn--primary" onClick={handlePublish}>
                <IconPublish size={13} /> Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Validation Modal — Feature 7 ──────────────────────── */}
      {validationResult && (
        <ValidationModal
          result={validationResult}
          onClose={onValidationClose}
          onRunAnyway={onValidationRunAnyway}
        />
      )}

      {/* ── Run with Params Modal — Feature 8 ────────────────── */}
      {runParamsOpen && (
        <RunParamsModal
          onClose={() => setRunParamsOpen(false)}
          onRun={onRunWithParams}
        />
      )}

      {/* ── History Modal ─────────────────────────────────────── */}
      {historyOpen && <HistoryModal flowName={flowName} onClose={() => setHistoryOpen(false)} />}

      {/* ── Scheduler Modal ───────────────────────────────────── */}
      {schedulerOpen && <SchedulerModal onClose={() => setSchedulerOpen(false)} />}

      {/* ── Dashboard Modal ──────────────────────────────────── */}
      {dashboardOpen && <DashboardModal onClose={() => setDashboardOpen(false)} />}

      {/* ── Publish Toast ─────────────────────────────────────── */}
      {pubToast && (
        <div className={`pub-toast pub-toast--${pubToast.ok ? 'ok' : 'err'}`}>
          {pubToast.message}
        </div>
      )}

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
          {debugState && (
            <div className="status-bar__item status-bar__item--debug">
              ⏸ Paused at &quot;{debugState.nodeName}&quot; — F8 Resume · F10 Step
            </div>
          )}
        </div>
        <div className="status-bar__right">
          <span>Cyclone Studio v1.0</span>
        </div>
      </footer>
    </div>
    </BreakpointContext.Provider>
  );
}
