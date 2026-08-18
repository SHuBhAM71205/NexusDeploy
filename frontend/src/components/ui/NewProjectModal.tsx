import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { FolderPickerModal } from './FolderPickerModal';
import { TokenPromptModal } from './TokenPromptModal';
import { 
  Terminal, 
  FolderOpen, 
  Lock, 
  Key, 
  ShieldCheck, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Github,
  HardDrive
} from 'lucide-react';
import { agentApi } from '../../services/agentApi';
import type { Project, Framework, EnvVar } from '../../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Partial<Project>) => void;
}

const cloudPlatforms = [
  { id: 'vercel', name: 'Vercel', type: 'Frontend & Serverless Edge', icon: '⚡' },
  { id: 'netlify', name: 'Netlify', type: 'Jamstack & Web Static', icon: '🌐' },
  { id: 'render', name: 'Render', type: 'Backend API & Cloud Workers', icon: '🚀' },
  { id: 'railway', name: 'Railway', type: 'Fullstack & Containers', icon: '🚂' },
];

const frameworkPresets: Record<
  Framework,
  { build: string; output: string; install: string; node: string }
> = {
  'React / Vite': { build: 'npm run build', output: 'dist', install: 'npm install', node: '20.x' },
  'Next.js': { build: 'npm run build', output: '.next', install: 'npm install', node: '20.x' },
  'Node.js / Express': { build: 'npm run build', output: 'dist', install: 'npm ci', node: '20.x' },
  'FastAPI / Python': { build: 'pip install -r requirements.txt', output: './', install: 'pip install -r requirements.txt', node: 'Python 3.12' },
  Go: { build: 'go build -o server .', output: './', install: 'go mod download', node: 'Go 1.22' },
  Rust: { build: 'cargo build --release', output: 'target/release', install: 'cargo check', node: 'Rust 1.78' },
  Vue: { build: 'npm run build', output: 'dist', install: 'npm install', node: '20.x' },
  'Static HTML': { build: 'echo "No build required"', output: './', install: 'echo "No install required"', node: 'None' },
};

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [step, setStep] = useState(1); // 1: Config, 2: Auth Tokens, 3: Deploy
  const [sourceType, setSourceType] = useState<'local' | 'github'>('local');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('vercel');
  const [repoUrl, setRepoUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [framework, setFramework] = useState<Framework>('React / Vite');
  const [rootDirectory, setRootDirectory] = useState('');
  const [buildCommand, setBuildCommand] = useState(frameworkPresets['React / Vite'].build);
  const [outputDir, setOutputDir] = useState(frameworkPresets['React / Vite'].output);
  const [installCommand, setInstallCommand] = useState(frameworkPresets['React / Vite'].install);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  // Folder picker & Token prompt modal states
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [promptProvider, setPromptProvider] = useState<string | null>(null);

  // Vault status
  const [vaultStatus, setVaultStatus] = useState<Record<string, boolean>>({
    github: false,
    vercel: false,
    netlify: false,
    render: false,
    railway: false,
  });
  const [tokens, setTokens] = useState<Record<string, string>>({});

  // Deploy execution states
  const [deployStatus, setDeployStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [deployLogs, setDeployLogs] = useState<Array<{ time: string; type: string; msg: string }>>([]);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDeployStatus('idle');
      setDeployLogs([]);
      setDeployedUrl(null);
      setDeployError(null);
      
      agentApi.browse().then((res) => {
        if (res?.currentPath) {
          setRootDirectory(res.currentPath);
          const folderName = res.currentPath.split(/[/\\]/).pop() || 'my-app';
          setName(folderName);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (rootDirectory && rootDirectory.length > 2) {
      agentApi.analyze(rootDirectory).then((res) => {
        if (res?.framework) {
          if (res.framework === 'react') {
            handleFrameworkChange('React / Vite');
            setPlatform('vercel');
          } else if (res.framework === 'node') {
            handleFrameworkChange('Node.js / Express');
            setPlatform('render');
          }
        }
      }).catch(() => {});

      agentApi.getGitStatus(rootDirectory).then((git) => {
        if (git?.branch) setGitBranch(git.branch);
        if (git?.remoteUrl) setRepoUrl(git.remoteUrl);
      }).catch(() => {});
    }
  }, [rootDirectory]);

  useEffect(() => {
    if (isOpen) {
      checkVaultStatus('github');
      checkVaultStatus(platform);
    }
  }, [isOpen, platform]);

  const checkVaultStatus = async (providerKey: string) => {
    try {
      const res = await agentApi.getCredentialStatus(providerKey);
      setVaultStatus((prev) => ({ ...prev, [providerKey]: res.exists }));
    } catch {
      setVaultStatus((prev) => ({ ...prev, [providerKey]: false }));
    }
  };

  const saveVaultCredential = async (providerKey: string, tokenValue: string) => {
    if (!tokenValue) return;
    try {
      await agentApi.saveCredential(providerKey, tokenValue);
      setVaultStatus((prev) => ({ ...prev, [providerKey]: true }));
      setTokens((prev) => ({ ...prev, [providerKey]: '' }));
    } catch (e: any) {
      alert(`Failed to save credential: ${e?.message || e}`);
    }
  };

  const handleFrameworkChange = (fw: Framework) => {
    setFramework(fw);
    const preset = frameworkPresets[fw];
    setBuildCommand(preset.build);
    setOutputDir(preset.output);
    setInstallCommand(preset.install);
  };

  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: '', value: '', target: 'all' }]);
  const removeEnvVar = (index: number) => setEnvVars((prev) => prev.filter((_, i) => i !== index));
  const updateEnvVar = (index: number, key: string, value: string) => {
    setEnvVars((prev) => prev.map((item, i) => (i === index ? { ...item, key, value } : item)));
  };

  const startDeployment = async () => {
    setStep(3);
    setDeployStatus('running');
    setDeployLogs([]);
    setDeployedUrl(null);
    setDeployError(null);

    agentApi.connectLogStream((log) => {
      setDeployLogs((prev) => [...prev, log]);

      if (log.msg.includes('Live URL:') || log.msg.includes('Deployment live:')) {
        const match = log.msg.match(/(https:\/\/\S+)/);
        const liveUrl = match ? match[1] : `https://${name.toLowerCase()}.nexusdeploy.app`;
        setDeployedUrl(liveUrl);
        setDeployStatus('success');
      } else if (log.msg.includes('failed') || log.msg.includes('aborted') || log.msg.includes('Error!')) {
        setDeployStatus('failed');
        setDeployError(log.msg);
      }
    });

    try {
      await agentApi.deploy({
        provider: platform,
        path: sourceType === 'local' ? rootDirectory : 'C:/',
        repository: sourceType,
        repoUrl: repoUrl || undefined,
        repoName: name || 'nexus-app',
        envVars: envVars.filter((ev) => ev.key.trim().length > 0).map((ev) => ({ key: ev.key.trim(), value: ev.value })),
      });

      onSubmit({
        name: name.trim() || 'nexus-app',
        platform,
        description: description.trim() || undefined,
        repo_url: repoUrl.trim() || 'https://github.com/nexusdeploy/demo-service',
        branch: gitBranch.trim() || 'main',
        framework,
        root_directory: rootDirectory.trim(),
        build_command: buildCommand,
        output_directory: outputDir,
        install_command: installCommand,
        environment_variables: envVars.filter((ev) => ev.key.trim().length > 0),
      });
    } catch (err: any) {
      setDeployStatus('failed');
      setDeployError(err?.response?.data?.message || err.message || 'Deployment execution failed.');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Deploy New Application"
        description="Select project source, input platform tokens, and trigger live cloud deployments."
        size="lg"
      >
        <div className="space-y-4">
          {/* Step Stepper Header */}
          <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            {[
              { num: 1, label: '1. Source & Platform' },
              { num: 2, label: '2. API Tokens & Credentials' },
              { num: 3, label: '3. Live Host Execution' },
            ].map((st) => (
              <div
                key={st.num}
                className={`text-left border-b-2 pb-1.5 transition text-xs ${
                  step === st.num
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300 font-bold'
                    : step > st.num
                    ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300 font-medium'
                    : 'border-transparent text-slate-400 dark:text-slate-600'
                }`}
              >
                {st.label}
              </div>
            ))}
          </div>

          {/* STEP 1: Source & Platform Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Project Name & Description */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Application Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ecommerce-backend"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Core customer API endpoint"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Source Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Where is your code located? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('local')}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs transition ${
                      sourceType === 'local'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/20 dark:text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400'
                    }`}
                  >
                    <HardDrive size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <div>Local Host Directory</div>
                      <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Folder on this machine</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('github')}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs transition ${
                      sourceType === 'github'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-600/20 dark:text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400'
                    }`}
                  >
                    <Github size={18} className="text-slate-900 dark:text-white" />
                    <div>
                      <div>GitHub Repository</div>
                      <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Remote git repo URL</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Path / Repo Input depending on Source Type */}
              {sourceType === 'local' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Local Folder Directory Path *</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. C:/Projects/my-app"
                      value={rootDirectory}
                      onChange={(e) => setRootDirectory(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIsFolderPickerOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <FolderOpen size={14} className="text-indigo-600 dark:text-indigo-400" /> Browse Path
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">GitHub Repository URL *</label>
                    <input
                      type="text"
                      required
                      placeholder="https://github.com/owner/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Git Branch</label>
                    <input
                      type="text"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Target Cloud Platform */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Cloud Platform *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {cloudPlatforms.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`rounded-xl border p-2.5 text-left transition ${
                        platform === p.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 font-bold dark:text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!name.trim() || (sourceType === 'local' && !rootDirectory.trim()) || (sourceType === 'github' && !repoUrl.trim())}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  Next: Input API Token <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Platform API Token Entry */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-950/40">
                <div className="flex items-start gap-2.5">
                  <Lock size={18} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Platform API Credentials Check
                    </p>
                    <p>
                      Nexus requires an API token to deploy to {platform.toUpperCase()}. Please enter your token below to authenticate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Token Card */}
              {['github', platform].map((provKey) => {
                const isSaved = vaultStatus[provKey];
                const provName = provKey === 'github' ? 'GitHub (VCS)' : cloudPlatforms.find((p) => p.id === provKey)?.name || provKey.toUpperCase();

                return (
                  <div key={provKey} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-indigo-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{provName} API Token</span>
                      </div>
                      {isSaved ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-semibold">
                          <ShieldCheck size={12} /> Saved in Host Vault
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 px-2.5 py-0.5 text-[10px] font-semibold">
                          Token Required
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        placeholder={`Paste your ${provName} API Token here...`}
                        value={tokens[provKey] || ''}
                        onChange={(e) => setTokens((prev) => ({ ...prev, [provKey]: e.target.value }))}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!tokens[provKey]}
                          onClick={() => saveVaultCredential(provKey, tokens[provKey])}
                          className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shrink-0"
                        >
                          Save Token
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromptProvider(provKey)}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shrink-0"
                        >
                          Open Modal
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Optional Environment Variables */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-950/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Environment Variables ({envVars.length})
                  </span>
                  <button
                    type="button"
                    onClick={addEnvVar}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    + Add Variable
                  </button>
                </div>
                {envVars.map((ev, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="KEY (e.g. DATABASE_URL)"
                      value={ev.key}
                      onChange={(e) => updateEnvVar(idx, e.target.value, ev.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="password"
                      placeholder="VALUE"
                      value={ev.value}
                      onChange={(e) => updateEnvVar(idx, ev.key, e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeEnvVar(idx)}
                      className="text-xs text-rose-500 font-bold px-1.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={startDeployment}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                >
                  Start Live Host Deployment <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Live Host Execution Log Stream */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {deployStatus === 'running' && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" />
                  )}
                  {deployStatus === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
                  {deployStatus === 'failed' && <XCircle size={18} className="text-rose-500" />}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {deployStatus === 'running'
                        ? 'Executing Live Deploy via Host Agent...'
                        : deployStatus === 'success'
                        ? 'Deployment Completed Successfully!'
                        : 'Deployment Failed'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Target: {platform.toUpperCase()} • {sourceType === 'local' ? rootDirectory : repoUrl}
                    </div>
                  </div>
                </div>

                {deployedUrl && (
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
                  >
                    <span>Visit Live App</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {deployError && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 text-xs">
                  <span className="font-bold">Error: </span> {deployError}
                </div>
              )}

              {/* Terminal Stream */}
              <div className="rounded-xl bg-slate-950 p-3.5 font-mono text-[11px] text-slate-300 h-60 overflow-y-auto space-y-1 border border-slate-800 shadow-inner">
                <div className="flex items-center gap-1.5 text-slate-500 pb-1.5 border-b border-slate-800 text-[10px]">
                  <Terminal size={12} /> Host Agent stdout / stderr stream
                </div>
                {deployLogs.length === 0 ? (
                  <div className="text-slate-500 italic py-2">Connecting to host deployment agent stdout stream...</div>
                ) : (
                  deployLogs.map((lg, idx) => (
                    <div
                      key={idx}
                      className={`leading-relaxed ${
                        lg.type === 'error'
                          ? 'text-rose-400 font-semibold'
                          : lg.type === 'success'
                          ? 'text-emerald-400 font-bold'
                          : lg.type === 'warn'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      [{lg.time}] [{lg.type ? lg.type.toUpperCase() : 'INFO'}] {lg.msg}
                    </div>
                  ))
                )}
              </div>

              {/* Finish Actions */}
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <FolderPickerModal
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelectPath={(path) => setRootDirectory(path)}
        initialPath={rootDirectory}
      />

      {promptProvider && (
        <TokenPromptModal
          isOpen={Boolean(promptProvider)}
          onClose={() => setPromptProvider(null)}
          provider={promptProvider}
          onSuccess={() => {
            checkVaultStatus(promptProvider);
            setPromptProvider(null);
          }}
        />
      )}
    </>
  );
}
