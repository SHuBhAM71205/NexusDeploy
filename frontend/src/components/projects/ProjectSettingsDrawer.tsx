import { useState, useEffect } from 'react';
import { X, Settings, Key, Save, Plus, Trash2, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import type { Project, EnvVar } from '../../types';
import { api } from '../../services/api';

interface ProjectSettingsDrawerProps {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectSettingsDrawer({ project, onClose, onSaved }: ProjectSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'env'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // General fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [installCommand, setInstallCommand] = useState('');
  const [outputDirectory, setOutputDirectory] = useState('');
  const [rootDirectory, setRootDirectory] = useState('');
  const [nodeVersion, setNodeVersion] = useState('');
  const [branch, setBranch] = useState('');

  // Env vars field
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setBuildCommand(project.build_command || 'npm run build');
      setInstallCommand(project.install_command || 'npm install');
      setOutputDirectory(project.output_directory || 'dist');
      setRootDirectory(project.root_directory || './');
      setNodeVersion(project.node_version || '20.x');
      setBranch(project.branch || 'main');
      setEnvVars(project.environment_variables ? [...project.environment_variables] : []);
    }
  }, [project]);

  if (!project) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.updateProject(project.id, {
        name,
        description,
        build_command: buildCommand,
        install_command: installCommand,
        output_directory: outputDirectory,
        root_directory: rootDirectory,
        node_version: nodeVersion,
        branch,
      });
      showToast('Project build settings updated successfully!');
      onSaved();
    } catch {
      showToast('Failed to update project settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEnvVars = async () => {
    setIsSubmitting(true);
    try {
      await api.updateEnvVars(project.id, envVars);
      showToast('Environment variables saved!');
      onSaved();
    } catch {
      showToast('Failed to save environment variables');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEnvVar = () => {
    setEnvVars([
      ...envVars,
      { key: '', value: '', target: 'all', is_secret: false },
    ]);
  };

  const updateEnvVar = (index: number, field: keyof EnvVar, val: any) => {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: val };
    setEnvVars(updated);
  };

  const removeEnvVar = (index: number) => {
    const updated = envVars.filter((_, i) => i !== index);
    setEnvVars(updated);
  };

  const toggleSecretVisibility = (index: number) => {
    setVisibleSecrets((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden transition-colors duration-200">
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-14 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-3.5 py-2 text-xs font-semibold shadow-lg">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Settings size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{project.name}</h2>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                  {project.framework}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure build commands, root directory, and environment secrets.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-xs font-semibold transition ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings size={14} />
            <span>General Build Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 ml-6 text-xs font-semibold transition ${
              activeTab === 'env'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Key size={14} />
            <span>Environment Variables ({envVars.length})</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'general' ? (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    placeholder="npm run build"
                    className="w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Install Command
                  </label>
                  <input
                    type="text"
                    value={installCommand}
                    onChange={(e) => setInstallCommand(e.target.value)}
                    placeholder="npm install"
                    className="w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Root Directory
                  </label>
                  <input
                    type="text"
                    value={rootDirectory}
                    onChange={(e) => setRootDirectory(e.target.value)}
                    placeholder="./"
                    className="w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={outputDirectory}
                    onChange={(e) => setOutputDirectory(e.target.value)}
                    placeholder="dist"
                    className="w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Node / Runtime
                  </label>
                  <input
                    type="text"
                    value={nodeVersion}
                    onChange={(e) => setNodeVersion(e.target.value)}
                    placeholder="20.x"
                    className="w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Settings</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Environment variables are securely injected into your deployment container builds.
                </p>
                <button
                  type="button"
                  onClick={addEnvVar}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 transition"
                >
                  <Plus size={13} /> Add Variable
                </button>
              </div>

              {envVars.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No environment variables defined yet. Click "Add Variable" to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {envVars.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="KEY (e.g. DATABASE_URL)"
                          value={v.key}
                          onChange={(e) => updateEnvVar(idx, 'key', e.target.value.toUpperCase())}
                          className="flex-1 font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white uppercase focus:border-indigo-500 focus:outline-none"
                        />
                        <select
                          value={v.target || 'all'}
                          onChange={(e) => updateEnvVar(idx, 'target', e.target.value)}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="all">All Envs</option>
                          <option value="production">Production</option>
                          <option value="staging">Staging</option>
                          <option value="preview">Preview</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeEnvVar(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                          title="Delete variable"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={v.is_secret && !visibleSecrets[idx] ? 'password' : 'text'}
                          placeholder="VALUE"
                          value={v.value}
                          onChange={(e) => updateEnvVar(idx, 'value', e.target.value)}
                          className="w-full font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-2.5 pr-16 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateEnvVar(idx, 'is_secret', !v.is_secret)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              v.is_secret
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {v.is_secret ? 'SECRET' : 'PLAIN'}
                          </button>
                          {v.is_secret && (
                            <button
                              type="button"
                              onClick={() => toggleSecretVisibility(idx)}
                              className="text-slate-400 hover:text-slate-200 transition p-1"
                            >
                              {visibleSecrets[idx] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveEnvVars}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Environment Variables</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
