import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders the dashboard header and cluster health card', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /good morning, jane/i })).toBeInTheDocument();
    expect(screen.getByText('Global Edge Cluster Health')).toBeInTheDocument();
  });
});
