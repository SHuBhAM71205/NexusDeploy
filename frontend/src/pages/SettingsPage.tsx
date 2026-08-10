import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Save,
  Check,
  Copy,
  Plus,
  Trash2,
  FolderGit2,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import type { WorkspaceSettings } from '../types';

export function SettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [name, setName] = useState('Acme Inc. Core Production');
  const [retentionDays, setRetentionDays] = useState(30);
  const [concurrency, setConcurrency] = useState(5);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await api.getSettings();
        setSettings(s);
        setName(s.name);
        setRetentionDays(s.log_retention_days || s.retention_days || 30);
        setConcurrency(s.concurrency_limit);
      } catch {
        // Safe fallbacks
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = await api.updateSettings({
        name,
        log_retention_days: retentionDays,
        concurrency_limit: concurrency,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // Handled
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const created = await api.createApiKey(newKeyName.trim());
      if (settings) {
        setSettings({
          ...settings,
          api_keys: [...(settings.api_keys || []), created],
        });
      }
      setNewKeyName('');
    } catch {
      // Handled
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      await api.deleteApiKey(id);
      if (settings) {
        setSettings({
          ...settings,
          api_keys: (settings.api_keys || []).filter((k) => k.id !== id),
        });
      }
    } catch {
      // Handled
    }
  };

  const handleCopy = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Workspace Settings</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure workspace boundaries, build concurrency, edge caches, and deployment API keys.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={14} />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Main Settings Form */}
        <div className="space-y-6">
          {/* General Workspace Info */}
          <Card variant="glass" className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">General Settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Basic metadata and identifiers for your organization.</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Workspace Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Build Concurrency Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value, 10) || 1)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Max parallel pipeline builds.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Log Retention (Days)</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 7)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Build & runtime logs lifetime.</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
                >
                  <Save size={14} /> Save Changes
                </button>
              </div>
            </form>
          </Card>

          {/* API Keys Manager */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">CI/CD API Keys</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tokens for authenticating GitHub Actions, GitLab CI, or CLI deployments.</p>
              </div>
            </div>

            {/* Existing Keys */}
            <div className="space-y-2 mb-4">
              {(settings?.api_keys || []).map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/80"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{key.name}</span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{key.masked_key}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                      Created {key.created_at}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(key.masked_key, key.id)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                      title="Copy Key"
                    >
                      {copiedKey === key.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteApiKey(key.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      title="Revoke Key"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Key Row */}
            <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <input
                type="text"
                placeholder="Key name (e.g. GitHub Actions Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleCreateApiKey}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                <Plus size={14} /> Create Key
              </button>
            </div>
          </Card>
        </div>

        {/* Right Info Widgets */}
        <div className="space-y-6">
          {/* Subscription Tier */}
          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plan Tier</span>
              <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-xs">
                {settings?.plan || 'Enterprise'}
              </span>
            </div>
            <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Global Edge Scale</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unlimited rollbacks, preview environments, and instant edge caching.</p>
            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Bandwidth:</span>
                <span className="text-slate-900 dark:text-white font-medium">10 TB / mo</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Edge Nodes:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">320+ PoPs</span>
              </div>
            </div>
          </Card>

          {/* Git Integrations */}
          <Card variant="glass" className="p-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Git Integrations
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  <FolderGit2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>GitHub</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 opacity-60">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  <FolderGit2 size={15} />
                  <span>GitLab</span>
                </div>
                <span className="text-[11px] text-slate-500">Not configured</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
