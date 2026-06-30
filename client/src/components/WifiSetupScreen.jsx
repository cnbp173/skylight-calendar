/**
 * WifiSetupScreen Component
 *
 * Shown when the Raspberry Pi has no internet connection. Displays a
 * friendly interface for scanning and connecting to WiFi networks.
 *
 * Flow:
 *   1. Screen shows "No Internet Connection" with a scan button
 *   2. User clicks "Scan for Networks" — available SSIDs appear in a list
 *   3. User selects a network and enters the password
 *   4. Submit triggers a connection attempt via the server
 *   5. On success, the app transitions to the normal calendar/setup flow
 *
 * Designed for the iPazzPort KP-810-19S mini keyboard:
 *   - Large buttons and inputs (44px+ height)
 *   - Network list items are large enough to tap with the touchpad
 *   - Password field supports the keyboard's key layout
 *   - Tab navigation works through all interactive elements
 *
 * Props:
 *   @param {function} onConnected - Called when WiFi is successfully connected
 */

import React, { useState, useEffect, useRef } from 'react';

export default function WifiSetupScreen({ onConnected }) {
  // List of available WiFi networks from the scan
  const [networks, setNetworks] = useState([]);

  // Whether a scan is in progress
  const [scanning, setScanning] = useState(false);

  // The network the user selected from the list
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  // Password input value
  const [password, setPassword] = useState('');

  // Whether a connection attempt is in progress
  const [connecting, setConnecting] = useState(false);

  // Error message to display (wrong password, out of range, etc.)
  const [error, setError] = useState(null);

  // Ref to the password input for auto-focus
  const passwordRef = useRef(null);

  /**
   * Scan for available WiFi networks on mount.
   */
  useEffect(() => {
    handleScan();
  }, []);

  /**
   * Auto-focus the password field when a network is selected.
   */
  useEffect(() => {
    if (selectedNetwork && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [selectedNetwork]);

  /**
   * Scans for available WiFi networks via the server endpoint.
   */
  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/network/scan');
      if (res.ok) {
        const data = await res.json();
        setNetworks(data);
      }
    } catch (e) {
      setError('Failed to scan for networks.');
    } finally {
      setScanning(false);
    }
  };

  /**
   * Attempts to connect to the selected network with the provided password.
   */
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!selectedNetwork) return;

    setConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/network/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssid: selectedNetwork.ssid,
          password: selectedNetwork.secured ? password : undefined,
        }),
      });

      if (res.ok) {
        // Successfully connected — notify parent to proceed
        onConnected();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to connect.');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Renders the signal strength as a visual indicator (bars).
   */
  const renderSignal = (signal) => {
    const bars = signal > 75 ? 3 : signal > 50 ? 2 : 1;
    return (
      <span style={styles.signal}>
        {'▂▄▆'.slice(0, bars)}
        <span style={styles.signalWeak}>{'▂▄▆'.slice(bars)}</span>
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <h1 style={styles.title}>Skylight Calendar</h1>
        <p style={styles.subtitle}>Connect to WiFi to get started</p>

        {/* Error message */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Network list or selected network form */}
        {!selectedNetwork ? (
          <>
            {/* Scan button */}
            <button
              style={styles.scanButton}
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Scan for Networks'}
            </button>

            {/* Available networks list */}
            {networks.length > 0 && (
              <div style={styles.networkList}>
                {networks.map((network) => (
                  <button
                    key={network.ssid}
                    style={styles.networkItem}
                    onClick={() => {
                      setSelectedNetwork(network);
                      setPassword('');
                      setError(null);
                    }}
                  >
                    <span style={styles.ssid}>{network.ssid}</span>
                    <span style={styles.networkMeta}>
                      {network.secured && <span style={styles.lock}>🔒</span>}
                      {renderSignal(network.signal)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state after scan */}
            {!scanning && networks.length === 0 && (
              <p style={styles.hint}>No networks found. Make sure WiFi is enabled.</p>
            )}
          </>
        ) : (
          /* Password entry form for the selected network */
          <form onSubmit={handleConnect} style={styles.form}>
            <p style={styles.selectedLabel}>
              Connecting to: <strong>{selectedNetwork.ssid}</strong>
            </p>

            {/* Only show password field for secured networks */}
            {selectedNetwork.secured && (
              <label style={styles.label}>
                Password
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Enter WiFi password"
                  required
                  autoComplete="off"
                />
              </label>
            )}

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.backButton}
                onClick={() => {
                  setSelectedNetwork(null);
                  setError(null);
                }}
              >
                Back
              </button>
              <button
                type="submit"
                style={styles.connectButton}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        )}

        {/* Skip option for Ethernet users */}
        <p style={styles.ethernetHint}>
          Using Ethernet? The calendar will load automatically once connected.
        </p>
      </div>
    </div>
  );
}

/** Component styles */
const styles = {
  container: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  card: {
    background: 'var(--bg-secondary)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  },
  scanButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    minHeight: '44px',
    width: '100%',
    marginBottom: '16px',
  },
  networkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '300px',
    overflowY: 'auto',
    textAlign: 'left',
  },
  networkItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    cursor: 'pointer',
    minHeight: '44px',
    width: '100%',
    textAlign: 'left',
  },
  ssid: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  networkMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  lock: {
    fontSize: '14px',
  },
  signal: {
    fontSize: '14px',
    letterSpacing: '1px',
    color: 'var(--text-primary)',
  },
  signalWeak: {
    opacity: 0.2,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
  selectedLabel: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    minHeight: '44px',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  backButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    minHeight: '44px',
  },
  connectButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    background: '#4285f4',
    color: '#ffffff',
    cursor: 'pointer',
    minHeight: '44px',
  },
  error: {
    fontSize: '13px',
    color: '#e53e3e',
    padding: '8px 12px',
    background: '#fff5f5',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  hint: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '12px',
  },
  ethernetHint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '24px',
  },
};
