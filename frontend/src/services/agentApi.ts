import axios from 'axios';

const AGENT_URL = 'http://localhost:3030';
const agentClient = axios.create({ baseURL: AGENT_URL, timeout: 10_000 });

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  items: DirectoryItem[];
  drives?: string[];
  status?: string;
  message?: string;
}

export interface AnalyzeResult {
  detected: boolean;
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  nodeVersion?: string;
  packageManager?: string;
  hasDockerfile?: boolean;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch?: string;
  hasUncommitted?: boolean;
  remoteUrl?: string;
}

export interface AgentProject {
  id: string;
  name: string;
  platform: string;
  backendUrl?: string;
  backendId?: string;
  frontendUrl?: string;
  frontendId?: string;
  ownerId?: string;
  created_at?: string;
}

export const agentApi = {
  async getStatus(): Promise<{ status: string; mode: string; timestamp: string }> {
    const res = await agentClient.get('/api/agent/status');
    return res.data;
  },

  async browse(targetPath?: string): Promise<BrowseResult> {
    const res = await agentClient.get('/api/agent/browse', {
      params: targetPath ? { path: targetPath } : {},
    });
    const data = res.data || {};
    if (!data.items && Array.isArray(data.dirs)) {
      const base = (data.currentPath || '').replace(/\\/g, '/');
      data.items = [
        ...data.dirs.map((d: string) => ({
          name: d,
          path: `${base}/${d}`.replace(/\/+/g, '/'),
          isDirectory: true,
        })),
        ...(Array.isArray(data.files)
          ? data.files.map((f: string) => ({
              name: f,
              path: `${base}/${f}`.replace(/\/+/g, '/'),
              isDirectory: false,
            }))
          : []),
      ];
    }
    if (!data.items) {
      data.items = [];
    }
    return data;
  },

  async analyze(targetPath: string): Promise<AnalyzeResult> {
    const res = await agentClient.post('/api/agent/analyze', { path: targetPath });
    return res.data;
  },

  async getGitStatus(targetPath: string): Promise<GitStatusResult> {
    const res = await agentClient.post('/api/agent/git', { path: targetPath });
    return res.data;
  },

  async saveCredential(provider: string, token: string): Promise<{ status: string }> {
    const res = await agentClient.post('/api/agent/credentials', { provider, token });
    return res.data;
  },

  async getCredentialStatus(provider: string): Promise<{ exists: boolean }> {
    const res = await agentClient.get(`/api/agent/credentials/${provider}`);
    return res.data;
  },

  async deploy(payload: {
    provider: string;
    path: string;
    repository?: string;
    repoUrl?: string;
    repoName?: string;
    envVars?: Array<{ key: string; value: string }>;
  }): Promise<{ status: string; message: string }> {
    const res = await agentClient.post('/api/agent/deploy', payload);
    return res.data;
  },

  async getProjects(): Promise<AgentProject[]> {
    const res = await agentClient.get('/api/agent/projects');
    return res.data;
  },

  async deleteProject(id: string): Promise<{ status: string }> {
    const res = await agentClient.delete(`/api/agent/projects/${id}`);
    return res.data;
  },

  connectLogStream(
    onLog: (log: { time: string; type: string; msg: string }) => void,
    onStatusChange?: (connected: boolean) => void,
  ): () => void {
    let ws: WebSocket | null = null;
    let isConnected = false;

    const connect = () => {
      ws = new WebSocket('ws://localhost:3030/api/agent/deploy/logs');

      ws.onopen = () => {
        isConnected = true;
        onStatusChange?.(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onLog(data);
        } catch {
          onLog({ time: new Date().toLocaleTimeString(), type: 'info', msg: event.data });
        }
      };

      ws.onclose = () => {
        if (isConnected) {
          isConnected = false;
          onStatusChange?.(false);
        }
      };

      ws.onerror = () => {
        if (isConnected) {
          isConnected = false;
          onStatusChange?.(false);
        }
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  },
};
