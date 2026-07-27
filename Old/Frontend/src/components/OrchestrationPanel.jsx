import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  CloudLightning, 
  Settings, 
  Folder, 
  GitBranch, 
  Globe, 
  Check, 
  ArrowRight,
  Loader,
  ExternalLink,
  ShieldCheck,
  Play,
  Layers,
  Activity,
  Github,
  AlertTriangle,
  Lock,
  Key,
  Server,
  Sliders,
  CheckCircle2,
  XCircle,
  FolderOpen
} from 'lucide-react';
import FolderPickerModal from './FolderPickerModal';

const LOCAL_FALLBACK_PROVIDERS = {
  "github": {
    "name": "GitHub",
    "authType": "oauth",
    "capabilities": ["deploy", "logs", "rollback", "env", "ci_cd"],
    "fields": [],
    "capabilityProfile": {
      "Deploy": "❌",
      "Logs": "Actions",
      "Rollback": "Workflow rerun",
      "Env Vars": "Secrets",
      "Metrics": "CI metrics",
      "Domains": "❌"
    }
  },
  "vercel": {
    "name": "Vercel",
    "authType": "oauth",
    "capabilities": ["deploy", "logs", "rollback", "env", "domains"],
    "fields": [
      {"name": "token", "label": "Vercel Access Token", "type": "password", "placeholder": "vcl_xxxxxxxxxxxxxxxxxxxx"}
    ],
    "capabilityProfile": {
      "Deploy": "✅",
      "Logs": "✅",
      "Rollback": "✅",
      "Env Vars": "✅",
      "Metrics": "Basic",
      "Domains": "✅"
    }
  },
  "netlify": {
    "name": "Netlify",
    "authType": "oauth",
    "capabilities": ["deploy", "logs", "rollback", "env", "domains"],
    "fields": [
      {"name": "token", "label": "Netlify Personal Access Token", "type": "password", "placeholder": "nfy_xxxxxxxxxxxxxxxxxxxx"}
    ],
    "capabilityProfile": {
      "Deploy": "✅",
      "Logs": "✅",
      "Rollback": "✅",
      "Env Vars": "✅",
      "Metrics": "Basic",
      "Domains": "✅"
    }
  },
  "render": {
    "name": "Render",
    "authType": "apikey",
    "capabilities": ["deploy", "logs", "services", "env", "domains"],
    "fields": [
      {"name": "token", "label": "Render API Key", "type": "password", "placeholder": "rnd_xxxxxxxxxxxxxxxxxxxx"}
    ],
    "capabilityProfile": {
      "Deploy": "✅",
      "Logs": "✅",
      "Rollback": "Limited",
      "Env Vars": "✅",
      "Metrics": "Limited",
      "Domains": "✅"
    }
  },
  "railway": {
    "name": "Railway",
    "authType": "apikey",
    "capabilities": ["deploy", "logs", "env", "domains"],
    "fields": [
      {"name": "token", "label": "Railway API Key", "type": "password", "placeholder": "raw_xxxxxxxxxxxxxxxxxxxx"}
    ],
    "capabilityProfile": {
      "Deploy": "✅",
      "Logs": "✅",
      "Rollback": "Depends",
      "Env Vars": "✅",
      "Metrics": "Basic",
      "Domains": "✅"
    }
  }
};

export default function OrchestrationPanel() {
  const [providers, setProviders] = useState(LOCAL_FALLBACK_PROVIDERS);
  
  // Wizard States
  const [wizardStep, setWizardStep] = useState(0); // 0: Intent, 1: Wizard Config, 2: Authentication, 3: Matrix, 4: Provision
  
  // Wizard Configuration State
  const [projectName, setProjectName] = useState('nexus-app');
  const [projectPath, setProjectPath] = useState('');
  const [gitInfo, setGitInfo] = useState(null);
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [frameworkInfo, setFrameworkInfo] = useState(null);
  
  const [selectedIntent, setSelectedIntent] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('github');
  const [selectedPlatform, setSelectedPlatform] = useState('vercel');
  const [selectedMonitoring, setSelectedMonitoring] = useState('prometheus');
  const [selectedCicd, setSelectedCicd] = useState('github');
  const [selectedNotifications, setSelectedNotifications] = useState('none');
  
  // Credentials and Vault state
  const [credentials, setCredentials] = useState({});
  const [vaultStatus, setVaultStatus] = useState({});
  const [editingProvider, setEditingProvider] = useState({});
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  // Automation Execution States
  const [status, setStatus] = useState('idle'); // 'idle', 'running', 'success', 'failed'
  const [orchLogs, setOrchLogs] = useState([]);
  const [activeSubStep, setActiveSubStep] = useState(0);
  const [links, setLinks] = useState(null);

  // Environment variables state
  const [envVarList, setEnvVarList] = useState([]);
  const addEnvVar = () => setEnvVarList(prev => [...prev, { key: '', value: '' }]);
  const removeEnvVar = (index) => setEnvVarList(prev => prev.filter((_, i) => i !== index));
  const updateEnvVar = (index, field, val) => {
    setEnvVarList(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  // Load default folder path from agent
  useEffect(() => {
    fetch('http://localhost:3030/api/agent/browse')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setProjectPath(data.currentPath);
          analyzeFolder(data.currentPath);
        }
      })
      .catch(() => setProjectPath('C:/'));
  }, []);

  // Fetch Providers from API (proxied through Agent)
  useEffect(() => {
    fetch('http://localhost:3030/api/providers')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch provider registry');
      })
      .then(data => {
        setProviders(data);
      })
      .catch(err => {
        console.warn("Using local fallback for provider registry:", err);
      });
  }, []);

  // Trigger keychain vault checks when entering credential step
  useEffect(() => {
    if (wizardStep === 2) {
      const active = getActiveProviders();
      active.forEach(p => {
        checkVaultStatus(p.key);
      });
    }
  }, [wizardStep]);

  const checkVaultStatus = async (providerKey) => {
    try {
      const res = await fetch(`http://localhost:3030/api/agent/credentials/${providerKey}`);
      const data = await res.json();
      setVaultStatus(prev => ({ ...prev, [providerKey]: data.exists }));
    } catch (err) {
      console.error(`Keychain query failed: ${err.message}`);
    }
  };

  const saveVaultCredential = async (providerKey, token) => {
    try {
      const res = await fetch('http://localhost:3030/api/agent/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerKey, token })
      });
      const data = await res.json();
      if (data.status === 'success') {
        checkVaultStatus(providerKey);
        setEditingProvider(prev => ({ ...prev, [providerKey]: false }));
      } else {
        alert(`Failed to save credential to local vault: ${data.message}`);
      }
    } catch (err) {
      alert(`Agent communication error: ${err.message}`);
    }
  };

  const handleOAuthConnect = (providerKey) => {
    const width = 500;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      `/oauth-mock.html?provider=${providerKey}`,
      `Nexus OAuth - ${providerKey}`,
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );

    const handleMessage = async (event) => {
      if (event.data && event.data.type === 'nexus-oauth-success' && event.data.provider === providerKey) {
        window.removeEventListener('message', handleMessage);
        await saveVaultCredential(providerKey, event.data.token);
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const analyzeFolder = async (path) => {
    if (!path) return;
    try {
      // 1. Analyze framework
      const resAnalysis = await fetch('http://localhost:3030/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const dataAnalysis = await resAnalysis.json();
      if (dataAnalysis.status === 'success') {
        setFrameworkInfo(dataAnalysis);
        setProjectName(path.split('/').pop() || 'nexus-app');
        // Auto-configure Intent based on detected framework
        if (dataAnalysis.framework === 'react') {
          setSelectedIntent('react');
          setSelectedPlatform('vercel');
        } else if (dataAnalysis.framework === 'node') {
          setSelectedIntent('node');
          setSelectedPlatform('render');
        }
      }

      // 2. Fetch Git information
      const resGit = await fetch('http://localhost:3030/api/agent/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const dataGit = await resGit.json();
      if (dataGit.status === 'success') {
        setGitInfo(dataGit);
        if (dataGit.remoteUrl) {
          setGitRepoUrl(dataGit.remoteUrl);
        }
      } else {
        setGitInfo(null);
      }
    } catch (err) {
      console.warn("Folder analysis unavailable:", err.message);
    }
  };

  const intents = [
    { id: 'react', title: 'Deploy a React App', desc: 'Deploy single page frontend applications with edge routing.', platforms: ['vercel', 'netlify'] },
    { id: 'node', title: 'Deploy a Node.js API', desc: 'Spin up scalable backend microservices and API controllers.', platforms: ['render', 'railway'] },
    { id: 'docker', title: 'Deploy a Docker Container', desc: 'Host containerized stacks using Compose or native registries.', platforms: ['railway'] },
    { id: 'fullstack', title: 'Deploy a Full Stack App', desc: 'Orchestrate multi-tier web projects with active database binding.', platforms: ['railway', 'render'] },
    { id: 'static', title: 'Deploy a Static Website', desc: 'Static asset deployment with CDN distribution.', platforms: ['vercel', 'netlify', 'render', 'railway'] }
  ];

  const wizardHeaders = [
    { title: "Intent Selection", desc: "Select your project's target" },
    { title: "Project Wizard", desc: "Configure stack properties" },
    { title: "Authentication", desc: "Connect provider accounts" },
    { title: "Capability Profile", desc: "Review platform matrix" },
    { title: "Provisioning", desc: "Track build & automation" }
  ];

  const getActiveProviders = () => {
    const list = [];
    if (selectedRepo === 'github' && providers['github']) {
      list.push({ key: 'github', role: "Version Control System", ...providers['github'] });
    }
    if (selectedPlatform && providers[selectedPlatform]) {
      list.push({ key: selectedPlatform, role: "Deployment Platform", ...providers[selectedPlatform] });
    }
    return list;
  };

  const handleIntentSelect = (intentId) => {
    setSelectedIntent(intentId);
    const intentObj = intents.find(i => i.id === intentId);
    if (intentObj && intentObj.platforms.length > 0) {
      setSelectedPlatform(intentObj.platforms[0]);
    }
    setWizardStep(1);
  };

  const handleDeploy = () => {
    setWizardStep(4);
    setStatus('running');
    setActiveSubStep(0);
    setOrchLogs([]);
    setLinks(null);

    // Setup WebSocket connection to stream build logs
    const ws = new WebSocket('ws://localhost:3030/api/agent/deploy/logs');

    ws.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setOrchLogs(prev => [...prev, `[${log.time || ''}] ${log.msg}`]);

      // Move stepper forward based on real log signatures
      if (log.msg.includes('Creating new GitHub repository') || log.msg.includes('Syncing local folder')) {
        setActiveSubStep(1);
      }
      else if (log.msg.includes('Initiating local build script') || log.msg.includes('npm run build')) {
        setActiveSubStep(2);
      }
      else if (log.msg.includes('Triggering Vercel Cloud') || log.msg.includes('Deploying directory') || log.msg.includes('npx netlify')) {
        setActiveSubStep(3);
      }
      else if (log.msg.includes('Live URL:') || log.msg.includes('Deployment live:')) {
        const match = log.msg.match(/(https:\/\/\S+)/);
        const deployUrl = match ? match[1] : 'https://vercel.com';
        
        setLinks({
          github: gitRepoUrl || 'https://github.com',
          deploy: deployUrl
        });
        setStatus('success');
        setActiveSubStep(4);
        ws.close();
      }
      else if (log.msg.includes('failed') || log.msg.includes('aborted') || log.msg.includes('Error!')) {
        setStatus('failed');
        ws.close();
      }
    };

    ws.onerror = (err) => {
      console.error("WS connection error:", err);
    };

    // Compile env variables list into object
    const envVarsMap = {};
    envVarList.forEach(item => {
      if (item.key.trim()) {
        envVarsMap[item.key.trim()] = item.value;
      }
    });

    // Trigger deployment via Agent
    fetch('http://localhost:3030/api/agent/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: selectedPlatform,
        path: projectPath,
        repository: selectedRepo,
        repoUrl: gitRepoUrl,
        repoName: projectName,
        envVars: envVarsMap
      })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Deployment execution failed to start.');
      }
      return res.json();
    })
    .then(data => {
      // Async process has started on the host; WebSocket handles state transitions dynamically
    })
    .catch(err => {
      setOrchLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      setStatus('failed');
      ws.close();
    });
  };

  const isCredentialsStepValid = () => {
    const active = getActiveProviders();
    for (let p of active) {
      if (!vaultStatus[p.key] && !credentials[p.key]?.token) {
        return false;
      }
    }
    return true;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Step Indicators Header */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: '0px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {wizardHeaders.map((header, idx) => {
            const isActive = idx === wizardStep;
            const isDone = idx < wizardStep;
            return (
              <div 
                key={idx} 
                style={{ 
                  borderBottom: `2px solid ${isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'transparent'}`,
                  paddingBottom: '8px',
                  opacity: isActive || isDone ? 1 : 0.4,
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: isDone ? 'var(--success)' : 'var(--text-secondary)' }}>
                  STEP 0{idx + 1} {isDone && '✓'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px', color: 'var(--text-primary)' }}>
                  {header.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: wizardStep === 4 ? '1fr' : '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column (Forms & Selection) */}
        <div>
          {/* STEP 1: Intent Selection */}
          {wizardStep === 0 && (
            <div className="card" style={{ minHeight: '450px' }}>
              <div className="card-header" style={{ marginBottom: '16px' }}>
                <h3 className="card-title" style={{ fontSize: '20px' }}>
                  <CloudLightning size={22} style={{ color: 'var(--primary)' }} />
                  Welcome to Nexus Onboarding
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                What do you want to accomplish today? Choose an intent, and Nexus will scaffold your stack.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {intents.map((item) => (
                  <div 
                    key={item.id}
                    className="orch-mode-card"
                    style={{ padding: '24px', cursor: 'pointer', height: '100%' }}
                    onClick={() => handleIntentSelect(item.id)}
                  >
                    <div className="title" style={{ fontSize: '17px', marginBottom: '6px' }}>{item.title}</div>
                    <div className="desc" style={{ fontSize: '13px', lineHeight: '1.4' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Project Wizard Stack Setup */}
          {wizardStep === 1 && (
            <div className="card" style={{ minHeight: '450px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Sliders size={20} />
                  Configure Project Parameters
                </h3>
                <button className="btn btn-secondary" onClick={() => setWizardStep(0)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Back
                </button>
              </div>

              <div className="orch-form" style={{ gap: '18px' }}>
                <div className="form-group">
                  <label>Select Project Folder</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      value={projectPath} 
                      onChange={e => {
                        setProjectPath(e.target.value);
                        analyzeFolder(e.target.value);
                      }} 
                      placeholder="Folder path..."
                      style={{ flexGrow: 1 }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setIsBrowseOpen(true)}
                    >
                      <FolderOpen size={16} /> Browse
                    </button>
                  </div>
                  
                  {/* Framework & Git status badges */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    {frameworkInfo && (
                      <span className="badge info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Server size={10} /> Framework: {frameworkInfo.framework.toUpperCase()}
                      </span>
                    )}
                    {gitInfo && (
                      <span className="badge success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <GitBranch size={10} /> Git: {gitInfo.branch} ({gitInfo.modified} modified)
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Repository Sync Target</label>
                  <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}>
                    <option value="github">GitHub</option>
                    <option value="none">None (Local Only)</option>
                  </select>
                </div>

                {selectedRepo === 'github' && (
                  <div className="form-group">
                    <label>GitHub Repository URL / Name</label>
                    <input 
                      type="text" 
                      value={gitRepoUrl} 
                      onChange={e => setGitRepoUrl(e.target.value)} 
                      placeholder="e.g. https://github.com/username/project or auto-create"
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {gitInfo?.remoteUrl ? `Auto-detected existing remote: ${gitInfo.remoteUrl}` : 'Leave empty to automatically create a new private GitHub repository.'}
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label>Deployment Host Target</label>
                  <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)}>
                    {intents.find(i => i.id === selectedIntent)?.platforms.map(p => (
                      <option key={p} value={p}>{providers[p]?.name || p}</option>
                    ))}
                  </select>
                </div>

                {/* Environment Variables Input Fields */}
                <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Environment Variables (Optional)
                  </label>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Variables will be written to .env locally and provisioned in the cloud environment.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {envVarList.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="KEY (e.g. API_KEY)"
                          value={item.key}
                          onChange={(e) => updateEnvVar(idx, 'key', e.target.value)}
                          style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                        />
                        <input
                          type="text"
                          placeholder="VALUE"
                          value={item.value}
                          onChange={(e) => updateEnvVar(idx, 'value', e.target.value)}
                          style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '10px 14px', fontSize: '13px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => removeEnvVar(idx)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '12px' }}
                      onClick={addEnvVar}
                    >
                      + Add Variable
                    </button>
                  </div>
                </div>

                <button 
                  className="btn" 
                  onClick={() => setWizardStep(2)}
                  style={{ alignSelf: 'flex-end', marginTop: '16px' }}
                >
                  Configure Credentials <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Dynamic Authentication */}
          {wizardStep === 2 && (
            <div className="card" style={{ minHeight: '450px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Lock size={20} />
                  Provision Integrations & Credentials
                </h3>
                <button className="btn btn-secondary" onClick={() => setWizardStep(1)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Back
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                Nexus requires authorization scopes to build and deploy. Credentials are encrypted natively on the host machine.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {getActiveProviders().map(provider => {
                  const isSaved = vaultStatus[provider.key];
                  const isEditing = editingProvider[provider.key];

                  return (
                    <div 
                      key={provider.key}
                      style={{ 
                        padding: '16px', 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ color: 'var(--primary)' }}>
                            <Key size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{provider.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{provider.role}</div>
                          </div>
                        </div>
                        <div>
                          {isSaved && !isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="badge success">🔒 Secured in OS Vault</span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => setEditingProvider(prev => ({ ...prev, [provider.key]: true }))}
                              >
                                Edit
                              </button>
                            </div>
                          ) : (
                            <span className="badge danger">Credentials Missing</span>
                          )}
                        </div>
                      </div>

                      {(!isSaved || isEditing) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                          {provider.authType === 'oauth' && (
                            <button 
                              type="button" 
                              className="btn"
                              style={{ 
                                background: 'linear-gradient(135deg, var(--primary), var(--info))', 
                                alignSelf: 'flex-start',
                                marginTop: '4px',
                                padding: '8px 16px',
                                fontSize: '13px'
                              }}
                              onClick={() => handleOAuthConnect(provider.key)}
                            >
                              <Github size={15} /> Connect Account via OAuth Popup
                            </button>
                          )}

                          {provider.fields && provider.fields.length > 0 && (
                            <>
                              {provider.authType === 'oauth' && (
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '2px' }}>
                                  Or configure Personal Access Token manually:
                                </div>
                              )}
                              {provider.fields.map(f => (
                                <div key={f.name} className="form-group" style={{ gap: '4px' }}>
                                  <label style={{ fontSize: '12px' }}>{f.label}</label>
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                      type={f.type}
                                      value={credentials[provider.key]?.[f.name] || ''}
                                      onChange={e => setCredentials(prev => ({
                                        ...prev,
                                        [provider.key]: {
                                          ...(prev[provider.key] || {}),
                                          [f.name]: e.target.value
                                        }
                                      }))}
                                      placeholder={f.placeholder}
                                      style={{ flexGrow: 1, padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                    <button 
                                      type="button" 
                                      className="btn"
                                      onClick={() => saveVaultCredential(provider.key, credentials[provider.key]?.[f.name])}
                                      disabled={!credentials[provider.key]?.[f.name]}
                                    >
                                      Save & Lock
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  className="btn" 
                  disabled={!isCredentialsStepValid()}
                  onClick={() => setWizardStep(3)}
                >
                  Evaluate Capability Profiles <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Capability Profile Matrix */}
          {wizardStep === 3 && (
            <div className="card" style={{ minHeight: '450px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <ShieldCheck size={20} />
                  Integrations Capability Profiles
                </h3>
                <button className="btn btn-secondary" onClick={() => setWizardStep(2)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Back
                </button>
              </div>
              
              <div style={{ overflowX: 'auto', marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px' }}>Provider Metric</th>
                      <th style={{ padding: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                        {providers[selectedPlatform]?.name} (Active)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Deploy', 'Logs', 'Rollback', 'Env Vars', 'Metrics', 'Domains'].map((feat, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{feat}</td>
                        <td style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.04)', fontWeight: 'bold' }}>
                          {providers[selectedPlatform]?.capabilityProfile?.[feat] || '✅'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <ShieldCheck style={{ color: 'var(--success)' }} />
                  <div style={{ fontSize: '13px' }}>Ready to launch build stack for <strong>{projectName}</strong>.</div>
                </div>
                <button 
                  className="btn" 
                  onClick={handleDeploy}
                  style={{ background: 'linear-gradient(135deg, var(--success), var(--primary))' }}
                >
                  <Play size={14} /> Provision Stack
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Wizard summary / Overview) */}
        {wizardStep !== 4 && (
          <div>
            <div className="card" style={{ minHeight: '450px' }}>
              <div className="card-header">
                <h3 className="card-title">Orchestration Overview</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>PROJECT CONTEXT</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '13px' }}>Name</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>{projectName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '13px' }}>Host Path</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', whiteSpace: 'nowrap' }}>
                      {projectPath}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>PLATFORMS & SERVICES</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '13px' }}>Deployment Target</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {providers[selectedPlatform]?.name || selectedPlatform}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 5: Provisioning Status & Console Logs */}
      {wizardStep === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Provisioning Pipeline Status</h3>
                {status === 'running' && <span className="badge info"><Loader className="spin" size={12} /> Executing</span>}
                {status === 'success' && <span className="badge success"><ShieldCheck size={12} /> Completed</span>}
                {status === 'failed' && <span className="badge danger"><AlertTriangle size={12} /> Failed</span>}
              </div>

              <div className="orch-stepper" style={{ marginTop: '12px' }}>
                {[
                  { title: 'Local Build Compilation', desc: 'Running compile / bundler script on host disk' },
                  { title: 'Provision Target Infrastructure', desc: `Transferring assets to deployment host: ${providers[selectedPlatform]?.name}` },
                  { title: 'Pipeline Check', desc: 'Sync telemetry hooks and health metrics' }
                ].map((s, idx) => {
                  let stepState = 'pending';
                  if (status === 'running') {
                    if (idx < activeSubStep) stepState = 'completed';
                    else if (idx === activeSubStep) stepState = 'active';
                  } else if (status === 'success') {
                    stepState = 'completed';
                  } else if (status === 'failed') {
                    if (idx < activeSubStep) stepState = 'completed';
                    else if (idx === activeSubStep) stepState = 'failed';
                  }

                  return (
                    <div key={idx} className={`orch-step ${stepState}`}>
                      <div className="step-circle">
                        {stepState === 'completed' ? <Check size={14} /> : stepState === 'failed' ? <XCircle size={14} /> : idx + 1}
                      </div>
                      <div className="step-details">
                        <div className="title">{s.title}</div>
                        <div className="desc">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Console Output logs */}
            <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3 className="card-title"><Terminal size={16} /> Live Build & Deploy Logs</h3>
                <button className="btn btn-secondary" onClick={() => setWizardStep(1)} style={{ padding: '4px 10px', fontSize: '11px' }}>
                  Configure New App
                </button>
              </div>
              <div className="console-box" style={{ flexGrow: 1, minHeight: '220px', background: '#040711', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                {orchLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Initializing execution engine...</div>
                ) : (
                  orchLogs.map((log, i) => <div key={i} className="console-line info">{log}</div>)
                )}
              </div>
            </div>
          </div>

          {/* Provisioned URLs & Links Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {links && (
              <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.03)' }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ color: 'var(--success)', fontSize: '18px' }}>
                    <ShieldCheck size={20} /> Provisioned Platform Resources
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Project Name</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{projectName}</span>
                  </div>
                  {links.deploy && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Deployed Site URL</span>
                      <a href={links.deploy} target="_blank" rel="noreferrer" className="btn" style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', background: 'var(--success)' }}>
                        Launch Site <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directory Browser Modal */}
      <FolderPickerModal
        isOpen={isBrowseOpen}
        onClose={() => setIsBrowseOpen(false)}
        onSelect={(selected) => {
          setProjectPath(selected);
          analyzeFolder(selected);
          setIsBrowseOpen(false);
        }}
        initialPath={projectPath}
      />
    </div>
  );
}
