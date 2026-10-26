import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Server, AlertTriangle, Brain, GitBranch, CheckCircle, AlertCircle, XCircle, TrendingUp,
} from 'lucide-react';
import axios from 'axios';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOCK_DASHBOARD = {
  totalResources: 0, activeAlerts: 0, aiPredictionCount: 0, workflowsRunning: 0,
  cloudHealth: { azure: 'not-configured', aws: 'not-configured', gcp: 'not-configured' },
  recentAlerts: [], aiPredictions: [], recentWorkflows: [],
};

async function fetchDashboard() {
  try {
    const res = await axios.get(`${API}/api/dashboard`, { timeout: 5000 });
    return res.data;
  } catch {
    return MOCK_DASHBOARD;
  }
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-aura-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold text-aura-subtext w-8 text-right">{value}%</span>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'healthy') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === 'degraded') return <AlertCircle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function SeverityBadge({ severity }) {
  const map = {
    critical: 'badge-danger',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge-purple',
  };
  return <span className={map[severity] || 'badge-info'}>{severity}</span>;
}

function WorkflowStatusBadge({ status }) {
  const map = {
    done: 'badge-success',
    running: 'badge-info',
    failed: 'badge-danger',
    pending: 'badge-warning',
  };
  return <span className={map[status] || 'badge-info'}>{status}</span>;
}

export default function MainDashboard() {
  const { t } = useTranslation();
  const { selectedCloud } = useAuraStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  });

  const d = data || MOCK_DASHBOARD;

  const kpis = [
    { key: 'totalResources', value: d.totalResources, icon: Server, color: 'text-aura-cyan', bg: 'bg-aura-cyan/10 border-aura-cyan/20' },
    { key: 'activeAlerts',   value: d.activeAlerts,   icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { key: 'aiPredictions',  value: d.aiPredictionCount,  icon: Brain, color: 'text-aura-violet', bg: 'bg-purple-500/10 border-purple-500/20' },
    { key: 'workflowsRunning', value: d.workflowsRunning, icon: GitBranch, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];

  const cloudNames = { azure: 'Azure', aws: 'AWS', gcp: 'Google Cloud' };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gradient-aura">{t('dashboard.title')}</h1>
        <p className="text-sm text-aura-subtext mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ key, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card-hover p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label-text mb-2">{t(`dashboard.kpi.${key}`)}</p>
                <p className="text-3xl font-extrabold text-aura-text">
                  {isLoading ? '—' : value.toLocaleString()}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl border ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cloud Health */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-aura-cyan" />
            {t('dashboard.cloudHealth')}
          </h2>
          <div className="space-y-3">
            {Object.entries(d.cloudHealth).map(([cloud, status]) => (
              <div key={cloud} className="flex items-center justify-between py-2 border-b border-aura-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <StatusIcon status={status} />
                  <span className="text-sm font-semibold text-aura-text">{cloudNames[cloud]}</span>
                </div>
                <span className={`text-xs font-semibold ${
                  status === 'healthy' ? 'text-emerald-400' :
                  status === 'degraded' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {t(`dashboard.${status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {t('dashboard.recentAlerts')}
            </h2>
            <span className="badge-warning">{d.recentAlerts?.length}</span>
          </div>
          {!d.recentAlerts?.length ? (
            <p className="text-sm text-aura-subtext text-center py-6">{t('dashboard.noAlerts')}</p>
          ) : (
            <ul className="space-y-2">
              {d.recentAlerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-2 py-2 border-b border-aura-border/40 last:border-0">
                  <SeverityBadge severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-aura-text leading-snug truncate">{alert.message}</p>
                    <p className="text-[10px] text-aura-muted mt-0.5">{alert.cloud} · {alert.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI Predictions */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-aura-violet" />
            {t('dashboard.aiPredictions')}
          </h2>
          <ul className="space-y-4">
            {d.aiPredictions?.map((pred) => (
              <li key={pred.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-aura-text truncate pr-2">{pred.resource}</span>
                  <span className="badge-purple text-[10px]">{pred.type}</span>
                </div>
                <p className="text-[11px] text-aura-subtext leading-snug">{pred.reasoning}</p>
                <ConfidenceBar value={pred.confidence} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Workflows */}
      <div className="glass-card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          {t('dashboard.recentWorkflows')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-aura-border">
                <th className="label-text pb-2 pr-4">Name</th>
                <th className="label-text pb-2 pr-4">Status</th>
                <th className="label-text pb-2 pr-4">Cloud</th>
                <th className="label-text pb-2 pr-4">Duration</th>
                <th className="label-text pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {d.recentWorkflows?.map((wf) => (
                <tr key={wf.id} className="border-b border-aura-border/40 last:border-0 hover:bg-aura-card/50 transition-colors">
                  <td className="py-2 pr-4 font-medium text-aura-text">{wf.name}</td>
                  <td className="py-2 pr-4"><WorkflowStatusBadge status={wf.status} /></td>
                  <td className="py-2 pr-4 text-aura-subtext capitalize">{wf.cloud}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-aura-subtext">{wf.duration}</td>
                  <td className="py-2 text-aura-muted text-xs">{wf.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
