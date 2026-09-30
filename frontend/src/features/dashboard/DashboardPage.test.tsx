import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { DashboardPage } from './DashboardPage';

vi.mock('../../services/api', () => ({
  api: {
    getProjects: vi.fn().mockResolvedValue([]),
    getDeployments: vi.fn().mockResolvedValue([]),
    getMonitoringSummary: vi.fn().mockResolvedValue({
      updated_at: '2026-09-27T12:00:00Z',
      requests: { total: 0, server_errors_total: 0 },
      deployments: {
        started_total: 0,
        successful_total: 0,
        failed_total: 0,
        duration_observations: 0,
        average_duration_seconds: null,
        providers: {},
      },
    }),
    createProject: vi.fn(),
    triggerDeployment: vi.fn(),
    rollbackDeployment: vi.fn(),
  },
}));

describe('DashboardPage', () => {
  it('renders the dashboard header and cluster health card', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('No deployments available.')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /good morning,/i })).toBeInTheDocument();
    expect(screen.getByText('Deployment Monitoring')).toBeInTheDocument();
  });
});
