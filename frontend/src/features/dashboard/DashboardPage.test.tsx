import { render, screen } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders the deployment activity', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /good morning, jane/i })).toBeInTheDocument();
    expect(screen.getByText('api-gateway')).toBeInTheDocument();
  });
});
