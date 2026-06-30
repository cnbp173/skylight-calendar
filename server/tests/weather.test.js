/**
 * Weather Routes — Unit Tests
 *
 * Tests the weather endpoint behavior:
 *   - Returns demo data when API key/coordinates aren't configured
 *   - Fetches real data from OpenWeatherMap when configured
 *   - Handles API errors gracefully
 *   - Rounds temperature values to whole numbers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('node-cache', () => {
  return {
    default: class {
      get() { return undefined; }
      set() {}
    },
  };
});

import { createWeatherRouter } from '../src/routes/weather.js';

/**
 * Helper to create a fresh Express app with the weather router.
 */
function createApp() {
  const app = express();
  app.use('/api/weather', createWeatherRouter());
  return app;
}

describe('Weather Routes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/weather/current', () => {
    it('returns demo data when weather is not configured', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      delete process.env.WEATHER_LAT;
      delete process.env.WEATHER_LON;

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      // Should return 200 with demo data (not an error)
      expect(res.status).toBe(200);
      expect(res.body.current).toBeDefined();
      expect(res.body.current.temp).toBe(78);
      expect(res.body.current.condition).toBe('Clear');
      expect(res.body.daily).toHaveLength(7);
    });

    it('returns demo data when only API key is set (missing coordinates)', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      delete process.env.WEATHER_LAT;
      delete process.env.WEATHER_LON;

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      // Still returns demo data since coordinates are missing
      expect(res.status).toBe(200);
      expect(res.body.current.temp).toBe(78);
    });

    it('fetches and transforms weather data when fully configured', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      process.env.WEATHER_LAT = '40.7128';
      process.env.WEATHER_LON = '-74.006';

      const mockWeatherResponse = {
        current: {
          temp: 72.5,
          weather: [{ main: 'Clear', icon: '01d', description: 'clear sky' }],
        },
        daily: [
          {
            dt: 1719532800,
            temp: { max: 85.2, min: 68.1, morn: 65, day: 78, eve: 72, night: 60 },
            weather: [{ main: 'Clear', icon: '01d', description: 'clear sky' }],
          },
          {
            dt: 1719619200,
            temp: { max: 82.0, min: 65.3, morn: 62, day: 75, eve: 70, night: 58 },
            weather: [{ main: 'Clouds', icon: '02d', description: 'scattered clouds' }],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse),
      });

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      expect(res.status).toBe(200);
      expect(res.body.current).toEqual({
        temp: 73,
        condition: 'Clear',
        icon: '01d',
        description: 'clear sky',
      });
      expect(res.body.daily).toHaveLength(2);
      expect(res.body.daily[0]).toMatchObject({
        high: 85,
        low: 68,
        condition: 'Clear',
      });
    });

    it('returns 500 when weather API fails', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      process.env.WEATHER_LAT = '40.7128';
      process.env.WEATHER_LON = '-74.006';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch weather');
    });

    it('returns 500 when fetch throws', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      process.env.WEATHER_LAT = '40.7128';
      process.env.WEATHER_LON = '-74.006';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      expect(res.status).toBe(500);
    });

    it('rounds temperature values', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      process.env.WEATHER_LAT = '40.7128';
      process.env.WEATHER_LON = '-74.006';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          current: {
            temp: 72.4999,
            weather: [{ main: 'Rain', icon: '10d', description: 'light rain' }],
          },
          daily: [
            {
              dt: 1719532800,
              temp: { max: 79.51, min: 60.49, morn: 62, day: 75, eve: 70, night: 58 },
              weather: [{ main: 'Rain', icon: '10d', description: 'light rain' }],
            },
          ],
        }),
      });

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      expect(res.body.current.temp).toBe(72);
      expect(res.body.daily[0].high).toBe(80);
      expect(res.body.daily[0].low).toBe(60);
    });
  });
});
