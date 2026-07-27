import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Services
import { browseDirectory, analyzeDirectory } from './services/detector.js';
import { bootstrapProject } from './services/bootstrapper.js';
import { getGitStatus, createGitHubRepository, initializeAndPushRepository } from './services/git.js';
import { saveCredential, getCredential } from './services/keychain.js';
import { executeDeployment } from './services/deployer.js';
import { startRenderLogBridge } from './services/logbridge.js';
import { getProjects, saveProject, deleteProject } from './services/projects.js';

const execPromise = promisify(exec);

const getHostDomain = (url) => {
  try {
    return new URL(url).host;
  } catch (e) {
    return url.replace('https://', '').replace('http://', '').split('/')[0];
  }
};

const updatePrometheusConfig = async (backendUrl, onLog) => {
  const host = getHostDomain(backendUrl);
  const promPath = path.join(process.cwd(), '..', 'monitoring', 'prometheus.yml');
  
  if (!fs.existsSync(promPath)) {
    onLog('warn', `Prometheus config not found at ${promPath}. Skipping Prometheus reload.`);
    return;
  }
  
  let config = fs.readFileSync(promPath, 'utf8');
  if (config.includes(host)) {
    onLog('info', `Prometheus already configured to scrape ${host}.`);
    return;
  }
  
  onLog('info', `Updating Prometheus configuration to scrape live cloud API: ${host}...`);
  const newJob = `

  - job_name: 'render-backend'
    metrics_path: '/api/health'
    scheme: 'https'
    static_configs:
      - targets: ['${host}']`;
      
  fs.appendFileSync(promPath, newJob, 'utf8');
  onLog('success', `Prometheus configuration updated. Reloading Prometheus target container...`);
  
  // Reload prometheus by running docker restart
  try {
    await execPromise('docker restart nexus-prometheus');
    onLog('success', `Prometheus container restarted successfully. Live metrics scraping active!`);
  } catch (e) {
    onLog('warn', `Failed to restart Prometheus container via Docker: ${e.message}. Live metrics will reload on next container boot.`);
  }
};

const app = express();
const PORT = 3030;
const CORE_API_URL = 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Forward proxy to Docker Backend (Core)
const proxyToCore = async (req, res, targetPath) => {
  try {
    const url = `${CORE_API_URL}${targetPath}`;
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }
    const coreRes = await fetch(url, options);
    const contentType = coreRes.headers.get('content-type');
    
    res.status(coreRes.status);
    if (contentType && contentType.includes('application/json')) {
      const data = await coreRes.json();
      res.json(data);
    } else {
      const text = await coreRes.text();
      res.send(text);
    }
  } catch (err) {
    console.error(`Error proxying to core: ${err.message}`);
    res.status(502).json({ status: 'error', message: `Nexus Core unreachable: ${err.message}` });
  }
};

// Agent endpoints
app.get('/api/agent/status', (req, res) => {
  res.json({ status: 'online', mode: 'host-agent', timestamp: new Date().toISOString() });
});

// Directory Browser
app.get('/api/agent/browse', (req, res) => {
  const targetPath = req.query.path;
  const result = browseDirectory(targetPath);
  res.json(result);
});

// Framework Analyzer
app.post('/api/agent/analyze', (req, res) => {
  const { path: targetPath } = req.body;
  if (!targetPath) {
    return res.status(400).json({ status: 'error', message: 'Path is required.' });
  }
  const result = analyzeDirectory(targetPath);
  res.json(result);
});

// Git status
app.post('/api/agent/git', async (req, res) => {
  const { path: targetPath } = req.body;
  if (!targetPath) {
    return res.status(400).json({ status: 'error', message: 'Path is required.' });
  }
  const result = await getGitStatus(targetPath);
  res.json(result);
});

// File Bootstrapper
app.post('/api/agent/bootstrap', (req, res) => {
  const { folderPath, stack, docker, k8s, cicd } = req.body;
  if (!folderPath) {
    return res.status(400).json({ status: 'error', message: 'FolderPath is required.' });
  }
  const result = bootstrapProject(folderPath, stack, docker, k8s, cicd);
  res.json(result);
});

// Save credential
app.post('/api/agent/credentials', (req, res) => {
  const { provider, token } = req.body;
  if (!provider || !token) {
    return res.status(400).json({ status: 'error', message: 'Provider and Token are required.' });
  }
  const result = saveCredential(provider, token);
  res.json(result);
});

// Get credential status (never return plain text token to UI)
app.get('/api/agent/credentials/:provider', (req, res) => {
  const token = getCredential(req.params.provider);
  res.json({ exists: !!token });
});

// Projects Management API
app.get('/api/agent/projects', (req, res) => {
  res.json(getProjects());
});

app.delete('/api/agent/projects/:id', (req, res) => {
  const success = deleteProject(req.params.id);
  res.json({ status: success ? 'success' : 'error' });
});

// Execute build and deployment
app.post('/api/agent/deploy', async (req, res) => {
  const { provider, path: projectPath, repository, repoUrl, repoName, envVars } = req.body;
  if (!provider || !projectPath) {
    return res.status(400).json({ status: 'error', message: 'Provider and path are required.' });
  }

  // Check if we have provider credentials
  const token = getCredential(provider);
  if (!token) {
    return res.status(400).json({ status: 'error', message: `Missing credentials/token for ${provider}. Please save them first.` });
  }

  // Trigger deployment asynchronously
  res.json({ status: 'started', message: 'Orchestration pipeline initialized.' });

  // Run deployment and stream logs
  (async () => {
    try {
      let targetRepoUrl = repoUrl;

      // 1. Run Git & GitHub phase if selected
      if (repository === 'github') {
        const gitToken = getCredential('github');
        if (!gitToken) {
          broadcastLog('error', 'Missing credentials/token for GitHub. Unable to push codebase.');
          return;
        }

        try {
          let finalRepoName = repoName || projectPath.split('/').pop() || 'nexus-app';
          
          if (targetRepoUrl) {
            const match = targetRepoUrl.match(/github\.com\/[^\/]+\/([^\/\.]+)/);
            if (match) {
              finalRepoName = match[1];
            } else if (!targetRepoUrl.includes('/')) {
              finalRepoName = targetRepoUrl;
            }
          }

          broadcastLog('info', `Ensuring GitHub repository '${finalRepoName}' exists...`);
          const repoResult = await createGitHubRepository(finalRepoName, gitToken, broadcastLog);
          targetRepoUrl = repoResult.repoUrl;

          broadcastLog('info', `Syncing local folder with GitHub repo: ${targetRepoUrl}`);
          await initializeAndPushRepository(projectPath, targetRepoUrl, gitToken, broadcastLog);
        } catch (gitErr) {
          broadcastLog('error', `Git phase failed: ${gitErr.message}`);
          return;
        }
      }

      // 2. Run Cloud build & deployment phase
      const deployResult = await executeDeployment(provider, projectPath, token, broadcastLog, targetRepoUrl, envVars);
      
      // Save metadata back to core backend for telemetry & Grafana logging
      try {
        await fetch(`${CORE_API_URL}/api/automate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: projectPath.split('/').pop() || 'nexus-app',
            intent: 'deploy',
            platform: provider,
            credentials: {} // Secret token is handled on the host!
          })
        });
      } catch (e) {
        broadcastLog('warn', `Failed to register deployment logs to Core: ${e.message}`);
      }

      if (deployResult.status === 'success') {
        // Embed the real URL in the log so frontend can parse it
        broadcastLog('success', `Deployment live: ${deployResult.url}`);
        
        // Dynamically update Prometheus targets & start Loki log bridge
        if (deployResult.backendUrl) {
          updatePrometheusConfig(deployResult.backendUrl, broadcastLog).catch(() => {});
        }

        // Save project record
        const savedProject = saveProject({
          name: projectPath.split('/').pop() || 'nexus-app',
          platform: provider,
          backendUrl: deployResult.backendUrl,
          backendId: deployResult.backendId,
          frontendUrl: deployResult.url,
          frontendId: deployResult.frontendId,
          ownerId: deployResult.ownerId
        });
        broadcastLog('success', `Saved project deployment record: ${savedProject.name} (ID: ${savedProject.id})`);

        if (deployResult.ownerId && deployResult.backendId) {
          startRenderLogBridge(deployResult.ownerId, deployResult.backendId, token, broadcastLog);
        }
      } else {
        broadcastLog('error', `Deployment pipeline failed.`);
      }
    } catch (err) {
      broadcastLog('error', `Unexpected deployer failure: ${err.message}`);
    }
  })();
});

// Core endpoints proxying
app.get('/api/data', (req, res) => proxyToCore(req, res, '/api/data'));
app.get('/api/logs', (req, res) => proxyToCore(req, res, '/api/logs'));
app.get('/api/providers', (req, res) => proxyToCore(req, res, '/api/providers'));
app.get('/api/error', (req, res) => proxyToCore(req, res, '/api/error'));

// Create HTTP server
const server = createServer(app);

// Setup WebSockets for live log streaming
const wss = new WebSocketServer({ noServer: true });
const activeSockets = new Set();

const broadcastLog = (type, msg) => {
  const time = new Date().toTimeString().split(' ')[0];
  const payload = JSON.stringify({ time, type, msg });
  activeSockets.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  });
};

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  if (pathname === '/api/agent/deploy/logs') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  activeSockets.add(ws);
  ws.send(JSON.stringify({ type: 'info', msg: 'Connected to local Nexus Agent WebSocket stream.' }));
  
  ws.on('close', () => {
    activeSockets.delete(ws);
  });
});

// Auto-start log bridges for existing projects on agent boot
const initActiveLogBridges = () => {
  try {
    const projects = getProjects();
    projects.forEach(proj => {
      if (proj.platform) {
        const token = getCredential(proj.platform);
        if (token && proj.ownerId && proj.backendId) {
          console.log(`[Boot] Automatically resuming Render log bridge for project: ${proj.name} (${proj.backendId})`);
          startRenderLogBridge(proj.ownerId, proj.backendId, token, (type, msg) => {
            console.log(`[Log Bridge - ${proj.name}] [${type}] ${msg}`);
          });
        }
      }
    });
  } catch (e) {
    console.error('Failed to initialize active log bridges on boot:', e.message);
  }
};

server.listen(PORT, () => {
  console.log(`Nexus Agent listening natively on host at http://localhost:${PORT}`);
  // Delay slightly to ensure services are fully up
  setTimeout(initActiveLogBridges, 1000);
});
