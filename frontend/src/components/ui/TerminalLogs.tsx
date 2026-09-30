import { useState } from 'react';
import { Terminal, Copy, Check, Search } from 'lucide-react';
import type { LogLine, Deployment } from '../../types';
import { StatusBadge, EnvironmentBadge } from './Badge';

interface TerminalLogsProps {
  deployment: Deployment;
  onRollback?: (deploymentId: string) => void;
}

export function TerminalLogs({ deployment, onRollback }: TerminalLogsProps) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'overview'>('logs');

  const logs: LogLine[] = deployment.logs || [];

  const filteredLogs = logs.filter(
    (l) => !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.timestamp.includes(search),
  );

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-emerald-400 font-semibold';
      case 'warn':
        return 'text-amber-300';
      case 'error':
        return 'text-rose-400 font-semibold';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
            <Terminal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{deployment.id}</span>
              <StatusBadge status={deployment.status} />
              <EnvironmentBadge env={deployment.environment} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              commit <span className="text-indigo-600 dark:text-indigo-400 font-medium">{deployment.commit_hash || 'Unavailable'}</span> • {deployment.commit_message || 'No commit message'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRollback && deployment.status === 'success' && (
            <button
              type="button"
              onClick={() => onRollback(deployment.id)}
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
            >
              Rollback to this
            </button>
          )}
          {deployment.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
            >
              Visit URL ↗
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'logs'
                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Build Logs ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Artifacts & Runtime
          </button>
        </div>

        {activeTab === 'logs' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-36 sm:w-48 rounded-md border border-slate-200 bg-white py-1 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/80 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Copy all logs"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'logs' ? (
        <div className="relative max-h-[420px] min-h-[260px] overflow-y-auto rounded-xl border border-slate-800/90 bg-slate-950 p-4 font-mono text-xs shadow-inner">
          <div className="terminal-scanline" />
          <div className="space-y-1.5">
            {filteredLogs.length === 0 ? (
              <p className="text-slate-500 italic py-4 text-center">
                {logs.length === 0 ? 'No deployment logs are available.' : `No log lines matching "${search}"`}
              </p>
            ) : (
              filteredLogs.map((line, idx) => (
                <div key={idx} className="flex items-start gap-3 leading-relaxed hover:bg-slate-900/60 px-1 py-0.5 rounded">
                  <span className="text-slate-500 select-none">{line.timestamp}</span>
                  <span className={`uppercase font-semibold select-none text-[10px] px-1.5 py-0.2 rounded ${
                    line.level === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                    line.level === 'warn' ? 'bg-amber-500/20 text-amber-300' :
                    line.level === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {line.level}
                  </span>
                  <span className={getLevelColor(line.level)}>{line.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
          Build and runtime metrics are unavailable for this deployment.
        </p>
      )}
    </div>
  );
}
