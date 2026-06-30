/**
 * Weather Routes Module
 *
 * Provides weather data for the Skylight Calendar display. Fetches current
 * conditions and a 7-day forecast from the OpenWeatherMap "One Call" API.
 *
 * When no API key is configured (common during development or demo mode),
 * returns realistic static demo data so the weather widget always renders.
 *
 * Caching: Weather responses are cached for 30 minutes to stay within
 * the free-tier rate limits of the OpenWeatherMap API while keeping
 * the display reasonably current.
 *
 * Environment variables required for real weather data:
 *   - OPENWEATHER_API_KEY: Your OpenWeatherMap API key
 *   - WEATHER_LAT: Latitude for the weather location
 *   - WEATHER_LON: Longitude for the weather location
 */

import { Router } from 'express';
import NodeCache from 'node-cache';

/**
 * Cache with a 30-minute TTL. Weather data doesn't change rapidly enough
 * to justify more frequent API calls, and the free tier allows ~1000/day.
 */
const cache = new NodeCache({ stdTTL: 1800 });

/**
 * Creates and returns the Express router for weather endpoints.
 *
 * Endpoints:
 *   GET /api/weather/current - Current conditions + forecast
 *
 * @returns {Router} Express router with weather routes
 */
export function createWeatherRouter() {
  const router = Router();

  /**
   * GET /api/weather/current
   *
   * Returns a weather object with three sections:
   *   - current: { temp, condition, icon, description }
   *   - periods: { morning, afternoon, evening, night } each with temp/condition
   *   - daily: Array of 7 days with high/low/condition
   *
   * Falls back to demo data if the API key or coordinates aren't configured.
   */
  router.get('/current', async (req, res) => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const lat = process.env.WEATHER_LAT;
      const lon = process.env.WEATHER_LON;

      // If weather API isn't configured, return demo data
      // This ensures the widget always renders during development/demos
      if (!apiKey || !lat || !lon) {
        const now = new Date();
        const demoWeather = {
          current: {
            temp: 78,
            condition: 'Clear',
            icon: '01d',
            description: 'sunny',
          },
          periods: {
            morning: { temp: 68, condition: 'Clear', icon: '01d', description: 'sunny' },
            afternoon: { temp: 82, condition: 'Clear', icon: '01d', description: 'sunny' },
            evening: { temp: 74, condition: 'Clouds', icon: '02d', description: 'partly cloudy' },
            night: { temp: 63, condition: 'Clear', icon: '01n', description: 'clear' },
          },
          // Generate 7 days of demo forecast data
          daily: Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            const conditions = ['Clear', 'Clouds', 'Clear', 'Rain', 'Clear', 'Clouds', 'Clear'];
            const icons = ['01d', '03d', '01d', '10d', '01d', '02d', '01d'];
            const highs = [82, 79, 84, 75, 80, 77, 83];
            const lows = [65, 63, 67, 61, 64, 62, 66];
            return {
              date: d.toISOString(),
              high: highs[i],
              low: lows[i],
              condition: conditions[i],
              icon: icons[i],
            };
          }),
        };
        return res.json(demoWeather);
      }

      // Check cache before making an API call
      const cacheKey = `weather:${lat}:${lon}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      // Fetch from OpenWeatherMap's One Call API 4.0
      // Units: imperial (Fahrenheit) — matches the US-centric demo data
      // Exclude: minutely (too granular) and alerts (not displayed)
      const url = `https://api.openweathermap.org/data/4.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial&exclude=minutely,alerts`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data = await response.json();

      // Transform the API response into our normalized format
      const todayDaily = data.daily[0];
      const weather = {
        current: {
          temp: Math.round(data.current.temp),
          condition: data.current.weather[0].main,
          icon: data.current.weather[0].icon,
          description: data.current.weather[0].description,
        },
        periods: {
          morning: { temp: Math.round(todayDaily.temp.morn), condition: todayDaily.weather[0].main, icon: todayDaily.weather[0].icon, description: todayDaily.weather[0].description },
          afternoon: { temp: Math.round(todayDaily.temp.day), condition: todayDaily.weather[0].main, icon: todayDaily.weather[0].icon, description: todayDaily.weather[0].description },
          evening: { temp: Math.round(todayDaily.temp.eve), condition: todayDaily.weather[0].main, icon: todayDaily.weather[0].icon, description: todayDaily.weather[0].description },
          night: { temp: Math.round(todayDaily.temp.night), condition: todayDaily.weather[0].main, icon: todayDaily.weather[0].icon, description: todayDaily.weather[0].description },
        },
        daily: data.daily.slice(0, 7).map((day) => ({
          date: new Date(day.dt * 1000).toISOString(),
          high: Math.round(day.temp.max),
          low: Math.round(day.temp.min),
          condition: day.weather[0].main,
          icon: day.weather[0].icon,
        })),
      };

      // Cache the result for 30 minutes
      cache.set(cacheKey, weather);
      res.json(weather);
    } catch (error) {
      console.error('Weather error:', error.message);
      res.status(500).json({ error: 'Failed to fetch weather' });
    }
  });

  return router;
}
