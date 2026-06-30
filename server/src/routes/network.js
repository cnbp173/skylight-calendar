/**
 * Network Routes Module
 *
 * Provides endpoints for checking internet connectivity and connecting
 * to WiFi networks. Used by the WiFi setup splash page that appears on
 * first boot when the Raspberry Pi has no network connection.
 *
 * The Pi needs internet to:
 *   - Complete Google OAuth authentication
 *   - Fetch calendar events from Google Calendar API
 *   - Fetch weather data from OpenWeatherMap
 *
 * This module uses NetworkManager (nmcli) which is the default network
 * manager on Raspberry Pi OS Bookworm and later. Falls back gracefully
 * if nmcli is not available (e.g., during development on macOS).
 *
 * Endpoints:
 *   GET  /api/network/status  - Check if the Pi has internet connectivity
 *   GET  /api/network/scan    - Scan for available WiFi networks
 *   POST /api/network/connect - Connect to a WiFi network
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Creates and returns the Express router for network management endpoints.
 *
 * @returns {Router} Express router with network routes
 */
export function createNetworkRouter() {
  const router = Router();

  /**
   * GET /api/network/status
   *
   * Checks whether the Pi currently has internet connectivity by
   * attempting to reach Google's DNS server (8.8.8.8). This is more
   * reliable than checking if a WiFi interface is up, since the interface
   * can be connected to a router that has no upstream internet.
   *
   * Response: { connected: true/false, ssid: "NetworkName" | null }
   */
  router.get('/status', async (req, res) => {
    try {
      // Try to reach an external host to confirm internet access
      const connected = await checkInternet();

      // Try to get the current WiFi network name
      let ssid = null;
      try {
        const { stdout } = await execAsync('nmcli -t -f active,ssid dev wifi | grep "^yes"');
        ssid = stdout.trim().split(':')[1] || null;
      } catch {
        // nmcli not available or no WiFi connection — that's fine
      }

      res.json({ connected, ssid });
    } catch {
      res.json({ connected: false, ssid: null });
    }
  });

  /**
   * GET /api/network/scan
   *
   * Scans for available WiFi networks and returns a list sorted by
   * signal strength. Each entry includes the SSID, signal strength
   * (as a percentage), and whether the network is secured.
   *
   * Response: Array of { ssid, signal, secured } objects
   */
  router.get('/scan', async (req, res) => {
    try {
      const { stdout } = await execAsync(
        'nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list --rescan yes'
      );

      // Parse nmcli output — each line is "SSID:SIGNAL:SECURITY"
      const networks = stdout
        .trim()
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(':');
          return {
            ssid: parts[0],
            signal: parseInt(parts[1], 10) || 0,
            secured: parts[2] && parts[2] !== '' && parts[2] !== '--',
          };
        })
        // Remove hidden networks (empty SSID) and duplicates
        .filter((n) => n.ssid)
        .filter((n, i, arr) => arr.findIndex((x) => x.ssid === n.ssid) === i)
        // Sort by signal strength (strongest first)
        .sort((a, b) => b.signal - a.signal);

      res.json(networks);
    } catch (error) {
      console.error('WiFi scan error:', error.message);
      // Return empty list if scanning fails (e.g., no WiFi adapter or not on Linux)
      res.json([]);
    }
  });

  /**
   * POST /api/network/connect
   *
   * Connects the Pi to a WiFi network using the provided credentials.
   * Uses nmcli to establish the connection. The connection persists
   * across reboots (NetworkManager saves it automatically).
   *
   * Body (JSON):
   *   - ssid: (required) The network name to connect to
   *   - password: (required for secured networks) The WiFi password
   *
   * Response:
   *   - 200 { success: true } on successful connection
   *   - 400 if ssid is missing
   *   - 500 if the connection attempt fails (wrong password, out of range, etc.)
   */
  router.post('/connect', async (req, res) => {
    const { ssid, password } = req.body;

    if (!ssid) {
      return res.status(400).json({ error: 'ssid is required' });
    }

    try {
      // Build the nmcli command — escape the SSID and password for shell safety
      const escapedSsid = ssid.replace(/'/g, "'\\''");
      let cmd = `nmcli dev wifi connect '${escapedSsid}'`;
      if (password) {
        const escapedPass = password.replace(/'/g, "'\\''");
        cmd += ` password '${escapedPass}'`;
      }

      await execAsync(cmd, { timeout: 30000 });

      // Verify we actually got internet after connecting
      const connected = await checkInternet();
      if (!connected) {
        return res.status(500).json({
          error: 'Connected to WiFi but no internet access. Check your router.',
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('WiFi connect error:', error.message);

      // Parse common nmcli error messages into user-friendly text
      let message = 'Failed to connect to WiFi.';
      if (error.message.includes('Secrets were required')) {
        message = 'Incorrect password. Please try again.';
      } else if (error.message.includes('No network with SSID')) {
        message = 'Network not found. It may be out of range.';
      } else if (error.message.includes('timeout')) {
        message = 'Connection timed out. The network may be too far away.';
      }

      res.status(500).json({ error: message });
    }
  });

  return router;
}

/**
 * Checks internet connectivity by attempting to reach Google's DNS.
 * Uses a short timeout (5s) to avoid blocking the UI for too long.
 *
 * @returns {Promise<boolean>} True if internet is reachable
 */
async function checkInternet() {
  try {
    // Use fetch to hit a reliable endpoint with a short timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch('https://www.google.com/generate_204', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}
