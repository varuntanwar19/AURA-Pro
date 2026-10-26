import React, { useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function HumanInLoop() {
  const { t } = useTranslation();
  const { humanApprovalQueue, updateApproval } = useAuraStore();
  const [confirmations, setConfirmations] = useState({});
  const [applyingId, setApplyingId] = useState(null);

  const decide = async (item, status) => {
    if (status === 'approved' && item.terraformPlanId) {
      const confirmation = confirmations[item.id] || '';
      if (confirmation !== 'APPLY AZURE PLAN') return;
      setApplyingId(item.id);
      try {
        const { data } = await axios.post(`${API}/api/terraform/apply`, { plan_id: item.terraformPlanId, confirmation }, { timeout: 620000 });
        updateApproval(item.id, data.status === 'applied' ? 'applied' : 'apply-failed');
        toast[data.status === 'applied' ? 'success' : 'error'](data.status === 'applied' ? t('approvals.applySuccess') : data.output || data.status);
      } catch (error) {
        toast.error(error.response?.data?.detail || error.message || 'Terraform apply failed');
      } finally {
        setApplyingId(null);
      }
      return;
    }
    updateApproval(item.id, status);
  };

  return (
    <section className="p-6 space-y-5">
      <header><h1 className="text-2xl font-extrabold text-gradient-cyan">{t('approvals.title')}</h1><p className="text-sm text-aura-subtext mt-1">{t('approvals.safeNote')}</p></header>
      {humanApprovalQueue.length === 0 ? (
        <div className="glass-card p-8 text-center"><ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-3" /><p className="text-aura-text font-semibold">{t('approvals.noPending')}</p></div>
      ) : humanApprovalQueue.map((item) => (
        <article key={item.id} className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-aura-text">{item.action}</h2><span className={item.status === 'pending' ? 'badge-warning' : item.status === 'applied' || item.status === 'approved' ? 'badge-success' : 'badge-danger'}>{item.status}</span></div>
          <p className="text-sm text-aura-subtext">{item.reasoning}</p>
          {item.impact && <p className="text-xs text-aura-muted">{t('approvals.impact')}: {item.impact}</p>}
          {item.planOutput && <details><summary className="cursor-pointer text-xs text-aura-cyan">Terraform plan output</summary><pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-aura-bg p-3 text-xs font-mono text-aura-subtext whitespace-pre-wrap">{item.planOutput}</pre></details>}
          {Number.isFinite(item.confidence) && <p className="text-xs text-aura-cyan">{t('approvals.confidence')}: {item.confidence}%</p>}
          {item.terraformPlanId && item.status === 'pending' && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs text-amber-300">{t('approvals.deployWarning')}</p>
            <label className="block text-xs text-aura-subtext">{t('approvals.confirmPlaceholder')}<input className="input-field mt-1" value={confirmations[item.id] || ''} onChange={(event) => setConfirmations((state) => ({ ...state, [item.id]: event.target.value }))} placeholder="APPLY AZURE PLAN" /></label>
          </div>}
          {item.status === 'pending' && <div className="flex gap-2">
            <button onClick={() => decide(item, 'approved')} disabled={Boolean(item.terraformPlanId && (confirmations[item.id] !== 'APPLY AZURE PLAN' || applyingId === item.id))} className="btn-primary flex items-center gap-2 disabled:opacity-40"><CheckCircle className="w-4 h-4" />{applyingId === item.id ? t('approvals.applying') : item.terraformPlanId ? t('approvals.apply') : t('approvals.record')}</button>
            <button onClick={() => decide(item, 'rejected')} disabled={applyingId === item.id} className="btn-secondary flex items-center gap-2"><XCircle className="w-4 h-4" />{t('approvals.reject')}</button>
          </div>}
        </article>
      ))}
    </section>
  );
}
