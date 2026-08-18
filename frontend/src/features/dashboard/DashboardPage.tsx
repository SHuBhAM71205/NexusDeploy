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
import type { DashboardStats, Deployment, Project, ActivityItem } from '../../types';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [rollbackDeployment, setRollbackDeployment] = useState<Deployment | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isTriggerDeployOpen, setIsTriggerDeployOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadDashboardData = async () => {
    try {
      const [s, d, p, a] = await Promise.all([
        api.getStats(),
        api.getDeployments(),
        api.getProjects(),
        api.getActivities(),
      ]);
      setStats(s);
      setDeployments(d);
      setProjects(p);
      setActivities(a);
    } catch {
      // Handled by client
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
    } catch {
      // Handled
    }
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    try {
      await api.createProject(data);
      loadDashboardData();
    } catch {
      // Handled
    }
  };

  const handleTriggerDeploy = async (data: { project_id: string; environment: string; branch: string; commit_message: string }) => {
    try {
      await api.triggerDeployment(data);
      loadDashboardData();
    } catch {
      // Handled
    }
  };

  const filteredDeployments = deployments.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const statCards = [
    {
      label: stats?.active_projects.label || 'Active projects',
      value: stats?.active_projects.value || '12',
      detail: stats?.active_projects.detail || '+2 this month',
      icon: Rocket,
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    },
    {
      label: stats?.successful_deploys.label || 'Successful deploys',
      value: stats?.successful_deploys.value || '98.6%',
      detail: stats?.successful_deploys.detail || 'Last 30 days',
      icon: CheckCircle2,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    },
    {
      label: stats?.avg_build_time.label || 'Average build time',
      value: stats?.avg_build_time.value || '1m 42s',
      detail: stats?.avg_build_time.detail || '14% faster',
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
              Cloud Region us-east-1 • Live Production
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
              {['all', 'success', 'building', 'failed'].map((st) => (
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
                {filteredDeployments.slice(0, 8).map((dep) => (
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
                          {dep.commit_hash}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">({dep.branch})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5">
                        {dep.commit_message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                      <div>{dep.started_at}</div>
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
                        {dep.status === 'Success' && (
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
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/60"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{p.framework}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Live
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
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="relative flex gap-3 text-xs">
                  <div className="mt-1 size-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{act.action}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">{act.project_name}</span> • {act.user_name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{act.timestamp}</p>
                  </div>
                </div>
              ))}
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
      />

      {/* Trigger Deploy Modal */}
      <TriggerDeployModal
        isOpen={isTriggerDeployOpen}
        onClose={() => setIsTriggerDeployOpen(false)}
        projects={projects}
        onSubmit={handleTriggerDeploy}
      />
    </div>
  );
}
