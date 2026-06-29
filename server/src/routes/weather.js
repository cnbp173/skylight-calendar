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

      const cacheKey = `weather:${lat}:${lon}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial&exclude=minutely,alerts`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data = await response.json();

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

      cache.set(cacheKey, weather);
      res.json(weather);
    } catch (error) {
      console.error('Weather error:', error.message);
      res.status(500).json({ error: 'Failed to fetch weather' });
    }
  });

  return router;
}
