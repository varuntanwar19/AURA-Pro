import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Boxes, Activity, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import K8sAutoHeal from './K8sAutoHeal';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOCK_PAAS = {
  cluster: { name: 'No cluster connected', version: '—', status: 'not-configured', nodes: 0, region: 'local' },
  pods: { running: 0, pending: 0, failed: 0, total: 0 }, anomalies: [], metrics: [],
};

async function fetchPaaS(cloud) {
  try {
    const res = await axios.get(`${API}/api/paas?cloud=${cloud}`, { timeout: 5000 });
    return res.data;
  } catch {
    return MOCK_PAAS;
  }
}

function PodGrid({ pods }) {
  const dots = [
    ...Array(pods.running).fill('running'),
    ...Array(pods.pending).fill('pending'),
    ...Array(pods.failed).fill('failed'),
  ].slice(0, 60);

  const colors = { running: 'bg-emerald-500', pending: 'bg-amber-500', failed: 'bg-red-500' };

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Pod status grid">
      {dots.map((status, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.005 }}
          title={status}
          className={`w-3 h-3 rounded-sm ${colors[status]}`}
        />
      ))}
      {pods.total > 60 && (
        <span className="text-xs text-aura-muted self-center">+{pods.total - 60} more</span>
      )}
    </div>
  );
}

export default function PaaSPanel() {
  const { t } = useTranslation();
  const { selectedCloud } = useAuraStore();
  const [showHeal, setShowHeal] = useState(false);
  const [healTriggered, setHealTriggered] = useState(false);
  const [analysisRunId, setAnalysisRunId] = useState(0);
  const handleAnalysisComplete = useCallback(() => setHealTriggered(false), []);

  const { data, isLoading } = useQuery({
    queryKey: ['paas', selectedCloud],
    queryFn: () => fetchPaaS(selectedCloud),
    refetchInterval: 30000,
  });

  const d = data || MOCK_PAAS;

  const handleTriggerHeal = () => {
    setHealTriggered(true);
    setShowHeal(true);
    setAnalysisRunId((id) => id + 1);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-cyan">{t('paas.title')}</h1>
          <p className="text-sm text-aura-subtext mt-1">{d.cluster?.name} · {d.cluster?.version}</p>
        </div>
        <button
          onClick={handleTriggerHeal}
          disabled={healTriggered}
          className="btn-primary flex items-center gap-2"
        >
          {healTriggered
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t('paas.healing')}</>
            : <><Zap className="w-4 h-4" />{t('paas.autoHeal')}</>
          }
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: t('paas.pods.running'), value: d.pods?.running, color: 'text-emerald-400' },
          { label: t('paas.pods.pending'), value: d.pods?.pending, color: 'text-amber-400' },
          { label: t('paas.pods.failed'),  value: d.pods?.failed,  color: 'text-red-400' },
          { label: t('paas.pods.total'),   value: d.pods?.total,   color: 'text-aura-cyan' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className="text-3xl font-extrabold {color}" style={{ color: color.includes('emerald') ? '#10b981' : color.includes('amber') ? '#f59e0b' : color.includes('red') ? '#ef4444' : '#06b6d4' }}>
              {isLoading ? '—' : value}
            </p>
            <p className="label-text mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Pod Grid + Anomalies */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-aura-cyan" />
            {t('paas.podStatus')}
          </h2>
          <PodGrid pods={d.pods || { running: 0, pending: 0, failed: 0, total: 0 }} />
          <div className="flex gap-4 mt-4">
            {[['running', 'bg-emerald-500'], ['pending', 'bg-amber-500'], ['failed', 'bg-red-500']].map(([s, c]) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-aura-subtext">
                <span className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                {t(`paas.pods.${s}`)}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            {t('paas.anomalies')}
          </h2>
          {d.anomalies?.map((a) => (
            <div key={a.id} className="mb-3 p-3 rounded-lg bg-aura-surface border border-aura-border">
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge-${a.severity === 'high' ? 'warning' : 'info'}`}>{a.severity}</span>
                <span className="text-xs text-aura-muted">{a.namespace} · {a.time}</span>
              </div>
              <p className="text-xs text-aura-text font-mono">{a.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-aura-cyan" />
            {t('paas.cpuUsage')} / {t('paas.memoryUsage')}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" />
              <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#111d35', border: '1px solid #1e3058', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="cpu" stroke="#06b6d4" fill="#06b6d420" strokeWidth={2} name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="#7c3aed" fill="#7c3aed20" strokeWidth={2} name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            {t('paas.networkIO')}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" />
              <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#111d35', border: '1px solid #1e3058', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="network" stroke="#10b981" strokeWidth={2} dot={false} name="Mbps" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Auto-Heal Workflow */}
      {showHeal && <K8sAutoHeal key={analysisRunId} triggered={healTriggered} onComplete={handleAnalysisComplete} />}
    </div>
  );
}
