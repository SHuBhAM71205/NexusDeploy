import { useState } from 'react';
import { Key, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ApiKeySecretModalProps {
  rawSecret: string | null;
  keyName: string;
  onClose: () => void;
}

export function ApiKeySecretModal({ rawSecret, keyName, onClose }: ApiKeySecretModalProps) {
  const [copied, setCopied] = useState(false);

  if (!rawSecret) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/30 bg-white p-6 shadow-2xl transition-colors duration-200 dark:border-amber-500/30 dark:bg-slate-900">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Key size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">API Key Generated</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Created live token for <span className="font-semibold text-slate-800 dark:text-slate-200">{keyName}</span>
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Save this secret key immediately.</span> For security reasons, you will not be able to reveal or view it again.
          </p>
        </div>

        {/* Secret Input Box */}
        <div className="mb-6 space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Secret API Token
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={rawSecret}
              className="w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2.5 pl-3 pr-24 text-xs font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Confirmation Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition shadow-md"
        >
          <ShieldCheck size={16} />
          <span>I Have Saved My Secret Key</span>
        </button>
      </div>
    </div>
  );
}
