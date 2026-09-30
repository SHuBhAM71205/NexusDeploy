import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agentApi } from '../../services/agentApi';
import type { Project } from '../../types';
import { NewProjectModal } from './NewProjectModal';

vi.mock('../../services/agentApi', () => ({
  agentApi: {
    browse: vi.fn(),
    analyze: vi.fn(),
    getGitStatus: vi.fn(),
    getCredentialStatus: vi.fn(),
    saveCredential: vi.fn(),
    deploy: vi.fn(),
    getDeploymentStatus: vi.fn(),
    connectLogStream: vi.fn(),
  },
}));

const realProjectId = '5cf1cba4-15d6-4cc8-92ce-3de888395117';
const createdProject: Project = {
  id: realProjectId,
  name: 'new-app',
  description: null,
  repo_url: 'https://github.com/example/new-app',
  branch: 'main',
  framework: 'React / Vite',
  root_directory: './',
  build_command: 'npm run build',
  output_directory: 'dist',
  install_command: 'npm install',
  node_version: '20.x',
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(agentApi.browse).mockResolvedValue({ currentPath: '', parentPath: null, items: [] });
  vi.mocked(agentApi.getCredentialStatus).mockResolvedValue({ exists: true });
  vi.mocked(agentApi.deploy).mockResolvedValue({ status: 'started', jobId: 'job-real-123', message: 'started' });
  vi.mocked(agentApi.getDeploymentStatus).mockResolvedValue({
    jobId: 'job-real-123',
    status: 'running',
    provider: 'vercel',
    projectName: 'new-app',
    startedAt: new Date().toISOString(),
    completedAt: null,
    url: null,
    error: null,
  });
  vi.mocked(agentApi.connectLogStream).mockReturnValue(vi.fn());
});

describe('NewProjectModal deployment ordering', () => {
  it('creates first and passes the returned UUID to exactly one Agent deployment', async () => {
    const calls: string[] = [];
    const onSubmit = vi.fn(async () => {
      calls.push('create');
      return createdProject;
    });

    vi.mocked(agentApi.deploy).mockImplementation(async (payload) => {
      calls.push('deploy');
      expect(payload.project_id).toBe(realProjectId);
      return { status: 'started', jobId: 'job-real-123', message: 'started' };
    });

    render(
      <NewProjectModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onRefresh={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. ecommerce-backend'), { target: { value: 'new-app' } });
    fireEvent.click(screen.getByRole('button', { name: /GitHub Repository/ }));
    fireEvent.change(screen.getByPlaceholderText('https://github.com/owner/repository'), {
      target: { value: 'https://github.com/example/new-app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next: Input API Token/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Live Host Deployment/ }));
    });

    await waitFor(() => expect(agentApi.deploy).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['create', 'deploy']);
    expect(agentApi.connectLogStream).toHaveBeenCalledWith(expect.any(Function), undefined, 'job-real-123');
    await waitFor(() => expect(agentApi.getDeploymentStatus).toHaveBeenCalledWith('job-real-123'), { timeout: 3000 });
  });
});
