import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/routes/AppRoutes';

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
};

describe('AppRoutes', () => {
  it('renders the landing page on /', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/learn cybersecurity/i);
  });

  it('renders the public courses page', () => {
    renderAt('/courses');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Courses');
  });

  it('redirects unauthenticated users away from /dashboard', () => {
    renderAt('/dashboard');

    expect(screen.getByText(/sign in to cyberpingo/i)).toBeInTheDocument();
  });
});
