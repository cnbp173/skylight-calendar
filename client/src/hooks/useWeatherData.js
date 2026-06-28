import { useState, useEffect } from 'react';

export function useWeatherData() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
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

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); // refresh every 30 min
    return () => clearInterval(interval);
  }, []);

  return { weather };
}
