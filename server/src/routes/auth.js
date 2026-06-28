import { Router } from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.resolve(__dirname, '../../../.tokens.json');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback'
  );
}

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

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

export function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  const tokens = loadTokens();
  if (!tokens) return null;
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    saveTokens(merged);
    oauth2Client.setCredentials(merged);
  });

  return oauth2Client;
}

export function createAuthRouter() {
  const router = Router();

  router.get('/status', (req, res) => {
    const tokens = loadTokens();
    res.json({ authenticated: !!tokens });
  });

  router.get('/login', (req, res) => {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      ],
    });
    res.redirect(url);
  });

  router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      saveTokens(tokens);
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8f6f3;">
            <div style="text-align: center;">
              <h1 style="color: #2d3748;">✓ Connected to Google Calendar</h1>
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
