import React, { useState, useEffect } from 'react';
import { 
  FolderPlus,
  Loader,
  CheckCircle2,
  XCircle,
  FileText,
  Terminal,
  Layers,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Code,
  FolderOpen,
  Activity
} from 'lucide-react';
import FolderPickerModal from './FolderPickerModal';

export default function BootstrapPanel() {
  const [folderPath, setFolderPath] = useState('');
  const [stack, setStack] = useState('react');
  const [docker, setDocker] = useState(true);
  const [k8s, setK8s] = useState(true);
  const [cicd, setCicd] = useState(true);
  
  // Status states: 'idle', 'loading', 'success', 'error'
  const [status, setStatus] = useState('idle');
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [resolvedPath, setResolvedPath] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [bootstrapLogs, setBootstrapLogs] = useState([]);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  useEffect(() => {
    // Dynamically retrieve the current host path on startup to initialize path input
    fetch('http://localhost:3030/api/agent/browse')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setFolderPath(data.currentPath);
        }
      })
      .catch(() => {
        // Fallback if agent is not running yet
        setFolderPath('C:/');
      });
  }, []);

  const addLog = (level, msg) => {
    const time = new Date().toTimeString().split(' ')[0];
    setBootstrapLogs(prev => [...prev, { time, level, msg }]);
  };

  const handleBootstrap = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setBootstrapLogs([]);
    setGeneratedFiles([]);
    setMessage('');
    setResolvedPath('');
    setErrorDetails('');

    addLog('info', `Initializing project bootstrapper via Local Agent...`);
    addLog('info', `Target Workspace Folder Path: ${folderPath}`);
    addLog('info', `Project Stack: ${stack.toUpperCase()}`);
    addLog('info', `Blueprints - Docker: ${docker}, K8s: ${k8s}, CI/CD: ${cicd}`);

    const payload = {
      folderPath,
      stack,
      docker,
      k8s,
      cicd
    };

    try {
      addLog('info', 'Sending scaffolding request to Host Agent...');
      const response = await fetch('http://localhost:3030/api/agent/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Scaffolding failed on agent.');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setStatus('success');
        setGeneratedFiles(data.files || []);
        setMessage(data.message || 'Scaffolding completed successfully!');
        setResolvedPath(data.resolved_path || '');
        
        addLog('info', `Local Agent completed write operations on host disk.`);
        if (data.files && data.files.length > 0) {
          data.files.forEach(file => {
            addLog('success', `Created file natively: ${file}`);
          });
        }
        addLog('info', `Project successfully configured at host location: ${data.resolved_path}`);
      } else {
        throw new Error(data.message || 'Unknown agent scaffolding error');
      }

    } catch (err) {
      setStatus('error');
      setErrorDetails(err.message);
      addLog('error', `Scaffolding aborted: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Intro header */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <FolderPlus size={24} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 'bold' }}>
            Nexus Host Bootstrapper
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
          Scaffold containerization configs, Kubernetes blueprints, and automated CI/CD pipelines directly onto your host machine's directories. Browse your folders natively below and click generate.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Scaffolding Form Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Wrench size={18} /> Scaffolding Configuration
            </h3>
          </div>

          <form onSubmit={handleBootstrap} className="orch-form">
            <div className="form-group">
              <label>Target Workspace Folder Path</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={folderPath} 
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="e.g. d:/projects/my-new-app"
                  required
                  style={{ flexGrow: 1 }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsBrowseOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px' }}
                >
                  <FolderOpen size={16} /> Browse
                </button>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Specify any folder on your computer. Files will be created natively outside Docker.
              </span>
            </div>

            <div className="form-group">
              <label>Application Stack Template</label>
              <select value={stack} onChange={(e) => setStack(e.target.value)}>
                <option value="react">React SPA (Nginx & Node Builder)</option>
                <option value="node">Node.js API Microservice</option>
                <option value="docker">Generic Docker Stack</option>
                <option value="fullstack">Full-Stack Monorepo</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '8px 0' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Target Blueprints & Configs
              </label>

              {/* Docker Checkbox */}
              <label className="checkbox-container">
                Generate Docker Configs (Dockerfile, docker-compose.yml, prometheus.yml)
                <input 
                  type="checkbox" 
                  checked={docker} 
                  onChange={(e) => setDocker(e.target.checked)} 
                />
                <span className="checkmark"></span>
              </label>

              {/* Kubernetes Checkbox */}
              <label className="checkbox-container">
                Generate Kubernetes Manifests (deployment.yml, service.yml)
                <input 
                  type="checkbox" 
                  checked={k8s} 
                  onChange={(e) => setK8s(e.target.checked)} 
                />
                <span className="checkmark"></span>
              </label>

              {/* CI/CD Checkbox */}
              <label className="checkbox-container">
                Generate GitHub Actions CI/CD Workflow (ci-cd.yml)
                <input 
                  type="checkbox" 
                  checked={cicd} 
                  onChange={(e) => setCicd(e.target.checked)} 
                />
                <span className="checkmark"></span>
              </label>
            </div>

            <button 
              type="submit" 
              className="btn" 
              disabled={status === 'loading' || (!docker && !k8s && !cicd)}
              style={{ alignSelf: 'flex-start', marginTop: '12px' }}
            >
              {status === 'loading' ? (
                <>
                  <Loader className="spin" size={16} /> Scaffolding...
                </>
              ) : (
                <>
                  Generate templates on disk <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Console Logs / Scaffolding Results Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Status Display Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Scaffolding Status</h3>
              {status === 'idle' && <span className="badge info">Idle</span>}
              {status === 'loading' && <span className="badge warning"><Loader className="spin" size={12} /> Scaffolding</span>}
              {status === 'success' && <span className="badge success"><ShieldCheck size={12} /> Success</span>}
              {status === 'error' && <span className="badge danger"><XCircle size={12} /> Error</span>}
            </div>

            {status === 'idle' && (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Configure parameters and run the generator to output DevOps templates on your host system.
              </div>
            )}

            {status === 'error' && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', fontSize: '13px', color: 'var(--danger)' }}>
                <strong>Failed to scaffold project:</strong>
                <p style={{ marginTop: '4px', fontFamily: 'monospace' }}>{errorDetails}</p>
              </div>
            )}

            {status === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)' }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{message}</span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    SCAFFOLDED FILES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {generatedFiles.map((file, idx) => {
                      const isK8s = file.startsWith('k8s/');
                      const isWorkflow = file.startsWith('.github/');
                      const isCompose = file.includes('compose') || file.includes('prometheus');
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            padding: '8px 12px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '13px'
                          }}
                        >
                          {isWorkflow && <Code size={14} style={{ color: 'var(--primary)' }} />}
                          {isK8s && <Layers size={14} style={{ color: 'var(--info)' }} />}
                          {isCompose && <Activity size={14} style={{ color: 'var(--warning)' }} />}
                          {!isWorkflow && !isK8s && !isCompose && <FileText size={14} style={{ color: 'var(--text-secondary)' }} />}
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{file}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Resolved Folder Path:
                  <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', color: 'var(--text-primary)', marginTop: '4px', wordBreak: 'break-all' }}>
                    {resolvedPath}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper / Execution Logs */}
          {(status === 'loading' || status === 'success' || status === 'error' || bootstrapLogs.length > 0) && (
            <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Terminal size={16} /> Console Execution Logs
                </h3>
              </div>
              <div className="console-box" style={{ flexGrow: 1, minHeight: '150px', background: '#040711', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                {bootstrapLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Initializing logger...</div>
                ) : (
                  bootstrapLogs.map((log, i) => (
                    <div key={i} className={`console-line ${log.level}`}>
                      [{log.time}] [{log.level.toUpperCase()}] {log.msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Directory Browser Modal */}
      <FolderPickerModal
        isOpen={isBrowseOpen}
        onClose={() => setIsBrowseOpen(false)}
        onSelect={(selected) => {
          setFolderPath(selected);
          setIsBrowseOpen(false);
        }}
        initialPath={folderPath}
      />
    </div>
  );
}
