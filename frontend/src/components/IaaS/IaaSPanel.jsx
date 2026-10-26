import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Activity, HardDrive, Network, Brain, Play, Loader2, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import axios from 'axios';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOCK_IAAS = {
  vms: [], networks: [], storage: [], predictions: [], usageData: [],
};

const TABS = ['vms', 'networks', 'storage'];

function StatusDot({ status }) {
  const color = status === 'running' || status === 'healthy' ? 'bg-emerald-400' :
    status === 'degraded' ? 'bg-amber-400' : 'bg-red-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-aura-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444' }}>
        {value}%
      </span>
    </div>
  );
}

async function fetchIaaS(cloud) {
  try {
    const res = await axios.get(`${API}/api/iaas?cloud=${cloud}`, { timeout: 5000 });
    return res.data;
  } catch {
    return MOCK_IAAS;
  }
}

export default function IaaSPanel() {
  const { t } = useTranslation();
  const { selectedCloud, language } = useAuraStore();
  const [activeTab, setActiveTab] = useState('vms');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['iaas', selectedCloud],
    queryFn: () => fetchIaaS(selectedCloud),
    refetchInterval: 60000,
  });

  const d = data || MOCK_IAAS;
  const resources = d[activeTab] || [];

  const handleRunAgent = async () => {
    setAgentRunning(true);
    try {
      const { data: result } = await axios.post(`${API}/api/agents/iaas/run`, { cloud: selectedCloud, language });
      setAgentResult(result);
    } catch (error) {
      setAgentResult({ reasoning: error.response?.data?.detail || error.message, confidence: 0, decision_mode: 'observe-only', status: 'analysis-only' });
    } finally {
      setAgentRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-cyan">{t('iaas.title')}</h1>
          <p className="text-sm text-aura-subtext mt-1 capitalize">{selectedCloud} resources</p>
        </div>
        <button
          onClick={handleRunAgent}
          disabled={agentRunning}
          className="btn-primary flex items-center gap-2"
          aria-label={t('iaas.runAgent')}
        >
          {agentRunning
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t('iaas.agentRunning')}</>
            : <><Play className="w-4 h-4" />{t('iaas.runAgent')}</>
          }
        </button>
      </div>

      {agentResult && <section className="glass-card p-4 space-y-2" aria-live="polite">
        <div className="flex items-center justify-between"><h2 className="section-title">{t('iaas.analysisTitle')}</h2><span className="badge-info">{t(`paas.mode.${agentResult.decision_mode}`)}</span></div>
        <p className="text-sm text-aura-text">{agentResult.reasoning}</p>
        <p className="text-xs text-aura-subtext">{t('iaas.evidenceConfidence')}: {agentResult.confidence}% · {t(`paas.status.${agentResult.status}`)}</p>
      </section>}

      {/* Tabs */}
      <div className="flex gap-1 bg-aura-card p-1 rounded-xl border border-aura-border w-fit" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
              ${activeTab === tab
                ? 'bg-aura-cyan/15 text-aura-cyan border border-aura-cyan/30'
                : 'text-aura-subtext hover:text-aura-text'
              }`}
          >
            {t(`iaas.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Resource Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-aura-subtext animate-pulse">{t('common.loading')}</div>
        ) : resources.length === 0 ? (
          <div className="p-8 text-center text-aura-subtext">{t('iaas.noResources')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-aura-border">
              <tr>
                {['name', 'status', 'region', 'size', 'uptime'].map((col) => (
                  <th key={col} className="label-text text-left px-4 py-3">{t(`iaas.columns.${col}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {resources.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-aura-border/40 hover:bg-aura-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-aura-text">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={r.status} />
                        <span className="capitalize text-aura-subtext text-xs">{r.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-aura-subtext text-xs">{r.region}</td>
                    <td className="px-4 py-3 font-mono text-xs text-aura-subtext">{r.size}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold text-xs">{r.uptime}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* AI Predictions */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="section-title flex items-center gap-2">
            <Brain className="w-4 h-4 text-aura-violet" />
            {t('iaas.aiPredictions')}
          </h2>
          {d.predictions?.map((pred, i) => (
            <div key={i} className="border border-aura-border rounded-lg p-4 space-y-2 bg-aura-surface/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-aura-cyan">{pred.resource}</span>
                <span className="badge-danger text-[10px]">{pred.issue}</span>
              </div>
              <p className="text-xs text-aura-subtext">{pred.reasoning}</p>
              <ConfidenceBar value={pred.confidence} />
              <div className="mt-2 p-2 rounded bg-aura-card border border-aura-border">
                <p className="text-[10px] label-text mb-1">{t('iaas.recommendation')}</p>
                <p className="text-xs text-aura-text">{pred.recommendation}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Usage Chart */}
        <div className="glass-card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-aura-cyan" />
            {t('iaas.resourceUsage')}
          </h2>
          {d.usageData?.length ? <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#111d35', border: '1px solid #1e3058', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Line type="monotone" dataKey="cpu" stroke="#06b6d4" strokeWidth={2} dot={false} name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#7c3aed" strokeWidth={2} dot={false} name="Memory %" />
              <Line type="monotone" dataKey="network" stroke="#10b981" strokeWidth={2} dot={false} name="Network %" />
            </LineChart>
          </ResponsiveContainer> : <div className="h-[220px] grid place-items-center text-center text-xs text-aura-muted">No Prometheus history returned. Connect Kubernetes kube-state-metrics and cAdvisor metrics to Prometheus to populate this chart.</div>}
        </div>
      </div>
    </div>
  );
}
