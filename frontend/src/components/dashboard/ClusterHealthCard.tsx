import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, CircleX, Clock3, ExternalLink, RefreshCw, Rocket } from 'lucide-react';
import { Card } from '../ui/Card';
import { api } from '../../services/api';
import type { MonitoringSummary } from '../../types';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Unavailable';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function ClusterHealthCard() {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      try {
        const result = await api.getMonitoringSummary();
        if (isMounted) {
          setSummary(result);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load monitoring metrics.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadSummary();
    const interval = setInterval(() => void loadSummary(), 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [retryCount]);

  const deployments = summary?.deployments;
  const providers = Object.entries(deployments?.providers ?? {});
  const hasNoDeploymentMetrics = deployments
    && deployments.started_total === 0
    && deployments.successful_total === 0
    && deployments.failed_total === 0;

  const metrics = [
    { label: 'Deployments started', value: deployments?.started_total, icon: Rocket, color: 'text-sky-600 dark:text-sky-400' },
    { label: 'Successful', value: deployments?.successful_total, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Failed', value: deployments?.failed_total, icon: CircleX, color: 'text-rose-600 dark:text-rose-400' },
    {
      label: 'Average duration',
      value: deployments ? formatDuration(deployments.average_duration_seconds) : undefined,
      detail: deployments ? `${deployments.duration_observations} completed observations` : undefined,
      icon: Clock3,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    { label: 'HTTP requests', value: summary?.requests.total, icon: Activity, color: 'text-sky-600 dark:text-sky-400' },
    { label: '5xx responses', value: summary?.requests.server_errors_total, icon: CircleX, color: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <Card variant="glass" className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Activity size={19} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Deployment Monitoring</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Backend Prometheus lifecycle metrics</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="text-right">
            <p>{error ? (summary ? 'Refresh failed' : 'Metrics unavailable') : isLoading && !summary ? 'Connecting' : 'Backend metrics connected'}</p>
            {summary && <p className="mt-1">Updated {new Date(summary.updated_at).toLocaleString()}</p>}
          </div>
          <div className="flex items-center gap-3">
            <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400">
              Grafana <ExternalLink size={12} />
            </a>
            <a href="http://localhost:9090" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400">
              Prometheus <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <span>Monitoring metrics could not be loaded: {error}</span>
          <button type="button" onClick={() => { setIsLoading(true); setRetryCount((count) => count + 1); }} className="inline-flex items-center gap-1.5 font-semibold underline">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {metrics.map(({ label, value, detail, icon: Icon, color }) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Icon size={14} className={color} />
              <span>{label}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading && !summary ? 'Loading' : value ?? 'Unavailable'}
            </p>
            {detail && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>}
          </div>
        ))}
      </div>

      {hasNoDeploymentMetrics && !isLoading && (
        <p className="text-xs text-slate-500 dark:text-slate-400">No deployment metrics have been recorded yet.</p>
      )}

      {providers.length > 0 && (
        <div className="overflow-x-auto border-t border-slate-200 pt-4 dark:border-slate-800">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">By provider</h4>
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 text-right font-medium">Started</th>
                <th className="pb-2 text-right font-medium">Successful</th>
                <th className="pb-2 text-right font-medium">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {providers.map(([provider, values]) => (
                <tr key={provider}>
                  <th className="py-2 font-medium capitalize text-slate-700 dark:text-slate-200">{provider}</th>
                  <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">{values.started_total}</td>
                  <td className="py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{values.successful_total}</td>
                  <td className="py-2 text-right font-mono text-rose-600 dark:text-rose-400">{values.failed_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
