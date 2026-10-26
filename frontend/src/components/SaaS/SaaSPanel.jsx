import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, Brain, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import axios from 'axios';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || '';

const MOCK_SAAS = {
  integrations: [],
  teams: { channels: [], activityMetrics: {} },
  sharepoint: { sites: [], docActivity: {} },
  insights: [],
};

async function fetchSaaS(cloud) {
  try {
    const res = await axios.get(`${API}/api/saas?cloud=${cloud}`, { timeout: 5000 });
    return res.data;
  } catch {
    return MOCK_SAAS;
  }
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-aura-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function SaaSPanel() {
  const { t } = useTranslation();
  const { selectedCloud } = useAuraStore();

  const { data, isLoading } = useQuery({
    queryKey: ['saas', selectedCloud],
    queryFn: () => fetchSaaS(selectedCloud),
    refetchInterval: 60000,
  });

  const { data: mcpData } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: async () => (await axios.get(`${API}/api/mcp/servers`, { timeout: 3000 })).data,
    refetchInterval: 15000,
  });

  const d = data || MOCK_SAAS;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-gradient-cyan">{t('saas.title')}</h1>
        <p className="text-sm text-aura-subtext mt-1">Microsoft 365 · Teams · SharePoint</p>
      </div>

      <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-label="Connected integrations">
        {(d.integrations || []).map((integration) => (
          <article key={integration.name} className="glass-card p-4 flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-aura-text">{integration.name}</h2><p className="text-xs text-aura-muted mt-1">{integration.mode}</p></div>
            <span className={['local', 'connected', 'healthy', 'available', 'configured'].includes(integration.status) ? 'badge-success' : 'badge-warning'}>{integration.status}</span>
          </article>
        ))}
      </section>

      <section className="glass-card p-5 space-y-3" aria-label="Model Context Protocol servers">
        <div><h2 className="section-title">MCP Servers</h2><p className="text-xs text-aura-muted mt-1">{mcpData?.protocol || 'Model Context Protocol / Streamable HTTP'} · read-only tool endpoints</p></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(mcpData?.servers || []).map((server) => <article key={server.name} className="rounded-lg border border-aura-border bg-aura-surface/50 p-3 space-y-1">
            <div className="flex items-center justify-between gap-2"><strong className="text-sm text-aura-text">{server.name}</strong><span className={server.status === 'running' ? 'badge-success' : 'badge-warning'}>{server.status}</span></div>
            <a href={server.url} target="_blank" rel="noreferrer" className="text-xs text-aura-cyan underline">{server.url}</a>
            <p className="text-[10px] text-aura-muted">Tools: {(server.tools || []).join(', ')}</p>
          </article>)}
        </div>
      </section>

      {/* AI Insights */}
      <div className="glass-card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-aura-violet" />
          {t('saas.aiInsights')}
        </h2>
        <div className="space-y-3">
          {d.insights?.map((ins) => (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 rounded-lg border ${ins.type === 'anomaly' ? 'border-amber-500/30 bg-amber-500/5' : 'border-aura-border bg-aura-surface/50'}`}
            >
              <div className="flex items-start gap-2 mb-2">
                {ins.type === 'anomaly'
                  ? <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  : <Activity className="w-4 h-4 text-aura-cyan flex-shrink-0 mt-0.5" />
                }
                <p className="text-sm text-aura-text">{ins.message}</p>
                <span className="text-xs text-aura-muted ml-auto flex-shrink-0">{ins.time}</span>
              </div>
              <ConfidenceBar value={ins.confidence} />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Teams Section */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            {t('saas.teams.title')}
          </h2>

          {/* Activity Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(d.teams?.activityMetrics || {}).map(([key, val]) => (
              <div key={key} className="p-3 rounded-lg bg-aura-surface border border-aura-border text-center">
                <p className="text-xl font-extrabold text-aura-cyan">{val.toLocaleString()}</p>
                <p className="text-[10px] text-aura-muted capitalize mt-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            ))}
          </div>

          {/* Channels List */}
          <h3 className="label-text mb-2">{t('saas.teams.channels')}</h3>
          <div className="space-y-2">
            {(d.teams?.channels || []).map((ch) => (
              <div key={ch.id} className="flex items-center gap-3 p-2 rounded-lg bg-aura-surface border border-aura-border">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ch.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-sm font-mono text-aura-text flex-1">#{ch.name}</span>
                <span className="text-xs text-aura-muted">{ch.messages24h} msgs/24h</span>
                {ch.anomaly && (
                  <span className="badge-warning text-[9px]">Anomaly</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SharePoint Section */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            {t('saas.sharepoint.title')}
          </h2>

          {/* Doc Activity */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(d.sharepoint?.docActivity || {}).map(([key, val]) => (
              <div key={key} className="p-3 rounded-lg bg-aura-surface border border-aura-border text-center">
                <p className="text-xl font-extrabold text-aura-violet">{val}</p>
                <p className="text-[10px] text-aura-muted capitalize mt-0.5">{key}</p>
              </div>
            ))}
          </div>

          {/* Sites List */}
          <h3 className="label-text mb-2">{t('saas.sharepoint.sites')}</h3>
          <div className="space-y-2">
            {(d.sharepoint?.sites || []).map((site) => (
              <div key={site.id} className="flex items-center gap-3 p-2 rounded-lg bg-aura-surface border border-aura-border">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  site.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-aura-text truncate">{site.name}</p>
                  <p className="text-[10px] text-aura-muted">{site.docs.toLocaleString()} docs</p>
                </div>
                <span className="text-xs text-aura-muted">{site.lastActivity}</span>
                {site.status !== 'healthy' && (
                  <span className="badge-warning text-[9px]">{site.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {t('saas.recommendations')}
        </h2>
        <div className="space-y-2">
          {(d.insights || []).length === 0 && <p className="text-sm text-aura-subtext">Connect Teams and SharePoint credentials to load live activity. No sample insights are shown.</p>}
          {(d.insights || []).map((rec, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-aura-surface border border-aura-border">
              <span className="text-aura-cyan font-bold text-sm flex-shrink-0">{i + 1}.</span>
              <p className="text-sm text-aura-subtext">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
