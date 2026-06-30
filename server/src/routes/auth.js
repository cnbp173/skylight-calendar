/**
 * Authentication Routes Module
 *
 * Handles the Google OAuth 2.0 flow for connecting the Skylight Calendar
 * to the user's Google Calendar account. Manages token persistence to disk
 * so that re-authentication is not required on every server restart.
 *
 * Flow:
 *   1. User visits /api/auth/login → redirected to Google consent screen
 *   2. Google redirects back to /api/auth/callback with an authorization code
 *   3. Server exchanges the code for access + refresh tokens
 *   4. Tokens are saved to .tokens.json at the project root
 *   5. Subsequent API calls use getAuthenticatedClient() to get a pre-configured client
 *
 * OAuth scopes include both read AND write access to calendar events,
 * allowing the app to update events when users reschedule them.
 */

import { Router } from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolve the directory name for this module (ESM equivalent of __dirname).
 * Used to locate the .tokens.json file relative to the project root.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Path to the token storage file. Sits at the project root (three levels up
 * from server/src/routes/) so it persists across server restarts.
 */
const TOKEN_PATH = path.resolve(__dirname, '../../../.tokens.json');

/**
 * Creates a new OAuth2 client instance configured with the app's credentials.
 * Each call returns a fresh instance — callers must set tokens on it before use.
 *
 * @returns {google.auth.OAuth2} A new OAuth2 client (without tokens set)
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback'
  );
}

/**
 * Attempts to read stored OAuth tokens from disk.
 * Returns null if the file doesn't exist or can't be parsed,
 * which signals that the user hasn't authenticated yet.
 *
 * @returns {object|null} The stored token object, or null if unavailable
 */
function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load tokens:', e.message);
  }
  return null;
}

/**
 * Persists OAuth tokens to disk as formatted JSON.
 * Called after initial authentication and whenever Google issues refreshed tokens.
 *
 * @param {object} tokens - The token object from Google (access_token, refresh_token, etc.)
 */
function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

/**
 * Returns a fully configured OAuth2 client with credentials loaded from disk.
 * Also sets up an automatic token-refresh listener that persists new tokens
 * whenever Google issues them (access tokens expire after ~1 hour).
 *
 * @returns {google.auth.OAuth2|null} Authenticated client, or null if no tokens exist
 */
export function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  const tokens = loadTokens();

  // If no tokens are stored, the user hasn't completed OAuth yet
  if (!tokens) return null;

  oauth2Client.setCredentials(tokens);

  // Listen for token refresh events — Google silently issues new access tokens
  // when the current one expires. We merge and persist them so the app stays
  // authenticated without user intervention.
  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    saveTokens(merged);
    oauth2Client.setCredentials(merged);
  });

  return oauth2Client;
}

/**
 * Creates and returns the Express router for all authentication endpoints.
 *
 * Endpoints:
 *   GET  /api/auth/status   - Check if the user is authenticated
 *   GET  /api/auth/login    - Begin the OAuth flow (redirects to Google)
 *   GET  /api/auth/callback - Handle OAuth callback from Google
 *   POST /api/auth/logout   - Remove stored tokens (disconnect calendar)
 *
 * @returns {Router} Express router with auth routes mounted
 */
export function createAuthRouter() {
  const router = Router();

  /**
   * GET /api/auth/status
   * Returns whether valid tokens exist on disk. The client uses this on
   * startup to decide whether to show the setup screen or the calendar.
   */
  router.get('/status', (req, res) => {
    const tokens = loadTokens();
    res.json({ authenticated: !!tokens });
  });

  /**
   * GET /api/auth/login
   * Redirects the user to Google's OAuth consent screen. Requests both
   * read access (to fetch events) and write access (to update events
   * when users drag-and-drop or edit them).
   *
   * - access_type: 'offline' ensures we receive a refresh_token
   * - prompt: 'consent' forces the consent screen even if previously approved,
   *   ensuring we always get a fresh refresh_token
   */
  router.get('/login', (req, res) => {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        // Read access: list calendars and fetch events
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
        // Write access: update events when user reschedules via drag-drop or edit dialog
        'https://www.googleapis.com/auth/calendar.events',
      ],
    });
    res.redirect(url);
  });

  /**
   * GET /api/auth/callback
   * Handles the redirect from Google after the user grants permission.
   * Exchanges the one-time authorization code for long-lived tokens,
   * then displays a success message the user can close.
   */
  router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      saveTokens(tokens);

      // Show a simple success page — the user can close this browser tab
      // and the calendar display on the Pi will pick up the new auth state
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8f6f3;">
            <div style="text-align: center;">
              <h1 style="color: #2d3748;">Connected to Google Calendar</h1>
              <p style="color: #718096;">You can close this window. The calendar will start syncing shortly.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  /**
   * POST /api/auth/logout
   * Removes stored tokens, effectively disconnecting the calendar.
   * The client will detect the unauthenticated state on its next poll
   * and show the setup screen.
   */
  router.post('/logout', (req, res) => {
    try {
      if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
