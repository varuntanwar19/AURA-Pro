import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, Filter, BarChart3, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CATEGORIES = ['infrastructure', 'security', 'cost', 'performance', 'compliance'];
const PROVIDERS = ['all', 'azure', 'aws', 'gcp'];
const PIE_COLORS = ['#06b6d4', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

const MOCK_REPORTS = {
  reports: [], resourceUsage: [], costDistribution: [], alertTrends: [], performance: [],
};

async function fetchReports(cloud) {
  try {
    const res = await axios.get(`${API}/api/reports?cloud=${cloud}`, { timeout: 5000 });
    return res.data;
  } catch {
    return MOCK_REPORTS;
  }
}

const TOOLTIP_STYLE = { background: '#111d35', border: '1px solid #1e3058', borderRadius: '8px', fontSize: '12px' };

export default function ReportsPanel() {
  const { t } = useTranslation();
  const { selectedCloud } = useAuraStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeProvider, setActiveProvider] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', selectedCloud],
    queryFn: () => fetchReports(selectedCloud),
    refetchInterval: 300000,
  });

  const d = data || MOCK_REPORTS;

  const filteredReports = d.reports?.filter((r) =>
    (activeCategory === 'all' || r.category === activeCategory)
  ) || [];

  const categoryBadge = {
    infrastructure: 'badge-info',
    security: 'badge-danger',
    cost: 'badge-warning',
    performance: 'badge-success',
    compliance: 'badge-purple',
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-cyan">{t('reports.title')}</h1>
          <p className="text-sm text-aura-subtext mt-1">ELK-style analytics · Multi-cloud insights</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Resource Usage BarChart */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">{t('reports.charts.resourceUsage')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.resourceUsage} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Bar dataKey="vms" fill="#06b6d4" name="VMs" radius={[2, 2, 0, 0]} />
              <Bar dataKey="storage" fill="#7c3aed" name="Storage" radius={[2, 2, 0, 0]} />
              <Bar dataKey="network" fill="#10b981" name="Network" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost PieChart */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">{t('reports.charts.costDistribution')}</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={d.costDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {d.costDistribution?.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {d.costDistribution?.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-aura-subtext flex-1">{item.name}</span>
                  <span className="text-xs font-bold text-aura-text">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Trends */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">{t('reports.charts.alertTrends')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.alertTrends?.slice(-7)} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="critical" fill="#ef4444" name="Critical" stackId="a" />
              <Bar dataKey="high" fill="#f59e0b" name="High" stackId="a" />
              <Bar dataKey="medium" fill="#06b6d4" name="Medium" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance AreaChart */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">{t('reports.charts.performance')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.performance?.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="latency" stroke="#7c3aed" fill="#7c3aed20" strokeWidth={2} name="Latency (ms)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-aura-muted" />
        <div className="flex gap-1 flex-wrap">
          {['all', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 border
                ${activeCategory === cat
                  ? 'bg-aura-cyan/15 text-aura-cyan border-aura-cyan/30'
                  : 'text-aura-subtext border-transparent hover:text-aura-text hover:border-aura-border'
                }`}
            >
              {cat === 'all' ? 'All' : t(`reports.categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-aura-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-aura-cyan" />
          <h2 className="section-title">Reports</h2>
          <span className="badge-info ml-2">{filteredReports.length}</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-aura-subtext flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-aura-border">
              <tr>
                <th className="label-text text-left px-4 py-3">{t('reports.columns.title')}</th>
                <th className="label-text text-left px-4 py-3 hidden md:table-cell">Category</th>
                <th className="label-text text-left px-4 py-3 hidden lg:table-cell">{t('reports.columns.generated')}</th>
                <th className="label-text text-left px-4 py-3 hidden md:table-cell">{t('reports.columns.scope')}</th>
                <th className="label-text text-left px-4 py-3">{t('reports.columns.download')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, i) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-aura-border/40 hover:bg-aura-surface/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-aura-text">{report.title}</p>
                      <p className="text-[10px] text-aura-muted">{report.size}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={categoryBadge[report.category] || 'badge-info'}>
                      {t(`reports.categories.${report.category}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-aura-subtext hidden lg:table-cell">{report.generated}</td>
                  <td className="px-4 py-3 text-xs text-aura-subtext hidden md:table-cell">{report.scope}</td>
                  <td className="px-4 py-3">
                    <button className="btn-secondary py-1 px-3 text-xs flex items-center gap-1.5">
                      <Download className="w-3 h-3" />{t('reports.download')}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
