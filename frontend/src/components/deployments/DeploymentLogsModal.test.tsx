import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';
import type { Deployment } from '../../types';
import { DeploymentLogsModal } from './DeploymentLogsModal';

vi.mock('../../services/api', () => ({
  api: {
    getDeployment: vi.fn(),
  },
}));

const deploymentId = 'ec3b3cbf-015d-48b4-9d9b-304319063717';
const deployment: Deployment = {
  id: deploymentId,
  project_id: '5cf1cba4-15d6-4cc8-92ce-3de888395117',
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
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getDeployment).mockResolvedValue({ ...deployment, logs: [] });
});

describe('DeploymentLogsModal', () => {
  it('fetches detail by UUID and shows unavailable metadata without sample logs', async () => {
    render(<DeploymentLogsModal deployment={deployment} onClose={vi.fn()} />);

    await waitFor(() => expect(api.getDeployment).toHaveBeenCalledWith(deploymentId));
    expect(screen.getByText('Commit unavailable')).toBeInTheDocument();
    expect(screen.getByText('by Unknown author')).toBeInTheDocument();
    expect(screen.getByText('No deployment logs are available.')).toBeInTheDocument();
    expect(screen.queryByText(/Cloning repository/)).not.toBeInTheDocument();
  });
});
