import { useState, useEffect } from 'react';
import {
  Rocket,
  Search,
  RotateCcw,
  Terminal,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { StatusBadge, EnvironmentBadge } from '../components/ui/Badge';
import { DeploymentLogsModal } from '../components/deployments/DeploymentLogsModal';
import { RollbackModal } from '../components/ui/RollbackModal';
import { TriggerDeployModal } from '../components/ui/TriggerDeployModal';
import { api } from '../services/api';
import type { Deployment, Project } from '../types';

export function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [rollbackDeployment, setRollbackDeployment] = useState<Deployment | null>(null);
  const [isTriggerOpen, setIsTriggerOpen] = useState(false);

  const loadData = async () => {
    try {
      const [d, p] = await Promise.all([api.getDeployments(), api.getProjects()]);
      setDeployments(d);
      setProjects(p);
    } catch {
      // Safe fallbacks
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRollback = async () => {
    if (!rollbackDeployment) return;
    try {
      await api.rollbackDeployment({
        deployment_id: rollbackDeployment.id,
        target_environment: rollbackDeployment.environment,
      });
      loadData();
    } catch {
      // Handled
    }
  };

  const handleTriggerDeploy = async (data: {
    project_id: string;
    environment: string;
    branch: string;
    commit_message: string;
  }) => {
    try {
      await api.triggerDeployment(data);
      loadData();
    } catch {
      // Handled
    }
  };

  const filteredDeployments = deployments.filter((d) => {
    const matchesSearch =
      !search ||
      d.project_name.toLowerCase().includes(search.toLowerCase()) ||
      d.commit_message.toLowerCase().includes(search.toLowerCase()) ||
      d.commit_hash.includes(search) ||
      d.author.toLowerCase().includes(search.toLowerCase());

    const matchesEnv = environmentFilter === 'all' || d.environment.toLowerCase() === environmentFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || d.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesEnv && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="size-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Deployment Pipeline</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time tracking of builds, rollouts, commit histories, and edge traffic routing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsTriggerOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
        >
          <Plus size={14} /> Trigger Deployment
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search commits, branches, authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Environment Filter */}
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="preview">Preview</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="building">Building</option>
            <option value="rolled back">Rolled Back</option>
            <option value="failed">Failed</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-white"
            title="Refresh deployments"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Deployments Table Card */}
      <Card variant="glass" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Deployment ID</th>
                <th className="px-6 py-3.5">Target Service</th>
                <th className="px-6 py-3.5">Environment</th>
                <th className="px-6 py-3.5">Commit & Branch</th>
                <th className="px-6 py-3.5">Author</th>
                <th className="px-6 py-3.5">Duration / Started</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDeployments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 italic">
                    No deployments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDeployments.map((dep) => (
                  <tr
                    key={dep.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => setSelectedDeployment(dep)}
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{dep.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{dep.project_name}</span>
                        {dep.url && (
                          <a
                            href={dep.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <EnvironmentBadge env={dep.environment} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{dep.commit_hash}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-slate-500 dark:text-slate-400">{dep.branch}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5 font-normal">
                        {dep.commit_message}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{dep.author}</td>
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
                        >
                          <Terminal size={12} />
                          <span>Logs</span>
                        </button>
                        {dep.status === 'Success' && (
                          <button
                            type="button"
                            onClick={() => setRollbackDeployment(dep)}
                            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
                            title="Instant rollback"
                          >
                            <RotateCcw size={11} />
                            <span>Rollback</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

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

      {/* Trigger Deploy Modal */}
      <TriggerDeployModal
        isOpen={isTriggerOpen}
        onClose={() => setIsTriggerOpen(false)}
        projects={projects}
        onSubmit={handleTriggerDeploy}
      />
    </div>
  );
}
