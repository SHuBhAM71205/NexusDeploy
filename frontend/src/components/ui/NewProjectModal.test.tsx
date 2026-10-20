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
    listGitHubRepositories: vi.fn(),
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
  vi.mocked(agentApi.analyze).mockResolvedValue({ detected: false });
  vi.mocked(agentApi.getGitStatus).mockResolvedValue({ isGitRepo: false });
  vi.mocked(agentApi.getCredentialStatus).mockResolvedValue({ exists: true });
  vi.mocked(agentApi.listGitHubRepositories).mockResolvedValue([]);
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
    logs: [],
  });
  vi.mocked(agentApi.connectLogStream).mockReturnValue(vi.fn());
});

describe('NewProjectModal deployment ordering', () => {
  it('keeps the modal centered with a viewport-bounded scrollable panel', async () => {
    const props = {
      onClose: vi.fn(),
      onSubmit: vi.fn(async () => createdProject),
      onRefresh: vi.fn(),
    };
    const rendered = render(<NewProjectModal isOpen {...props} />);
    await act(async () => {
      await Promise.resolve();
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-h-[calc(100dvh-2rem)]');
    expect(dialog).toHaveClass('sm:max-h-[calc(100dvh-3rem)]');
    expect(dialog).toHaveClass('overflow-y-auto');
    expect(dialog.parentElement).toHaveClass('overflow-y-auto');
    expect(dialog.parentElement).toHaveClass('items-center');
    expect(document.body.style.overflow).toBe('hidden');

    await act(async () => {
      rendered.rerender(<NewProjectModal isOpen={false} {...props} />);
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('creates the project first, then starts GitHub preparation and deployment as one job', async () => {
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
    fireEvent.change(screen.getByPlaceholderText('e.g. C:/Projects/my-app'), {
      target: { value: 'C:/Projects/new-app' },
    });
    expect(screen.getByRole('button', { name: /Create a new repository/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Next: Input API Token/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Live Host Deployment/ }));
    });

    await waitFor(() => expect(agentApi.deploy).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      root_directory: 'C:/Projects/new-app',
      repo_url: null,
    }));
    expect(calls).toEqual(['create', 'deploy']);
    expect(agentApi.deploy).toHaveBeenCalledWith(expect.objectContaining({
      path: 'C:/Projects/new-app',
      sourceType: 'local',
      deploymentRootDirectory: '',
      repository: 'github',
      repoAction: 'create',
      repoName: 'new-app',
    }));
    expect(agentApi.connectLogStream).toHaveBeenCalledWith(expect.any(Function), undefined, 'job-real-123');
    await waitFor(() => expect(agentApi.getDeploymentStatus).toHaveBeenCalledWith('job-real-123'), { timeout: 3000 });
  });

  it('loads and passes a selected existing writable repository to the agent', async () => {
    vi.mocked(agentApi.listGitHubRepositories).mockResolvedValue([{
      id: 12,
      name: 'existing-app',
      fullName: 'octo/existing-app',
      owner: 'octo',
      htmlUrl: 'https://github.com/octo/existing-app',
      cloneUrl: 'https://github.com/octo/existing-app.git',
      defaultBranch: 'main',
      private: true,
    }]);
    const onSubmit = vi.fn(async () => createdProject);

    render(
      <NewProjectModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onRefresh={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. ecommerce-backend'), { target: { value: 'local-app' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. C:/Projects/my-app'), {
      target: { value: 'C:/Projects/local-app' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Use an existing repository/ }));
    fireEvent.click(screen.getByRole('button', { name: /Load repositories/ }));
    await waitFor(() => expect(agentApi.listGitHubRepositories).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('option', { name: /octo\/existing-app/ })).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: 'GitHub repository' }), {
      target: { value: 'octo/existing-app' },
    });
    fireEvent.change(screen.getByLabelText('Deployment Root Directory'), {
      target: { value: '  frontend\\  ' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Next: Input API Token/ })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Next: Input API Token/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Live Host Deployment/ }));
    });

    await waitFor(() => expect(agentApi.deploy).toHaveBeenCalledTimes(1));
    expect(agentApi.deploy).toHaveBeenCalledWith(expect.objectContaining({
      repository: 'github',
      repoAction: 'existing',
      repoOwner: 'octo',
      repoName: 'existing-app',
      repoUrl: 'https://github.com/octo/existing-app',
      deploymentRootDirectory: 'frontend',
    }));
  });

  it('restores direct deployment from an existing GitHub repository without requiring a local folder or push destination', async () => {
    const onSubmit = vi.fn(async () => ({
      ...createdProject,
      repo_url: 'https://github.com/octo/remote-app',
      root_directory: './',
    }));

    render(
      <NewProjectModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onRefresh={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. ecommerce-backend'), { target: { value: 'remote-app' } });
    fireEvent.click(screen.getByRole('button', { name: /Use repository already on GitHub/ }));
    fireEvent.change(screen.getByLabelText('GitHub Repository URL *'), {
      target: { value: 'https://person:password@github.com/octo/remote-app' },
    });
    expect(screen.getByRole('alert')).not.toHaveTextContent('password');
    expect(screen.getByRole('button', { name: /Next: Input API Token/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('GitHub Repository URL *'), {
      target: { value: 'https://github.com/octo/remote-app' },
    });
    fireEvent.change(screen.getByLabelText('Deployment Root Directory'), {
      target: { value: 'apps/web' },
    });
    fireEvent.change(screen.getByLabelText('Git Branch'), { target: { value: 'release' } });
    fireEvent.click(screen.getByRole('button', { name: /Next: Input API Token/ }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Live Host Deployment/ }));
    });

    await waitFor(() => expect(agentApi.deploy).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      repo_url: 'https://github.com/octo/remote-app',
      root_directory: './',
      branch: 'release',
    }));
    expect(agentApi.deploy).toHaveBeenCalledWith(expect.objectContaining({
      path: '',
      sourceType: 'github',
      repoUrl: 'https://github.com/octo/remote-app',
      branch: 'release',
      deploymentRootDirectory: 'apps/web',
    }));
    const deployPayload = vi.mocked(agentApi.deploy).mock.calls[0][0];
    expect(deployPayload.repository).toBeUndefined();
    expect(deployPayload.repoAction).toBeUndefined();
  });

  it.each(['../frontend', 'C:\\frontend', '/frontend', '\\frontend', 'apps/../../backend'])(
    'rejects invalid deployment root directory %s',
    async (invalidRoot) => {
      await act(async () => {
        render(
          <NewProjectModal
            isOpen
            onClose={vi.fn()}
            onSubmit={vi.fn(async () => createdProject)}
            onRefresh={vi.fn()}
          />,
        );
        await Promise.resolve();
      });
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('e.g. ecommerce-backend'), { target: { value: 'new-app' } });
        fireEvent.change(screen.getByPlaceholderText('e.g. C:/Projects/my-app'), {
          target: { value: 'C:/Projects/new-app' },
        });
        fireEvent.change(screen.getByLabelText('Deployment Root Directory'), {
          target: { value: invalidRoot },
        });
      });
      expect(screen.getByRole('alert')).toHaveTextContent('relative path inside the repository');
      expect(screen.getByRole('button', { name: /Next: Input API Token/ })).toBeDisabled();
    },
  );
});
