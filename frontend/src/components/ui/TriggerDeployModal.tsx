import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Play, GitBranch, MessageSquare, Key, HardDrive, ShieldCheck } from 'lucide-react';
import type { Project } from '../../types';
import { agentApi } from '../../services/agentApi';

interface TriggerDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProjectId?: string;
  onSubmit: (data: { project_id: string; environment: string; branch: string; commit_message: string }) => Promise<{ status: string; jobId: string; message: string }>;
  onRefresh: () => void;
}

export function TriggerDeployModal({
  isOpen,
  onClose,
  projects,
  selectedProjectId,
  onSubmit,
  onRefresh,
}: TriggerDeployModalProps) {
  const [projectId, setProjectId] = useState(selectedProjectId || (projects[0]?.id ?? ''));
  const [environment, setEnvironment] = useState('production');
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('Manual trigger from dashboard');

  const selectedProj = projects.find((p) => p.id === projectId) || projects[0];
  const [rootDirectory, setRootDirectory] = useState(selectedProj?.root_directory || './');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!jobId || jobStatus === 'success' || jobStatus === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const job = await agentApi.getDeploymentStatus(jobId);
        setJobStatus(job.status);
        if (job.status === 'success' || job.status === 'failed') {
          refreshRef.current();
        }
      } catch {
        // Keep polling through transient Agent errors.
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  useEffect(() => {
    if (selectedProj) {
      setRootDirectory(selectedProj.root_directory || './');
      const platformKey = selectedProj.platform || 'vercel';
      agentApi
        .getCredentialStatus(platformKey)
        .then((res) => {
          setTokenSaved(res.exists);
        })
        .catch(() => setTokenSaved(false));
    }
  }, [projectId, selectedProj]);

  const handleSaveToken = async () => {
    if (!tokenInput || !selectedProj) return;
    const platformKey = selectedProj.platform || 'vercel';
    setSavingToken(true);
    try {
      await agentApi.saveCredential(platformKey, tokenInput);
      setTokenSaved(true);
      setTokenInput('');
    } catch (e: any) {
      alert(`Error saving credential: ${e?.message || e}`);
    } finally {
      setSavingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = projectId || (projects[0]?.id ?? '');
    if (!pid) {
      setSubmitError('Select a project before triggering a deployment.');
      return;
    }

    setSubmitError(null);
    setJobId(null);
    setJobStatus(null);
    try {
      const job = await onSubmit({
        project_id: pid,
        environment,
        branch: branch || 'main',
        commit_message: commitMessage || 'Manual trigger',
      });
      if (!job.jobId) throw new Error('Agent did not return a deployment job ID.');
      setJobId(job.jobId);
      setJobStatus(job.status);
      refreshRef.current();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to start deployment.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trigger Instant Host Deployment"
      description="Select project target, confirm path/tokens, and trigger live cloud build."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {submitError}
          </div>
        )}
        {jobId && jobStatus && (
          <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            Deployment status: <strong className="capitalize">{jobStatus}</strong>
            {jobStatus === 'failed' && ' Check the deployment logs for the failure details.'}
          </div>
        )}
        {/* Target Project Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Target Project
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.framework} • {p.platform?.toUpperCase() || 'VERCEL'})
              </option>
            ))}
          </select>
        </div>

        {/* Source Folder / Repo Path */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <HardDrive size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Target Folder Path / Repo URL</span>
          </label>
          <input
            type="text"
            value={rootDirectory}
            onChange={(e) => setRootDirectory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Platform Token Section */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Key size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>{selectedProj?.platform?.toUpperCase() || 'PLATFORM'} API Token</span>
            </label>
            {tokenSaved ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={12} /> Saved in Vault
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Token Required
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder={`Enter API Token for ${selectedProj?.platform?.toUpperCase() || 'Provider'}...`}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              disabled={!tokenInput || savingToken}
              onClick={handleSaveToken}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {savingToken ? 'Saving...' : 'Save Token'}
            </button>
          </div>
        </div>

        {/* Environment & Branch */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Environment
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Branch
            </label>
            <div className="relative mt-1">
              <GitBranch
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Deployment Note
          </label>
          <div className="relative mt-1">
            <MessageSquare size={14} className="absolute left-3 top-3 text-slate-400" />
            <textarea
              rows={2}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Reason for triggering deploy..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Play size={13} /> Start Host Deployment
          </button>
        </div>
      </form>
    </Modal>
  );
}
