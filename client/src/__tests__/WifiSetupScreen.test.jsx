/**
 * WifiSetupScreen Component — Unit Tests
 *
 * Tests the WiFi setup flow:
 *   - Renders title and subtitle
 *   - Shows scan button
 *   - Scans for networks on mount
 *   - Displays network list after scan
 *   - Shows password form when a network is selected
 *   - Back button returns to network list
 *   - Calls onConnected when connection succeeds
 *   - Shows error message when connection fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WifiSetupScreen from '../components/WifiSetupScreen.jsx';

const mockNetworks = [
  { ssid: 'HomeNetwork', signal: 80, secured: true },
  { ssid: 'OpenCafe', signal: 55, secured: false },
  { ssid: 'WeakSignal', signal: 30, secured: true },
];

describe('WifiSetupScreen', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title and subtitle', () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    expect(screen.getByText('Skylight Calendar')).toBeInTheDocument();
    expect(screen.getByText('Connect to WiFi to get started')).toBeInTheDocument();
  });

  it('shows "Scan for Networks" button', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    // Wait for initial scan to complete before checking button text
    await waitFor(() => {
      expect(screen.getByText('Scan for Networks')).toBeInTheDocument();
    });
  });

  it('scans for networks on mount', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNetworks),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/network/scan');
    });
  });

  it('displays network list after scan', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNetworks),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    });

    expect(screen.getByText('OpenCafe')).toBeInTheDocument();
    expect(screen.getByText('WeakSignal')).toBeInTheDocument();
  });

  it('shows lock icon for secured networks', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNetworks),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    });

    // Secured networks show the lock emoji
    const locks = screen.getAllByText('🔒');
    expect(locks).toHaveLength(2); // HomeNetwork and WeakSignal are secured
  });

  it('shows password form when a network is selected', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNetworks),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('HomeNetwork'));

    expect(screen.getByText(/Connecting to:/)).toBeInTheDocument();
    expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter WiFi password')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('Back button returns to network list', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockNetworks),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    });

    // Select a network
    fireEvent.click(screen.getByText('HomeNetwork'));
    expect(screen.getByText('Back')).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByText('Back'));

    // Should show network list again
    await waitFor(() => {
      expect(screen.getByText('Scan for Networks')).toBeInTheDocument();
    });
    expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    expect(screen.getByText('OpenCafe')).toBeInTheDocument();
  });

  it('calls onConnected when connection succeeds', async () => {
    const onConnected = vi.fn();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNetworks),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<WifiSetupScreen onConnected={onConnected} />);

    await waitFor(() => {
      expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    });

    // Select a secured network
    fireEvent.click(screen.getByText('HomeNetwork'));

    // Enter password and submit
    const input = screen.getByPlaceholderText('Enter WiFi password');
    fireEvent.change(input, { target: { value: 'mypassword123' } });
    fireEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      expect(onConnected).toHaveBeenCalled();
    });

    // Verify the POST was made with correct payload
    expect(fetchMock).toHaveBeenCalledWith('/api/network/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid: 'HomeNetwork', password: 'mypassword123' }),
    });
  });

  it('shows error message when connection fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNetworks),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Incorrect password' }),
      });

    render(<WifiSetupScreen onConnected={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('HomeNetwork')).toBeInTheDocument();
    });

    // Select network and submit
    fireEvent.click(screen.getByText('HomeNetwork'));
    const input = screen.getByPlaceholderText('Enter WiFi password');
    fireEvent.change(input, { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    });
  });

  it('has an Ethernet hint at the bottom', () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<WifiSetupScreen onConnected={() => {}} />);

    expect(
      screen.getByText(/Using Ethernet\? The calendar will load automatically once connected\./)
    ).toBeInTheDocument();
  });
});
