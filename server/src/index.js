/**
 * Skylight Calendar — Server Entry Point
 *
 * This Express server acts as the backend for the Skylight Calendar,
 * a wall-mounted display designed to run on a Raspberry Pi connected to a TV.
 *
 * Responsibilities:
 *   1. Proxy Google Calendar API requests (avoids CORS and keeps secrets server-side)
 *   2. Handle OAuth 2.0 authentication flow with Google
 *   3. Serve weather data from OpenWeatherMap
 *   4. Serve the built React client as static files in production
 *
 * The server binds to 0.0.0.0 so it's accessible from other devices on the
 * local network (useful for initial setup from a phone/laptop).
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCalendarRouter } from './routes/calendar.js';
import { createWeatherRouter } from './routes/weather.js';
import { createAuthRouter } from './routes/auth.js';

// Load environment variables from .env at the project root.
// This file contains GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for development (Vite dev server runs on a different port)
app.use(cors());

// Parse JSON request bodies — needed for the PATCH /api/calendar/events/:id endpoint
// which receives event update data from the client
app.use(express.json());

// Mount API route groups
app.use('/api/auth', createAuthRouter());
app.use('/api/calendar', createCalendarRouter());
app.use('/api/weather', createWeatherRouter());

// In production, serve the pre-built React client as static files.
// The catch-all route ensures client-side routing works (always serves index.html).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Start listening on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Skylight Calendar server running on http://0.0.0.0:${PORT}`);
});
