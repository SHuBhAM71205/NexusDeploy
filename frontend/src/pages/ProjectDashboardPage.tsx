import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  Rocket,
  Server,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { DeploymentLogsModal } from '../components/deployments/DeploymentLogsModal';
import { TriggerDeployModal } from '../components/ui/TriggerDeployModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Deployment, MonitoringSummary, Project } from '../types';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Unavailable';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function Metric({ label, value, icon: Icon, tone }: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <Card variant="glass" className="p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Icon size={14} className={tone} />
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </Card>
  );
}

export function ProjectDashboardPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [latestDetails, setLatestDetails] = useState<Deployment | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [isTriggerOpen, setIsTriggerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;
    const loadDashboard = async () => {
      try {
        const [projectResult, deploymentRows, monitoring] = await Promise.all([
          api.getProject(projectId),
          api.getDeployments({ project_id: projectId }),
          api.getProjectMonitoringSummary(projectId),
        ]);
        const latest = deploymentRows[0];
        const details = latest ? await api.getDeployment(latest.id).catch(() => null) : null;
        if (!isActive) return;
        setProject(projectResult);
        setDeployments(deploymentRows);
        setSummary(monitoring);
        setLatestDetails(details);
        setLoadError(null);
      } catch (error) {
        if (isActive) setLoadError(error instanceof Error ? error.message : 'Unable to load project dashboard.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadDashboard();
    const interval = setInterval(() => void loadDashboard(), 10000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [projectId, reloadKey]);

  const metrics = summary?.deployments;
  const recentLogs = latestDetails?.logs?.slice(-8).reverse() ?? [];
  const timeline = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return {
      key,
      day: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      successful: 0,
      failed: 0,
      active: 0,
    };
  });
  for (const deployment of deployments) {
    const stamp = deployment.completed_at || deployment.started_at;
    if (!stamp) continue;
    const date = new Date(stamp);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const day = timeline.find((entry) => entry.key === key);
    if (!day) continue;
    if (deployment.status === 'success') day.successful += 1;
    else if (deployment.status === 'failed') day.failed += 1;
    else day.active += 1;
  }
  const analysis = [
    { name: 'Successful', value: deployments.filter((deployment) => deployment.status === 'success').length, color: '#10b981' },
    { name: 'Failed', value: deployments.filter((deployment) => deployment.status === 'failed').length, color: '#f43f5e' },
    { name: 'Active', value: deployments.filter((deployment) => !['success', 'failed'].includes(deployment.status)).length, color: '#0ea5e9' },
  ].filter((item) => item.value > 0);

  if (isLoading && !project) {
    return <Card variant="glass" className="p-8 text-center text-sm text-slate-500">Loading project dashboard...</Card>;
  }

  if (!project) {
    return (
      <Card variant="glass" className="p-8 text-center" role="alert">
        <p className="text-sm text-rose-600 dark:text-rose-400">{loadError || 'Project not found.'}</p>
        <button type="button" onClick={() => navigate('/projects')} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
          <ArrowLeft size={15} /> Projects
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <button type="button" onClick={() => navigate('/projects')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft size={14} /> Projects
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
            {latestDetails && <StatusBadge status={latestDetails.status} />}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[project.platform, project.framework, project.branch].filter(Boolean).join(' · ') || 'Project overview'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.production_url && (
            <a href={project.production_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Production <ExternalLink size={13} />
            </a>
          )}
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} title="Refresh project dashboard" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white">
            <RefreshCw size={15} />
          </button>
          <button type="button" onClick={() => setIsTriggerOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
            <Rocket size={14} /> Deploy
          </button>
        </div>
      </header>

      {loadError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">Dashboard refresh failed: {loadError}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Project deployment metrics">
        <Metric label="Deployments" value={metrics?.started_total ?? deployments.length} icon={Rocket} tone="text-sky-500" />
        <Metric label="Successful" value={metrics?.successful_total ?? deployments.filter((deployment) => deployment.status === 'success').length} icon={CheckCircle2} tone="text-emerald-500" />
        <Metric label="Failed" value={metrics?.failed_total ?? deployments.filter((deployment) => deployment.status === 'failed').length} icon={XCircle} tone="text-rose-500" />
        <Metric label="Average deploy time" value={formatDuration(metrics?.average_duration_seconds ?? null)} icon={Clock3} tone="text-indigo-500" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
        <section aria-labelledby="timeline-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="timeline-heading" className="text-sm font-semibold text-slate-900 dark:text-white">Deployment timeline</h2>
            <span className="text-xs text-slate-500">Last 14 days</span>
          </div>
          <Card variant="glass" className="p-4">
            {deployments.length === 0 ? (
              <div className="grid h-56 place-items-center text-xs text-slate-500">No deployment activity to chart.</div>
            ) : (
              <div className="h-56 w-full" role="img" aria-label="Daily successful, failed, and active deployments for the last fourteen days">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="successful" name="Successful" stackId="deployments" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" stackId="deployments" fill="#f43f5e" />
                    <Bar dataKey="active" name="Active" stackId="deployments" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </section>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <section aria-labelledby="analysis-heading">
            <h2 id="analysis-heading" className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Current analysis</h2>
            <Card variant="glass" className="p-4">
              {analysis.length === 0 ? (
                <div className="grid h-40 place-items-center text-xs text-slate-500">Deployment analysis appears after the first run.</div>
              ) : (
                <div className="h-40 w-full" role="img" aria-label="Current deployment outcomes by status">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analysis} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={3}>
                        {analysis.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                      <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {deployments.length ? `${Math.round((analysis.find((item) => item.name === 'Successful')?.value ?? 0) / deployments.length * 100)}% success rate across recorded deployments` : 'No runs recorded'}
              </p>
            </Card>
          </section>

          <section aria-labelledby="project-access-heading">
            <h2 id="project-access-heading" className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Project access</h2>
            <Card variant="glass" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name || user?.email || 'Signed-in account'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || 'Account identity unavailable'}</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Owner</span>
              </div>
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">Project access is restricted to its owner. Team roles and member invitations are not configured.</p>
            </Card>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section aria-labelledby="deployment-history-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="deployment-history-heading" className="text-sm font-semibold text-slate-900 dark:text-white">Deployment history</h2>
            <span className="text-xs text-slate-500">{deployments.length} records</span>
          </div>
          <Card variant="glass" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr><th className="px-4 py-3">Started</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Environment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Logs</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deployments.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No deployments recorded.</td></tr>
                  ) : deployments.map((deployment) => (
                    <tr key={deployment.id} className="text-slate-700 dark:text-slate-300">
                      <td className="whitespace-nowrap px-4 py-3">{deployment.started_at ? new Date(deployment.started_at).toLocaleString() : 'Unavailable'}</td>
                      <td className="px-4 py-3 font-mono">{deployment.branch || '—'}</td>
                      <td className="px-4 py-3 capitalize">{deployment.environment}</td>
                      <td className="px-4 py-3"><StatusBadge status={deployment.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setSelectedDeployment(deployment)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">View logs</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="provider-usage-heading">
            <h2 id="provider-usage-heading" className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Platform usage</h2>
            <Card variant="glass" className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Server size={16} className="text-sky-600 dark:text-sky-400" />
                {project.platform || 'Provider not configured'}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Provider billing, compute, and bandwidth usage are not exposed by the current integration. Deployment lifecycle totals are shown above.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
                <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Open Grafana</a>
                <a href="http://localhost:9090" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Open Prometheus</a>
              </div>
            </Card>
          </section>

          <section aria-labelledby="latest-logs-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="latest-logs-heading" className="text-sm font-semibold text-slate-900 dark:text-white">Latest deployment logs</h2>
              {latestDetails && <span className="text-[11px] text-slate-500">{latestDetails.status}</span>}
            </div>
            <Card variant="glass" className="overflow-hidden">
              {recentLogs.length ? (
                <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto font-mono text-[11px] dark:divide-slate-800">
                  {recentLogs.map((log, index) => (
                    <div key={`${log.timestamp}-${index}`} className="grid grid-cols-[4.5rem_3.5rem_minmax(0,1fr)] gap-2 px-3 py-2">
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={log.level === 'error' ? 'text-rose-500' : log.level === 'success' ? 'text-emerald-500' : 'text-sky-500'}>{log.level}</span>
                      <span className="wrap-break-word text-slate-700 dark:text-slate-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-8 text-xs text-slate-500">
                  <Activity size={15} /> {latestDetails ? 'No logs available for the latest deployment.' : 'No deployment logs yet.'}
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>

      <DeploymentLogsModal deployment={selectedDeployment} onClose={() => setSelectedDeployment(null)} />
      <TriggerDeployModal
        isOpen={isTriggerOpen}
        onClose={() => setIsTriggerOpen(false)}
        projects={[project]}
        selectedProjectId={project.id}
        onSubmit={api.triggerDeployment}
        onRefresh={() => setReloadKey((key) => key + 1)}
      />
    </div>
  );
}