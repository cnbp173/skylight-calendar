/**
 * useWeatherData Hook
 *
 * Fetches current weather and forecast data from the server's weather endpoint.
 * Data is refreshed every 30 minutes to keep the display current without
 * excessive API calls (OpenWeatherMap has rate limits on free plans).
 *
 * The server handles the actual API call to OpenWeatherMap and returns a
 * normalized structure with current conditions, today's period breakdown
 * (morning/afternoon/evening/night), and a 7-day daily forecast.
 *
 * @returns {{ weather: object|null }} The weather data object, or null while loading
 */

import { useState, useEffect } from 'react';

export function useWeatherData() {
  // Null until the first successful fetch completes
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    /**
     * Fetches weather data from the server.
     * On failure, silently keeps the previous state (or null) — the weather
     * widget simply won't render if data is unavailable.
     */
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather/current');
        if (res.ok) {
          setWeather(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch weather:', e);
      }
    };

    // Fetch immediately on mount
    fetchWeather();

    // Refresh every 30 minutes — weather doesn't change rapidly enough
    // to warrant more frequent polling
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { weather };
}
