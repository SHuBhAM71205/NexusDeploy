import { useState, useEffect } from 'react';
import { Search, Boxes, Rocket, Settings, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project, Deployment } from '../../types';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  deployments: Deployment[];
}

export function CommandSearchModal({ isOpen, onClose, projects, deployments }: CommandSearchModalProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(
    (p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.framework.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredDeployments = deployments.filter(
    (d) =>
      !query ||
      d.project_name.toLowerCase().includes(query.toLowerCase()) ||
      d.commit_message.toLowerCase().includes(query.toLowerCase()) ||
      d.commit_hash.includes(query),
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm dark:bg-black/75" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search size={18} className="text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Search projects, deployments, actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
          />
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Quick Navigation */}
          <div>
            <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pages</p>
            <div className="space-y-0.5">
              <button
                onClick={() => handleSelect('/')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Rocket size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Overview Dashboard</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                onClick={() => handleSelect('/projects')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Boxes size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>All Projects & Services</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                onClick={() => handleSelect('/deployments')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Rocket size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Deployment History & Logs</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
              <button
                onClick={() => handleSelect('/settings')}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Workspace Settings & API Keys</span>
                </div>
                <ArrowRight size={13} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Projects</p>
              <div className="space-y-0.5">
                {filteredProjects.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(`/projects`)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <Boxes size={14} className="text-emerald-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">({p.framework})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{p.last_deployed_at || 'Active'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deployments */}
          {filteredDeployments.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Deployments</p>
              <div className="space-y-0.5">
                {filteredDeployments.slice(0, 3).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(`/deployments`)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{d.id}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{d.project_name}</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate text-[11px] max-w-[180px]">{d.commit_message}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0 font-medium">{d.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <span>Navigate with cursor or click</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
