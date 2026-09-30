import axios from 'axios';
import type { EnvVar } from '../types';

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
  // Milestone 3: deployment-result fields (present only on records created after M3)
  deploymentStatus?: 'success' | 'failed';
  jobId?: string;
  error?: string;
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

  async getEnvironmentVariables(provider: string, projectName: string): Promise<{ variables: EnvVar[] }> {
    const res = await agentClient.get('/api/agent/environment-variables', {
      params: { provider, projectName },
    });
    return res.data;
  },

  async syncEnvironmentVariables(provider: string, projectName: string, variables: EnvVar[]): Promise<{ variables: EnvVar[] }> {
    const res = await agentClient.post('/api/agent/environment-variables', {
      provider,
      projectName,
      variables,
    });
    return res.data;
  },

  async deleteEnvironmentVariable(provider: string, projectName: string, variableId: string): Promise<void> {
    await agentClient.delete('/api/agent/environment-variables', {
      data: { provider, projectName, variableId },
    });
  },

  async deploy(payload: {
    provider: string;
    path: string;
    project_id?: string;
    project_url?: string;
    repository?: string;
    repoUrl?: string;
    repoName?: string;
    envVars?: Array<{ key: string; value: string }>;
  }): Promise<{ status: string; jobId: string; message: string }> {
    const res = await agentClient.post('/api/agent/deploy', payload);
    return res.data;
  },

  async getDeploymentStatus(jobId: string): Promise<{
    jobId: string;
    status: 'started' | 'running' | 'success' | 'failed';
    provider: string;
    projectName: string;
    startedAt: string;
    completedAt: string | null;
    url: string | null;
    error: string | null;
  }> {
    const res = await agentClient.get(`/api/agent/deploy/status/${jobId}`);
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
    onLog: (log: { time: string; type: string; msg: string; jobId?: string }) => void,
    onStatusChange?: (connected: boolean) => void,
    jobId?: string,
  ): () => void {
    let ws: WebSocket | null = null;
    let isConnected = false;

    const connect = () => {
      ws = new WebSocket('ws://localhost:3030/api/agent/deploy/logs');

      ws.onopen = () => {
        isConnected = true;
        onStatusChange?.(true);
        // Milestone 5: subscribe to a specific job's logs immediately after connecting
        if (jobId && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ subscribe: jobId }));
        }
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
