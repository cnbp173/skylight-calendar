/**
 * Network Routes — Unit Tests
 *
 * Tests the network management endpoints:
 *   GET  /api/network/status  - Check internet connectivity and current SSID
 *   GET  /api/network/scan    - Scan for available WiFi networks
 *   POST /api/network/connect - Connect to a WiFi network
 *
 * Uses vitest for test runner and supertest for HTTP assertions.
 * child_process.exec and global.fetch are mocked to test route logic
 * in isolation without requiring actual network hardware.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock child_process so execAsync calls don't run real shell commands
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import { createNetworkRouter } from '../src/routes/network.js';

/**
 * Helper to create a fresh Express app with the network router.
 */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/network', createNetworkRouter());
  return app;
}

/**
 * Helper to make the mocked exec behave like the real callback-based exec.
 * Since the source uses promisify(exec), we simulate the (err, {stdout, stderr}) callback.
 */
function mockExecSuccess(stdout = '') {
  exec.mockImplementation((cmd, optionsOrCb, cb) => {
    const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
    callback(null, { stdout, stderr: '' });
  });
}

function mockExecFailure(errorMessage = 'command failed') {
  exec.mockImplementation((cmd, optionsOrCb, cb) => {
    const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
    callback(new Error(errorMessage), { stdout: '', stderr: errorMessage });
  });
}

/**
 * Helper that lets us configure exec to respond differently per command pattern.
 */
function mockExecByCommand(handlers) {
  exec.mockImplementation((cmd, optionsOrCb, cb) => {
    const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (cmd.includes(pattern)) {
        return handler(callback);
      }
    }
    // Default: command not found
    callback(new Error(`unhandled mock command: ${cmd}`), { stdout: '', stderr: '' });
  });
}

describe('Network Routes', () => {
  let originalFetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('GET /api/network/status', () => {
    it('returns connected=true when fetch succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecFailure('no wifi'); // nmcli fails — no ssid

      const app = createApp();
      const res = await request(app).get('/api/network/status');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.ssid).toBeNull();
    });

    it('returns connected=false when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));
      mockExecFailure('no wifi');

      const app = createApp();
      const res = await request(app).get('/api/network/status');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
      expect(res.body.ssid).toBeNull();
    });

    it('includes ssid when nmcli returns a connected network', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecSuccess('yes:MyHomeWiFi\n');

      const app = createApp();
      const res = await request(app).get('/api/network/status');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.ssid).toBe('MyHomeWiFi');
    });

    it('returns ssid=null when nmcli output has no ssid after colon', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecSuccess('yes:\n');

      const app = createApp();
      const res = await request(app).get('/api/network/status');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.ssid).toBeNull();
    });
  });

  describe('GET /api/network/scan', () => {
    it('parses nmcli output correctly', async () => {
      const nmcliOutput = [
        'HomeNetwork:85:WPA2',
        'CoffeeShop:62:WPA1',
        'OpenNet:45:--',
      ].join('\n');

      mockExecSuccess(nmcliOutput);

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toEqual({ ssid: 'HomeNetwork', signal: 85, secured: true });
      expect(res.body[1]).toEqual({ ssid: 'CoffeeShop', signal: 62, secured: true });
      expect(res.body[2]).toEqual({ ssid: 'OpenNet', signal: 45, secured: false });
    });

    it('sorts networks by signal strength descending', async () => {
      const nmcliOutput = [
        'Weak:20:WPA2',
        'Strong:95:WPA2',
        'Medium:50:WPA2',
      ].join('\n');

      mockExecSuccess(nmcliOutput);

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      expect(res.body[0].ssid).toBe('Strong');
      expect(res.body[1].ssid).toBe('Medium');
      expect(res.body[2].ssid).toBe('Weak');
    });

    it('filters out hidden networks (empty SSID)', async () => {
      const nmcliOutput = [
        ':80:WPA2',
        'Visible:60:WPA2',
      ].join('\n');

      mockExecSuccess(nmcliOutput);

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].ssid).toBe('Visible');
    });

    it('filters duplicate SSIDs', async () => {
      const nmcliOutput = [
        'SameNet:90:WPA2',
        'SameNet:70:WPA2',
        'Other:50:WPA2',
      ].join('\n');

      mockExecSuccess(nmcliOutput);

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      const ssids = res.body.map((n) => n.ssid);
      expect(ssids.filter((s) => s === 'SameNet')).toHaveLength(1);
    });

    it('returns empty array when nmcli fails', async () => {
      mockExecFailure('No WiFi adapter found');

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('handles empty output gracefully', async () => {
      mockExecSuccess('');

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('treats networks with empty security field as unsecured', async () => {
      const nmcliOutput = 'OpenCafe:70:\n';
      mockExecSuccess(nmcliOutput);

      const app = createApp();
      const res = await request(app).get('/api/network/scan');

      expect(res.status).toBe(200);
      expect(res.body[0].secured).toBeFalsy();
    });
  });

  describe('POST /api/network/connect', () => {
    it('returns 400 when ssid is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ password: 'secret123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ssid is required');
    });

    it('returns 400 when body is empty', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ssid is required');
    });

    it('calls nmcli with correct command including ssid and password', async () => {
      // First call: nmcli connect succeeds, second call: checkInternet fetch succeeds
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecSuccess('');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'MyNetwork', password: 'pass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify nmcli was called with the correct command
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining("nmcli dev wifi connect 'MyNetwork' password 'pass123'"),
        expect.anything(),
        expect.any(Function)
      );
    });

    it('calls nmcli without password when not provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecSuccess('');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'OpenNetwork' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify command does not include password
      const calledCmd = exec.mock.calls[0][0];
      expect(calledCmd).toBe("nmcli dev wifi connect 'OpenNetwork'");
      expect(calledCmd).not.toContain('password');
    });

    it('returns success when connection and internet check succeed', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecSuccess('');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'GoodNetwork', password: 'abc' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('returns 500 when connected to WiFi but no internet', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('No internet'));
      mockExecSuccess(''); // nmcli connect succeeds

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'NoInternet', password: 'abc' });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('no internet access');
    });

    it('returns 500 with "Incorrect password" on secrets error', async () => {
      mockExecFailure('Error: Secrets were required, but not provided.');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'SecureNet', password: 'wrong' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Incorrect password. Please try again.');
    });

    it('returns 500 with "Network not found" on no SSID error', async () => {
      mockExecFailure('Error: No network with SSID "GhostNet" found.');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'GhostNet', password: 'abc' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Network not found. It may be out of range.');
    });

    it('returns 500 with "Connection timed out" on timeout error', async () => {
      mockExecFailure('Error: timeout expired while connecting');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'FarAway', password: 'abc' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Connection timed out. The network may be too far away.');
    });

    it('returns 500 with generic message on unknown error', async () => {
      mockExecFailure('Error: something totally unexpected');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: 'Broken', password: 'abc' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to connect to WiFi.');
    });

    it('escapes single quotes in ssid and password', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      mockExecSuccess('');

      const app = createApp();
      const res = await request(app)
        .post('/api/network/connect')
        .send({ ssid: "Bob's WiFi", password: "it's a secret" });

      expect(res.status).toBe(200);

      const calledCmd = exec.mock.calls[0][0];
      expect(calledCmd).toContain("Bob'\\''s WiFi");
      expect(calledCmd).toContain("it'\\''s a secret");
    });
  });
});
