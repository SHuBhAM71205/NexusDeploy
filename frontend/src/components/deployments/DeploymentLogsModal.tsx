import { useEffect, useState } from 'react';
import { X, Terminal, Copy, Check, Filter, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Deployment } from '../../types';
import { api } from '../../services/api';

interface DeploymentLogsModalProps {
  deployment: Deployment | null;
  onClose: () => void;
}

export function DeploymentLogsModal({ deployment: selectedDeployment, onClose }: DeploymentLogsModalProps) {
  const [copied, setCopied] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'success' | 'error'>('all');
  const [details, setDetails] = useState<Deployment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDeployment) {
      setDetails(null);
      return;
    }

    setDetails(selectedDeployment);
    setLoadError(null);
    let isActive = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const loadDetails = async () => {
      setIsLoading(true);
      try {
        const result = await api.getDeployment(selectedDeployment.id);
        if (!isActive) return;
        setDetails(result);
        setLoadError(null);
        if (result.status === 'success' || result.status === 'failed') {
          if (interval) clearInterval(interval);
        }
      } catch (error) {
        if (isActive) setLoadError(error instanceof Error ? error.message : 'Unable to load deployment details.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadDetails();
    if (selectedDeployment.status !== 'success' && selectedDeployment.status !== 'failed') {
      interval = setInterval(() => void loadDetails(), 3000);
    }

    return () => {
      isActive = false;
      if (interval) clearInterval(interval);
    };
  }, [selectedDeployment?.id]);

  if (!selectedDeployment) return null;
  const deployment = details || selectedDeployment;

  const logs = deployment.logs || [];

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level.toLowerCase() === filterLevel;
  });

  const handleCopyLogs = () => {
    const logText = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'warn':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'error':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {(isLoading || loadError) && (
          <div role={loadError ? 'alert' : 'status'} className="border-b border-slate-800 px-5 py-2 text-xs text-slate-400">
            {isLoading ? 'Loading deployment details...' : `Deployment details unavailable: ${loadError}`}
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Terminal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{deployment.project_name}</h3>
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                  {deployment.id}
                </span>
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300 capitalize">
                  {deployment.environment}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>
                  {deployment.commit_hash || 'Commit unavailable'}
                  {deployment.commit_message ? `: ${deployment.commit_message}` : ''}
                </span>
                <span>•</span>
                <span>by {deployment.author || 'Unknown author'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deployment.url && (
              <a
                href={deployment.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                <span>Visit Live App</span>
                <ExternalLink size={13} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3 bg-slate-900">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Filter Level:</span>
            {(['all', 'info', 'warn', 'success', 'error'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilterLevel(level)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                  filterLevel === level
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">
              {filteredLogs.length} / {logs.length} lines
            </span>
            <button
              type="button"
              onClick={handleCopyLogs}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs bg-[#090d16] space-y-2 select-text">
          <div className="text-slate-500 mb-3 flex items-center gap-2 text-[11px] pb-2 border-b border-slate-800/80">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Deployment logs</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 italic">
              {logs.length === 0 ? 'No deployment logs are available.' : 'No logs match the selected filter.'}
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 hover:bg-slate-900/60 p-1 rounded transition">
                <span className="shrink-0 text-slate-600 text-[11px] select-none w-20">{log.timestamp}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border uppercase leading-none ${getLevelColor(
                    log.level,
                  )}`}
                >
                  {log.level}
                </span>
                <span className="text-slate-200 break-all leading-relaxed">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
