import { Router } from 'express';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 1800 }); // 30 min cache

export function createWeatherRouter() {
  const router = Router();

  router.get('/current', async (req, res) => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const lat = process.env.WEATHER_LAT;
      const lon = process.env.WEATHER_LON;

      if (!apiKey || !lat || !lon) {
        return res.status(400).json({ error: 'Weather not configured' });
      }

      const cacheKey = `weather:${lat}:${lon}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial&exclude=minutely,alerts`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data = await response.json();

      const weather = {
        current: {
          temp: Math.round(data.current.temp),
          condition: data.current.weather[0].main,
          icon: data.current.weather[0].icon,
          description: data.current.weather[0].description,
        },
        daily: data.daily.slice(0, 7).map((day) => ({
          date: new Date(day.dt * 1000).toISOString(),
          high: Math.round(day.temp.max),
          low: Math.round(day.temp.min),
          condition: day.weather[0].main,
          icon: day.weather[0].icon,
        })),
      };

      cache.set(cacheKey, weather);
      res.json(weather);
    } catch (error) {
      console.error('Weather error:', error.message);
      res.status(500).json({ error: 'Failed to fetch weather' });
    }
  });

  return router;
}
