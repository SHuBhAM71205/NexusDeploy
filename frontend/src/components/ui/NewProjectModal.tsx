import React, { useState } from 'react';
import { Modal } from './Modal';
import { GitBranch, Terminal } from 'lucide-react';
import type { Project, Framework } from '../../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Partial<Project>) => void;
}

const frameworkPresets: Record<
  Framework,
  { build: string; output: string; install: string; node: string }
> = {
  'React / Vite': {
    build: 'npm run build',
    output: 'dist',
    install: 'npm install',
    node: '20.x',
  },
  'Next.js': {
    build: 'npm run build',
    output: '.next',
    install: 'npm install',
    node: '20.x',
  },
  'Node.js / Express': {
    build: 'npm run build',
    output: 'dist',
    install: 'npm ci',
    node: '20.x',
  },
  'FastAPI / Python': {
    build: 'pip install -r requirements.txt',
    output: './',
    install: 'pip install -r requirements.txt',
    node: 'Python 3.12',
  },
  Go: {
    build: 'go build -o server .',
    output: './',
    install: 'go mod download',
    node: 'Go 1.22',
  },
  Rust: {
    build: 'cargo build --release',
    output: 'target/release',
    install: 'cargo check',
    node: 'Rust 1.78',
  },
  Vue: {
    build: 'npm run build',
    output: 'dist',
    install: 'npm install',
    node: '20.x',
  },
  'Static HTML': {
    build: 'echo "No build required"',
    output: './',
    install: 'echo "No install required"',
    node: 'None',
  },
};

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [framework, setFramework] = useState<Framework>('React / Vite');
  const [rootDirectory, setRootDirectory] = useState('./');
  const [buildCommand, setBuildCommand] = useState(frameworkPresets['React / Vite'].build);
  const [outputDir, setOutputDir] = useState(frameworkPresets['React / Vite'].output);
  const [installCommand, setInstallCommand] = useState(frameworkPresets['React / Vite'].install);

  const handleFrameworkChange = (fw: Framework) => {
    setFramework(fw);
    const preset = frameworkPresets[fw];
    setBuildCommand(preset.build);
    setOutputDir(preset.output);
    setInstallCommand(preset.install);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      repo_url: repoUrl.trim() || 'https://github.com/nexusdeploy/demo-service',
      branch: branch.trim() || 'main',
      framework,
      root_directory: rootDirectory.trim() || './',
      build_command: buildCommand,
      output_directory: outputDir,
      install_command: installCommand,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Deploy a repository with zero-configuration build pipelines and edge routing."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name & Description */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. billing-microservice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Git Repository URL</label>
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
          <input
            type="text"
            placeholder="Brief purpose of this deployment service..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Framework Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Framework Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(frameworkPresets) as Framework[]).map((fw) => (
              <button
                key={fw}
                type="button"
                onClick={() => handleFrameworkChange(fw)}
                className={`rounded-xl border p-2.5 text-left text-xs transition ${
                  framework === fw
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-600/20 dark:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {fw}
              </button>
            ))}
          </div>
        </div>

        {/* Git Branch & Root Directory */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <GitBranch size={13} className="text-indigo-600 dark:text-indigo-400" /> Production Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Root Directory</label>
            <input
              type="text"
              value={rootDirectory}
              onChange={(e) => setRootDirectory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        {/* Build Settings Overrides */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Terminal size={14} className="text-indigo-600 dark:text-indigo-400" /> Build & Output Configuration
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400">Install Command</label>
              <input
                type="text"
                value={installCommand}
                onChange={(e) => setInstallCommand(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400">Build Command</label>
              <input
                type="text"
                value={buildCommand}
                onChange={(e) => setBuildCommand(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400">Output Directory</label>
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
          >
            Deploy Project
          </button>
        </div>
      </form>
    </Modal>
  );
}
