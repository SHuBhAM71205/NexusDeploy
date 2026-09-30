import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './Badge';

describe('StatusBadge deployment lifecycle', () => {
  it.each([
    ['started', 'Started'],
    ['running', 'Running'],
    ['success', 'Success'],
    ['failed', 'Failed'],
  ])('renders %s without title-case API assumptions', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
