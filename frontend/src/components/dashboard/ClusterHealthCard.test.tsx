import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';
import { ClusterHealthCard } from './ClusterHealthCard';

vi.mock('../../services/api', () => ({
  api: { getMonitoringSummary: vi.fn() },
}));

const monitoringApi = vi.mocked(api.getMonitoringSummary);

const summary = {
  updated_at: '2026-09-27T12:00:00Z',
  requests: { total: 246, server_errors_total: 2 },
  deployments: {
    started_total: 17,
    successful_total: 13,
    failed_total: 4,
    duration_observations: 10,
    average_duration_seconds: 75,
    providers: {
      vercel: {
        started_total: 17,
        successful_total: 13,
        failed_total: 4,
        duration_observations: 10,
        average_duration_seconds: 75,
      },
    },
  },
};

describe('ClusterHealthCard monitoring data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders real lifecycle totals, duration, provider breakdown, and update time', async () => {
    monitoringApi.mockResolvedValue(summary);

    render(<ClusterHealthCard />);

    expect(await screen.findAllByText('17')).toHaveLength(2);
    expect(screen.getAllByText('13')).toHaveLength(2);
    expect(screen.getAllByText('4')).toHaveLength(2);
    expect(screen.getByText('1m 15s')).toBeInTheDocument();
    expect(screen.getByText('HTTP requests')).toBeInTheDocument();
    expect(screen.getByText('246')).toBeInTheDocument();
    expect(screen.getByText('5xx responses')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('vercel')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.queryByText(/CPU Allocation|Memory Utilization|Edge Throughput|HEALTHY|Regions Online/)).not.toBeInTheDocument();
  });

  it('shows a loading state while the monitoring request is pending', () => {
    monitoringApi.mockReturnValue(new Promise(() => {}));

    render(<ClusterHealthCard />);

    expect(screen.getAllByText('Loading')).toHaveLength(6);
  });

  it('shows a retryable error when the monitoring request fails', async () => {
    monitoringApi.mockRejectedValue(new Error('metrics service unavailable'));

    render(<ClusterHealthCard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('metrics service unavailable');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows a real empty state when no deployment metrics have been recorded', async () => {
    monitoringApi.mockResolvedValue({
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
    });

    render(<ClusterHealthCard />);

    expect(await screen.findByText('No deployment metrics have been recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
});