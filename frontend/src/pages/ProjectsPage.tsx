import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Plus,
  Search,
  ExternalLink,
  GitBranch,
  Rocket,
  Trash2,
  LayoutGrid,
  List,
  Layers,
  Clock,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { NewProjectModal } from '../components/ui/NewProjectModal';
import { TriggerDeployModal } from '../components/ui/TriggerDeployModal';
import { ProjectSettingsDrawer } from '../components/projects/ProjectSettingsDrawer';
import { api } from '../services/api';
import type { Project, EnvVar } from '../types';

const FRAMEWORK_FILTERS = ['All', 'React / Vite', 'Next.js', 'Node.js / Express', 'FastAPI / Python', 'Go'];

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deployTargetProject, setDeployTargetProject] = useState<Project | null>(null);
  const [configDrawerProject, setConfigDrawerProject] = useState<Project | null>(null);
  const [selectedEnvProject, setSelectedEnvProject] = useState<Project | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [envSaveNotice, setEnvSaveNotice] = useState<string | null>(null);
  const [isLoadingEnvVars, setIsLoadingEnvVars] = useState(false);
  const [isSavingEnvVars, setIsSavingEnvVars] = useState(false);

  const loadProjects = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setProjects(await api.getProjects());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load projects.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = (data: Partial<Project>) => {
    return api.createProject(data);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(id);
      loadProjects();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to delete project.');
    }
  };

  const handleOpenEnvModal = async (project: Project) => {
    setSelectedEnvProject(project);
    setEnvVars([]);
    setEnvSaveNotice(null);
    setIsLoadingEnvVars(true);
    try {
      const variables = await api.getEnvVars(project.id);
      setEnvVars(variables);
    } catch (error) {
      setEnvSaveNotice(error instanceof Error ? error.message : 'Unable to load provider environment variables.');
    } finally {
      setIsLoadingEnvVars(false);
    }
  };

  const handleSaveEnvVars = async () => {
    if (!selectedEnvProject) return;
    setIsSavingEnvVars(true);
    try {
      const response = await api.updateEnvVars(selectedEnvProject.id, envVars);
      setEnvVars(response);
      setEnvSaveNotice(`Synced ${response.length} variables to ${selectedEnvProject.platform}. Changes apply on the next deployment.`);
    } catch (error) {
      setEnvSaveNotice(error instanceof Error ? error.message : 'Unable to submit environment variables.');
    } finally {
      setIsSavingEnvVars(false);
    }
  };

  const handleAddEnv = () => {
    if (!newKey.trim()) return;
    setEnvVars([...envVars, { key: newKey.trim(), value: newValue.trim(), target: 'all', is_secret: true }]);
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveEnv = async (index: number) => {
    const variable = envVars[index];
    if (selectedEnvProject && variable.id) {
      setIsSavingEnvVars(true);
      try {
        await api.deleteEnvVar(selectedEnvProject.id, variable.id);
      } catch (error) {
        setEnvSaveNotice(error instanceof Error ? error.message : 'Unable to delete provider environment variable.');
        setIsSavingEnvVars(false);
        return;
      }
      setIsSavingEnvVars(false);
    }
    setEnvVars((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const normalize = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !search ||
      [p.name, p.description, p.framework].some((f) => f && normalize(f).includes(normalize(search)));
    const matchesFw = selectedFramework === 'All' || normalize(p.framework).includes(normalize(selectedFramework));
    return matchesSearch && matchesFw;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="size-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Projects & Services</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your deployed microservices, frontend applications, and API gateways.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project name or framework..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Framework Filter Pills & View Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            {FRAMEWORK_FILTERS.map((fw) => (
              <button
                key={fw}
                type="button"
                onClick={() => setSelectedFramework(fw)}
                className={`rounded-lg px-3 py-1 font-medium transition ${
                  selectedFramework === fw
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {fw}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-400'}`}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid / List */}
      {loadError ? (
        <Card variant="glass" className="p-8 text-center" role="alert">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Projects could not be loaded</h3>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{loadError}</p>
          <button type="button" onClick={loadProjects} className="mt-4 rounded-lg border px-3 py-1.5 text-xs">Retry</button>
        </Card>
      ) : isLoading ? (
        <Card variant="glass" className="p-8 text-center text-xs text-slate-500">Loading projects...</Card>
      ) : filteredProjects.length === 0 ? (
        <Card variant="glass" className="p-12 text-center">
          <Boxes size={36} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No projects found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {projects.length === 0 ? 'Create a project to get started.' : 'Try adjusting your search or framework filter.'}
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => (
            <Card
              key={proj.id}
              variant="interactive"
              className="flex flex-col justify-between p-6 relative group"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{proj.name}</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 font-medium">{proj.framework || 'Framework unavailable'}</p>
                  </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 text-xs font-medium">
                    {proj.status}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>

                {/* Info Pills */}
                <div className="mt-5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                      <GitBranch size={13} /> Branch
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{proj.branch}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                      <Clock size={13} /> Last Deployed
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{proj.last_deployed_at ? new Date(proj.last_deployed_at).toLocaleString() : 'No deployments'}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                      <Layers size={13} /> Total Builds
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{proj.total_deploys}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Activity size={12} />
                    <span>Dashboard</span>
                  </button>
                  {proj.production_url && (
                    <a
                      href={proj.production_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-400 dark:hover:bg-slate-800"
                    >
                      <span>Visit</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfigDrawerProject(proj)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition"
                    title="Project Settings & Build Config"
                  >
                    <Settings size={12} />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDeployTargetProject(proj)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-600/30"
                  >
                    <Rocket size={12} />
                    <span>Deploy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(proj.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition"
                    title="Delete Project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card variant="glass" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:bg-slate-950/60 dark:text-slate-400 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Project Name</th>
                  <th className="px-6 py-3.5">Framework</th>
                  <th className="px-6 py-3.5">Branch</th>
                  <th className="px-6 py-3.5">Last Deployed</th>
                  <th className="px-6 py-3.5">Deploys</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{p.name}</span>
                        {p.production_url && (
                          <a
                            href={p.production_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm font-normal">{p.description || 'No description provided.'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono">{p.framework || 'Unavailable'}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{p.branch}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.last_deployed_at ? new Date(p.last_deployed_at).toLocaleString() : 'No deployments'}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono font-medium">{p.total_deploys}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEnvModal(p)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Env
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeployTargetProject(p)}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
                        >
                          Deploy
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Environment Variables Modal */}
      {selectedEnvProject && (
        <Modal
          isOpen={Boolean(selectedEnvProject)}
          onClose={() => setSelectedEnvProject(null)}
          title={`Environment Variables • ${selectedEnvProject.name}`}
          description="Manage runtime secrets and configuration keys for your application."
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Variables are synchronized with the connected provider. Stored values are never returned.</p>
            {isLoadingEnvVars && <p role="status" className="text-xs text-slate-500">Loading provider variables...</p>}
            {envSaveNotice && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{envSaveNotice}</p>}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {envVars.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-3 text-center">No environment variables set yet.</p>
              ) : (
                envVars.map((env, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                    <span className="flex-1 font-mono text-xs text-indigo-700 dark:text-indigo-300 font-semibold">{env.key}</span>
                    <span className="flex-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {env.id ? 'Stored in provider' : showSecrets[env.key] ? env.value : '••••••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSecrets({ ...showSecrets, [env.key]: !showSecrets[env.key] })}
                      disabled={Boolean(env.id)}
                      className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      title="Toggle Visibility"
                    >
                      {showSecrets[env.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveEnv(idx)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new env row */}
            <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <input
                type="text"
                placeholder="VARIABLE_NAME"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
              />
              <input
                type="password"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={handleAddEnv}
                className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setSelectedEnvProject(null)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEnvVars}
                disabled={isLoadingEnvVars || isSavingEnvVars}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
              >
                Save Variables
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateProject}
        onRefresh={loadProjects}
      />

      {/* Trigger Deploy Modal */}
      {deployTargetProject && (
        <TriggerDeployModal
          isOpen={Boolean(deployTargetProject)}
          onClose={() => setDeployTargetProject(null)}
          projects={projects}
          selectedProjectId={deployTargetProject.id}
          onSubmit={api.triggerDeployment}
          onRefresh={loadProjects}
        />
      )}

      {/* Project Settings & Env Drawer */}
      <ProjectSettingsDrawer
        project={configDrawerProject}
        onClose={() => setConfigDrawerProject(null)}
        onSaved={loadProjects}
      />
    </div>
  );
}
