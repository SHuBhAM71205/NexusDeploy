import { http } from './http';
import { agentApi } from './agentApi';
import type {
  Project,
  Deployment,
  DashboardStats,
  ActivityItem,
  WorkspaceSettings,
  EnvVar,
  ApiKey,
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  MonitoringSummary,
} from '../types';

let fallbackSettings: WorkspaceSettings = {
  name: 'Acme Inc. Core Production',
  slug: 'acme-inc',
  plan: 'Enterprise Pro',
  concurrency_limit: 10,
  retention_days: 30,
  log_retention_days: 30,
  auto_deploy_on_push: true,
  notifications_enabled: true,
  api_keys: [
    { id: 'key-1', name: 'GitHub CI Pipeline', masked_key: 'nxd_live_••••••••9941', created_at: '2026-07-10' },
    { id: 'key-2', name: 'Nexus CLI CLI Tool', masked_key: 'nxd_live_••••••••1288', created_at: '2026-08-01' },
  ],
};

export const api = {
  async getMonitoringSummary(): Promise<MonitoringSummary> {
    const res = await http.get('/monitoring/summary');
    return res.data;
  },

  async getProjectMonitoringSummary(projectId: string): Promise<MonitoringSummary> {
    const res = await http.get(`/monitoring/projects/${projectId}/summary`);
    return res.data;
  },

  async getStats(): Promise<DashboardStats> {
    const res = await http.get('/stats');
    return res.data;
  },

  async getProjects(params?: { search?: string; framework?: string; status?: string }): Promise<Project[]> {
    const res = await http.get('/projects', { params });
    return res.data;
  },

  async getProject(id: string): Promise<Project> {
    const res = await http.get(`/projects/${id}`);
    return res.data;
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const { environment_variables: environmentVariables, ...projectData } = data;
    const res = await http.post('/projects', projectData);
    const project = res.data as Project;
    if (environmentVariables?.length) {
      const syncedVariables = await api.updateEnvVars(project.id, environmentVariables);
      return { ...project, environment_variables: syncedVariables };
    }
    return project;
  },

  async deleteProject(id: string): Promise<void> {
    await http.delete(`/projects/${id}`);
  },

  async getProviderProjectReference(project: Project): Promise<string> {
    if (project.platform?.toLowerCase() !== 'vercel') return project.name;
    const deployments = await api.getDeployments({ project_id: project.id });
    return deployments.find((deployment) => deployment.url)?.url || project.name;
  },

  async updateEnvVars(projectId: string, vars: EnvVar[]): Promise<EnvVar[]> {
    const project = await api.getProject(projectId);
    const projectReference = await api.getProviderProjectReference(project);
    const result = await agentApi.syncEnvironmentVariables(
      (project.platform || '').toLowerCase(),
      projectReference,
      vars,
    );
    return result.variables;
  },

  async getEnvVars(projectId: string): Promise<EnvVar[]> {
    const project = await api.getProject(projectId);
    const projectReference = await api.getProviderProjectReference(project);
    const result = await agentApi.getEnvironmentVariables(
      (project.platform || '').toLowerCase(),
      projectReference,
    );
    return result.variables;
  },

  async deleteEnvVar(projectId: string, variableId: string): Promise<void> {
    const project = await api.getProject(projectId);
    const projectReference = await api.getProviderProjectReference(project);
    await agentApi.deleteEnvironmentVariable(
      (project.platform || '').toLowerCase(),
      projectReference,
      variableId,
    );
  },

  async getDeployments(params?: { project_id?: string; environment?: string; status?: string }): Promise<Deployment[]> {
    const res = await http.get('/deployments', { params });
    return res.data;
  },

  async getDeployment(id: string): Promise<Deployment> {
    const res = await http.get(`/deployments/${id}`);
    return res.data;
  },

  async triggerDeployment(data: { project_id: string; environment?: string; branch?: string; commit_message?: string }): Promise<{ status: string; jobId: string; message: string }> {
    const project = await api.getProject(data.project_id);
    if (!project.platform) throw new Error('Project has no deployment provider configured');
    if (data.environment && data.environment !== 'production') {
      throw new Error('The Agent deployment flow currently supports production only.');
    }

    const provider = project.platform.toLowerCase();
    const providerDeployment = provider === 'vercel'
      ? (await api.getDeployments({ project_id: project.id })).find((deployment) => deployment.url?.endsWith('.vercel.app'))
      : undefined;

    return agentApi.deploy({
      provider,
      path: project.root_directory,
      project_id: project.id,
      project_url: providerDeployment?.url || undefined,
      repoName: project.name,
      repoUrl: project.repo_url || undefined,
      envVars: project.environment_variables.map((ev) => ({ key: ev.key, value: ev.value })),
    });
  },

  async rollbackDeployment(data: { deployment_id: string; target_environment?: string }): Promise<Deployment> {
    const res = await http.post('/deployments/rollback', data);
    return res.data;
  },

  async getActivities(): Promise<ActivityItem[]> {
    const res = await http.get('/activities');
    return res.data;
  },

  async getSettings(): Promise<WorkspaceSettings> {
    try {
      const res = await http.get('/settings/workspace');
      return res.data;
    } catch {
      return fallbackSettings;
    }
  },

  async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    return this.getSettings();
  },

  async updateSettings(data: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    try {
      const res = await http.put('/settings/workspace', data);
      return res.data;
    } catch {
      fallbackSettings = { ...fallbackSettings, ...data };
      return fallbackSettings;
    }
  },

  async updateWorkspaceSettings(data: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    return this.updateSettings(data);
  },

  async createApiKey(name: string): Promise<ApiKey> {
    try {
      const res = await http.post('/settings/api-keys', { name });
      return res.data;
    } catch {
      const newKey: ApiKey = {
        id: `key-${Date.now().toString(36)}`,
        name,
        masked_key: `nxd_live_••••••••${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString().split('T')[0],
      };
      fallbackSettings.api_keys.push(newKey);
      return newKey;
    }
  },

  async deleteApiKey(id: string): Promise<void> {
    try {
      await http.delete(`/settings/api-keys/${id}`);
    } catch {
      fallbackSettings.api_keys = fallbackSettings.api_keys.filter((k) => k.id !== id);
    }
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const res = await http.patch(`/projects/${id}`, data);
    return res.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await http.post('/auth/login', credentials);
  return res.data;
},

  async register(data: RegisterData) {
  const res = await http.post('/auth/register', data);
  return res.data;
},

  async getMe(): Promise<User> {
    try {
      const res = await http.get('/auth/me');
      return res.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw error;
      return {
        id: 'usr-1',
        email: 'admin@nexusdeploy.io',
        username: 'jane_doe',
        full_name: 'Jane Doe',
        role: 'Lead Architect',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch {
      // Ignore
    }
  },

  getGoogleOAuthUrl(): string {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${backendUrl}/auth/oauth/google`;
  },
};

