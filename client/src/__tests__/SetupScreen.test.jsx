import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SetupScreen from '../components/SetupScreen.jsx';

describe('SetupScreen', () => {
  it('renders the title', () => {
    render(<SetupScreen />);
    expect(screen.getByText('Skylight Calendar')).toBeInTheDocument();
  });

  it('renders the connect button with correct link', () => {
    render(<SetupScreen />);
    const link = screen.getByText('Connect Google Calendar');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/api/auth/login');
  });

  it('shows setup instructions', () => {
    render(<SetupScreen />);
    expect(screen.getByText(/Connect your Google Calendar/)).toBeInTheDocument();
  });

  it('shows the hint text about auto-sync', () => {
    render(<SetupScreen />);
    expect(screen.getByText(/automatically sync/)).toBeInTheDocument();
  });
});
