import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import type { Deployment } from '../../types';

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  deployment: Deployment | null;
  onConfirm: () => void;
}

export function RollbackModal({ isOpen, onClose, deployment, onConfirm }: RollbackModalProps) {
  if (!deployment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Instant Rollback"
      description="Zero-downtime traffic redirect to a previous deployment build."
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>
            You are about to roll back active production traffic for{' '}
            <strong>{deployment.project_name}</strong> to release <strong>{deployment.id}</strong> (
            {deployment.commit_hash}).
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5 font-mono dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Target Hash:</span>
            <span className="text-slate-900 dark:text-white font-medium">
              {deployment.commit_hash}
            </span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Commit Message:</span>
            <span className="text-slate-900 dark:text-white font-medium truncate max-w-[180px]">
              {deployment.commit_message}
            </span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Branch:</span>
            <span className="text-slate-900 dark:text-white font-medium">{deployment.branch}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Environment:</span>
            <span className="text-emerald-600 dark:text-emerald-400 uppercase font-semibold">
              {deployment.environment}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-purple-600/30 hover:bg-purple-500"
          >
            <RotateCcw size={13} /> Roll Back Now
          </button>
        </div>
      </div>
    </Modal>
  );
}
