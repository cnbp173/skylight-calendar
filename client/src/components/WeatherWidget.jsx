import React from 'react';

const WEATHER_ICONS = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
};

export default function WeatherWidget({ weather }) {
  if (!weather) return null;

  const { current } = weather;
  const icon = WEATHER_ICONS[current.condition] || '🌤️';

  return (
    <div style={styles.container}>
      <span style={styles.icon}>{icon}</span>
      <span style={styles.temp}>{current.temp}°</span>
      <span style={styles.condition}>{current.description}</span>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  },
  icon: {
    fontSize: '24px',
  },
  temp: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  condition: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
};
