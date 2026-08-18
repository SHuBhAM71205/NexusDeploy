import React, { useState } from 'react';
import { Modal } from './Modal';
import { KeyRound, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { agentApi } from '../../services/agentApi';

interface TokenPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string; // 'vercel', 'netlify', 'render', 'railway', 'github'
  onSuccess: () => void;
}

const PROVIDER_METADATA: Record<
  string,
  { name: string; icon: string; tokenName: string; guideUrl: string; placeholder: string }
> = {
  vercel: {
    name: 'Vercel',
    icon: '⚡',
    tokenName: 'Vercel Personal Access Token',
    guideUrl: 'https://vercel.com/account/tokens',
    placeholder: 'e.g. vercel_pat_...',
  },
  netlify: {
    name: 'Netlify',
    icon: '🌐',
    tokenName: 'Netlify Personal Access Token',
    guideUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    placeholder: 'e.g. nfp_...',
  },
  render: {
    name: 'Render',
    icon: '🚀',
    tokenName: 'Render API Key',
    guideUrl: 'https://dashboard.render.com/u/settings#api-keys',
    placeholder: 'rnd_...',
  },
  railway: {
    name: 'Railway',
    icon: '🚂',
    tokenName: 'Railway API Token',
    guideUrl: 'https://railway.com/dashboard/account/tokens',
    placeholder: 'rlw_...',
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    tokenName: 'GitHub Personal Access Token (repo scope)',
    guideUrl: 'https://github.com/settings/tokens',
    placeholder: 'ghp_...',
  },
};

export function TokenPromptModal({ isOpen, onClose, provider, onSuccess }: TokenPromptModalProps) {
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const info = PROVIDER_METADATA[provider.toLowerCase()] || {
    name: provider.toUpperCase(),
    icon: '🔑',
    tokenName: `${provider} Access Token`,
    guideUrl: '#',
    placeholder: 'Enter API Key / Token',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Token cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await agentApi.saveCredential(provider.toLowerCase(), token.trim());
      setSaving(false);
      setToken('');
      onSuccess();
    } catch (err: any) {
      setSaving(false);
      setError(err?.response?.data?.message || err?.message || 'Failed to save token to local keychain.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Authentication Required • ${info.name}`}
      description={`Enter your ${info.tokenName} to enable deployment to ${info.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-950/40">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                Stored securely on host machine
              </p>
              <p>
                Your API token is stored safely in your OS keychain via the local Agent process and is never uploaded to external servers.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>{info.icon}</span>
              <span>{info.tokenName} *</span>
            </label>
            {info.guideUrl !== '#' && (
              <a
                href={info.guideUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                <span>Get Token</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={info.placeholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving Token...' : 'Save Token & Continue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
