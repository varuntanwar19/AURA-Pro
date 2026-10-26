import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitBranch, Play, Clock, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import useAuraStore from '../../store/auraStore';

const STATUS_COLORS = {
  pending: '#64748b',
  running: '#06b6d4',
  done: '#10b981',
  failed: '#ef4444',
};

function WorkflowNode({ data }) {
  const { label, status, duration, icon: Icon } = data;
  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;

  return (
    <div
      className="px-4 py-3 rounded-xl border-2 min-w-[140px] text-center shadow-lg"
      style={{
        background: '#111d35',
        borderColor: color,
        boxShadow: `0 0 12px ${color}30`,
      }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color }} />}
        {status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        {status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
        {status === 'pending' && <Clock className="w-3.5 h-3.5 text-aura-muted" />}
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      {duration && <p className="text-[10px] text-aura-muted font-mono">{duration}</p>}
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowNode };
const NODE_LABEL_KEYS = { 1: 'routeIntent', 2: 'iaasAgent', 3: 'paasAgent', 4: 'terraformAgent', 5: 'reasoning', 6: 'autoAction', 7: 'humanLoop', 8: 'finalize' };

const INITIAL_NODES = [
  { id: '1', type: 'workflowNode', position: { x: 0,   y: 0   }, data: { label: 'Route Intent', status: 'pending', duration: null } },
  { id: '2', type: 'workflowNode', position: { x: -200, y: 120 }, data: { label: 'IaaS Agent', status: 'pending', duration: null } },
  { id: '3', type: 'workflowNode', position: { x: 0,   y: 120  }, data: { label: 'PaaS Agent', status: 'pending', duration: null } },
  { id: '4', type: 'workflowNode', position: { x: 200, y: 120  }, data: { label: 'Terraform Agent', status: 'running', duration: '1.5s…' } },
  { id: '5', type: 'workflowNode', position: { x: 0,   y: 240  }, data: { label: 'AI Reasoning', status: 'pending', duration: null } },
  { id: '6', type: 'workflowNode', position: { x: -120, y: 360 }, data: { label: 'Auto-Action', status: 'pending', duration: null } },
  { id: '7', type: 'workflowNode', position: { x: 120, y: 360  }, data: { label: 'Human Review', status: 'running', duration: 'Awaiting…' } },
  { id: '8', type: 'workflowNode', position: { x: 0,   y: 480  }, data: { label: 'Finalize', status: 'pending', duration: null } },
];

const DISPLAY_NODES = INITIAL_NODES.map((node) => ({
  ...node,
  data: { ...node.data, status: 'pending', duration: null },
}));

const edgeStyle = { stroke: '#1e3058', strokeWidth: 2 };
const activeEdgeStyle = { stroke: '#06b6d4', strokeWidth: 2 };

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#1e3058' } },
  { id: 'e1-3', source: '1', target: '3', style: activeEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' }, label: 'K8s', labelStyle: { fill: '#64748b', fontSize: 10 } },
  { id: 'e1-4', source: '1', target: '4', style: activeEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' }, label: 'TF', labelStyle: { fill: '#64748b', fontSize: 10 } },
  { id: 'e3-5', source: '3', target: '5', style: activeEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' } },
  { id: 'e4-5', source: '4', target: '5', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#1e3058' } },
  { id: 'e5-6', source: '5', target: '6', style: activeEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' }, label: 'conf>80%', labelStyle: { fill: '#64748b', fontSize: 10 } },
  { id: 'e5-7', source: '5', target: '7', style: activeEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' }, label: 'conf<80%', labelStyle: { fill: '#64748b', fontSize: 10 } },
  { id: 'e6-8', source: '6', target: '8', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#1e3058' } },
  { id: 'e7-8', source: '7', target: '8', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#1e3058' } },
];

const MOCK_HISTORY = [];

export default function AgentWorkflow() {
  const { t } = useTranslation();
  const [nodes, , onNodesChange] = useNodesState(DISPLAY_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [showHistory, setShowHistory] = useState(true);
  const { humanApprovalQueue } = useAuraStore();
  const localizedNodes = nodes.map((node) => ({
    ...node,
    data: { ...node.data, label: t(`workflows.nodes.${NODE_LABEL_KEYS[node.id]}`) },
  }));

  const WorkflowStatusBadge = ({ status }) => {
    const map = { done: 'badge-success', running: 'badge-info', failed: 'badge-danger', pending: 'badge-warning' };
    return <span className={map[status]}>{t(`workflows.status.${status}`)}</span>;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-cyan">{t('workflows.title')}</h1>
          <p className="text-sm text-aura-subtext mt-1">LangGraph execution visualization · Real-time</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <History className="w-4 h-4" />{t('workflows.history')}
        </button>
      </div>

      {/* Flow Diagram */}
      <div className="glass-card" style={{ height: '500px' }}>
        <ReactFlow
          nodes={localizedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          style={{ background: '#080d1a' }}
        >
          <Background color="#1e3058" gap={20} size={1} />
          <Controls style={{ button: { background: '#111d35', borderColor: '#1e3058', color: '#94a3b8' } }} />
          <MiniMap
            style={{ background: '#0d1528', border: '1px solid #1e3058' }}
            nodeColor={(n) => STATUS_COLORS[n.data?.status] || STATUS_COLORS.pending}
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-aura-subtext">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {t(`workflows.status.${status}`)}
          </div>
        ))}
      </div>

      {/* History Panel */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-4 border-b border-aura-border flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-aura-cyan" />
            <h2 className="section-title">{t('workflows.history')}</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-aura-border">
              <tr>
                <th className="label-text text-left px-4 py-3">Workflow</th>
                <th className="label-text text-left px-4 py-3">Status</th>
                <th className="label-text text-left px-4 py-3 hidden md:table-cell">Cloud</th>
                <th className="label-text text-left px-4 py-3 hidden md:table-cell">{t('workflows.duration')}</th>
                <th className="label-text text-left px-4 py-3">{t('workflows.started')}</th>
                <th className="label-text text-left px-4 py-3 hidden lg:table-cell">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-aura-subtext">{t('workflows.noWorkflows')}</td></tr>}
              {MOCK_HISTORY.map((wf, i) => (
                <motion.tr
                  key={wf.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-aura-border/40 hover:bg-aura-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-aura-text">{wf.name}</td>
                  <td className="px-4 py-3"><WorkflowStatusBadge status={wf.status} /></td>
                  <td className="px-4 py-3 text-aura-subtext capitalize text-xs hidden md:table-cell">{wf.cloud}</td>
                  <td className="px-4 py-3 font-mono text-xs text-aura-subtext hidden md:table-cell">{wf.duration}</td>
                  <td className="px-4 py-3 text-xs text-aura-muted">{wf.started}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="badge-info text-[10px]">{wf.trigger}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
