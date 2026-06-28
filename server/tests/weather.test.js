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
    it('returns 400 when weather is not configured', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      delete process.env.WEATHER_LAT;
      delete process.env.WEATHER_LON;

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Weather not configured');
    });

    it('returns 400 when only API key is set', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      delete process.env.WEATHER_LAT;
      delete process.env.WEATHER_LON;

      const app = createApp();
      const res = await request(app).get('/api/weather/current');

      expect(res.status).toBe(400);
    });

    it('fetches and transforms weather data', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-key';
      process.env.WEATHER_LAT = '40.7128';
      process.env.WEATHER_LON = '-74.006';

      const mockWeatherResponse = {
        current: {
          temp: 72.5,
          weather: [{ main: 'Clear', icon: '01d', description: 'clear sky' }],
        },
        daily: [
          { dt: 1719532800, temp: { max: 85.2, min: 68.1 }, weather: [{ main: 'Clear', icon: '01d' }] },
          { dt: 1719619200, temp: { max: 82.0, min: 65.3 }, weather: [{ main: 'Clouds', icon: '02d' }] },
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
            { dt: 1719532800, temp: { max: 79.51, min: 60.49 }, weather: [{ main: 'Rain', icon: '10d' }] },
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
