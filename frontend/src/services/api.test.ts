import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agentApi } from './agentApi';
import { api } from './api';
import { http } from './http';
import type { Project } from '../types';

vi.mock('./http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./agentApi', () => ({
  agentApi: {
    deploy: vi.fn(),
    getProjects: vi.fn(),
    getEnvironmentVariables: vi.fn(),
    syncEnvironmentVariables: vi.fn(),
    deleteEnvironmentVariable: vi.fn(),
  },
}));

const realProjectId = '5cf1cba4-15d6-4cc8-92ce-3de888395117';
const project: Project = {
  id: realProjectId,
  name: 'demo',
  description: null,
  repo_url: null,
  branch: 'main',
  framework: null,
  root_directory: './',
  build_command: null,
  output_directory: null,
  install_command: null,
  node_version: null,
  status: 'active',
  created_at: null,
  updated_at: null,
  last_deployed_at: null,
  production_url: null,
  staging_url: null,
  total_deploys: 0,
  active_deployments_count: 0,
  platform: 'vercel',
  domains: [],
  environment_variables: [],
  owner_id: 'f5e5dc4c-c05e-4aab-8fd5-25b1e4019022',
};

const httpMock = http as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const agentMock = vi.mocked(agentApi);

beforeEach(() => vi.clearAllMocks());

describe('project and deployment API source of truth', () => {
  it('loads monitoring metrics through the authenticated FastAPI client', async () => {
    const summary = {
      updated_at: '2026-09-27T12:00:00Z',
      requests: { total: 246, server_errors_total: 2 },
      deployments: {
        started_total: 3,
        successful_total: 2,
        failed_total: 1,
        duration_observations: 2,
        average_duration_seconds: 42,
        providers: {},
      },
    };
    httpMock.get.mockResolvedValueOnce({ data: summary } as never);

    await expect(api.getMonitoringSummary()).resolves.toEqual(summary);

    expect(httpMock.get).toHaveBeenCalledWith('/monitoring/summary');
  });

  it('propagates invalid-session responses from getMe instead of returning a demo account', async () => {
    httpMock.get.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(api.getMe()).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('loads projects only from FastAPI and preserves a genuine empty list', async () => {
    httpMock.get.mockResolvedValueOnce({ data: [] } as never);

    await expect(api.getProjects()).resolves.toEqual([]);

    expect(httpMock.get).toHaveBeenCalledWith('/projects', { params: undefined });
    expect(agentMock.getProjects).not.toHaveBeenCalled();
  });

  it('loads deployments only from FastAPI and preserves a genuine empty list', async () => {
    httpMock.get.mockResolvedValueOnce({ data: [] } as never);

    await expect(api.getDeployments()).resolves.toEqual([]);
    expect(httpMock.get).toHaveBeenCalledWith('/deployments', { params: undefined });
  });

  it('loads project and deployment detail by their real UUIDs', async () => {
    const deployment = {
      id: 'ec3b3cbf-015d-48b4-9d9b-304319063717',
      project_id: realProjectId,
      project_name: 'demo',
      environment: 'production',
      status: 'started',
      branch: null,
      commit_hash: null,
      commit_message: null,
      author: null,
      started_at: null,
      completed_at: null,
      duration: null,
      url: null,
      logs_count: 0,
      trigger_type: 'manual',
      provider: 'vercel',
      error: null,
      provider_metadata: null,
      logs: [],
    };
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: deployment } as never);

    await expect(api.getProject(realProjectId)).resolves.toEqual(project);
    const deploymentResponse = await api.getDeployment(deployment.id);

    expect(httpMock.get).toHaveBeenNthCalledWith(1, `/projects/${realProjectId}`);
    expect(httpMock.get).toHaveBeenNthCalledWith(2, `/deployments/${deployment.id}`);
    expect('job_id' in deploymentResponse).toBe(false);
  });

  it('propagates project and deployment read failures', async () => {
    httpMock.get.mockRejectedValueOnce(new Error('projects offline'));
    httpMock.get.mockRejectedValueOnce(new Error('deployments offline'));

    await expect(api.getProjects()).rejects.toThrow('projects offline');
    await expect(api.getDeployments()).rejects.toThrow('deployments offline');
  });

  it('creates the project through FastAPI without starting an Agent deployment', async () => {
    httpMock.post.mockResolvedValueOnce({ data: project } as never);

    await expect(api.createProject({ name: project.name })).resolves.toEqual(project);

    expect(httpMock.post).toHaveBeenCalledWith('/projects', { name: project.name });
    expect(agentMock.deploy).not.toHaveBeenCalled();
  });

  it('keeps initial environment secrets out of the backend project payload', async () => {
    const variables = [{ key: 'API_TOKEN', value: 'secret-value', target: 'production' as const, is_secret: true }];
    httpMock.post.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: [] } as never);
    agentMock.syncEnvironmentVariables.mockResolvedValueOnce({ variables: [{ ...variables[0], value: '' }] });

    const result = await api.createProject({ name: project.name, environment_variables: variables });

    expect(httpMock.post).toHaveBeenCalledWith('/projects', { name: project.name });
    expect(agentMock.syncEnvironmentVariables).toHaveBeenCalledWith('vercel', 'demo', variables);
    expect(result.environment_variables[0].value).toBe('');
  });

  it('reads and syncs environment variables through the project provider agent', async () => {
    const variables = [{ id: 'env-1', key: 'API_URL', value: '', target: 'production' as const, is_secret: true }];
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: [] } as never);
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: [] } as never);
    agentMock.getEnvironmentVariables.mockResolvedValueOnce({ variables });
    agentMock.syncEnvironmentVariables.mockResolvedValueOnce({ variables });

    await expect(api.getEnvVars(realProjectId)).resolves.toEqual(variables);
    await expect(api.updateEnvVars(realProjectId, variables)).resolves.toEqual(variables);

    expect(agentMock.getEnvironmentVariables).toHaveBeenCalledWith('vercel', 'demo');
    expect(agentMock.syncEnvironmentVariables).toHaveBeenCalledWith('vercel', 'demo', variables);
    expect(httpMock.post).not.toHaveBeenCalled();
  });

  it('uses a deployed Vercel URL to resolve the provider project for env sync', async () => {
    const variables = [{ key: 'API_URL', value: 'https://api.example.com', target: 'production' as const, is_secret: false }];
    const deployment = { id: 'dep-1', url: 'https://deployed-project.vercel.app' };
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: [deployment] } as never);
    agentMock.getEnvironmentVariables.mockResolvedValueOnce({ variables });

    await expect(api.getEnvVars(realProjectId)).resolves.toEqual(variables);

    expect(agentMock.getEnvironmentVariables).toHaveBeenCalledWith('vercel', deployment.url);
  });

  it('starts one Agent deployment with the real project UUID and does not post a duplicate record', async () => {
    const job = { status: 'started', jobId: 'job-real-123', message: 'started' };
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: [] } as never);
    agentMock.deploy.mockResolvedValueOnce(job);
    const triggerDeployment = api.triggerDeployment;

    await expect(triggerDeployment({ project_id: realProjectId })).resolves.toEqual(job);

    expect(httpMock.get).toHaveBeenCalledWith(`/projects/${realProjectId}`);
    expect(httpMock.get).toHaveBeenCalledWith('/deployments', { params: { project_id: realProjectId } });
    expect(agentMock.deploy).toHaveBeenCalledTimes(1);
    expect(agentMock.deploy).toHaveBeenCalledWith(expect.objectContaining({ project_id: realProjectId }));
    expect(httpMock.post).not.toHaveBeenCalled();
  });

  it('passes the existing Vercel deployment URL to the Agent for project reuse', async () => {
    const job = { status: 'started', jobId: 'job-vercel-existing', message: 'started' };
    httpMock.get.mockResolvedValueOnce({ data: project } as never);
    httpMock.get.mockResolvedValueOnce({ data: [{ id: 'dep-1', url: 'https://existing.vercel.app' }] } as never);
    agentMock.deploy.mockResolvedValueOnce(job);

    await expect(api.triggerDeployment({ project_id: realProjectId })).resolves.toEqual(job);

    expect(agentMock.deploy).toHaveBeenCalledWith(expect.objectContaining({
      project_id: realProjectId,
      project_url: 'https://existing.vercel.app',
    }));
  });
});
