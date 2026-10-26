import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Database, RefreshCw, Send } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function DatabasePanel() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [source, setSource] = useState('manual note');
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['database-status'],
    queryFn: async () => (await axios.get(`${API}/api/database/status`, { timeout: 4000 })).data,
    refetchInterval: 15000, retry: 1,
  });
  const logs = useQuery({
    queryKey: ['elk-logs'],
    queryFn: async () => (await axios.get(`${API}/api/elk/logs?limit=30`, { timeout: 4000 })).data,
    refetchInterval: 15000, retry: 1,
  });
  const ingest = useMutation({
    mutationFn: async () => (await axios.post(`${API}/api/rag/ingest`, { text, source }, { timeout: 10000 })).data,
    onSuccess: () => { setText(''); queryClient.invalidateQueries({ queryKey: ['database-status'] }); },
  });

  return (
    <section className="p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl font-extrabold text-gradient-cyan">{t('database.title')}</h1><p className="text-sm text-aura-subtext mt-1">{t('database.subtitle')}</p></div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => refetch()}><RefreshCw className="w-4 h-4" />{t('database.refresh')}</button>
      </header>
      {isLoading && <p className="text-sm text-aura-subtext">{t('database.checking')}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(data || {}).map(([key, service]) => (
          <article className="glass-card p-5" key={key}>
            <div className="flex items-center gap-3"><Database className="w-5 h-5 text-aura-cyan" />
              <div className="flex-1"><h2 className="font-semibold text-aura-text">{service.name}</h2><p className="text-xs text-aura-muted">{service.url || t('database.localVolume')}{service.documents !== undefined ? ` · ${service.documents} documents` : ''}</p></div>
              <span className={service.status === 'healthy' || service.status === 'local' ? 'badge-success' : 'badge-warning'}>{service.status}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="glass-card p-5 text-sm text-aura-subtext">
        <h2 className="section-title mb-2">{t('database.ingestTitle')}</h2><p className="mb-3">{t('database.ingestHelp')}</p>
        <input value={source} onChange={(event) => setSource(event.target.value)} className="input-field mb-2" aria-label={t('database.sourcePlaceholder')} placeholder={t('database.sourcePlaceholder')} />
        <textarea value={text} onChange={(event) => setText(event.target.value)} className="input-field min-h-32 w-full" placeholder={t('database.textPlaceholder')} />
        <button className="btn-primary mt-3 flex items-center gap-2" disabled={ingest.isPending || text.trim().length < 20} onClick={() => ingest.mutate()}><Send className="w-4 h-4" />{ingest.isPending ? t('database.indexing') : t('database.add')}</button>
        {ingest.isSuccess && <p className="text-xs text-emerald-400 mt-2">{t('database.indexed')} {ingest.data.count}</p>}
        {ingest.isError && <p className="text-xs text-red-400 mt-2">{ingest.error.response?.data?.detail || ingest.error.message}</p>}
      </div>
      <section className="glass-card overflow-hidden">
        <header className="p-4 border-b border-aura-border flex items-center justify-between"><h2 className="section-title">{t('database.elkTitle')}</h2><span className="text-xs text-aura-muted">{logs.data?.source || 'connecting'}</span></header>
        {!logs.data?.logs?.length ? <p className="p-4 text-sm text-aura-subtext">{t('database.noLogs')}</p> : <ul className="divide-y divide-aura-border max-h-96 overflow-auto">{logs.data.logs.map((log, index) => <li key={`${log.timestamp}-${index}`} className="p-3"><p className="text-xs font-mono text-aura-muted">{log.timestamp} · {log.source}</p><p className="text-sm text-aura-text mt-1">{log.message || JSON.stringify(log)}</p></li>)}</ul>}
      </section>
    </section>
  );
}
