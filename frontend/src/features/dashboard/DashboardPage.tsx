import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock3,
  Rocket,
  ArrowUpRight,
  RotateCcw,
  Terminal,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusBadge, EnvironmentBadge } from '../../components/ui/Badge';
import { ClusterHealthCard } from '../../components/dashboard/ClusterHealthCard';
import { DeploymentLogsModal } from '../../components/deployments/DeploymentLogsModal';
import { RollbackModal } from '../../components/ui/RollbackModal';
import { NewProjectModal } from '../../components/ui/NewProjectModal';
import { TriggerDeployModal } from '../../components/ui/TriggerDeployModal';
import { api } from '../../services/api';
import type { Deployment, Project } from '../../types';

export function DashboardPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [rollbackDeployment, setRollbackDeployment] = useState<Deployment | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isTriggerDeployOpen, setIsTriggerDeployOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadDashboardData = async () => {
    setLoadError(null);
    try {
      const [d, p] = await Promise.all([api.getDeployments(), api.getProjects()]);
      setDeployments(d);
      setProjects(p);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load project and deployment data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRollback = async () => {
    if (!rollbackDeployment) return;
    try {
      await api.rollbackDeployment({
        deployment_id: rollbackDeployment.id,
        target_environment: rollbackDeployment.environment,
      });
      loadDashboardData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to roll back deployment.');
    }
  };

  const handleCreateProject = async (data: Partial<Project>): Promise<Project> => {
    return api.createProject(data);
  };

  const handleTriggerDeploy = async (data: { project_id: string; environment: string; branch: string; commit_message: string }) => {
    return api.triggerDeployment(data);
  };

  const filteredDeployments = deployments.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const statCards = [
    {
      label: 'Projects',
      value: loadError ? 'Unavailable' : isLoading ? 'Loading' : String(projects.length),
      detail: 'PostgreSQL project records',
      icon: Rocket,
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    },
    {
      label: 'Successful deployments',
      value: loadError ? 'Unavailable' : isLoading ? 'Loading' : String(deployments.filter((deployment) => deployment.status === 'success').length),
      detail: 'Recorded deployment records',
      icon: CheckCircle2,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    },
    {
      label: 'Average build time',
      value: 'Unavailable',
      detail: 'Not provided by the deployment API',
      icon: Clock3,
      accent: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Project and deployment overview
            </p>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Good morning,
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Here is what is happening across your cloud infrastructure and active deployments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTriggerDeployOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Rocket size={14} className="text-indigo-600 dark:text-indigo-400" />
            Quick Deploy
          </button>

          <button
            type="button"
            onClick={() => setIsNewProjectOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
          >
            <Plus size={14} />
            New project
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ label, value, detail, icon: Icon, accent }) => (
          <Card key={label} variant="glass" className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <span className={`rounded-xl border p-2.5 ${accent}`}>
                <Icon size={18} />
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
              <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={14} className="mr-0.5" />
                {detail}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Cluster Health & Infrastructure Metrics */}
      <ClusterHealthCard />

      {/* Deployments & Active Workspaces */}
      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Project and deployment data could not be loaded: {loadError}
          <button type="button" onClick={loadDashboardData} className="ml-3 underline">Retry</button>
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Left: Recent Deployments Table */}
        <Card variant="glass" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6 dark:border-slate-800/80">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Deployments</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live build pipelines across all connected microservices</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-800">
              {['all', 'started', 'running', 'success', 'failed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${filterStatus === st
                      ? 'bg-white text-indigo-600 shadow-sm font-semibold dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 uppercase tracking-wider text-slate-500 font-semibold dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Service / App</th>
                  <th className="px-6 py-3.5">Environment</th>
                  <th className="px-6 py-3.5">Commit Ref</th>
                  <th className="px-6 py-3.5">Started</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400">Loading deployments...</td></tr>
                ) : loadError ? (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400">Deployment data unavailable.</td></tr>
                ) : filteredDeployments.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400">No deployments available.</td></tr>
                ) : filteredDeployments.slice(0, 8).map((dep) => (
                  <tr
                    key={dep.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer dark:hover:bg-slate-800/30"
                    onClick={() => setSelectedDeployment(dep)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
                        {dep.project_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{dep.id}</span>
                        {dep.url && (
                          <a
                            href={dep.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <EnvironmentBadge env={dep.environment} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
                          {dep.commit_hash || 'No commit hash'}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">({dep.branch})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5">
                        {dep.commit_message || 'No commit message'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                      <div>{dep.started_at ? new Date(dep.started_at).toLocaleString() : 'Unavailable'}</div>
                      {dep.duration && <div className="text-[10px] text-slate-400 dark:text-slate-500">{dep.duration}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={dep.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedDeployment(dep)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                          title="View live terminal logs"
                        >
                          <Terminal size={12} />
                          <span>Logs</span>
                        </button>
                        {dep.status === 'success' && (
                          <button
                            type="button"
                            onClick={() => setRollbackDeployment(dep)}
                            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
                            title="Instant rollback"
                          >
                            <RotateCcw size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Sidebar: Active Services & Activity Stream */}
        <div className="space-y-6">
          {/* Active Projects Widget */}
          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Active Services</h3>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">{projects.length} Total</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {isLoading ? (
                <p className="py-3 text-xs text-slate-500">Loading projects...</p>
              ) : loadError ? (
                <p className="py-3 text-xs text-slate-500">Project data unavailable.</p>
              ) : projects.length === 0 ? (
                <p className="py-3 text-xs text-slate-500">No projects yet.</p>
              ) : projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/60"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{p.framework || 'Framework unavailable'}</p>
                  </div>
                  <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {p.status}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{p.total_deploys} deploys</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity Audit Stream */}
          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Activity Audit</h3>
              <Activity size={16} className="text-slate-400 dark:text-slate-500" />
            </div>
            <div className="mt-3 space-y-3">
              <p className="py-3 text-xs text-slate-500 dark:text-slate-400">Activity history is unavailable from the PostgreSQL project/deployment API.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Terminal Logs Modal */}
      <DeploymentLogsModal
        deployment={selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
      />

      {/* Rollback Modal */}
      <RollbackModal
        isOpen={Boolean(rollbackDeployment)}
        onClose={() => setRollbackDeployment(null)}
        deployment={rollbackDeployment}
        onConfirm={handleRollback}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSubmit={handleCreateProject}
        onRefresh={loadDashboardData}
      />

      {/* Trigger Deploy Modal */}
      <TriggerDeployModal
        isOpen={isTriggerDeployOpen}
        onClose={() => setIsTriggerDeployOpen(false)}
        projects={projects}
        onSubmit={handleTriggerDeploy}
        onRefresh={loadDashboardData}
      />
    </div>
  );
}
