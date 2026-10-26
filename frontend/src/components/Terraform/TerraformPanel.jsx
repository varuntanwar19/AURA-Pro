import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileCode2, Loader2, Play } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuraStore from '../../store/auraStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const EMPTY = { overProvisioning: [], driftDetection: [], totalSavings: 0, sourceFiles: [] };

export default function TerraformPanel() {
  const { t } = useTranslation();
  const { selectedCloud, addApproval } = useAuraStore();
  const navigate = useNavigate();
  const [planRunning, setPlanRunning] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [filesOpen, setFilesOpen] = useState(true);
  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ['terraform', selectedCloud],
    queryFn: async () => (await axios.get(`${API}/api/terraform?cloud=${selectedCloud}`, { timeout: 5000 })).data,
    refetchInterval: 120000,
    retry: 1,
  });

  const runPlan = async () => {
    setPlanRunning(true);
    try {
      const { data: result } = await axios.post(`${API}/api/terraform/plan`, {}, { timeout: 260000 });
      setPlanResult(result);
      toast.success(result.status === 'changes-proposed' ? 'Plan ready for review' : result.status);
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Terraform plan failed';
      setPlanResult({ status: 'plan-failed', output: detail, apply_performed: false });
      toast.error(detail);
    } finally {
      setPlanRunning(false);
    }
  };

  const requestReview = () => {
    if (planResult?.status !== 'changes-proposed') return;
    addApproval({
      id: `tf-${Date.now()}`,
      action: 'Review the proposed Azure Terraform changes',
      reasoning: 'This approval records human review only. Check the attached plan output and Azure pricing before running terraform apply.',
      impact: 'The proposed AKS worker, network, and storage resources may incur ongoing Azure charges.',
      planOutput: planResult.output,
      terraformPlanId: planResult.plan_id,
      priority: 'high',
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
    toast.success('Terraform plan sent to human review');
    navigate('/human-approval');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-cyan">{t('terraform.title')}</h1>
          <p className="text-sm text-aura-subtext mt-1">{t('terraform.azureOnly')}</p>
        </div>
        <button onClick={runPlan} disabled={planRunning || selectedCloud !== 'azure'} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {planRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {planRunning ? t('terraform.planRunning') : t('terraform.planRun')}
        </button>
      </header>

      <div className="glass-card p-4 text-sm text-aura-subtext">
        Terraform is Azure-only in this project. The plan refreshes Azure state and may call Azure APIs. No apply is performed here. AKS worker nodes, networking and storage can incur charges.
      </div>

      {planResult && (
        <section className="glass-card overflow-hidden">
          <div className="p-4 border-b border-aura-border flex items-center justify-between">
            <h2 className="section-title">{t('terraform.planTitle')}</h2>
            <span className={planResult.status === 'changes-proposed' ? 'badge-warning' : planResult.status === 'no-changes' ? 'badge-success' : 'badge-danger'}>{planResult.status}</span>
          </div>
          <pre className="p-4 max-h-[32rem] overflow-auto text-xs font-mono text-aura-subtext whitespace-pre-wrap">{planResult.output || 'No plan output.'}</pre>
          <p className="px-4 pb-4 text-xs text-aura-muted">{t('terraform.planOnly')}</p>
          {planResult.status === 'changes-proposed' && <div className="px-4 pb-4"><button onClick={requestReview} className="btn-primary">{t('terraform.reviewPlan')}</button></div>}
        </section>
      )}

      <section className="glass-card overflow-hidden">
        <button onClick={() => setFilesOpen(!filesOpen)} className="w-full p-4 flex items-center justify-between text-left" aria-expanded={filesOpen}>
          <span className="section-title flex items-center gap-2"><FileCode2 className="w-4 h-4 text-aura-cyan" />{t('terraform.sourceTitle')}</span>
          {filesOpen ? <ChevronUp className="w-4 h-4 text-aura-muted" /> : <ChevronDown className="w-4 h-4 text-aura-muted" />}
        </button>
        {filesOpen && <div className="border-t border-aura-border divide-y divide-aura-border">
          {isLoading && <p className="p-4 text-sm text-aura-subtext">Loading Terraform files…</p>}
          {!isLoading && !data.sourceFiles?.length && <p className="p-4 text-sm text-aura-muted">{t('terraform.noSource')}</p>}
          {(data.sourceFiles || []).map((file) => (
            <details key={file.name}>
              <summary className="px-4 py-3 cursor-pointer text-sm font-mono text-aura-cyan">{file.name}</summary>
              <pre className="p-4 max-h-[32rem] overflow-auto text-xs font-mono text-aura-subtext bg-aura-bg whitespace-pre">{file.content}</pre>
            </details>
          ))}
        </div>}
      </section>

      <section className="glass-card p-5 space-y-3">
        <h2 className="section-title mb-3">Over-provisioning and drift</h2>
        {data.pricingStatus === 'not-configured' && <p className="text-xs text-amber-300">Azure pricing is not connected. No savings or monthly bill estimate is shown; verify each planned resource in Azure before approval.</p>}
        {(data.overProvisioning || []).map((item, index) => <article key={`${item.resource}-${index}`} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm text-aura-text">{item.resource}</strong><span className="badge-warning">{item.issue}</span></div>
          <p className="text-xs text-aura-subtext">{item.reasoning}</p>
          <p className="text-xs text-aura-text">{item.recommendation}</p>
          <p className="text-[10px] text-aura-muted">Evidence confidence: {item.confidence}% · recommendation only · no Terraform action taken</p>
        </article>)}
        {!data.overProvisioning?.length && !data.driftDetection?.length && (
          <p className="text-sm text-aura-subtext">{t('terraform.noMetrics')} Prometheus must contain sustained Kubernetes CPU and memory samples before over-sizing suggestions can be shown.</p>
        )}
      </section>
    </div>
  );
}
