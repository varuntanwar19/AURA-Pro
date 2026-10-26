import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Brain, Loader2, ShieldCheck } from 'lucide-react';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || '';

export default function K8sAutoHeal({ triggered, onComplete }) {
  const { t } = useTranslation();
  const { selectedCloud, language, addApproval } = useAuraStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!triggered || started.current) return;
    started.current = true;
    setLoading(true);
    setError('');
    axios.post(`${API}/api/agents/paas/run`, { cloud: selectedCloud, language }, { timeout: 45000 })
      .then(({ data }) => {
        setResult(data);
        if (data.human_approval_required && data.proposed_action) {
          addApproval({
            id: data.id,
            action: data.proposed_action,
            confidence: data.confidence,
            reasoning: data.reasoning,
            impact: 'Review only. AURA does not execute Kubernetes changes from this analysis.',
            priority: 'high',
            status: 'pending',
            timestamp: data.timestamp,
          });
        }
      })
      .catch((err) => { setError(err.response?.data?.detail || err.message); })
      .finally(() => { setLoading(false); onComplete?.(); });
  }, [triggered, selectedCloud, language, addApproval, onComplete]);

  if (!triggered) return null;
  return (
    <section className="glass-card p-5 space-y-3" aria-live="polite">
      <h2 className="section-title flex items-center gap-2"><Brain className="w-4 h-4 text-aura-violet" />{t('paas.analysisTitle')}</h2>
      {loading && <p className="text-sm text-aura-subtext flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('paas.analyzing')}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && <>
        <div className="flex items-center gap-2"><span className="badge-info">{t(`paas.mode.${result.decision_mode}`)}</span><span className="text-xs text-aura-subtext">{t('paas.evidenceConfidence')}: {result.confidence}%</span></div>
        <p className="text-sm text-aura-text">{result.reasoning}</p>
        {result.proposed_action && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><p className="text-sm text-amber-200">{result.proposed_action}</p><p className="text-xs text-aura-muted mt-2 flex gap-1"><ShieldCheck className="w-3 h-3" />{t('paas.approvalQueued')}</p></div>}
        <p className="text-[11px] text-aura-muted">{t('paas.confidenceBasis')} · {t(`paas.status.${result.status}`)}</p>
      </>}
    </section>
  );
}
