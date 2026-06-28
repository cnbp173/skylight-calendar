import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAuthRouter, getAuthenticatedClient } from '../src/routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.resolve(__dirname, '../../.tokens.json');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter());
  return app;
}

describe('Auth Routes', () => {
  beforeEach(() => {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
  });

  describe('GET /api/auth/status', () => {
    it('returns authenticated: false when no tokens exist', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });

    it('returns authenticated: true when tokens exist', async () => {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({ access_token: 'test' }));
      const app = createApp();
      const res = await request(app).get('/api/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
    });
  });

  describe('GET /api/auth/login', () => {
    it('redirects to Google OAuth URL', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/auth/callback';

      const app = createApp();
      const res = await request(app).get('/api/auth/login');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
      expect(res.headers.location).toContain('calendar.readonly');
    });
  });

  describe('GET /api/auth/callback', () => {
    it('returns 400 when no code is provided', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/callback');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('removes token file and returns success', async () => {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({ access_token: 'test' }));
      const app = createApp();

      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fs.existsSync(TOKEN_PATH)).toBe(false);
    });

    it('returns success even when no token file exists', async () => {
      const app = createApp();
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('getAuthenticatedClient', () => {
    it('returns null when no tokens exist', () => {
      const client = getAuthenticatedClient();
      expect(client).toBeNull();
    });

    it('returns OAuth2 client when tokens exist', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

      fs.writeFileSync(TOKEN_PATH, JSON.stringify({
        access_token: 'test-access',
        refresh_token: 'test-refresh',
      }));

      const client = getAuthenticatedClient();
      expect(client).not.toBeNull();
      expect(client.credentials.access_token).toBe('test-access');
    });
  });
});
