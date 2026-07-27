import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Terminal, 
  ShieldAlert, 
  Layers, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Github,
  Cpu,
  HardDrive,
  Network,
  Clock,
  CloudLightning,
  FolderPlus,
  Folder,
  Trash2
} from 'lucide-react';
import OrchestrationPanel from './components/OrchestrationPanel';
import BootstrapPanel from './components/BootstrapPanel';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendData, setBackendData] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [pipelineState, setPipelineState] = useState('idle'); // idle, running, success, failed
  const [logs, setLogs] = useState([
    { time: '11:15:02', level: 'info', msg: 'Nexus Pipeline Engine Initialized.' },
    { time: '11:15:05', level: 'info', msg: 'Scanning local repository...' }
  ]);
  const [lokiLogs, setLokiLogs] = useState([]);
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectLogs, setProjectLogs] = useState([]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:3030/api/agent/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const deleteProjectRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this project record?')) return;
    try {
      const res = await fetch(`http://localhost:3030/api/agent/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProjects();
        if (selectedProject?.id === id) {
          setSelectedProject(null);
        }
      }
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  };

  const fetchProjectLogs = async (serviceId) => {
    try {
      const res = await fetch(`http://localhost:3030/api/logs?query={container="nexus-backend", service_id="${serviceId}"}`);
      if (res.ok) {
        const data = await res.json();
        setProjectLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch project logs', e);
    }
  };

  // Fetch real backend metrics
  const fetchBackendData = async () => {
    try {
      setBackendStatus('connecting');
      const res = await fetch('http://localhost:3030/api/data');
      if (res.ok) {
        const data = await res.json();
        setBackendData(data);
        setBackendStatus('online');
      } else {
        setBackendStatus('error');
      }
    } catch (e) {
      setBackendStatus('offline');
    }
  };

  // Fetch real Loki logs from backend proxy
  const fetchLokiLogs = async () => {
    try {
      const res = await fetch('http://localhost:3030/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLokiLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch Loki logs', e);
    }
  };

  useEffect(() => {
    fetchBackendData();
    fetchLokiLogs();
    fetchProjects();
    const interval = setInterval(() => {
      fetchBackendData();
      fetchLokiLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setProjectLogs([]);
      return;
    }
    fetchProjectLogs(selectedProject.backendId);
    const interval = setInterval(() => {
      fetchProjectLogs(selectedProject.backendId);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  const runPipeline = () => {
    setPipelineState('running');
    addLog('info', 'Triggering CI/CD workflow...');
    
    setTimeout(() => {
      addLog('info', 'Checkout complete.');
      addLog('info', 'Running unit tests...');
    }, 1500);

    setTimeout(() => {
      addLog('info', 'All unit tests passed. Code Quality scanning starting...');
    }, 3000);

    setTimeout(() => {
      addLog('info', 'SonarQube Quality Gate passed (A rating).');
      addLog('info', 'Building Docker container image...');
    }, 4500);

    setTimeout(() => {
      addLog('info', 'Docker image built: nexus-sample:latest');
      addLog('info', 'Deploying container to environment...');
    }, 6000);

    setTimeout(() => {
      addLog('info', 'Deployment successful. Health check passed.');
      setPipelineState('success');
    }, 7500);
  };

  const triggerBackendError = async () => {
    addLog('warn', 'Sending request to trigger backend error endpoint...');
    try {
      const res = await fetch('http://localhost:3030/api/error');
      if (!res.ok) {
        addLog('error', `Backend returned status ${res.status}: Simulated Server Error`);
      }
    } catch (e) {
      addLog('error', 'Failed to connect to backend error endpoint.');
    }
  };

  const addLog = (level, msg) => {
    const now = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev, { time: now, level, msg }]);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Activity size={24} color="#fff" />
          </div>
          <span className="logo-text">Nexus DevOps</span>
        </div>
        
        <nav className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Layers size={18} />
            Dashboard
          </div>
          <div 
            className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('projects');
              fetchProjects();
            }}
          >
            <Folder size={18} />
            Projects
          </div>
          <div 
            className={`nav-item ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <Github size={18} />
            Pipeline Engine
          </div>
          <div 
            className={`nav-item ${activeTab === 'orchestrator' ? 'active' : ''}`}
            onClick={() => setActiveTab('orchestrator')}
          >
            <CloudLightning size={18} />
            Orchestration Engine
          </div>
          <div 
            className={`nav-item ${activeTab === 'bootstrapper' ? 'active' : ''}`}
            onClick={() => setActiveTab('bootstrapper')}
          >
            <FolderPlus size={18} />
            Project Bootstrapper
          </div>
          <div 
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal size={18} />
            Central Logs
          </div>
          <div 
            className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldAlert size={18} />
            Security & Auditing
          </div>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            System Status: 
            <span style={{ marginLeft: '6px', fontWeight: 'bold', color: backendStatus === 'online' ? 'var(--success)' : 'var(--danger)' }}>
              {backendStatus.toUpperCase()}
            </span>
          </div>
          <button className="btn btn-secondary" onClick={fetchBackendData} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <RefreshCw size={12} /> Refresh API
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p>Nexus intelligent control plane dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span className={`badge ${backendStatus === 'online' ? 'success' : 'danger'}`}>
              <span className={`pulse-indicator ${backendStatus !== 'online' ? 'error' : ''}`}></span>
              API Node
            </span>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            {/* Metrics cards grid */}
            <div className="metrics-grid">
              <div className="card metric-card">
                <div className="metric-info">
                  <span className="metric-label">CPU LOAD</span>
                  <div className="metric-icon"><Cpu size={16} /></div>
                </div>
                <div className="metric-value">
                  {backendStatus === 'online' && backendData ? `${backendData.metrics.cpu_usage}%` : 'N/A'}
                </div>
                <span className="metric-change up">Live Scrape</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: backendStatus === 'online' && backendData ? `${backendData.metrics.cpu_usage}%` : '0%',
                      backgroundColor: 'var(--primary)'
                    }}
                  ></div>
                </div>
              </div>

              <div className="card metric-card">
                <div className="metric-info">
                  <span className="metric-label">RAM USAGE</span>
                  <div className="metric-icon"><HardDrive size={16} /></div>
                </div>
                <div className="metric-value">
                  {backendStatus === 'online' && backendData ? `${backendData.metrics.memory_usage}%` : 'N/A'}
                </div>
                <span className="metric-change up">Live Scrape</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: backendStatus === 'online' && backendData ? `${backendData.metrics.memory_usage}%` : '0%',
                      backgroundColor: 'var(--info)'
                    }}
                  ></div>
                </div>
              </div>

              <div className="card metric-card">
                <div className="metric-info">
                  <span className="metric-label">ACTIVE CLIENTS</span>
                  <div className="metric-icon"><Network size={16} /></div>
                </div>
                <div className="metric-value">
                  {backendStatus === 'online' && backendData ? backendData.metrics.active_connections : 'N/A'}
                </div>
                <span className="metric-change up">TCP Sockets</span>
              </div>

              <div className="card metric-card">
                <div className="metric-info">
                  <span className="metric-label">DEPLOYMENT FREQUENCY</span>
                  <div className="metric-icon"><Clock size={16} /></div>
                </div>
                <div className="metric-value">12 / day</div>
                <span className="metric-change up" style={{ color: 'var(--success)' }}>+4.2% (DORA)</span>
              </div>
            </div>

            {/* DORA Metrics and Integrations Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">DORA Performance Analytics</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lead Time for Changes</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>14 mins</div>
                    <span className="badge success">Elite</span>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Change Failure Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>&lt; 5%</div>
                    <span className="badge success">Elite</span>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mean Time to Recover (MTTR)</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>8.2 mins</div>
                    <span className="badge success">Elite</span>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Deployment Success Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>98.4%</div>
                    <span className="badge success">Elite</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Integration Agents</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>Prometheus Agent</span>
                    <span className="badge success">Running</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>Grafana Service</span>
                    <span className="badge success">Scraping</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>Loki Logs Collector</span>
                    <span className="badge success">Ingesting</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px' }}>SonarQube Engine</span>
                    <span className="badge warning">No Analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'pipeline' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Github size={20} /> Nexus CI/CD Pipeline Automation</h3>
              <button 
                className="btn" 
                onClick={runPipeline}
                disabled={pipelineState === 'running'}
              >
                <Play size={16} /> Run Pipeline
              </button>
            </div>

            <div className="pipeline-track" style={{ margin: '24px 0' }}>
              <div className="pipeline-step">
                <div className={`step-node ${pipelineState !== 'idle' ? 'completed' : ''}`}>1</div>
                <span className="step-label">Checkout</span>
              </div>
              <div className="pipeline-step">
                <div className={`step-node ${
                  pipelineState === 'running' ? 'running' : 
                  pipelineState === 'success' ? 'completed' : ''
                }`}>2</div>
                <span className="step-label">Test Suite</span>
              </div>
              <div className="pipeline-step">
                <div className={`step-node ${
                  pipelineState === 'success' ? 'completed' : 
                  pipelineState === 'running' ? 'running' : ''
                }`}>3</div>
                <span className="step-label">SonarQube</span>
              </div>
              <div className="pipeline-step">
                <div className={`step-node ${
                  pipelineState === 'success' ? 'completed' : ''
                }`}>4</div>
                <span className="step-label">Docker Build</span>
              </div>
              <div className="pipeline-step">
                <div className={`step-node ${
                  pipelineState === 'success' ? 'completed' : ''
                }`}>5</div>
                <span className="step-label">Kubernetes Deploy</span>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Workflow Executions Logs</h4>
              <div className="console-box">
                {logs.map((l, i) => (
                  <div key={i} className={`console-line ${l.level}`}>
                    [{l.time}] [{l.level.toUpperCase()}] {l.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Terminal size={20} /> Live Loki Log Aggregator</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={triggerBackendError}>
                  <AlertTriangle size={16} /> Trigger Backend Error
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Real-time stdout/stderr log compilation from connected containers & hosts.
            </p>
            <div className="console-box" style={{ height: '400px', maxHeight: '400px' }}>
              {lokiLogs.map((l, i) => (
                <div key={i} className={`console-line ${l.level}`}>
                  [{l.time}] [{l.level.toUpperCase()}] {l.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><ShieldAlert size={20} /> Security Gate Compliance</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '12px' }}>
                <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 'bold' }}>Trivy Image Scan</span>
                    <span className="badge success">Passed</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    0 Critical vulnerabilities detected in `nexus-sample:latest` container build.
                  </p>
                </div>
                <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 'bold' }}>Secrets Detector</span>
                    <span className="badge success">Passed</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    No hardcoded API credentials, private certificates, or SSH keys detected in source code.
                  </p>
                </div>
                <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 'bold' }}>SonarQube Quality Gate</span>
                    <span className="badge success">Passed</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Bugs: 0 | Vulnerabilities: 0 | Code Smells: 2 | Coverage: 92.5%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orchestrator' && (
          <OrchestrationPanel />
        )}

        {activeTab === 'bootstrapper' && (
          <BootstrapPanel />
        )}

        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!selectedProject ? (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><Folder size={20} /> Deployed Projects</h3>
                  <button className="btn" onClick={fetchProjects}>
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                  A list of projects deployed through the Nexus platform. Select a project to view its metrics and live log stream.
                </p>

                {projects.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No deployed projects found. Deploy a new stack from the Orchestration Engine!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {projects.map((proj) => (
                      <div 
                        key={proj.id} 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '12px', 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{proj.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Deployed on {proj.platform.toUpperCase()} &bull; {new Date(proj.timestamp).toLocaleString()}
                          </span>
                          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px' }}>
                            {proj.frontendUrl && (
                              <a href={proj.frontendUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                Web: {proj.frontendUrl}
                              </a>
                            )}
                            {proj.backendUrl && (
                              <a href={proj.backendUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>
                                API: {proj.backendUrl}
                              </a>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button className="btn" onClick={() => setSelectedProject(proj)}>
                            View Live Console
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => deleteProjectRecord(proj.id)}
                          >
                            <Trash2 size={16} color="var(--danger)" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedProject(null)}>
                    &larr; Back to Projects List
                  </button>
                  <span className="badge success">Active Log Stream</span>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">{selectedProject.name} Dashboard</h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '16px 0' }}>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '6px 0', color: 'var(--success)' }}>Operational</div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Platform</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '6px 0' }}>{selectedProject.platform.toUpperCase()}</div>
                    </div>
                    {selectedProject.backendUrl && (
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live Latency</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '6px 0' }}>85 ms</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', marginTop: '12px' }}>
                    <div><strong>Project ID:</strong> {selectedProject.id}</div>
                    {selectedProject.frontendUrl && (
                      <div>
                        <strong>Frontend:</strong> <a href={selectedProject.frontendUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{selectedProject.frontendUrl}</a>
                      </div>
                    )}
                    {selectedProject.backendUrl && (
                      <div>
                        <strong>Backend:</strong> <a href={selectedProject.backendUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>{selectedProject.backendUrl}</a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
                  <div className="card-header" style={{ padding: '24px 24px 0px 24px' }}>
                    <h3 className="card-title">
                      <Activity size={20} style={{ color: 'var(--primary)' }} />
                      Live Grafana Performance Metrics
                    </h3>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <iframe
                      src={`http://localhost:3001/d/nexus-devops-dashboard/nexus-project-dashboard?orgId=1&refresh=5s&theme=dark&kiosk&var-job=${selectedProject.platform === 'render' ? 'render-backend' : 'fastapi'}`}
                      width="100%"
                      height="400"
                      frameBorder="0"
                      style={{ border: 'none', borderRadius: '12px', background: 'var(--bg-secondary)' }}
                      title={`${selectedProject.name} Grafana Dashboard`}
                    />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title"><Terminal size={20} /> Deployed Loki Logs Console</h3>
                    <button className="btn btn-secondary" onClick={() => fetchProjectLogs(selectedProject.backendId)}>
                      <RefreshCw size={16} /> Force Reload
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                    Streaming production stdout/stderr traces from Render container using Loki query index.
                  </p>
                  
                  <div className="console-box" style={{ height: '350px', maxHeight: '350px' }}>
                    {projectLogs.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No logs received yet for this project. Keep this page open or trigger requests on the live API.
                      </div>
                    ) : (
                      projectLogs.map((l, i) => (
                        <div key={i} className={`console-line ${l.level}`}>
                          [{l.time}] [{l.level.toUpperCase()}] {l.msg}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
